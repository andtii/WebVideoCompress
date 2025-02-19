import { Muxer, StreamTarget } from 'mp4-muxer';
import { VideoCompressorOptions } from './VideoCompressorOptions';

export class WebVideoCompress {
    private options: VideoCompressorOptions;

    constructor(options?: VideoCompressorOptions) {
        // Set default options and override with any provided values
        this.options = {
            quality: 50,
            resolution: 'Original',
            frameRate: 30,
            onProgress: () => { },
            onStatus: () => { },
            onChunk: () => { },
            onComplete: () => { },
            onError: () => { },
            ...options,
        };
    }

    /**
     * Compress the given video file.
     * @param file The input video File
     * @returns A Promise that resolves with a Blob containing the compressed MP4 file.
     */
    async compress(file: File): Promise<Blob> {
        const { quality, resolution, frameRate = 30, onProgress, onStatus, onChunk, onComplete, onError } = this.options;
        const startTime = performance.now();
        try {
            onStatus && onStatus('Starting compression...');
            onProgress && onProgress(0, 'Starting compression...');

            // Create a temporary video element (not attached to DOM)
            const fileURL = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = fileURL;
            video.muted = true;
            video.playsInline = true;
            await video.play();
            video.pause();

            // Wait for metadata to load
            await new Promise<void>((resolve) => {
                if (video.readyState >= 1) {
                    resolve();
                } else {
                    video.onloadedmetadata = () => resolve();
                }
            });

            // Determine target resolution based on options
            let targetWidth = video.videoWidth;
            let targetHeight = video.videoHeight;
            if (resolution === '720p' && video.videoHeight > 720) {
                targetHeight = 720;
                targetWidth = Math.round(video.videoWidth * (720 / video.videoHeight));
            } else if (resolution === '480p' && video.videoHeight > 480) {
                targetHeight = 480;
                targetWidth = Math.round(video.videoWidth * (480 / video.videoHeight));
            }
            
            // Ensure both dimensions are even
            if (targetWidth % 2 !== 0) {
                targetWidth--;
            }
            if (targetHeight % 2 !== 0) {
                targetHeight--;
            }
            
            onStatus && onStatus(`Target resolution: ${targetWidth}x${targetHeight}`);

            // Set up an offscreen canvas for drawing frames
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

            // --- Setup the muxer using StreamTarget ---
            const uploadedChunks: Uint8Array[] = [];
            const targetStream = new StreamTarget({
                onData: (data: Uint8Array, position: number) => {
                    onChunk && onChunk(data, position);
                    // Save chunk locally
                    uploadedChunks.push(data);
                },
                chunked: true,
                chunkSize: 1024 * 1024, // 1MB
            });

            // --- Audio Extraction ---
            let audioBuffer: AudioBuffer | null = null;
            const muxerOptions: any = {
                target: targetStream,
                video: {
                    codec: 'avc',
                    width: targetWidth,
                    height: targetHeight,
                    frameRate: frameRate,
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            };

            const audioCtx = new AudioContext();
            try {
                const arrayBuf = await file.arrayBuffer();
                audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
                muxerOptions.audio = {
                    codec: 'aac',
                    numberOfChannels: audioBuffer.numberOfChannels,
                    sampleRate: audioBuffer.sampleRate,
                };
            } catch (e) {
                onStatus && onStatus('Audio decoding failed or no audio track found.');
            }

            const muxer = new Muxer(muxerOptions);
            onStatus && onStatus('Muxer created.');

            // --- Video Encoder Setup ---
            const videoBitrate = Number(quality);
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => {
                    muxer.addVideoChunk(chunk, meta);
                },
                error: (e) => onError && onError(e),
            });
            videoEncoder.configure({
                codec: 'avc1.420028',
                width: targetWidth,
                height: targetHeight,
                bitrate: videoBitrate,
                framerate: frameRate,
            });

            const duration = video.duration;
            const totalFrames = Math.floor(duration * frameRate);
            for (let i = 0; i < totalFrames; i++) {
                video.currentTime = i / frameRate;
                await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const bitmap = await createImageBitmap(canvas);
                const frameTimestamp = i * (1e6 / frameRate);
                const frame = new VideoFrame(bitmap, { timestamp: frameTimestamp });
                videoEncoder.encode(frame);
                frame.close();
                bitmap.close();

                // Update progress for video encoding (70% of overall progress)
                const progressPercent = Math.round(((i + 1) / totalFrames) * 70);
                onProgress && onProgress(progressPercent, `Encoding video: ${i + 1} / ${totalFrames} frames`);
            }
            await videoEncoder.flush();

            // --- Audio Encoder Setup ---
            let firstAudioTimestamp: number | null = null;
            if (audioBuffer) {
                const audioEncoder = new AudioEncoder({
                    output: (chunk, meta) => {
                        if (firstAudioTimestamp === null) {
                            firstAudioTimestamp = chunk.timestamp;
                        }
                        const adjustedTimestamp = chunk.timestamp - (firstAudioTimestamp || 0);
                        muxer.addAudioChunk(chunk, meta, adjustedTimestamp);
                    },
                    error: (e) => onError && onError(e),
                });
                audioEncoder.configure({
                    codec: 'mp4a.40.2',
                    sampleRate: audioBuffer.sampleRate,
                    numberOfChannels: audioBuffer.numberOfChannels,
                    bitrate: 128000,
                });

                const channelCount = audioBuffer.numberOfChannels;
                const chunkSize = 1024;
                let timestamp = 0;
                const totalFramesAudio = audioBuffer.length;
                for (let i = 0; i < totalFramesAudio; i += chunkSize) {
                    const frameLength = Math.min(chunkSize, totalFramesAudio - i);
                    const interleaved = new Float32Array(frameLength * channelCount);
                    for (let j = 0; j < frameLength; j++) {
                        for (let channel = 0; channel < channelCount; channel++) {
                            interleaved[j * channelCount + channel] = audioBuffer.getChannelData(channel)[i + j];
                        }
                    }
                    const audioData = new AudioData({
                        format: 'f32',
                        sampleRate: audioBuffer.sampleRate,
                        numberOfFrames: frameLength,
                        numberOfChannels: channelCount,
                        timestamp: timestamp,
                        data: interleaved,
                    });
                    audioEncoder.encode(audioData);
                    audioData.close();
                    timestamp += (frameLength / audioBuffer.sampleRate) * 1e6;

                    // Update progress for audio encoding (final 30% of overall progress)
                    const audioProgress = Math.round(((i + frameLength) / totalFramesAudio) * 30);
                    const overallProgress = 70 + audioProgress;
                    onProgress && onProgress(overallProgress > 100 ? 100 : overallProgress, `Encoding audio: ${i + frameLength} / ${totalFramesAudio} samples`);
                }
                await audioEncoder.flush();
            } else {
                onStatus && onStatus('No audio track detected; skipping audio encoding.');
                onProgress && onProgress(70, 'Skipping audio encoding.');
            }

            onStatus && onStatus('Finalizing MP4 file...');
            muxer.finalize();

            // Concatenate chunks to form the final MP4 file
            const finalBuffer = concatChunks(uploadedChunks);
            const blob = new Blob([finalBuffer], { type: 'video/mp4' });
            const endTime = performance.now();
            const elapsedSec = (endTime - startTime) / 1000;
            onStatus && onStatus('Compression complete!');
            onProgress && onProgress(100, 'Compression complete!');
            onComplete && onComplete(blob, { elapsedTime: elapsedSec, fileSize: blob.size });
            return blob;
        } catch (e) {
            onError && onError(e);
            throw e;
        }
    }
}

// Helper to concatenate multiple Uint8Array chunks into one.
function concatChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}
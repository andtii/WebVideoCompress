
export interface VideoCompressorOptions {
    // Quality on a 0–100 scale (default: 50)
    quality?: number;
    // Target resolution: 'Original', '720p', or '480p' (default: 'Original')
    resolution?: 'Original' | '720p' | '480p';
    // Frames per second (default: 30)
    frameRate?: number;
    // Hook to update progress (progress percentage and a message)
    onProgress?: (progress: number, message: string) => void;
    // Hook for status messages
    onStatus?: (message: string) => void;
    // Hook that fires whenever a chunk is produced (e.g. for simulated upload)
    onChunk?: (chunk: Uint8Array, position: number) => void;
    // Hook called on successful completion (with the final Blob and info)
    onComplete?: (result: Blob, info: { elapsedTime: number; fileSize: number }) => void;
    // Hook for errors
    onError?: (error: any) => void;
  }
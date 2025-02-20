# WebVideoCompress

**WebVideoCompress** is a client-side video compression library that leverages the [WebCodecs API](https://caniuse.com/webcodecs) for efficient video (and audio) encoding. Built with modern browser technologies, it works seamlessly across most browsers—including Chrome, Edge, Firefox, and Safari Technology Preview (TP).

> **Note:** WebVideoCompress is designed for environments where the WebCodecs API is available. For full browser compatibility details, please refer to [Can I use WebCodecs](https://caniuse.com/webcodecs)

[Live demo here](https://andtii.github.io/WebVideoCompress/)

---

## Features

- **Customizable Compression Options:**  
  Adjust quality (0–100), target resolution ('Original', '720p', or '480p'), and frame rate.
  
- **Progress and Status Hooks:**  
  Monitor progress through customizable hooks: `onProgress`, `onStatus`, `onChunk`, `onComplete`, and `onError`.

- **Audio Extraction and Encoding:**  
  Automatically decodes and encodes audio when available, falling back gracefully if no audio track is detected.

- **Efficient Chunked Muxing:**  
  Uses an in-memory MP4 muxer to combine video and audio streams into a final MP4 Blob.

- **Broad Browser Support:**  
  Utilizes the modern WebCodecs API, which is supported in most browsers (check the [WebCodecs browser compatibility](https://caniuse.com/webcodecs) :contentReference[oaicite:1]{index=1} for details).

---

## Project Setup

This is a Vite project. The source code is provided in the following TypeScript files:

- [WebVideoCompress.ts](./src/WebVideoCompress.ts)
- [VideoCompressorOptions.ts](./src/VideoCompressorOptions.ts)

To run the project locally:

1. **Clone the repository** (if you haven’t already).

2. **Install dependencies** by running:
   ~~~bash
   npm install
   ~~~

3. **Start the development server:**
   ~~~bash
   npm run dev
   ~~~
   This will start the Vite development server, and you can try out the library in your browser.

---

## Usage Example

Below is an example of how to use WebVideoCompress to compress a video file:

~~~typescript
import { WebVideoCompress } from './WebVideoCompress';

const compressor = new WebVideoCompress({
  quality: 70,                   // Set quality on a scale of 0–100
  resolution: '720p',            // Target resolution ('Original', '720p', or '480p')
  frameRate: 30,                 // Frames per second
  onProgress: (progress, message) => {
    console.log(`Progress: ${progress}% - ${message}`);
  },
  onStatus: (message) => {
    console.log(`Status: ${message}`);
  },
  onChunk: (chunk, position) => {
    console.log(`Chunk at position ${position}:`, chunk);
  },
  onComplete: (result, info) => {
    console.log('Compression complete!', info);
    // Create a URL for the compressed video Blob and display it
    const videoURL = URL.createObjectURL(result);
    const videoElement = document.createElement('video');
    videoElement.src = videoURL;
    videoElement.controls = true;
    document.body.appendChild(videoElement);
  },
  onError: (error) => {
    console.error('Compression error:', error);
  }
});

// Assuming you have an <input type="file" id="videoInput"> element in your HTML:
document.getElementById('videoInput')!.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (file) {
    try {
      const compressedBlob = await compressor.compress(file);
      // Further handling of the compressedBlob if needed.
    } catch (error) {
      console.error('Error during compression:', error);
    }
  }
});
~~~

---

## API Documentation

### VideoCompressorOptions

An interface for the options passed to the compressor:

- **quality?: number**  
  Quality on a 0–100 scale. *(Default: 50)*

- **resolution?: 'Original' | '720p' | '480p'**  
  Target resolution. *(Default: 'Original')*

- **frameRate?: number**  
  Frames per second. *(Default: 30)*

- **onProgress?: (progress: number, message: string) => void**  
  Hook to update progress (percentage and message).

- **onStatus?: (message: string) => void**  
  Hook for status messages.

- **onChunk?: (chunk: Uint8Array, position: number) => void**  
  Hook that fires whenever a chunk is produced (e.g., for simulated upload).

- **onComplete?: (result: Blob, info: { elapsedTime: number; fileSize: number }) => void**  
  Hook called upon successful completion with the final Blob and compression info.

- **onError?: (error: any) => void**  
  Hook for error handling.

### WebVideoCompress Class

- **Constructor:**  
  `new WebVideoCompress(options?: VideoCompressorOptions)`

- **Method:**  
  `async compress(file: File): Promise<Blob>`  
  Compresses the given video file and returns a Promise that resolves with a Blob containing the compressed MP4.

---

## How It Works

1. **Video Loading:**  
   A temporary video element loads the input file, ensuring metadata (like video dimensions) is available.

2. **Resolution Adjustment:**  
   The library computes the target resolution based on user options and adjusts dimensions to be even numbers.

3. **Frame Extraction & Encoding:**  
   An offscreen canvas is used to draw video frames, which are then encoded using the WebCodecs API. Progress is updated based on the number of frames processed.

4. **Audio Processing:**  
   If the video file contains an audio track, it is decoded and encoded separately. If audio decoding fails or there is no audio track, the process continues with a status update.

5. **Muxing:**  
   Encoded video and audio chunks are fed into an MP4 muxer (from mp4-muxer), which assembles the final MP4 file.

6. **Completion:**  
   Upon finishing the compression process, the library concatenates all the chunks into a Blob and triggers the onComplete hook.

---

## Browser Support

WebVideoCompress utilizes the modern [WebCodecs API](https://caniuse.com/webcodecs) to achieve efficient video encoding. According to [Can I use WebCodecs](https://caniuse.com/webcodecs) :contentReference[oaicite:2]{index=2}, the API is supported in:

- **Chrome:** Version 94 and later
- **Edge:** Version 94 and later
- **Firefox:** Version 130 and later
- **Safari:** Fully supported in Safari Technology Preview (TP) and partially supported in Safari versions 16.4–18.4

For full browser compatibility details, please visit the [Can I use WebCodecs page](https://caniuse.com/webcodecs).

---

## Contributing

Contributions are welcome! Feel free to submit issues, fork the repository, and create pull requests.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Acknowledgements

- The [WebCodecs API](https://caniuse.com/webcodecs) for enabling high-performance video processing in the browser.
- The developers of [mp4-muxer](https://github.com/edgeware/mp4-muxer) for providing a robust muxing solution.

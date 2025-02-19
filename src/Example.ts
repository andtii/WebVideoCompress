import { WebVideoCompress } from './WebVideoCompress';

document.addEventListener('DOMContentLoaded', () => {
  // --- Create Container ---
  const container = document.createElement('div');
  container.style.maxWidth = '600px';
  container.style.margin = '40px auto';
  container.style.padding = '20px';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  container.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(container);

  // --- Header ---
  const header = document.createElement('h1');
  header.textContent = 'Compress and Download a Video/Audio File';
  header.style.textAlign = 'center';
  header.style.marginBottom = '20px';
  container.appendChild(header);

  // --- File input with custom styled label ---
  const fileInputContainer = document.createElement('div');
  fileInputContainer.style.marginBottom = '20px';

  // Custom label that looks like the resolution dropdown
  const fileInputLabel = document.createElement('label');
  fileInputLabel.textContent = 'Choose File';
  fileInputLabel.style.padding = '4px 6px';
  fileInputLabel.style.border = '1px solid #ccc';
  fileInputLabel.style.borderRadius = '4px';
  fileInputLabel.style.backgroundColor = '#fff';
  fileInputLabel.style.color = '#333';
  fileInputLabel.style.cursor = 'pointer';
  fileInputLabel.style.display = 'inline-block';
  fileInputLabel.style.marginRight = '10px';
  fileInputContainer.appendChild(fileInputLabel);

  // Hidden file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'video/*,audio/*';
  fileInput.style.display = 'none';
  fileInputContainer.appendChild(fileInput);

  // When clicking the label, trigger the file input click
  fileInputLabel.addEventListener('click', () => fileInput.click());
  container.appendChild(fileInputContainer);

  // --- Resolution dropdown with label ---
  const resolutionContainer = document.createElement('div');
  resolutionContainer.style.marginBottom = '20px';
  const resolutionLabel = document.createElement('label');
  resolutionLabel.textContent = 'Resolution: ';
  resolutionLabel.style.marginRight = '10px';
  resolutionContainer.appendChild(resolutionLabel);
  const resolutionSelect = document.createElement('select');
  resolutionSelect.style.padding = '4px 6px';
  resolutionSelect.style.border = '1px solid #ccc';
  resolutionSelect.style.borderRadius = '4px';
  ['Original', '720p', '480p'].forEach((res) => {
    const option = document.createElement('option');
    option.value = res;
    option.textContent = res;
    resolutionSelect.appendChild(option);
  });
  resolutionContainer.appendChild(resolutionSelect);
  container.appendChild(resolutionContainer);

  // --- Quality slider with label and display ---
  const sliderContainer = document.createElement('div');
  sliderContainer.style.marginBottom = '20px';
  const sliderLabel = document.createElement('label');
  sliderLabel.textContent = 'Quality (Bitrate): ';
  sliderLabel.style.marginRight = '10px';
  sliderContainer.appendChild(sliderLabel);
  const bitrateSlider = document.createElement('input');
  bitrateSlider.type = 'range';
  bitrateSlider.style.verticalAlign = 'middle';
  sliderContainer.appendChild(bitrateSlider);
  const bitrateDisplay = document.createElement('span');
  bitrateDisplay.style.marginLeft = '10px';
  sliderContainer.appendChild(bitrateDisplay);
  container.appendChild(sliderContainer);

  // --- Process button ---
  const processBtn = document.createElement('button');
  processBtn.textContent = 'Process and Compress';
  processBtn.style.padding = '10px 20px';
  processBtn.style.fontSize = '16px';
  processBtn.style.cursor = 'pointer';
  processBtn.style.backgroundColor = '#007BFF';
  processBtn.style.border = 'none';
  processBtn.style.borderRadius = '4px';
  processBtn.style.color = '#fff';
  processBtn.style.display = 'block';
  processBtn.style.margin = '0 auto 20px';
  container.appendChild(processBtn);

  // --- Progress container (hidden until started) ---
  const progressContainer = document.createElement('div');
  progressContainer.style.marginTop = '20px';
  progressContainer.style.marginBottom = '20px';
  progressContainer.style.display = 'none'; // Hidden until compression starts
  const progressInfo = document.createElement('p');
  progressInfo.textContent = 'Progress: 0%';
  progressInfo.style.marginBottom = '10px';
  progressContainer.appendChild(progressInfo);
  const progressBar = document.createElement('progress');
  progressBar.value = 0;
  progressBar.max = 100;
  progressBar.style.width = '100%';
  progressBar.style.height = '20px';
  progressBar.style.borderRadius = '4px';
  progressContainer.appendChild(progressBar);
  container.appendChild(progressContainer);

  // --- Time and size display ---
  const timeDisplay = document.createElement('p');
  timeDisplay.style.marginTop = '10px';
  timeDisplay.style.marginBottom = '20px';
  container.appendChild(timeDisplay);

  // --- Download link (hidden until complete) ---
  const downloadLink = document.createElement('a');
  downloadLink.style.display = 'none';
  downloadLink.textContent = 'Download Compressed File';
  downloadLink.style.textDecoration = 'none';
  downloadLink.style.color = '#007BFF';
  downloadLink.style.fontWeight = 'bold';
  downloadLink.style.textAlign = 'center';
  downloadLink.style.display = 'block';
  container.appendChild(downloadLink);

  // --- Helper Functions ---
  // Get bitrate range based on selected resolution.
  function getBitrateRange(resolution: string): { min: number; max: number } {
    switch (resolution) {
      case '480p':
        return { min: 500000, max: 5000000 };
      case '720p':
        return { min: 1000000, max: 7000000 };
      case 'Original':
      default:
        return { min: 2000000, max: 10000000 };
    }
  }

  // Update slider attributes and display based on resolution.
  function updateSliderForResolution() {
    const { min, max } = getBitrateRange(resolutionSelect.value);
    bitrateSlider.min = min.toString();
    bitrateSlider.max = max.toString();
  
    // Set default value (midpoint)
    const defaultValue = Math.round((min + max) / 2);
    bitrateSlider.value = defaultValue.toString();
  
    // Update display
    bitrateSlider.dispatchEvent(new Event('input'));
  }
  
  // --- Event Listeners ---
  resolutionSelect.addEventListener('change', () => {
    updateSliderForResolution();
  });

  bitrateSlider.addEventListener('input', () => {
    const currentValue = Number(bitrateSlider.value);
    bitrateDisplay.textContent = `${currentValue} bps (${(currentValue / 1000000).toFixed(2)} Mbps)`;
  });

  // Initialize slider for default resolution.
  updateSliderForResolution();

  processBtn.addEventListener('click', async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a file first!');
      return;
    }

    // Show the progress container when processing starts.
    progressContainer.style.display = 'block';

    const originalFile = fileInput.files[0];
    const originalFileSizeMB = (originalFile.size / (1024 * 1024)).toFixed(2);
    const qualityBitrate = Number(bitrateSlider.value);

    // Instantiate the compressor with options from UI.
    const compressor = new WebVideoCompress({
      quality: qualityBitrate,
      resolution: resolutionSelect.value as 'Original' | '720p' | '480p',
      frameRate: 30,
      onProgress: (progress, message) => {
        progressBar.value = progress;
        progressInfo.textContent = message;
      },
      onStatus: (message) => {
        console.log('Status:', message);
      },
      onChunk: (chunk, position) => {
        console.log(`Chunk at position ${position}: ${chunk.byteLength} bytes`);
      },
      onComplete: (blob, info) => {
        // Prepare download link and show it.
        const downloadUrl = URL.createObjectURL(blob);
        downloadLink.href = downloadUrl;
        downloadLink.download = 'compressed_output.mp4';
        downloadLink.style.display = 'block';

        // Show time and size info.
        const outputSizeMB = (info.fileSize / (1024 * 1024)).toFixed(2);
        timeDisplay.textContent =
          `Compression took ${info.elapsedTime.toFixed(2)} seconds.\n` +
          `Original File: ${originalFileSizeMB} MB, Compressed Output: ${outputSizeMB} MB.`;
      },
      onError: (error) => {
        console.error('Compression error:', error);
        alert('An error occurred during compression.');
      }
    });

    // Start compression.
    try {
      await compressor.compress(originalFile);
    } catch (e) {
      console.error(e);
    }
  });
});

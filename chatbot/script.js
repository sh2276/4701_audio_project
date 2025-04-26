// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('record-btn');
  const stopBtn = document.getElementById('stop-btn');
  const chatContainer = document.getElementById('chat-container');
  const recordingStatus = document.querySelector('.status.recording');
  const processingStatus = document.querySelector('.status.processing');
  const errorStatus = document.querySelector('.status.error');
  const recordingTimer = document.getElementById('recording-timer');
  const visualizer = document.getElementById('visualizer');
  const typingIndicator = document.getElementById('typing-indicator');
  const ttsPlayer = document.getElementById('tts-player');
  const ttsAudio = document.getElementById('tts-audio');

  // App State
  let mediaRecorder = null;
  let recordingTimerId = null;
  let recordingDuration = 0;
  let audioContext = null;
  let analyser = null;
  let visualizationStarted = false;

  // Recording state
  let currentRecording = {
    chunks: [],
    blob: null,
    url: null
  };

  // Setup audio visualizer
  function setupVisualizer() {
    if (!visualizationStarted) {
      // Create 30 bars for the visualizer
      for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizer.appendChild(bar);
      }
      visualizationStarted = true;
    }
  }

  // Update visualizer with audio data
  function updateVisualizer(analyser) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bars = document.querySelectorAll('.visualizer-bar');

    function draw() {
      if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

      analyser.getByteFrequencyData(dataArray);

      // Get average levels for each bar
      const step = Math.floor(dataArray.length / bars.length);

      bars.forEach((bar, index) => {
        const start = index * step;
        let sum = 0;

        for (let i = 0; i < step; i++) {
          sum += dataArray[start + i];
        }

        const average = sum / step;
        const height = Math.max(3, (average / 255) * 100);
        bar.style.height = `${height}%`;
      });

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }

  // Format time for the timer display
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Update recording timer
  function updateTimer() {
    recordingDuration++;
    recordingTimer.textContent = formatTime(recordingDuration);
  }

  // Reset all statuses
  function resetStatuses() {
    recordingStatus.style.display = 'none';
    processingStatus.style.display = 'none';
    errorStatus.style.display = 'none';
    typingIndicator.classList.remove('active');
  }

  // Reset recording state
  function resetRecordingState() {
    currentRecording = {
      chunks: [],
      blob: null,
      url: null
    };
  }

  // Reset the audio recording interface
  function resetRecordingInterface() {
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordingStatus.style.display = 'none';
    recordingTimer.textContent = '00:00';
    recordingDuration = 0;

    // Reset visualizer bars
    const bars = document.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
      bar.style.height = '50%';
    });
  }

  // Add a message to the chat container
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = text;

    // Insert before the typing indicator
    chatContainer.insertBefore(messageDiv, typingIndicator);

    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Show typing indicator
  function showTypingIndicator() {
    typingIndicator.classList.add('active');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Hide typing indicator
  function hideTypingIndicator() {
    typingIndicator.classList.remove('active');
  }

  // Initialize audio recording
  async function initializeRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for visualization
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      setupVisualizer();
      updateVisualizer(analyser);

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentRecording.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop timer
        clearInterval(recordingTimerId);

        // Create the blob from chunks
        currentRecording.blob = new Blob(currentRecording.chunks, { type: 'audio/wav' });
        currentRecording.url = URL.createObjectURL(currentRecording.blob);

        // Update UI
        resetRecordingInterface();

        // Process the audio
        await processAudio(currentRecording.blob);
      };

      // Update UI
      recordBtn.disabled = false;

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing your microphone. Please check permissions and try again.');
      recordBtn.disabled = true;
    }
  }

  // Process the recorded audio
  async function processAudio(audioBlob) {
    if (!audioBlob) {
      console.error('No audio data available');
      errorStatus.style.display = 'block';
      errorStatus.textContent = 'Error: No audio data available';
      return;
    }

    resetStatuses();
    processingStatus.style.display = 'block';

    try {
      // Step 1: Transcribe the audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const transcribeResponse = await fetch('http://localhost:8001/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!transcribeResponse.ok) {
        throw new Error(`Transcription API error: ${transcribeResponse.status}`);
      }

      const transcribeData = await transcribeResponse.json();

      if (!transcribeData.success) {
        throw new Error(transcribeData.error || 'Transcription failed');
      }

      // Add user message to chat
      addMessage(transcribeData.text, true);

      // Step 2: Get response from Gemini
      showTypingIndicator();

      const chatResponse = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcribeData.text })
      });

      if (!chatResponse.ok) {
        throw new Error(`Chat API error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();

      if (!chatData.success) {
        throw new Error(chatData.error || 'Chat response generation failed');
      }

      // Hide typing indicator and add bot message
      hideTypingIndicator();
      addMessage(chatData.text);

      // Step 3: Convert bot response to speech
      const ttsResponse = await fetch('http://localhost:8001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: chatData.text })
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS API error: ${ttsResponse.status}`);
      }

      // Convert the response to a blob - using a different variable name to avoid shadowing
      const ttsAudioBlob = await ttsResponse.blob();
      const ttsAudioUrl = URL.createObjectURL(ttsAudioBlob);

      // Set the audio source and show the player
      ttsAudio.src = ttsAudioUrl;
      ttsPlayer.classList.add('active');
      const talkingAnimation = document.querySelector('.talking-animation');

      // Add event listeners for audio playback
      ttsAudio.addEventListener('play', () => {
        talkingAnimation.classList.add('active');
      });

      ttsAudio.addEventListener('ended', () => {
        talkingAnimation.classList.remove('active');
        ttsPlayer.classList.remove('active');
      });

      ttsAudio.addEventListener('pause', () => {
        talkingAnimation.classList.remove('active');
      });

      // Automatically play the audio
      ttsAudio.play().catch(e => {
        console.error('Error auto-playing audio:', e);
        // Auto-play may be blocked by browser policy
        talkingAnimation.classList.remove('active');
      });

      processingStatus.style.display = 'none';

    } catch (error) {
      console.error('Processing error:', error);
      processingStatus.style.display = 'none';
      errorStatus.style.display = 'block';
      errorStatus.textContent = `Error: ${error.message}`;

      // Hide error message after 5 seconds
      setTimeout(() => {
        errorStatus.style.display = 'none';
      }, 5000);
    }
  }

  // Start recording
  recordBtn.addEventListener('click', () => {
    resetRecordingState();
    mediaRecorder.start();

    // Update UI
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    recordingStatus.style.display = 'flex';

    // Start timer
    recordingDuration = 0;
    recordingTimer.textContent = '00:00';
    recordingTimerId = setInterval(updateTimer, 1000);
  });

  // Stop recording
  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  });

  // Initialize on page load
  resetStatuses();
  resetRecordingState();
  initializeRecording();
}); 
// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    const recordTab = document.getElementById('record-tab');
    const uploadTab = document.getElementById('upload-tab');
    const tabs = document.querySelectorAll('.tab');
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const transcribeAudioBtn = document.getElementById('transcribe-audio-btn');
    const transcribeFileBtn = document.getElementById('transcribe-file-btn');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const recordingStatus = document.querySelector('.status.recording');
    const processingStatus = document.querySelector('.status.processing');
    const successStatus = document.querySelector('.status.success');
    const errorStatus = document.querySelector('.status.error');
    const transcript = document.getElementById('transcript');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const playTtsBtn = document.getElementById('play-tts-btn');
    const ttsPlayer = document.getElementById('tts-player');
    const ttsAudio = document.getElementById('tts-audio');
    const recordingTimer = document.getElementById('recording-timer');
    const visualizer = document.getElementById('visualizer');
    const clipsContainer = document.getElementById('clips-container');

    // App State
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let audioFile;
    let audioURL;
    let recordingTimerId;
    let recordingDuration = 0;
    let audioContext;
    let analyser;
    let visualizationStarted = false;
    let currentAudioSource = null; // Either 'recording' or 'file'

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

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
        successStatus.style.display = 'none';
        errorStatus.style.display = 'none';
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
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                // Create audio blob and URL
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioURL = URL.createObjectURL(audioBlob);
                
                // Stop timer
                clearInterval(recordingTimerId);
                
                // Update UI
                resetRecordingInterface();
                
                // Create audio element to play back recording
                createAudioClip(audioURL);
                
                // Enable transcribe button
                transcribeAudioBtn.disabled = false;
                
                // Set current audio source
                currentAudioSource = 'recording';
            };
            
            // Update UI
            recordBtn.disabled = false;
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing your microphone. Please check permissions and try again.');
            recordBtn.disabled = true;
        }
    }

    // Create audio clip element
    function createAudioClip(audioURL) {
        const clipContainer = document.createElement('div');
        clipContainer.className = 'clip';
        
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = audioURL;
        
        const clipControls = document.createElement('div');
        clipControls.className = 'clip-controls';
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = 'Delete';
        deleteButton.addEventListener('click', () => {
            clipContainer.remove();
            audioChunks = [];
            audioBlob = null;
            audioURL = null;
            transcribeAudioBtn.disabled = true;
        });
        
        clipControls.appendChild(deleteButton);
        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipControls);
        
        clipsContainer.innerHTML = '';
        clipsContainer.appendChild(clipContainer);
    }

    // Start recording
    recordBtn.addEventListener('click', () => {
        audioChunks = [];
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
        mediaRecorder.stop();
    });

    // Handle file upload via drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f1f5f9';
        uploadArea.style.borderColor = '#4f46e5';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = '';
        uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        uploadArea.style.borderColor = '';
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Handle file upload via input
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    // Process uploaded file
    function handleFile(file) {
        if (file.type.startsWith('audio/')) {
            audioFile = file;
            fileName.textContent = file.name;
            transcribeFileBtn.disabled = false;
            currentAudioSource = 'file';
        } else {
            alert('Please upload an audio file.');
            fileInput.value = '';
            fileName.textContent = '';
            transcribeFileBtn.disabled = true;
        }
    }

    // Function to prepare audio for API submission
    async function prepareAudioForAPI() {
        let formData = new FormData();
        
        if (currentAudioSource === 'recording') {
            formData.append('audio', audioBlob, 'recording.wav');
        } else if (currentAudioSource === 'file') {
            formData.append('audio', audioFile);
        } else {
            throw new Error('No audio source available');
        }
        
        return formData;
    }

    // Transcribe recorded audio
    transcribeAudioBtn.addEventListener('click', async () => {
        await transcribeAudio();
    });

    // Transcribe uploaded file
    transcribeFileBtn.addEventListener('click', async () => {
        await transcribeAudio();
    });

    // Transcribe audio function
    async function transcribeAudio() {
        resetStatuses();
        processingStatus.style.display = 'block';
        transcript.textContent = '';
        ttsPlayer.classList.remove('active');
        playTtsBtn.disabled = true;
        
        try {
            const formData = await prepareAudioForAPI();
            
            // Make the API call to your local Flask backend
            const response = await fetch('http://localhost:8000/api/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Transcription failed');
            }
            
            // Update UI with transcription
            transcript.textContent = data.text;
            copyBtn.disabled = false;
            downloadBtn.disabled = false;
            playTtsBtn.disabled = false;
            
            processingStatus.style.display = 'none';
            successStatus.style.display = 'block';
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successStatus.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('Transcription error:', error);
            processingStatus.style.display = 'none';
            errorStatus.style.display = 'block';
            errorStatus.textContent = `Error: ${error.message}`;
            
            // Hide error message after 5 seconds
            setTimeout(() => {
                errorStatus.style.display = 'none';
            }, 5000);
        }
    }

    // Play TTS function
    async function playTTS() {
        const text = transcript.textContent;
        
        if (!text) {
            alert('No transcription text to play.');
            return;
        }
        
        resetStatuses();
        processingStatus.style.display = 'block';
        ttsPlayer.classList.remove('active');
        
        try {
            // Make the API call to your TTS endpoint
            const response = await fetch('http://localhost:8000/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            // Convert the response to a blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Set the audio source and show the player
            ttsAudio.src = audioUrl;
            ttsPlayer.classList.add('active');
            
            // Automatically play the audio
            ttsAudio.play().catch(e => {
                console.error('Error auto-playing audio:', e);
                // Auto-play may be blocked by browser policy, so we'll just display the player
            });
            
            processingStatus.style.display = 'none';
            
        } catch (error) {
            console.error('TTS error:', error);
            processingStatus.style.display = 'none';
            errorStatus.style.display = 'block';
            errorStatus.textContent = `TTS Error: ${error.message}`;
            
            // Hide error message after 5 seconds
            setTimeout(() => {
                errorStatus.style.display = 'none';
            }, 5000);
        }
    }

    // Play TTS button handler
    playTtsBtn.addEventListener('click', playTTS);

    // Copy transcript to clipboard
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(transcript.textContent)
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = 'Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy text. Please try again.');
            });
    });

    // Download transcript as text file
    downloadBtn.addEventListener('click', () => {
        const text = transcript.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initialize on page load
    resetStatuses();
    initializeRecording();
});
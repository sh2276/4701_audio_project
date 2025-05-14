# AI Voice Chatbot

A standalone chatbot that uses Whisper for speech-to-text transcription, Google's Gemini API for generating responses, and Piper for text-to-speech synthesis.

## Features

- **Speech-to-Text**: Uses OpenAI's Whisper model to transcribe user voice input
- **AI Chat**: Integrates with Google's Gemini API to generate intelligent responses
- **Text-to-Speech**: Uses Piper TTS to convert AI responses to speech
- **Real-time Audio Visualization**: Visual feedback during recording
- **Modern UI**: Clean, responsive interface with chat-like experience
- **Executable Version**: Available as a standalone executable for easy distribution

## Prerequisites

- Python 3.8+ (for development)
- Node.js and npm (for serving the frontend in development)
- Piper TTS installed and available in your PATH
- Google Gemini API key

## Setup

### Development Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd chatbot
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Gemini API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. Make sure the Piper model files are accessible:
   - The backend is configured to look for the Piper model files in the parent directory
   - If your model files are located elsewhere, update the paths in `backend.py`

### Running the Development Version

1. Start the backend server:
   ```
   python backend.py
   ```
   The server will run on http://localhost:8001

2. Serve the frontend:
   You can use any simple HTTP server. For example, with Python:
   ```
   python -m http.server 8080
   ```
   Or with Node.js:
   ```
   npx serve
   ```

3. Open your browser and navigate to:
   - If using Python's HTTP server: http://localhost:8080
   - If using Node's serve: http://localhost:3000

### Building the Executable

1. Run the build script:
   ```
   python build.py
   ```

2. The executable will be created in the `dist` directory.

3. For Windows users, you can use the provided batch file:
   ```
   run_chatbot.bat
   ```

4. For other platforms, run the executable directly:
   ```
   ./dist/AI_Voice_Chatbot
   ```

5. **Important**: Before running the executable, rename the `.env.sample` file to `.env` and add your API keys.

## Usage

1. Click the "Start Recording" button to begin speaking
2. Click "Stop Recording" when you're done
3. The system will:
   - Transcribe your speech to text
   - Send the text to Gemini for processing
   - Display the response in the chat
   - Convert the response to speech and play it

## Environment Variables

The application uses a `.env` file to store sensitive information like API keys. This file is:
- Not tracked by Git (added to .gitignore)
- Not included in the executable package
- Required for the application to function properly

When distributing the application:
1. Provide a `.env.sample` file with placeholder values
2. Instruct users to rename it to `.env` and add their own API keys
3. Never include your actual API keys in the distributed files

## Troubleshooting

- **Microphone Access**: Ensure your browser has permission to access your microphone
- **API Key**: Verify your Gemini API key is correctly set in the `.env` file
- **Piper TTS**: Make sure Piper is installed and the model files are accessible
- **CORS Issues**: If you encounter CORS errors, ensure the backend is running and accessible
- **Executable Issues**: If the executable doesn't start, check that the `.env` file is properly configured

## License

[MIT License](LICENSE) 
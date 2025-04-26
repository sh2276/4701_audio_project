import os
import tempfile
import base64
import subprocess
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import whisper
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load Whisper tiny model
print("Loading Whisper tiny model...")
model = whisper.load_model("tiny")
print("Model loaded successfully!")

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured successfully!")

# Define Peter Griffin's system prompt
PETER_SYSTEM_PROMPT = """You are Peter Griffin from Family Guy. Follow these rules for speaking:

1. Use simple words and short sentences like Peter would
2. Keep responses between 1 to 3 sentences only
3. Use Peters catchphrases 
4. Make random references to TV shows and movies
5. Act confused about complicated things
6. Mention your family like Lois Chris Meg Stewie and Brian
7. Speak naturally like you are talking to a friend
8. Avoid using special characters symbols or complicated punctuation
9. Use basic punctuation only periods and question marks
10. Write numbers as words
11. Spell out any sound effects like ahhhh or whaaaat
12. Use simple everyday words that are easy to pronounce

Remember you are having a casual conversation and your words will be spoken out loud by a text to speech system."""

# Path to your Piper model and JSON file
# Update these paths to match your actual file locations
PIPER_MODEL_PATH = "../en_US--medium.onnx"
PIPER_JSON_PATH = "../en_US--medium.onnx.json"

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        # Create a temporary file to store the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_filename = temp_audio.name
            audio_file.save(temp_filename)
        
        print(f"Transcribing audio file: {temp_filename}")
        
        # Transcribe with Whisper tiny model
        result = model.transcribe(temp_filename)
        
        # Clean up the temporary file
        os.unlink(temp_filename)
        
        return jsonify({
            'success': True,
            'text': result['text']
        })
    
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat_with_gemini():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        user_text = data['text']
        if not user_text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        print(f"Generating Gemini response for: {user_text[:50]}...")
        
        # Initialize the Gemini model with the flash version
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate a response with the system prompt included
        prompt = f"{PETER_SYSTEM_PROMPT}\n\nUser: {user_text}\n\nPeter Griffin:"
        response = model.generate_content(prompt)
        
        # Extract the text from the response
        response_text = response.text
        
        return jsonify({
            'success': True,
            'text': response_text
        })
    
    except Exception as e:
        print(f"Error during Gemini response generation: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    temp_audio_filename = None
    
    try:
        # Get text from request
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        print(f"Generating TTS for text: {text[:50]}...")
        
        # Create a temp file for the output audio
        temp_audio_fd, temp_audio_filename = tempfile.mkstemp(suffix='.wav')
        os.close(temp_audio_fd)  # Close the file descriptor
        
        # Run Piper TTS command using stdin for input
        cmd = ['piper', '--model', PIPER_MODEL_PATH, '-f', temp_audio_filename]
        
        print(f"Executing command: {' '.join(cmd)}")
        
        # Create the process and pipe the text to stdin
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send the text to stdin and wait for the process to complete
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode != 0:
            raise Exception(f"Piper TTS failed with code {process.returncode}: {stderr}")
        
        # Check if the file was created and has content
        if not os.path.exists(temp_audio_filename) or os.path.getsize(temp_audio_filename) == 0:
            raise Exception("TTS process completed but no valid audio file was generated")
        
        print(f"TTS generation successful. Audio file size: {os.path.getsize(temp_audio_filename)} bytes")
        
        # Return the audio file
        return send_file(
            temp_audio_filename,
            mimetype='audio/wav',
            as_attachment=True,
            download_name='tts_output.wav'
        )
    
    except Exception as e:
        print(f"Error during TTS generation: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    
    finally:
        # Schedule cleanup of temporary audio file after sending
        # Note: This is tricky because Flask might still be sending the file
        # A more robust solution would use a background task or cleanup job
        try:
            if temp_audio_filename and os.path.exists(temp_audio_filename):
                # We'll try to remove it, but this might fail if the file is still being sent
                subprocess.Popen(['rm', temp_audio_filename], 
                               stderr=subprocess.DEVNULL, 
                               stdout=subprocess.DEVNULL)
        except Exception as e:
            print(f"Warning: Could not schedule cleanup of temporary file: {str(e)}")

if __name__ == '__main__':
    # Check if the model files exist
    if not os.path.exists(PIPER_MODEL_PATH):
        print(f"Warning: Piper model file not found at {PIPER_MODEL_PATH}")
        print(f"Current working directory: {os.getcwd()}")
    else:
        print(f"Found Piper model at: {os.path.abspath(PIPER_MODEL_PATH)}")
    
    if not os.path.exists(PIPER_JSON_PATH):
        print(f"Warning: Piper JSON config not found at {PIPER_JSON_PATH}")
    
    app.run(host='0.0.0.0', port=8001, debug=True) 
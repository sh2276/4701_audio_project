import os
import tempfile
import base64
import subprocess
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import whisper

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load Whisper tiny model
print("Loading Whisper tiny model...")
model = whisper.load_model("tiny")
print("Model loaded successfully!")

# Path to your Piper model and JSON file
# Update these paths to match your actual file locations
PIPER_MODEL_PATH = "en_US--medium.onnx"
PIPER_JSON_PATH = "en_US--medium.onnx.json"

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
    
    app.run(host='0.0.0.0', port=8000, debug=True)

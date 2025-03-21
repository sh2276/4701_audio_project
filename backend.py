import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load Whisper tiny model
print("Loading Whisper tiny model...")
model = whisper.load_model("tiny")
print("Model loaded successfully!")

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

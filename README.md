This is the GitHub repository for the CS 4701 (AI Practicum) project by Matthew Baum, Sahil Hosalli, and Alkis Boukas. This README mainly pertains to the Speech-to-Speech application outlined in the report, with additional information about the chatbot and training/experimentation notebooks provided at the bottom. 

# Speech-to-Speech App

A simple web application for transcribing audio using OpenAI's Whisper model.

## Prerequisites

- Python 3.7+
- FFmpeg

## Quick Setup

### 1. Install FFmpeg

#### Windows:
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Add to PATH

#### macOS:
```bash
brew install ffmpeg
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

### 2. Set up Python environment

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install required packages using requirements.txt and extra pip command
pip install -r requirements.txt
pip install piper-tts --no-deps piper-phonemize-cross onnxruntime numpy
```

### 3. Run the application

```bash
# Start the backend (in the activated venv)
python backend.py
```

Then simply open `index.html` in your web browser.

Note: Make sure the port in your JavaScript file matches the port in your Flask app (8000).

---

For the chatbot app, please take a look at `chatbot/README.md`

---

For the Python notebooks used for training and experimentation, please take a look at `colab_notebooks/`


import os
import shutil
import subprocess
from pathlib import Path

def build_executable():
    # Create a temporary directory for the build
    build_dir = Path("build")
    dist_dir = Path("dist")
    
    # Clean up previous builds
    if build_dir.exists():
        shutil.rmtree(build_dir)
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    
    # Create a spec file for PyInstaller
    spec_content = """
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['backend.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('index.html', '.'),
        ('script.js', '.'),
        ('requirements.txt', '.'),
        ('README.md', '.'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AI_Voice_Chatbot',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""
    
    # Write the spec file
    with open("chatbot.spec", "w") as f:
        f.write(spec_content)
    
    # Install PyInstaller if not already installed
    subprocess.run(["pip", "install", "pyinstaller"], check=True)
    
    # Build the executable
    subprocess.run(["pyinstaller", "chatbot.spec"], check=True)
    
    # Clean up the spec file
    os.remove("chatbot.spec")
    
    # Create a sample .env file in the dist directory
    sample_env_path = os.path.join("dist", ".env.sample")
    with open(sample_env_path, "w") as f:
        f.write("# API Keys for AI Voice Chatbot\n")
        f.write("# Rename this file to .env and add your API keys\n\n")
        f.write("GOOGLE_API_KEY=your_google_api_key_here\n")
        f.write("# Add any other required API keys\n")
    
    print("Build complete! The executable is in the 'dist' directory.")
    print("A sample .env file has been created. Users should rename it to .env and add their API keys.")

if __name__ == "__main__":
    build_executable() 
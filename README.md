# Wav2Lip Streamlit Interface

A Streamlit-based web interface for the Wav2Lip model, allowing users to easily create lip-synced videos by combining video and audio inputs.

## Features

- 🎥 Upload video files (MP4, AVI, MOV)
- 🎵 Upload audio files (WAV, MP3)
- ⚡️ Fast processing with GPU support
- 🎨 High-quality output with GAN model option
- 📱 Mobile-friendly interface
- 🌐 Public URL sharing via Ngrok

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wav2lip_streamlit.git
cd wav2lip_streamlit
```

2. Install dependencies:
```bash
pip install -r Wav2Lip/requirements.txt
```

3. Download the pre-trained models:
- Place the Wav2Lip model in `Wav2Lip/checkpoints/wav2lip.pth`
- Place the GAN model in `Wav2Lip/checkpoints/wav2lip_gan.pth`

## Usage

1. Start the Streamlit app:
```bash
streamlit run Wav2Lip/app.py
```

2. Access the web interface at `http://localhost:8503`

3. To make the app publicly accessible, run Ngrok:
```bash
ngrok http 8503
```

## Requirements

- Python 3.6+
- CUDA-capable GPU (recommended)
- FFmpeg
- See `Wav2Lip/requirements.txt` for full list of dependencies

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original Wav2Lip implementation: [Wav2Lip](https://github.com/Rudrabha/Wav2Lip)
- Streamlit for the web interface
- Ngrok for public URL sharing

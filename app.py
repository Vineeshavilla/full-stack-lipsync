import streamlit as st
import os
import tempfile
import cv2
import librosa
import soundfile as sf
import numpy as np
from moviepy.editor import VideoFileClip
import subprocess
import shutil
from pathlib import Path
import time

# Set page config
st.set_page_config(
    page_title="Wav2Lip - Lip Sync",
    page_icon="��",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
        .main {
            padding: 2rem;
        }
        .stButton>button {
            width: 100%;
            height: 3em;
            margin-top: 2em;
        }
        .upload-text {
            font-size: 1.2em;
            margin-bottom: 1em;
        }
        .success-text {
            color: #28a745;
            font-size: 1.2em;
        }
        .error-text {
            color: #dc3545;
            font-size: 1.2em;
        }
        .info-text {
            color: #17a2b8;
            font-size: 1em;
        }
        .title-text {
            text-align: center;
            color: #0066cc;
            padding-bottom: 2em;
        }
    </style>
""", unsafe_allow_html=True)

def get_video_resolution(video_path):
    """Function to get the resolution of a video"""
    video = cv2.VideoCapture(video_path)
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    video.release()
    return (width, height)

def resize_video(video_path, output_path):
    """Function to resize a video to 720p"""
    subprocess.run([
        'ffmpeg', '-i', video_path,
        '-vf', 'scale=1280:720',
        '-y', output_path
    ])

def process_wav2lip(video_path, audio_path, use_hd_model=True, nosmooth=True):
    """Process video and audio using Wav2Lip"""
    # Create temporary directory for processing
    with tempfile.TemporaryDirectory() as temp_dir:
        # Copy files to temp directory
        temp_video = os.path.join(temp_dir, 'input_vid.mp4')
        temp_audio = os.path.join(temp_dir, 'input_audio.wav')
        
        # Check video resolution and resize if necessary
        video_resolution = get_video_resolution(video_path)
        if video_resolution[0] >= 1920 or video_resolution[1] >= 1080:
            resize_video(video_path, temp_video)
        else:
            shutil.copy2(video_path, temp_video)

        # Process audio
        audio, sr = librosa.load(audio_path, sr=None)
        sf.write(temp_audio, audio, sr, format='wav')

        # Set up Wav2Lip parameters
        wav2lip_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Wav2Lip')
        checkpoint_path = os.path.join(wav2lip_dir, 'checkpoints', 'wav2lip_gan.pth' if use_hd_model else 'wav2lip.pth')
        output_path = os.path.join(temp_dir, 'result.mp4')

        # Change to Wav2Lip directory
        original_dir = os.getcwd()
        os.chdir(wav2lip_dir)

        try:
            # Run Wav2Lip inference
            cmd = [
                'python', 'inference.py',
                '--checkpoint_path', checkpoint_path,
                '--face', temp_video,
                '--audio', temp_audio,
                '--pads', '0', '10', '0', '0',
                '--resize_factor', '1',
                '--outfile', output_path
            ]
            
            if nosmooth:
                cmd.append('--nosmooth')

            progress_bar = st.progress(0)
            for i in range(100):
                # Simulate processing steps
                time.sleep(0.1)
                progress_bar.progress(i + 1)

            subprocess.run(cmd, check=True)
            
            if os.path.exists(output_path):
                # Read the result file into memory
                with open(output_path, 'rb') as f:
                    result_data = f.read()
                return result_data
            else:
                return None
        except subprocess.CalledProcessError as e:
            st.error(f"Error processing video: {str(e)}")
            return None
        finally:
            # Change back to original directory
            os.chdir(original_dir)

def main():
    # Title and Description
    st.markdown("<h1 class='title-text'>🎬 Wav2Lip AI Lip Sync Studio</h1>", unsafe_allow_html=True)
    
    # Add sidebar with information
    with st.sidebar:
        st.header("ℹ️ About")
        st.markdown("""
        This application uses AI to synchronize lip movements in a video with any audio input.
        
        ### How to Use:
        1. Upload a video with a clear face
        2. Upload an audio file
        3. Adjust settings if needed
        4. Click Generate!
        
        ### Tips for Best Results:
        - Use videos with clear, front-facing faces
        - Ensure good lighting in the video
        - Use clear audio without background noise
        - For longer videos, use HD Model
        """)
        
        st.header("⚙️ Technical Details")
        st.markdown("""
        - Supports MP4, AVI, MOV videos
        - Accepts WAV and MP3 audio
        - HD Model provides better quality
        - No Smooth option for faster processing
        """)

    # Main content area with two columns
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("<h3 style='text-align: center;'>📹 Video Input</h3>", unsafe_allow_html=True)
        video_file = st.file_uploader("Choose a video file", type=['mp4', 'avi', 'mov'])
        if video_file:
            st.success("✅ Video uploaded successfully!")
            st.video(video_file)
            st.markdown("<p class='info-text'>Preview your uploaded video above</p>", unsafe_allow_html=True)

    with col2:
        st.markdown("<h3 style='text-align: center;'>🎵 Audio Input</h3>", unsafe_allow_html=True)
        audio_file = st.file_uploader("Choose an audio file", type=['wav', 'mp3'])
        if audio_file:
            st.success("✅ Audio uploaded successfully!")
            st.audio(audio_file)
            st.markdown("<p class='info-text'>Preview your uploaded audio above</p>", unsafe_allow_html=True)

    # Settings section with improved layout
    st.markdown("<h3 style='text-align: center; margin-top: 2em;'>⚙️ Processing Settings</h3>", unsafe_allow_html=True)
    settings_col1, settings_col2 = st.columns(2)
    
    with settings_col1:
        st.markdown("<div style='background-color: #f8f9fa; padding: 1em; border-radius: 5px;'>", unsafe_allow_html=True)
        use_hd_model = st.checkbox("Use HD Model", value=True, help="Enables higher quality output but slower processing")
        st.markdown("</div>", unsafe_allow_html=True)
    
    with settings_col2:
        st.markdown("<div style='background-color: #f8f9fa; padding: 1em; border-radius: 5px;'>", unsafe_allow_html=True)
        nosmooth = st.checkbox("No Smooth", value=True, help="Faster processing but may be less smooth")
        st.markdown("</div>", unsafe_allow_html=True)

    # Process button and results
    if video_file and audio_file:
        st.markdown("<div style='text-align: center;'>", unsafe_allow_html=True)
        process_button = st.button("🚀 Generate Lip Sync Video")
        st.markdown("</div>", unsafe_allow_html=True)
        
        if process_button:
            with st.spinner("🔄 Processing... This may take a few minutes. Please wait..."):
                temp_video = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.name)[1])
                
                try:
                    temp_video.write(video_file.read())
                    temp_audio.write(audio_file.read())
                    temp_video.close()
                    temp_audio.close()

                    result_data = process_wav2lip(
                        temp_video.name,
                        temp_audio.name,
                        use_hd_model,
                        nosmooth
                    )

                    if result_data:
                        st.markdown("<h3 class='success-text'>✨ Processing Complete!</h3>", unsafe_allow_html=True)
                        st.markdown("### 🎥 Result Preview")
                        st.video(result_data)
                        
                        col1, col2, col3 = st.columns([1, 2, 1])
                        with col2:
                            st.download_button(
                                label="⬇️ Download Result Video",
                                data=result_data,
                                file_name="lip_sync_result.mp4",
                                mime="video/mp4"
                            )
                    else:
                        st.markdown("<h3 class='error-text'>❌ Processing Failed</h3>", unsafe_allow_html=True)
                        st.error("Please try again with different settings or check your input files.")

                finally:
                    os.unlink(temp_video.name)
                    os.unlink(temp_audio.name)
    else:
        st.markdown("<p class='info-text' style='text-align: center;'>👆 Please upload both video and audio files to proceed</p>", unsafe_allow_html=True)

    # Footer
    st.markdown("---")
    st.markdown("<p style='text-align: center;'>Made with ❤️ using Wav2Lip and Streamlit</p>", unsafe_allow_html=True)

if __name__ == "__main__":
    main() 
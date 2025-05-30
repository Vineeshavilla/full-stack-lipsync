import streamlit as st
import os
import subprocess
import tempfile
import shutil
import time
import re

def process_wav2lip(video_path, audio_path, outfile, use_gan=False):
    """Process video using Wav2Lip."""
    try:
        # Select checkpoint based on model choice
        checkpoint = 'checkpoints/wav2lip_gan.pth' if use_gan else 'checkpoints/wav2lip.pth'
        
        command = [
            'python',
            'inference.py',
            '--checkpoint_path', checkpoint,
            '--face', video_path,
            '--audio', audio_path,
            '--outfile', outfile,
            '--fps', '25',
            '--pads', '0', '0', '0', '0',
            '--wav2lip_batch_size', '128',
            '--resize_factor', '1',
            '--crop', '0', '-1', '0', '-1',
            '--box', '-1', '-1', '-1', '-1'
        ]
        
        # Create a progress message
        progress_text = st.empty()
        progress_text.text("Processing video... This may take several minutes.")
        
        process = subprocess.run(
            command, 
            capture_output=True, 
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        # Clear the progress message
        progress_text.empty()
        
        if process.returncode != 0:
            st.error("Error processing video. Please try again.")
            return False
        return True
    except Exception as e:
        st.error(f"An error occurred: {str(e)}")
        return False

def save_uploaded_file(uploaded_file, save_dir):
    """Save uploaded file and return the path."""
    if uploaded_file is None:
        return None
    
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, uploaded_file.name)
    
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return file_path

def main():
    st.set_page_config(
        page_title="Wav2Lip - Lip Sync App",
        page_icon="🎬",
        layout="wide"
    )

    st.title("🎬 Wav2Lip - Lip Sync Application")
    st.write("Upload a video and audio file to create a lip-synced video")

    # Create columns for inputs
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📹 Video Input")
        video_file = st.file_uploader(
            "Upload video file", 
            type=['mp4', 'avi', 'mov'],
            help="Upload the video file containing the face to be lip-synced"
        )
        if video_file:
            st.video(video_file)

    with col2:
        st.subheader("🎵 Audio Input")
        audio_file = st.file_uploader(
            "Upload audio file", 
            type=['wav', 'mp3'],
            help="Upload the audio file containing the speech to be synchronized"
        )
        if audio_file:
            st.audio(audio_file)

    # Model selection
    model_type = st.radio(
        "Select Model Type",
        ["Standard Model", "GAN Model (Better Quality)"],
        help="GAN model generally produces sharper, more realistic results but may take longer to process"
    )

    # Process files
    if video_file and audio_file:
        if st.button("🚀 Generate Lip-Sync Video", use_container_width=True):
            with st.spinner("Processing... This may take several minutes."):
                try:
                    # Create temporary directory for processing
                    temp_dir = tempfile.mkdtemp()
                    
                    # Save uploaded files
                    video_path = save_uploaded_file(video_file, temp_dir)
                    audio_path = save_uploaded_file(audio_file, temp_dir)

                    if not video_path or not audio_path:
                        st.error("Error saving uploaded files.")
                        return

                    # Convert audio to WAV if it's MP3
                    if audio_path.endswith('.mp3'):
                        wav_path = os.path.splitext(audio_path)[0] + '.wav'
                        command = ['ffmpeg', '-i', audio_path, wav_path]
                        subprocess.run(command, check=True)
                        audio_path = wav_path

                    # Create output directory
                    output_dir = "results"
                    os.makedirs(output_dir, exist_ok=True)
                    output_path = os.path.join(output_dir, "result_video.mp4")

                    # Process the video with selected model
                    use_gan = model_type == "GAN Model (Better Quality)"
                    success = process_wav2lip(
                        video_path=video_path,
                        audio_path=audio_path,
                        outfile=output_path,
                        use_gan=use_gan
                    )

                    if success and os.path.exists(output_path):
                        st.success("✨ Video processed successfully!")
                        
                        # Display result
                        st.subheader("🎥 Result")
                        st.video(output_path)
                        
                        # Download button
                        with open(output_path, 'rb') as file:
                            st.download_button(
                                label="⬇️ Download Result",
                                data=file,
                                file_name="lip_sync_result.mp4",
                                mime="video/mp4",
                                use_container_width=True
                            )
                    else:
                        st.error("Failed to process video. Please try again.")

                except Exception as e:
                    st.error(f"An error occurred: {str(e)}")
                
                finally:
                    # Cleanup temporary files
                    try:
                        shutil.rmtree(temp_dir)
                    except Exception as e:
                        st.warning(f"Could not clean up temporary files: {str(e)}")

    # Sidebar with information
    with st.sidebar:
        st.header("ℹ️ Information")
        st.markdown("""
        ### Model Types
        - **Standard Model**: Faster processing, good quality
        - **GAN Model**: Higher quality, more realistic results
        
        ### Supported Formats
        - **Video**: MP4, AVI, MOV
        - **Audio**: WAV, MP3
        
        ### Tips for Best Results
        1. Use clear, front-facing videos
        2. Ensure good lighting in the video
        3. Use high-quality audio
        4. Keep the face visible and steady
        
        ### Processing Time
        - Processing may take several minutes
        - GAN model may take longer to process
        - Larger videos will take longer
        """)

if __name__ == "__main__":
    main() 
import streamlit as st
import os
import subprocess
import tempfile
import shutil
import time
import re
import sys
import traceback
from auth import show_auth_page, logout
from projects import show_projects_page, show_project_details, save_project

def process_wav2lip(video_path, audio_path, outfile, use_gan=True, progress_bar=None, status_text=None):
    """Process video using Wav2Lip with progress updates."""
    try:
        if status_text: status_text.text("Selecting model checkpoint...")
        if progress_bar: progress_bar.progress(5)
        checkpoint = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'checkpoints', 'wav2lip_gan.pth' if use_gan else 'wav2lip.pth')
        if not os.path.exists(checkpoint):
            st.error(f"Error: Checkpoint file not found at {checkpoint}")
            return False

        if status_text: status_text.text("Optimizing video for faster processing...")
        if progress_bar: progress_bar.progress(15)
        optimized_video = os.path.splitext(video_path)[0] + '_optimized.mp4'
        optimize_command = [
            'ffmpeg', '-i', video_path,
            '-vf', 'scale=1280:720',  # Increased resolution
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-crf', '23',
            '-c:a', 'copy',
            optimized_video
        ]
        try:
            subprocess.run(optimize_command, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            st.error(f"Error during video optimization: {e.stderr}")
            return False

        if status_text: status_text.text("Running Wav2Lip inference (this is the slowest step)...")
        if progress_bar: progress_bar.progress(40)
        command = [
            'python', 'inference.py',
            '--checkpoint_path', checkpoint,
            '--face', optimized_video,
            '--audio', audio_path,
            '--outfile', outfile,
            '--fps', '25',
            '--pads', '0', '20', '0', '20',  # Increased padding for better context
            '--wav2lip_batch_size', '64',  # Optimized batch size
            '--resize_factor', '1',
            '--crop', '0', '-1', '0', '-1',
            '--box', '-1', '-1', '-1', '-1',
            '--out_height', '720'  # Increased output height
        ]
        try:
            process = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.abspath(__file__)),
                check=True
            )
        except subprocess.CalledProcessError as e:
            st.error(f"Error during video processing: {e.stderr}")
            return False
        if progress_bar: progress_bar.progress(85)

        if process.returncode != 0:
            st.error(f"Error processing video: {process.stderr}")
            return False

        if status_text: status_text.text("Finalizing output video...")
        temp_output = os.path.join(os.path.dirname(outfile), f"temp_{os.path.basename(outfile)}")
        try:
            if os.path.exists(outfile):
                os.rename(outfile, temp_output)
            post_process_command = [
                'ffmpeg', '-i', temp_output,
                '-vf', 'scale=640:360:flags=lanczos',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'copy',
                outfile
            ]
            subprocess.run(post_process_command, capture_output=True, text=True, check=True)
            if os.path.exists(temp_output):
                os.remove(temp_output)
        except Exception as e:
            st.error(f"Error during final processing: {str(e)}")
            if os.path.exists(temp_output):
                os.rename(temp_output, outfile)
            return False
        if progress_bar: progress_bar.progress(100)
        if status_text: status_text.text("Done!")
        try:
            if os.path.exists(optimized_video):
                os.remove(optimized_video)
        except Exception as e:
            st.warning(f"Could not remove temporary file: {str(e)}")
        return True
    except Exception as e:
        st.error(f"An error occurred: {str(e)}")
        traceback.print_exc()
        return False

def save_uploaded_file(uploaded_file, save_dir, is_temp=False):
    """Save uploaded file and return the path."""
    if uploaded_file is None:
        return None
    
    try:
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, uploaded_file.name)
        
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        return file_path
    except Exception as e:
        st.error(f"Error saving file: {str(e)}")
        return None

def main():
    try:
        st.set_page_config(
            page_title="Wav2Lip - Lip Sync App",
            page_icon="🎬",
            layout="wide"
        )

        # Initialize session state for authentication and project view
        if 'authenticated' not in st.session_state:
            st.session_state.authenticated = False
        if 'username' not in st.session_state:
            st.session_state.username = None
        if 'show_project' not in st.session_state:
            st.session_state.show_project = False
        if 'current_project' not in st.session_state:
            st.session_state.current_project = None
        if 'new_project_name' not in st.session_state:
            st.session_state.new_project_name = None
        if 'current_page' not in st.session_state:
            st.session_state.current_page = "Projects"

        # Show authentication page if not authenticated
        if not st.session_state.authenticated:
            show_auth_page()
            return

        # Navigation
        st.sidebar.title("Navigation")
        page = st.sidebar.radio("Go to", ["Projects", "Create New Project"])
        st.session_state.current_page = page
        
        # Show projects page
        if st.session_state.current_page == "Projects":
            if st.session_state.show_project and st.session_state.current_project:
                show_project_details(st.session_state.current_project)
            else:
                show_projects_page()
            return

        # Main app content - only shown when creating new project
        st.title("🎬 Wav2Lip - Lip Sync Application")
        
        # Add logout button in the top right
        col1, col2 = st.columns([5, 1])
        with col2:
            if st.button("Logout"):
                logout()
                return
        
        st.write(f"Welcome, {st.session_state.username}! 👋")
        
        # Project name input at the top
        project_name = st.text_input("Project Name", "My Lip Sync Project")
        st.write("---")  # Add a separator line
        
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

        # Process button - always visible but disabled until files are uploaded
        generate_button = st.button(
            "🚀 Generate Lip-Sync Video",
            use_container_width=True,
            disabled=not (video_file and audio_file)
        )

        # Process files
        if video_file and audio_file and generate_button:
            progress_bar = st.progress(0)
            status_text = st.empty()
            try:
                status_text.text("Creating project directory...")
                progress_bar.progress(2)
                project_dir = os.path.join("results", st.session_state.username, project_name)
                os.makedirs(project_dir, exist_ok=True)

                status_text.text("Saving uploaded files...")
                progress_bar.progress(5)
                video_path = save_uploaded_file(video_file, project_dir)
                audio_path = save_uploaded_file(audio_file, project_dir)

                if not video_path or not audio_path:
                    st.error("Error saving uploaded files.")
                    return

                if audio_path.endswith('.mp3'):
                    status_text.text("Converting audio to WAV format...")
                    progress_bar.progress(10)
                    wav_path = os.path.splitext(audio_path)[0] + '.wav'
                    try:
                        command = ['ffmpeg', '-i', audio_path, wav_path]
                        subprocess.run(command, check=True)
                        audio_path = wav_path
                    except subprocess.CalledProcessError as e:
                        st.error(f"Error converting audio: {str(e)}")
                        return

                output_path = os.path.join(project_dir, f"output_{int(time.time())}.mp4")
                use_gan = model_type == "GAN Model (Better Quality)"
                success = process_wav2lip(
                    video_path=video_path,
                    audio_path=audio_path,
                    outfile=output_path,
                    use_gan=use_gan,
                    progress_bar=progress_bar,
                    status_text=status_text
                )

                if success and os.path.exists(output_path):
                    st.success("✨ Video processed successfully!")
                    
                    # Print debug info
                    print(f"Saving project for user: {st.session_state.username}")
                    print(f"Project name: {project_name}")
                    print(f"Output path: {output_path}")
                    print(f"Model type: {model_type}")
                    
                    # Save project to database with simplified schema
                    save_success, save_message = save_project(
                        st.session_state.username,
                        project_name,
                        output_path,
                        model_type
                    )
                    
                    if not save_success:
                        st.warning(f"Project saved but: {save_message}")
                    
                    # Display result
                    st.subheader("🎥 Result")
                    st.video(output_path)
                    
                    # Download button
                    with open(output_path, 'rb') as file:
                        st.download_button(
                            label="⬇️ Download Result",
                            data=file,
                            file_name=f"{project_name}.mp4",
                            mime="video/mp4",
                            use_container_width=True
                        )
                    
                    # View in Projects button
                    if st.button("View in Projects", use_container_width=True):
                        st.session_state.show_project = False
                        st.experimental_rerun()
                else:
                    st.error("Failed to process video. Please try again.")

            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
                traceback.print_exc()
            finally:
                progress_bar.empty()
                status_text.empty()

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
    except Exception as e:
        st.error(f"An unexpected error occurred: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
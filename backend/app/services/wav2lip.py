import os
import subprocess
import time
import logging
from pathlib import Path
import torch
from typing import Optional, Callable
from datetime import datetime
from app.db.base import SessionLocal
from app.models.project import Project, ProjectStatus
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _detect_device() -> str:
    if torch.cuda.is_available():
        try:
            torch.cuda.get_device_name(0)
            return "cuda"
        except Exception:
            logger.warning("CUDA detected but not working, falling back to CPU")
            return "cpu"
    return "cpu"

def _get_optimal_settings(device: str) -> dict:
    if device == "cuda":
        return {
            "batch_size": "128",
            "out_height": "720",
            "fps": "30",
            "video_scale": "1280:720",
            "video_preset": "fast",
            "video_crf": "23",
            "pads": ["0", "10", "0", "10"],
            "estimated_time": "5-15 minutes"
        }
    else:
        return {
            "batch_size": "16",
            "out_height": "540",
            "fps": "25",
            "video_scale": "960:540",
            "video_preset": "medium",
            "video_crf": "25",
            "pads": ["0", "20", "0", "20"],
            "estimated_time": "15-30 minutes"
        }

def simulate_progress(progress_callback: Callable, start_progress: int = 51, end_progress: int = 90):
    """Simulate progress updates while Wav2Lip is processing."""
    current_progress = start_progress
    while current_progress < end_progress:
        time.sleep(5)  # Update every 5 seconds
        current_progress += 2
        if current_progress > end_progress:
            current_progress = end_progress
        progress_callback(current_progress, "Processing frames...")

def process_wav2lip_project(video_path: str, audio_path: str, output_path: str, use_gan: bool = False, progress_callback=None) -> bool:
    try:
        # Step 1: Initialization and device detection
        if progress_callback:
            progress_callback(0, "Initializing Wav2Lip processing...")
        
        device = _detect_device()
        settings = _get_optimal_settings(device)
        logger.info(f"Starting Wav2Lip processing: device={device}, estimated_time={settings['estimated_time']}")
        
        if progress_callback:
            progress_callback(5, f"Device detected: {device.upper()} - Estimated time: {settings['estimated_time']}")
        
        # Step 2: Check model files
        if progress_callback:
            progress_callback(10, "Checking model files...")
        
        current_dir = Path(__file__).parent.parent.parent.parent
        wav2lip_dir = current_dir / "Wav2lip"
        checkpoints_dir = wav2lip_dir / "checkpoints"
        checkpoint = checkpoints_dir / ("wav2lip_gan.pth" if use_gan else "wav2lip.pth")
        
        if not checkpoint.exists():
            logger.error(f"Checkpoint not found: {checkpoint}")
            if progress_callback:
                progress_callback(0, f"Error: Model file not found - {checkpoint}")
            return False
        
        if progress_callback:
            progress_callback(15, f"Model loaded: {'GAN Model' if use_gan else 'Standard Model'}")
        
        # Step 3: Video optimization
        if progress_callback:
            progress_callback(20, "Optimizing video for processing...")
        
        temp_dir = wav2lip_dir / "temp"
        temp_dir.mkdir(exist_ok=True)
        optimized_video = str(temp_dir / f"optimized_{int(time.time())}.mp4")
        
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f'scale={settings["video_scale"]}',
            '-c:v', 'libx264', '-preset', settings["video_preset"],
            '-crf', settings["video_crf"],
            '-c:a', 'copy',
            '-y', optimized_video
        ]
        
        logger.info(f"Running video optimization: {' '.join(cmd)}")
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info(f"Video optimization completed with {device} settings")
        
        if progress_callback:
            progress_callback(30, "Video optimization completed")
        
        # Step 4: Audio preparation
        if progress_callback:
            progress_callback(35, "Preparing audio file...")
        
        wav_audio = audio_path
        if not audio_path.lower().endswith('.wav'):
            wav_path = str(temp_dir / f"audio_{int(time.time())}.wav")
            cmd = [
                'ffmpeg', '-i', audio_path,
                '-ar', '16000',
                '-y', wav_path
            ]
            logger.info(f"Converting audio to WAV: {' '.join(cmd)}")
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            wav_audio = wav_path
        
        if progress_callback:
            progress_callback(40, "Audio preparation completed")
        
        # Step 5: Start Wav2Lip inference
        if progress_callback:
            progress_callback(45, f"Starting Wav2Lip inference (optimized for {device})...")
        
        batch_size = settings["batch_size"]
        out_height = settings["out_height"]
        fps = settings["fps"]
        pads = settings["pads"]
        
        command = [
            'python', 'inference.py',
            '--checkpoint_path', str(checkpoint),
            '--face', optimized_video,
            '--audio', wav_audio,
            '--outfile', output_path,
            '--fps', fps,
            '--pads'] + pads + [
            '--wav2lip_batch_size', batch_size,
            '--resize_factor', '1',
            '--crop', '0', '-1', '0', '-1',
            '--box', '-1', '-1', '-1', '-1',
            '--out_height', out_height
        ]
        
        # Set timeout based on device (longer for CPU)
        timeout_seconds = 3600 if device == "cpu" else 1800  # 1 hour for CPU, 30 min for GPU
        
        # Start Wav2Lip process
        logger.info(f"Running Wav2Lip inference: {' '.join(command)}")
        logger.info(f"Starting Wav2Lip process with {timeout_seconds}s timeout")
        
        # Use simple subprocess.run approach like the working notebook
        try:
            if progress_callback:
                progress_callback(51, "Processing...")
            
            # Start progress simulation in background
            progress_thread = None
            if progress_callback:
                progress_thread = threading.Thread(
                    target=simulate_progress,
                    args=(progress_callback, 51, 90),
                    daemon=True
                )
                progress_thread.start()
            
            # Change to Wav2Lip directory and run the command
            start_time = time.time()
            
            # Run the process with timeout
            result = subprocess.run(
                command,
                cwd=str(wav2lip_dir),
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            
            # Log the output
            if result.stdout:
                logger.info(f"Wav2Lip stdout: {result.stdout}")
            if result.stderr:
                logger.warning(f"Wav2Lip stderr: {result.stderr}")
            
            # Check if process completed successfully
            if result.returncode != 0:
                error_msg = f"Wav2Lip inference failed (exit code: {result.returncode})"
                if result.stderr:
                    error_msg += f" - Error: {result.stderr}"
                logger.error(error_msg)
                if progress_callback:
                    progress_callback(0, f"Error: {error_msg}")
                return False
            
            # Check if output file was actually created
            if not os.path.exists(output_path):
                error_msg = "Wav2Lip completed but output file was not created"
                logger.error(error_msg)
                if progress_callback:
                    progress_callback(0, f"Error: {error_msg}")
                return False
            
            # Success!
            processing_time = time.time() - start_time
            logger.info(f"Wav2Lip processing completed successfully in {processing_time:.2f} seconds. Output: {output_path}")
            if progress_callback:
                progress_callback(100, "Processing completed successfully!")
            
            return True
            
        except subprocess.TimeoutExpired:
            logger.error(f"Wav2Lip process timed out after {timeout_seconds} seconds")
            if progress_callback:
                progress_callback(0, f"Error: Processing timed out after {timeout_seconds//60} minutes")
            return False
        except Exception as e:
            logger.error(f"Error running Wav2Lip process: {e}")
            if progress_callback:
                progress_callback(0, f"Error: {str(e)}")
            return False
        
    except Exception as e:
        logger.error(f"Error in Wav2Lip processing: {str(e)}")
        if progress_callback:
            progress_callback(0, f"Error: {str(e)}")
        return False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def process_video(project_id: int):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            logger.error(f"Project {project_id} not found")
            return
        
        logger.info(f"Starting processing for project {project_id}: {project.name}")
        
        project.status = ProjectStatus.PROCESSING
        project.updated_at = datetime.utcnow()
        db.commit()
        
        video_path = project.video_path
        audio_path = project.audio_path
        output_path = project.output_path
        
        # Check if all required paths exist
        missing_paths = []
        if not video_path:
            missing_paths.append("video_path")
        elif not os.path.exists(video_path):
            missing_paths.append(f"video file not found: {video_path}")
            
        if not audio_path:
            missing_paths.append("audio_path")
        elif not os.path.exists(audio_path):
            missing_paths.append(f"audio file not found: {audio_path}")
            
        if not output_path:
            missing_paths.append("output_path")
        
        if missing_paths:
            error_msg = f"Missing file paths for project {project_id}: {', '.join(missing_paths)}"
            logger.error(error_msg)
            project.status = ProjectStatus.FAILED
            project.status_message = error_msg
            project.updated_at = datetime.utcnow()
            db.commit()
            return
        
        logger.info(f"All file paths verified for project {project_id}")
        logger.info(f"Video: {video_path}")
        logger.info(f"Audio: {audio_path}")
        logger.info(f"Output: {output_path}")
        
        def progress_callback(progress: int, message: str):
            try:
                project.progress = progress
                project.status_message = f"Progress {progress}%: {message}"
                project.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Project {project_id} progress: {progress}% - {message}")
            except Exception as e:
                logger.error(f"Error updating progress: {str(e)}")
        
        success = process_wav2lip_project(
            video_path=video_path,
            audio_path=audio_path,
            output_path=output_path,
            use_gan=getattr(project, 'use_gan_model', False),
            progress_callback=progress_callback
        )
        
        if success:
            project.status = ProjectStatus.COMPLETED
            project.progress = 100
            project.status_message = "Processing completed successfully!"
            project.completed_at = datetime.utcnow()
            logger.info(f"Project {project_id} completed successfully")
        else:
            project.status = ProjectStatus.FAILED
            project.status_message = "Processing failed - check logs for details"
            logger.error(f"Project {project_id} processing failed")
        
        project.updated_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        logger.error(f"Error processing project {project_id}: {str(e)}")
        try:
            project.status = ProjectStatus.FAILED
            project.status_message = f"Error: {str(e)}"
            project.updated_at = datetime.utcnow()
            db.commit()
        except Exception as commit_error:
            logger.error(f"Error updating project status: {str(commit_error)}")
    finally:
        db.close()

def optimize_video(input_path: str, output_path: str):
    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-vf', 'scale=960:540',
            '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '25',
            '-c:a', 'copy',
            '-y', output_path
        ]
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Video optimization failed: {e.stderr}")
        return False

def convert_audio_to_wav(input_path: str, output_path: str):
    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-ar', '16000',
            '-y', output_path
        ]
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Audio conversion failed: {e.stderr}")
        return False


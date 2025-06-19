from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
from datetime import datetime
import threading

from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.schemas.project import ProjectCreate, Project as ProjectSchema, ProjectUpdate
from app.api.auth import get_current_user
from app.services.wav2lip import process_video

router = APIRouter()

@router.post("/", response_model=ProjectSchema)
async def create_project(
    *,
    db: Session = Depends(get_db),
    name: str = Form(...),
    description: str = Form(""),  # Made optional with default empty string
    use_gan_model: str = Form("true"),  # Form data comes as string
    video: UploadFile = File(...),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new project with video and audio files.
    """
    # Convert string to boolean
    use_gan_bool = use_gan_model.lower() == "true"
    
    # Validate file types
    if not video.filename.lower().endswith(('.mp4', '.avi', '.mov')):
        raise HTTPException(
            status_code=400,
            detail="Video file must be MP4, AVI, or MOV format"
        )
    if not audio.filename.lower().endswith(('.wav', '.mp3')):
        raise HTTPException(
            status_code=400,
            detail="Audio file must be WAV or MP3 format"
        )
    
    # Create project directory
    project_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id), str(int(datetime.now().timestamp())))
    os.makedirs(project_dir, exist_ok=True)
    
    # Save uploaded files
    video_path = os.path.join(project_dir, video.filename)
    audio_path = os.path.join(project_dir, audio.filename)
    
    with open(video_path, "wb") as f:
        f.write(await video.read())
    with open(audio_path, "wb") as f:
        f.write(await audio.read())
    
    # Generate output path
    output_filename = f"output_{int(datetime.now().timestamp())}.mp4"
    output_path = os.path.join(project_dir, output_filename)
    
    # Create project in database
    project = Project(
        name=name,
        description=description,
        user_id=current_user.id,
        video_path=video_path,
        audio_path=audio_path,
        output_path=output_path,
        use_gan_model=use_gan_bool,
        status=ProjectStatus.PENDING
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Start processing in background
    # Note: In production, use a proper task queue like Celery
    thread = threading.Thread(target=process_video, args=(project.id,))
    thread.start()
    
    return project

@router.get("/", response_model=List[ProjectSchema])
def read_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve projects for current user.
    """
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return projects

@router.get("/{project_id}", response_model=ProjectSchema)
def read_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get project by ID.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )
    return project

@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete project.
    """
    print(f"Delete request: project_id={project_id}, user_id={current_user.id}")
    
    try:
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).first()
        
        if not project:
            print(f"Project not found: id={project_id}, user_id={current_user.id}")
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        print(f"Found project: {project.name} (id={project.id})")
        
        # Delete project files
        if project.video_path and os.path.exists(project.video_path):
            project_dir = os.path.dirname(project.video_path)
            if os.path.exists(project_dir):
                import shutil
                print(f"Removing project files: {project_dir}")
                try:
                    shutil.rmtree(project_dir)
                    print(f"Successfully removed project directory: {project_dir}")
                except Exception as e:
                    print(f"Warning: Could not remove project directory {project_dir}: {e}")
            else:
                print(f"Project directory does not exist: {project_dir}")
        else:
            print(f"Project video path does not exist: {project.video_path}")
        
        # Delete from database
        db.delete(project)
        db.commit()
        print(f"Project {project_id} deleted successfully from database")
        
        return {"status": "success", "message": "Project deleted successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Error deleting project {project_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/{project_id}/status")
def get_project_status(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get project status by ID.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )
    return {"status": project.status} 
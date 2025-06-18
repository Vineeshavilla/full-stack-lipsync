from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
import os
import uuid
from typing import Optional
from app.core.config import settings
from app.services.wav2lip import process_video
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.models.project import Project

router = APIRouter()

@router.post("/process/{project_id}")
async def process_lipsync_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Process lip sync for a project with auto-detected optimal settings
    
    The system automatically detects CPU/GPU and uses the best settings:
    - CPU: 15-30 minutes processing time
    - GPU: 5-15 minutes processing time
    """
    try:
        # Get project from database
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Add background task for processing with auto-detection
        background_tasks.add_task(process_video, project_id)
        
        return {
            "message": "Lip sync processing started with auto-optimized settings", 
            "project_id": project_id,
            "note": "System will automatically detect CPU/GPU and use optimal settings"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{project_id}")
async def get_lipsync_status(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the status of lip sync processing for a project
    """
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {
            "project_id": project_id,
            "status": project.status,
            "output_url": project.output_url if project.status == "completed" else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{project_id}")
async def download_lipsync_result(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Download the processed lip sync video
    """
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.status != "completed" or not project.output_url:
            raise HTTPException(status_code=400, detail="Processing not completed or output not available")
        
        if not os.path.exists(project.output_url):
            raise HTTPException(status_code=404, detail="Output file not found")
        
        return FileResponse(
            project.output_url,
            media_type="video/mp4",
            filename=f"lipsync_result_{project_id}.mp4"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
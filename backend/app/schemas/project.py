from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.project import ProjectStatus

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    use_gan_model: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    status: Optional[ProjectStatus] = None
    error_message: Optional[str] = None

class ProjectInDBBase(ProjectBase):
    id: int
    user_id: int
    status: ProjectStatus
    video_path: str
    audio_path: str
    output_path: Optional[str] = None
    progress: Optional[int] = 0
    status_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class Project(ProjectInDBBase):
    pass

class ProjectInDB(ProjectInDBBase):
    pass 
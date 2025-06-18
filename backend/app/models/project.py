from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base

class ProjectStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PENDING)
    
    # File paths
    video_path = Column(String)
    audio_path = Column(String)
    output_path = Column(String, nullable=True)
    
    # Model settings
    use_gan_model = Column(Boolean, default=True)
    
    # Processing status
    progress = Column(Integer, default=0)
    status_message = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    
    # Error tracking
    error_message = Column(String, nullable=True) 
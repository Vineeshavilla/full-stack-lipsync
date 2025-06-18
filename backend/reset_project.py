#!/usr/bin/env python3
"""
Script to reset a project status back to PENDING for retesting.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def reset_project(project_id: int):
    """Reset a project status to PENDING."""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check current status
        result = conn.execute(text("SELECT id, name, status FROM projects WHERE id = :project_id"), {"project_id": project_id})
        project = result.fetchone()
        
        if not project:
            print(f"Project {project_id} not found!")
            return
        
        print(f"Current status of Project {project_id} ({project[1]}): {project[2]}")
        
        # Reset to PENDING
        result = conn.execute(
            text("UPDATE projects SET status = 'PENDING', progress = 0, status_message = NULL, error_message = NULL WHERE id = :project_id"),
            {"project_id": project_id}
        )
        
        if result.rowcount > 0:
            conn.commit()
            print(f"✓ Project {project_id} reset to PENDING status")
        else:
            print(f"✗ Failed to reset project {project_id}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python reset_project.py <project_id>")
        sys.exit(1)
    
    try:
        project_id = int(sys.argv[1])
        reset_project(project_id)
    except ValueError:
        print("Project ID must be a number")
        sys.exit(1) 
#!/usr/bin/env python3
"""
Script to fix project status values in the database to match the enum definition (UPPERCASE).
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

# Valid status values as per the enum definition (UPPERCASE)
VALID_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]

# Map of lowercase to uppercase
status_mapping = {
    'pending': 'PENDING',
    'processing': 'PROCESSING',
    'completed': 'COMPLETED',
    'failed': 'FAILED',
}

def fix_project_status():
    """Fix project status values in the database."""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check current status values
        print("Checking current project status values...")
        result = conn.execute(text("SELECT id, status FROM projects"))
        projects = result.fetchall()
        
        print(f"Found {len(projects)} projects:")
        for project in projects:
            print(f"  Project {project[0]}: status = '{project[1]}'")
        
        # Update status values to match enum (UPPERCASE)
        print("\nUpdating status values...")
        for old_status, new_status in status_mapping.items():
            result = conn.execute(
                text("UPDATE projects SET status = :new_status WHERE status = :old_status"),
                {"new_status": new_status, "old_status": old_status}
            )
            if result.rowcount > 0:
                print(f"  Updated {result.rowcount} projects from '{old_status}' to '{new_status}'")
        
        # Commit the changes
        conn.commit()
        
        # Verify the fix
        print("\nVerifying fix...")
        result = conn.execute(text("SELECT id, status FROM projects"))
        projects = result.fetchall()
        
        print("Updated project status values:")
        for project in projects:
            print(f"  Project {project[0]}: status = '{project[1]}'")
        
        # Check if all values are valid enum values
        invalid_projects = []
        for project in projects:
            if project[1] not in VALID_STATUSES:
                invalid_projects.append(project)
        
        if invalid_projects:
            print(f"\nWARNING: Found {len(invalid_projects)} projects with invalid status values:")
            for project in invalid_projects:
                print(f"  Project {project[0]}: '{project[1]}' (should be one of {VALID_STATUSES})")
        else:
            print("\n✓ All project status values are now valid!")

if __name__ == "__main__":
    print("Fixing project status values in database...")
    fix_project_status()
    print("Done!") 
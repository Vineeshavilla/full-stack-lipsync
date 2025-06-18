#!/usr/bin/env python3
"""
Script to check the current status of Wav2Lip processes and project status.
"""

import sys
import os
import psutil
import time
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def check_process_status():
    """Check the status of Wav2Lip processes and projects."""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check project status
        print("=== Project Status ===")
        result = conn.execute(text("SELECT id, name, status, progress, status_message FROM projects ORDER BY id"))
        projects = result.fetchall()
        
        for project in projects:
            print(f"Project {project[0]} ({project[1]}): {project[2]} - {project[3]}% - {project[4]}")
        
        # Check for running Python processes that might be Wav2Lip
        print("\n=== Running Python Processes ===")
        python_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                if 'python' in proc.info['name'].lower():
                    cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    if 'inference.py' in cmdline or 'wav2lip' in cmdline.lower():
                        python_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'cmdline': cmdline,
                            'create_time': proc.info['create_time']
                        })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        if python_processes:
            print(f"Found {len(python_processes)} potential Wav2Lip processes:")
            for proc in python_processes:
                runtime = time.time() - proc['create_time']
                print(f"  PID {proc['pid']}: {proc['cmdline']} (running for {runtime:.1f}s)")
        else:
            print("No Wav2Lip processes found running.")
        
        # Check for stuck projects (processing for more than 10 minutes)
        print("\n=== Stuck Projects Analysis ===")
        processing_projects = [p for p in projects if p[2] == 'PROCESSING']
        if processing_projects:
            print(f"Found {len(processing_projects)} projects in PROCESSING status:")
            for project in processing_projects:
                print(f"  Project {project[0]}: {project[3]}% - {project[4]}")
        else:
            print("No projects currently in PROCESSING status.")

if __name__ == "__main__":
    print("Checking Wav2Lip process status...")
    check_process_status()
    print("Done!") 
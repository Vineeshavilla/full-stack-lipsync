import streamlit as st
import sqlite3
import os
from datetime import datetime
import shutil

def init_projects_db():
    """Initialize the SQLite database for projects."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Check if projects table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        if not c.fetchone():
            # Create projects table if it doesn't exist
            c.execute('''CREATE TABLE projects
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      username TEXT,
                      project_name TEXT,
                      output_path TEXT,
                      model_type TEXT,
                      created_at TIMESTAMP,
                      FOREIGN KEY (username) REFERENCES users(username))''')
            conn.commit()
            print("Created projects table")
        
        conn.close()
    except Exception as e:
        print(f"Error initializing database: {str(e)}")

def save_project(username, project_name, output_path, model_type):
    """Save a new project to the database."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Print debug info
        print(f"Saving project for user: {username}")
        print(f"Project name: {project_name}")
        print(f"Output path: {output_path}")
        print(f"Model type: {model_type}")
        
        # Insert the project
        c.execute('''INSERT INTO projects 
                    (username, project_name, output_path, model_type, created_at)
                    VALUES (?, ?, ?, ?, ?)''',
                 (username, project_name, output_path, model_type, datetime.now()))
        conn.commit()
        
        # Verify the save
        c.execute('SELECT * FROM projects WHERE username = ?', (username,))
        saved_projects = c.fetchall()
        print(f"Saved projects: {saved_projects}")
        
        return True, "Project saved successfully"
    except Exception as e:
        print(f"Error saving project: {str(e)}")
        return False, f"Error saving project: {str(e)}"
    finally:
        conn.close()

def get_user_projects(username):
    """Get all projects for a specific user."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Print debug info
        print(f"Getting projects for user: {username}")
        
        # Get projects
        c.execute('''SELECT * FROM projects 
                    WHERE username = ? 
                    ORDER BY created_at DESC''', (username,))
        projects = c.fetchall()
        
        print(f"Found projects: {projects}")
        return projects
    except Exception as e:
        print(f"Error fetching projects: {str(e)}")
        st.error(f"Error fetching projects: {str(e)}")
        return []
    finally:
        conn.close()

def delete_project(project_id, username):
    """Delete a project and its associated files."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Get project details before deletion
        c.execute('SELECT * FROM projects WHERE id = ? AND username = ?', (project_id, username))
        project = c.fetchone()
        
        if project:
            # Delete project from database
            c.execute('DELETE FROM projects WHERE id = ? AND username = ?', (project_id, username))
            conn.commit()
            
            # Delete project files
            output_path = project[3]  # output_path
            if output_path and os.path.exists(output_path):
                project_dir = os.path.dirname(output_path)
                try:
                    shutil.rmtree(project_dir)
                except Exception as e:
                    print(f"Error deleting project directory: {str(e)}")
            
            return True, "Project deleted successfully"
        return False, "Project not found"
    except Exception as e:
        return False, f"Error deleting project: {str(e)}"
    finally:
        conn.close()

def show_projects_page():
    """Display the projects page with user's projects."""
    st.title("📁 My Projects")
    
    # Add back and logout buttons
    col1, col2, col3 = st.columns([5, 1, 1])
    with col1:
        if st.button("← Back"):
            st.session_state.authenticated = False
            st.session_state.username = None
            st.experimental_rerun()
    with col3:
        if st.button("Logout"):
            st.session_state.authenticated = False
            st.session_state.username = None
            st.experimental_rerun()
    
    # Initialize projects database
    init_projects_db()
    
    # Get current user's projects
    username = st.session_state.username
    print(f"Current username: {username}")
    
    projects = get_user_projects(username)
    print(f"Number of projects found: {len(projects)}")
    
    if not projects:
        st.info("You haven't created any projects yet!")
    else:
        # Display projects in a list
        for project in projects:
            try:
                project_id = project[0]  # id
                project_name = project[2]  # project_name
                output_path = project[3]  # output_path
                model_type = project[4]  # model_type
                created_at = project[5]  # created_at
                
                print(f"Displaying project: {project_name}")
                print(f"Output path: {output_path}")
                
                # Create columns for project name and delete button
                col1, col2 = st.columns([5, 1])
                with col1:
                    with st.expander(f"📁 {project_name}"):
                        st.write(f"**Created:** {created_at}")
                        st.write(f"**Model Used:** {model_type}")
                        
                        # Show output video if it exists
                        if output_path and os.path.exists(output_path):
                            st.video(output_path)
                        else:
                            st.warning(f"Output video not found at: {output_path}")
                
                with col2:
                    # Delete button
                    if st.button("🗑️ Delete", key=f"delete_{project_id}"):
                        if st.session_state.username == username:  # Verify ownership
                            success, message = delete_project(project_id, username)
                            if success:
                                st.success(message)
                                st.experimental_rerun()
                            else:
                                st.error(message)
            except Exception as e:
                print(f"Error displaying project: {str(e)}")
                st.error(f"Error displaying project: {str(e)}")

def show_project_details(project):
    """Display details of a specific project."""
    st.title(f"Project: {project[2]}")  # project_name
    
    # Add back button
    if st.button("← Back to Projects"):
        st.session_state.show_project = False
        st.session_state.current_project = None
        st.experimental_rerun()
    
    # Project information
    created_at = project[5]  # created_at
    model_type = project[4]  # model_type
    
    st.write(f"Created: {created_at}")
    st.write(f"Model Used: {model_type}")
    
    # Output video
    st.subheader("Output Video")
    output_path = project[3]  # output_path
    if output_path and os.path.exists(output_path):
        st.video(output_path)
    else:
        st.warning(f"Output video not found at: {output_path}")
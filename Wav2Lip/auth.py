import streamlit as st
import sqlite3
import hashlib
import os
from datetime import datetime

def init_db():
    """Initialize the SQLite database for user authentication."""
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password TEXT, email TEXT, created_at TIMESTAMP)''')
    conn.commit()
    conn.close()

def hash_password(password):
    """Hash the password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def signup(username, password, email):
    """Register a new user."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Check if username already exists
        c.execute('SELECT * FROM users WHERE username = ?', (username,))
        if c.fetchone():
            return False, "Username already exists"
        
        # Hash password and store user
        hashed_password = hash_password(password)
        c.execute('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)',
                 (username, hashed_password, email, datetime.now()))
        conn.commit()
        return True, "Signup successful"
    except Exception as e:
        return False, f"Error during signup: {str(e)}"
    finally:
        conn.close()

def login(username, password):
    """Authenticate a user."""
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        
        # Check credentials
        hashed_password = hash_password(password)
        c.execute('SELECT * FROM users WHERE username = ? AND password = ?',
                 (username, hashed_password))
        user = c.fetchone()
        
        if user:
            return True, "Login successful"
        return False, "Invalid username or password"
    except Exception as e:
        return False, f"Error during login: {str(e)}"
    finally:
        conn.close()

def show_auth_page():
    """Display the authentication page with login and signup forms."""
    st.markdown("<h1 style='text-align: center;'>🎬 Wav2Lip - Lip Sync Application</h1>", unsafe_allow_html=True)
    st.markdown("---")
    st.title("🔐 Authentication")
    
    # Initialize session state for auth status
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'username' not in st.session_state:
        st.session_state.username = None
    
    # Initialize database
    init_db()
    
    # Create tabs for Login and Signup
    tab1, tab2 = st.tabs(["Login", "Signup"])
    
    with tab1:
        st.subheader("Login")
        with st.form("login_form"):
            login_username = st.text_input("Username", key="login_username")
            login_password = st.text_input("Password", type="password", key="login_password")
            login_submitted = st.form_submit_button("Login")
            
            if login_submitted:
                if login_username and login_password:
                    success, message = login(login_username, login_password)
                    if success:
                        st.session_state.authenticated = True
                        st.session_state.username = login_username
                        st.success(message)
                        st.experimental_rerun()
                    else:
                        st.error(message)
                else:
                    st.error("Please fill in all fields")
    
    with tab2:
        st.subheader("Signup")
        with st.form("signup_form"):
            signup_username = st.text_input("Username", key="signup_username")
            signup_email = st.text_input("Email", key="signup_email")
            signup_password = st.text_input("Password", type="password", key="signup_password")
            signup_confirm_password = st.text_input("Confirm Password", type="password", key="signup_confirm_password")
            signup_submitted = st.form_submit_button("Signup")
            
            if signup_submitted:
                if signup_username and signup_email and signup_password and signup_confirm_password:
                    if signup_password != signup_confirm_password:
                        st.error("Passwords do not match")
                    else:
                        success, message = signup(signup_username, signup_password, signup_email)
                        if success:
                            st.success(message)
                            # Switch to login tab after successful signup
                            st.session_state.active_tab = "Login"
                        else:
                            st.error(message)
                else:
                    st.error("Please fill in all fields")

def logout():
    """Logout the current user."""
    st.session_state.authenticated = False
    st.session_state.username = None
    st.experimental_rerun() 
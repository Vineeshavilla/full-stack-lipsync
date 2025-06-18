# Full Stack Lip Sync Application

A complete full-stack application for lip synchronization using Wav2Lip, built with React frontend and FastAPI backend.

## 🎯 Features

- **User Authentication**: Secure login and registration system
- **Project Management**: Create, view, and manage lip sync projects
- **Real-time Processing**: Monitor lip sync processing with live progress updates
- **Multiple Model Support**: Standard and GAN model options
- **File Upload**: Support for various video and audio formats
- **Responsive UI**: Modern Material-UI interface

## 🏗️ Architecture

- **Frontend**: React with Redux, Material-UI, React Router
- **Backend**: FastAPI with SQLAlchemy, SQLite database
- **AI Model**: Wav2Lip for lip synchronization
- **File Processing**: FFmpeg for video/audio optimization

## 📋 Prerequisites

- Python 3.8+
- Node.js 14+
- FFmpeg installed and in PATH
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Vineeshavilla/full-stack-lipsync.git
cd full-stack-lipsync
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download Wav2Lip models
cd Wav2lip
# Download the required model files to checkpoints/ directory:
# - wav2lip.pth
# - wav2lip_gan.pth
# - resnet50.pth
# - mobilenet.pth

# Return to backend directory
cd ..

# Run the backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
full-stack-lipsync/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   └── services/
│   ├── Wav2lip/
│   │   ├── checkpoints/
│   │   ├── temp/
│   │   └── inference.py
│   ├── uploads/
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=sqlite:///./lipsync.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Wav2Lip Model Files

Download the required model files to `backend/Wav2lip/checkpoints/`:

- `wav2lip.pth` - Standard model
- `wav2lip_gan.pth` - GAN model (better quality)
- `resnet50.pth` - Face detection model
- `mobilenet.pth` - Alternative face detection model

## 📖 Usage

1. **Register/Login**: Create an account or login to the application
2. **Create Project**: Upload a video and audio file
3. **Select Model**: Choose between Standard or GAN model
4. **Process**: Start the lip sync processing
5. **Monitor**: Watch real-time progress updates
6. **Download**: Get your processed video when complete

## 🛠️ API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects/` - List user projects
- `POST /api/v1/projects/` - Create new project
- `GET /api/v1/projects/{id}` - Get project details
- `DELETE /api/v1/projects/{id}` - Delete project

### Lip Sync Processing
- `POST /api/v1/lipsync/process/{project_id}` - Start processing

## 🔍 Troubleshooting

### Common Issues

1. **FFmpeg not found**: Install FFmpeg and add to PATH
2. **Model files missing**: Download required .pth files to checkpoints/
3. **Port conflicts**: Change ports in uvicorn command or package.json
4. **Memory issues**: Reduce video resolution or use CPU processing

### Performance Tips

- Use shorter videos (under 60 seconds) for faster processing
- Lower resolution videos process faster
- CPU processing is slower but more reliable than GPU
- GAN model provides better quality but takes longer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) - The core lip sync model
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [React](https://reactjs.org/) - Frontend library
- [Material-UI](https://mui.com/) - UI component library

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation at `/docs`

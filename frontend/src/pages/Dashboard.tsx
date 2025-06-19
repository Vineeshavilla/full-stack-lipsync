import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Container,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  VideoLibrary as VideoIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Star as GanIcon,
  Speed as SpeedIcon,
  Description as DescIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { projectService } from '../services/api';
import {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  setCurrentProject,
} from '../store/slices/projectSlice';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projects, loading, error } = useSelector((state: RootState) => state.projects);
  const [projectProgress, setProjectProgress] = useState<{[key: number]: {progress: number, step: string}}>({});

  useEffect(() => {
    const fetchProjects = async () => {
      dispatch(fetchProjectsStart());
      try {
        const data = await projectService.getProjects();
        dispatch(fetchProjectsSuccess(data));
        
        // Parse progress for processing projects
        const progressData: {[key: number]: {progress: number, step: string}} = {};
        data.forEach((project: any) => {
          if ((project.status === 'processing' || project.status === 'pending') && project.error_message) {
            const progressMatch = project.error_message.match(/Progress (\d+)%: (.+)/);
            if (progressMatch) {
              progressData[project.id] = {
                progress: parseInt(progressMatch[1]),
                step: progressMatch[2]
              };
            }
          }
        });
        setProjectProgress(progressData);
      } catch (err: any) {
        let errorMsg = 'Failed to fetch projects';
        if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map((e: any) => e.msg).join(', ');
          } else if (typeof err.response.data.detail === 'object') {
            errorMsg = JSON.stringify(err.response.data.detail);
          }
        }
        dispatch(fetchProjectsFailure(errorMsg));
      }
    };
    fetchProjects();
  }, [dispatch]);

  // Poll for updates on processing projects
  useEffect(() => {
    const processingProjects = projects.filter(p => p.status === 'processing' || p.status === 'pending');
    if (processingProjects.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const updatedProjects = await Promise.all(
          processingProjects.map(async (project) => {
            try {
              return await projectService.getProject(project.id);
            } catch {
              return project;
            }
          })
        );

        const progressData: {[key: number]: {progress: number, step: string}} = {};
        updatedProjects.forEach((project: any) => {
          if (project.error_message) {
            const progressMatch = project.error_message.match(/Progress (\d+)%: (.+)/);
            if (progressMatch) {
              progressData[project.id] = {
                progress: parseInt(progressMatch[1]),
                step: progressMatch[2]
              };
            }
          }
        });
        setProjectProgress(progressData);
      } catch (error) {
        console.error('Error polling project updates:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [projects]);

  const handleProjectClick = (projectId: number) => {
    console.log('Project clicked:', projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('Found project:', project);
      dispatch(setCurrentProject(project));
      navigate(`/projects/${projectId}`);
    } else {
      console.error('Project not found:', projectId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'processing': return <PlayIcon color="warning" />;
      case 'pending': return <PendingIcon color="info" />;
      default: return <VideoIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'processing': return 'Processing';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ 
        p: 4, 
        mb: 4, 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
              My Lip Sync Projects
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} • {projects.filter(p => p.status === 'completed').length} completed
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/projects/create')}
            sx={{
              py: 2,
              px: 4,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textTransform: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              boxShadow: '0 8px 25px rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 12px 35px rgba(255, 255, 255, 0.3)',
                transform: 'translateY(-2px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          >
            🚀 Create New Project
          </Button>
        </Box>
      </Paper>

      {/* Content Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      ) : projects.length === 0 ? (
        <Paper elevation={2} sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
          <VideoIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No Projects Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Start creating amazing lip sync videos by uploading your first project!
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => navigate('/projects/create')}
            sx={{ 
              borderRadius: 2,
              px: 4,
              py: 1.5,
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            }}
          >
            Create Your First Project
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {projects.map((project) => {
            const progress = projectProgress[project.id];
            const isProcessing = project.status === 'processing' || project.status === 'pending';
            
            return (
              <Box key={project.id}>
                <Card
                  elevation={4}
                  sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 8,
                    }
                  }}
                  onClick={() => handleProjectClick(project.id)}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Project Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getStatusIcon(project.status)}
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
                        {project.name}
                      </Typography>
                    </Box>

                    {/* Description */}
                    {project.description && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <DescIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1, mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                          {project.description}
                        </Typography>
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Status and Model Chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip 
                        label={getStatusLabel(project.status)} 
                        color={getStatusColor(project.status) as any}
                        size="small"
                        icon={getStatusIcon(project.status)}
                      />
                      {project.use_gan_model !== undefined && (
                        <Chip 
                          label={project.use_gan_model ? 'GAN Model' : 'Standard Model'} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                          icon={project.use_gan_model ? <GanIcon /> : <SpeedIcon />}
                        />
                      )}
                    </Box>

                    {/* Progress Bar for Processing Projects */}
                    {isProcessing && progress && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {progress.step}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {progress.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress.progress}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                            }
                          }}
                        />
                      </Box>
                    )}

                    {/* Created Date */}
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard; 
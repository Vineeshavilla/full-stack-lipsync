import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
    const project = projects.find(p => p.id === projectId);
    if (project) {
      dispatch(setCurrentProject(project));
      navigate(`/projects/${projectId}`);
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Projects</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/projects/create')}
        >
          New Project
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : projects.length === 0 ? (
        <Typography variant="body1">You have no projects yet. Click "New Project" to get started!</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {projects.map((project) => {
            const progress = projectProgress[project.id];
            const isProcessing = project.status === 'processing' || project.status === 'pending';
            
            return (
              <Card
                key={project.id}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {project.description}
                  </Typography>
                  
                  {/* Status Chip */}
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={getStatusLabel(project.status)} 
                      color={getStatusColor(project.status) as any}
                      size="small"
                    />
                    {project.use_gan_model !== undefined && (
                      <Chip 
                        label={project.use_gan_model ? 'GAN' : 'Standard'} 
                        color="primary" 
                        variant="outlined"
                        size="small"
                        sx={{ ml: 1 }} 
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
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}

                  {/* Processing Info */}
                  {isProcessing && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Processing may take 10-45 minutes
                    </Typography>
                  )}

                  {/* Created Date */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleProjectClick(project.id)}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard; 
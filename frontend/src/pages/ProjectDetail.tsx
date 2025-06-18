import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { RootState } from '../store';
import { projectService } from '../services/api';
import {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  setCurrentProject,
  deleteProject,
} from '../store/slices/projectSlice';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const project = useSelector((state: RootState) =>
    state.projects.projects.find((p) => p.id === Number(id))
  );
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // Debug logging
  console.log('ProjectDetail render:', { 
    id, 
    project: project ? 'Found' : 'Not found',
    user: user ? 'Authenticated' : 'Not authenticated',
    token: token ? 'Token exists' : 'No token'
  });

  // If project is not in store, fetch it directly
  const [localProject, setLocalProject] = useState(project);
  
  useEffect(() => {
    if (!project && id) {
      const fetchProjectDirectly = async () => {
        try {
          const data = await projectService.getProject(Number(id));
          setLocalProject(data);
          setStatus(data.status);
        } catch (err) {
          console.error('Error fetching project directly:', err);
          setError('Failed to fetch project');
        }
      };
      fetchProjectDirectly();
    } else if (project) {
      setLocalProject(project);
    }
  }, [project, id]);

  // Use localProject instead of project for rendering
  const currentProject = localProject || project;

  // Helper function to construct file URLs
  const getFileUrl = (filePath: string) => {
    if (!filePath) return '';
    // Extract the relative path from the full path
    const relativePath = filePath.replace(/^.*[\\\/]uploads[\\\/]/, '');
    const url = `http://localhost:8000/uploads/${relativePath}`;
    console.log('File URL:', { original: filePath, relative: relativePath, url });
    return url;
  };

  // Processing steps with their progress ranges
  const processingSteps = [
    { step: 'Initializing', range: [0, 5], message: 'Starting Wav2Lip processing...' },
    { step: 'Model Selection', range: [5, 15], message: 'Selecting model checkpoint...' },
    { step: 'Video Optimization', range: [15, 25], message: 'Optimizing video for processing...' },
    { step: 'Audio Preparation', range: [25, 35], message: 'Preparing audio (converting to WAV)...' },
    { step: 'Wav2Lip Inference', range: [35, 90], message: 'Running Wav2Lip inference (auto-optimized)...' },
    { step: 'Reading Frames', range: [50, 60], message: 'Reading video frames...' },
    { step: 'Processing Audio', range: [60, 70], message: 'Processing audio chunks...' },
    { step: 'Generating Lip Sync', range: [70, 85], message: 'Generating lip sync frames...' },
    { step: 'Finalizing', range: [85, 100], message: 'Finalizing output video...' },
  ];

  // Get current step based on progress
  const getCurrentStep = (progressValue: number) => {
    const step = processingSteps.find(s => 
      progressValue >= s.range[0] && progressValue <= s.range[1]
    );
    return step || { step: 'Processing', message: 'Processing in progress...' };
  };

  // Handle processing start
  const handleStartProcessing = async () => {
    if (!currentProject) return;
    
    setProcessing(true);
    try {
      // Start processing with auto-detection (no optimization level needed)
      await projectService.startProcessing(currentProject.id);
      
      // Update status to processing
      setStatus('processing');
      setProgress(0);
      setCurrentStep('Starting Wav2Lip processing...');
      
      // Start polling for updates
      console.log('Starting processing, beginning polling...');
      pollForUpdates();
      
    } catch (error) {
      console.error('Error starting processing:', error);
      setError('Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  // Poll for project updates
  const pollForUpdates = () => {
    console.log('Starting polling for project updates...');
    
    const interval = setInterval(async () => {
      try {
        console.log('Polling for project updates...');
        const updatedProject = await projectService.getProject(Number(id));
        console.log('Polling - Project status:', updatedProject.status);
        console.log('Polling - Status message:', updatedProject.status_message);
        
        setStatus(updatedProject.status);
        
        // Update progress and step from status message
        if (updatedProject.status === 'processing' && updatedProject.status_message) {
          // Parse progress from status message format: "Progress X%: Message"
          let progressMatch = updatedProject.status_message.match(/Progress (\d+)%: (.+)/);
          
          if (progressMatch) {
            const newProgress = parseInt(progressMatch[1]);
            const newStep = progressMatch[2];
            console.log('Polling - Progress update:', newProgress, newStep);
            setProgress(newProgress);
            setCurrentStep(newStep);
          } else {
            // If no progress format, just update the step
            setCurrentStep(updatedProject.status_message);
          }
        }
        
        // Stop polling if processing is complete
        if (updatedProject.status === 'completed' || updatedProject.status === 'failed') {
          console.log('Processing complete, stopping polling');
          clearInterval(interval);
          setPollingInterval(null);
          if (updatedProject.status === 'completed') {
            setProgress(100);
            setCurrentStep('Processing completed successfully!');
          } else if (updatedProject.status === 'failed') {
            setCurrentStep(updatedProject.status_message || 'Processing failed');
          }
        }
        
      } catch (error) {
        console.error('Error polling for updates:', error);
        // Don't clear interval on error, just log it
      }
    }, 2000); // Poll every 2 seconds for more responsive updates
    
    setPollingInterval(interval);
    return interval;
  };

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await projectService.getProject(Number(id));
        dispatch(setCurrentProject(data));
        setStatus(data.status);
        
        // Parse error message for progress if processing
        if (data.status === 'processing' && data.status_message) {
          console.log('Initial status message:', data.status_message);
          
          // Parse progress from status message format: "Progress X%: Message"
          let progressMatch = data.status_message.match(/Progress (\d+)%: (.+)/);
          
          if (progressMatch) {
            const newProgress = parseInt(progressMatch[1]);
            const newStep = progressMatch[2];
            console.log('Initial progress:', newProgress, newStep);
            setProgress(newProgress);
            setCurrentStep(newStep);
          } else {
            // If no progress format, just set the step
            setCurrentStep(data.status_message);
          }
        }
        
        // Start polling if project is processing
        if (data.status === 'processing') {
          console.log('Project is processing, starting polling...');
          pollForUpdates();
        }
        
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to fetch project');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
    
    // Cleanup function to clear polling interval
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up polling interval');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [id, dispatch]);

  const handleDelete = async () => {
    const projectToDelete = localProject || project;
    if (!projectToDelete) {
      console.error('No project to delete');
      setError('No project to delete');
      return;
    }
    
    console.log('Attempting to delete project:', projectToDelete.id);
    setDeleting(true);
    setError(null);
    
    try {
      const response = await projectService.deleteProject(projectToDelete.id);
      console.log('Delete response:', response);
      
      // Remove from Redux store
      dispatch(deleteProject(projectToDelete.id));
      
      // Close dialog
      setShowDeleteDialog(false);
      
      // Navigate back to projects list
      navigate('/projects');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      let errorMessage = 'Failed to delete project';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxWidth="md" mx="auto" mt={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentProject) {
    return (
      <Box maxWidth="md" mx="auto" mt={4}>
        <Alert severity="warning">Project not found</Alert>
      </Box>
    );
  }

  return (
    <>
      <Box maxWidth="md" mx="auto" mt={4}>
        <Paper sx={{ p: 4 }}>
          {/* Project Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {currentProject.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {currentProject.description}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip 
                  label={currentProject.status} 
                  color={
                    currentProject.status === 'completed' ? 'success' :
                    currentProject.status === 'processing' ? 'warning' :
                    currentProject.status === 'failed' ? 'error' : 'default'
                  }
                />
                <Chip 
                  label={currentProject.use_gan_model ? 'GAN Model' : 'Standard Model'} 
                  variant="outlined" 
                />
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>

          {/* Start Processing Section */}
          {currentProject && (status === 'pending' || status === 'failed') && (
            <Card sx={{ mt: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Start Processing
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Auto-Optimized Processing
                  </Typography>
                  <Typography variant="body2">
                    The system will automatically detect your hardware (CPU/GPU) and use the optimal settings for the best performance.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>CPU:</strong> 15-30 minutes • <strong>GPU:</strong> 5-15 minutes
                  </Typography>
                </Alert>
                
                {/* Start Button */}
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleStartProcessing}
                    disabled={processing}
                    startIcon={processing ? <CircularProgress size={20} /> : null}
                    sx={{ minWidth: 200 }}
                  >
                    {processing ? 'Starting...' : 'Start Processing'}
                  </Button>
                </Box>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> Processing time depends on video length and your hardware. 
                    The system automatically optimizes for your device to provide the best balance of speed and quality.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Processing Progress Section */}
          {status === 'processing' && (
            <Card sx={{ mt: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Progress
                </Typography>
                
                {/* Progress Bar */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {currentStep}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                      {progress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)'
                      }
                    }}
                  />
                </Box>
                
                {/* Processing Steps */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Processing Steps:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      { step: 'Initialization', range: [0, 10], icon: '🔧' },
                      { step: 'Model Loading', range: [10, 20], icon: '📦' },
                      { step: 'Video Optimization', range: [20, 35], icon: '🎬' },
                      { step: 'Audio Preparation', range: [35, 45], icon: '🎵' },
                      { step: 'Wav2Lip Inference', range: [45, 95], icon: '🤖' },
                      { step: 'Finalization', range: [95, 100], icon: '✅' }
                    ].map((stepInfo, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          opacity: progress >= stepInfo.range[0] ? 1 : 0.5,
                          color: progress >= stepInfo.range[0] ? 'text.primary' : 'text.secondary'
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 20 }}>
                          {stepInfo.icon}
                        </Typography>
                        <Typography variant="body2">
                          {stepInfo.step}
                        </Typography>
                        {progress >= stepInfo.range[0] && progress < stepInfo.range[1] && (
                          <Typography variant="body2" color="primary" sx={{ ml: 'auto' }}>
                            Active
                          </Typography>
                        )}
                        {progress >= stepInfo.range[1] && (
                          <Typography variant="body2" color="success.main" sx={{ ml: 'auto' }}>
                            ✓ Complete
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                
                {/* Current Status */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Current Status:</strong> {currentStep}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Progress:</strong> {progress}% complete
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Polling:</strong> {pollingInterval ? 'Active' : 'Inactive'}
                  </Typography>
                </Alert>
                
                {/* Manual Refresh Button */}
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      try {
                        console.log('Manual refresh triggered...');
                        const updatedProject = await projectService.getProject(Number(id));
                        console.log('Manual refresh - Project:', updatedProject);
                        setStatus(updatedProject.status);
                        
                        if (updatedProject.status === 'processing' && updatedProject.status_message) {
                          console.log('Manual refresh - Status message:', updatedProject.status_message);
                          
                          // Parse progress from status message
                          let progressMatch = updatedProject.status_message.match(/Progress (\d+)%: (.+)/);
                          
                          if (progressMatch) {
                            const newProgress = parseInt(progressMatch[1]);
                            const newStep = progressMatch[2];
                            console.log('Manual refresh - Progress:', newProgress, newStep);
                            setProgress(newProgress);
                            setCurrentStep(newStep);
                          } else {
                            // Fallback: try to extract progress from message
                            setCurrentStep(updatedProject.status_message);
                          }
                        }
                        
                        // If not polling and project is processing, start polling
                        if (updatedProject.status === 'processing' && !pollingInterval) {
                          console.log('Manual refresh - Starting polling...');
                          pollForUpdates();
                        }
                      } catch (error) {
                        console.error('Error refreshing status:', error);
                      }
                    }}
                  >
                    Refresh Status
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    Last updated: {new Date().toLocaleTimeString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Project Files Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Files
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                {/* Input Video */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Input Video
                  </Typography>
                  {currentProject.video_path && (
                    <video 
                      controls 
                      width="100%" 
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                      src={getFileUrl(currentProject.video_path)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </Box>
                
                {/* Input Audio */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Input Audio
                  </Typography>
                  {currentProject.audio_path && (
                    <audio 
                      controls 
                      style={{ width: '100%' }}
                      src={getFileUrl(currentProject.audio_path)}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  )}
                </Box>
              </Box>
              
              {/* Output Video */}
              {currentProject.output_path && status === 'completed' && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Output Video (Lip Sync Result)
                  </Typography>
                  <video 
                    controls 
                    width="100%" 
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                    src={getFileUrl(currentProject.output_path)}
                  >
                    Your browser does not support the video tag.
                  </video>
                </Box>
              )}
            </CardContent>
          </Card>
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Project
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{currentProject?.name}"? This action cannot be undone and will permanently remove all project files.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProjectDetail; 
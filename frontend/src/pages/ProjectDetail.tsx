import React, { useEffect, useState, useRef } from 'react';
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
  Container,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  VideoLibrary as VideoIcon,
  Audiotrack as AudioIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Star as GanIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { projectService } from '../services/api';
import {
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
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deletedProjectName, setDeletedProjectName] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const project = useSelector((state: RootState) =>
    state.projects.projects.find((p) => p.id === Number(id))
  );
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // If project is not in store, fetch it directly
  const [localProject, setLocalProject] = useState(project);
  
  // Use localProject instead of project for rendering
  const currentProject = localProject || project;
  
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

  // Helper function to construct file URLs
  const getFileUrl = (filePath: string) => {
    if (!filePath) {
      return '';
    }
    // Extract the relative path from the full path
    const relativePath = filePath.replace(/^.*[\\/]uploads[\\/]/, '');
    const url = `http://localhost:8000/uploads/${relativePath}`;
    return url;
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
      
      // Add a small delay before starting polling to prevent flickering
      setTimeout(() => {
        console.log('Starting processing, beginning polling...');
        pollForUpdates();
      }, 1000);
      
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
        
        // Only update status if it has changed
        if (updatedProject.status !== status) {
          setStatus(updatedProject.status);
        }
        
        // Update progress and step from status message
        if (updatedProject.status === 'processing' && updatedProject.status_message) {
          // Parse progress from status message format: "Progress X%: Message"
          let progressMatch = updatedProject.status_message.match(/Progress (\d+)%: (.+)/);
          
          if (progressMatch) {
            const newProgress = parseInt(progressMatch[1]);
            const newStep = progressMatch[2];
            console.log('Polling - Progress update:', newProgress, newStep);
            
            // Only update if values have changed
            if (newProgress !== progress) {
              setProgress(newProgress);
            }
            if (newStep !== currentStep) {
              setCurrentStep(newStep);
            }
          } else {
            // If no progress format, just update the step if it has changed
            if (updatedProject.status_message !== currentStep) {
              setCurrentStep(updatedProject.status_message);
            }
          }
        }
        
        // Stop polling if processing is complete
        if (updatedProject.status === 'completed' || updatedProject.status === 'failed') {
          console.log('Processing complete, stopping polling');
          clearInterval(interval);
          pollingIntervalRef.current = null;
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
    }, 3000); // Poll every 3 seconds to reduce flickering
    
    pollingIntervalRef.current = interval;
    return interval;
  };

  useEffect(() => {
    const fetchProject = async () => {
      // Don't fetch if we're showing delete success
      if (deleteSuccess) return;
      
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
      if (pollingIntervalRef.current) {
        console.log('Cleaning up polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [id, dispatch, deleteSuccess]);

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
    
    // Store project name before deletion
    const projectName = projectToDelete.name;
    
    // Set success state immediately to prevent fetch errors
    setDeleteSuccess(true);
    setDeletedProjectName(projectName);
    console.log('Delete success state set immediately for project:', projectName);
    
    try {
      const response = await projectService.deleteProject(projectToDelete.id);
      console.log('Delete response:', response);
      
      // Remove from Redux store
      dispatch(deleteProject(projectToDelete.id));
      
      // Close dialog
      setShowDeleteDialog(false);
      
      // Navigate to dashboard after a short delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error deleting project:', error);
      let errorMessage = 'Failed to delete project';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Reset success state if delete failed
      setDeleteSuccess(false);
      setDeletedProjectName('');
      setError(errorMessage);
    } finally {
      setDeleting(false);
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error && !deleteSuccess) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Container>
    );
  }

  if (deleteSuccess) {
    console.log('Rendering delete success message for project:', deletedProjectName);
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Project "{deletedProjectName}" Deleted Successfully!
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Redirecting to dashboard...
                <CircularProgress size={16} />
              </Typography>
            </Box>
          </Box>
        </Alert>
      </Container>
    );
  }

  if (!currentProject && !deleteSuccess) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>Project not found</Alert>
      </Container>
    );
  }

  // Don't render main content if no currentProject (except for delete success)
  if (!currentProject) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ 
        p: 4, 
        mb: 4, 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton 
                onClick={() => navigate('/dashboard')}
                sx={{ color: 'white', mr: 2 }}
              >
                <BackIcon />
              </IconButton>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {currentProject.name}
              </Typography>
            </Box>
            {currentProject.description && (
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                {currentProject.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={currentProject.status} 
                color={getStatusColor(currentProject.status)}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
              <Chip 
                label={currentProject.use_gan_model ? 'GAN Model' : 'Standard Model'} 
                variant="outlined"
                icon={currentProject.use_gan_model ? <GanIcon /> : <SpeedIcon />}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.5)',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          {/* Start Processing Section */}
          {currentProject && (status === 'pending' || status === 'failed') && (
            <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PlayIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    Start Processing
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🚀 Auto-Optimized Processing
                  </Typography>
                  <Typography variant="body2">
                    The system automatically detects your hardware (CPU/GPU) and uses optimal settings for the best performance.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    ⏱️ Estimated Time: <strong>CPU:</strong> 15-30 minutes • <strong>GPU:</strong> 5-15 minutes
                  </Typography>
                </Alert>
                
                {/* Start Button */}
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleStartProcessing}
                    disabled={processing}
                    startIcon={processing ? <CircularProgress size={20} /> : <PlayIcon />}
                    sx={{ 
                      minWidth: 250,
                      py: 2,
                      px: 4,
                      borderRadius: 2,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      }
                    }}
                  >
                    {processing ? 'Starting...' : '🚀 Start Processing'}
                  </Button>
                </Box>
                
                <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>💡 Tip:</strong> Processing time depends on video length and your hardware. 
                    The system automatically optimizes for your device to provide the best balance of speed and quality.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Processing Progress Section */}
          {status === 'processing' && (
            <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CircularProgress size={32} sx={{ mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    Processing Progress
                  </Typography>
                </Box>
                
                {/* Progress Bar */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      {currentStep}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      {progress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                      }
                    }}
                  />
                </Box>
                
                {/* Processing Steps */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Processing Steps:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: progress >= stepInfo.range[0] ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                          opacity: progress >= stepInfo.range[0] ? 1 : 0.6,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Typography variant="h6" sx={{ minWidth: 30 }}>
                          {stepInfo.icon}
                        </Typography>
                        <Typography variant="body1" sx={{ flex: 1, fontWeight: progress >= stepInfo.range[0] ? 'bold' : 'normal' }}>
                          {stepInfo.step}
                        </Typography>
                        {progress >= stepInfo.range[0] && progress < stepInfo.range[1] && (
                          <Chip 
                            label="Active" 
                            color="primary" 
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                        {progress >= stepInfo.range[1] && (
                          <Chip 
                            label="Complete" 
                            color="success" 
                            size="small"
                            icon={<CheckIcon />}
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                
                {/* Current Status */}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Current Status: {currentStep}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Progress: {progress}% complete • Processing may take 10-45 minutes
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Project Files Section */}
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VideoIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Project Files
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Input Video */}
                <Box sx={{ flex: 1 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <VideoIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Input Video
                        </Typography>
                      </Box>
                      {currentProject.video_path && (
                        <video 
                          controls 
                          width="100%" 
                          style={{ 
                            maxHeight: '250px', 
                            objectFit: 'contain',
                            borderRadius: '8px'
                          }}
                          src={getFileUrl(currentProject.video_path)}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {!currentProject.video_path && (
                        <Typography variant="body2" color="text.secondary">
                          No video file available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
                
                {/* Input Audio */}
                <Box sx={{ flex: 1 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AudioIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Input Audio
                        </Typography>
                      </Box>
                      {currentProject.audio_path && (
                        <audio 
                          controls 
                          style={{ 
                            width: '100%',
                            borderRadius: '8px'
                          }}
                          src={getFileUrl(currentProject.audio_path)}
                        >
                          Your browser does not support the audio tag.
                        </audio>
                      )}
                      {!currentProject.audio_path && (
                        <Typography variant="body2" color="text.secondary">
                          No audio file available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Box>
              
              {/* Output Video */}
              {currentProject.output_path && status === 'completed' && (
                <Box sx={{ mt: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          🎉 Lip Sync Result
                        </Typography>
                      </Box>
                      <video 
                        controls 
                        width="100%" 
                        style={{ 
                          maxHeight: '400px', 
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                        src={getFileUrl(currentProject.output_path)}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => window.open(getFileUrl(currentProject.output_path || ''), '_blank')}
                          sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #43a047 30%, #5cb85c 90%)',
                            }
                          }}
                        >
                          Download Result
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              )}
              {(!currentProject.output_path || status !== 'completed') && (
                <Box sx={{ mt: 4 }}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Lip Sync Result
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        {!currentProject.output_path 
                          ? 'No output file available' 
                          : status !== 'completed' 
                            ? `Processing status: ${status}` 
                            : 'Output not ready yet'
                        }
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: '350px' } }}>
          <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Project Information
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {new Date(currentProject.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Model Used
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    {currentProject.use_gan_model ? <GanIcon sx={{ mr: 1, color: 'primary.main' }} /> : <SpeedIcon sx={{ mr: 1, color: 'secondary.main' }} />}
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {currentProject.use_gan_model ? 'GAN Model' : 'Standard Model'}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    {getStatusIcon(currentProject.status)}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', ml: 1 }}>
                      {getStatusLabel(currentProject.status)}
                    </Typography>
                  </Box>
                </Box>
                
                {status === 'completed' && currentProject.updated_at && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Completed
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {new Date(currentProject.updated_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => window.location.reload()}
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Refresh Page
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={() => navigate('/dashboard')}
                  fullWidth
                  sx={{ borderRadius: 2 }}
                >
                  Back to Dashboard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
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
    </Container>
  );
};

export default ProjectDetail; 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Container,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Create as CreateIcon,
  Star as GanIcon,
  Speed as SpeedIcon,
  VideoLibrary as VideoIcon,
  Audiotrack as AudioIcon,
} from '@mui/icons-material';
import { projectService } from '../services/api';
import { createProjectStart, createProjectSuccess, createProjectFailure } from '../store/slices/projectSlice';
import FileUpload from '../components/common/FileUpload';

const validationSchema = yup.object({
  name: yup.string().required('Project name is required'),
  description: yup.string().optional(),
  video_file: yup.mixed().required('Video file is required'),
  audio_file: yup.mixed().required('Audio file is required'),
  use_gan_model: yup.boolean().required('Model selection is required'),
});

const ProjectCreate: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      video_file: null as File | null,
      audio_file: null as File | null,
      use_gan_model: true, // Default to GAN model
    },
    validationSchema,
    onSubmit: async (values) => {
      dispatch(createProjectStart());
      setError(null);
      try {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('description', values.description || '');
        formData.append('use_gan_model', values.use_gan_model.toString());
        if (values.video_file) formData.append('video', values.video_file);
        if (values.audio_file) formData.append('audio', values.audio_file);
        
        const project = await projectService.createProject(formData);
        dispatch(createProjectSuccess(project));
        navigate(`/projects/${project.id}`);
      } catch (err: any) {
        let errorMsg = 'Failed to create project';
        if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map((e: any) => e.msg).join(', ');
          } else if (typeof err.response.data.detail === 'object') {
            errorMsg = JSON.stringify(err.response.data.detail);
          }
        }
        setError(errorMsg);
        dispatch(createProjectFailure(errorMsg));
      }
    },
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={8} sx={{ 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        mb: 4
      }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <CreateIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Create New Lip Sync Project
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Transform your videos with AI-powered lip synchronization
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              label="Project Name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              placeholder="Enter your project name..."
              InputProps={{
                startAdornment: <CreateIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: 'primary.main',
                    fontWeight: 'bold',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Description (Optional)"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              multiline
              rows={3}
              placeholder="Add a description for your project... (e.g., 'Lip sync for my music video', 'Dubbing project for educational content')"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }}>📝</Typography>,
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: 'primary.main',
                    fontWeight: 'bold',
                  },
                },
              }}
            />

            <Card variant="outlined" sx={{ mb: 3, borderRadius: 3, border: '2px solid #e3f2fd' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <GanIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    🤖 Select AI Model
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose the AI model that best suits your needs. GAN model provides higher quality, while Standard model offers faster processing.
                </Typography>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup
                    name="use_gan_model"
                    value={formik.values.use_gan_model.toString()}
                    onChange={(e) => formik.setFieldValue('use_gan_model', e.target.value === 'true')}
                  >
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        mb: 2, 
                        borderRadius: 3,
                        border: formik.values.use_gan_model ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        backgroundColor: formik.values.use_gan_model ? '#f3f8ff' : 'transparent',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: '#1976d2',
                          backgroundColor: '#f3f8ff',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.1)',
                        }
                      }}
                      onClick={() => formik.setFieldValue('use_gan_model', true)}
                    >
                      <CardContent sx={{ py: 2.5, px: 3 }}>
                        <FormControlLabel 
                          value={true} 
                          control={<Radio />} 
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <GanIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                  Wav2Lip GAN Model
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Higher quality results with more realistic lip sync and better facial expressions
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label="Premium Quality" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Chip 
                                  label="Best Results" 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>

                    <Card 
                      variant="outlined" 
                      sx={{ 
                        borderRadius: 3,
                        border: !formik.values.use_gan_model ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        backgroundColor: !formik.values.use_gan_model ? '#f3f8ff' : 'transparent',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: '#1976d2',
                          backgroundColor: '#f3f8ff',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.1)',
                        }
                      }}
                      onClick={() => formik.setFieldValue('use_gan_model', false)}
                    >
                      <CardContent sx={{ py: 2.5, px: 3 }}>
                        <FormControlLabel 
                          value={false} 
                          control={<Radio />} 
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <SpeedIcon sx={{ mr: 1, color: 'secondary.main' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                  Wav2Lip Standard Model
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Faster processing with good quality results, perfect for quick projects
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label="Fast Processing" 
                                  size="small" 
                                  color="secondary" 
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Chip 
                                  label="Quick Results" 
                                  size="small" 
                                  variant="outlined"
                                  color="secondary"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VideoIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  📹 Upload Files
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload your video and audio files. Supported formats: MP4, AVI, MOV for video; MP3, WAV, M4A for audio.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FileUpload
                label="Input Video"
                accept="video/*"
                selectedFile={formik.values.video_file}
                onFileSelect={(file) => formik.setFieldValue('video_file', file)}
                onFileRemove={() => formik.setFieldValue('video_file', null)}
                error={formik.touched.video_file && formik.errors.video_file ? String(formik.errors.video_file) : undefined}
                disabled={formik.isSubmitting}
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <FileUpload
                label="Input Audio"
                accept="audio/*"
                selectedFile={formik.values.audio_file}
                onFileSelect={(file) => formik.setFieldValue('audio_file', file)}
                onFileRemove={() => formik.setFieldValue('audio_file', null)}
                error={formik.touched.audio_file && formik.errors.audio_file ? String(formik.errors.audio_file) : undefined}
                disabled={formik.isSubmitting}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={formik.isSubmitting}
              startIcon={formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : <CreateIcon />}
              sx={{ 
                py: 2.5,
                px: 4,
                borderRadius: 3,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #b0b0b0 0%, #808080 100%)',
                  boxShadow: 'none',
                  transform: 'none',
                }
              }}
            >
              {formik.isSubmitting ? 'Creating Project...' : '🚀 Generate Lip Sync'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProjectCreate; 
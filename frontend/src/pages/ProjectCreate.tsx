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
  Paper,
  Alert,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
} from '@mui/material';
import { projectService } from '../services/api';
import { createProjectStart, createProjectSuccess, createProjectFailure } from '../store/slices/projectSlice';
import FileUpload from '../components/common/FileUpload';

const validationSchema = yup.object({
  name: yup.string().required('Project name is required'),
  description: yup.string().required('Description is required'),
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
        formData.append('description', values.description);
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
    <Box maxWidth="sm" mx="auto">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create New Project
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            label="Project Name"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={formik.touched.description && formik.errors.description}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          
          <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
            <FormLabel component="legend">Select Model</FormLabel>
            <RadioGroup
              name="use_gan_model"
              value={formik.values.use_gan_model.toString()}
              onChange={(e) => formik.setFieldValue('use_gan_model', e.target.value === 'true')}
            >
              <FormControlLabel 
                value={true} 
                control={<Radio />} 
                label="Wav2Lip GAN (Higher Quality)" 
              />
              <FormControlLabel 
                value={false} 
                control={<Radio />} 
                label="Wav2Lip Standard (Faster Processing)" 
              />
            </RadioGroup>
          </FormControl>

          <Box sx={{ mb: 2 }}>
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
          <Box sx={{ mb: 2 }}>
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
            color="primary"
            fullWidth
            disabled={formik.isSubmitting}
            sx={{ mt: 2 }}
          >
            {formik.isSubmitting ? 'Creating...' : 'Generate Lip Sync'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ProjectCreate; 
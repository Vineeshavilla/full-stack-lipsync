import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  PersonAdd as RegisterIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  VideoLibrary as VideoIcon,
} from '@mui/icons-material';
import { authService } from '../services/api';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/notificationSlice';

const validationSchema = yup.object({
  username: yup
    .string()
    .min(3, 'Username should be of minimum 3 characters length')
    .required('Username is required'),
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password should be of minimum 8 characters length')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = React.useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      dispatch(loginStart());
      setError(null);
      try {
        const data = await authService.register(values);
        dispatch(loginSuccess(data));
        dispatch(showNotification({ message: 'Registration successful!', severity: 'success' }));
        navigate('/login');
      } catch (err: any) {
        let errorMsg = 'Registration failed';
        if (err.response?.data?.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMsg = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            errorMsg = err.response.data.detail.map((e: any) => e.msg).join(', ');
          } else if (typeof err.response.data.detail === 'object') {
            errorMsg = JSON.stringify(err.response.data.detail);
          }
        }
        dispatch(loginFailure(errorMsg));
        dispatch(showNotification({ message: errorMsg, severity: 'error' }));
        setError(errorMsg);
      }
    },
  });

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
      {/* Header Card */}
      <Card elevation={8} sx={{ 
        borderRadius: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        mb: 4
      }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <VideoIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Lip Sync Studio
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            AI-Powered Video Lip Synchronization
          </Typography>
        </CardContent>
      </Card>

      {/* Register Form */}
      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <RegisterIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Create Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join us and start creating amazing lip sync videos
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="username"
              name="username"
              label="Username"
              autoComplete="username"
              autoFocus
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ 
                mb: 2,
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
              margin="normal"
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ 
                mb: 2,
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
              margin="normal"
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              InputProps={{
                startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ 
                mb: 2,
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
              margin="normal"
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              InputProps={{
                startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={formik.isSubmitting}
              startIcon={formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : <RegisterIcon />}
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
              {formik.isSubmitting ? 'Creating Account...' : '✨ Create Account'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Already have an account?
              </Typography>
              <Link 
                component={RouterLink} 
                to="/login" 
                variant="body1"
                sx={{ 
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  }
                }}
              >
                Sign In
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Register; 
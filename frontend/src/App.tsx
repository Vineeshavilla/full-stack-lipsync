import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Container } from '@mui/material';
import { RootState } from './store';
import { restoreAuthState, setUser, setLoading } from './store/slices/authSlice';
import { authService } from './services/api';

// Layout components
import Navbar from './components/layout/Navbar';
import PrivateRoute from './components/auth/PrivateRoute';

// Page components
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectCreate from './pages/ProjectCreate';
import ProjectDetail from './pages/ProjectDetail';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Restore authentication state on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set loading state while restoring auth
      dispatch(setLoading(true));
      
      // Restore auth state
      dispatch(restoreAuthState());
      
      // Fetch user data if token exists
      authService.getCurrentUser()
        .then(user => {
          dispatch(setUser(user));
          dispatch(setLoading(false));
        })
        .catch(error => {
          console.error('Failed to fetch user data on app load:', error);
          // If user fetch fails, clear the token (it might be expired)
          localStorage.removeItem('token');
          dispatch(restoreAuthState()); // This will set isAuthenticated to false
          dispatch(setLoading(false));
        });
    }
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/create"
            element={
              <PrivateRoute>
                <ProjectCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </Box>
  );
};

export default App; 
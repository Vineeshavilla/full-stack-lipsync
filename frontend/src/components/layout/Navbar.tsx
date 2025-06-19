import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
} from '@mui/material';
import {
  AccountCircle,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        <Typography
          variant="h5"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            '&:hover': {
              opacity: 0.9,
            }
          }}
        >
          🎬 LipSync AI
        </Typography>

        {isAuthenticated ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              component={RouterLink}
              to="/dashboard"
              sx={{ 
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'bold',
                textTransform: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Dashboard
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/projects/create"
              sx={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 15px rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              New Project
            </Button>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              {user?.username ? (
                <Avatar sx={{ 
                  width: 32, 
                  height: 32,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 'bold',
                }}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.5,
                  px: 2,
                  fontWeight: 'bold',
                  color: '#d32f2f',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  }
                }}
              >
                <LogoutIcon fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              variant="outlined"
              startIcon={<LoginIcon />}
              component={RouterLink} 
              to="/login"
              sx={{ 
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'bold',
                textTransform: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Login
            </Button>
            <Button 
              variant="contained"
              startIcon={<RegisterIcon />}
              component={RouterLink} 
              to="/register"
              sx={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 15px rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 
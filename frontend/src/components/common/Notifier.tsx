import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import { RootState } from '../../store';
import { hideNotification } from '../../store/slices/notificationSlice';

const Alert = React.forwardRef<HTMLDivElement, any>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const Notifier: React.FC = () => {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector((state: RootState) => state.notification);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    dispatch(hideNotification());
  };

  return (
    <Snackbar open={open} autoHideDuration={4000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={handleClose} severity={severity as AlertColor} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Notifier; 
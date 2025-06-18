import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const initialState: NotificationState = {
  open: false,
  message: '',
  severity: 'info',
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (
      state,
      action: PayloadAction<{ message: string; severity: NotificationState['severity'] }>
    ) => {
      state.open = true;
      state.message = action.payload.message;
      state.severity = action.payload.severity;
    },
    hideNotification: (state) => {
      state.open = false;
      state.message = '';
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;
export default notificationSlice.reducer; 
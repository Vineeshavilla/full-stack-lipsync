import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface ProjectData {
  name: string;
  description: string;
  video_file: File;
  audio_file: File;
}

const authService = {
  login: async (credentials: LoginCredentials) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/api/v1/auth/register', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },
};

const projectService = {
  getProjects: async () => {
    const response = await api.get('/api/v1/projects/');
    return response.data;
  },

  getProject: async (id: number) => {
    const response = await api.get(`/api/v1/projects/${id}`);
    return response.data;
  },

  createProject: async (data: FormData) => {
    const response = await api.post('/api/v1/projects/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProject: async (id: number) => {
    console.log('Deleting project:', id);
    try {
      const response = await api.delete(`/api/v1/projects/${id}`);
      console.log('Delete response status:', response.status);
      console.log('Delete response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Delete project error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  getProjectStatus: async (id: number) => {
    const response = await api.get(`/api/v1/projects/${id}/status`);
    return response.data;
  },

  startProcessing: async (id: number) => {
    const response = await api.post(`/api/v1/lipsync/process/${id}`);
    return response.data;
  },

  startFastProcessing: async (id: number) => {
    const response = await api.post(`/api/v1/lipsync/process/fast/${id}`);
    return response.data;
  },

  startBalancedProcessing: async (id: number) => {
    const response = await api.post(`/api/v1/lipsync/process/balanced/${id}`);
    return response.data;
  },

  startQualityProcessing: async (id: number) => {
    const response = await api.post(`/api/v1/lipsync/process/quality/${id}`);
    return response.data;
  },
};

export { authService, projectService };
export default api; 
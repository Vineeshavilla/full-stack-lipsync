import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Project {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  video_path?: string;
  audio_path?: string;
  output_path?: string;
  use_gan_model?: boolean;
  user_id?: number;
  updated_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    fetchProjectsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProjectsSuccess: (state, action: PayloadAction<Project[]>) => {
      state.loading = false;
      state.projects = action.payload;
    },
    fetchProjectsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentProject: (state, action: PayloadAction<Project>) => {
      state.currentProject = action.payload;
    },
    createProjectStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    createProjectSuccess: (state, action: PayloadAction<Project>) => {
      state.loading = false;
      state.projects.push(action.payload);
    },
    createProjectFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProjectStatus: (state, action: PayloadAction<{ id: number; status: Project['status'] }>) => {
      const project = state.projects.find(p => p.id === action.payload.id);
      if (project) {
        project.status = action.payload.status;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject.status = action.payload.status;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    deleteProject: (state, action: PayloadAction<number>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    },
  },
});

export const {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  setCurrentProject,
  createProjectStart,
  createProjectSuccess,
  createProjectFailure,
  updateProjectStatus,
  clearError,
  deleteProject,
} = projectSlice.actions;

export default projectSlice.reducer; 
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import { CloudUpload, Delete, VideoLibrary, Audiotrack } from '@mui/icons-material';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  accept: string;
  label: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept,
  label,
  error,
  disabled = false,
  loading = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple: false,
    disabled: disabled || loading,
  });

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: error
            ? 'error.main'
            : isDragActive
            ? 'primary.main'
            : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          position: 'relative',
          '&:hover': {
            borderColor: disabled || loading ? 'grey.300' : 'primary.main',
          },
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Uploading...
            </Typography>
          </Box>
        ) : selectedFile ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {selectedFile.name}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              disabled={disabled}
            >
              <Delete />
            </IconButton>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CloudUpload color="action" />
            <Typography variant="body2" color="text.secondary" align="center">
              {isDragActive
                ? 'Drop the file here'
                : `Drag and drop a ${label} here, or click to select`}
            </Typography>
          </Box>
        )}
      </Paper>
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default FileUpload; 
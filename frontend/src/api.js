import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => {
  const formData = new URLSearchParams();
  formData.append('username', data.email);
  formData.append('password', data.password);
  return api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};
export const getMe = () => api.get('/auth/me');

// Dataset APIs
export const uploadDataset = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/dataset/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getDatasets = () => api.get('/dataset/list');
export const getDataset = (id) => api.get(`/dataset/${id}`);
export const deleteDataset = (id) => api.delete(`/dataset/${id}`);

// Training APIs
export const trainModels = (config) => api.post('/training/train', config);
export const getTrainingSessions = () => api.get('/training/sessions');
export const getTrainingSession = (id) => api.get(`/training/sessions/${id}`);

// Tuning APIs
export const tuneModel = (config) => api.post('/tuning/tune', config);
export const getAvailableModels = (taskType) => api.get(`/tuning/available-models/${taskType}`);
export const getParamGrid = (taskType, modelName) => api.get(`/tuning/param-grid/${taskType}/${modelName}`);

// Model APIs
export const getModels = () => api.get('/models/list');
export const getModel = (id) => api.get(`/models/${id}`);
export const deployModel = (data) => api.post('/models/deploy', data);
export const undeployModel = (id) => api.post(`/models/undeploy/${id}`);
export const getDeployedModels = () => api.get('/models/deployed/list');

// Export APIs
export const getExportInfo = (modelId) => api.get(`/export/info/${modelId}`);
export const downloadModel = (modelId, format = 'joblib') =>
  api.get(`/export/download/${modelId}?format=${format}`, { responseType: 'blob' });
export const getCodeSnippet = (modelId) => api.get(`/export/code-snippet/${modelId}`);

// Prediction APIs
export const predict = (modelId, features) =>
  api.post(`/predict/${modelId}`, { model_id: modelId, features });

export default api;

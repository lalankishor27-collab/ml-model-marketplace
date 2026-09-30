/**
 * ============================================================================
 * API SERVICE MODULE - ML MODEL MARKETPLACE
 * ============================================================================
 * Beginner-Friendly Classic JavaScript API helper module.
 */

var API_BASE = window.API_BASE || '/api';

/**
 * Core HTTP Fetch Helper Function
 */
async function fetchAPI(endpoint, options = {}) {
  const headers = options.headers || {};

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  options.headers = headers;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'HTTP Error ' + response.status }));
      throw new Error(errorData.detail || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return response;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

/* ============================================================================
   1. AUTHENTICATION API ENDPOINTS
   ============================================================================ */

async function apiRegister(username, email, password) {
  return await fetchAPI('/auth/register', {
    method: 'POST',
    body: { username, email, password }
  });
}

async function apiLogin(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Invalid email or password');
  }

  return await response.json();
}

async function apiGetMe() {
  return await fetchAPI('/auth/me');
}

/* ============================================================================
   2. DATASET API ENDPOINTS
   ============================================================================ */

async function apiUploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);

  return await fetchAPI('/dataset/upload', {
    method: 'POST',
    body: formData
  });
}

async function apiGetDatasets() {
  return await fetchAPI('/dataset/list');
}

async function apiGetDataset(datasetId) {
  return await fetchAPI(`/dataset/${datasetId}`);
}

async function apiDeleteDataset(datasetId) {
  return await fetchAPI(`/dataset/${datasetId}`, {
    method: 'DELETE'
  });
}

/* ============================================================================
   3. MODEL TRAINING API ENDPOINTS
   ============================================================================ */

async function apiTrainModels(config) {
  return await fetchAPI('/training/train', {
    method: 'POST',
    body: config
  });
}

async function apiGetTrainingSessions() {
  return await fetchAPI('/training/sessions');
}

async function apiGetTrainingSession(sessionId) {
  return await fetchAPI(`/training/sessions/${sessionId}`);
}

/* ============================================================================
   4. HYPERPARAMETER TUNING API ENDPOINTS
   ============================================================================ */

async function apiTuneModel(config) {
  return await fetchAPI('/tuning/tune', {
    method: 'POST',
    body: config
  });
}

/* ============================================================================
   5. MODEL MANAGEMENT & DEPLOYMENT API ENDPOINTS
   ============================================================================ */

async function apiGetModels() {
  return await fetchAPI('/models/list');
}

async function apiDeployModel(trainingSessionId, modelName) {
  return await fetchAPI('/models/deploy', {
    method: 'POST',
    body: { training_session_id: trainingSessionId, model_name: modelName }
  });
}

async function apiUndeployModel(modelId) {
  return await fetchAPI(`/models/undeploy/${modelId}`, {
    method: 'POST'
  });
}

async function apiGetDeployedModels() {
  return await fetchAPI('/models/deployed/list');
}

/* ============================================================================
   6. LIVE PREDICTION API ENDPOINTS
   ============================================================================ */

async function apiPredict(modelId, features) {
  return await fetchAPI(`/predict/${modelId}`, {
    method: 'POST',
    body: { model_id: modelId, features: features }
  });
}

/* ============================================================================
   7. MODEL EXPORT & CODE GENERATION API ENDPOINTS
   ============================================================================ */

async function apiGetExportInfo(modelId) {
  return await fetchAPI(`/export/info/${modelId}`);
}

async function apiDownloadModel(modelId, format = 'joblib') {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/export/download/${modelId}?format=${format}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });

  if (!response.ok) throw new Error('Download failed');
  return await response.blob();
}

async function apiGetCodeSnippet(modelId) {
  return await fetchAPI(`/export/code-snippet/${modelId}`);
}

/**
 * ============================================================================
 * API SERVICE MODULE - ML MODEL MARKETPLACE
 * ============================================================================
 * Beginner-Friendly JavaScript API helper module using standard window.fetch().
 * 
 * Educational Notes for Interviews:
 * - Uses JavaScript async/await for asynchronous HTTP communication.
 * - Automatically injects JWT Bearer tokens from localStorage.
 * - Handles JSON serialization and file upload multipart forms cleanly.
 */

// Base API endpoint URL (Proxied via Vite to http://localhost:8000/api)
const API_BASE = '/api';

/**
 * Core HTTP Fetch Helper Function
 * Automatically handles headers, JWT Auth, JSON parsing, and error catching.
 */
async function fetchAPI(endpoint, options = {}) {
  // Step 1: Initialize standard headers
  const headers = options.headers || {};

  // Step 2: Check if user has an active JWT token stored in browser localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Step 3: If sending JSON body, set Content-Type header automatically
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  options.headers = headers;

  // Step 4: Execute HTTP request using browser's native fetch()
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    // Handle 401 Unauthorized (Expired or invalid token)
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    // Step 5: Check for HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'HTTP Error ' + response.status }));
      throw new Error(errorData.detail || 'Request failed');
    }

    // Step 6: Return JSON or Blob response based on content type
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

/**
 * Register a new user account
 */
async function apiRegister(username, email, password) {
  return await fetchAPI('/auth/register', {
    method: 'POST',
    body: { username, email, password }
  });
}

/**
 * Login user and receive JWT Access Token
 */
async function apiLogin(email, password) {
  // OAuth2 standard requires form-urlencoded format for login username/password
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

/**
 * Get current logged in user profile
 */
async function apiGetMe() {
  return await fetchAPI('/auth/me');
}

/* ============================================================================
   2. DATASET API ENDPOINTS
   ============================================================================ */

/**
 * Upload a CSV dataset file
 */
async function apiUploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);

  return await fetchAPI('/dataset/upload', {
    method: 'POST',
    body: formData
  });
}

/**
 * Fetch all uploaded datasets
 */
async function apiGetDatasets() {
  return await fetchAPI('/dataset/list');
}

/**
 * Get single dataset details and data preview
 */
async function apiGetDataset(datasetId) {
  return await fetchAPI(`/dataset/${datasetId}`);
}

/**
 * Delete a dataset by ID
 */
async function apiDeleteDataset(datasetId) {
  return await fetchAPI(`/dataset/${datasetId}`, {
    method: 'DELETE'
  });
}

/* ============================================================================
   3. MODEL TRAINING API ENDPOINTS
   ============================================================================ */

/**
 * Launch auto-training for 7+ ML algorithms on a dataset
 */
async function apiTrainModels(config) {
  return await fetchAPI('/training/train', {
    method: 'POST',
    body: config
  });
}

/**
 * Get list of all training sessions
 */
async function apiGetTrainingSessions() {
  return await fetchAPI('/training/sessions');
}

/**
 * Get details of a single training session
 */
async function apiGetTrainingSession(sessionId) {
  return await fetchAPI(`/training/sessions/${sessionId}`);
}

/* ============================================================================
   4. HYPERPARAMETER TUNING API ENDPOINTS
   ============================================================================ */

/**
 * Execute GridSearch or RandomizedSearch tuning on a model
 */
async function apiTuneModel(config) {
  return await fetchAPI('/tuning/tune', {
    method: 'POST',
    body: config
  });
}

/* ============================================================================
   5. MODEL MANAGEMENT & DEPLOYMENT API ENDPOINTS
   ============================================================================ */

/**
 * List all trained models
 */
async function apiGetModels() {
  return await fetchAPI('/models/list');
}

/**
 * Deploy a trained model as a REST API endpoint
 */
async function apiDeployModel(trainingSessionId, modelName) {
  return await fetchAPI('/models/deploy', {
    method: 'POST',
    body: { training_session_id: trainingSessionId, model_name: modelName }
  });
}

/**
 * Undeploy an active model endpoint
 */
async function apiUndeployModel(modelId) {
  return await fetchAPI(`/models/undeploy/${modelId}`, {
    method: 'POST'
  });
}

/**
 * Get list of currently deployed models
 */
async function apiGetDeployedModels() {
  return await fetchAPI('/models/deployed/list');
}

/* ============================================================================
   6. LIVE PREDICTION API ENDPOINTS
   ============================================================================ */

/**
 * Make a live prediction request to a deployed model endpoint
 */
async function apiPredict(modelId, features) {
  return await fetchAPI(`/predict/${modelId}`, {
    method: 'POST',
    body: { model_id: modelId, features: features }
  });
}

/* ============================================================================
   7. MODEL EXPORT & CODE GENERATION API ENDPOINTS
   ============================================================================ */

/**
 * Get metadata for exporting a model
 */
async function apiGetExportInfo(modelId) {
  return await fetchAPI(`/export/info/${modelId}`);
}

/**
 * Download model binary file (.joblib, .pkl, or .onnx)
 */
async function apiDownloadModel(modelId, format = 'joblib') {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/export/download/${modelId}?format=${format}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });

  if (!response.ok) throw new Error('Download failed');
  return await response.blob();
}

/**
 * Get Python integration snippet code for a model
 */
async function apiGetCodeSnippet(modelId) {
  return await fetchAPI(`/export/code-snippet/${modelId}`);
}

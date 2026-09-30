/**
 * ============================================================================
 * MAIN FRONTEND APPLICATION LOGIC - ML MODEL MARKETPLACE
 * ============================================================================
 * Self-Contained Classic Vanilla JavaScript App.
 * Includes both API Service Layer and UI Controller.
 */

// ============================================================================
// 1. BACKEND API SERVICE LAYER
// ============================================================================
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

// Authentication API Endpoints
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

// Dataset API Endpoints
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

// Model Training API Endpoints
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

// Hyperparameter Tuning API Endpoints
async function apiTuneModel(config) {
  return await fetchAPI('/tuning/tune', {
    method: 'POST',
    body: config
  });
}

// Model Management & Deployment API Endpoints
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

// Live Prediction API Endpoints
async function apiPredict(modelId, features) {
  return await fetchAPI(`/predict/${modelId}`, {
    method: 'POST',
    body: { model_id: modelId, features: features }
  });
}

// Model Export API Endpoints
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


// ============================================================================
// 2. GLOBAL STATE OBJECT
// ============================================================================
const state = {
  currentUser: null,             // Currently authenticated user object
  datasets: [],                  // List of uploaded datasets
  activeDataset: null,           // Currently selected dataset for inspection
  trainingSession: null,         // Current training session results
  models: [],                    // List of all trained models
  deployedModels: [],            // List of actively deployed models
  selectedPredictModel: null,    // Selected model for live prediction
  charts: {                      // Chart.js canvas instances
    compareBar: null,
    featureImp: null,
    radarMetrics: null
  }
};

// ============================================================================
// 3. UI NOTIFICATIONS & NAVIGATION TABS
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function switchTab(tabId) {
  console.log(`[Navigation] Switching to tab: ${tabId}`);
  if (!tabId) return;

  // Step 1: Deactivate all navigation links and tab views
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

  // Step 2: Activate selected tab link and panel
  const activeBtn = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  const activeView = document.getElementById(`tab-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');

  // Step 3: Trigger view-specific data refresh safely
  try {
    if (tabId === 'dashboard') loadDashboardStats();
    if (tabId === 'upload') loadDatasetsList();
    if (tabId === 'train') populateTrainDatasetSelect();
    if (tabId === 'tuning') populateTuneDatasetSelect();
    if (tabId === 'compare') renderCompareCharts();
    if (tabId === 'visualizations') renderVisualizations();
    if (tabId === 'deploy') loadModelsForDeploy();
    if (tabId === 'export') loadModelsForExport();
  } catch (err) {
    console.error('Error refreshing tab content:', err);
  }
}

// ============================================================================
// 4. AUTHENTICATION HANDLERS
// ============================================================================

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabReg = document.getElementById('tab-btn-register');

  if (mode === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (regForm) regForm.classList.add('hidden');
    if (tabLogin) tabLogin.classList.add('active');
    if (tabReg) tabReg.classList.remove('active');
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (regForm) regForm.classList.remove('hidden');
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabReg) tabReg.classList.add('active');
  }
}

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) return;

  try {
    const data = await apiLogin(email, password);
    localStorage.setItem('token', data.access_token);
    state.currentUser = { username: data.username, email: data.email };
    localStorage.setItem('user', JSON.stringify(state.currentUser));

    updateUserUI();
    closeAuthModal();
    showToast(`Welcome back, ${data.username}!`, 'success');
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegisterSubmit(event) {
  if (event) event.preventDefault();
  const username = document.getElementById('reg-username')?.value;
  const email = document.getElementById('reg-email')?.value;
  const password = document.getElementById('reg-password')?.value;

  if (!username || !email || !password) return;

  try {
    await apiRegister(username, email, password);
    showToast('Account created successfully! Logging in...', 'success');
    
    const data = await apiLogin(email, password);
    localStorage.setItem('token', data.access_token);
    state.currentUser = { username: data.username, email: data.email };
    localStorage.setItem('user', JSON.stringify(state.currentUser));

    updateUserUI();
    closeAuthModal();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.currentUser = null;
  updateUserUI();
  showToast('Logged out of workspace', 'info');
}

function updateUserUI() {
  const userInfo = document.getElementById('user-info');
  const authBtn = document.getElementById('auth-btn');
  const usernameDisplay = document.getElementById('username-display');

  if (state.currentUser) {
    if (userInfo) userInfo.classList.remove('hidden');
    if (authBtn) authBtn.classList.add('hidden');
    if (usernameDisplay) usernameDisplay.innerText = state.currentUser.username || state.currentUser.email;
  } else {
    if (userInfo) userInfo.classList.add('hidden');
    if (authBtn) authBtn.classList.remove('hidden');
  }
}

// ============================================================================
// 5. DASHBOARD HANDLERS
// ============================================================================

async function loadDashboardStats() {
  try {
    const [datasets, sessions, models] = await Promise.all([
      apiGetDatasets().catch(() => []),
      apiGetTrainingSessions().catch(() => []),
      apiGetModels().catch(() => [])
    ]);

    state.datasets = datasets;
    state.models = models;
    state.deployedModels = models.filter(m => m.is_deployed);

    const statDatasets = document.getElementById('stat-datasets');
    const statSessions = document.getElementById('stat-sessions');
    const statDeployed = document.getElementById('stat-deployed');
    const statBestModel = document.getElementById('stat-best-model');

    if (statDatasets) statDatasets.innerText = datasets.length;
    if (statSessions) statSessions.innerText = sessions.length;
    if (statDeployed) statDeployed.innerText = state.deployedModels.length;

    let bestModelName = 'N/A';
    if (sessions.length > 0) {
      const completed = sessions.filter(s => s.status === 'completed' && s.best_model);
      if (completed.length > 0) {
        bestModelName = completed[completed.length - 1].best_model;
      }
    }
    if (statBestModel) statBestModel.innerText = bestModelName;

    const tbody = document.getElementById('dashboard-sessions-tbody');
    if (tbody) {
      if (sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No training sessions recorded yet. Upload a dataset to get started!</td></tr>`;
        return;
      }

      tbody.innerHTML = sessions.slice(-5).reverse().map(s => `
        <tr>
          <td><code>#SESSION-${s.id}</code></td>
          <td>Dataset #${s.dataset_id}</td>
          <td><span class="badge badge-info">${s.task_type || 'N/A'}</span></td>
          <td><code>${s.target_column || 'N/A'}</code></td>
          <td><span class="badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}">${s.status}</span></td>
          <td><strong>${s.best_model || 'Processing...'}</strong></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="viewSessionDetails(${s.id})">
              <i class="fa-solid fa-eye"></i> View Results
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// ============================================================================
// 6. UPLOAD & DATASET HANDLERS
// ============================================================================

let selectedUploadFile = null;

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedUploadFile = file;
    const nameDisplay = document.getElementById('file-name-display');
    const uploadBtn = document.getElementById('upload-btn');

    if (nameDisplay) nameDisplay.innerText = `Selected File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

async function uploadDatasetFile() {
  if (!selectedUploadFile) return;

  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Analyzing...`;
  }

  try {
    const response = await apiUploadDataset(selectedUploadFile);
    showToast(`Dataset "${response.filename}" uploaded successfully!`, 'success');
    
    selectedUploadFile = null;
    const nameDisplay = document.getElementById('file-name-display');
    if (nameDisplay) nameDisplay.innerText = 'No file selected';
    if (uploadBtn) uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Analyze Dataset`;

    renderDatasetPreview(response);
    loadDatasetsList();
  } catch (err) {
    showToast(err.message, 'error');
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Analyze Dataset`;
    }
  }
}

async function loadDatasetsList() {
  const container = document.getElementById('datasets-list-container');
  if (!container) return;

  try {
    const datasets = await apiGetDatasets();
    state.datasets = datasets;

    if (datasets.length === 0) {
      container.innerHTML = `<p class="text-muted">No datasets uploaded yet.</p>`;
      return;
    }

    container.innerHTML = datasets.map(d => `
      <div class="glass-card stat-card mb-2" style="padding:0.8rem; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <i class="fa-solid fa-file-csv" style="font-size:1.5rem; color:var(--primary);"></i>
          <div>
            <strong style="display:block; font-size:0.9rem;">${d.filename}</strong>
            <span class="text-muted" style="font-size:0.75rem;">${d.rows} rows x ${d.columns} cols</span>
          </div>
        </div>
        <div class="flex-gap">
          <button class="btn btn-sm btn-outline" onclick="inspectDataset(${d.id})">
            <i class="fa-solid fa-eye"></i> Preview
          </button>
          <button class="btn btn-sm btn-outline" style="color:var(--accent-rose)" onclick="deleteDatasetAction(${d.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Failed to load datasets.</p>`;
  }
}

async function inspectDataset(datasetId) {
  try {
    const dataset = await apiGetDataset(datasetId);
    state.activeDataset = dataset;
    renderDatasetPreview(dataset);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderDatasetPreview(dataset) {
  const container = document.getElementById('dataset-preview-container');
  if (!container) return;
  container.classList.remove('hidden');

  const filenameEl = document.getElementById('preview-filename');
  const shapeEl = document.getElementById('preview-shape');
  if (filenameEl) filenameEl.innerText = dataset.filename;
  
  const preview = dataset.preview || {};
  const shape = preview.shape || [dataset.rows, dataset.columns];
  if (shapeEl) shapeEl.innerText = `${shape[0]} Rows x ${shape[1]} Columns`;

  const badgesContainer = document.getElementById('preview-metadata-badges');
  const numericCols = preview.numeric_columns || [];
  const catCols = preview.categorical_columns || [];

  if (badgesContainer) {
    badgesContainer.innerHTML = `
      <span class="badge badge-info">${numericCols.length} Numeric Features</span>
      <span class="badge badge-purple">${catCols.length} Categorical Features</span>
    `;
  }

  const columns = preview.columns || [];
  const sampleData = preview.sample_data || [];

  const thead = document.getElementById('preview-thead');
  const tbody = document.getElementById('preview-tbody');

  if (thead) thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  if (tbody) {
    if (sampleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${columns.length}">No preview data available</td></tr>`;
      return;
    }

    tbody.innerHTML = sampleData.map(row => `
      <tr>${columns.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}</tr>
    `).join('');
  }
}

async function deleteDatasetAction(datasetId) {
  if (!confirm('Are you sure you want to delete this dataset?')) return;
  try {
    await apiDeleteDataset(datasetId);
    showToast('Dataset deleted', 'info');
    const container = document.getElementById('dataset-preview-container');
    if (container) container.classList.add('hidden');
    loadDatasetsList();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function proceedToTrainFromPreview() {
  switchTab('train');
}

// ============================================================================
// 7. AUTO-TRAINING ENGINE HANDLERS
// ============================================================================

async function populateTrainDatasetSelect() {
  const select = document.getElementById('train-dataset-select');
  if (!select) return;

  try {
    const datasets = await apiGetDatasets();
    state.datasets = datasets;

    select.innerHTML = `<option value="">-- Choose Dataset --</option>` + 
      datasets.map(d => `<option value="${d.id}">${d.filename} (${d.rows} rows)</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function onTrainDatasetChange() {
  const select = document.getElementById('train-dataset-select');
  const targetSelect = document.getElementById('train-target-select');
  if (!select || !targetSelect) return;

  const datasetId = select.value;
  if (!datasetId) {
    targetSelect.innerHTML = `<option value="">-- Select Dataset First --</option>`;
    return;
  }

  try {
    const dataset = await apiGetDataset(datasetId);
    state.activeDataset = dataset;
    const columns = dataset.preview?.columns || [];

    targetSelect.innerHTML = columns.map(col => `<option value="${col}">${col}</option>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function launchAutoMLTraining() {
  const datasetId = document.getElementById('train-dataset-select')?.value;
  const targetColumn = document.getElementById('train-target-select')?.value;
  const testSize = parseFloat(document.getElementById('test-size-range')?.value || 0.2);

  const selectedAlgos = Array.from(document.querySelectorAll('input[name="algo-check"]:checked')).map(cb => cb.value);

  if (!datasetId || !targetColumn) {
    showToast('Please select a dataset and target column', 'error');
    return;
  }

  const launchBtn = document.getElementById('launch-train-btn');
  const spinnerBox = document.getElementById('training-spinner-box');
  const resultsBox = document.getElementById('training-results-output');

  if (launchBtn) launchBtn.disabled = true;
  if (spinnerBox) spinnerBox.classList.remove('hidden');
  if (resultsBox) resultsBox.innerHTML = '';

  try {
    const requestPayload = {
      dataset_id: parseInt(datasetId),
      target_column: targetColumn,
      test_size: testSize,
      models_to_train: selectedAlgos.length > 0 ? selectedAlgos : null
    };

    const session = await apiTrainModels(requestPayload);
    state.trainingSession = session;

    showToast(`Training complete! Best Model: ${session.best_model}`, 'success');
    if (spinnerBox) spinnerBox.classList.add('hidden');
    if (launchBtn) launchBtn.disabled = false;

    renderTrainingResults(session);
    loadDashboardStats();
  } catch (err) {
    if (spinnerBox) spinnerBox.classList.add('hidden');
    if (launchBtn) launchBtn.disabled = false;
    showToast(`Training failed: ${err.message}`, 'error');
  }
}

function renderTrainingResults(session) {
  const resultsBox = document.getElementById('training-results-output');
  const tableCard = document.getElementById('training-results-table-card');
  if (tableCard) tableCard.classList.remove('hidden');

  if (resultsBox) {
    resultsBox.innerHTML = `
      <div class="glass-card stat-card mb-3" style="background:rgba(16, 185, 129, 0.1); border-color:var(--accent-emerald);">
        <i class="fa-solid fa-trophy" style="font-size:2rem; color:var(--accent-emerald);"></i>
        <div>
          <span class="text-muted" style="font-size:0.8rem; uppercase;">Best Performing Model</span>
          <h3 style="color:var(--accent-emerald); font-size:1.4rem;">${session.best_model}</h3>
          <span class="badge badge-info">Task: ${session.task_type}</span>
        </div>
      </div>
    `;
  }

  const tbody = document.getElementById('metrics-table-tbody');
  const results = session.results || [];

  if (tbody) {
    tbody.innerHTML = results.map(r => {
      const score = session.task_type === 'classification' 
        ? `Accuracy: ${(r.accuracy * 100).toFixed(2)}% (F1: ${r.f1_score})`
        : `R² Score: ${r.r2_score} (RMSE: ${r.rmse})`;

      return `
        <tr>
          <td><strong>${r.model_name}</strong> ${r.model_name === session.best_model ? '<span class="badge badge-success">BEST</span>' : ''}</td>
          <td><code>${score}</code></td>
          <td>${r.training_time}s</td>
          <td><span class="badge badge-success">Trained</span></td>
        </tr>
      `;
    }).join('');
  }
}

async function viewSessionDetails(sessionId) {
  switchTab('train');
  try {
    const session = await apiGetTrainingSession(sessionId);
    state.trainingSession = session;
    renderTrainingResults(session);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// 8. HYPERPARAMETER TUNING HANDLERS
// ============================================================================

async function populateTuneDatasetSelect() {
  const select = document.getElementById('tune-dataset-select');
  if (!select) return;

  try {
    const datasets = await apiGetDatasets();
    select.innerHTML = `<option value="">-- Choose Dataset --</option>` + 
      datasets.map(d => `<option value="${d.id}">${d.filename}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function onTuneDatasetChange() {
  const datasetId = document.getElementById('tune-dataset-select')?.value;
  const targetSelect = document.getElementById('tune-target-select');

  if (!datasetId || !targetSelect) return;
  try {
    const dataset = await apiGetDataset(datasetId);
    const columns = dataset.preview?.columns || [];
    targetSelect.innerHTML = columns.map(col => `<option value="${col}">${col}</option>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function executeHyperparameterTuning() {
  const datasetId = document.getElementById('tune-dataset-select')?.value;
  const targetColumn = document.getElementById('tune-target-select')?.value;
  const modelName = document.getElementById('tune-model-select')?.value;
  const searchMethod = document.getElementById('tune-search-method')?.value;
  const cvFolds = parseInt(document.getElementById('tune-cv-folds')?.value || 5);

  if (!datasetId || !targetColumn) {
    showToast('Please select dataset and target column', 'error');
    return;
  }

  const spinner = document.getElementById('tuning-loading-box');
  const resultsBox = document.getElementById('tuning-results-box');

  if (spinner) spinner.classList.remove('hidden');
  if (resultsBox) resultsBox.innerHTML = '';

  try {
    const payload = {
      dataset_id: parseInt(datasetId),
      target_column: targetColumn,
      model_name: modelName,
      search_method: searchMethod,
      cv_folds: cvFolds
    };

    const result = await apiTuneModel(payload);
    if (spinner) spinner.classList.add('hidden');

    showToast(`Hyperparameter tuning complete for ${modelName}!`, 'success');

    if (resultsBox) {
      resultsBox.innerHTML = `
        <div class="glass-card mb-4" style="background:rgba(99, 102, 241, 0.1); border-color:var(--primary);">
          <h4>Best Parameters Found:</h4>
          <pre class="code-block mt-2"><code>${JSON.stringify(result.best_params, null, 2)}</code></pre>
          <div class="mt-3 flex-justify">
            <span>Best CV Score: <strong>${result.best_cv_score}</strong></span>
            <span>Tuning Time: <strong>${result.tuning_time}s</strong></span>
          </div>
        </div>
      `;
    }
    loadDashboardStats();
  } catch (err) {
    if (spinner) spinner.classList.add('hidden');
    showToast(`Tuning failed: ${err.message}`, 'error');
  }
}

// ============================================================================
// 9. COMPARE & CHARTS HANDLERS (CHART.JS)
// ============================================================================

function renderCompareCharts() {
  if (!state.trainingSession || !state.trainingSession.results) return;

  const session = state.trainingSession;
  const results = session.results.filter(r => !r.error);
  const labels = results.map(r => r.model_name);

  const canvas = document.getElementById('compare-bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (state.charts.compareBar) state.charts.compareBar.destroy();

  const isClassification = session.task_type === 'classification';
  const datasets = isClassification ? [
    {
      label: 'Accuracy',
      data: results.map(r => r.accuracy || 0),
      backgroundColor: 'rgba(99, 102, 241, 0.7)'
    },
    {
      label: 'F1-Score',
      data: results.map(r => r.f1_score || 0),
      backgroundColor: 'rgba(139, 92, 246, 0.7)'
    }
  ] : [
    {
      label: 'R² Score',
      data: results.map(r => r.r2_score || 0),
      backgroundColor: 'rgba(16, 185, 129, 0.7)'
    }
  ];

  state.charts.compareBar = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderVisualizations() {
  if (!state.trainingSession || !state.trainingSession.results) return;

  const results = state.trainingSession.results.filter(r => r.feature_importance);
  if (results.length === 0) return;

  const topModel = results[0];
  const featureCols = state.trainingSession.feature_columns || [];
  const importanceValues = topModel.feature_importance || [];

  const canvas = document.getElementById('feature-importance-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (state.charts.featureImp) state.charts.featureImp.destroy();

  state.charts.featureImp = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: featureCols.slice(0, 8),
      datasets: [{
        label: `Feature Importance (${topModel.model_name})`,
        data: importanceValues.slice(0, 8),
        backgroundColor: 'rgba(6, 182, 212, 0.7)'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f8fafc' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ============================================================================
// 10. DEPLOYMENT & LIVE PREDICTION HANDLERS
// ============================================================================

async function loadModelsForDeploy() {
  const container = document.getElementById('deploy-models-list');
  if (!container) return;

  try {
    const models = await apiGetModels();
    state.models = models;

    if (models.length === 0) {
      container.innerHTML = `<p class="text-muted">No trained models available. Run a training session first.</p>`;
      return;
    }

    container.innerHTML = models.map(m => `
      <div class="glass-card stat-card mb-2" style="padding:0.9rem; justify-content:space-between;">
        <div>
          <strong style="display:block;">${m.name}</strong>
          <span class="text-muted" style="font-size:0.75rem;">Task: ${m.task_type}</span>
          ${m.is_deployed ? '<span class="badge badge-success ml-2">Deployed</span>' : ''}
        </div>
        <div class="flex-gap">
          ${m.is_deployed ? `
            <button class="btn btn-sm btn-primary" onclick="setupPredictionForm(${m.id})">
              <i class="fa-solid fa-play"></i> Test API
            </button>
            <button class="btn btn-sm btn-outline" style="color:var(--accent-rose)" onclick="undeployModelAction(${m.id})">
              Undeploy
            </button>
          ` : `
            <button class="btn btn-sm btn-outline" onclick="deployModelAction(${m.training_session_id}, '${m.name}')">
              <i class="fa-solid fa-rocket"></i> Deploy REST API
            </button>
          `}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Failed to load models.</p>`;
  }
}

async function deployModelAction(sessionId, modelName) {
  try {
    const response = await apiDeployModel(sessionId, modelName);
    showToast(response.message, 'success');
    loadModelsForDeploy();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function undeployModelAction(modelId) {
  try {
    await apiUndeployModel(modelId);
    showToast('Model undeployed', 'info');
    loadModelsForDeploy();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function setupPredictionForm(modelId) {
  const model = state.models.find(m => m.id === modelId);
  if (!model) return;

  state.selectedPredictModel = model;
  const activeModelText = document.getElementById('predict-active-model-text');
  const predictBtn = document.getElementById('predict-btn');

  if (activeModelText) activeModelText.innerText = `Active REST API: ${model.name} (#${model.id})`;
  if (predictBtn) predictBtn.disabled = false;

  const container = document.getElementById('prediction-inputs-container');
  const featureCols = model.feature_columns || [];

  if (!container) return;

  if (featureCols.length === 0) {
    container.innerHTML = `<p class="text-muted">No feature inputs required.</p>`;
    return;
  }

  container.innerHTML = featureCols.map(col => `
    <div class="form-group mb-2">
      <label>${col}</label>
      <input type="number" step="any" data-feature="${col}" class="form-control predict-input" placeholder="0.0" value="0.0">
    </div>
  `).join('');
}

async function executeLivePrediction(event) {
  if (event) event.preventDefault();
  if (!state.selectedPredictModel) return;

  const modelId = state.selectedPredictModel.id;
  const inputs = document.querySelectorAll('.predict-input');
  const features = {};

  inputs.forEach(input => {
    const featureName = input.getAttribute('data-feature');
    features[featureName] = parseFloat(input.value) || 0;
  });

  try {
    const result = await apiPredict(modelId, features);
    const resultBox = document.getElementById('prediction-result-box');
    if (resultBox) resultBox.classList.remove('hidden');

    const predVal = document.getElementById('prediction-value');
    if (predVal) predVal.innerText = `Predicted Result: ${result.prediction}`;

    const confBadge = document.getElementById('prediction-confidence-badge');
    if (confBadge) {
      if (result.confidence !== null && result.confidence !== undefined) {
        confBadge.innerText = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
      } else {
        confBadge.innerText = `Model: ${result.model_name}`;
      }
    }

    showToast('Prediction generated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// 11. MODEL EXPORT HANDLERS
// ============================================================================

async function loadModelsForExport() {
  const select = document.getElementById('export-model-select');
  if (!select) return;

  try {
    const models = await apiGetModels();
    state.models = models;

    select.innerHTML = `<option value="">-- Choose Model --</option>` +
      models.map(m => `<option value="${m.id}">${m.name} (Dataset #${m.dataset_id})</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function onExportModelChange() {
  const select = document.getElementById('export-model-select');
  if (!select) return;

  const modelId = select.value;
  if (!modelId) return;

  try {
    const snippetData = await apiGetCodeSnippet(modelId);
    const codeDisplay = document.getElementById('code-snippet-display');
    if (codeDisplay) codeDisplay.innerText = snippetData.code_snippet;
  } catch (err) {
    console.error(err);
  }
}

async function downloadSelectedModel(format) {
  const select = document.getElementById('export-model-select');
  const modelId = select?.value;

  if (!modelId) {
    showToast('Please select a model first', 'error');
    return;
  }

  try {
    const blob = await apiDownloadModel(modelId, format);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${modelId}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Downloading model in .${format} format!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyCodeSnippet() {
  const codeDisplay = document.getElementById('code-snippet-display');
  if (!codeDisplay) return;

  navigator.clipboard.writeText(codeDisplay.innerText);
  showToast('Python code snippet copied to clipboard!', 'success');
}

// ============================================================================
// 12. IMMEDIATE GLOBAL WINDOW EXPOSURES
// ============================================================================
window.apiRegister = apiRegister;
window.apiLogin = apiLogin;
window.apiGetMe = apiGetMe;
window.apiUploadDataset = apiUploadDataset;
window.apiGetDatasets = apiGetDatasets;
window.apiGetDataset = apiGetDataset;
window.apiDeleteDataset = apiDeleteDataset;
window.apiTrainModels = apiTrainModels;
window.apiGetTrainingSessions = apiGetTrainingSessions;
window.apiGetTrainingSession = apiGetTrainingSession;
window.apiTuneModel = apiTuneModel;
window.apiGetModels = apiGetModels;
window.apiDeployModel = apiDeployModel;
window.apiUndeployModel = apiUndeployModel;
window.apiGetDeployedModels = apiGetDeployedModels;
window.apiPredict = apiPredict;
window.apiGetExportInfo = apiGetExportInfo;
window.apiDownloadModel = apiDownloadModel;
window.apiGetCodeSnippet = apiGetCodeSnippet;

window.showToast = showToast;
window.switchTab = switchTab;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLogout = handleLogout;
window.updateUserUI = updateUserUI;
window.loadDashboardStats = loadDashboardStats;
window.handleFileSelect = handleFileSelect;
window.uploadDatasetFile = uploadDatasetFile;
window.loadDatasetsList = loadDatasetsList;
window.inspectDataset = inspectDataset;
window.renderDatasetPreview = renderDatasetPreview;
window.deleteDatasetAction = deleteDatasetAction;
window.proceedToTrainFromPreview = proceedToTrainFromPreview;
window.populateTrainDatasetSelect = populateTrainDatasetSelect;
window.onTrainDatasetChange = onTrainDatasetChange;
window.launchAutoMLTraining = launchAutoMLTraining;
window.renderTrainingResults = renderTrainingResults;
window.viewSessionDetails = viewSessionDetails;
window.populateTuneDatasetSelect = populateTuneDatasetSelect;
window.onTuneDatasetChange = onTuneDatasetChange;
window.executeHyperparameterTuning = executeHyperparameterTuning;
window.renderCompareCharts = renderCompareCharts;
window.renderVisualizations = renderVisualizations;
window.loadModelsForDeploy = loadModelsForDeploy;
window.deployModelAction = deployModelAction;
window.undeployModelAction = undeployModelAction;
window.setupPredictionForm = setupPredictionForm;
window.executeLivePrediction = executeLivePrediction;
window.loadModelsForExport = loadModelsForExport;
window.onExportModelChange = onExportModelChange;
window.downloadSelectedModel = downloadSelectedModel;
window.copyCodeSnippet = copyCodeSnippet;

// ============================================================================
// 13. INITIALIZATION & GLOBAL CLICK INTERCEPTOR
// ============================================================================
function initApp() {
  console.log('🚀 ML Model Marketplace Initialized!');
  
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('token');
  if (savedUser && savedToken) {
    try {
      state.currentUser = JSON.parse(savedUser);
      updateUserUI();
    } catch (e) {
      handleLogout();
    }
  }

  document.addEventListener('click', (event) => {
    const clickable = event.target.closest('button, a, [data-tab], [onclick]');
    if (!clickable) return;

    const tabAttr = clickable.getAttribute('data-tab');
    if (tabAttr) {
      event.preventDefault();
      switchTab(tabAttr);
      return;
    }

    const onclickStr = clickable.getAttribute('onclick');
    if (onclickStr && onclickStr.includes('switchTab')) {
      event.preventDefault();
      const match = onclickStr.match(/switchTab\(['"](.*?)['"]\)/);
      if (match && match[1]) {
        switchTab(match[1]);
      }
    }
  });

  loadDashboardStats();
  loadDatasetsList();
  switchTab('dashboard');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

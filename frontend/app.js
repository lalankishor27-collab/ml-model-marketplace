/**
 * ============================================================================
 * MAIN FRONTEND APPLICATION LOGIC - ML MODEL MARKETPLACE
 * ============================================================================
 * Beginner-Friendly Vanilla JavaScript file controlling UI state, event handling,
 * DOM updates, Chart.js rendering, and API communication.
 * 
 * Educational Notes for Interview Preparation:
 * - Uses standard DOM methods: document.getElementById(), querySelectorAll()
 * - Uses async/await for smooth API calls without page reloads.
 * - Uses Chart.js canvas instances for interactive data visualization.
 */

// ============================================================================
// 1. GLOBAL STATE OBJECT
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
// 2. APP INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 ML Model Marketplace Initialized!');
  
  // Step 1: Check if user session exists in localStorage
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

  // Step 2: Load initial datasets and dashboard stats
  loadDashboardStats();
  loadDatasetsList();

  // Step 3: Default view is Dashboard
  switchTab('dashboard');
});

// ============================================================================
// 3. UI NOTIFICATIONS & NAVIGATION TABS
// ============================================================================

/**
 * Display clean toast notification banner
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/**
 * Switch active navigation tab panel
 */
function switchTab(tabId) {
  // Step 1: Deactivate all navigation links and tab views
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

  // Step 2: Activate selected tab link and panel
  const activeBtn = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  const activeView = document.getElementById(`tab-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');

  // Step 3: Trigger view-specific data refresh
  if (tabId === 'dashboard') loadDashboardStats();
  if (tabId === 'upload') loadDatasetsList();
  if (tabId === 'train') populateTrainDatasetSelect();
  if (tabId === 'tuning') populateTuneDatasetSelect();
  if (tabId === 'compare') renderCompareCharts();
  if (tabId === 'visualizations') renderVisualizations();
  if (tabId === 'deploy') loadModelsForDeploy();
  if (tabId === 'export') loadModelsForExport();
}

// ============================================================================
// 4. AUTHENTICATION HANDLERS
// ============================================================================

function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabReg = document.getElementById('tab-btn-register');

  if (mode === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

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
  event.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    await apiRegister(username, email, password);
    showToast('Account created successfully! Logging in...', 'success');
    
    // Auto login after registration
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
    userInfo.classList.remove('hidden');
    authBtn.classList.add('hidden');
    usernameDisplay.innerText = state.currentUser.username || state.currentUser.email;
  } else {
    userInfo.classList.add('hidden');
    authBtn.classList.remove('hidden');
  }
}

// ============================================================================
// 5. DASHBOARD HANDLERS
// ============================================================================

async function loadDashboardStats() {
  try {
    // Step 1: Fetch datasets, sessions, and deployed models
    const [datasets, sessions, models] = await Promise.all([
      apiGetDatasets().catch(() => []),
      apiGetTrainingSessions().catch(() => []),
      apiGetModels().catch(() => [])
    ]);

    state.datasets = datasets;
    state.models = models;
    state.deployedModels = models.filter(m => m.is_deployed);

    // Step 2: Update metric hero cards
    document.getElementById('stat-datasets').innerText = datasets.length;
    document.getElementById('stat-sessions').innerText = sessions.length;
    document.getElementById('stat-deployed').innerText = state.deployedModels.length;

    // Determine top performing model across sessions
    let bestModelName = 'N/A';
    if (sessions.length > 0) {
      const completed = sessions.filter(s => s.status === 'completed' && s.best_model);
      if (completed.length > 0) {
        bestModelName = completed[completed.length - 1].best_model;
      }
    }
    document.getElementById('stat-best-model').innerText = bestModelName;

    // Step 3: Render Recent Sessions Table
    const tbody = document.getElementById('dashboard-sessions-tbody');
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
    document.getElementById('file-name-display').innerText = `Selected File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    document.getElementById('upload-btn').disabled = false;
  }
}

async function uploadDatasetFile() {
  if (!selectedUploadFile) return;

  const uploadBtn = document.getElementById('upload-btn');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Analyzing...`;

  try {
    const response = await apiUploadDataset(selectedUploadFile);
    showToast(`Dataset "${response.filename}" uploaded successfully!`, 'success');
    
    // Reset file picker
    selectedUploadFile = null;
    document.getElementById('file-name-display').innerText = 'No file selected';
    uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Analyze Dataset`;

    // Render dataset preview
    renderDatasetPreview(response);
    loadDatasetsList();
  } catch (err) {
    showToast(err.message, 'error');
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Analyze Dataset`;
  }
}

async function loadDatasetsList() {
  const container = document.getElementById('datasets-list-container');
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
  container.classList.remove('hidden');

  document.getElementById('preview-filename').innerText = dataset.filename;
  
  const preview = dataset.preview || {};
  const shape = preview.shape || [dataset.rows, dataset.columns];
  document.getElementById('preview-shape').innerText = `${shape[0]} Rows x ${shape[1]} Columns`;

  // Render Metadata Badges
  const badgesContainer = document.getElementById('preview-metadata-badges');
  const numericCols = preview.numeric_columns || [];
  const catCols = preview.categorical_columns || [];

  badgesContainer.innerHTML = `
    <span class="badge badge-info">${numericCols.length} Numeric Features</span>
    <span class="badge badge-purple">${catCols.length} Categorical Features</span>
  `;

  // Render Table Header & Sample Rows
  const columns = preview.columns || [];
  const sampleData = preview.sample_data || [];

  const thead = document.getElementById('preview-thead');
  const tbody = document.getElementById('preview-tbody');

  thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;
  
  if (sampleData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}">No preview data available</td></tr>`;
    return;
  }

  tbody.innerHTML = sampleData.map(row => `
    <tr>${columns.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}</tr>
  `).join('');
}

async function deleteDatasetAction(datasetId) {
  if (!confirm('Are you sure you want to delete this dataset?')) return;
  try {
    await apiDeleteDataset(datasetId);
    showToast('Dataset deleted', 'info');
    document.getElementById('dataset-preview-container').classList.add('hidden');
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
  const datasetId = document.getElementById('train-dataset-select').value;
  const targetSelect = document.getElementById('train-target-select');

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
  const datasetId = document.getElementById('train-dataset-select').value;
  const targetColumn = document.getElementById('train-target-select').value;
  const testSize = parseFloat(document.getElementById('test-size-range').value);

  // Selected Algorithms
  const selectedAlgos = Array.from(document.querySelectorAll('input[name="algo-check"]:checked')).map(cb => cb.value);

  if (!datasetId || !targetColumn) {
    showToast('Please select a dataset and target column', 'error');
    return;
  }

  const launchBtn = document.getElementById('launch-train-btn');
  const spinnerBox = document.getElementById('training-spinner-box');
  const resultsBox = document.getElementById('training-results-output');

  launchBtn.disabled = true;
  spinnerBox.classList.remove('hidden');
  resultsBox.innerHTML = '';

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
    spinnerBox.classList.add('hidden');
    launchBtn.disabled = false;

    renderTrainingResults(session);
    loadDashboardStats();
  } catch (err) {
    spinnerBox.classList.add('hidden');
    launchBtn.disabled = false;
    showToast(`Training failed: ${err.message}`, 'error');
  }
}

function renderTrainingResults(session) {
  const resultsBox = document.getElementById('training-results-output');
  const tableCard = document.getElementById('training-results-table-card');
  tableCard.classList.remove('hidden');

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

  // Render Table Rows
  const tbody = document.getElementById('metrics-table-tbody');
  const results = session.results || [];

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
  try {
    const datasets = await apiGetDatasets();
    select.innerHTML = `<option value="">-- Choose Dataset --</option>` + 
      datasets.map(d => `<option value="${d.id}">${d.filename}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function onTuneDatasetChange() {
  const datasetId = document.getElementById('tune-dataset-select').value;
  const targetSelect = document.getElementById('tune-target-select');

  if (!datasetId) return;
  try {
    const dataset = await apiGetDataset(datasetId);
    const columns = dataset.preview?.columns || [];
    targetSelect.innerHTML = columns.map(col => `<option value="${col}">${col}</option>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function executeHyperparameterTuning() {
  const datasetId = document.getElementById('tune-dataset-select').value;
  const targetColumn = document.getElementById('tune-target-select').value;
  const modelName = document.getElementById('tune-model-select').value;
  const searchMethod = document.getElementById('tune-search-method').value;
  const cvFolds = parseInt(document.getElementById('tune-cv-folds').value);

  if (!datasetId || !targetColumn) {
    showToast('Please select dataset and target column', 'error');
    return;
  }

  const spinner = document.getElementById('tuning-loading-box');
  const resultsBox = document.getElementById('tuning-results-box');

  spinner.classList.remove('hidden');
  resultsBox.innerHTML = '';

  try {
    const payload = {
      dataset_id: parseInt(datasetId),
      target_column: targetColumn,
      model_name: modelName,
      search_method: searchMethod,
      cv_folds: cvFolds
    };

    const result = await apiTuneModel(payload);
    spinner.classList.add('hidden');

    showToast(`Hyperparameter tuning complete for ${modelName}!`, 'success');

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
    loadDashboardStats();
  } catch (err) {
    spinner.classList.add('hidden');
    showToast(`Tuning failed: ${err.message}`, 'error');
  }
}

// ============================================================================
// 9. COMPARE & CHARTS HANDLERS (CHART.JS)
// ============================================================================

function renderCompareCharts() {
  if (!state.trainingSession || !state.trainingSession.results) {
    return;
  }

  const session = state.trainingSession;
  const results = session.results.filter(r => !r.error);
  const labels = results.map(r => r.model_name);

  const ctx = document.getElementById('compare-bar-chart').getContext('2d');
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

  const ctx = document.getElementById('feature-importance-chart').getContext('2d');
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
  document.getElementById('predict-active-model-text').innerText = `Active REST API: ${model.name} (#${model.id})`;
  document.getElementById('predict-btn').disabled = false;

  const container = document.getElementById('prediction-inputs-container');
  const featureCols = model.feature_columns || [];

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
  event.preventDefault();
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
    resultBox.classList.remove('hidden');

    document.getElementById('prediction-value').innerText = `Predicted Result: ${result.prediction}`;
    const confBadge = document.getElementById('prediction-confidence-badge');

    if (result.confidence !== null && result.confidence !== undefined) {
      confBadge.innerText = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
    } else {
      confBadge.innerText = `Model: ${result.model_name}`;
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
  const modelId = document.getElementById('export-model-select').value;
  if (!modelId) return;

  try {
    const snippetData = await apiGetCodeSnippet(modelId);
    document.getElementById('code-snippet-display').innerText = snippetData.code_snippet;
  } catch (err) {
    console.error(err);
  }
}

async function downloadSelectedModel(format) {
  const modelId = document.getElementById('export-model-select').value;
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
  const codeText = document.getElementById('code-snippet-display').innerText;
  navigator.clipboard.writeText(codeText);
  showToast('Python code snippet copied to clipboard!', 'success');
}

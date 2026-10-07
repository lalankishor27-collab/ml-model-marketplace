# ML Model Marketplace & AutoML Engine

A full-stack, recruiter-ready Machine Learning web application designed to upload raw datasets, automatically train and benchmark multiple ML algorithms simultaneously, fine-tune hyperparameters, and deploy the champion model as an active REST API with instant real-time predictions.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20HTML5%2FCSS3%2FJS-yellow?logo=javascript)
![Scikit--learn](https://img.shields.io/badge/Scikit--learn-1.3+-orange?logo=scikit-learn)
![XGBoost](https://img.shields.io/badge/XGBoost-Enabled-red)
![ONNX](https://img.shields.io/badge/ONNX%20Runtime-1.17+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🌟 Highlights

- **Zero-Boilerplate AutoML**: Upload a raw CSV and auto-train 7+ baseline algorithms with one click.
- **Ultra-Fast & Lightweight Frontend**: Built with pure **HTML5, CSS3, and modern Vanilla JavaScript**—zero heavy virtual-DOM dependencies, instant cold starts, and dark glassmorphic SaaS design (`#090D16`).
- **Production-Ready FastAPI Backend**: Asynchronous ASGI pipeline with automatic schema validation via Pydantic and interactive OpenAPI docs at `/docs`.
- **Automated Missing Data & Type Handling**: Robust preprocessing using `pd.api.types.is_numeric_dtype` and recursive RFC 8259 JSON sanitization preventing serialization crashes on missing values (`NaN`).
- **1-Click REST API Deployment**: Mount deployed models in memory with sub-10ms live predictions and auto-generated Python integration snippets.
- **Multi-Format Serialization**: Export champion models to `.joblib`, `.pkl`, and `.onnx` formats.

---

## 🚀 Quick Start (Windows 1-Click Launcher)

To launch both the **FastAPI backend** (`:8000`) and the **Frontend server** (`:5173`) automatically:

```cmd
run_project.bat
```

*Or simply double-click `run_project.bat` from File Explorer.*

### Manual Startup

#### 1. Backend (FastAPI)
```cmd
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```
- **REST API**: http://localhost:8000
- **Swagger Documentation**: http://localhost:8000/docs

#### 2. Frontend (Vite Dev Server)
```cmd
cd frontend
npx vite --port 5173
```
- **Web Dashboard**: http://localhost:5173

---

## 🧠 Supported ML Algorithms

| Algorithm | Model Family | Task Supported |
|---|---|---|
| **Random Forest** | Ensemble (Bagging) | Classification & Regression |
| **XGBoost** | Gradient Boosted Trees | Classification & Regression |
| **Support Vector Machines (SVM/SVR)** | Kernel Methods | Classification & Regression |
| **K-Nearest Neighbors (KNN)** | Instance-based | Classification & Regression |
| **Decision Trees** | Tree-based | Classification & Regression |
| **Gradient Boosting** | Ensemble (Sequential Boosting) | Classification & Regression |
| **Logistic / Linear / Ridge Regression** | Generalized Linear Models | Classification & Regression |

---

## 📂 Project Architecture

```
ml-model-marketplace/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point & CORS configuration
│   │   ├── database/
│   │   │   └── db.py                   # SQLite connection engine & session factory
│   │   ├── models/
│   │   │   ├── db_models.py            # SQLAlchemy database tables (Datasets, Models, Sessions)
│   │   │   └── schemas.py              # Pydantic request and response schemas
│   │   ├── routes/
│   │   │   ├── auth.py                 # JWT user registration & authentication
│   │   │   ├── dataset.py              # CSV upload, inspection & preview endpoints
│   │   │   ├── training.py             # AutoML training orchestration
│   │   │   ├── tuning.py               # GridSearchCV & RandomizedSearchCV endpoints
│   │   │   ├── models.py               # Model management & 1-click deployment
│   │   │   ├── predict.py              # Real-time single & batch prediction endpoints
│   │   │   └── export.py               # Multi-format download & Python snippet generation
│   │   └── services/
│   │       ├── preprocessing.py        # Robust missing-value imputation & feature encoding
│   │       ├── trainer.py              # Concurrent training engine for 7+ algorithms
│   │       ├── evaluator.py            # Classification & regression metric computation
│   │       └── hyperparameter_tuner.py # Cross-validated hyperparameter optimization
│   ├── trained_models/                 # Serialized model binaries
│   ├── uploads/                        # Uploaded dataset storage
│   ├── requirements.txt                # Python 3.12 compatible dependencies
│   └── venv/                           # Isolated Python virtual environment
├── frontend/
│   ├── index.html                      # Semantic single-page layout with tabbed navigation
│   ├── style.css                       # Dark glassmorphic theme styling & responsive layouts
│   ├── app.js                          # Self-contained frontend engine (API service + UI controllers)
│   ├── api.js                          # Standalone API communication module
│   ├── package.json                    # Frontend package config
│   └── vite.config.js                  # Vite dev server with /api proxy to FastAPI
├── run_project.bat                     # 1-Click Windows startup script
└── README.md                           # Project documentation
```

---

## 🖥️ Application Features & Workflow

### 1. Dashboard Overview
- Live stat counters tracking total datasets, training sessions, deployed APIs, and top-performing models.
- Recent training history table with quick-access links to view session breakdowns.

### 2. Dataset Management
- Drag-and-drop CSV upload with automatic schema parsing and missing value analysis.
- Live data table previews displaying column types and distribution metrics without page reloads.

### 3. AutoML Training Engine
- Automatic task detection (Classification vs. Regression).
- Train up to 7 algorithms in parallel with custom train/test splits (e.g., 80/20).
- Instant metric ranking: **Accuracy, F1-Score, Precision, Recall, Confusion Matrices, and Feature Importances**.

### 4. Hyperparameter Tuning
- Select any baseline model and optimize hyperparameters using **GridSearchCV** or **RandomizedSearchCV** with $k$-fold cross-validation.
- Side-by-side performance comparison of default vs. tuned parameters.

### 5. Interactive Visualizations & Comparisons
- Grouped bar charts comparing metrics across all algorithms simultaneously.
- Interactive Chart.js visualizations for feature importances and confusion matrix heatmaps.

### 6. One-Click Model Deployment & Live Testing
- Deploy champion models to production with a single click.
- Real-time prediction form: dynamically generates form fields matching the dataset features for instant interactive testing.

### 7. Export & Integration
- Download serialized model binaries in `.joblib`, `.pkl`, or `.onnx` formats.
- Copy-paste ready Python inference snippets for seamless integration into external applications.

---

## 🛠️ Key Technical Challenges & Solutions

| Technical Challenge | Root Cause | Engineering Solution |
|---|---|---|
| **String Dtype Imputation Error** | Pandas 2.x threw `TypeError: cannot perform reduction 'median' on string dtype` on mixed text columns. | Introduced explicit type inspection via `pd.api.types.is_numeric_dtype()` to separate numeric median imputation from categorical mode imputation. |
| **HTTP 500 JSON Serialization Crash** | Datasets with missing values produced IEEE-754 `NaN` floats, which violate RFC 8259 JSON compliance. | Implemented a recursive sanitizer (`sanitize_for_json()`) transforming all `NaN`, `Inf`, and `pd.NA` floats into compliant JSON `null` values. |
| **Inference Schema Mismatch** | Live prediction payloads lacked training-time categorical encoders and scalers. | Persisted fitted `StandardScaler` and `LabelEncoder` state directly alongside model weights for zero-drift inference. |

---

## 📡 REST API Reference

Interactive Swagger documentation is available at **`http://localhost:8000/docs`**.

### Dataset Endpoints
- `POST /api/dataset/upload` — Upload CSV and compute column profile.
- `GET /api/dataset/list` — List all registered datasets.
- `GET /api/dataset/{id}` — Fetch dataset details and preview rows.
- `DELETE /api/dataset/{id}` — Delete dataset and disk storage.

### Training & Tuning Endpoints
- `POST /api/training/train` — Train selected models on a dataset.
- `GET /api/training/sessions` — List all training runs.
- `GET /api/training/sessions/{id}` — Retrieve detailed metrics for a session.
- `POST /api/tuning/tune` — Run hyperparameter optimization.

### Deployment & Prediction Endpoints
- `GET /api/models/list` — List all trained models.
- `POST /api/models/deploy` — Mount a model as an active REST API.
- `POST /api/models/undeploy/{id}` — Deactivate a deployed model.
- `GET /api/models/deployed/list` — List all currently active model endpoints.
- `POST /api/predict/{model_id}` — Execute real-time inference on a feature vector.

### Export Endpoints
- `GET /api/export/download/{id}?format=joblib` — Download serialized model file (`joblib`, `pickle`, `onnx`).
- `GET /api/export/code-snippet/{id}` — Retrieve ready-to-run Python client inference code.

---

## 📄 License

This project is licensed under the MIT License.

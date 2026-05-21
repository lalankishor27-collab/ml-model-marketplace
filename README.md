# ML Model Marketplace

A full-stack web application to upload datasets, automatically train multiple ML models, compare performance visually, fine-tune hyperparameters, and deploy the best model as a REST API — all from a beautiful web dashboard.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18.2-blue?logo=react)
![Scikit--learn](https://img.shields.io/badge/Scikit--learn-1.3-orange?logo=scikit-learn)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

| Feature | Description |
|---------|-------------|
| **Dataset Management** | Upload CSV files, auto-detect column types, preview data, handle missing values |
| **Auto Model Training** | Train 7-8 ML models simultaneously with one click |
| **Model Comparison** | Visual bar charts comparing accuracy, F1, precision, recall, R2, RMSE |
| **Hyperparameter Tuning** | GridSearch & RandomizedSearch with cross-validation support |
| **Advanced Visualizations** | Confusion matrix heatmap, radar chart, feature importance, doughnut chart |
| **One-Click Deployment** | Deploy any trained model as a REST API endpoint |
| **Live Predictions** | Test deployed models with custom input through the web UI |
| **Batch Predictions** | Send multiple data points for prediction via API |
| **Model Export** | Download models as Joblib, Pickle, or ONNX + auto-generated Python code |
| **User Authentication** | JWT-based login/register with protected routes |
| **Docker Deployment** | Production-ready Docker setup with docker-compose |

---

## Supported ML Models

### Classification
| Model | Type |
|-------|------|
| Random Forest | Ensemble (Bagging) |
| Logistic Regression | Linear Model |
| SVM | Support Vector Machine |
| KNN | Instance-based |
| Decision Tree | Tree-based |
| Gradient Boosting | Ensemble (Boosting) |
| XGBoost | Extreme Gradient Boosting |

### Regression
| Model | Type |
|-------|------|
| Random Forest | Ensemble (Bagging) |
| Linear Regression | Linear Model |
| Ridge Regression | Regularized Linear |
| SVR | Support Vector Regression |
| KNN | Instance-based |
| Decision Tree | Tree-based |
| Gradient Boosting | Ensemble (Boosting) |
| XGBoost | Extreme Gradient Boosting |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Tailwind CSS, Chart.js, React Router, Axios |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| **ML Engine** | Scikit-learn, XGBoost, NumPy, Pandas |
| **Authentication** | JWT (python-jose), Passlib, bcrypt |
| **Database** | SQLite (upgradable to PostgreSQL) |
| **Export** | Joblib, Pickle, ONNX (skl2onnx) |
| **Containerization** | Docker, Docker Compose, Nginx |
| **API Docs** | Swagger UI (auto-generated at /docs) |

---

## Project Structure

```
ml-model-marketplace/
├── backend/
│   ├── app/
│   │   ├── main.py                         # FastAPI app entry point
│   │   ├── routes/
│   │   │   ├── auth.py                     # JWT authentication (register/login)
│   │   │   ├── dataset.py                  # Dataset upload & management
│   │   │   ├── training.py                 # Auto model training
│   │   │   ├── tuning.py                   # Hyperparameter tuning
│   │   │   ├── models.py                   # Model management & deployment
│   │   │   ├── export.py                   # Model download & code generation
│   │   │   └── predict.py                  # Prediction API
│   │   ├── services/
│   │   │   ├── preprocessing.py            # Data cleaning & feature engineering
│   │   │   ├── trainer.py                  # ML training engine (7+ models)
│   │   │   ├── evaluator.py               # Model evaluation metrics
│   │   │   └── hyperparameter_tuner.py     # GridSearch/RandomSearch tuning
│   │   ├── models/
│   │   │   ├── schemas.py                  # Pydantic request/response schemas
│   │   │   └── db_models.py               # SQLAlchemy database models
│   │   └── database/
│   │       └── db.py                       # Database connection & session
│   ├── trained_models/                     # Saved .joblib model files
│   ├── uploads/                            # Uploaded CSV datasets
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx               # Login/Register UI
│   │   │   ├── Dashboard.jsx              # Overview & stats
│   │   │   ├── UploadPage.jsx             # Dataset upload & preview
│   │   │   ├── TrainingPage.jsx           # Model training configuration
│   │   │   ├── TuningPage.jsx             # Hyperparameter tuning UI
│   │   │   ├── ComparePage.jsx            # Model comparison charts
│   │   │   ├── VisualizationsPage.jsx     # Advanced charts & heatmaps
│   │   │   ├── DeployPage.jsx             # Deploy & predict
│   │   │   └── ExportPage.jsx             # Download models & code
│   │   ├── api.js                          # Axios API service with auth
│   │   ├── App.jsx                         # Main app with routing & auth
│   │   └── index.css                       # Tailwind CSS
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- Docker (optional, for containerized deployment)

---

### Option 1: Run Without Docker (Development)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

---

### Option 2: Run With Docker (Production)

```bash
docker compose up --build
```

- App: http://localhost
- API: http://localhost:8000

To stop:
```bash
docker compose down
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Dataset
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dataset/upload` | Upload a CSV file |
| GET | `/api/dataset/list` | List all datasets |
| GET | `/api/dataset/{id}` | Get dataset details & preview |
| DELETE | `/api/dataset/{id}` | Delete a dataset |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/training/train` | Train all models on a dataset |
| GET | `/api/training/sessions` | List training sessions |
| GET | `/api/training/sessions/{id}` | Get session results |

### Hyperparameter Tuning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tuning/tune` | Tune a specific model |
| GET | `/api/tuning/available-models/{task_type}` | Get tunable models |
| GET | `/api/tuning/param-grid/{task_type}/{model}` | Get parameter grid |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/list` | List all trained models |
| GET | `/api/models/{id}` | Get model details |
| POST | `/api/models/deploy` | Deploy a model as API |
| POST | `/api/models/undeploy/{id}` | Undeploy a model |
| GET | `/api/models/deployed/list` | List deployed models |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/download/{id}?format=joblib` | Download model file |
| GET | `/api/export/info/{id}` | Get export metadata |
| GET | `/api/export/code-snippet/{id}` | Get Python integration code |

### Prediction
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict/{model_id}` | Single prediction |
| POST | `/api/predict/batch/{model_id}` | Batch prediction |

---

## Usage Guide

### 1. Register & Login
Create an account and login to access the platform.

### 2. Upload Dataset
Upload any CSV file (e.g., Iris, Titanic, House Prices, Wine Quality).

### 3. Train Models
Select a dataset, choose target column, and click "Train All Models". The system auto-detects whether it's classification or regression.

### 4. Compare Results
View bar charts comparing all model metrics side-by-side. Check confusion matrices and feature importance.

### 5. Tune Best Model
Select the best-performing model and fine-tune its hyperparameters with GridSearch or RandomSearch.

### 6. Deploy
Deploy any model as a REST API endpoint with one click.

### 7. Predict
Test deployed models with custom input through the web UI or programmatically via the API.

### 8. Export
Download the trained model in Joblib/Pickle/ONNX format and get ready-to-use Python code.

---

## Example API Usage

### Train Models
```json
POST /api/training/train
{
  "dataset_id": 1,
  "target_column": "species",
  "test_size": 0.2
}
```

### Deploy Best Model
```json
POST /api/models/deploy
{
  "training_session_id": 1,
  "model_name": "Random Forest"
}
```

### Make Prediction
```json
POST /api/predict/1
{
  "model_id": 1,
  "features": {
    "sepal_length": 5.1,
    "sepal_width": 3.5,
    "petal_length": 1.4,
    "petal_width": 0.2
  }
}
```

### Hyperparameter Tuning
```json
POST /api/tuning/tune
{
  "dataset_id": 1,
  "target_column": "species",
  "model_name": "Random Forest",
  "search_method": "random",
  "cv_folds": 5,
  "n_iter": 30
}
```

---

## Application Pages

| Page | Description |
|------|-------------|
| **Login/Register** | JWT authentication with beautiful UI |
| **Dashboard** | Stats cards, quick actions, recent training sessions |
| **Upload** | Drag & drop upload with data preview table |
| **Train** | Configure dataset, target column, test size and launch training |
| **Tuning** | Select model, search method, CV folds and optimize |
| **Compare** | Grouped bar charts for all metrics |
| **Visualizations** | Radar chart, confusion matrix heatmap, feature importance, doughnut |
| **Deploy** | One-click deploy, live prediction testing |
| **Export** | Download in 3 formats + copy-paste Python code |

---

## Future Enhancements

- [ ] Deep learning models (TensorFlow/Keras integration)
- [ ] Automated feature selection
- [ ] Model versioning & rollback
- [ ] Scheduled retraining with new data
- [ ] Email notifications on training completion
- [ ] Multi-user workspaces & collaboration
- [ ] Cloud deployment guides (AWS/GCP/Azure)
- [ ] Dark mode theme

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## License

MIT License

---

## Author

**LALAN kishor**

MCA (AI&IOT)

National Institute of Technology, Patna

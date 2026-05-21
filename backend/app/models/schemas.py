from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==================== Auth Schemas ====================

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: str


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    email: str


# ==================== Tuning Schemas ====================

class TuningRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    dataset_id: int
    target_column: str
    model_name: str
    feature_columns: Optional[List[str]] = None
    task_type: Optional[str] = None
    test_size: float = 0.2
    search_method: str = "random"  # "grid" or "random"
    cv_folds: int = 5
    n_iter: int = 20


# ==================== Dataset Schemas ====================

class DatasetInfo(BaseModel):
    id: int
    filename: str
    rows: int
    columns: int
    target_column: Optional[str] = None
    feature_columns: List[str] = []
    column_types: Dict[str, str] = {}
    task_type: Optional[str] = None  # "classification" or "regression"
    uploaded_at: str

    class Config:
        from_attributes = True


class DatasetPreview(BaseModel):
    columns: List[str]
    dtypes: Dict[str, str]
    sample_data: List[Dict[str, Any]]
    shape: List[int]
    missing_values: Dict[str, int]
    numeric_columns: List[str]
    categorical_columns: List[str]


class DatasetConfig(BaseModel):
    dataset_id: int
    target_column: str
    feature_columns: Optional[List[str]] = None
    task_type: Optional[str] = None  # auto-detect if not provided
    test_size: float = 0.2


# ==================== Training Schemas ====================

class TrainingRequest(BaseModel):
    dataset_id: int
    target_column: str
    feature_columns: Optional[List[str]] = None
    task_type: Optional[str] = None
    test_size: float = 0.2
    models_to_train: Optional[List[str]] = None  # None = train all


class TrainingResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    accuracy: Optional[float] = None
    f1_score: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    mse: Optional[float] = None
    rmse: Optional[float] = None
    r2_score: Optional[float] = None
    mae: Optional[float] = None
    training_time: float
    confusion_matrix: Optional[List[List[int]]] = None
    feature_importance: Optional[Dict[str, float]] = None


class TrainingSession(BaseModel):
    id: int
    dataset_id: int
    task_type: str
    target_column: str
    status: str
    results: List[TrainingResult] = []
    best_model: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# ==================== Model Schemas ====================

class ModelInfo(BaseModel):
    id: int
    name: str
    dataset_id: int
    training_session_id: int
    task_type: str
    metrics: Dict[str, Any]
    is_deployed: bool
    endpoint: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class DeployRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    training_session_id: int
    model_name: str


# ==================== Prediction Schemas ====================

class PredictionRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_id: int
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prediction: Any
    confidence: Optional[float] = None
    model_name: str

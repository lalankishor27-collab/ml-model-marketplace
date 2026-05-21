import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import Dataset, TrainingSession, TrainedModel
from app.models.schemas import TrainingRequest
from app.services.preprocessing import DataPreprocessor
from app.services.trainer import ModelTrainer
from app.services.evaluator import ModelEvaluator

router = APIRouter()
MODELS_DIR = "trained_models"
os.makedirs(MODELS_DIR, exist_ok=True)


@router.post("/train")
def train_models(request: TrainingRequest, db: Session = Depends(get_db)):
    """Train multiple ML models on the dataset."""

    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Load and preprocess data
    preprocessor = DataPreprocessor()
    df = preprocessor.load_dataset(dataset.filepath)

    # Validate target column
    if request.target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{request.target_column}' not found in dataset"
        )

    # Detect task type
    task_type = request.task_type or preprocessor.detect_task_type(df, request.target_column)

    # Create training session
    session = TrainingSession(
        dataset_id=request.dataset_id,
        task_type=task_type,
        target_column=request.target_column,
        feature_columns=request.feature_columns or [],
        test_size=request.test_size,
        status="training"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Create session-specific model directory
    session_model_dir = os.path.join(MODELS_DIR, f"session_{session.id}")
    os.makedirs(session_model_dir, exist_ok=True)

    try:
        # Preprocess
        X_train, X_test, y_train, y_test, feature_names = preprocessor.preprocess(
            df, request.target_column, request.feature_columns, request.test_size
        )

        # Train all models
        trainer = ModelTrainer()
        results = trainer.train_all(
            X_train, X_test, y_train, y_test,
            task_type, request.models_to_train, session_model_dir
        )

        # Find best model
        evaluator = ModelEvaluator()
        best_model_name = evaluator.compare_models(results, task_type)

        # Update session
        session.results = results
        session.best_model = best_model_name
        session.status = "completed"
        session.feature_columns = feature_names

        # Save trained models to DB
        for result in results:
            if "error" not in result:
                trained_model = TrainedModel(
                    name=result["model_name"],
                    dataset_id=request.dataset_id,
                    training_session_id=session.id,
                    task_type=task_type,
                    model_path=result.get("model_path", ""),
                    metrics={k: v for k, v in result.items() if k not in ["model_name", "model_path", "feature_importance"]},
                    feature_columns=feature_names,
                    is_deployed=False
                )
                db.add(trained_model)

        # Update dataset info
        dataset.target_column = request.target_column
        dataset.feature_columns = feature_names
        dataset.task_type = task_type

        db.commit()
        db.refresh(session)

        return {
            "session_id": session.id,
            "task_type": task_type,
            "status": "completed",
            "best_model": best_model_name,
            "results": results,
            "feature_columns": feature_names
        }

    except Exception as e:
        session.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/sessions")
def list_training_sessions(db: Session = Depends(get_db)):
    """List all training sessions."""
    sessions = db.query(TrainingSession).all()
    return [
        {
            "id": s.id,
            "dataset_id": s.dataset_id,
            "task_type": s.task_type,
            "target_column": s.target_column,
            "status": s.status,
            "best_model": s.best_model,
            "results_count": len(s.results) if s.results else 0,
            "created_at": str(s.created_at)
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_training_session(session_id: int, db: Session = Depends(get_db)):
    """Get detailed training session results."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")

    return {
        "id": session.id,
        "dataset_id": session.dataset_id,
        "task_type": session.task_type,
        "target_column": session.target_column,
        "feature_columns": session.feature_columns,
        "status": session.status,
        "best_model": session.best_model,
        "results": session.results,
        "created_at": str(session.created_at)
    }

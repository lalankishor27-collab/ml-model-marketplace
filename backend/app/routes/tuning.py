import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import Dataset, TrainingSession, TrainedModel
from app.models.schemas import TuningRequest
from app.services.preprocessing import DataPreprocessor
from app.services.hyperparameter_tuner import HyperparameterTuner

router = APIRouter()
MODELS_DIR = "trained_models"


@router.post("/tune")
def tune_model(request: TuningRequest, db: Session = Depends(get_db)):
    """Perform hyperparameter tuning on a specific model."""

    # Get dataset
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Load and preprocess
    preprocessor = DataPreprocessor()
    df = preprocessor.load_dataset(dataset.filepath)

    if request.target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{request.target_column}' not found")

    task_type = request.task_type or preprocessor.detect_task_type(df, request.target_column)

    # Create tuning directory
    tuning_dir = os.path.join(MODELS_DIR, f"tuned_{request.dataset_id}")
    os.makedirs(tuning_dir, exist_ok=True)

    try:
        # Preprocess
        X_train, X_test, y_train, y_test, feature_names = preprocessor.preprocess(
            df, request.target_column, request.feature_columns, request.test_size
        )

        # Tune
        tuner = HyperparameterTuner()
        result = tuner.tune(
            model_name=request.model_name,
            X_train=X_train,
            X_test=X_test,
            y_train=y_train,
            y_test=y_test,
            task_type=task_type,
            search_method=request.search_method,
            cv=request.cv_folds,
            n_iter=request.n_iter,
            save_dir=tuning_dir
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        # Save tuned model to DB
        trained_model = TrainedModel(
            name=f"{request.model_name} (Tuned)",
            dataset_id=request.dataset_id,
            training_session_id=0,
            task_type=task_type,
            model_path=result.get("model_path", ""),
            metrics={k: v for k, v in result.items() if k not in ["model_name", "model_path", "feature_importance", "best_params"]},
            feature_columns=feature_names,
            is_deployed=False
        )
        db.add(trained_model)
        db.commit()
        db.refresh(trained_model)

        result["model_id"] = trained_model.id
        result["feature_columns"] = feature_names
        result["task_type"] = task_type

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tuning failed: {str(e)}")


@router.get("/available-models/{task_type}")
def get_available_models(task_type: str):
    """Get models available for hyperparameter tuning."""
    tuner = HyperparameterTuner()
    models = tuner.get_available_models(task_type)
    return {"task_type": task_type, "models": models}


@router.get("/param-grid/{task_type}/{model_name}")
def get_param_grid(task_type: str, model_name: str):
    """Get the hyperparameter grid for a specific model."""
    tuner = HyperparameterTuner()
    params = tuner.get_param_grid(model_name, task_type)
    if not params:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"model_name": model_name, "task_type": task_type, "param_grid": params}

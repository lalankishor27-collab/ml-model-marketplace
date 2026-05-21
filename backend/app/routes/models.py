from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import TrainedModel, TrainingSession
from app.models.schemas import DeployRequest

router = APIRouter()


@router.get("/list")
def list_models(db: Session = Depends(get_db)):
    """List all trained models."""
    models = db.query(TrainedModel).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "dataset_id": m.dataset_id,
            "training_session_id": m.training_session_id,
            "task_type": m.task_type,
            "metrics": m.metrics,
            "is_deployed": m.is_deployed,
            "endpoint": m.endpoint,
            "created_at": str(m.created_at)
        }
        for m in models
    ]


@router.get("/{model_id}")
def get_model(model_id: int, db: Session = Depends(get_db)):
    """Get model details."""
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    return {
        "id": model.id,
        "name": model.name,
        "dataset_id": model.dataset_id,
        "training_session_id": model.training_session_id,
        "task_type": model.task_type,
        "model_path": model.model_path,
        "metrics": model.metrics,
        "feature_columns": model.feature_columns,
        "is_deployed": model.is_deployed,
        "endpoint": model.endpoint,
        "created_at": str(model.created_at)
    }


@router.post("/deploy")
def deploy_model(request: DeployRequest, db: Session = Depends(get_db)):
    """Deploy a model as a REST API endpoint."""
    # Find the model
    model = db.query(TrainedModel).filter(
        TrainedModel.training_session_id == request.training_session_id,
        TrainedModel.name == request.model_name
    ).first()

    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Set endpoint
    endpoint = f"/api/predict/{model.id}"
    model.is_deployed = True
    model.endpoint = endpoint

    db.commit()
    db.refresh(model)

    return {
        "message": f"Model '{model.name}' deployed successfully!",
        "model_id": model.id,
        "endpoint": endpoint,
        "feature_columns": model.feature_columns
    }


@router.post("/undeploy/{model_id}")
def undeploy_model(model_id: int, db: Session = Depends(get_db)):
    """Undeploy a model."""
    model = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.is_deployed = False
    model.endpoint = None
    db.commit()

    return {"message": f"Model '{model.name}' undeployed successfully"}


@router.get("/deployed/list")
def list_deployed_models(db: Session = Depends(get_db)):
    """List all deployed models."""
    models = db.query(TrainedModel).filter(TrainedModel.is_deployed == True).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "task_type": m.task_type,
            "endpoint": m.endpoint,
            "feature_columns": m.feature_columns,
            "metrics": m.metrics
        }
        for m in models
    ]

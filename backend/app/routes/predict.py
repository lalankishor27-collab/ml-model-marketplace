import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import TrainedModel
from app.models.schemas import PredictionRequest

router = APIRouter()


@router.post("/{model_id}")
def predict(model_id: int, request: PredictionRequest, db: Session = Depends(get_db)):
    """Make predictions using a deployed model."""
    # Get model from DB
    model_record = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()

    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model_record.is_deployed:
        raise HTTPException(status_code=400, detail="Model is not deployed. Deploy it first.")

    # Load the trained model
    try:
        model = joblib.load(model_record.model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")

    # Prepare features
    feature_columns = model_record.feature_columns
    try:
        features = []
        for col in feature_columns:
            if col in request.features:
                features.append(request.features[col])
            else:
                features.append(0)  # Default value for missing features

        X = np.array([features])

        # Make prediction
        prediction = model.predict(X)

        # Get confidence/probability if classification
        confidence = None
        if model_record.task_type == "classification" and hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(X)
                confidence = float(np.max(proba))
            except:
                pass

        return {
            "prediction": prediction[0].item() if hasattr(prediction[0], 'item') else prediction[0],
            "confidence": confidence,
            "model_name": model_record.name,
            "model_id": model_record.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/batch/{model_id}")
def predict_batch(model_id: int, data: dict, db: Session = Depends(get_db)):
    """Make batch predictions."""
    model_record = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()

    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model_record.is_deployed:
        raise HTTPException(status_code=400, detail="Model is not deployed.")

    # Load model
    try:
        model = joblib.load(model_record.model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")

    # Process batch
    feature_columns = model_record.feature_columns
    records = data.get("records", [])

    if not records:
        raise HTTPException(status_code=400, detail="No records provided")

    try:
        X = []
        for record in records:
            row = [record.get(col, 0) for col in feature_columns]
            X.append(row)

        X = np.array(X)
        predictions = model.predict(X)

        results = []
        for i, pred in enumerate(predictions):
            result = {
                "index": i,
                "prediction": pred.item() if hasattr(pred, 'item') else pred
            }
            results.append(result)

        return {
            "predictions": results,
            "model_name": model_record.name,
            "total": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

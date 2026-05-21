import os
import joblib
import pickle
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import TrainedModel

router = APIRouter()


@router.get("/download/{model_id}")
def download_model(model_id: int, format: str = "joblib", db: Session = Depends(get_db)):
    """Download a trained model file in specified format."""

    model_record = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(model_record.model_path):
        raise HTTPException(status_code=404, detail="Model file not found on disk")

    if format == "joblib":
        return FileResponse(
            model_record.model_path,
            media_type="application/octet-stream",
            filename=f"{model_record.name.replace(' ', '_')}.joblib"
        )
    elif format == "pickle":
        # Convert joblib to pickle
        model = joblib.load(model_record.model_path)
        pickle_path = model_record.model_path.replace('.joblib', '.pkl')
        with open(pickle_path, 'wb') as f:
            pickle.dump(model, f)
        return FileResponse(
            pickle_path,
            media_type="application/octet-stream",
            filename=f"{model_record.name.replace(' ', '_')}.pkl"
        )
    elif format == "onnx":
        # Export to ONNX format
        try:
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType

            model = joblib.load(model_record.model_path)
            n_features = len(model_record.feature_columns)
            initial_type = [('float_input', FloatTensorType([None, n_features]))]
            onnx_model = convert_sklearn(model, initial_types=initial_type)

            onnx_path = model_record.model_path.replace('.joblib', '.onnx')
            with open(onnx_path, 'wb') as f:
                f.write(onnx_model.SerializeToString())

            return FileResponse(
                onnx_path,
                media_type="application/octet-stream",
                filename=f"{model_record.name.replace(' ', '_')}.onnx"
            )
        except ImportError:
            raise HTTPException(
                status_code=400,
                detail="ONNX export requires 'skl2onnx' package. Install with: pip install skl2onnx"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"ONNX export failed: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'joblib', 'pickle', or 'onnx'")


@router.get("/info/{model_id}")
def get_model_export_info(model_id: int, db: Session = Depends(get_db)):
    """Get model info for export (metadata, feature columns, etc.)."""
    model_record = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    file_size = 0
    if os.path.exists(model_record.model_path):
        file_size = os.path.getsize(model_record.model_path)

    return {
        "id": model_record.id,
        "name": model_record.name,
        "task_type": model_record.task_type,
        "feature_columns": model_record.feature_columns,
        "metrics": model_record.metrics,
        "file_size_bytes": file_size,
        "file_size_mb": round(file_size / (1024 * 1024), 2),
        "available_formats": ["joblib", "pickle", "onnx"],
        "created_at": str(model_record.created_at)
    }


@router.get("/code-snippet/{model_id}")
def get_code_snippet(model_id: int, db: Session = Depends(get_db)):
    """Generate Python code snippet for using the downloaded model."""
    model_record = db.query(TrainedModel).filter(TrainedModel.id == model_id).first()
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    feature_cols = model_record.feature_columns
    model_name = model_record.name.replace(' ', '_').lower()

    snippet = f'''import joblib
import numpy as np

# Load the trained model
model = joblib.load("{model_name}.joblib")

# Feature columns (in order):
# {feature_cols}

# Example prediction
sample_data = np.array([[{", ".join(["0.0"] * len(feature_cols))}]])

prediction = model.predict(sample_data)
print(f"Prediction: {{prediction[0]}}")
'''

    if model_record.task_type == "classification":
        snippet += '''
# Get prediction probabilities
if hasattr(model, "predict_proba"):
    probabilities = model.predict_proba(sample_data)
    print(f"Probabilities: {probabilities[0]}")
'''

    return {
        "model_name": model_record.name,
        "code_snippet": snippet,
        "feature_columns": feature_cols
    }

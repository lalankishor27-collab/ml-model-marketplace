import os
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.db_models import Dataset
from app.services.preprocessing import DataPreprocessor

router = APIRouter()
UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV dataset and get its info."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Save file
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Load and analyze
    preprocessor = DataPreprocessor()
    try:
        df = preprocessor.load_dataset(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    info = preprocessor.get_dataset_info(df)

    # Save to database
    dataset = Dataset(
        filename=file.filename,
        filepath=filepath,
        rows=info["shape"][0],
        columns=info["shape"][1],
        column_types=info["dtypes"]
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "id": dataset.id,
        "filename": dataset.filename,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "preview": info
    }


@router.get("/list")
def list_datasets(db: Session = Depends(get_db)):
    """List all uploaded datasets."""
    datasets = db.query(Dataset).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "rows": d.rows,
            "columns": d.columns,
            "target_column": d.target_column,
            "task_type": d.task_type,
            "uploaded_at": str(d.uploaded_at)
        }
        for d in datasets
    ]


@router.get("/{dataset_id}")
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Get dataset details and preview."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    preprocessor = DataPreprocessor()
    df = preprocessor.load_dataset(dataset.filepath)
    info = preprocessor.get_dataset_info(df)

    return {
        "id": dataset.id,
        "filename": dataset.filename,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "target_column": dataset.target_column,
        "task_type": dataset.task_type,
        "preview": info
    }


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Delete a dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Remove file
    if os.path.exists(dataset.filepath):
        os.remove(dataset.filepath)

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import dataset, training, models, predict, tuning, export, auth
from app.database.db import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ML Model Marketplace",
    description="Upload datasets, auto-train multiple ML models, compare performance, and deploy the best one as an API.",
    version="2.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dataset.router, prefix="/api/dataset", tags=["Dataset"])
app.include_router(training.router, prefix="/api/training", tags=["Training"])
app.include_router(tuning.router, prefix="/api/tuning", tags=["Hyperparameter Tuning"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(predict.router, prefix="/api/predict", tags=["Prediction"])


@app.get("/")
def root():
    return {
        "message": "ML Model Marketplace API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

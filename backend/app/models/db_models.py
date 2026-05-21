from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.database.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    rows = Column(Integer)
    columns = Column(Integer)
    target_column = Column(String, nullable=True)
    feature_columns = Column(JSON, default=[])
    column_types = Column(JSON, default={})
    task_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, nullable=False)
    task_type = Column(String, nullable=False)
    target_column = Column(String, nullable=False)
    feature_columns = Column(JSON, default=[])
    test_size = Column(Float, default=0.2)
    status = Column(String, default="pending")  # pending, training, completed, failed
    results = Column(JSON, default=[])
    best_model = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class TrainedModel(Base):
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dataset_id = Column(Integer, nullable=False)
    training_session_id = Column(Integer, nullable=False)
    task_type = Column(String, nullable=False)
    model_path = Column(String, nullable=False)
    metrics = Column(JSON, default={})
    feature_columns = Column(JSON, default=[])
    is_deployed = Column(Boolean, default=False)
    endpoint = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

import pandas as pd
import numpy as np
from typing import Tuple, List, Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler


class DataPreprocessor:
    """Handles dataset loading, cleaning, and feature engineering."""

    def __init__(self):
        self.label_encoders = {}
        self.scaler = StandardScaler()

    def load_dataset(self, filepath: str) -> pd.DataFrame:
        """Load a CSV dataset."""
        df = pd.read_csv(filepath)
        return df

    def get_dataset_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic info about the dataset."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

        return {
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "shape": list(df.shape),
            "sample_data": df.head(5).to_dict(orient="records"),
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols
        }

    def detect_task_type(self, df: pd.DataFrame, target_column: str) -> str:
        """Auto-detect if it's a classification or regression task."""
        target = df[target_column]

        # If target is categorical/object type -> classification
        if target.dtype == 'object' or target.dtype.name == 'category':
            return "classification"

        # If target has few unique values relative to total -> classification
        unique_ratio = target.nunique() / len(target)
        if unique_ratio < 0.05 or target.nunique() <= 20:
            return "classification"

        return "regression"

    def preprocess(
        self,
        df: pd.DataFrame,
        target_column: str,
        feature_columns: Optional[List[str]] = None,
        test_size: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """
        Preprocess the dataset for ML training.
        Returns: X_train, X_test, y_train, y_test, feature_names
        """
        # Select features
        if feature_columns:
            features = feature_columns
        else:
            features = [col for col in df.columns if col != target_column]

        X = df[features].copy()
        y = df[target_column].copy()

        # Handle missing values
        for col in X.columns:
            if X[col].dtype in ['object', 'category']:
                X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else 'unknown', inplace=True)
            else:
                X[col].fillna(X[col].median(), inplace=True)

        # Encode categorical features
        for col in X.columns:
            if X[col].dtype in ['object', 'category']:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                self.label_encoders[col] = le

        # Encode target if categorical
        if y.dtype in ['object', 'category']:
            le = LabelEncoder()
            y = le.fit_transform(y.astype(str))
            self.label_encoders[target_column] = le

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=test_size, random_state=42
        )

        return X_train, X_test, y_train, y_test, features

    def preprocess_single(self, data: Dict[str, Any], feature_columns: List[str]) -> np.ndarray:
        """Preprocess a single data point for prediction."""
        df = pd.DataFrame([data])

        # Ensure all feature columns exist
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0

        df = df[feature_columns]

        # Encode categorical features
        for col in df.columns:
            if col in self.label_encoders and df[col].dtype in ['object', 'category']:
                df[col] = self.label_encoders[col].transform(df[col].astype(str))

        # Scale
        X_scaled = self.scaler.transform(df)
        return X_scaled

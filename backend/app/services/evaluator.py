import numpy as np
from typing import Dict, Any
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    confusion_matrix, mean_squared_error, mean_absolute_error, r2_score
)


class ModelEvaluator:
    """Evaluates trained models with comprehensive metrics."""

    def evaluate(self, y_true: np.ndarray, y_pred: np.ndarray, task_type: str) -> Dict[str, Any]:
        """Compute metrics based on task type."""
        if task_type == "classification":
            return self._classification_metrics(y_true, y_pred)
        else:
            return self._regression_metrics(y_true, y_pred)

    def _classification_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
        """Compute classification metrics."""
        # Determine averaging method
        unique_classes = np.unique(y_true)
        average = 'binary' if len(unique_classes) == 2 else 'weighted'

        metrics = {
            "accuracy": round(accuracy_score(y_true, y_pred), 4),
            "f1_score": round(f1_score(y_true, y_pred, average=average, zero_division=0), 4),
            "precision": round(precision_score(y_true, y_pred, average=average, zero_division=0), 4),
            "recall": round(recall_score(y_true, y_pred, average=average, zero_division=0), 4),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist()
        }

        return metrics

    def _regression_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
        """Compute regression metrics."""
        mse = mean_squared_error(y_true, y_pred)

        metrics = {
            "mse": round(mse, 4),
            "rmse": round(np.sqrt(mse), 4),
            "mae": round(mean_absolute_error(y_true, y_pred), 4),
            "r2_score": round(r2_score(y_true, y_pred), 4)
        }

        return metrics

    def compare_models(self, results: list, task_type: str) -> str:
        """Find the best model from results."""
        if not results:
            return None

        valid_results = [r for r in results if "error" not in r]
        if not valid_results:
            return None

        if task_type == "classification":
            # Best by accuracy
            best = max(valid_results, key=lambda x: x.get("accuracy", 0))
        else:
            # Best by R2 score (higher is better)
            best = max(valid_results, key=lambda x: x.get("r2_score", -float('inf')))

        return best["model_name"]

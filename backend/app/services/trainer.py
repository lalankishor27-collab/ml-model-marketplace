import time
import numpy as np
import joblib
from typing import Dict, List, Any, Optional
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor


class ModelTrainer:
    """Trains multiple ML models and returns results."""

    CLASSIFICATION_MODELS = {
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "SVM": SVC(kernel='rbf', probability=True, random_state=42),
        "KNN": KNeighborsClassifier(n_neighbors=5),
        "Decision Tree": DecisionTreeClassifier(random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='logloss'),
    }

    REGRESSION_MODELS = {
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(random_state=42),
        "SVR": SVR(kernel='rbf'),
        "KNN": KNeighborsRegressor(n_neighbors=5),
        "Decision Tree": DecisionTreeRegressor(random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=100, random_state=42),
    }

    def get_models(self, task_type: str, models_to_train: Optional[List[str]] = None) -> Dict:
        """Get models based on task type."""
        if task_type == "classification":
            all_models = self.CLASSIFICATION_MODELS
        else:
            all_models = self.REGRESSION_MODELS

        if models_to_train:
            return {name: model for name, model in all_models.items() if name in models_to_train}
        return all_models

    def train_all(
        self,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        task_type: str,
        models_to_train: Optional[List[str]] = None,
        save_dir: str = "trained_models"
    ) -> List[Dict[str, Any]]:
        """Train all models and return results."""
        models = self.get_models(task_type, models_to_train)
        results = []

        for name, model in models.items():
            try:
                result = self._train_single_model(
                    name, model, X_train, X_test, y_train, y_test, task_type, save_dir
                )
                results.append(result)
            except Exception as e:
                results.append({
                    "model_name": name,
                    "error": str(e),
                    "training_time": 0
                })

        return results

    def _train_single_model(
        self,
        name: str,
        model,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        task_type: str,
        save_dir: str
    ) -> Dict[str, Any]:
        """Train a single model and compute metrics."""
        from app.services.evaluator import ModelEvaluator

        evaluator = ModelEvaluator()

        # Train
        start_time = time.time()
        model.fit(X_train, y_train)
        training_time = time.time() - start_time

        # Predict
        y_pred = model.predict(X_test)

        # Evaluate
        metrics = evaluator.evaluate(y_test, y_pred, task_type)

        # Feature importance (if available)
        feature_importance = None
        if hasattr(model, 'feature_importances_'):
            feature_importance = model.feature_importances_.tolist()

        # Save model
        model_filename = f"{save_dir}/{name.replace(' ', '_').lower()}.joblib"
        joblib.dump(model, model_filename)

        result = {
            "model_name": name,
            "training_time": round(training_time, 4),
            "model_path": model_filename,
            **metrics
        }

        if feature_importance:
            result["feature_importance"] = feature_importance

        return result

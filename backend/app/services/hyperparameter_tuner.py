import time
import numpy as np
import joblib
from typing import Dict, List, Any, Optional
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor


class HyperparameterTuner:
    """Performs hyperparameter tuning using GridSearch or RandomizedSearch."""

    # Hyperparameter grids for classification models
    CLASSIFICATION_PARAMS = {
        "Random Forest": {
            "model": RandomForestClassifier(random_state=42, n_jobs=-1),
            "params": {
                "n_estimators": [50, 100, 200],
                "max_depth": [None, 10, 20, 30],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
            }
        },
        "Logistic Regression": {
            "model": LogisticRegression(random_state=42, max_iter=1000),
            "params": {
                "C": [0.01, 0.1, 1, 10, 100],
                "solver": ["lbfgs", "liblinear"],
                "penalty": ["l2"],
            }
        },
        "SVM": {
            "model": SVC(probability=True, random_state=42),
            "params": {
                "C": [0.1, 1, 10],
                "kernel": ["rbf", "linear", "poly"],
                "gamma": ["scale", "auto"],
            }
        },
        "KNN": {
            "model": KNeighborsClassifier(),
            "params": {
                "n_neighbors": [3, 5, 7, 9, 11],
                "weights": ["uniform", "distance"],
                "metric": ["euclidean", "manhattan"],
            }
        },
        "Decision Tree": {
            "model": DecisionTreeClassifier(random_state=42),
            "params": {
                "max_depth": [None, 5, 10, 20, 30],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
                "criterion": ["gini", "entropy"],
            }
        },
        "Gradient Boosting": {
            "model": GradientBoostingClassifier(random_state=42),
            "params": {
                "n_estimators": [50, 100, 200],
                "learning_rate": [0.01, 0.1, 0.2],
                "max_depth": [3, 5, 7],
                "subsample": [0.8, 1.0],
            }
        },
        "XGBoost": {
            "model": XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='logloss'),
            "params": {
                "n_estimators": [50, 100, 200],
                "learning_rate": [0.01, 0.1, 0.2],
                "max_depth": [3, 5, 7],
                "subsample": [0.8, 1.0],
                "colsample_bytree": [0.8, 1.0],
            }
        },
    }

    # Hyperparameter grids for regression models
    REGRESSION_PARAMS = {
        "Random Forest": {
            "model": RandomForestRegressor(random_state=42, n_jobs=-1),
            "params": {
                "n_estimators": [50, 100, 200],
                "max_depth": [None, 10, 20, 30],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
            }
        },
        "Ridge Regression": {
            "model": Ridge(random_state=42),
            "params": {
                "alpha": [0.01, 0.1, 1, 10, 100],
                "solver": ["auto", "svd", "lsqr"],
            }
        },
        "SVR": {
            "model": SVR(),
            "params": {
                "C": [0.1, 1, 10],
                "kernel": ["rbf", "linear", "poly"],
                "gamma": ["scale", "auto"],
                "epsilon": [0.01, 0.1, 0.2],
            }
        },
        "KNN": {
            "model": KNeighborsRegressor(),
            "params": {
                "n_neighbors": [3, 5, 7, 9, 11],
                "weights": ["uniform", "distance"],
                "metric": ["euclidean", "manhattan"],
            }
        },
        "Decision Tree": {
            "model": DecisionTreeRegressor(random_state=42),
            "params": {
                "max_depth": [None, 5, 10, 20, 30],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
            }
        },
        "Gradient Boosting": {
            "model": GradientBoostingRegressor(random_state=42),
            "params": {
                "n_estimators": [50, 100, 200],
                "learning_rate": [0.01, 0.1, 0.2],
                "max_depth": [3, 5, 7],
                "subsample": [0.8, 1.0],
            }
        },
        "XGBoost": {
            "model": XGBRegressor(random_state=42),
            "params": {
                "n_estimators": [50, 100, 200],
                "learning_rate": [0.01, 0.1, 0.2],
                "max_depth": [3, 5, 7],
                "subsample": [0.8, 1.0],
                "colsample_bytree": [0.8, 1.0],
            }
        },
    }

    def tune(
        self,
        model_name: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        task_type: str,
        search_method: str = "random",  # "grid" or "random"
        cv: int = 5,
        n_iter: int = 20,
        save_dir: str = "trained_models"
    ) -> Dict[str, Any]:
        """Tune hyperparameters for a specific model."""
        from app.services.evaluator import ModelEvaluator

        evaluator = ModelEvaluator()

        # Get model config
        if task_type == "classification":
            model_configs = self.CLASSIFICATION_PARAMS
            scoring = "accuracy"
        else:
            model_configs = self.REGRESSION_PARAMS
            scoring = "r2"

        if model_name not in model_configs:
            return {"error": f"Model '{model_name}' not supported for tuning"}

        config = model_configs[model_name]
        model = config["model"]
        param_grid = config["params"]

        # Perform search
        start_time = time.time()

        if search_method == "grid":
            search = GridSearchCV(
                model, param_grid, cv=cv, scoring=scoring,
                n_jobs=-1, verbose=0, return_train_score=True
            )
        else:
            search = RandomizedSearchCV(
                model, param_grid, n_iter=n_iter, cv=cv,
                scoring=scoring, n_jobs=-1, verbose=0,
                random_state=42, return_train_score=True
            )

        search.fit(X_train, y_train)
        tuning_time = time.time() - start_time

        # Get best model and predict
        best_model = search.best_estimator_
        y_pred = best_model.predict(X_test)

        # Evaluate
        metrics = evaluator.evaluate(y_test, y_pred, task_type)

        # Feature importance
        feature_importance = None
        if hasattr(best_model, 'feature_importances_'):
            feature_importance = best_model.feature_importances_.tolist()

        # Save tuned model
        model_filename = f"{save_dir}/{model_name.replace(' ', '_').lower()}_tuned.joblib"
        joblib.dump(best_model, model_filename)

        # Get CV results summary
        cv_results = {
            "mean_train_score": float(search.cv_results_['mean_train_score'][search.best_index_]),
            "mean_test_score": float(search.cv_results_['mean_test_score'][search.best_index_]),
            "std_test_score": float(search.cv_results_['std_test_score'][search.best_index_]),
        }

        return {
            "model_name": model_name,
            "best_params": search.best_params_,
            "best_cv_score": round(search.best_score_, 4),
            "tuning_time": round(tuning_time, 4),
            "search_method": search_method,
            "cv_folds": cv,
            "total_fits": len(search.cv_results_['mean_test_score']) * cv,
            "model_path": model_filename,
            "cv_results": cv_results,
            "feature_importance": feature_importance,
            **metrics
        }

    def get_available_models(self, task_type: str) -> List[str]:
        """Get list of models available for tuning."""
        if task_type == "classification":
            return list(self.CLASSIFICATION_PARAMS.keys())
        return list(self.REGRESSION_PARAMS.keys())

    def get_param_grid(self, model_name: str, task_type: str) -> Dict:
        """Get the parameter grid for a specific model."""
        if task_type == "classification":
            config = self.CLASSIFICATION_PARAMS.get(model_name, {})
        else:
            config = self.REGRESSION_PARAMS.get(model_name, {})
        return config.get("params", {})

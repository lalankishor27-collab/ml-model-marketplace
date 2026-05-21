import React, { useState, useEffect } from 'react';
import { Settings, Loader2, CheckCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDatasets, getDataset, tuneModel, getAvailableModels } from '../api';

export default function TuningPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [searchMethod, setSearchMethod] = useState('random');
  const [cvFolds, setCvFolds] = useState(5);
  const [nIter, setNIter] = useState(20);
  const [tuning, setTuning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await getDatasets();
      setDatasets(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDatasetSelect = async (datasetId) => {
    setSelectedDataset(datasetId);
    setTargetColumn('');
    setResult(null);
    try {
      const res = await getDataset(datasetId);
      setDatasetInfo(res.data.preview);
      if (res.data.task_type) {
        setTaskType(res.data.task_type);
        loadModels(res.data.task_type);
      }
    } catch (error) {
      toast.error('Failed to load dataset');
    }
  };

  const loadModels = async (type) => {
    try {
      const res = await getAvailableModels(type);
      setAvailableModels(res.data.models);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleTaskTypeChange = (type) => {
    setTaskType(type);
    loadModels(type);
  };

  const handleTune = async () => {
    if (!selectedDataset || !targetColumn || !selectedModel) {
      toast.error('Please fill all required fields');
      return;
    }

    setTuning(true);
    setResult(null);
    try {
      const res = await tuneModel({
        dataset_id: parseInt(selectedDataset),
        target_column: targetColumn,
        model_name: selectedModel,
        task_type: taskType || undefined,
        search_method: searchMethod,
        cv_folds: cvFolds,
        n_iter: nIter,
      });
      setResult(res.data);
      toast.success(`Tuning completed! Best CV Score: ${res.data.best_cv_score}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Tuning failed');
    } finally {
      setTuning(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Settings className="w-8 h-8 text-indigo-600" />
          <span>Hyperparameter Tuning</span>
        </h1>
        <p className="text-gray-500 mt-1">Fine-tune model hyperparameters for better performance</p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tuning Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Dataset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
            <select
              value={selectedDataset || ''}
              onChange={(e) => handleDatasetSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select dataset...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
          </div>

          {/* Target Column */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Column</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={!datasetInfo}
            >
              <option value="">Select target...</option>
              {datasetInfo?.columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => handleTaskTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Auto-detect</option>
              <option value="classification">Classification</option>
              <option value="regression">Regression</option>
            </select>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model to Tune</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={availableModels.length === 0}
            >
              <option value="">Select model...</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Search Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Method</label>
            <select
              value={searchMethod}
              onChange={(e) => setSearchMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="random">Random Search (Faster)</option>
              <option value="grid">Grid Search (Exhaustive)</option>
            </select>
          </div>

          {/* CV Folds */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CV Folds: {cvFolds}</label>
            <input
              type="range"
              min="2"
              max="10"
              value={cvFolds}
              onChange={(e) => setCvFolds(parseInt(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          {/* Iterations */}
          {searchMethod === 'random' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Iterations: {nIter}</label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={nIter}
                onChange={(e) => setNIter(parseInt(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleTune}
          disabled={tuning || !selectedDataset || !targetColumn || !selectedModel}
          className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
        >
          {tuning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Tuning in progress...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Start Tuning</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Tuning Results - {result.model_name}</span>
          </h2>

          {/* Best Params */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-purple-800 mb-2">Best Parameters Found</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(result.best_params || {}).map(([key, value]) => (
                <div key={key} className="bg-white px-3 py-2 rounded border border-purple-100">
                  <span className="text-xs text-gray-500">{key}</span>
                  <p className="font-mono font-medium text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-green-600">Best CV Score</p>
              <p className="text-2xl font-bold text-green-900">{(result.best_cv_score * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-600">
                {result.task_type === 'classification' ? 'Test Accuracy' : 'Test R2 Score'}
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {result.task_type === 'classification'
                  ? `${(result.accuracy * 100).toFixed(2)}%`
                  : result.r2_score?.toFixed(4)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-purple-600">Tuning Time</p>
              <p className="text-2xl font-bold text-purple-900">{result.tuning_time}s</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-orange-600">Total Fits</p>
              <p className="text-2xl font-bold text-orange-900">{result.total_fits}</p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-2">All Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {result.task_type === 'classification' ? (
                <>
                  <div><span className="text-xs text-gray-500">F1 Score</span><p className="font-medium">{(result.f1_score * 100).toFixed(2)}%</p></div>
                  <div><span className="text-xs text-gray-500">Precision</span><p className="font-medium">{(result.precision * 100).toFixed(2)}%</p></div>
                  <div><span className="text-xs text-gray-500">Recall</span><p className="font-medium">{(result.recall * 100).toFixed(2)}%</p></div>
                  <div><span className="text-xs text-gray-500">Search Method</span><p className="font-medium capitalize">{result.search_method}</p></div>
                </>
              ) : (
                <>
                  <div><span className="text-xs text-gray-500">RMSE</span><p className="font-medium">{result.rmse?.toFixed(4)}</p></div>
                  <div><span className="text-xs text-gray-500">MAE</span><p className="font-medium">{result.mae?.toFixed(4)}</p></div>
                  <div><span className="text-xs text-gray-500">MSE</span><p className="font-medium">{result.mse?.toFixed(4)}</p></div>
                  <div><span className="text-xs text-gray-500">Search Method</span><p className="font-medium capitalize">{result.search_method}</p></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

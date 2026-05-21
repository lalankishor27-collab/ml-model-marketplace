import React, { useState, useEffect } from 'react';
import { Brain, Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDatasets, getDataset, trainModels, getTrainingSessions } from '../api';

export default function TrainingPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [testSize, setTestSize] = useState(0.2);
  const [training, setTraining] = useState(false);
  const [results, setResults] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadDatasets();
    loadSessions();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await getDatasets();
      setDatasets(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await getTrainingSessions();
      setSessions(res.data.reverse());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDatasetSelect = async (datasetId) => {
    setSelectedDataset(datasetId);
    setTargetColumn('');
    setResults(null);
    try {
      const res = await getDataset(datasetId);
      setDatasetInfo(res.data.preview);
    } catch (error) {
      toast.error('Failed to load dataset info');
    }
  };

  const handleTrain = async () => {
    if (!selectedDataset || !targetColumn) {
      toast.error('Please select a dataset and target column');
      return;
    }

    setTraining(true);
    setResults(null);
    try {
      const res = await trainModels({
        dataset_id: parseInt(selectedDataset),
        target_column: targetColumn,
        test_size: testSize,
      });
      setResults(res.data);
      toast.success(`Training completed! Best model: ${res.data.best_model}`);
      loadSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Training failed');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Train Models</h1>
        <p className="text-gray-500 mt-1">Auto-train multiple ML models on your dataset</p>
      </div>

      {/* Training Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dataset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
            <select
              value={selectedDataset || ''}
              onChange={(e) => handleDatasetSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a dataset...</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={!datasetInfo}
            >
              <option value="">Select target...</option>
              {datasetInfo?.columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Test Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Size: {(testSize * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSize}
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>

        <button
          onClick={handleTrain}
          disabled={training || !selectedDataset || !targetColumn}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
        >
          {training ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Training Models...</span>
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              <span>Train All Models</span>
            </>
          )}
        </button>
      </div>

      {/* Training Results */}
      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Training Results</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium
              ${results.task_type === 'classification' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
              {results.task_type}
            </span>
          </div>

          {/* Best Model Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Best Model: {results.best_model}</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Model</th>
                  {results.task_type === 'classification' ? (
                    <>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Accuracy</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">F1 Score</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Precision</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Recall</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">R2 Score</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">RMSE</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">MAE</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">MSE</th>
                    </>
                  )}
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Time (s)</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${r.model_name === results.best_model ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-3 px-3 font-medium text-gray-900">
                      {r.model_name}
                      {r.model_name === results.best_model && <span className="ml-2 text-green-600">★</span>}
                    </td>
                    {results.task_type === 'classification' ? (
                      <>
                        <td className="py-3 px-3">{(r.accuracy * 100).toFixed(2)}%</td>
                        <td className="py-3 px-3">{(r.f1_score * 100).toFixed(2)}%</td>
                        <td className="py-3 px-3">{(r.precision * 100).toFixed(2)}%</td>
                        <td className="py-3 px-3">{(r.recall * 100).toFixed(2)}%</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3">{r.r2_score?.toFixed(4)}</td>
                        <td className="py-3 px-3">{r.rmse?.toFixed(4)}</td>
                        <td className="py-3 px-3">{r.mae?.toFixed(4)}</td>
                        <td className="py-3 px-3">{r.mse?.toFixed(4)}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-gray-500">{r.training_time}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Training History</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No training sessions yet</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {s.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">Session #{s.id} - {s.target_column}</p>
                    <p className="text-xs text-gray-500">{s.task_type} | {s.results_count} models | Best: {s.best_model || 'N/A'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium
                  ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

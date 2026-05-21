import React, { useState, useEffect } from 'react';
import { Rocket, Play, Square, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTrainingSessions, getTrainingSession, deployModel, undeployModel, getDeployedModels, predict } from '../api';

export default function DeployPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [deployedModels, setDeployedModels] = useState([]);
  const [predictionModel, setPredictionModel] = useState(null);
  const [features, setFeatures] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    loadSessions();
    loadDeployed();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await getTrainingSessions();
      setSessions(res.data.filter((s) => s.status === 'completed').reverse());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadDeployed = async () => {
    try {
      const res = await getDeployedModels();
      setDeployedModels(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSessionSelect = async (sessionId) => {
    setSelectedSession(sessionId);
    try {
      const res = await getTrainingSession(sessionId);
      setSessionData(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeploy = async (modelName) => {
    try {
      const res = await deployModel({
        training_session_id: parseInt(selectedSession),
        model_name: modelName,
      });
      toast.success(res.data.message);
      loadDeployed();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deployment failed');
    }
  };

  const handleUndeploy = async (modelId) => {
    try {
      await undeployModel(modelId);
      toast.success('Model undeployed');
      loadDeployed();
    } catch (error) {
      toast.error('Undeploy failed');
    }
  };

  const handlePredict = async () => {
    if (!predictionModel) return;
    setPredicting(true);
    setPrediction(null);
    try {
      const res = await predict(predictionModel.id, features);
      setPrediction(res.data);
      toast.success('Prediction successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deploy & Predict</h1>
        <p className="text-gray-500 mt-1">Deploy models as REST APIs and make predictions</p>
      </div>

      {/* Deploy Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deploy a Model</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Training Session</label>
          <select
            value={selectedSession || ''}
            onChange={(e) => handleSessionSelect(e.target.value)}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Choose a session...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session #{s.id} - {s.target_column} ({s.task_type}) - Best: {s.best_model}
              </option>
            ))}
          </select>
        </div>

        {sessionData && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">Select a model to deploy:</p>
            {sessionData.results
              .filter((r) => !r.error)
              .sort((a, b) => {
                if (sessionData.task_type === 'classification') return (b.accuracy || 0) - (a.accuracy || 0);
                return (b.r2_score || 0) - (a.r2_score || 0);
              })
              .map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{r.model_name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {sessionData.task_type === 'classification'
                        ? `Accuracy: ${(r.accuracy * 100).toFixed(2)}%`
                        : `R2: ${r.r2_score?.toFixed(4)}`}
                    </span>
                    {r.model_name === sessionData.best_model && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Best</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeploy(r.model_name)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Deploy</span>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Deployed Models */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployed Models</h2>
        {deployedModels.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No models deployed yet</p>
        ) : (
          <div className="space-y-3">
            {deployedModels.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.task_type} | Endpoint: <code className="bg-gray-200 px-1 rounded">{m.endpoint}</code>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => { setPredictionModel(m); setFeatures({}); setPrediction(null); }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                  >
                    <Play className="w-4 h-4" />
                    <span>Test</span>
                  </button>
                  <button
                    onClick={() => handleUndeploy(m.id)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center space-x-1"
                  >
                    <Square className="w-4 h-4" />
                    <span>Undeploy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prediction Testing */}
      {predictionModel && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Test Prediction - {predictionModel.name}
          </h2>
          <p className="text-sm text-gray-500 mb-4">Enter feature values:</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {predictionModel.feature_columns?.map((col) => (
              <div key={col}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{col}</label>
                <input
                  type="number"
                  step="any"
                  value={features[col] || ''}
                  onChange={(e) => setFeatures({ ...features, [col]: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium flex items-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span>{predicting ? 'Predicting...' : 'Predict'}</span>
          </button>

          {prediction && (
            <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-gray-600">Prediction Result:</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{prediction.prediction}</p>
              {prediction.confidence && (
                <p className="text-sm text-gray-500 mt-1">
                  Confidence: {(prediction.confidence * 100).toFixed(2)}%
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

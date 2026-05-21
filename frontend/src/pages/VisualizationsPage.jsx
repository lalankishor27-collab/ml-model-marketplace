import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { getTrainingSessions, getTrainingSession } from '../api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
);

export default function VisualizationsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await getTrainingSessions();
      setSessions(res.data.filter((s) => s.status === 'completed').reverse());
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

  // Confusion Matrix Heatmap (displayed as a grid)
  const renderConfusionMatrix = (result) => {
    if (!result.confusion_matrix) return null;
    const matrix = result.confusion_matrix;
    const maxVal = Math.max(...matrix.flat());

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-md font-semibold text-gray-900 mb-3">
          Confusion Matrix - {result.model_name}
        </h3>
        <div className="flex justify-center">
          <div className="inline-block">
            <div className="text-xs text-gray-500 text-center mb-2">Predicted</div>
            <div className="flex">
              <div className="flex flex-col justify-center mr-2">
                <span className="text-xs text-gray-500 transform -rotate-90 origin-center">Actual</span>
              </div>
              <div>
                {matrix.map((row, i) => (
                  <div key={i} className="flex">
                    {row.map((val, j) => {
                      const intensity = maxVal > 0 ? val / maxVal : 0;
                      const bgColor = i === j
                        ? `rgba(34, 197, 94, ${0.2 + intensity * 0.7})`
                        : `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`;
                      return (
                        <div
                          key={j}
                          className="w-14 h-14 flex items-center justify-center border border-gray-200 text-sm font-bold"
                          style={{ backgroundColor: bgColor }}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ROC-like visualization (Accuracy vs Models)
  const getAccuracyRadar = () => {
    if (!sessionData?.results) return null;
    const validResults = sessionData.results.filter((r) => !r.error);

    if (sessionData.task_type !== 'classification') return null;

    return {
      labels: validResults.map((r) => r.model_name),
      datasets: [
        {
          label: 'Accuracy',
          data: validResults.map((r) => (r.accuracy * 100)),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'F1 Score',
          data: validResults.map((r) => (r.f1_score * 100)),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  };

  // Feature Importance Chart
  const getFeatureImportanceChart = () => {
    if (!sessionData?.results || !sessionData?.feature_columns) return null;

    // Find a result with feature importance
    const resultWithFI = sessionData.results.find((r) => r.feature_importance);
    if (!resultWithFI) return null;

    const features = sessionData.feature_columns;
    const importance = resultWithFI.feature_importance;

    // Pair and sort
    const paired = features.map((f, i) => ({ feature: f, importance: importance[i] || 0 }));
    paired.sort((a, b) => b.importance - a.importance);

    return {
      labels: paired.slice(0, 15).map((p) => p.feature),
      datasets: [
        {
          label: `Feature Importance (${resultWithFI.model_name})`,
          data: paired.slice(0, 15).map((p) => p.importance),
          backgroundColor: paired.slice(0, 15).map((_, i) =>
            `hsla(${(i * 360) / 15}, 70%, 60%, 0.7)`
          ),
          borderRadius: 4,
        },
      ],
    };
  };

  // Accuracy Pie/Doughnut chart
  const getAccuracyDoughnut = () => {
    if (!sessionData?.results) return null;
    const validResults = sessionData.results.filter((r) => !r.error);

    const metric = sessionData.task_type === 'classification' ? 'accuracy' : 'r2_score';
    const colors = [
      'rgba(99, 102, 241, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(34, 197, 94, 0.8)',
    ];

    return {
      labels: validResults.map((r) => r.model_name),
      datasets: [
        {
          data: validResults.map((r) => ((r[metric] || 0) * 100).toFixed(2)),
          backgroundColor: colors.slice(0, validResults.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  };

  // Training Time Line chart
  const getTimeLineChart = () => {
    if (!sessionData?.results) return null;
    const validResults = sessionData.results.filter((r) => !r.error);

    return {
      labels: validResults.map((r) => r.model_name),
      datasets: [
        {
          label: 'Training Time (s)',
          data: validResults.map((r) => r.training_time),
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        },
      ],
    };
  };

  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20 },
      },
    },
  };

  const barOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: { legend: { position: 'top' } },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <PieChart className="w-8 h-8 text-indigo-600" />
          <span>Visualizations</span>
        </h1>
        <p className="text-gray-500 mt-1">Advanced charts: Confusion Matrix, Radar, Feature Importance & more</p>
      </div>

      {/* Session Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Training Session</label>
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
        <div className="space-y-8">
          {/* Row 1: Radar + Doughnut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            {getAccuracyRadar() && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Performance Radar</h2>
                <div className="h-80">
                  <Radar data={getAccuracyRadar()} options={radarOptions} />
                </div>
              </div>
            )}

            {/* Doughnut Chart */}
            {getAccuracyDoughnut() && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {sessionData.task_type === 'classification' ? 'Accuracy' : 'R2 Score'} Distribution
                </h2>
                <div className="h-80 flex items-center justify-center">
                  <Doughnut
                    data={getAccuracyDoughnut()}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feature Importance */}
          {getFeatureImportanceChart() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Importance (Top 15)</h2>
              <div className="h-96">
                <Bar data={getFeatureImportanceChart()} options={barOptions} />
              </div>
            </div>
          )}

          {/* Training Time */}
          {getTimeLineChart() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Time Trend</h2>
              <div className="h-64">
                <Line
                  data={getTimeLineChart()}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </div>
          )}

          {/* Confusion Matrices */}
          {sessionData.task_type === 'classification' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Confusion Matrices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessionData.results
                  .filter((r) => r.confusion_matrix)
                  .slice(0, 6)
                  .map((r, i) => (
                    <div key={i}>{renderConfusionMatrix(r)}</div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

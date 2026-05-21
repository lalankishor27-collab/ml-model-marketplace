import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getTrainingSessions, getTrainingSession } from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ComparePage() {
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

  const getChartData = () => {
    if (!sessionData?.results) return null;

    const validResults = sessionData.results.filter((r) => !r.error);
    const labels = validResults.map((r) => r.model_name);

    if (sessionData.task_type === 'classification') {
      return {
        labels,
        datasets: [
          {
            label: 'Accuracy',
            data: validResults.map((r) => (r.accuracy * 100).toFixed(2)),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderRadius: 6,
          },
          {
            label: 'F1 Score',
            data: validResults.map((r) => (r.f1_score * 100).toFixed(2)),
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderRadius: 6,
          },
          {
            label: 'Precision',
            data: validResults.map((r) => (r.precision * 100).toFixed(2)),
            backgroundColor: 'rgba(245, 158, 11, 0.7)',
            borderRadius: 6,
          },
          {
            label: 'Recall',
            data: validResults.map((r) => (r.recall * 100).toFixed(2)),
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderRadius: 6,
          },
        ],
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'R2 Score',
            data: validResults.map((r) => r.r2_score?.toFixed(4)),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderRadius: 6,
          },
        ],
      };
    }
  };

  const getTimeChart = () => {
    if (!sessionData?.results) return null;
    const validResults = sessionData.results.filter((r) => !r.error);
    return {
      labels: validResults.map((r) => r.model_name),
      datasets: [
        {
          label: 'Training Time (seconds)',
          data: validResults.map((r) => r.training_time),
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderRadius: 6,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Compare Models</h1>
        <p className="text-gray-500 mt-1">Visual comparison of model performance</p>
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
        <>
          {/* Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Performance Comparison</span>
            </h2>
            {getChartData() && (
              <div className="h-80">
                <Bar data={getChartData()} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Training Time Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Time Comparison</h2>
            {getTimeChart() && (
              <div className="h-64">
                <Bar data={getTimeChart()} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Rank</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Model</th>
                    {sessionData.task_type === 'classification' ? (
                      <>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Accuracy</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">F1</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Precision</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Recall</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">R2</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">RMSE</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">MAE</th>
                      </>
                    )}
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.results
                    .filter((r) => !r.error)
                    .sort((a, b) => {
                      if (sessionData.task_type === 'classification') {
                        return (b.accuracy || 0) - (a.accuracy || 0);
                      }
                      return (b.r2_score || 0) - (a.r2_score || 0);
                    })
                    .map((r, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-3">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900">{r.model_name}</td>
                        {sessionData.task_type === 'classification' ? (
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
                          </>
                        )}
                        <td className="py-3 px-3 text-gray-500">{r.training_time}s</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

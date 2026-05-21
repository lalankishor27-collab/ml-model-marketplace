import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Brain, Rocket, Activity } from 'lucide-react';
import { getDatasets, getTrainingSessions, getDeployedModels } from '../api';

function StatCard({ title, value, icon: Icon, color, link }) {
  return (
    <Link to={link} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    datasets: 0,
    sessions: 0,
    deployed: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [datasetsRes, sessionsRes, deployedRes] = await Promise.all([
        getDatasets(),
        getTrainingSessions(),
        getDeployedModels(),
      ]);
      setStats({
        datasets: datasetsRes.data.length,
        sessions: sessionsRes.data.length,
        deployed: deployedRes.data.length,
      });
      setRecentSessions(sessionsRes.data.slice(-5).reverse());
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your ML Model Marketplace</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Datasets Uploaded"
          value={stats.datasets}
          icon={Database}
          color="bg-blue-500"
          link="/upload"
        />
        <StatCard
          title="Training Sessions"
          value={stats.sessions}
          icon={Brain}
          color="bg-purple-500"
          link="/train"
        />
        <StatCard
          title="Deployed Models"
          value={stats.deployed}
          icon={Rocket}
          color="bg-green-500"
          link="/deploy"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Upload New Dataset
          </Link>
          <Link
            to="/train"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Start Training
          </Link>
          <Link
            to="/compare"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Compare Models
          </Link>
        </div>
      </div>

      {/* Recent Training Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Training Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No training sessions yet. <Link to="/upload" className="text-indigo-600 hover:underline">Upload a dataset</Link> to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">ID</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Task Type</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Target</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Best Model</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono">#{session.id}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${session.task_type === 'classification' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {session.task_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{session.target_column}</td>
                    <td className="py-3 px-2 font-medium text-gray-900">{session.best_model || '-'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

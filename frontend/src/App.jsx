import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Upload, Brain, BarChart3, Rocket, Home, Settings, Download, PieChart, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import TrainingPage from './pages/TrainingPage';
import ComparePage from './pages/ComparePage';
import DeployPage from './pages/DeployPage';
import TuningPage from './pages/TuningPage';
import ExportPage from './pages/ExportPage';
import VisualizationsPage from './pages/VisualizationsPage';
import AuthPage from './pages/AuthPage';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/train', label: 'Train', icon: Brain },
    { path: '/tuning', label: 'Tuning', icon: Settings },
    { path: '/compare', label: 'Compare', icon: BarChart3 },
    { path: '/visualizations', label: 'Charts', icon: PieChart },
    { path: '/deploy', label: 'Deploy', icon: Rocket },
    { path: '/export', label: 'Export', icon: Download },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">ML Marketplace</span>
          </Link>
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-600 hidden md:inline">{user.username || user.email}</span>
                <button
                  onClick={onLogout}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser({ username: userData.username, email: userData.email });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Show auth page if not logged in
  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <AuthPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Navbar user={user} onLogout={handleLogout} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/train" element={<TrainingPage />} />
            <Route path="/tuning" element={<TuningPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/visualizations" element={<VisualizationsPage />} />
            <Route path="/deploy" element={<DeployPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

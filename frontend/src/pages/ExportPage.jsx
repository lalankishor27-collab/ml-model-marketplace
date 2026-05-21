import React, { useState, useEffect } from 'react';
import { Download, Code, FileDown, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getModels, getExportInfo, downloadModel, getCodeSnippet } from '../api';

export default function ExportPage() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [exportInfo, setExportInfo] = useState(null);
  const [codeSnippet, setCodeSnippet] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await getModels();
      setModels(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleModelSelect = async (modelId) => {
    setSelectedModel(modelId);
    setCodeSnippet(null);
    try {
      const [infoRes, snippetRes] = await Promise.all([
        getExportInfo(modelId),
        getCodeSnippet(modelId),
      ]);
      setExportInfo(infoRes.data);
      setCodeSnippet(snippetRes.data);
    } catch (error) {
      toast.error('Failed to load model info');
    }
  };

  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      const res = await downloadModel(selectedModel, format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportInfo.name.replace(/\s+/g, '_')}.${format === 'pickle' ? 'pkl' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Model downloaded as ${format}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippet?.code_snippet || '');
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Download className="w-8 h-8 text-indigo-600" />
          <span>Export Models</span>
        </h1>
        <p className="text-gray-500 mt-1">Download trained models and get integration code</p>
      </div>

      {/* Model Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Model to Export</label>
        <select
          value={selectedModel || ''}
          onChange={(e) => handleModelSelect(e.target.value)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Choose a model...</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.task_type}) - Session #{m.training_session_id}
            </option>
          ))}
        </select>
      </div>

      {exportInfo && (
        <>
          {/* Model Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600">Model Name</p>
                <p className="font-bold text-blue-900">{exportInfo.name}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600">Task Type</p>
                <p className="font-bold text-purple-900 capitalize">{exportInfo.task_type}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600">File Size</p>
                <p className="font-bold text-green-900">{exportInfo.file_size_mb} MB</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600">Features</p>
                <p className="font-bold text-orange-900">{exportInfo.feature_columns?.length}</p>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FileDown className="w-5 h-5 text-indigo-600" />
              <span>Download Formats</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">Joblib (.joblib)</h3>
                <p className="text-sm text-gray-500 mt-1">Best for Python/scikit-learn apps</p>
                <button
                  onClick={() => handleDownload('joblib')}
                  disabled={downloading}
                  className="mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  Download .joblib
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">Pickle (.pkl)</h3>
                <p className="text-sm text-gray-500 mt-1">Standard Python serialization</p>
                <button
                  onClick={() => handleDownload('pickle')}
                  disabled={downloading}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  Download .pkl
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">ONNX (.onnx)</h3>
                <p className="text-sm text-gray-500 mt-1">Cross-platform ML deployment</p>
                <button
                  onClick={() => handleDownload('onnx')}
                  disabled={downloading}
                  className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  Download .onnx
                </button>
              </div>
            </div>
          </div>

          {/* Code Snippet */}
          {codeSnippet && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Code className="w-5 h-5 text-indigo-600" />
                  <span>Python Code Snippet</span>
                </h2>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {codeSnippet.code_snippet}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

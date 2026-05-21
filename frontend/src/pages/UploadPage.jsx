import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadDataset, getDatasets, deleteDataset, getDataset } from '../api';

export default function UploadPage() {
  const [datasets, setDatasets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await getDatasets();
      setDatasets(res.data);
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadDataset(file);
      toast.success(`Dataset "${file.name}" uploaded successfully!`);
      setPreview(res.data.preview);
      loadDatasets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    handleUpload(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleUpload(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDataset(id);
      toast.success('Dataset deleted');
      loadDatasets();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handlePreview = async (id) => {
    try {
      const res = await getDataset(id);
      setPreview(res.data.preview);
    } catch (error) {
      toast.error('Failed to load preview');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Dataset</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file to start training models</p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors mb-8
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600 mb-2">
          {uploading ? 'Uploading...' : 'Drag & drop your CSV file here'}
        </p>
        <p className="text-sm text-gray-400 mb-4">or</p>
        <label className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors font-medium">
          Browse Files
          <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </label>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dataset Preview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Rows</p>
              <p className="text-xl font-bold text-blue-900">{preview.shape[0]}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600">Columns</p>
              <p className="text-xl font-bold text-purple-900">{preview.shape[1]}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600">Numeric</p>
              <p className="text-xl font-bold text-green-900">{preview.numeric_columns.length}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-orange-600">Categorical</p>
              <p className="text-xl font-bold text-orange-900">{preview.categorical_columns.length}</p>
            </div>
          </div>

          {/* Sample Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {preview.columns.map((col) => (
                    <th key={col} className="text-left py-2 px-3 font-medium text-gray-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample_data.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {preview.columns.map((col) => (
                      <td key={col} className="py-2 px-3 text-gray-700">{String(row[col]).substring(0, 30)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Datasets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Datasets</h2>
        {datasets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No datasets uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {datasets.map((dataset) => (
              <div key={dataset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900">{dataset.filename}</p>
                    <p className="text-xs text-gray-500">
                      {dataset.rows} rows x {dataset.columns} cols
                      {dataset.task_type && ` | ${dataset.task_type}`}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview(dataset.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dataset.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

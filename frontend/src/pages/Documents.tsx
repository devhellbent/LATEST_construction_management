import React, { useState, useEffect } from 'react';
import { Upload, Plus, Filter, FileText } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { documentsAPI } from '../services/api';

interface Document {
  document_id: number;
  project_id: number;
  uploaded_by_user_id: number;
  file_name: string;
  file_type: string;
  version: number;
  upload_date: string;
  file_path: string;
}

const Documents: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [selectedProjectId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (selectedProjectId) {
        response = await documentsAPI.getDocumentsByProject(selectedProjectId);
      } else {
        response = await documentsAPI.getDocuments();
      }
      
      // Backend returns { documents: [...], pagination: {...} }
      const documentsData = Array.isArray(response.data.documents) ? response.data.documents : [];
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('word') || fileType?.includes('doc')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('sheet')) return '📊';
    return '📁';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <button className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="Select a project to filter documents..."
            />
          </div>
        </div>
      </div>
      
      {/* Documents Content */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Upload className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchDocuments}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProjectId ? 'No Documents Found' : 'No Documents Available'}
            </h3>
            <p className="text-gray-600">
              {selectedProjectId 
                ? 'This project doesn\'t have any documents uploaded yet.' 
                : 'No documents have been uploaded yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProjectId ? `Documents for Selected Project` : 'All Documents'} ({documents.length})
              </h3>
            </div>
            
            <div className="grid gap-4">
              {documents.map((document) => (
                <div key={document.document_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileTypeIcon(document.file_type)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{document.file_name}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>Type: {document.file_type}</span>
                            <span>Version: {document.version}</span>
                            <span>Uploaded: {new Date(document.upload_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-primary">Download</button>
                      <button className="btn btn-sm btn-secondary">View</button>
                      <button className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;

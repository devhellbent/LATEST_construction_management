import React, { useState, useEffect } from 'react';
import { Edit, Trash2, X, Eye, AlertTriangle, CheckCircle, Clock, Ban, History, FileText } from 'lucide-react';
import { materialManagementAPI, mrrAPI } from '../services/api';
import MaterialIssueForm from './MaterialIssueForm';
import InventoryHistory from './InventoryHistory';

interface MaterialIssue {
  issue_id: number;
  project_id: number;
  material_id: number;
  mrr_id?: number;
  po_id?: number;
  receipt_id?: number;
  quantity_issued: number;
  issue_date: string;
  issue_purpose: string;
  location: string;
  issued_by_user_id: number;
  received_by_user_id: number;
  created_by: number;
  updated_by: number;
  status: 'PENDING' | 'ISSUED' | 'RECEIVED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  material?: {
    material_id: number;
    name: string;
    type: string;
    unit: string;
  };
  project?: {
    project_id: number;
    name: string;
  };
  mrr?: {
    mrr_id: number;
    mrr_reference_id: string;
  };
  purchase_order?: {
    po_id: number;
    po_reference_id: string;
  };
  receipt?: {
    receipt_id: number;
    receipt_reference_id: string;
  };
  issued_by?: {
    user_id: number;
    name: string;
  };
  received_by?: {
    user_id: number;
    name: string;
  };
  created_by_user?: {
    user_id: number;
    name: string;
  };
  updated_by_user?: {
    user_id: number;
    name: string;
  };
}

interface MaterialIssueManagementProps {
  projectId?: number;
}

const MaterialIssueManagement: React.FC<MaterialIssueManagementProps> = ({ projectId }) => {
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MaterialIssue | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<MaterialIssue | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [selectedMaterialName, setSelectedMaterialName] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  useEffect(() => {
    fetchIssues();
  }, [projectId, pagination.currentPage]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        project_id: projectId,
        page: pagination.currentPage,
        limit: pagination.itemsPerPage
      };

      const response = await materialManagementAPI.getMaterialIssues(params);
      console.log('Material Issues API Response:', response.data);
      setIssues(response.data.issues || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error: any) {
      console.error('Error fetching material issues:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to fetch material issues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = () => {
    setEditingIssue(null);
    setShowForm(true);
  };

  const handleEditIssue = (issue: MaterialIssue) => {
    setEditingIssue(issue);
    setShowForm(true);
  };

  const handleViewIssue = (issue: MaterialIssue) => {
    setSelectedIssue(issue);
    setShowDetails(true);
  };

  const handleViewInventoryHistory = (issue: MaterialIssue) => {
    setSelectedMaterialId(issue.material_id);
    setSelectedMaterialName(issue.material?.name || 'Unknown Material');
    setShowInventoryHistory(true);
  };

  const handleDeleteIssue = async (issue: MaterialIssue) => {
    if (!window.confirm(`Are you sure you want to delete material issue #${issue.issue_id}?`)) {
      return;
    }

    try {
      await materialManagementAPI.deleteMaterialIssue(issue.issue_id);
      await fetchIssues();
    } catch (error: any) {
      console.error('Error deleting material issue:', error);
      setError(error.response?.data?.message || 'Failed to delete material issue');
    }
  };

  const handleCancelIssue = async (issue: MaterialIssue) => {
    if (!window.confirm(`Are you sure you want to cancel material issue #${issue.issue_id}?`)) {
      return;
    }

    try {
      await materialManagementAPI.updateMaterialIssue(issue.issue_id, { status: 'CANCELLED' });
      await fetchIssues();
    } catch (error: any) {
      console.error('Error cancelling material issue:', error);
      setError(error.response?.data?.message || 'Failed to cancel material issue');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingIssue(null);
    fetchIssues();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ISSUED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'RECEIVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <Ban className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ISSUED':
        return 'bg-blue-100 text-blue-800';
      case 'RECEIVED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = (issue: MaterialIssue) => {
    return issue.status === 'PENDING' || issue.status === 'ISSUED';
  };

  const canDelete = (issue: MaterialIssue) => {
    return issue.status === 'PENDING' || issue.status === 'CANCELLED';
  };

  const canCancel = (issue: MaterialIssue) => {
    return issue.status === 'PENDING' || issue.status === 'ISSUED';
  };

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Material Issues</h2>
          <p className="text-gray-600">Manage material issues and track inventory</p>
        </div>
        <button
          onClick={handleCreateIssue}
          className="btn btn-primary"
        >
          + New Material Issue
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Issues Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MRR Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue.issue_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{issue.issue_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.mrr?.mrr_reference_id ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FileText className="h-3 w-3 mr-1" />
                        {issue.mrr.mrr_reference_id}
                      </span>
                    ) : (
                      <span className="text-gray-400">Direct Issue</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.project?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.material?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.quantity_issued} {issue.material?.unit || ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {getStatusIcon(issue.status)}
                      <span className="ml-1">{issue.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.location || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.created_by_user?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(issue.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewIssue(issue)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewInventoryHistory(issue)}
                        className="text-green-600 hover:text-green-900"
                        title="View Inventory History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      {canEdit(issue) && (
                        <button
                          onClick={() => handleEditIssue(issue)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canCancel(issue) && (
                        <button
                          onClick={() => handleCancelIssue(issue)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete(issue) && (
                        <button
                          onClick={() => handleDeleteIssue(issue)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* No Data Message */}
          {!loading && issues.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No material issues</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new material issue.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateIssue}
                  className="btn btn-primary"
                >
                  + New Material Issue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Material Issue Form Modal */}
      {showForm && (
        <MaterialIssueForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingIssue(null);
          }}
          onSuccess={handleFormSuccess}
          editData={editingIssue}
        />
      )}

      {/* Issue Details Modal */}
      {showDetails && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Material Issue Details
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Issue ID</label>
                  <p className="text-sm text-gray-900">#{selectedIssue.issue_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">MRR Reference</label>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.mrr?.mrr_reference_id ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FileText className="h-3 w-3 mr-1" />
                        {selectedIssue.mrr.mrr_reference_id}
                      </span>
                    ) : (
                      <span className="text-gray-400">Direct Issue</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedIssue.status)}`}>
                    {getStatusIcon(selectedIssue.status)}
                    <span className="ml-1">{selectedIssue.status}</span>
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Project</label>
                  <p className="text-sm text-gray-900">{selectedIssue.project?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Material</label>
                  <p className="text-sm text-gray-900">{selectedIssue.material?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity</label>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.quantity_issued} {selectedIssue.material?.unit || ''}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Issued To</label>
                  <p className="text-sm text-gray-900">{selectedIssue.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Issued By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.issued_by?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Received By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.received_by?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.created_by_user?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.updated_by_user?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Issue Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedIssue.issue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm text-gray-900">{new Date(selectedIssue.created_at).toLocaleString()}</p>
                </div>
              </div>
              {selectedIssue.issue_purpose && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Purpose/Remarks</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedIssue.issue_purpose}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory History Modal */}
      {showInventoryHistory && selectedMaterialId && (
        <InventoryHistory
          isOpen={showInventoryHistory}
          onClose={() => {
            setShowInventoryHistory(false);
            setSelectedMaterialId(null);
            setSelectedMaterialName('');
          }}
          materialId={selectedMaterialId}
          materialName={selectedMaterialName}
        />
      )}
    </div>
  );
};

export default MaterialIssueManagement;

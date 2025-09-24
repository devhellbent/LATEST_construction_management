import React, { useState, useEffect } from 'react';
import { X, History, Package, TrendingUp, TrendingDown, Calendar, User, MapPin } from 'lucide-react';
import { commercialAPI } from '../services/api';

interface InventoryHistoryItem {
  history_id: number;
  material_id: number;
  project_id: number;
  transaction_type: 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'PURCHASE' | 'CONSUMPTION';
  transaction_id: number;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_number: string;
  description: string;
  location: string;
  performed_by_user_id: number;
  transaction_date: string;
  material?: {
    material_id: number;
    name: string;
    unit: string;
  };
  performedBy?: {
    user_id: number;
    name: string;
  };
}

interface InventoryHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  materialId?: number;
  projectId?: number;
  materialName?: string;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ 
  isOpen, 
  onClose, 
  materialId, 
  projectId, 
  materialName 
}) => {
  const [history, setHistory] = useState<InventoryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [filters, setFilters] = useState({
    transaction_type: '',
    page: 1
  });

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, materialId, projectId, filters]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        ...filters,
        limit: pagination.itemsPerPage
      };

      let response;
      if (materialId) {
        response = await commercialAPI.getInventoryHistory(materialId, params);
      } else if (projectId) {
        response = await commercialAPI.getProjectInventoryHistory(projectId, params);
      } else {
        throw new Error('Either materialId or projectId must be provided');
      }

      setHistory(response.data.history || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error: any) {
      console.error('Error fetching inventory history:', error);
      setError(error.response?.data?.message || 'Failed to fetch inventory history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'ISSUE':
        return 'bg-red-100 text-red-800';
      case 'RETURN':
        return 'bg-green-100 text-green-800';
      case 'ADJUSTMENT':
        return 'bg-blue-100 text-blue-800';
      case 'PURCHASE':
        return 'bg-purple-100 text-purple-800';
      case 'CONSUMPTION':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ISSUE':
        return <TrendingDown className="h-4 w-4" />;
      case 'RETURN':
        return <TrendingUp className="h-4 w-4" />;
      case 'ADJUSTMENT':
        return <Package className="h-4 w-4" />;
      case 'PURCHASE':
        return <TrendingUp className="h-4 w-4" />;
      case 'CONSUMPTION':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const formatQuantityChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Inventory History
            </h2>
            <p className="text-sm text-gray-600">
              {materialName ? `Material: ${materialName}` : `Project ID: ${projectId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="ISSUE">Issue</option>
                <option value="RETURN">Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="PURCHASE">Purchase</option>
                <option value="CONSUMPTION">Consumption</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* History Table */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Before
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock After
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.history_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(item.transaction_date).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(item.transaction_type)}`}>
                          {getTransactionIcon(item.transaction_type)}
                          <span className="ml-1">{item.transaction_type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.reference_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${item.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatQuantityChange(item.quantity_change)} {item.material?.unit || ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity_before} {item.material?.unit || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity_after} {item.material?.unit || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          {item.performedBy?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {item.description}
                        </div>
                        {item.location && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {item.location}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {history.length === 0 && !loading && (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No inventory history found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
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
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryHistory;

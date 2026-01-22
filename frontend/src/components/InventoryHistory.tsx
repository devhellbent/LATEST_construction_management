import React, { useState, useEffect, useCallback } from 'react';
import { X, History, Package, TrendingUp, TrendingDown, Calendar, User, MapPin, Warehouse } from 'lucide-react';
import { commercialAPI } from '../services/api';

interface InventoryHistoryItem {
  history_id: number;
  material_id: number;
  project_id: number;
  transaction_type: 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'PURCHASE' | 'CONSUMPTION' | 'RESTOCK';
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
    warehouse_id?: number;
    warehouse?: {
      warehouse_id: number;
      warehouse_name: string;
    };
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

  const fetchHistory = useCallback(async () => {
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
    } catch (err: any) {
      console.error('Error fetching inventory history:', err);
      setError(err.response?.data?.message || 'Failed to fetch inventory history');
    } finally {
      setLoading(false);
    }
  }, [materialId, projectId, filters, pagination.itemsPerPage]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

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
      case 'RESTOCK':
        return 'bg-teal-100 text-teal-800';
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
      case 'RESTOCK':
        return <TrendingUp className="h-4 w-4" />;
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
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Inventory History
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {materialName ? `Material: ${materialName}` : `Project ID: ${projectId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 self-end sm:self-auto"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                className="input w-full sm:w-auto"
              >
                <option value="">All Types</option>
                <option value="ISSUE">Issue</option>
                <option value="RETURN">Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="PURCHASE">Purchase</option>
                <option value="CONSUMPTION">Consumption</option>
                <option value="RESTOCK">Restock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-red-700 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* History Table */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center p-6 sm:p-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="text-xs sm:text-sm">
                      Date & Time
                    </th>
                    <th className="text-xs sm:text-sm">
                      Type
                    </th>
                    <th className="text-xs sm:text-sm">
                      Reference
                    </th>
                    <th className="text-xs sm:text-sm">
                      Quantity Change
                    </th>
                    <th className="text-xs sm:text-sm">
                      Stock Before
                    </th>
                    <th className="text-xs sm:text-sm">
                      Stock After
                    </th>
                    <th className="text-xs sm:text-sm hidden lg:table-cell">
                      Warehouse
                    </th>
                    <th className="text-xs sm:text-sm">
                      Performed By
                    </th>
                    <th className="text-xs sm:text-sm">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.history_id} className="hover:bg-gray-50">
                      <td className="text-xs sm:text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{new Date(item.transaction_date).toLocaleString()}</span>
                          <span className="sm:hidden">{new Date(item.transaction_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(item.transaction_type)}`}>
                          {getTransactionIcon(item.transaction_type)}
                          <span className="ml-1 hidden sm:inline">{item.transaction_type}</span>
                          <span className="ml-1 sm:hidden">{item.transaction_type.slice(0, 3)}</span>
                        </span>
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900">
                        <span className="hidden sm:inline">{item.reference_number}</span>
                        <span className="sm:hidden truncate max-w-[80px]">{item.reference_number}</span>
                      </td>
                      <td className="text-xs sm:text-sm">
                        <span className={`font-medium ${item.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatQuantityChange(item.quantity_change)} {item.material?.unit || ''}
                        </span>
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900">
                        {item.quantity_before} {item.material?.unit || ''}
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900">
                        {item.quantity_after} {item.material?.unit || ''}
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                        <div className="flex items-center">
                          <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1 sm:mr-2" />
                          <span>{item.material?.warehouse?.warehouse_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900">
                        <div className="flex items-center">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{item.performedBy?.name || 'Unknown'}</span>
                          <span className="sm:hidden truncate max-w-[60px]">{item.performedBy?.name?.split(' ')[0] || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="text-xs sm:text-sm text-gray-900">
                        <div className="max-w-[120px] sm:max-w-xs truncate">
                          {item.description}
                        </div>
                        {item.location && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[100px] sm:max-w-none">{item.location}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {history.length === 0 && !loading && (
                <div className="text-center py-6 sm:py-8">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base">No inventory history found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-700">
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
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

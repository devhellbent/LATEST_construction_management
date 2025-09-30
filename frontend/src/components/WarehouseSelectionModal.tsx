import React, { useState, useEffect } from 'react';
import { materialManagementAPI } from '../services/api';

interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface WarehouseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWarehouse: (warehouse: Warehouse) => void;
  title?: string;
}

const WarehouseSelectionModal: React.FC<WarehouseSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectWarehouse,
  title = "Select Warehouse"
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
    }
  }, [isOpen]);

  const fetchWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await materialManagementAPI.getMasterData();
      setWarehouses(response.data.warehouses || []);
    } catch (err: any) {
      console.error('Error fetching warehouses:', err);
      setError('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSelect = (warehouse: Warehouse) => {
    onSelectWarehouse(warehouse);
    onClose();
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (warehouse.address && warehouse.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredWarehouses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No warehouses found matching your search.' : 'No warehouses available.'}
                </div>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <div
                    key={warehouse.warehouse_id}
                    onClick={() => handleWarehouseSelect(warehouse)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{warehouse.warehouse_name}</h3>
                        {warehouse.address && (
                          <p className="text-sm text-gray-600 mt-1">{warehouse.address}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {warehouse.contact_person && (
                            <span>Contact: {warehouse.contact_person}</span>
                          )}
                          {warehouse.contact_phone && (
                            <span>Phone: {warehouse.contact_phone}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseSelectionModal;

import React, { useState, useEffect } from 'react';
import { Edit, Package, MapPin, Calendar, User, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { materialsAPI } from '../services/api';
import MaterialForm from './MaterialForm';

interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface Material {
  material_id: number;
  name: string;
  item_id?: number;
  item_code?: string;
  additional_specification?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  type?: string;
  unit?: string;
  cost_per_unit?: number;
  supplier?: string;
  stock_qty: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_point?: number;
  location?: string;
  status?: string;
  project_id?: number;
  warehouse_id?: number;
  created_at?: string;
  updated_at?: string;
  warehouse?: Warehouse;
}

interface MaterialDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: number | null;
  warehouseId?: number;
  onEditSuccess?: () => void;
}

const MaterialDetailsModal: React.FC<MaterialDetailsModalProps> = ({
  isOpen,
  onClose,
  materialId,
  warehouseId,
  onEditSuccess
}) => {
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchMaterialDetails();
    }
  }, [isOpen, materialId]);

  const fetchMaterialDetails = async () => {
    if (!materialId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await materialsAPI.getMaterial(materialId);
      setMaterial(response.data);
    } catch (err: any) {
      console.error('Error fetching material details:', err);
      setError('Failed to fetch material details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchMaterialDetails(); // Refresh the details
    onEditSuccess?.();
  };

  const handleEditClose = () => {
    setShowEditForm(false);
  };

  const getStockStatus = () => {
    if (!material) return { status: 'unknown', color: 'gray', text: 'Unknown' };
    
    const stock = material.stock_qty || 0;
    const minLevel = material.minimum_stock_level || 0;
    
    if (stock <= 0) {
      return { status: 'out', color: 'red', text: 'Out of Stock' };
    } else if (stock <= minLevel) {
      return { status: 'low', color: 'yellow', text: 'Low Stock' };
    } else {
      return { status: 'normal', color: 'green', text: 'Normal' };
    }
  };

  const stockStatus = getStockStatus();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Material Details</h2>
                  {material && (
                    <p className="text-sm text-gray-600">{material.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {material && (
                  <button
                    onClick={handleEditClick}
                    className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
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
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            ) : material ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                      <p className="text-lg font-semibold text-gray-900">{material.name}</p>
                    </div>
                    
                    {material.item_code && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                        <p className="text-gray-900">{material.item_code}</p>
                      </div>
                    )}

                    {material.additional_specification && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                        <p className="text-gray-900">{material.additional_specification}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          stockStatus.color === 'green' ? 'bg-green-500' :
                          stockStatus.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className={`font-medium ${
                          stockStatus.color === 'green' ? 'text-green-700' :
                          stockStatus.color === 'yellow' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                      <p className="text-2xl font-bold text-gray-900">
                        {material.stock_qty} {material.unit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Material Properties */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Properties</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {material.category && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <p className="text-gray-900">{material.category}</p>
                      </div>
                    )}
                    {material.brand && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                        <p className="text-gray-900">{material.brand}</p>
                      </div>
                    )}
                    {material.type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <p className="text-gray-900">{material.type}</p>
                      </div>
                    )}
                    {material.color && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                        <p className="text-gray-900">{material.color}</p>
                      </div>
                    )}
                    {material.size && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                        <p className="text-gray-900">{material.size}</p>
                      </div>
                    )}
                    {material.unit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <p className="text-gray-900">{material.unit}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                      <p className="text-xl font-semibold text-gray-900">{material.stock_qty} {material.unit}</p>
                    </div>
                    {material.minimum_stock_level !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Level</label>
                        <p className="text-gray-900">{material.minimum_stock_level} {material.unit}</p>
                      </div>
                    )}
                    {material.maximum_stock_level !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Level</label>
                        <p className="text-gray-900">{material.maximum_stock_level} {material.unit}</p>
                      </div>
                    )}
                    {material.reorder_point !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                        <p className="text-gray-900">{material.reorder_point} {material.unit}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Information */}
                {material.cost_per_unit && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit</label>
                        <p className="text-xl font-semibold text-gray-900">₹{material.cost_per_unit}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
                        <p className="text-xl font-semibold text-gray-900">
                          ₹{(material.cost_per_unit * material.stock_qty).toLocaleString()}
                        </p>
                      </div>
                      {material.supplier && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                          <p className="text-gray-900">{material.supplier}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {material.warehouse && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <p className="text-gray-900">{material.warehouse.warehouse_name}</p>
                        </div>
                        {material.warehouse.address && (
                          <p className="text-sm text-gray-600 mt-1">{material.warehouse.address}</p>
                        )}
                      </div>
                    )}
                    {material.location && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specific Location</label>
                        <p className="text-gray-900">{material.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Timestamps */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        material.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        material.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {material.status}
                      </span>
                    </div>
                    {material.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                        <p className="text-gray-900">{new Date(material.created_at).toLocaleDateString()}</p>
                      </div>
                    )}
                    {material.updated_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                        <p className="text-gray-900">{new Date(material.updated_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Material Edit Form Modal */}
      <MaterialForm
        isOpen={showEditForm}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        material={material}
      />
    </>
  );
};

export default MaterialDetailsModal;

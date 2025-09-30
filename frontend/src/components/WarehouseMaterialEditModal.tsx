import React, { useState, useEffect } from 'react';
import { materialsAPI } from '../services/api';
import MaterialForm from './MaterialForm';

interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address?: string;
}

interface WarehouseMaterial {
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
}

interface WarehouseMaterialEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedWarehouse: Warehouse | null;
  projectId?: number;
}

const WarehouseMaterialEditModal: React.FC<WarehouseMaterialEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedWarehouse,
  projectId
}) => {
  const [materials, setMaterials] = useState<WarehouseMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<WarehouseMaterial | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && selectedWarehouse) {
      fetchWarehouseMaterials();
    }
  }, [isOpen, selectedWarehouse]);

  const fetchWarehouseMaterials = async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await materialsAPI.getMaterialsByWarehouse(selectedWarehouse.warehouse_id);
      setMaterials(response.data.materials || []);
    } catch (err: any) {
      console.error('Error fetching warehouse materials:', err);
      setError('Failed to fetch materials for this warehouse');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMaterial = (material: WarehouseMaterial) => {
    setSelectedMaterial(material);
    setShowMaterialForm(true);
  };

  const handleMaterialFormSuccess = () => {
    setShowMaterialForm(false);
    setSelectedMaterial(null);
    fetchWarehouseMaterials(); // Refresh the list
    onSuccess();
  };

  const handleMaterialFormClose = () => {
    setShowMaterialForm(false);
    setSelectedMaterial(null);
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (material.item_code && material.item_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (material.category && material.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (material.brand && material.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Materials - {selectedWarehouse?.warehouse_name}
                </h2>
                {selectedWarehouse?.address && (
                  <p className="text-sm text-gray-600 mt-1">{selectedWarehouse.address}</p>
                )}
              </div>
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
                placeholder="Search materials..."
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
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No materials found matching your search.' : 'No materials available in this warehouse.'}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredMaterials.map((material) => (
                      <div
                        key={material.material_id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900">{material.name}</h3>
                              {material.item_code && (
                                <span className="text-sm text-gray-500">({material.item_code})</span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mt-2">
                              {material.category && <span>Category: {material.category}</span>}
                              {material.brand && <span>Brand: {material.brand}</span>}
                              {material.type && <span>Type: {material.type}</span>}
                              {material.color && <span>Color: {material.color}</span>}
                              {material.size && <span>Size: {material.size}</span>}
                              {material.unit && <span>Unit: {material.unit}</span>}
                              {material.stock_qty !== undefined && (
                                <span>Stock: {material.stock_qty} {material.unit}</span>
                              )}
                              {material.cost_per_unit && (
                                <span>Cost: ₹{material.cost_per_unit}</span>
                              )}
                            </div>

                            {material.additional_specification && (
                              <p className="text-sm text-gray-600 mt-2">
                                {material.additional_specification}
                              </p>
                            )}

                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              {material.location && <span>Location: {material.location}</span>}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                material.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                material.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {material.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between">
              <div className="text-sm text-gray-600">
                {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 's' : ''} found
              </div>
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

      {/* Material Form Modal */}
      <MaterialForm
        isOpen={showMaterialForm}
        onClose={handleMaterialFormClose}
        onSuccess={handleMaterialFormSuccess}
        projectId={projectId}
        material={selectedMaterial}
      />
    </>
  );
};

export default WarehouseMaterialEditModal;

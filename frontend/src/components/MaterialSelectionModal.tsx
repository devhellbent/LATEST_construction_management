import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Package, Check } from 'lucide-react';
import { materialsAPI } from '../services/api';

interface Material {
  material_id: number;
  name: string;
  item_code?: string;
  category?: string;
  brand?: string;
  color?: string;
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
}

interface MaterialSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterials: (materials: Material[]) => void;
  selectedProjectId: number | null;
  onShowNewMaterialModal: () => void;
}

const MaterialSelectionModal: React.FC<MaterialSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMaterials,
  selectedProjectId,
  onShowNewMaterialModal
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen, selectedProjectId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: 1,
        limit: 100
      };

      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await materialsAPI.getMaterials(params);
      setMaterials(response.data.materials || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchMaterials();
  };

  const handleMaterialToggle = (materialId: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMaterials.size === materials.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(materials.map(m => m.material_id)));
    }
  };

  const handleConfirmSelection = () => {
    const selected = materials.filter(m => selectedMaterials.has(m.material_id));
    onSelectMaterials(selected);
  };

  const handleClose = () => {
    setSelectedMaterials(new Set());
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Select Materials</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="btn btn-secondary"
              >
                Search
              </button>
              <button
                onClick={onShowNewMaterialModal}
                className="btn btn-primary flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Material
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading materials...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Materials</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button 
                  onClick={fetchMaterials}
                  className="btn btn-secondary"
                >
                  Try Again
                </button>
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'No materials match your search criteria.' : 'No materials available.'}
                </p>
                <button
                  onClick={onShowNewMaterialModal}
                  className="btn btn-primary flex items-center mx-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Material
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      selectedMaterials.size === materials.length 
                        ? 'bg-primary-600 border-primary-600' 
                        : 'border-gray-300'
                    }`}>
                      {selectedMaterials.size === materials.length && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span>
                      {selectedMaterials.size === materials.length ? 'Deselect All' : 'Select All'} 
                      ({selectedMaterials.size}/{materials.length})
                    </span>
                  </button>
                </div>

                {/* Materials List */}
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div
                      key={material.material_id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedMaterials.has(material.material_id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMaterialToggle(material.material_id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                          selectedMaterials.has(material.material_id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedMaterials.has(material.material_id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h4 className="font-medium text-gray-900">{material.name}</h4>
                            {material.item_code && (
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {material.item_code}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            {material.category && <span>Category: {material.category}</span>}
                            {material.brand && <span>Brand: {material.brand}</span>}
                            {material.type && <span>Type: {material.type}</span>}
                            {material.color && <span>Color: {material.color}</span>}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>Unit: {material.unit || 'N/A'}</span>
                            <span>Cost: ₹{material.cost_per_unit || 0}</span>
                            <span>Stock: {material.stock_qty}</span>
                            {material.location && <span>Location: {material.location}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {selectedMaterials.size} material(s) selected
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedMaterials.size === 0}
                className="btn btn-primary"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialSelectionModal;



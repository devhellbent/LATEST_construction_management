import React, { useState, useEffect } from 'react';
import { Package, Plus, Filter, Upload, Search, ChevronDown, Eye, Edit, Trash2, AlertTriangle, History } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import MaterialSelectionModal from '../components/MaterialSelectionModal';
import MaterialForm from '../components/MaterialForm';
import InventoryHistory from '../components/InventoryHistory';
import { materialsAPI, commercialAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

interface Material {
  material_id: number;
  name: string;
  item_code?: string;
  additional_specification?: string;
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

interface FilterOptions {
  categories: string[];
  brands: string[];
  colors: string[];
  types: string[];
}

interface MasterData {
  categories: Array<{ category_id: number; category_name: string }>;
  brands: Array<{ brand_id: number; brand_name: string }>;
  units: Array<{ unit_id: number; unit_name: string; unit_symbol: string }>;
  suppliers: Array<{ supplier_id: number; supplier_name: string }>;
  itemMaster: Array<{ item_id: number; item_code: string; item_name: string; category_id: number; brand_id: number; unit_id: number }>;
}

const CommercialInventory: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [inventoryMaterials, setInventoryMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<Material | null>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { socket } = useSocket();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    brands: [],
    colors: [],
    types: []
  });
  const [masterData, setMasterData] = useState<MasterData | null>(null);

  useEffect(() => {
    fetchInventoryMaterials();
    fetchFilterOptions();
    fetchMasterData();
    fetchRecentHistory();
    fetchRecentActivity();
  }, [selectedProjectId]);

  // Real-time updates for material activities
  useEffect(() => {
    if (socket) {
      const handleMaterialIssue = () => {
        fetchRecentActivity();
        fetchRecentHistory();
        toast.success('New material issue detected');
      };

      const handleMaterialReturn = () => {
        fetchRecentActivity();
        fetchRecentHistory();
        toast.success('New material return detected');
      };


      socket.on('materialIssue', handleMaterialIssue);
      socket.on('materialReturn', handleMaterialReturn);

      return () => {
        socket.off('materialIssue', handleMaterialIssue);
        socket.off('materialReturn', handleMaterialReturn);
      };
    }
  }, [socket]);

  const fetchMasterData = async () => {
    try {
      const response = await materialsAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchInventoryMaterials = async () => {
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

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedBrand) params.brand = selectedBrand;
      if (selectedColor) params.color = selectedColor;
      if (selectedType) params.type = selectedType;

      const response = await materialsAPI.getMaterials(params);
      setInventoryMaterials(response.data.materials || []);
    } catch (err) {
      console.error('Error fetching inventory materials:', err);
      setError('Failed to load inventory materials');
      setInventoryMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await materialsAPI.getFilterOptions();
      setFilterOptions(response.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleSelectMaterials = (materials: Material[]) => {
    // Handle selected materials from modal
    console.log('Selected materials:', materials);
    setShowMaterialModal(false);
    fetchInventoryMaterials(); // Refresh the list
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setShowNewMaterialModal(true);
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await materialsAPI.deleteMaterial(materialId);
      toast.success('Material deleted successfully');
      fetchInventoryMaterials();
    } catch (err) {
      console.error('Error deleting material:', err);
      toast.error('Failed to delete material');
    }
  };

  const handleMaterialFormSubmit = () => {
    setShowNewMaterialModal(false);
    setEditingMaterial(null);
    fetchInventoryMaterials();
  };

  const handleViewHistory = (material: Material) => {
    setSelectedMaterialForHistory(material);
    setShowHistoryModal(true);
  };

  const fetchRecentHistory = async () => {
    try {
      setHistoryLoading(true);
      const params = {
        limit: 10,
        page: 1
      };
      
      let response;
      if (selectedProjectId) {
        response = await commercialAPI.getProjectInventoryHistory(selectedProjectId, params);
      } else {
        // For now, we'll show empty state if no project is selected
        // In the future, we could show global history
        setRecentHistory([]);
        return;
      }

      setRecentHistory(response.data.history || []);
    } catch (error: any) {
      console.error('Error fetching recent history:', error);
      setRecentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await commercialAPI.getRecentActivity({ 
        project_id: selectedProjectId,
        limit: 10 
      });
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedColor('');
    setSelectedType('');
  };

  const applyFilters = () => {
    fetchInventoryMaterials();
  };

  const getStockStatus = (material: Material) => {
    if (!material.minimum_stock_level || !material.reorder_point) return 'normal';
    
    if (material.stock_qty <= material.reorder_point) return 'critical';
    if (material.stock_qty <= material.minimum_stock_level) return 'low';
    return 'normal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'low': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Critical';
      case 'low': return 'Low';
      default: return 'Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-primary-500">
            <Package className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Inventory</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Material Issue</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Material Return</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Petty Cash</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Consumptions</span>
          </div>
        </nav>
      </div>

      {/* Main Layout with Left Sidebar, Content, and Right Sidebar */}
      <div className="flex space-x-6">
        {/* Left Sidebar Navigation */}
        <div className="w-64 space-y-2">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 px-3 py-2">All Materials</div>
            <div className="text-sm font-medium text-gray-900 px-3 py-2">Grouped Materials</div>
            <div className="text-sm font-medium text-gray-900 px-3 py-2">Inventories by Project</div>
          </div>
          
          {/* Project Selector */}
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2 px-3">Project Selection</div>
            <div className="px-3">
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onProjectChange={handleProjectChange}
                className="w-full"
                placeholder="Select project..."
              />
            </div>
            {selectedProjectId && (
              <div className="mt-2 px-3 py-2 bg-primary-50 rounded-lg flex items-center">
                <Package className="h-4 w-4 text-primary-600 mr-2" />
                <span className="text-sm text-primary-700 font-medium">Project Inventory</span>
                <span className="ml-auto text-primary-600">✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Project Inventory</h1>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowMaterialModal(true)}
                className="btn btn-secondary flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Material
              </button>
              <button className="btn btn-primary flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Import Excel
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card p-6 mb-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Categories</option>
                    {masterData?.categories.map((category) => (
                      <option key={category.category_id} value={category.category_name}>{category.category_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Brands</option>
                    {masterData?.brands.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_name}>{brand.brand_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Colors</option>
                    {filterOptions.colors.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Types</option>
                    {filterOptions.types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="btn btn-primary flex items-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>


          {/* Materials Content */}
          <div className="card p-6">
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
                  onClick={fetchInventoryMaterials}
                  className="btn btn-secondary"
                >
                  Try Again
                </button>
              </div>
            ) : inventoryMaterials.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Add Materials to manage your inventory.
                </h3>
                <div className="flex justify-center space-x-4 mt-6">
                  <button 
                    onClick={() => setShowMaterialModal(true)}
                    className="btn btn-secondary flex items-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Material
                  </button>
                  <button className="btn btn-primary flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Import Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedProjectId ? `Materials for Selected Project` : 'All Materials'} ({inventoryMaterials.length})
                  </h3>
                </div>
                
                <div className="grid gap-4">
                  {inventoryMaterials.map((material) => {
                    const stockStatus = getStockStatus(material);
                    return (
                      <div key={material.material_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-gray-900">{material.name}</h4>
                              {material.item_code && (
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {material.item_code}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${getStockStatusColor(stockStatus)}`}>
                                {getStockStatusText(stockStatus)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                              {material.category && <span>Category: {material.category}</span>}
                              {material.brand && <span>Brand: {material.brand}</span>}
                              {material.type && <span>Type: {material.type}</span>}
                              {material.color && <span>Color: {material.color}</span>}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Unit: {material.unit || 'N/A'}</span>
                              <span>Cost: ₹{material.cost_per_unit || 0}</span>
                              <span>Stock: {material.stock_qty}</span>
                              {material.minimum_stock_level && (
                                <span>Min: {material.minimum_stock_level}</span>
                              )}
                              {material.location && <span>Location: {material.location}</span>}
                              {material.supplier && <span>Supplier: {material.supplier}</span>}
                            </div>
                            
                            {material.additional_specification && (
                              <p className="text-sm text-gray-500 mt-2">{material.additional_specification}</p>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleViewHistory(material)}
                              className="btn btn-sm btn-outline flex items-center"
                              title="View Inventory History"
                            >
                              <History className="h-4 w-4 mr-1" />
                              History
                            </button>
                            <button 
                              onClick={() => handleEditMaterial(material)}
                              className="btn btn-sm btn-secondary flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteMaterial(material.material_id)}
                              className="btn btn-sm btn-danger flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Recent Activity */}
        {selectedProjectId && (
          <div className="w-80">
            <div className="card p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <History className="h-5 w-5 mr-2 text-primary-600" />
                  Recent Activity
                </h3>
                <button
                  onClick={() => {
                    fetchRecentHistory();
                    fetchRecentActivity();
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Refresh
                </button>
              </div>
              
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading recent activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent activity found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivity.map((activity) => (
                    <div key={`${activity.type}-${activity.id}`} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          activity.type === 'ISSUE' ? 'bg-red-500' :
                          activity.type === 'TRANSFER' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.material?.name || 'Unknown Material'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Material Issued • {new Date(activity.date).toLocaleDateString()}
                          </p>
                          <div className="mt-1">
                            <p className="text-sm font-medium text-gray-700">
                              {activity.quantity} {activity.material?.unit || ''}
                            </p>
                            {activity.type === 'ISSUE' ? (
                              <p className="text-xs text-gray-500">
                                Project: {activity.project?.name} • By: {activity.user?.name}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">
                                From: {activity.from_project?.name} → To: {activity.to_project?.name}
                              </p>
                            )}
                            {activity.description && (
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'APPROVED' || activity.status === 'ISSUED' ? 'bg-green-100 text-green-800' :
                          activity.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Material Selection Modal */}
      <MaterialSelectionModal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        onSelectMaterials={handleSelectMaterials}
        selectedProjectId={selectedProjectId}
        onShowNewMaterialModal={() => setShowNewMaterialModal(true)}
      />

      {/* Material Form Modal */}
      <MaterialForm
        isOpen={showNewMaterialModal}
        onClose={() => {
          setShowNewMaterialModal(false);
          setEditingMaterial(null);
        }}
        onSuccess={handleMaterialFormSubmit}
        projectId={selectedProjectId || undefined}
        material={editingMaterial}
      />

      {/* Inventory History Modal */}
      <InventoryHistory
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedMaterialForHistory(null);
        }}
        materialId={selectedMaterialForHistory?.material_id}
        projectId={selectedProjectId || undefined}
        materialName={selectedMaterialForHistory?.name}
      />
    </div>
  );
};

export default CommercialInventory;
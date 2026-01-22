import React, { useState, useEffect } from 'react';
import { 
  materialManagementAPI, 
  projectsAPI,
  materialsAPI,
  commercialAPI
} from '../services/api';
import MaterialDetailsModal from '../components/MaterialDetailsModal';
import MaterialForm from '../components/MaterialForm';
import InventoryHistory from '../components/InventoryHistory';
import WarehouseSelectionModal from '../components/WarehouseSelectionModal';
import WarehouseMaterialEditModal from '../components/WarehouseMaterialEditModal';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Package, 
  History, 
  Plus, 
  Search, 
  Filter, 
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Calendar,
  User,
  RefreshCw,
  ShoppingCart,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Upload,
  ChevronDown
} from 'lucide-react';

interface InventoryItem {
  material_id: number;
  name: string;
  category: string;
  brand: string;
  size?: string;
  unit: string;
  stock_qty: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_point?: number;
  updated_at: string;
  project_id?: number;
  warehouse_id?: number;
  project?: {
    project_id: number;
    name: string;
  };
  warehouse?: {
    warehouse_id: number;
    warehouse_name: string;
    address: string;
  };
  item?: {
    item_id: number;
    item_code: string;
    item_name: string;
    category: {
      category_name: string;
    };
    brand: {
      brand_name: string;
    };
    unit: {
      unit_name: string;
      unit_symbol: string;
    };
  };
}

interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface MasterData {
  categories: any[];
  brands: any[];
  units: any[];
  suppliers: any[];
  itemMaster: any[];
  warehouses: Warehouse[];
}

interface InventoryHistoryRecord {
  history_id: number;
  material_id: number;
  project_id?: number;
  transaction_type: string;
  transaction_id?: number;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_number?: string;
  description?: string;
  location?: string;
  transaction_date: string;
  material?: {
    material_id: number;
    name: string;
    type: string;
    unit: string;
    warehouse_id?: number;
    warehouse?: {
      warehouse_id: number;
      warehouse_name: string;
    };
  };
  project?: {
    project_id: number;
    name: string;
  };
  performedBy?: {
    user_id: number;
    name: string;
  };
}

const InventoryManagement: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistoryRecord[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterWarehouse, setFilterWarehouse] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Material details modal state
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  
  // Additional modals and states from CommercialInventory
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Warehouse editing states
  const [showWarehouseSelectionModal, setShowWarehouseSelectionModal] = useState(false);
  const [showWarehouseMaterialEditModal, setShowWarehouseMaterialEditModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  
  // Socket integration
  const { socket } = useSocket();
  
  // Auth - check if user is Admin
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || (typeof user?.role === 'object' && user?.role?.name === 'Admin');
  
  // Low stock materials state
  const [lowStockMaterials, setLowStockMaterials] = useState<InventoryItem[]>([]);

  useEffect(() => {
    loadData();
  }, [filterProject, filterCategory, filterWarehouse, searchTerm, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, historyRes, projectsRes, masterDataRes] = await Promise.all([
        materialManagementAPI.getInventory({
          project_id: filterProject || undefined,
          warehouse_id: filterWarehouse || undefined,
          category: filterCategory || undefined,
          search: searchTerm || undefined
        }),
        materialManagementAPI.getInventoryHistory({
          project_id: filterProject || undefined,
          limit: 50
        }),
        projectsAPI.getProjects(),
        materialManagementAPI.getMasterData()
      ]);

      setInventoryItems(inventoryRes.data.materials || []);
      setInventoryHistory(historyRes.data.history || []);
      console.log('Inventory History API Response:', historyRes.data);
      setProjects(projectsRes.data.projects || []);
      console.log('Master data received:', masterDataRes.data);
      setMasterData(masterDataRes.data);
      
      // Load low stock materials when on low-stock tab
      if (activeTab === 'low-stock' || activeTab === 'history') {
        await loadRestockingData();
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      // Set default empty master data to prevent undefined errors
      setMasterData({
        categories: [],
        brands: [],
        units: [],
        suppliers: [],
        itemMaster: [],
        warehouses: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRestockingData = async () => {
    try {
      const lowStockRes = await materialManagementAPI.getLowStockMaterials(filterProject || undefined);
      setLowStockMaterials(lowStockRes.data.lowStockMaterials || []);
    } catch (error) {
      console.error('Error loading low stock materials:', error);
      setLowStockMaterials([]);
    }
  };

  const getStockStatus = (current: number, minimum: number, maximum: number) => {
    if (current <= minimum) return { status: 'LOW', color: 'bg-red-100 text-red-800' };
    if (current >= maximum) return { status: 'HIGH', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'NORMAL', color: 'bg-green-100 text-green-800' };
  };

  const getStockStatusForRestock = (material: InventoryItem) => {
    if (material.stock_qty <= material.minimum_stock_level) {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (material.stock_qty <= material.reorder_point) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    }
    return { status: 'normal', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const handleMaterialClick = (materialId: number) => {
    setSelectedMaterialId(materialId);
    setShowMaterialDetails(true);
  };

  const handleMaterialDetailsClose = () => {
    setShowMaterialDetails(false);
    setSelectedMaterialId(null);
  };

  const handleMaterialEditSuccess = () => {
    // Refresh the inventory data after material edit
    loadData();
  };

  // Additional handlers from CommercialInventory

  const handleDeleteMaterial = async (materialId: number) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      await materialsAPI.deleteMaterial(materialId);
      toast.success('Material deleted successfully');
      loadData();
    } catch (err) {
      console.error('Error deleting material:', err);
      toast.error('Failed to delete material');
    }
  };

  const handleMaterialFormSubmit = () => {
    setShowNewMaterialModal(false);
    setEditingMaterial(null);
    loadData();
  };

  const handleViewHistory = (material: any) => {
    setSelectedMaterialForHistory(material);
    setShowHistoryModal(true);
  };

  const handleEditMaterialsByWarehouse = () => {
    setShowWarehouseSelectionModal(true);
  };

  const handleWarehouseSelect = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setShowWarehouseSelectionModal(false);
    setShowWarehouseMaterialEditModal(true);
  };

  const handleWarehouseMaterialEditSuccess = () => {
    setShowWarehouseMaterialEditModal(false);
    setSelectedWarehouse(null);
    loadData(); // Refresh the main inventory list
  };

  const handleWarehouseMaterialEditClose = () => {
    setShowWarehouseMaterialEditModal(false);
    setSelectedWarehouse(null);
  };

  const fetchRecentHistory = async () => {
    try {
      setHistoryLoading(true);
      const params = {
        limit: 10,
        page: 1
      };
      
      let response;
      if (filterProject) {
        response = await commercialAPI.getProjectInventoryHistory(filterProject, params);
      } else {
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
        project_id: filterProject,
        limit: 10 
      });
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE': return 'text-success-600';
      case 'ISSUE': return 'text-danger-600';
      case 'RETURN': return 'text-primary-600';
      case 'TRANSFER': return 'text-secondary-600';
      case 'ADJUSTMENT': return 'text-warning-600';
      default: return 'text-slate-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <TrendingUp className="h-4 w-4" />;
      case 'ISSUE': return <TrendingDown className="h-4 w-4" />;
      case 'RETURN': return <ArrowUpDown className="h-4 w-4" />;
      case 'TRANSFER': return <ArrowUpDown className="h-4 w-4" />;
      case 'ADJUSTMENT': return <Minus className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Create PO for restock function
  const createPOForRestock = (material: InventoryItem) => {
    // Navigate to create PO page with material pre-filled
    const mrrData = {
      items: [{
        item_id: material.item?.item_id || material.material_id,
        item_name: material.name,
        item_code: material.item?.item_code || '',
        quantity_requested: Math.max(material.minimum_stock_level - material.stock_qty, 10),
        unit_id: 1, // Default unit ID since unit_id is not available in the interface
        unit_name: material.unit || material.item?.unit?.unit_name || '',
        specifications: `Restock for ${material.name} - Current stock: ${material.stock_qty}, Minimum: ${material.minimum_stock_level}`,
        project_id: material.project_id || null
      }],
      project_id: material.project_id || null,
      required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      purpose: `Restock ${material.name} - Low stock alert`,
      priority: 'HIGH'
    };
    
    // Store the MRR data in sessionStorage to pass to CreatePurchaseOrder
    sessionStorage.setItem('restockMrrData', JSON.stringify(mrrData));
    
    // Navigate to create PO page
    window.location.href = '/create-purchase-order?restock=true';
  };

  const handleSettleStock = async (item: InventoryItem) => {
    // Check if user is Admin
    if (!isAdmin) {
      toast.error('Access denied. Only Admin users can perform stock settlement.');
      return;
    }

    const current = item.stock_qty;
    const input = window.prompt(
      `Enter physical counted quantity for "${item.name}" (current: ${current} ${item.unit || ''}):`,
      String(current)
    );
    if (input === null) return;

    const newQty = parseFloat(input);
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }

    const reason = window.prompt('Reason for stock settlement (optional):', '');

    try {
      await materialManagementAPI.settleMaterialStock(item.material_id, {
        new_quantity: newQty,
        reason: reason || undefined,
        warehouse_id: item.warehouse_id,
      });
      toast.success('Stock settled successfully');
      loadData();
    } catch (error: any) {
      console.error('Error settling stock:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Only Admin users can perform stock settlement.');
      } else {
        toast.error('Failed to settle stock');
      }
    }
  };


  if (loading && inventoryItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <p className="text-slate-600 font-medium ml-4">Loading inventory data...</p>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-responsive-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-responsive-base text-slate-600 mt-2">Monitor stock levels, track movements, and manage inventory</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowNewMaterialModal(true)}
            className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Add Material</span>
          </button>
          <button 
            onClick={handleEditMaterialsByWarehouse}
            className="btn btn-outline flex items-center w-full sm:w-auto"
          >
            <Edit className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Edit by Warehouse</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card-mobile">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Inventory Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>History</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'low-stock'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Low Stock</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="card-mobile">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Filters</h3>
            <p className="text-slate-600 text-xs sm:text-sm">Filter inventory items by various criteria</p>
          </div>
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <label className="label">Search Material</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by material name..."
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label">Filter by Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(parseInt(e.target.value))}
              className="input"
            >
              <option value={0}>All Projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Filter by Warehouse</label>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(parseInt(e.target.value))}
              className="input"
            >
              <option value={0}>All Warehouses</option>
              {masterData?.warehouses?.map((warehouse) => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {masterData?.categories?.map((category) => (
                <option key={category.category_id} value={category.category_name}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Inventory Items</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Current stock levels and material information</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            {inventoryItems.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Package className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Inventory Items Found</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No inventory items match your current filters. Try adjusting your search criteria or add new materials.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-xs sm:text-sm">Material</th>
                      <th className="text-xs sm:text-sm hidden sm:table-cell">Category</th>
                      <th className="text-xs sm:text-sm hidden lg:table-cell">Size</th>
                      <th className="text-xs sm:text-sm">Current Stock</th>
                      <th className="text-xs sm:text-sm hidden md:table-cell">Min Level</th>
                      <th className="text-xs sm:text-sm">Status</th>
                      <th className="text-xs sm:text-sm hidden lg:table-cell">Project</th>
                      <th className="text-xs sm:text-sm hidden xl:table-cell">Warehouse</th>
                      <th className="text-xs sm:text-sm hidden xl:table-cell">Last Updated</th>
                      <th className="text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => {
                      const stockStatus = getStockStatus(item.stock_qty, item.minimum_stock_level, item.maximum_stock_level);
                      return (
                        <tr key={item.material_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="text-xs sm:text-sm">
                            <div>
                              <button
                                onClick={() => handleMaterialClick(item.material_id)}
                                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                              >
                                {item.name}
                              </button>
                              <div className="text-xs text-slate-500">{item.item?.item_code || 'N/A'}</div>
                              <div className="sm:hidden text-xs text-slate-500 mt-1">
                                {item.category} • {item.stock_qty} {item.unit}
                              </div>
                            </div>
                          </td>
                          <td className="text-xs sm:text-sm text-slate-900 hidden sm:table-cell">{item.category}</td>
                          <td className="text-xs sm:text-sm text-slate-900 hidden lg:table-cell">{item.size || 'N/A'}</td>
                          <td className="text-xs sm:text-sm font-semibold text-slate-900">
                            <span className="hidden sm:inline">{item.stock_qty} {item.unit}</span>
                          </td>
                          <td className="text-xs sm:text-sm text-slate-900 hidden md:table-cell">{item.minimum_stock_level} {item.unit}</td>
                          <td>
                            <span className={`status-badge text-xs ${
                              stockStatus.status === 'LOW' ? 'status-danger' : 
                              stockStatus.status === 'HIGH' ? 'status-warning' : 'status-success'
                            }`}>
                              {stockStatus.status}
                            </span>
                          </td>
                          <td className="text-xs sm:text-sm text-slate-900 hidden lg:table-cell">{item.project?.name || 'General'}</td>
                          <td className="text-xs sm:text-sm text-slate-900 hidden xl:table-cell">{item.warehouse?.warehouse_name || 'N/A'}</td>
                          <td className="text-xs sm:text-sm text-slate-500 hidden xl:table-cell">
                            {new Date(item.updated_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex space-x-1 sm:space-x-2">
                              <button
                                onClick={() => handleViewHistory(item)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="View History"
                              >
                                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleSettleStock(item)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="Settle Stock to Physical Count (Admin Only)"
                                >
                                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMaterial(item.material_id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete Material"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Inventory History</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Track all inventory movements and transactions</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            {inventoryHistory.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <History className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Inventory History</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No inventory movements have been recorded yet. History will appear here once transactions are made.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {inventoryHistory.map((history) => (
                  <div key={history.history_id} className="card-mobile">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          {getTransactionIcon(history.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">{history.material?.name || 'Unknown Material'}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-slate-600 space-y-1 sm:space-y-0">
                            <span className={`font-semibold ${getTransactionTypeColor(history.transaction_type)}`}>
                              {history.transaction_type}
                            </span>
                            <span>Qty: {history.quantity_change > 0 ? '+' : ''}{history.quantity_change}</span>
                            <span>Before: {history.quantity_before}</span>
                            <span>After: {history.quantity_after}</span>
                            <span>Date: {new Date(history.transaction_date).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2 text-xs sm:text-sm text-slate-500">
                            <span>Ref: {history.reference_number}</span>
                            {history.description && (
                              <span className="ml-2 sm:ml-4">Desc: {history.description}</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-2 sm:gap-4">
                            <span>By: {history.performedBy?.name || 'System'}</span>
                            {history.material?.warehouse && (
                              <span className="flex items-center text-blue-600">
                                <Package className="h-3 w-3 mr-1" />
                                {history.material.warehouse.warehouse_name}
                              </span>
                            )}
                            {history.location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {history.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Tab */}
      {activeTab === 'low-stock' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Low Stock Materials</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Materials that need restocking based on minimum stock levels</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-warning-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning-600" />
              </div>
            </div>
            
            {lowStockMaterials.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-success-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">All Materials Adequately Stocked</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  Great news! All materials are currently above their minimum stock levels. No restocking is needed at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {lowStockMaterials.map((material) => {
                  const stockStatus = getStockStatusForRestock(material);
                  return (
                    <div key={material.material_id} className={`card-mobile ${stockStatus.bgColor} border-2`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">{material.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-slate-600 space-y-1 sm:space-y-0">
                              <span>Current: {material.stock_qty} {material.unit || material.item?.unit?.unit_symbol}</span>
                              <span>Minimum: {material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                              <span>Reorder: {material.reorder_point || material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                            </div>
                            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <span className={`status-badge text-xs ${
                                stockStatus.status === 'critical' ? 'status-danger' : 'status-warning'
                              }`}>
                                {stockStatus.status.toUpperCase()}
                              </span>
                              {material.warehouse && (
                                <span className="text-xs text-slate-500 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {material.warehouse.warehouse_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <button
                            onClick={() => createPOForRestock(material)}
                            className="btn btn-success flex items-center w-full sm:w-auto"
                          >
                            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">PO for Restock</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Material Details Modal */}
      <MaterialDetailsModal
        isOpen={showMaterialDetails}
        onClose={handleMaterialDetailsClose}
        materialId={selectedMaterialId}
        onEditSuccess={handleMaterialEditSuccess}
      />


      {/* Material Form Modal */}
      <MaterialForm
        isOpen={showNewMaterialModal}
        onClose={() => {
          setShowNewMaterialModal(false);
          setEditingMaterial(null);
        }}
        onSuccess={handleMaterialFormSubmit}
        projectId={filterProject || undefined}
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
        projectId={filterProject || undefined}
        materialName={selectedMaterialForHistory?.name}
      />

      {/* Warehouse Selection Modal */}
      <WarehouseSelectionModal
        isOpen={showWarehouseSelectionModal}
        onClose={() => setShowWarehouseSelectionModal(false)}
        onSelectWarehouse={handleWarehouseSelect}
        title="Select Warehouse to Edit Materials"
      />

      {/* Warehouse Material Edit Modal */}
      <WarehouseMaterialEditModal
        isOpen={showWarehouseMaterialEditModal}
        onClose={handleWarehouseMaterialEditClose}
        onSuccess={handleWarehouseMaterialEditSuccess}
        selectedWarehouse={selectedWarehouse}
        projectId={filterProject || undefined}
      />
    </div>
  );
};

export default InventoryManagement;
import React, { useState, useEffect } from 'react';
import { 
  materialManagementAPI, 
  projectsAPI 
} from '../services/api';
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
  Clock
} from 'lucide-react';

interface InventoryItem {
  material_id: number;
  name: string;
  category: string;
  brand: string;
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

interface InventoryHistory {
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
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistory[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterWarehouse, setFilterWarehouse] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Low stock materials state
  const [lowStockMaterials, setLowStockMaterials] = useState<InventoryItem[]>([]);
  const [addFormData, setAddFormData] = useState({
    item_id: '',
    name: '',
    item_code: '',
    additional_specification: '',
    category: '',
    brand: '',
    color: '',
    type: '',
    unit: '',
    cost_per_unit: '',
    supplier: '',
    stock_qty: '',
    minimum_stock_level: '',
    maximum_stock_level: '',
    reorder_point: '',
    location: '',
    warehouse_id: '',
    status: 'ACTIVE'
  });

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

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const materialData = {
        ...addFormData,
        item_id: addFormData.item_id ? parseInt(addFormData.item_id) : null,
        cost_per_unit: parseFloat(addFormData.cost_per_unit) || 0,
        stock_qty: parseInt(addFormData.stock_qty) || 0,
        minimum_stock_level: parseInt(addFormData.minimum_stock_level) || 0,
        maximum_stock_level: parseInt(addFormData.maximum_stock_level) || 1000,
        reorder_point: parseInt(addFormData.reorder_point) || parseInt(addFormData.minimum_stock_level) || 0,
        warehouse_id: addFormData.warehouse_id ? parseInt(addFormData.warehouse_id) : null,
        project_id: filterProject || null
      };

      await materialManagementAPI.createMaterial(materialData);
      alert('Material added successfully!');
      setShowAddForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAddFormData({
      item_id: '',
      name: '',
      item_code: '',
      additional_specification: '',
      category: '',
      brand: '',
      color: '',
      type: '',
      unit: '',
      cost_per_unit: '',
      supplier: '',
      stock_qty: '',
      minimum_stock_level: '',
      maximum_stock_level: '',
      reorder_point: '',
      location: '',
      warehouse_id: '',
      status: 'ACTIVE'
    });
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-lg text-slate-600 mt-2">Monitor stock levels, track movements, and manage inventory</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Material
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="card p-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Inventory Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === 'low-stock'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Low Stock</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Filters</h3>
            <p className="text-slate-600 text-sm">Filter inventory items by various criteria</p>
          </div>
          <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Filter className="h-5 w-5 text-primary-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Inventory Items</h2>
                <p className="text-slate-600 mt-1">Current stock levels and material information</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            {inventoryItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Inventory Items Found</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  No inventory items match your current filters. Try adjusting your search criteria or add new materials.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Material</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Min Level</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Warehouse</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => {
                      const stockStatus = getStockStatus(item.stock_qty, item.minimum_stock_level, item.maximum_stock_level);
                      return (
                        <tr key={item.material_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                              <div className="text-sm text-slate-500">{item.item?.item_code || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{item.stock_qty} {item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.minimum_stock_level} {item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${
                              stockStatus.status === 'LOW' ? 'status-danger' : 
                              stockStatus.status === 'HIGH' ? 'status-warning' : 'status-success'
                            }`}>
                              {stockStatus.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.project?.name || 'General'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.warehouse?.warehouse_name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(item.updated_at).toLocaleDateString()}
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
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Inventory History</h2>
                <p className="text-slate-600 mt-1">Track all inventory movements and transactions</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <History className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            {inventoryHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <History className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Inventory History</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  No inventory movements have been recorded yet. History will appear here once transactions are made.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventoryHistory.map((history) => (
                  <div key={history.history_id} className="card p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                          {getTransactionIcon(history.transaction_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{history.material?.name || 'Unknown Material'}</h4>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                            <span className={`font-semibold ${getTransactionTypeColor(history.transaction_type)}`}>
                              {history.transaction_type}
                            </span>
                            <span>Quantity: {history.quantity_change > 0 ? '+' : ''}{history.quantity_change}</span>
                            <span>Before: {history.quantity_before}</span>
                            <span>After: {history.quantity_after}</span>
                            <span>Date: {new Date(history.transaction_date).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-500">
                            <span>Reference: {history.reference_number}</span>
                            {history.description && (
                              <span className="ml-4">Description: {history.description}</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            <span>By: {history.performedBy?.name || 'System'}</span>
                            {history.location && (
                              <span className="ml-4 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                Location: {history.location}
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
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Low Stock Materials</h2>
                <p className="text-slate-600 mt-1">Materials that need restocking based on minimum stock levels</p>
              </div>
              <div className="h-12 w-12 bg-warning-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
              </div>
            </div>
            
            {lowStockMaterials.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-success-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">All Materials Adequately Stocked</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Great news! All materials are currently above their minimum stock levels. No restocking is needed at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockMaterials.map((material) => {
                  const stockStatus = getStockStatusForRestock(material);
                  return (
                    <div key={material.material_id} className={`card p-6 ${stockStatus.bgColor} border-2`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center shadow-lg">
                            <AlertTriangle className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900">{material.name}</h4>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                              <span>Current: {material.stock_qty} {material.unit || material.item?.unit?.unit_symbol}</span>
                              <span>Minimum: {material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                              <span>Reorder Point: {material.reorder_point || material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                            </div>
                            <div className="mt-2 flex items-center space-x-4">
                              <span className={`status-badge ${
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => createPOForRestock(material)}
                            className="btn btn-success flex items-center"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            PO for Restock
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

      {/* Add Material Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          {!masterData ? (
            <div className="modal-content animate-scale-in w-full max-w-md">
              <div className="flex items-center justify-center p-8">
                <div className="loading-spinner h-8 w-8"></div>
                <span className="ml-3 text-slate-600 font-medium">Loading form data...</span>
              </div>
            </div>
          ) : (
          <div className="modal-content animate-scale-in w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add New Material</h2>
                <p className="text-sm text-slate-600 mt-1">Add a new material to your inventory</p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial}>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Basic Information</h3>
                    
                    <div>
                      <label className="label label-required">Select Material from Master Data</label>
                      <select
                        value={addFormData.item_id}
                        onChange={(e) => {
                          const selectedItem = masterData?.itemMaster?.find(item => item.item_id === parseInt(e.target.value));
                          setAddFormData({
                            ...addFormData, 
                            item_id: e.target.value,
                            name: selectedItem?.item_name || '',
                            item_code: selectedItem?.item_code || '',
                            category: selectedItem?.category_id ? masterData?.categories?.find(cat => cat.category_id === selectedItem.category_id)?.category_name || '' : '',
                            brand: selectedItem?.brand_id ? masterData?.brands?.find(brand => brand.brand_id === selectedItem.brand_id)?.brand_name || '' : '',
                            unit: selectedItem?.unit_id ? masterData?.units?.find(unit => unit.unit_id === selectedItem.unit_id)?.unit_name || '' : ''
                          });
                        }}
                        className="input"
                        required
                      >
                        <option value="">Select Material from Master Data</option>
                        {masterData?.itemMaster?.map((item) => (
                          <option key={item.item_id} value={item.item_id}>
                            {item.item_name} ({item.item_code})
                          </option>
                        )) || []}
                      </select>
                    </div>
                  
                    <div>
                      <label className="label label-required">Material Name</label>
                      <input
                        type="text"
                        value={addFormData.name}
                        onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                        className={`input ${addFormData.item_id ? 'bg-slate-100' : ''}`}
                        placeholder="Enter material name"
                        required
                        readOnly={addFormData.item_id ? true : false}
                      />
                    </div>

                    <div>
                      <label className="label">Item Code</label>
                      <input
                        type="text"
                        value={addFormData.item_code}
                        onChange={(e) => setAddFormData({...addFormData, item_code: e.target.value})}
                        className={`input ${addFormData.item_id ? 'bg-slate-100' : ''}`}
                        placeholder="Enter item code"
                        readOnly={addFormData.item_id ? true : false}
                      />
                    </div>

                    <div>
                      <label className="label">Category</label>
                      <input
                        type="text"
                        value={addFormData.category}
                        onChange={(e) => setAddFormData({...addFormData, category: e.target.value})}
                        className={`input ${addFormData.item_id ? 'bg-slate-100' : ''}`}
                        placeholder="Enter category"
                        readOnly={addFormData.item_id ? true : false}
                      />
                    </div>

                    <div>
                      <label className="label">Brand</label>
                      <input
                        type="text"
                        value={addFormData.brand}
                        onChange={(e) => setAddFormData({...addFormData, brand: e.target.value})}
                        className={`input ${addFormData.item_id ? 'bg-slate-100' : ''}`}
                        placeholder="Enter brand"
                        readOnly={addFormData.item_id ? true : false}
                      />
                    </div>
                  </div>

                  {/* Stock Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Stock Information</h3>
                    
                    <div>
                      <label className="label">Unit</label>
                      <input
                        type="text"
                        value={addFormData.unit}
                        onChange={(e) => setAddFormData({...addFormData, unit: e.target.value})}
                        className={`input ${addFormData.item_id ? 'bg-slate-100' : ''}`}
                        placeholder="Enter unit"
                        readOnly={addFormData.item_id ? true : false}
                      />
                    </div>

                    <div>
                      <label className="label">Cost per Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={addFormData.cost_per_unit}
                        onChange={(e) => setAddFormData({...addFormData, cost_per_unit: e.target.value})}
                        className="input"
                        placeholder="Enter cost per unit"
                      />
                    </div>

                    <div>
                      <label className="label">Initial Stock Quantity</label>
                      <input
                        type="number"
                        value={addFormData.stock_qty}
                        onChange={(e) => setAddFormData({...addFormData, stock_qty: e.target.value})}
                        className="input"
                        placeholder="Enter initial stock quantity"
                      />
                    </div>

                    <div>
                      <label className="label">Minimum Stock Level</label>
                      <input
                        type="number"
                        value={addFormData.minimum_stock_level}
                        onChange={(e) => setAddFormData({...addFormData, minimum_stock_level: e.target.value})}
                        className="input"
                        placeholder="Enter minimum stock level"
                      />
                    </div>

                    <div>
                      <label className="label">Maximum Stock Level</label>
                      <input
                        type="number"
                        value={addFormData.maximum_stock_level}
                        onChange={(e) => setAddFormData({...addFormData, maximum_stock_level: e.target.value})}
                        className="input"
                        placeholder="Enter maximum stock level"
                      />
                    </div>

                    <div>
                      <label className="label">Reorder Point</label>
                      <input
                        type="number"
                        value={addFormData.reorder_point}
                        onChange={(e) => setAddFormData({...addFormData, reorder_point: e.target.value})}
                        className="input"
                        placeholder="Enter reorder point"
                      />
                    </div>

                    <div>
                      <label className="label">Warehouse</label>
                      <select
                        value={addFormData.warehouse_id}
                        onChange={(e) => setAddFormData({...addFormData, warehouse_id: e.target.value})}
                        className="input"
                      >
                        <option value="">Select Warehouse</option>
                        {masterData?.warehouses?.map((warehouse) => (
                          <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                            {warehouse.warehouse_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Location</label>
                      <input
                        type="text"
                        value={addFormData.location}
                        onChange={(e) => setAddFormData({...addFormData, location: e.target.value})}
                        className="input"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 p-6 pt-0 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner h-4 w-4 mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Material
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
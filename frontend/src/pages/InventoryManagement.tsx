import React, { useState, useEffect } from 'react';
import { 
  materialManagementAPI, 
  projectsAPI 
} from '../services/api';
import { AlertTriangle, Package, History } from 'lucide-react';

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

interface RestockItem {
  material_id: number;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock_level: number;
  reorder_point: number;
  restock_quantity: number;
  cost_per_unit?: number;
  warehouse?: string;
}

interface RestockHistory {
  history_id: number;
  material_id: number;
  project_id?: number;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_number?: string;
  description?: string;
  location?: string;
  transaction_date: string;
  material: {
    material_id: number;
    name: string;
    unit: string;
  };
  project?: {
    project_id: number;
    name: string;
  };
  performedBy: {
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
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Restocking state
  const [lowStockMaterials, setLowStockMaterials] = useState<InventoryItem[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [restockHistory, setRestockHistory] = useState<RestockHistory[]>([]);
  const [showBulkRestock, setShowBulkRestock] = useState(false);
  const [showMaterialSelection, setShowMaterialSelection] = useState(false);
  const [bulkRestockData, setBulkRestockData] = useState({
    restock_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
    location: ''
  });
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
  }, [filterProject, filterCategory, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, historyRes, projectsRes, masterDataRes] = await Promise.all([
        materialManagementAPI.getInventory({ 
          project_id: filterProject || undefined,
          category: filterCategory || undefined
        }),
        materialManagementAPI.getInventoryHistory({ 
          material_id: selectedItemId || undefined,
          project_id: filterProject || undefined,
          limit: 50 
        }),
        projectsAPI.getProjects(),
        materialManagementAPI.getMasterData()
      ]);

      setInventoryItems(inventoryRes.data.materials || []);
      console.log('Inventory API Response:', inventoryRes.data);
      setInventoryHistory(historyRes.data.history || []);
      console.log('Inventory History API Response:', historyRes.data);
      setProjects(projectsRes.data.projects || []);
      console.log('Master data received:', masterDataRes.data);
      setMasterData(masterDataRes.data);
      
      // Load restocking data when on restock tabs
      if (activeTab === 'low-stock' || activeTab === 'restock' || activeTab === 'history') {
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
      const [lowStockRes, restockHistoryRes] = await Promise.all([
        materialManagementAPI.getLowStockMaterials(), // No project filter - get all low stock materials
        materialManagementAPI.getRestockHistory() // No project filter - get all restock history
      ]);
      setLowStockMaterials(lowStockRes.data.lowStockMaterials || []);
      setRestockHistory(restockHistoryRes.data.history || []);
    } catch (error) {
      console.error('Error loading restocking data:', error);
    }
  };

  const getStockStatus = (current: number, minimum: number, maximum: number) => {
    if (current <= minimum) return { status: 'LOW', color: 'bg-red-100 text-red-800' };
    if (current >= maximum) return { status: 'HIGH', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'NORMAL', color: 'bg-green-100 text-green-800' };
  };

  const handleAddMaterial = async () => {
    if (!addFormData.name || !addFormData.warehouse_id) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const materialData = {
        ...addFormData,
        item_id: addFormData.item_id ? parseInt(addFormData.item_id) : null,
        stock_qty: parseInt(addFormData.stock_qty) || 0,
        minimum_stock_level: parseInt(addFormData.minimum_stock_level) || 0,
        maximum_stock_level: parseInt(addFormData.maximum_stock_level) || 1000,
        reorder_point: parseInt(addFormData.reorder_point) || 0,
        cost_per_unit: parseFloat(addFormData.cost_per_unit) || 0,
        warehouse_id: parseInt(addFormData.warehouse_id)
      };

      await materialManagementAPI.createMaterial(materialData);
      alert('Material added successfully!');
      setShowAddForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Error adding material');
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'RECEIPT': return '📦';
      case 'ISSUE': return '📤';
      case 'RETURN': return '↩️';
      case 'CONSUMPTION': return '🔥';
      case 'ADJUSTMENT': return '⚖️';
      default: return '📄';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'RECEIPT': return 'text-green-600';
      case 'ISSUE': return 'text-blue-600';
      case 'RETURN': return 'text-orange-600';
      case 'CONSUMPTION': return 'text-red-600';
      case 'ADJUSTMENT': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Restocking functions
  const addToRestockList = (material: InventoryItem) => {
    const existingItem = restockItems.find(item => item.material_id === material.material_id);
    if (!existingItem) {
      const restockItem: RestockItem = {
        material_id: material.material_id,
        name: material.name,
        unit: material.unit || material.item?.unit?.unit_symbol || '',
        current_stock: material.stock_qty,
        minimum_stock_level: material.minimum_stock_level,
        reorder_point: material.reorder_point || material.minimum_stock_level,
        restock_quantity: Math.max(material.minimum_stock_level - material.stock_qty, 10),
        cost_per_unit: 0,
        warehouse: material.warehouse?.warehouse_name || 'Unknown'
      };
      setRestockItems([...restockItems, restockItem]);
    }
  };

  const removeFromRestockList = (materialId: number) => {
    setRestockItems(restockItems.filter(item => item.material_id !== materialId));
  };

  const updateRestockQuantity = (materialId: number, quantity: number) => {
    setRestockItems(restockItems.map(item => 
      item.material_id === materialId 
        ? { ...item, restock_quantity: quantity }
        : item
    ));
  };

  const handleBulkRestock = async () => {
    if (restockItems.length === 0) {
      alert('Please add items to restock');
      return;
    }

    setLoading(true);
    try {
      const restockData = {
        restock_date: bulkRestockData.restock_date,
        reference_number: bulkRestockData.reference_number,
        notes: bulkRestockData.notes,
        location: bulkRestockData.location,
        restocks: restockItems.map(item => ({
          material_id: item.material_id,
          restock_quantity: item.restock_quantity,
          cost_per_unit: item.cost_per_unit || 0
        }))
      };

      console.log('Sending restock data:', restockData);
      await materialManagementAPI.restockBulk(restockData);
      alert('Bulk restock completed successfully!');
      setRestockItems([]);
      setShowBulkRestock(false);
      setBulkRestockData({
        restock_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
        location: ''
      });
      loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error performing bulk restock:', error);
      alert('Error performing bulk restock');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusForRestock = (material: InventoryItem) => {
    if (material.stock_qty <= material.minimum_stock_level) {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (material.stock_qty <= material.reorder_point) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    }
    return { status: 'normal', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  if (loading && inventoryItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">Monitor stock levels, track movements, and manage inventory</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Material
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inventory Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movement History
            </button>
            <button
              onClick={() => setActiveTab('low-stock')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'low-stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Low Stock
            </button>
            <button
              onClick={() => setActiveTab('restock')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'restock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="h-4 w-4 mr-1" />
              Restock ({restockItems.length})
            </button>
            <button
              onClick={() => setActiveTab('restock-history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'restock-history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="h-4 w-4 mr-1" />
              Restock History
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>All Projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="CEMENT">Cement</option>
              <option value="STEEL">Steel</option>
              <option value="BRICK">Brick</option>
              <option value="SAND">Sand</option>
              <option value="AGGREGATE">Aggregate</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Inventory</h2>
            
            {inventoryItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No inventory items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min/Max
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryItems.map((item) => {
                      const stockStatus = getStockStatus(item.stock_qty, item.minimum_stock_level, item.maximum_stock_level);
                      return (
                        <tr key={item.material_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.unit || item.item?.unit?.unit_symbol}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.category || item.item?.category?.category_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.brand || item.item?.brand?.brand_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.warehouse?.warehouse_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.stock_qty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.minimum_stock_level} / {item.maximum_stock_level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {stockStatus.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedItemId(item.material_id);
                                setActiveTab('history');
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View History
                            </button>
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

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Movement History</h2>
            
            {inventoryHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No movement history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventoryHistory.map((entry) => (
                  <div key={entry.history_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTransactionIcon(entry.transaction_type)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.material?.name || 'Unknown Material'}</h4>
                          <p className="text-sm text-gray-600">{entry.transaction_type}</p>
                          {entry.reference_number && (
                            <p className="text-xs text-blue-600">Ref: {entry.reference_number}</p>
                          )}
                          {entry.description && (
                            <p className="text-xs text-gray-500">{entry.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className={`font-medium ${getTransactionColor(entry.transaction_type)}`}>
                              {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                            </p>
                            <p className="text-sm text-gray-600">
                              Balance: {entry.quantity_after}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(entry.transaction_date).toLocaleDateString()}
                            </p>
                            {entry.location && (
                              <p className="text-xs text-gray-400 mt-1">{entry.location}</p>
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

      {activeTab === 'low-stock' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Materials</h2>
            <p className="text-sm text-gray-600 mb-4">Showing all materials across all warehouses that are below minimum stock levels</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You can restock any material, not just low stock ones. Use the "Add Material" button in the Restock tab to select any material for restocking.
              </p>
            </div>
            
            {lowStockMaterials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No low stock materials found</p>
                <p className="text-sm text-gray-400 mt-2">All materials are above minimum stock levels</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockMaterials.map((material) => {
                  const stockStatus = getStockStatusForRestock(material);
                  return (
                    <div key={material.material_id} className={`border rounded-lg p-4 ${stockStatus.bgColor}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{material.name}</h4>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>Current: {material.stock_qty} {material.unit || material.item?.unit?.unit_symbol}</span>
                            <span>Minimum: {material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                            <span>Reorder Point: {material.reorder_point || material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</span>
                          </div>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color} bg-white`}>
                              {stockStatus.status.toUpperCase()}
                            </span>
                            {material.warehouse && (
                              <span className="text-xs text-gray-500">
                                📍 {material.warehouse.warehouse_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => addToRestockList(material)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Quick Add to Restock
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

      {activeTab === 'restock' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Restock Items</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMaterialSelection(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Material
                </button>
                <button
                  onClick={() => setShowBulkRestock(true)}
                  disabled={restockItems.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Restock
                </button>
              </div>
            </div>
            
            {restockItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No items added to restock list</p>
                <p className="text-sm text-gray-400 mt-2">Click "Add Material" to select materials for restocking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {restockItems.map((item) => (
                  <div key={item.material_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Current: {item.current_stock} {item.unit}</span>
                          <span>Minimum: {item.minimum_stock_level} {item.unit}</span>
                          <span>Reorder Point: {item.reorder_point} {item.unit}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.warehouse && (
                            <span>📍 Warehouse: {item.warehouse}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">Quantity:</label>
                          <input
                            type="number"
                            value={item.restock_quantity}
                            onChange={(e) => updateRestockQuantity(item.material_id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">Cost:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.cost_per_unit || 0}
                            onChange={(e) => {
                              const updatedItems = restockItems.map(restockItem => 
                                restockItem.material_id === item.material_id 
                                  ? { ...restockItem, cost_per_unit: parseFloat(e.target.value) || 0 }
                                  : restockItem
                              );
                              setRestockItems(updatedItems);
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                        </div>
                        <button
                          onClick={() => removeFromRestockList(item.material_id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'restock-history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Restock History</h2>
            <p className="text-sm text-gray-600 mb-4">Complete history of all inventory restocking operations across all warehouses</p>
            
            {restockHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No restock history found</p>
                <p className="text-sm text-gray-400 mt-2">Restock operations will appear here once performed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {restockHistory.map((history) => (
                  <div key={history.history_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{history.material.name}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Quantity: +{history.quantity_change} {history.material.unit}</span>
                          <span>Before: {history.quantity_before} {history.material.unit}</span>
                          <span>After: {history.quantity_after} {history.material.unit}</span>
                          <span>Date: {new Date(history.transaction_date).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <span>Reference: {history.reference_number}</span>
                          {history.description && (
                            <span className="ml-4">Notes: {history.description}</span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <span>By: {history.performedBy.name}</span>
                          {history.location && (
                            <span className="ml-4">📍 Location: {history.location}</span>
                          )}
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

      {/* Add Material Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {!masterData ? (
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading form data...</span>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Material</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Material from Master Data *</label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addFormData.item_id ? 'bg-gray-100' : ''}`}
                    placeholder="Enter material name"
                    required
                    readOnly={addFormData.item_id ? true : false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                  <input
                    type="text"
                    value={addFormData.item_code}
                    onChange={(e) => setAddFormData({...addFormData, item_code: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addFormData.item_id ? 'bg-gray-100' : ''}`}
                    placeholder="Enter item code"
                    readOnly={addFormData.item_id ? true : false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={addFormData.category}
                    onChange={(e) => setAddFormData({...addFormData, category: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addFormData.item_id ? 'bg-gray-100' : ''}`}
                    disabled={addFormData.item_id ? true : false}
                  >
                    <option value="">Select Category</option>
                    {masterData?.categories?.map((cat) => (
                      <option key={cat.category_id} value={cat.category_name}>
                        {cat.category_name}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select
                    value={addFormData.brand}
                    onChange={(e) => setAddFormData({...addFormData, brand: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addFormData.item_id ? 'bg-gray-100' : ''}`}
                    disabled={addFormData.item_id ? true : false}
                  >
                    <option value="">Select Brand</option>
                    {masterData?.brands?.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_name}>
                        {brand.brand_name}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={addFormData.unit}
                    onChange={(e) => setAddFormData({...addFormData, unit: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addFormData.item_id ? 'bg-gray-100' : ''}`}
                    disabled={addFormData.item_id ? true : false}
                  >
                    <option value="">Select Unit</option>
                    {masterData?.units?.map((unit) => (
                      <option key={unit.unit_id} value={unit.unit_name}>
                        {unit.unit_name} ({unit.unit_symbol})
                      </option>
                    )) || []}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                  <select
                    value={addFormData.warehouse_id}
                    onChange={(e) => setAddFormData({...addFormData, warehouse_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {masterData?.warehouses?.map((warehouse) => (
                      <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                        {warehouse.warehouse_name}
                      </option>
                    )) || []}
                  </select>
                </div>
              </div>

              {/* Stock Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Stock Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={addFormData.stock_qty}
                    onChange={(e) => setAddFormData({...addFormData, stock_qty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
                  <input
                    type="number"
                    value={addFormData.minimum_stock_level}
                    onChange={(e) => setAddFormData({...addFormData, minimum_stock_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock Level</label>
                  <input
                    type="number"
                    value={addFormData.maximum_stock_level}
                    onChange={(e) => setAddFormData({...addFormData, maximum_stock_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={addFormData.reorder_point}
                    onChange={(e) => setAddFormData({...addFormData, reorder_point: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={addFormData.cost_per_unit}
                    onChange={(e) => setAddFormData({...addFormData, cost_per_unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={addFormData.location}
                    onChange={(e) => setAddFormData({...addFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter location"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={addFormData.type}
                    onChange={(e) => setAddFormData({...addFormData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter material type"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={addFormData.color}
                    onChange={(e) => setAddFormData({...addFormData, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter color"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={addFormData.supplier}
                    onChange={(e) => setAddFormData({...addFormData, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {masterData?.suppliers?.map((supplier) => (
                      <option key={supplier.supplier_id} value={supplier.supplier_name}>
                        {supplier.supplier_name}
                      </option>
                    )) || []}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData({...addFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DISCONTINUED">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Specification</label>
                <textarea
                  value={addFormData.additional_specification}
                  onChange={(e) => setAddFormData({...addFormData, additional_specification: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter additional specifications"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaterial}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Bulk Restock Modal */}
      {showBulkRestock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bulk Restock</h2>
              <button
                onClick={() => setShowBulkRestock(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restock Date *</label>
                <input
                  type="date"
                  value={bulkRestockData.restock_date}
                  onChange={(e) => setBulkRestockData({...bulkRestockData, restock_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={bulkRestockData.reference_number}
                  onChange={(e) => setBulkRestockData({...bulkRestockData, reference_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reference number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={bulkRestockData.location}
                  onChange={(e) => setBulkRestockData({...bulkRestockData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={bulkRestockData.notes}
                  onChange={(e) => setBulkRestockData({...bulkRestockData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter notes"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Items to Restock ({restockItems.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {restockItems.map((item) => (
                    <div key={item.material_id} className="text-sm text-gray-600">
                      {item.name}: {item.restock_quantity} {item.unit}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setShowBulkRestock(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRestock}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Process Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Selection Modal */}
      {showMaterialSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Materials to Restock</h2>
              <button
                onClick={() => setShowMaterialSelection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryItems.map((material) => {
                  const isAlreadyAdded = restockItems.some(item => item.material_id === material.material_id);
                  const stockStatus = getStockStatusForRestock(material);
                  
                  return (
                    <div key={material.material_id} className={`border rounded-lg p-4 ${stockStatus.bgColor} ${isAlreadyAdded ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{material.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color} bg-white`}>
                          {stockStatus.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Current: {material.stock_qty} {material.unit || material.item?.unit?.unit_symbol}</div>
                        <div>Minimum: {material.minimum_stock_level} {material.unit || material.item?.unit?.unit_symbol}</div>
                        {material.warehouse && (
                          <div>📍 {material.warehouse.warehouse_name}</div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        {isAlreadyAdded ? (
                          <span className="text-sm text-gray-500">Already added</span>
                        ) : (
                          <button
                            onClick={() => addToRestockList(material)}
                            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Add to Restock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {inventoryItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No materials found</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setShowMaterialSelection(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;

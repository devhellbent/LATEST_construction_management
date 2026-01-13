import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { materialsAPI, materialManagementAPI, sizesAPI } from '../services/api';
import SearchableDropdown from './SearchableDropdown';

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
  warehouse_id?: number;
  status?: string;
  project_id?: number;
}

interface MasterData {
  categories: Array<{ category_id: number; category_name: string }>;
  brands: Array<{ brand_id: number; brand_name: string }>;
  units: Array<{ unit_id: number; unit_name: string; unit_symbol: string }>;
  suppliers: Array<{ supplier_id: number; supplier_name: string }>;
  warehouses: Array<{ warehouse_id: number; warehouse_name: string; address?: string }>;
  itemMaster: Array<{ item_id: number; item_code: string; item_name: string; category_id: number; brand_id: number; unit_id: number }>;
  itemSuppliers?: Array<{ supplier_id: number; supplier_name: string; cost_per_unit: number; is_preferred: boolean }>;
}

interface MaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: number;
  material?: Material | null;
}

const MaterialForm: React.FC<MaterialFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  material
}) => {
  const [formData, setFormData] = useState({
    name: '',
    item_id: '',
    item_code: '',
    additional_specification: '',
    category: '',
    brand: '',
    color: '',
    size: '',
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
    status: 'ACTIVE',
    project_id: projectId || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sizeOptions, setSizeOptions] = useState<{ value: string; label: string }[]>([]);
  const [sizeSearchLoading, setSizeSearchLoading] = useState(false);

  // Initialize form data when material prop changes
  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        item_id: material.item_id?.toString() || '',
        item_code: material.item_code || '',
        additional_specification: material.additional_specification || '',
        category: material.category || '',
        brand: material.brand || '',
        color: material.color || '',
        size: material.size || '',
        type: material.type || '',
        unit: material.unit || '',
        cost_per_unit: material.cost_per_unit?.toString() || '',
        supplier: material.supplier || '',
        stock_qty: material.stock_qty?.toString() || '',
        minimum_stock_level: material.minimum_stock_level?.toString() || '',
        maximum_stock_level: material.maximum_stock_level?.toString() || '',
        reorder_point: material.reorder_point?.toString() || '',
        location: material.location || '',
        warehouse_id: material.warehouse_id?.toString() || '',
        status: material.status || 'ACTIVE',
        project_id: material.project_id?.toString() || projectId?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        item_id: '',
        item_code: '',
        additional_specification: '',
        category: '',
        brand: '',
        color: '',
        size: '',
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
        status: 'ACTIVE',
        project_id: projectId?.toString() || ''
      });
    }
  }, [material, projectId]);

  // Reset form when modal opens for new material
  useEffect(() => {
    if (isOpen && !material) {
      setFormData({
        name: '',
        item_id: '',
        item_code: '',
        additional_specification: '',
        category: '',
        brand: '',
        color: '',
        size: '',
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
        status: 'ACTIVE',
        project_id: projectId?.toString() || ''
      });
      setSelectedItemId(null);
      setItemSearchQuery('');
      setShowItemSearch(false);
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen, material, projectId]);

  // Fetch master data when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      // Fetch general master data and active warehouses in parallel
      const [masterRes, warehousesRes] = await Promise.all([
        materialsAPI.getMasterData(),
        materialManagementAPI.getWarehouses()
      ]);

      const warehouses = warehousesRes.data?.warehouses || [];
      setMasterData({
        ...(masterRes.data || {}),
        warehouses
      });
    } catch (err) {
      console.error('Error fetching master data:', err);
      // Fail-safe: still set master data if one of the calls succeeded previously
    }
  };

  const handleItemSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await materialsAPI.searchItems(query);
      setSearchResults(response.data.items);
    } catch (err) {
      console.error('Error searching items:', err);
      setSearchResults([]);
    }
  };

  // Live search sizes
  const handleSizeSearch = async (query: string) => {
    try {
      setSizeSearchLoading(true);
      const res = await sizesAPI.getSizes({ q: query, limit: 20 });
      const sizes = (res.data?.sizes || []).map((s: any) => ({ value: s.value, label: s.value }));
      setSizeOptions(sizes);
    } catch (err) {
      setSizeOptions([]);
    } finally {
      setSizeSearchLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleSizeSearch('');
    }
  }, [isOpen]);

  const handleItemSelect = async (item: any) => {
    try {
      // Fetch item details and suppliers in parallel
      const [itemDetailsResponse, suppliersResponse] = await Promise.all([
        materialsAPI.getItemDetails(item.item_id),
        materialsAPI.getItemSuppliers(item.item_id)
      ]);
      
      const itemDetails = itemDetailsResponse.data.item;
      const itemSuppliers = suppliersResponse.data.suppliers;
      
      // Update form data with item details
      setFormData(prev => ({
        ...prev,
        name: itemDetails.item_name,
        item_code: itemDetails.item_code,
        category: itemDetails.category_name,
        brand: itemDetails.brand_name,
        unit: itemDetails.unit_name,
        additional_specification: itemDetails.description || '',
        item_id: itemDetails.item_id
      }));
      
      // Update master data with item-specific suppliers
      setMasterData(prev => ({
        ...prev,
        itemSuppliers: itemSuppliers.map(supplier => ({
          supplier_id: supplier.supplier.supplier_id,
          supplier_name: supplier.supplier.supplier_name,
          cost_per_unit: supplier.cost_per_unit,
          is_preferred: supplier.is_preferred
        }))
      }));
      
      setSelectedItemId(item.item_id);
      setShowItemSearch(false);
      setItemSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error fetching item details:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-populate cost per unit when supplier is selected from item-specific suppliers
    if (name === 'supplier' && masterData?.itemSuppliers) {
      const selectedSupplier = masterData.itemSuppliers.find(s => s.supplier_name === value);
      if (selectedSupplier && selectedSupplier.cost_per_unit) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          cost_per_unit: selectedSupplier.cost_per_unit.toString()
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Client-side validation for mandatory fields
      if (!formData.unit || !formData.warehouse_id) {
        setError('Please select both Unit and Warehouse before continuing.');
        setLoading(false);
        return;
      }

      // Validate required fields: size and stock_qty
      if (!formData.size || formData.size.trim() === '') {
        setError('Size is required. Please select a size for the material.');
        setLoading(false);
        return;
      }

      if (!formData.stock_qty || formData.stock_qty === '' || parseFloat(formData.stock_qty) < 0) {
        setError('Stock quantity is required and must be a non-negative number.');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        item_id: formData.item_id ? parseInt(formData.item_id) : null,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
        stock_qty: parseFloat(formData.stock_qty),
        minimum_stock_level: formData.minimum_stock_level ? parseInt(formData.minimum_stock_level) : 0,
        maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : 1000,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : 0,
        project_id: formData.project_id ? parseInt(formData.project_id.toString()) : null,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null
      };

      // Remove empty string fields and null values to avoid validation issues
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null) {
          delete submitData[key];
        }
      });

      if (material) {
        // Update existing material
        await materialsAPI.updateMaterial(material.material_id, submitData);
      } else {
        // Create new material
        await materialsAPI.createMaterial(submitData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Failed to ${material ? 'update' : 'create'} material`;
      setError(errorMessage);
      
      // If it's a duplicate error, highlight the name field
      if (err.response?.data?.field === 'name') {
        // You could add visual highlighting here if needed
        console.log('Duplicate material name detected');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              {material ? 'Edit Material' : 'Add New Material'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {material ? 'Update material information' : 'Add a new material to your inventory'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-3 sm:px-4 py-2 sm:py-3 rounded-xl flex items-center text-sm sm:text-base">
              <span className="mr-2">⚠</span>
              {error}
            </div>
          )}

          {/* Item Search */}
          <div>
            <label className="label">
              Search from Master Items (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search items by name or code..."
                value={itemSearchQuery}
                onChange={(e) => {
                  setItemSearchQuery(e.target.value);
                  handleItemSearch(e.target.value);
                  setShowItemSearch(true);
                }}
                onFocus={() => setShowItemSearch(true)}
                className="input pr-12"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              
              {showItemSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-large max-h-60 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.item_id}
                      onClick={() => handleItemSelect(item)}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-slate-900">{item.item_name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Code: {item.item_code} | Category: {item.category_name} | Brand: {item.brand_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label label-required">
                Material Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="label">
                Item Code
              </label>
              <input
                type="text"
                name="item_code"
                value={formData.item_code}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Specification
            </label>
            <textarea
              name="additional_specification"
              value={formData.additional_specification}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SearchableDropdown
                label="Category"
                options={masterData?.categories?.map(category => ({
                  value: category.category_name,
                  label: category.category_name
                })) || []}
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value as string }))}
                placeholder="Select Category"
                searchPlaceholder="Search categories..."
                className="w-full"
              />
            </div>

            <div>
              <SearchableDropdown
                label="Brand"
                options={masterData?.brands?.map(brand => ({
                  value: brand.brand_name,
                  label: brand.brand_name
                })) || []}
                value={formData.brand}
                onChange={(value) => setFormData(prev => ({ ...prev, brand: value as string }))}
                placeholder="Select Brand"
                searchPlaceholder="Search brands..."
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div>
              <SearchableDropdown
                label="Size *"
                options={sizeOptions}
                value={formData.size}
                onChange={(value) => setFormData(prev => ({ ...prev, size: value as string }))}
                placeholder="Select Size"
                searchPlaceholder="Type to search sizes..."
                className="w-full"
                onSearch={handleSizeSearch}
                loading={sizeSearchLoading}
                emptyMessage="Type to search sizes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SearchableDropdown
                label="Unit *"
                options={masterData?.units?.map(unit => ({
                  value: unit.unit_name,
                  label: `${unit.unit_name} (${unit.unit_symbol})`,
                  searchText: `${unit.unit_name} ${unit.unit_symbol}`
                })) || []}
                value={formData.unit}
                onChange={(value) => setFormData(prev => ({ ...prev, unit: value as string }))}
                placeholder="Select Unit"
                searchPlaceholder="Search units..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost per Unit
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input"
              />
            </div>
          </div>

          <div>
            <SearchableDropdown
              label="Supplier"
              options={(masterData?.itemSuppliers && masterData.itemSuppliers.length > 0 ? 
                masterData.itemSuppliers : 
                masterData?.suppliers || []
              ).map((supplier) => ({
                value: supplier.supplier_name,
                label: `${supplier.supplier_name}${masterData?.itemSuppliers && 'is_preferred' in supplier && supplier.is_preferred ? ' (Preferred)' : ''}${masterData?.itemSuppliers && 'cost_per_unit' in supplier && supplier.cost_per_unit ? ` - $${supplier.cost_per_unit}` : ''}`,
                searchText: supplier.supplier_name
              }))}
              value={formData.supplier}
              onChange={(value) => {
                const supplierName = value as string;
                setFormData(prev => ({ ...prev, supplier: supplierName }));
                
                // Auto-populate cost per unit when supplier is selected from item-specific suppliers
                if (masterData?.itemSuppliers) {
                  const selectedSupplier = masterData.itemSuppliers.find(s => s.supplier_name === supplierName);
                  if (selectedSupplier && selectedSupplier.cost_per_unit) {
                    setFormData(prev => ({
                      ...prev,
                      supplier: supplierName,
                      cost_per_unit: selectedSupplier.cost_per_unit.toString()
                    }));
                  }
                }
              }}
              placeholder="Select Supplier"
              searchPlaceholder="Search suppliers..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity * (Decimal allowed)
              </label>
              <input
                type="number"
                name="stock_qty"
                value={formData.stock_qty}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                placeholder="Enter quantity (e.g., 10.5, 25.75)"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <SearchableDropdown
              label="Warehouse *"
              options={masterData?.warehouses?.map(warehouse => ({
                value: warehouse.warehouse_id.toString(),
                label: warehouse.warehouse_name,
                searchText: warehouse.warehouse_name
              })) || []}
              value={formData.warehouse_id}
              onChange={(value) => setFormData(prev => ({ ...prev, warehouse_id: value as string }))}
              placeholder="Select Warehouse"
              searchPlaceholder="Search warehouses..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Stock Level
              </label>
              <input
                type="number"
                name="minimum_stock_level"
                value={formData.minimum_stock_level}
                onChange={handleInputChange}
                min="0"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Stock Level
              </label>
              <input
                type="number"
                name="maximum_stock_level"
                value={formData.maximum_stock_level}
                onChange={handleInputChange}
                min="0"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Point
              </label>
              <input
                type="number"
                name="reorder_point"
                value={formData.reorder_point}
                onChange={handleInputChange}
                min="0"
                className="input"
              />
            </div>
          </div>

          <div>
            <SearchableDropdown
              label="Status"
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'DISCONTINUED', label: 'Discontinued' }
              ]}
              value={formData.status}
              onChange={(value) => setFormData(prev => ({ ...prev, status: value as string }))}
              placeholder="Select Status"
              searchPlaceholder="Search status..."
              className="w-full"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.unit || !formData.warehouse_id}
              className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  {material ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                material ? 'Update Material' : 'Add Material'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialForm;

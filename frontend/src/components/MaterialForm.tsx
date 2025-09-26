import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { materialsAPI } from '../services/api';

interface Material {
  material_id: number;
  name: string;
  item_id?: number;
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

interface MasterData {
  categories: Array<{ category_id: number; category_name: string }>;
  brands: Array<{ brand_id: number; brand_name: string }>;
  units: Array<{ unit_id: number; unit_name: string; unit_symbol: string }>;
  suppliers: Array<{ supplier_id: number; supplier_name: string }>;
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
    type: '',
    unit: '',
    cost_per_unit: '',
    supplier: '',
    stock_qty: '',
    minimum_stock_level: '',
    maximum_stock_level: '',
    reorder_point: '',
    location: '',
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
        type: material.type || '',
        unit: material.unit || '',
        cost_per_unit: material.cost_per_unit?.toString() || '',
        supplier: material.supplier || '',
        stock_qty: material.stock_qty?.toString() || '',
        minimum_stock_level: material.minimum_stock_level?.toString() || '',
        maximum_stock_level: material.maximum_stock_level?.toString() || '',
        reorder_point: material.reorder_point?.toString() || '',
        location: material.location || '',
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
        type: '',
        unit: '',
        cost_per_unit: '',
        supplier: '',
        stock_qty: '',
        minimum_stock_level: '',
        maximum_stock_level: '',
        reorder_point: '',
        location: '',
        status: 'ACTIVE',
        project_id: projectId?.toString() || ''
      });
    }
  }, [material, projectId]);

  // Fetch master data when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      const response = await materialsAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
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
      const submitData = {
        ...formData,
        item_id: formData.item_id ? parseInt(formData.item_id) : null,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
        stock_qty: formData.stock_qty ? parseInt(formData.stock_qty) : 0,
        minimum_stock_level: formData.minimum_stock_level ? parseInt(formData.minimum_stock_level) : 0,
        maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : 1000,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : 0,
        project_id: formData.project_id ? parseInt(formData.project_id.toString()) : null
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
      setError(err.response?.data?.message || `Failed to ${material ? 'update' : 'create'} material`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {material ? 'Edit Material' : 'Add New Material'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {material ? 'Update material information' : 'Add a new material to your inventory'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl flex items-center">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {masterData?.categories.map((category) => (
                  <option key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Brand</option>
                {masterData?.brands.map((brand) => (
                  <option key={brand.brand_id} value={brand.brand_name}>
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Unit</option>
                {masterData?.units.map((unit) => (
                  <option key={unit.unit_id} value={unit.unit_name}>
                    {unit.unit_name} ({unit.unit_symbol})
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <select
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Supplier</option>
              {/* Show item-specific suppliers if available, otherwise show all suppliers */}
              {(masterData?.itemSuppliers && masterData.itemSuppliers.length > 0 ? 
                masterData.itemSuppliers : 
                masterData?.suppliers || []
              ).map((supplier) => (
                <option key={supplier.supplier_id} value={supplier.supplier_name}>
                  {supplier.supplier_name}
                  {masterData?.itemSuppliers && 'is_preferred' in supplier && supplier.is_preferred && ' (Preferred)'}
                  {masterData?.itemSuppliers && 'cost_per_unit' in supplier && supplier.cost_per_unit && ` - $${supplier.cost_per_unit}`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stock_qty"
                value={formData.stock_qty}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
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
                  {material ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                material ? 'Update Material' : 'Create Material'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialForm;

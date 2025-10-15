import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Package,
  Tag,
  Scale,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Pagination from '../../components/Pagination';

interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  description?: string;
  category_id: number;
  brand_id?: number;
  unit_id: number;
  specifications?: any;
  technical_details?: string;
  safety_requirements?: string;
  environmental_impact?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    category_id: number;
    category_name: string;
  };
  brand?: {
    brand_id: number;
    brand_name: string;
  };
  unit?: {
    unit_id: number;
    unit_name: string;
    unit_symbol: string;
  };
}

interface Category {
  category_id: number;
  category_name: string;
}

interface Brand {
  brand_id: number;
  brand_name: string;
}

interface Unit {
  unit_id: number;
  unit_name: string;
  unit_symbol: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const AdminItems: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    technical_details: '',
    safety_requirements: '',
    environmental_impact: '',
    is_active: true
  });

  // Fetch items
  const { data: itemsData, isLoading, error } = useQuery(
    ['admin-items', { search: searchTerm, category_id: categoryFilter, brand_id: brandFilter, page: currentPage }],
    () => adminAPI.getItems({ 
      search: searchTerm || undefined, 
      category_id: categoryFilter || undefined,
      brand_id: brandFilter || undefined,
      page: currentPage,
      limit: 20 
    }),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch items');
      }
    }
  );

  // Fetch master data
  const { data: categoriesData } = useQuery(
    ['admin-categories'],
    () => adminAPI.getCategories(),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch categories');
      }
    }
  );

  const { data: brandsData } = useQuery(
    ['admin-brands'],
    () => adminAPI.getBrands(),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch brands');
      }
    }
  );

  const { data: unitsData } = useQuery(
    ['admin-units'],
    () => adminAPI.getUnits(),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch units');
      }
    }
  );

  const items: Item[] = (itemsData as any)?.data?.items || (itemsData as any)?.items || [];
  const categories: Category[] = (categoriesData as any)?.data?.categories || (categoriesData as any)?.categories || [];
  const brands: Brand[] = (brandsData as any)?.data?.brands || (brandsData as any)?.brands || [];
  const units: Unit[] = (unitsData as any)?.data?.units || (unitsData as any)?.units || [];
  const pagination: Pagination = (itemsData as any)?.data?.pagination || (itemsData as any)?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  };

  // Create item mutation
  const createItemMutation = useMutation(
    (itemData: any) => adminAPI.createItem(itemData),
    {
      onSuccess: () => {
        toast.success('Item created successfully');
        queryClient.invalidateQueries(['admin-items']);
        setIsModalOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        console.error('Create item error:', error.response?.data);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach((err: any) => {
            toast.error(err.msg || err.message);
          });
        } else {
          toast.error(error.response?.data?.message || 'Failed to create item');
        }
      }
    }
  );

  // Update item mutation
  const updateItemMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => adminAPI.updateItem(id, data),
    {
      onSuccess: () => {
        toast.success('Item updated successfully');
        queryClient.invalidateQueries(['admin-items']);
        setIsModalOpen(false);
        setEditingItem(null);
        resetForm();
      },
      onError: (error: any) => {
        console.error('Update item error:', error.response?.data);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach((err: any) => {
            toast.error(err.msg || err.message);
          });
        } else {
          toast.error(error.response?.data?.message || 'Failed to update item');
        }
      }
    }
  );

  // Delete item mutation
  const deleteItemMutation = useMutation(
    (id: number) => adminAPI.deleteItem(id),
    {
      onSuccess: () => {
        toast.success('Item deleted successfully');
        queryClient.invalidateQueries(['admin-items']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete item');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      item_name: '',
      description: '',
      category_id: '',
      brand_id: '',
      unit_id: '',
      technical_details: '',
      safety_requirements: '',
      environmental_impact: '',
      is_active: true
    });
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      description: item.description || '',
      category_id: item.category_id.toString(),
      brand_id: item.brand_id?.toString() || '',
      unit_id: item.unit_id.toString(),
      technical_details: item.technical_details || '',
      safety_requirements: item.safety_requirements || '',
      environmental_impact: item.environmental_impact || '',
      is_active: item.is_active
    });
    setIsModalOpen(true);
  };

  const handleView = (item: Item) => {
    setViewingItem(item);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      item_name: formData.item_name.trim(),
      description: formData.description.trim() || undefined,
      category_id: parseInt(formData.category_id),
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : undefined,
      unit_id: parseInt(formData.unit_id),
      technical_details: formData.technical_details.trim() || undefined,
      safety_requirements: formData.safety_requirements.trim() || undefined,
      environmental_impact: formData.environmental_impact.trim() || undefined,
      is_active: Boolean(formData.is_active)
    } as any;

    if (editingItem) {
      updateItemMutation.mutate({ 
        id: editingItem.item_id, 
        data: submitData 
      });
    } else {
      createItemMutation.mutate(submitData);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </span>
    );
  };

  const getCategoryBadge = (categoryName: string) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Tag className="w-3 h-3 mr-1" />
        {categoryName}
      </span>
    );
  };

  const getUnitBadge = (unitName: string, unitSymbol: string) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Scale className="w-3 h-3 mr-1" />
        {unitName} ({unitSymbol})
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Item Master Management</h1>
          <p className="text-slate-600">Manage items, categories, brands, and units</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card-mobile">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.brand_id} value={brand.brand_id}>
                  {brand.brand_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Items Table */}
      <div className="card-mobile">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.item_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {item.item_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          Code: {item.item_code}
                        </div>
                        {item.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category && getCategoryBadge(item.category.category_name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {item.brand ? item.brand.brand_name : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.unit && getUnitBadge(item.unit.unit_name, item.unit.unit_symbol)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(item)}
                        className="text-slate-600 hover:text-slate-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.item_id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item code removed: now auto-generated by backend/database */}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Brand
                    </label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand.brand_id} value={brand.brand_id}>
                          {brand.brand_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Unit *
                    </label>
                    <select
                      required
                      value={formData.unit_id}
                      onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Unit</option>
                      {units.map((unit) => (
                        <option key={unit.unit_id} value={unit.unit_id}>
                          {unit.unit_name} ({unit.unit_symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Specifications (JSON) removed */}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Technical Details
                    </label>
                    <textarea
                      value={formData.technical_details}
                      onChange={(e) => setFormData({ ...formData, technical_details: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Safety Requirements
                    </label>
                    <textarea
                      value={formData.safety_requirements}
                      onChange={(e) => setFormData({ ...formData, safety_requirements: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Environmental Impact
                    </label>
                    <textarea
                      value={formData.environmental_impact}
                      onChange={(e) => setFormData({ ...formData, environmental_impact: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-slate-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-slate-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createItemMutation.isLoading || updateItemMutation.isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createItemMutation.isLoading || updateItemMutation.isLoading
                      ? 'Saving...'
                      : editingItem
                      ? 'Update Item'
                      : 'Create Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">Item Details</h3>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Item Code</label>
                    <p className="text-sm text-slate-900">{viewingItem.item_code}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Item Name</label>
                    <p className="text-sm text-slate-900">{viewingItem.item_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Category</label>
                    <div className="mt-1">
                      {viewingItem.category && getCategoryBadge(viewingItem.category.category_name)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Brand</label>
                    <p className="text-sm text-slate-900">{viewingItem.brand ? viewingItem.brand.brand_name : 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Unit</label>
                    <div className="mt-1">
                      {viewingItem.unit && getUnitBadge(viewingItem.unit.unit_name, viewingItem.unit.unit_symbol)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(viewingItem.is_active)}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <p className="text-sm text-slate-900">{viewingItem.description || 'N/A'}</p>
                  </div>

                  {viewingItem.specifications && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Specifications</label>
                      <pre className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(viewingItem.specifications, null, 2)}
                      </pre>
                    </div>
                  )}

                  {viewingItem.technical_details && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Technical Details</label>
                      <p className="text-sm text-slate-900">{viewingItem.technical_details}</p>
                    </div>
                  )}

                  {viewingItem.safety_requirements && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Safety Requirements</label>
                      <p className="text-sm text-slate-900">{viewingItem.safety_requirements}</p>
                    </div>
                  )}

                  {viewingItem.environmental_impact && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Environmental Impact</label>
                      <p className="text-sm text-slate-900">{viewingItem.environmental_impact}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Created At</label>
                    <p className="text-sm text-slate-900">
                      {new Date(viewingItem.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Last Updated</label>
                    <p className="text-sm text-slate-900">
                      {new Date(viewingItem.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminItems;

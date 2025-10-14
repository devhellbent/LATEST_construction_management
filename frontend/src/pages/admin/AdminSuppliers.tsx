import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  is_active: boolean;
  currentBalance?: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const AdminSuppliers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    payment_terms: '',
    credit_limit: '',
    initial_balance: '',
    is_active: true
  });

  // Fetch suppliers
  const { data: suppliersData, isLoading, error } = useQuery(
    ['admin-suppliers', { search: searchTerm, page: currentPage }],
    () => adminAPI.getSuppliers({ 
      search: searchTerm || undefined, 
      page: currentPage,
      limit: 20 
    }),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch suppliers');
      }
    }
  );

  const suppliers: Supplier[] = suppliersData?.data?.suppliers || [];
  const pagination: Pagination = suppliersData?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  };

  // Create supplier mutation
  const createSupplierMutation = useMutation(
    (supplierData: any) => adminAPI.createSupplier(supplierData),
    {
      onSuccess: () => {
        toast.success('Supplier created successfully');
        queryClient.invalidateQueries(['admin-suppliers']);
        setIsModalOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        console.error('Create supplier error:', error.response?.data);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach((err: any) => {
            toast.error(err.msg || err.message);
          });
        } else {
          toast.error(error.response?.data?.message || 'Failed to create supplier');
        }
      }
    }
  );

  // Update supplier mutation
  const updateSupplierMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => adminAPI.updateSupplier(id, data),
    {
      onSuccess: () => {
        toast.success('Supplier updated successfully');
        queryClient.invalidateQueries(['admin-suppliers']);
        setIsModalOpen(false);
        setEditingSupplier(null);
        resetForm();
      },
      onError: (error: any) => {
        console.error('Update supplier error:', error.response?.data);
        if (error.response?.data?.errors) {
          error.response.data.errors.forEach((err: any) => {
            toast.error(err.msg || err.message);
          });
        } else {
          toast.error(error.response?.data?.message || 'Failed to update supplier');
        }
      }
    }
  );

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation(
    (id: number) => adminAPI.deleteSupplier(id),
    {
      onSuccess: () => {
        toast.success('Supplier deleted successfully');
        queryClient.invalidateQueries(['admin-suppliers']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete supplier');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      supplier_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
      payment_terms: '',
      credit_limit: '',
      initial_balance: '',
      is_active: true
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      pincode: supplier.pincode || '',
      gst_number: supplier.gst_number || '',
      pan_number: supplier.pan_number || '',
      payment_terms: supplier.payment_terms || '',
      credit_limit: supplier.credit_limit?.toString() || '',
      initial_balance: '',
      is_active: supplier.is_active
    });
    setIsModalOpen(true);
  };

  const handleView = (supplier: Supplier) => {
    setViewingSupplier(supplier);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplierMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.supplier_name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    
    const submitData = {
      supplier_name: formData.supplier_name.trim(),
      contact_person: formData.contact_person.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      country: formData.country.trim() || null,
      pincode: formData.pincode.trim() || null,
      gst_number: formData.gst_number.trim() || null,
      pan_number: formData.pan_number.trim() || null,
      payment_terms: formData.payment_terms.trim() || null,
      credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
      initial_balance: formData.initial_balance ? parseFloat(formData.initial_balance) : 0,
      is_active: Boolean(formData.is_active)
    };

    console.log('Submitting supplier data:', submitData);

    if (editingSupplier) {
      updateSupplierMutation.mutate({ 
        id: editingSupplier.supplier_id, 
        data: submitData 
      });
    } else {
      createSupplierMutation.mutate(submitData);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-slate-600">Manage suppliers and their account balances</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="card-mobile">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Suppliers Table */}
      <div className="card-mobile">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
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
              {suppliers.map((supplier) => (
                <tr key={supplier.supplier_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {supplier.supplier_name}
                        </div>
                        {supplier.gst_number && (
                          <div className="text-sm text-slate-500">
                            GST: {supplier.gst_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {supplier.contact_person && (
                        <div className="flex items-center">
                          <span className="font-medium">{supplier.contact_person}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center text-slate-500">
                          <Mail className="w-3 h-3 mr-1" />
                          {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center text-slate-500">
                          <Phone className="w-3 h-3 mr-1" />
                          {supplier.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(supplier.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(supplier)}
                        className="text-slate-600 hover:text-slate-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.supplier_id)}
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
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {!editingSupplier && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Initial Balance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.initial_balance}
                        onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                  )}

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
                      setEditingSupplier(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createSupplierMutation.isLoading || updateSupplierMutation.isLoading
                      ? 'Saving...'
                      : editingSupplier
                      ? 'Update Supplier'
                      : 'Create Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">Supplier Details</h3>
                <button
                  onClick={() => setViewingSupplier(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Supplier Name</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.supplier_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Contact Person</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.contact_person || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.email || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.phone || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Current Balance</label>
                    <p className="text-sm text-slate-900 font-medium">
                      {formatCurrency(viewingSupplier.currentBalance || 0)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Credit Limit</label>
                    <p className="text-sm text-slate-900">
                      {viewingSupplier.credit_limit ? formatCurrency(viewingSupplier.credit_limit) : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">GST Number</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.gst_number || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">PAN Number</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.pan_number || 'N/A'}</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address</label>
                    <p className="text-sm text-slate-900">
                      {viewingSupplier.address || 'N/A'}
                      {viewingSupplier.city && `, ${viewingSupplier.city}`}
                      {viewingSupplier.state && `, ${viewingSupplier.state}`}
                      {viewingSupplier.pincode && ` - ${viewingSupplier.pincode}`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Payment Terms</label>
                    <p className="text-sm text-slate-900">{viewingSupplier.payment_terms || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(viewingSupplier.is_active)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingSupplier(null)}
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

export default AdminSuppliers;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  FileText,
  Calendar
} from 'lucide-react';
import { purchaseOrdersAPI, projectsAPI, suppliersAPI } from '../services/api';

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  project?: {
    name: string;
  } | null;
  supplier: {
    supplier_name: string;
    contact_person: string;
  };
  createdBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  mrr?: {
    mrr_number: string;
  };
  po_date: string;
  expected_delivery_date?: string;
  status: 'DRAFT' | 'APPROVED' | 'PLACED' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED' | 'CLOSED';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: Array<{
    po_item_id: number;
    item: {
      item_name: string;
      item_code: string;
    };
    quantity_ordered: number;
    unit_price: number;
    total_price: number;
  }>;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    project_id: '',
    supplier_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Fetch purchase orders
  const fetchPurchaseOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.status && { status: filters.status }),
        ...(filters.project_id && { project_id: filters.project_id }),
        ...(filters.supplier_id && { supplier_id: filters.supplier_id })
      };
      
      const response = await purchaseOrdersAPI.getPurchaseOrders(params);
      setPurchaseOrders(response.data.purchaseOrders || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects and suppliers for filters
  const fetchFilterData = async () => {
    try {
      const [projectsRes, suppliersRes] = await Promise.all([
        projectsAPI.getProjects(),
        suppliersAPI.getSuppliers()
      ]);

      setProjects(projectsRes.data.projects || []);
      setSuppliers(suppliersRes.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchFilterData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPurchaseOrders(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters]);

  const handlePageChange = (page: number) => {
    fetchPurchaseOrders(page);
  };

  const handleApprove = async (poId: number) => {
    try {
      await purchaseOrdersAPI.approvePurchaseOrder(poId);
      fetchPurchaseOrders(pagination.currentPage);
    } catch (error) {
      console.error('Error approving purchase order:', error);
    }
  };

  const handlePlaceOrder = async (poId: number) => {
    try {
      await purchaseOrdersAPI.placeOrder(poId);
      fetchPurchaseOrders(pagination.currentPage);
      alert('Purchase Order placed successfully! Supplier has been notified via WhatsApp.');
    } catch (error) {
      console.error('Error placing purchase order:', error);
      alert('Error placing purchase order. Please try again.');
    }
  };

  const handleCancel = async (poId: number) => {
    try {
      await purchaseOrdersAPI.cancelPurchaseOrder(poId);
      fetchPurchaseOrders(pagination.currentPage);
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      APPROVED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      PLACED: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      ACKNOWLEDGED: { color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle },
      PARTIALLY_RECEIVED: { color: 'bg-orange-100 text-orange-800', icon: Truck },
      FULLY_RECEIVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      CLOSED: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const clearFilters = () => {
    setFilters({ status: '', project_id: '', supplier_id: '' });
    setSearchTerm('');
  };

  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-lg text-slate-600 mt-2">Manage purchase orders and track deliveries</p>
        </div>
        <Link
          to="/purchase-orders/create"
          className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Purchase Order
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PO number, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input pl-12 pr-4"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-slate-200/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Status Filter */}
              <div>
                <label className="label">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PLACED">Placed</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="FULLY_RECEIVED">Fully Received</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="label">Project</label>
                <select
                  value={filters.project_id}
                  onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
                  className="input"
                >
                  <option value="">All Projects</option>
                  <option value="null">No Project</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="label">Supplier</label>
                <select
                  value={filters.supplier_id}
                  onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
                  className="input"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={clearFilters}
                className="btn btn-ghost text-sm"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="notification notification-error">
          <div className="flex">
            <XCircle className="h-5 w-5 text-danger-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-danger-800">Error</h3>
              <div className="mt-2 text-sm text-danger-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.po_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{po.po_number}</div>
                      {po.mrr && (
                        <div className="text-xs text-slate-500">From MRR: {po.mrr.mrr_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {po.project?.name || 'No Project'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{po.supplier.supplier_name}</div>
                      <div className="text-xs text-slate-500">{po.supplier.contact_person}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(po.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-slate-900">
                        {new Date(po.po_date).toLocaleDateString()}
                      </div>
                      {po.expected_delivery_date && (
                        <div className="text-xs text-slate-500">
                          Expected: {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">
                      ₹{po.total_amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {po.items.length} items
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <Link
                        to={`/purchase-orders/${po.po_id}`}
                        className="btn btn-sm btn-ghost p-2"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {po.status === 'DRAFT' && (
                        <Link
                          to={`/purchase-orders/${po.po_id}/edit`}
                          className="btn btn-sm btn-secondary p-2"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      {po.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprove(po.po_id)}
                          className="btn btn-sm btn-success p-2"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {po.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePlaceOrder(po.po_id)}
                          className="btn btn-sm btn-primary p-2"
                          title="Place Order"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                      {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
                        <button
                          onClick={() => handleCancel(po.po_id)}
                          className="btn btn-sm btn-danger p-2"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {purchaseOrders.length === 0 && !loading && (
          <div className="card p-12">
            <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No purchase orders</h3>
            <p className="text-slate-600 max-w-md mx-auto mb-8">
              Get started by creating a new purchase order to manage your procurement workflow.
            </p>
            <Link
              to="/purchase-orders/create"
              className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Purchase Order
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-t border-slate-200/50">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Showing{' '}
                  <span className="font-semibold text-slate-900">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-900">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-900">{pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                        page === pagination.currentPage
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrders;
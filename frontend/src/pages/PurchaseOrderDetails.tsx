import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Printer,
  Eye
} from 'lucide-react';
import { purchaseOrdersAPI } from '../services/api';

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  project: {
    project_id: number;
    name: string;
  };
  supplier: {
    supplier_id: number;
    supplier_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  approvedBy?: {
    name: string;
    email: string;
  };
  mrr?: {
    mrr_id: number;
    mrr_number: string;
  };
  po_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'DRAFT' | 'APPROVED' | 'PLACED' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED' | 'CLOSED';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  notes?: string;
  approved_at?: string;
  items: Array<{
    po_item_id: number;
    item: {
      item_id: number;
      item_name: string;
      item_code: string;
    };
    quantity_ordered: number;
    quantity_received: number;
    unit: {
      unit_id: number;
      unit_name: string;
      unit_symbol: string;
    };
    unit_price: number;
    total_price: number;
    specifications?: string;
  }>;
  created_at: string;
  updated_at: string;
}

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Helper function to safely convert to number
  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await purchaseOrdersAPI.getPurchaseOrder(parseInt(id!));
      console.log('API Response:', response.data);
      console.log('Purchase Order Data:', response.data.purchaseOrder);
      setPurchaseOrder(response.data.purchaseOrder);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      setError('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading('approve');
      await purchaseOrdersAPI.approvePurchaseOrder(parseInt(id!));
      await fetchPurchaseOrder();
    } catch (error) {
      console.error('Error approving purchase order:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) {
      return;
    }

    try {
      setActionLoading('cancel');
      await purchaseOrdersAPI.cancelPurchaseOrder(parseInt(id!));
      await fetchPurchaseOrder();
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    // Safety check for undefined/null status
    if (!status) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <span className="mr-1">❓</span>
          Unknown Status
        </span>
      );
    }

    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: '📄' },
      APPROVED: { color: 'bg-blue-100 text-blue-800', icon: '✅' },
      PLACED: { color: 'bg-indigo-100 text-indigo-800', icon: '📤' },
      SENT: { color: 'bg-blue-100 text-blue-800', icon: '📤' },
      ACKNOWLEDGED: { color: 'bg-yellow-100 text-yellow-800', icon: '✅' },
      PARTIALLY_RECEIVED: { color: 'bg-orange-100 text-orange-800', icon: '🚚' },
      FULLY_RECEIVED: { color: 'bg-green-100 text-green-800', icon: '✅' },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: '❌' },
      CLOSED: { color: 'bg-purple-100 text-purple-800', icon: '🔒' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      color: 'bg-gray-100 text-gray-800', 
      icon: '❓' 
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    console.log('Error or no purchase order:', { error, purchaseOrder });
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || 'Purchase order not found'}</div>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  console.log('Rendering with purchase order:', purchaseOrder);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{purchaseOrder.po_number}</h1>
            <p className="text-gray-600">Purchase Order Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {purchaseOrder.status === 'DRAFT' && (
            <Link
              to={`/purchase-orders/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}
          {purchaseOrder.status === 'SENT' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading === 'approve'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
          )}
          {(purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'SENT') && (
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Status and Basic Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Order Information</h2>
          {getStatusBadge(purchaseOrder.status || 'UNKNOWN')}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Purchase Order</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.po_number}</p>
            {purchaseOrder.mrr && (
              <p className="text-sm text-gray-600">From MRR: {purchaseOrder.mrr?.mrr_number || 'N/A'}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Project</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.project?.name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Order Date</h3>
            <p className="text-sm text-gray-900">
              {purchaseOrder.po_date ? new Date(purchaseOrder.po_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Expected Delivery</h3>
            <p className="text-sm text-gray-900">
              {purchaseOrder.expected_delivery_date 
                ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()
                : 'Not specified'
              }
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Actual Delivery</h3>
            <p className="text-sm text-gray-900">
              {purchaseOrder.actual_delivery_date 
                ? new Date(purchaseOrder.actual_delivery_date).toLocaleDateString()
                : 'Not delivered'
              }
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Amount</h3>
            <p className="text-lg font-semibold text-gray-900">
              ₹{purchaseOrder.total_amount ? toNumber(purchaseOrder.total_amount).toLocaleString() : '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Supplier Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Company Name</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.supplier?.supplier_name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Person</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.supplier?.contact_person || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.supplier?.email || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.supplier?.phone || 'N/A'}</p>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
            <p className="text-sm text-gray-900">{purchaseOrder.supplier?.address || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      {(purchaseOrder.payment_terms || purchaseOrder.delivery_terms || purchaseOrder.notes) && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h2>
          <div className="space-y-4">
            {purchaseOrder.payment_terms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Terms</h3>
                <p className="text-sm text-gray-900">{purchaseOrder.payment_terms}</p>
              </div>
            )}
            
            {purchaseOrder.delivery_terms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Delivery Terms</h3>
                <p className="text-sm text-gray-900">{purchaseOrder.delivery_terms}</p>
              </div>
            )}
            
            {purchaseOrder.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-900">{purchaseOrder.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Items</h2>
          <Link
            to={`/purchase-orders/${id}/receipts`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Receipts
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Ordered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(purchaseOrder.items || []).map((item) => {
                const receivedPercentage = ((item.quantity_received || 0) / (item.quantity_ordered || 1)) * 100;
                const status = receivedPercentage === 0 ? 'Not Received' : 
                              receivedPercentage === 100 ? 'Fully Received' : 
                              'Partially Received';
                
                return (
                  <tr key={item.po_item_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.item?.item_name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{item.item?.item_code || 'N/A'}</div>
                        {item.specifications && (
                          <div className="text-sm text-gray-500">{item.specifications}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.quantity_ordered || 0)} {item.unit?.unit_symbol || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.quantity_received || 0)} {item.unit?.unit_symbol || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{toNumber(item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{toNumber(item.total_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'Fully Received' ? 'bg-green-100 text-green-800' :
                        status === 'Partially Received' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">₹{toNumber(purchaseOrder.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax (18%):</span>
            <span className="font-medium">₹{toNumber(purchaseOrder.tax_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total Amount:</span>
            <span>₹{toNumber(purchaseOrder.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Order History</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Created by:</span>
            <span className="text-sm text-gray-900">{purchaseOrder.createdBy?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Created on:</span>
            <span className="text-sm text-gray-900">
              {purchaseOrder.created_at ? new Date(purchaseOrder.created_at).toLocaleString() : 'N/A'}
            </span>
          </div>
          {purchaseOrder.approvedBy && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Approved by:</span>
                <span className="text-sm text-gray-900">{purchaseOrder.approvedBy?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Approved on:</span>
                <span className="text-sm text-gray-900">
                  {purchaseOrder.approved_at ? new Date(purchaseOrder.approved_at).toLocaleString() : 'N/A'}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Last updated:</span>
            <span className="text-sm text-gray-900">
              {purchaseOrder.updated_at ? new Date(purchaseOrder.updated_at).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetails;
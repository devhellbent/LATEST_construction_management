import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { purchaseOrdersAPI, materialReceiptsAPI } from '../services/api';

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  project: {
    project_id: number;
    name: string;
  };
  supplier: {
    supplier_name: string;
  };
  status: string;
  items: Array<{
    po_item_id: number;
    item: {
      item_name: string;
      item_code: string;
    };
    quantity_ordered: number;
    quantity_received: number;
    unit: {
      unit_name: string;
      unit_symbol: string;
    };
    unit_price: number;
  }>;
}

interface MaterialReceipt {
  receipt_id: number;
  receipt_number: string;
  received_date: string;
  receivedBy: {
    name: string;
  };
  supplier_delivery_note?: string;
  vehicle_number?: string;
  driver_name?: string;
  condition_status: string;
  total_items: number;
  notes?: string;
  items: Array<{
    receipt_item_id: number;
    item: {
      item_name: string;
      item_code: string;
    };
    quantity_received: number;
    unit: {
      unit_name: string;
      unit_symbol: string;
    };
    unit_price: number;
    total_price: number;
    condition_status: string;
    batch_number?: string;
    expiry_date?: string;
  }>;
  created_at: string;
}

const PurchaseOrderReceipts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [receipts, setReceipts] = useState<MaterialReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    supplier_delivery_note: '',
    vehicle_number: '',
    driver_name: '',
    condition_status: 'GOOD',
    notes: ''
  });

  const [receiptItems, setReceiptItems] = useState<Array<{
    po_item_id: number;
    item_id: number;
    quantity_received: number;
    unit_id: number;
    unit_price: number;
    total_price: number;
    condition_status: 'GOOD' | 'DAMAGED' | 'REJECTED';
    batch_number: string;
    expiry_date: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [poResponse, receiptsResponse] = await Promise.all([
        purchaseOrdersAPI.getPurchaseOrder(parseInt(id!)),
        purchaseOrdersAPI.getPurchaseOrder(parseInt(id!)).then(() => 
          materialReceiptsAPI.getReceipts({ po_id: id })
        )
      ]);

      setPurchaseOrder(poResponse.data);
      
      // Initialize receipt items from PO items
      const initialItems = poResponse.data.items.map((item: any) => ({
        po_item_id: item.po_item_id,
        item_id: item.item.item_id,
        quantity_received: 0,
        unit_id: item.unit.unit_id,
        unit_price: item.unit_price,
        total_price: 0,
        condition_status: 'GOOD' as const,
        batch_number: '',
        expiry_date: '',
        notes: ''
      }));
      
      setReceiptItems(initialItems);
      
      // Set receipts if the API call was successful
      if (receiptsResponse?.data?.receipts) {
        setReceipts(receiptsResponse.data.receipts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load purchase order data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateReceiptItem = (index: number, field: string, value: any) => {
    setReceiptItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Calculate total price when quantity or unit price changes
      if (field === 'quantity_received' || field === 'unit_price') {
        updated[index].total_price = updated[index].quantity_received * updated[index].unit_price;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = receiptItems.filter(item => item.quantity_received > 0);
    
    if (validItems.length === 0) {
      setError('Please specify quantities for at least one item');
      return;
    }

    try {
      setFormLoading(true);
      setError(null);

      const receiptData = {
        ...formData,
        po_id: parseInt(id!),
        project_id: purchaseOrder!.project?.project_id || null,
        items: validItems
      };

      await materialReceiptsAPI.createReceipt(receiptData);
      
      setShowCreateForm(false);
      setFormData({
        received_date: new Date().toISOString().split('T')[0],
        supplier_delivery_note: '',
        vehicle_number: '',
        driver_name: '',
        condition_status: 'GOOD',
        notes: ''
      });
      
      // Reset receipt items
      const resetItems = purchaseOrder!.items.map((item: any) => ({
        po_item_id: item.po_item_id,
        item_id: item.item.item_id,
        quantity_received: 0,
        unit_id: item.unit.unit_id,
        unit_price: item.unit_price,
        total_price: 0,
        condition_status: 'GOOD' as const,
        batch_number: '',
        expiry_date: '',
        notes: ''
      }));
      setReceiptItems(resetItems);
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating receipt:', error);
      setError('Failed to create material receipt');
    } finally {
      setFormLoading(false);
    }
  };

  const getConditionBadge = (status: string) => {
    const statusConfig = {
      GOOD: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      DAMAGED: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/purchase-orders/${id}`)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Material Receipts</h1>
            <p className="text-gray-600">PO: {purchaseOrder.po_number} - {purchaseOrder.project.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Receipt
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Receipt Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create Material Receipt</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="received_date"
                  value={formData.received_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Condition
                </label>
                <select
                  name="condition_status"
                  value={formData.condition_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Delivery Note
                </label>
                <input
                  type="text"
                  name="supplier_delivery_note"
                  value={formData.supplier_delivery_note}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  name="driver_name"
                  value={formData.driver_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Items Received</h3>
              <div className="space-y-4">
                {receiptItems.map((item, index) => {
                  const poItem = purchaseOrder.items.find(pi => pi.po_item_id === item.po_item_id);
                  if (!poItem) return null;

                  const maxQuantity = poItem.quantity_ordered - poItem.quantity_received;

                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item
                          </label>
                          <div className="text-sm text-gray-900">
                            {poItem.item.item_name} ({poItem.item.item_code})
                          </div>
                          <div className="text-sm text-gray-500">
                            Ordered: {poItem.quantity_ordered} {poItem.unit.unit_symbol} | 
                            Received: {poItem.quantity_received} {poItem.unit.unit_symbol} | 
                            Pending: {maxQuantity} {poItem.unit.unit_symbol}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Received
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={maxQuantity}
                            value={item.quantity_received}
                            onChange={(e) => updateReceiptItem(index, 'quantity_received', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateReceiptItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Condition
                          </label>
                          <select
                            value={item.condition_status}
                            onChange={(e) => updateReceiptItem(index, 'condition_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Price
                          </label>
                          <input
                            type="text"
                            value={`₹${item.total_price.toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => updateReceiptItem(index, 'batch_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => updateReceiptItem(index, 'expiry_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateReceiptItem(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the receipt..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipts List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Material Receipts</h2>
        </div>

        {receipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No receipts found for this purchase order.</div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Receipt
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.receipt_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{receipt.receipt_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(receipt.received_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{receipt.receivedBy.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{receipt.total_items} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConditionBadge(receipt.condition_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderReceipts;
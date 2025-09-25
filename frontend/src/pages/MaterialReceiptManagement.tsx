import React, { useState, useEffect } from 'react';
import { 
  purchaseOrdersAPI, 
  materialReceiptsAPI,
  projectsAPI 
} from '../services/api';

interface PurchaseOrder {
  po_id: number;
  po_reference_id: string;
  supplier_id: number;
  supplier_name: string;
  project_id: number;
  project_name: string;
  po_date: string;
  expected_delivery_date: string;
  status: string;
  items: Array<{
    po_item_id: number;
    item_id: number;
    item_name: string;
    quantity_ordered: number;
    unit_price: number;
    unit_id: number;
    unit_name: string;
    total_amount: number;
    quantity_received?: number;
  }>;
}

interface ReceiptFormData {
  po_id: number;
  project_id: number;
  receipt_date: string;
  received_by: string;
  notes: string;
  items: Array<{
    po_item_id: number;
    item_id: number;
    quantity_received: number;
    unit_id: number;
    quality_status: 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
    remarks: string;
  }>;
}

const MaterialReceiptManagement: React.FC = () => {
  const [pendingPos, setPendingPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ReceiptFormData>({
    po_id: 0,
    project_id: 0,
    receipt_date: new Date().toISOString().split('T')[0],
    received_by: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadPendingPos();
  }, []);

  const loadPendingPos = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersAPI.getPurchaseOrders({ 
        status: 'APPROVED',
        include_items: true,
        include_supplier: true,
        include_project: true
      });
      
      setPendingPos(response.data.purchaseOrders || []);
    } catch (error) {
      console.error('Error loading pending POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPo = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setFormData({
      po_id: po.po_id,
      project_id: po.project_id,
      receipt_date: new Date().toISOString().split('T')[0],
      received_by: '',
      notes: '',
      items: po.items.map(item => ({
        po_item_id: item.po_item_id,
        item_id: item.item_id,
        quantity_received: item.quantity_ordered,
        unit_id: item.unit_id || 1,
        quality_status: 'GOOD' as const,
        remarks: ''
      }))
    });
    setShowReceiptForm(true);
  };

  const updateItemReceipt = (poItemId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.po_item_id === poItemId 
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const handleCreateReceipt = async () => {
    if (!formData.received_by || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await materialReceiptsAPI.createReceipt({
        ...formData,
        po_id: formData.po_id,
        project_id: formData.project_id,
        receipt_date: formData.receipt_date,
        items: formData.items.filter(item => item.quantity_received > 0)
      });

      alert('Material receipt recorded successfully!');
      setShowReceiptForm(false);
      setSelectedPo(null);
      loadPendingPos();
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert('Error recording material receipt');
    } finally {
      setLoading(false);
    }
  };

  if (loading && pendingPos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Material Receipt Management</h1>
        <p className="text-gray-600 mt-2">Record material receipts from suppliers based on purchase orders</p>
      </div>

      {!showReceiptForm ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Purchase Orders</h2>
            
            {pendingPos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No pending purchase orders available for receipt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPos.map((po) => (
                  <div key={po.po_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {po.po_reference_id}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            APPROVED
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">Supplier: {po.supplier_name}</p>
                        <p className="text-gray-600 mb-1">Project: {po.project_name}</p>
                        <p className="text-gray-600 mb-3">
                          Expected Delivery: {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {po.items.map((item) => (
                            <div key={item.po_item_id} className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <p>Ordered: {item.quantity_ordered} {item.unit_name}</p>
                                <p>Price: ₹{item.unit_price}/{item.unit_name}</p>
                                <p className="font-medium">Total: ₹{item.total_amount}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleSelectPo(po)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Record Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Record Material Receipt - {selectedPo?.po_reference_id}
            </h2>
            <button
              onClick={() => setShowReceiptForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateReceipt(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By *
                </label>
                <input
                  type="text"
                  value={formData.received_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_by: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Store Incharge name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Date
                </label>
                <input
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Received</h3>
              <div className="space-y-4">
                {formData.items.map((item) => {
                  const poItem = selectedPo?.items.find(i => i.po_item_id === item.po_item_id);
                  return (
                    <div key={item.po_item_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{poItem?.item_name}</h4>
                          <p className="text-sm text-gray-600">
                            Ordered: {poItem?.quantity_ordered} {poItem?.unit_name}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Received
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={poItem?.quantity_ordered || 0}
                            value={item.quantity_received}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'quantity_received', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quality Status
                          </label>
                          <select
                            value={item.quality_status}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'quality_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="DEFECTIVE">Defective</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'remarks', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Quality notes"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Additional notes about the receipt..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowReceiptForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Record Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MaterialReceiptManagement;

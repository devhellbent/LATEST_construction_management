import React, { useState, useEffect } from 'react';
import { 
  purchaseOrdersAPI, 
  materialReceiptsAPI,
  projectsAPI,
  materialManagementAPI
} from '../services/api';

interface PurchaseOrder {
  po_id: number;
  po_reference_id: string;
  supplier_id: number;
  supplier_name?: string; // Direct field (fallback)
  supplier?: {
    supplier_name: string;
    contact_person?: string;
  };
  project_id: number;
  project_name?: string; // Direct field (fallback)
  project?: {
    name: string;
    description?: string;
  };
  po_date: string;
  expected_delivery_date: string;
  status: string;
  items: Array<{
    po_item_id: number;
    item_id: number;
    item_name?: string; // Direct field (fallback)
    item_code?: string; // Direct field (fallback)
    quantity_ordered: number;
    unit_price: number;
    unit_id: number;
    unit_name?: string; // Direct field (fallback)
    total_amount: number;
    quantity_received?: number;
    item?: {
      item_name: string;
      item_code: string;
    };
    unit?: {
      unit_name: string;
      unit_symbol: string;
    };
  }>;
}

interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  address: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface ReceiptFormData {
  po_id: number;
  project_id: number;
  received_date: string;
  delivery_date: string;
  received_by: string;
  supplier_delivery_note: string;
  vehicle_number: string;
  driver_name: string;
  condition_status: 'GOOD' | 'DAMAGED' | 'PARTIAL' | 'REJECTED';
  notes: string;
  delivery_notes: string;
  warehouse_id: number;
  items: Array<{
    po_item_id: number;
    item_id: number;
    quantity_received: number;
    unit_id: number;
    unit_price: number;
    condition_status: 'GOOD' | 'DAMAGED' | 'REJECTED';
    batch_number: string;
    expiry_date: string;
    notes: string;
    receipt_item_id?: number; // Optional for new items
  }>;
}

const MaterialReceiptManagement: React.FC = () => {
  const [pendingPos, setPendingPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingReceipts, setExistingReceipts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState<ReceiptFormData>({
    po_id: 0,
    project_id: 0,
    received_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    received_by: '',
    supplier_delivery_note: '',
    vehicle_number: '',
    driver_name: '',
    condition_status: 'GOOD',
    notes: '',
    delivery_notes: '',
    warehouse_id: 0,
    items: []
  });

  useEffect(() => {
    loadPendingPos();
    loadExistingReceipts();
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const response = await materialManagementAPI.getWarehouses();
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadExistingReceipts = async () => {
    try {
      const response = await materialReceiptsAPI.getReceipts({});
      setExistingReceipts(response.data.receipts || []);
    } catch (error) {
      console.error('Error loading existing receipts:', error);
    }
  };

  const loadPendingPos = async () => {
    setLoading(true);
    try {
      // Load POs with status APPROVED or PLACED that have material receipts
      const response = await purchaseOrdersAPI.getPurchaseOrders({ 
        status: ['APPROVED', 'PLACED'],
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
    // Check if there's an existing receipt for this PO
    const existingReceipt = existingReceipts.find(receipt => receipt.po_id === po.po_id);
    
    // Don't open form for verified receipts
    if (existingReceipt?.status === 'APPROVED') {
      alert('This receipt has already been verified and cannot be modified.');
      return;
    }
    
    setSelectedPo(po);
    
    if (existingReceipt) {
      // Load existing receipt data
      setFormData({
        po_id: po.po_id,
        project_id: po.project_id,
        received_date: existingReceipt.received_date,
        delivery_date: existingReceipt.delivery_date || '',
        received_by: existingReceipt.receivedBy?.name || '',
        supplier_delivery_note: existingReceipt.supplier_delivery_note || '',
        vehicle_number: existingReceipt.vehicle_number || '',
        driver_name: existingReceipt.driver_name || '',
        condition_status: existingReceipt.condition_status || 'GOOD',
        notes: existingReceipt.notes || '',
        delivery_notes: existingReceipt.delivery_notes || '',
        warehouse_id: existingReceipt.warehouse_id || 0,
        items: existingReceipt.items?.map((item: any) => ({
          po_item_id: item.po_item_id,
          item_id: item.item_id,
          quantity_received: item.quantity_received,
          unit_id: item.unit_id || 1,
          unit_price: item.unit_price || 0,
          condition_status: item.condition_status || 'GOOD' as const,
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
          notes: item.notes || '',
          receipt_item_id: item.receipt_item_id // Include receipt_item_id for existing items
        })) || []
      });
    } else {
      // Create new receipt form
      setFormData({
        po_id: po.po_id,
        project_id: po.project_id,
        received_date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        received_by: '',
        supplier_delivery_note: '',
        vehicle_number: '',
        driver_name: '',
        condition_status: 'GOOD',
        notes: '',
        delivery_notes: '',
        warehouse_id: 0,
        items: po.items.map(item => ({
          po_item_id: item.po_item_id,
          item_id: item.item_id,
          quantity_received: item.quantity_ordered,
          unit_id: item.unit_id || 1,
          unit_price: item.unit_price || 0,
          condition_status: 'GOOD' as const,
          batch_number: '',
          expiry_date: '',
          notes: '',
          receipt_item_id: undefined // New items don't have receipt_item_id yet
        }))
      });
    }
    
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
      // Check if this is verification, update, or new creation
      const existingReceipt = existingReceipts.find(receipt => receipt.po_id === formData.po_id);
      
      if (existingReceipt?.status === 'PENDING' || existingReceipt?.status === 'RECEIVED') {
        // Verify pending/received receipt - this will update inventory
        const verificationData = {
          verification_notes: formData.notes,
          items: formData.items
            .filter(item => item.quantity_received > 0)
            .map(item => ({
              receipt_item_id: item.receipt_item_id || item.po_item_id, // Use po_item_id as fallback
              verified_quantity: item.quantity_received,
              verification_notes: item.notes
            }))
        };
        
        await materialReceiptsAPI.verifyReceipt(existingReceipt.receipt_id, verificationData);
        alert('Material receipt verified successfully! Inventory has been updated.');
      } else if (existingReceipt) {
        // Update existing receipt - this should NOT update inventory
        // Use the receive endpoint to update quantities without updating inventory
        const receiveData = {
          items: formData.items
            .filter(item => item.quantity_received > 0)
            .map(item => ({
              receipt_item_id: item.receipt_item_id || item.po_item_id,
              quantity_actually_received: item.quantity_received,
              received_condition: item.condition_status,
              received_notes: item.notes
            })),
          notes: formData.notes
        };
        
        await materialReceiptsAPI.updateReceiptReceive(existingReceipt.receipt_id, receiveData);
        alert('Material receipt updated successfully! Inventory will be updated when verified.');
      } else {
        // Create new receipt - this should NOT update inventory
        await materialReceiptsAPI.createReceipt({
          ...formData,
          po_id: formData.po_id,
          project_id: formData.project_id,
          received_date: formData.received_date,
          delivery_date: formData.delivery_date,
          items: formData.items.filter(item => item.quantity_received > 0)
        });
        alert('Material receipt created successfully! Inventory will be updated when verified.');
      }

      setShowReceiptForm(false);
      setSelectedPo(null);
      loadPendingPos();
      loadExistingReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving material receipt. Please try again.');
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
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            PO ID: {po.po_id}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            po.status === 'PLACED' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {po.status}
                          </span>
                          {existingReceipts.find(receipt => receipt.po_id === po.po_id) && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (() => {
                                const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                                if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
                                if (status === 'RECEIVED') return 'bg-blue-100 text-blue-800';
                                return 'bg-green-100 text-green-800';
                              })()
                            }`}>
                              {(() => {
                                const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                                if (status === 'PENDING') return 'PENDING VERIFICATION';
                                if (status === 'RECEIVED') return 'RECEIVED - PENDING VERIFICATION';
                                return 'VERIFIED';
                              })()}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-1">
                          <span className="font-medium">Supplier:</span> {po.supplier?.supplier_name || po.supplier_name || 'N/A'}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <span className="font-medium">Project:</span> {po.project?.name || po.project_name || 'N/A'}
                        </p>
                        <p className="text-gray-600 mb-3">
                          Expected Delivery: {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {po.items.map((item) => (
                            <div key={item.po_item_id} className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-900">{item.item?.item_name || item.item_name || 'Unknown Item'}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <p>Ordered: {item.quantity_ordered} {item.unit?.unit_name || item.unit_name}</p>
                                <p>Price: ₹{item.unit_price}/{item.unit?.unit_name || item.unit_name}</p>
                                <p className="font-medium">Total: ₹{item.total_amount}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleSelectPo(po)}
                          disabled={existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status === 'APPROVED'}
                          className={`px-4 py-2 text-white rounded-lg transition-colors ${
                            (() => {
                              const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                              if (status === 'APPROVED') return 'bg-gray-400 cursor-not-allowed';
                              if (status === 'PENDING' || status === 'RECEIVED') return 'bg-orange-600 hover:bg-orange-700';
                              if (existingReceipts.find(receipt => receipt.po_id === po.po_id)) return 'bg-purple-600 hover:bg-purple-700';
                              return 'bg-blue-600 hover:bg-blue-700';
                            })()
                          }`}
                        >
                          {(() => {
                            const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                            if (status === 'APPROVED') return '✓ Verified';
                            if (status === 'PENDING' || status === 'RECEIVED') return 'Verify Receipt';
                            if (existingReceipts.find(receipt => receipt.po_id === po.po_id)) return 'Update Receipt';
                            return 'Record Receipt';
                          })()}
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
              {(() => {
                const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                if (existingReceipt?.status === 'PENDING') {
                  return 'Verify Material Receipt';
                } else if (existingReceipt) {
                  return 'Update Material Receipt';
                } else {
                  return 'Record Material Receipt';
                }
              })()} - {selectedPo?.po_reference_id}
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
                  Received Date *
                </label>
                <input
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Delivery Note
                </label>
                <input
                  type="text"
                  value={formData.supplier_delivery_note}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_delivery_note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Delivery note number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Vehicle registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Driver name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse *
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      {warehouse.warehouse_name} - {warehouse.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Condition Status
                </label>
                <select
                  value={formData.condition_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition_status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="REJECTED">Rejected</option>
                </select>
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
                          <h4 className="font-medium text-gray-900">{poItem?.item?.item_name || poItem?.item_name || 'Unknown Item'}</h4>
                          <p className="text-sm text-gray-600">
                            Ordered: {poItem?.quantity_ordered} {poItem?.unit?.unit_name || poItem?.unit_name}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            Vendor: {selectedPo?.supplier?.supplier_name || selectedPo?.supplier_name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Item Code: {poItem?.item?.item_code || poItem?.item_code || 'N/A'}
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
                            Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Condition Status
                          </label>
                          <select
                            value={item.condition_status}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'condition_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'batch_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Batch/Lot number"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'expiry_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Quality notes and remarks"
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

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Notes
              </label>
              <textarea
                value={formData.delivery_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Notes about delivery conditions..."
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
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  (() => {
                    const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                    if (existingReceipt?.status === 'PENDING' || existingReceipt?.status === 'RECEIVED') {
                      return 'bg-orange-600 hover:bg-orange-700';
                    } else if (existingReceipt) {
                      return 'bg-purple-600 hover:bg-purple-700';
                    } else {
                      return 'bg-blue-600 hover:bg-blue-700';
                    }
                  })()
                }`}
              >
                {loading ? 'Processing...' : (() => {
                  const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                  if (existingReceipt?.status === 'PENDING' || existingReceipt?.status === 'RECEIVED') {
                    return 'Verify Receipt';
                  } else if (existingReceipt) {
                    return 'Update Receipt';
                  } else {
                    return 'Record Receipt';
                  }
                })()}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MaterialReceiptManagement;

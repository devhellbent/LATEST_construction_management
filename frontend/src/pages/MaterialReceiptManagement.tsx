import React, { useState, useEffect } from 'react';
import SearchableDropdown from '../components/SearchableDropdown';
import { sizesAPI } from '../services/api';
import { 
  purchaseOrdersAPI, 
  materialReceiptsAPI,
  projectsAPI,
  materialManagementAPI
} from '../services/api';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  X,
  FileText,
  Calendar,
  User,
  MapPin,
  Car,
  ClipboardList
} from 'lucide-react';

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
    cgst_rate?: number;
    sgst_rate?: number;
    igst_rate?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    size?: string;
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
          receipt_item_id: item.receipt_item_id, // Include receipt_item_id for existing items
          cgst_rate: item.cgst_rate || 0,
          sgst_rate: item.sgst_rate || 0,
          igst_rate: item.igst_rate || 0,
          cgst_amount: item.cgst_amount || 0,
          sgst_amount: item.sgst_amount || 0,
          igst_amount: item.igst_amount || 0,
          size: item.size || ''
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
          receipt_item_id: undefined, // New items don't have receipt_item_id yet
          cgst_rate: (item as any).cgst_rate || 0,
          sgst_rate: (item as any).sgst_rate || 0,
          igst_rate: (item as any).igst_rate || 0,
          cgst_amount: (item as any).cgst_amount || 0,
          sgst_amount: (item as any).sgst_amount || 0,
          igst_amount: (item as any).igst_amount || 0,
          size: (item as any).size || ''
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
        <div className="loading-spinner h-12 w-12"></div>
        <p className="text-slate-600 font-medium ml-4">Loading purchase orders...</p>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="text-center lg:text-left">
        <h1 className="text-responsive-3xl font-bold text-slate-900">Material Receipt Management</h1>
        <p className="text-responsive-base text-slate-600 mt-2">Record material receipts from suppliers based on purchase orders</p>
      </div>

      {!showReceiptForm ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base sm:text-2xl font-bold text-slate-900">Pending Purchase Orders</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Select a purchase order to record material receipt</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            
            {pendingPos.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Package className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Pending Purchase Orders</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No purchase orders are available for material receipt recording at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {pendingPos.map((po) => (
                  <div key={po.po_id} className="card-interactive p-4 sm:p-6 group">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                          <h3 className="text-base sm:text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                            {po.po_reference_id}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="status-badge status-secondary text-xs">
                              PO ID: {po.po_id}
                            </span>
                            <span className={`status-badge ${
                              po.status === 'PLACED' ? 'status-active' : 'status-success'
                            } text-xs`}>
                              {po.status}
                            </span>
                            {existingReceipts.find(receipt => receipt.po_id === po.po_id) && (
                              <span className={`status-badge ${
                                (() => {
                                  const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                                  if (status === 'PENDING') return 'status-warning';
                                  if (status === 'RECEIVED') return 'status-active';
                                  return 'status-success';
                                })()
                              } text-xs`}>
                                {(() => {
                                  const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                                  if (status === 'PENDING') return 'PENDING VERIFICATION';
                                  if (status === 'RECEIVED') return 'RECEIVED - PENDING VERIFICATION';
                                  return 'VERIFIED';
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-slate-900">Supplier</p>
                              <p className="text-xs sm:text-sm text-slate-600">{po.supplier?.supplier_name || po.supplier_name || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-slate-900">Project</p>
                              <p className="text-xs sm:text-sm text-slate-600">{po.project?.name || po.project_name || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-slate-900">Expected Delivery</p>
                              <p className="text-xs sm:text-sm text-slate-600">{new Date(po.expected_delivery_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {po.items.map((item) => (
                            <div key={item.po_item_id} className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                              <h4 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{item.item?.item_name || item.item_name || 'Unknown Item'}</h4>
                              <div className="space-y-1 text-xs sm:text-sm text-slate-600">
                                <p><span className="font-medium">Ordered:</span> {item.quantity_ordered} {item.unit?.unit_name || item.unit_name}</p>
                                <p><span className="font-medium">Price:</span> ₹{item.unit_price}/{item.unit?.unit_name || item.unit_name}</p>
                                <p className="font-bold text-slate-900">Total: ₹{item.total_amount}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto sm:ml-6">
                        <button
                          onClick={() => handleSelectPo(po)}
                          disabled={existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status === 'APPROVED'}
                          className={`btn btn-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto ${
                            (() => {
                              const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                              if (status === 'APPROVED') return 'btn-secondary cursor-not-allowed';
                              if (status === 'PENDING' || status === 'RECEIVED') return 'btn-warning';
                              if (existingReceipts.find(receipt => receipt.po_id === po.po_id)) return 'btn-primary';
                              return 'btn-primary';
                            })()
                          }`}
                        >
                          {(() => {
                            const status = existingReceipts.find(receipt => receipt.po_id === po.po_id)?.status;
                            if (status === 'APPROVED') return (
                              <>
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Verified</span>
                              </>
                            );
                            if (status === 'PENDING' || status === 'RECEIVED') return (
                              <>
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Verify Receipt</span>
                              </>
                            );
                            if (existingReceipts.find(receipt => receipt.po_id === po.po_id)) return (
                              <>
                                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Update Receipt</span>
                              </>
                            );
                            return (
                              <>
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="text-xs sm:text-sm">Record Receipt</span>
                              </>
                            );
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
        <div className="card-mobile">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
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
              <p className="text-slate-600 mt-1 text-xs sm:text-sm">
                {(() => {
                  const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                  if (existingReceipt?.status === 'PENDING') {
                    return 'Verify and approve the material receipt to update inventory';
                  } else if (existingReceipt) {
                    return 'Update the material receipt details';
                  } else {
                    return 'Record the material receipt from supplier';
                  }
                })()}
              </p>
            </div>
            <button
              onClick={() => setShowReceiptForm(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors self-end sm:self-auto"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateReceipt(); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div>
                <label className="label label-required">
                  Received By
                </label>
                <input
                  type="text"
                  value={formData.received_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_by: e.target.value }))}
                  className="input"
                  placeholder="Store Incharge name"
                  required
                />
              </div>
              
              <div>
                <label className="label label-required">
                  Received Date
                </label>
                <input
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  Supplier Delivery Note
                </label>
                <input
                  type="text"
                  value={formData.supplier_delivery_note}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_delivery_note: e.target.value }))}
                  className="input"
                  placeholder="Delivery note number"
                />
              </div>

              <div>
                <label className="label">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  className="input"
                  placeholder="Vehicle registration number"
                />
              </div>

              <div>
                <label className="label">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                  className="input"
                  placeholder="Driver name"
                />
              </div>

              <div>
                <label className="label label-required">
                  Warehouse
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: parseInt(e.target.value) }))}
                  className="input"
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
                <label className="label">
                  Overall Condition Status
                </label>
                <select
                  value={formData.condition_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition_status: e.target.value as any }))}
                  className="input"
                >
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">Items Received</h3>
              <div className="space-y-4 sm:space-y-6">
                {formData.items.map((item) => {
                  const poItem = selectedPo?.items.find(i => i.po_item_id === item.po_item_id);
                  return (
                    <div key={item.po_item_id} className="card-mobile">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{poItem?.item?.item_name || poItem?.item_name || 'Unknown Item'}</h4>
                          <div className="space-y-1 text-xs sm:text-sm text-slate-600">
                            <p><span className="font-medium">Ordered:</span> {poItem?.quantity_ordered} {poItem?.unit?.unit_name || poItem?.unit_name}</p>
                            <p><span className="font-medium">Vendor:</span> {selectedPo?.supplier?.supplier_name || selectedPo?.supplier_name || 'N/A'}</p>
                            <p><span className="font-medium">Item Code:</span> {poItem?.item?.item_code || poItem?.item_code || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="label">
                            Quantity Received
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={poItem?.quantity_ordered || 0}
                            value={item.quantity_received}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'quantity_received', parseInt(e.target.value) || 0)}
                            className="input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            Condition Status
                          </label>
                          <select
                            value={item.condition_status}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'condition_status', e.target.value)}
                            className="input"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="label">
                            Batch Number
                          </label>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'batch_number', e.target.value)}
                            className="input"
                            placeholder="Batch/Lot number"
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'expiry_date', e.target.value)}
                            className="input"
                          />
                        </div>
                        
                        <div>
                          <SearchableDropdown
                            label="Size"
                            options={[]}
                            value={item.size || ''}
                            onChange={(value) => updateItemReceipt(item.po_item_id, 'size', value)}
                            placeholder="Select Size"
                            searchPlaceholder="Type to search sizes..."
                            className="w-full"
                            onSearch={async (q: string) => {
                              try {
                                const res = await sizesAPI.getSizes({ q, limit: 20 });
                                // Caller component filters options prop; for simple UX, user types and selects from loaded cache elsewhere.
                              } catch (e) {}
                            }}
                            emptyMessage="Type to search sizes"
                          />
                        </div>
                        
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="label">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemReceipt(item.po_item_id, 'notes', e.target.value)}
                            className="input"
                            placeholder="Quality notes and remarks"
                          />
                        </div>
                      </div>
                      
                      {/* GST Fields */}
                      <div className="mt-4">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">GST Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="label">
                              CGST Rate (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.cgst_rate || 0}
                              onChange={(e) => updateItemReceipt(item.po_item_id, 'cgst_rate', parseFloat(e.target.value) || 0)}
                              className="input"
                            />
                          </div>
                          
                          <div>
                            <label className="label">
                              SGST Rate (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.sgst_rate || 0}
                              onChange={(e) => updateItemReceipt(item.po_item_id, 'sgst_rate', parseFloat(e.target.value) || 0)}
                              className="input"
                            />
                          </div>
                          
                          <div>
                            <label className="label">
                              IGST Rate (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.igst_rate || 0}
                              onChange={(e) => updateItemReceipt(item.po_item_id, 'igst_rate', parseFloat(e.target.value) || 0)}
                              className="input"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="label">
                              CGST Amount
                            </label>
                            <input
                              type="text"
                              value={`₹${((item.cgst_rate || 0) * (item.unit_price * item.quantity_received) / 100).toFixed(2)}`}
                              readOnly
                              className="input bg-gray-50"
                            />
                          </div>
                          
                          <div>
                            <label className="label">
                              SGST Amount
                            </label>
                            <input
                              type="text"
                              value={`₹${((item.sgst_rate || 0) * (item.unit_price * item.quantity_received) / 100).toFixed(2)}`}
                              readOnly
                              className="input bg-gray-50"
                            />
                          </div>
                          
                          <div>
                            <label className="label">
                              IGST Amount
                            </label>
                            <input
                              type="text"
                              value={`₹${((item.igst_rate || 0) * (item.unit_price * item.quantity_received) / 100).toFixed(2)}`}
                              readOnly
                              className="input bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <label className="label">
                General Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input"
                rows={3}
                placeholder="Additional notes about the receipt..."
              />
            </div>

            <div className="mb-6 sm:mb-8">
              <label className="label">
                Delivery Notes
              </label>
              <textarea
                value={formData.delivery_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
                className="input"
                rows={3}
                placeholder="Notes about delivery conditions..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReceiptForm(false)}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto ${
                  (() => {
                    const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                    if (existingReceipt?.status === 'PENDING' || existingReceipt?.status === 'RECEIVED') {
                      return 'btn-warning';
                    } else if (existingReceipt) {
                      return 'btn-primary';
                    } else {
                      return 'btn-primary';
                    }
                  })()
                }`}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"></div>
                    <span className="text-xs sm:text-sm">Processing...</span>
                  </>
                ) : (
                  (() => {
                    const existingReceipt = existingReceipts.find(receipt => receipt.po_id === selectedPo?.po_id);
                    if (existingReceipt?.status === 'PENDING' || existingReceipt?.status === 'RECEIVED') {
                      return (
                        <>
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Verify Receipt</span>
                        </>
                      );
                    } else if (existingReceipt) {
                      return (
                        <>
                          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Update Receipt</span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Create Receipt</span>
                        </>
                      );
                    }
                  })()
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MaterialReceiptManagement;

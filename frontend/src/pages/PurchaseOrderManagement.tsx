import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  purchaseOrdersAPI, 
  suppliersAPI,
  projectsAPI 
} from '../services/api';

interface ApprovedMrr {
  mrr_id: number;
  mrr_reference_id: string;
  project_id: number;
  project_name: string;
  required_date: string;
  priority: string;
  items: Array<{
    item_id: number;
    item_name: string;
    quantity_requested: number;
    unit_id: number;
    unit_name: string;
    estimated_cost?: number;
  }>;
}

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
}

interface PoFormData {
  mrr_id: number;
  supplier_id: number;
  project_id: number;
  po_date: string;
  expected_delivery_date: string;
  terms_conditions: string;
  items: Array<{
    item_id: number;
    quantity_ordered: number;
    unit_price: number;
    unit_id: number;
    total_amount: number;
  }>;
}

const PurchaseOrderManagement: React.FC = () => {
  const [approvedMrrs, setApprovedMrrs] = useState<ApprovedMrr[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedMrr, setSelectedMrr] = useState<ApprovedMrr | null>(null);
  const [showPoForm, setShowPoForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PoFormData>({
    mrr_id: 0,
    supplier_id: 0,
    project_id: 0,
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    terms_conditions: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mrrsRes, suppliersRes] = await Promise.all([
        mrrAPI.getMrrs({ 
          approval_status: 'APPROVED',
          status: 'APPROVED',
          include_items: true,
          include_project: true
        }),
        suppliersAPI.getSuppliers()
      ]);

      setApprovedMrrs(mrrsRes.data.mrrs || []);
      setSuppliers(suppliersRes.data.suppliers || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMrr = (mrr: ApprovedMrr) => {
    setSelectedMrr(mrr);
    setFormData({
      mrr_id: mrr.mrr_id,
      supplier_id: 0,
      project_id: mrr.project_id,
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: mrr.required_date,
      terms_conditions: 'Payment terms: 30 days from delivery',
      items: mrr.items.map(item => ({
        item_id: item.item_id,
        quantity_ordered: item.quantity_requested,
        unit_price: 0,
        unit_id: item.unit_id || 1,
        total_amount: 0
      }))
    });
    setShowPoForm(true);
  };

  const updateItemPrice = (itemId: number, unitPrice: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.item_id === itemId 
          ? { 
              ...item, 
              unit_price: unitPrice,
              total_amount: unitPrice * item.quantity_ordered
            }
          : item
      )
    }));
  };

  const handleCreatePo = async () => {
    if (!formData.supplier_id || formData.items.some(item => item.unit_price <= 0)) {
      alert('Please select a supplier and enter prices for all items');
      return;
    }

    setLoading(true);
    try {
      await purchaseOrdersAPI.createPurchaseOrderFromMrr(formData.mrr_id, {
        supplier_id: formData.supplier_id,
        project_id: formData.project_id,
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date,
        terms_conditions: formData.terms_conditions,
        items: formData.items
      });

      alert('Purchase Order created successfully!');
      setShowPoForm(false);
      setSelectedMrr(null);
      loadData();
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Error creating Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.total_amount, 0);
  };

  if (loading && approvedMrrs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Order Management</h1>
        <p className="text-gray-600 mt-2">Create purchase orders from approved MRRs</p>
      </div>

      {!showPoForm ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Approved MRRs Ready for PO Creation</h2>
            
            {approvedMrrs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No approved MRRs available for PO creation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedMrrs.map((mrr) => (
                  <div key={mrr.mrr_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mrr.mrr_reference_id}
                          </h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            APPROVED
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mrr.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            mrr.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {mrr.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">Project: {mrr.project_name}</p>
                        <p className="text-gray-600 mb-3">Required Date: {new Date(mrr.required_date).toLocaleDateString()}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {mrr.items.map((item) => (
                            <div key={item.item_id} className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Quantity: {item.quantity_requested} {item.unit_name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleSelectMrr(mrr)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Create PO
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
              Create Purchase Order - {selectedMrr?.mrr_reference_id}
            </h2>
            <button
              onClick={() => setShowPoForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreatePo(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} - {supplier.contact_person}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PO Date
                </label>
                <input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Payment terms, delivery conditions, etc."
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items & Pricing</h3>
              <div className="space-y-4">
                {formData.items.map((item) => {
                  const mrrItem = selectedMrr?.items.find(i => i.item_id === item.item_id);
                  return (
                    <div key={item.item_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{mrrItem?.item_name}</h4>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity_ordered} {mrrItem?.unit_name}
                          </p>
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
                            onChange={(e) => updateItemPrice(item.item_id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Amount
                          </label>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                            ₹{item.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total PO Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{getTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowPoForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderManagement;

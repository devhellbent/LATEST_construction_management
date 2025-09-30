import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { purchaseOrdersAPI, projectsAPI, suppliersAPI, materialManagementAPI } from '../services/api';

interface Project {
  project_id: number;
  name: string;
}

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface Item {
  item_id: number;
  item_name: string;
  item_code: string;
  category_id: number;
  brand_id: number;
  unit_id: number;
}

interface Unit {
  unit_id: number;
  unit_name: string;
  unit_symbol: string;
}

interface ItemWithUnit extends Item {
  unit_name: string;
  unit_symbol: string;
}

interface POItem {
  po_item_id?: number;
  item_id: number;
  item_name: string;
  item_code: string;
  unit_id: number;
  unit_name: string;
  unit_symbol: string;
  quantity_ordered: number;
  unit_price: number;
  total_price: number;
  specifications?: string;
}

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  project: Project;
  supplier: Supplier;
  mrr?: {
    mrr_id: number;
    mrr_number: string;
    subwork_project_id?: number;
    subcontractor_id?: number;
  };
  po_date: string;
  expected_delivery_date?: string;
  payment_terms?: string;
  delivery_terms?: string;
  notes?: string;
  status: string;
  items: POItem[];
  subwork_project_id?: number;
  subcontractor_id?: number;
}

const EditPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemsWithUnits, setItemsWithUnits] = useState<ItemWithUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    supplier_id: '',
    po_date: '',
    expected_delivery_date: '',
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    subwork_project_id: '',
    subcontractor_id: ''
  });

  const [poItems, setPoItems] = useState<POItem[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPurchaseOrder();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const [projectsRes, suppliersRes, masterDataRes] = await Promise.all([
        projectsAPI.getProjects(),
        suppliersAPI.getSuppliers(),
        materialManagementAPI.getMasterData()
      ]);

      setProjects(projectsRes.data.projects || []);
      setSuppliers(suppliersRes.data.suppliers || []);

      // Create items with units
      const itemsWithUnitsData = (masterDataRes.data.itemMaster || []).map((item: Item) => {
        const unit = (masterDataRes.data.units || []).find((u: Unit) => u.unit_id === item.unit_id);
        return {
          ...item,
          unit_name: unit?.unit_name || '',
          unit_symbol: unit?.unit_symbol || ''
        };
      });
      setItemsWithUnits(itemsWithUnitsData);
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('Failed to load initial data. Please try again.');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchPurchaseOrder = async () => {
    if (!id) {
      setError('Purchase order ID is required');
      setInitialLoading(false);
      return;
    }

    try {
      setInitialLoading(true);
      const poId = parseInt(id);
      if (isNaN(poId)) {
        setError('Invalid purchase order ID');
        setInitialLoading(false);
        return;
      }

      const response = await purchaseOrdersAPI.getPurchaseOrder(poId);
      const po = response.data.purchaseOrder;
      
      if (!po) {
        setError('Purchase order not found');
        setInitialLoading(false);
        return;
      }

      if (!po.supplier) {
        setError('Purchase order data is incomplete');
        setInitialLoading(false);
        return;
      }
      
      setPurchaseOrder(po);
      setFormData({
        project_id: po.project?.project_id?.toString() || '',
        supplier_id: po.supplier.supplier_id?.toString() || '',
        po_date: po.po_date ? po.po_date.split('T')[0] : '',
        expected_delivery_date: po.expected_delivery_date ? po.expected_delivery_date.split('T')[0] : '',
        payment_terms: po.payment_terms || '',
        delivery_terms: po.delivery_terms || '',
        notes: po.notes || '',
        subwork_project_id: po.subwork_project_id?.toString() || '',
        subcontractor_id: po.subcontractor_id?.toString() || ''
      });

      // Convert PO items to editable format
      const editableItems = (po.items || []).map((item: any) => ({
        po_item_id: item.po_item_id,
        item_id: item.item.item_id,
        item_name: item.item.item_name,
        item_code: item.item.item_code,
        unit_id: item.unit.unit_id,
        unit_name: item.unit.unit_name,
        unit_symbol: item.unit.unit_symbol,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        total_price: item.quantity_ordered * item.unit_price,
        specifications: item.specifications || ''
      }));
      setPoItems(editableItems);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error.response?.status === 404) {
        setError('Purchase order not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this purchase order');
      } else {
        setError('Failed to load purchase order. Please try again.');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    const newItem: POItem = {
      item_id: 0,
      item_name: '',
      item_code: '',
      unit_id: 0,
      unit_name: '',
      unit_symbol: '',
      quantity_ordered: 0,
      unit_price: 0,
      total_price: 0,
      specifications: ''
    };
    setPoItems([...poItems, newItem]);
  };

  const removeItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const updatedItems = [...poItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If updating item_id, update item details
    if (field === 'item_id') {
      const selectedItem = itemsWithUnits.find(item => item.item_id === parseInt(value));
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          item_name: selectedItem.item_name,
          item_code: selectedItem.item_code,
          unit_id: selectedItem.unit_id,
          unit_name: selectedItem.unit_name,
          unit_symbol: selectedItem.unit_symbol
        };
      }
    }

    // Recalculate total price
    if (field === 'quantity_ordered' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity_ordered * updatedItems[index].unit_price;
    }

    setPoItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) {
      setError('Purchase order ID is required');
      return;
    }

    const poId = parseInt(id);
    if (isNaN(poId)) {
      setError('Invalid purchase order ID');
      return;
    }
    
    if (poItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = {
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        supplier_id: parseInt(formData.supplier_id),
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        notes: formData.notes || null,
        subwork_project_id: formData.subwork_project_id ? parseInt(formData.subwork_project_id) : null,
        subcontractor_id: formData.subcontractor_id ? parseInt(formData.subcontractor_id) : null,
        items: poItems.map(item => ({
          po_item_id: item.po_item_id,
          item_id: item.item_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          specifications: item.specifications || null
        }))
      };

      await purchaseOrdersAPI.updatePurchaseOrder(poId, submitData);
      navigate(`/purchase-orders/${id}`);
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error.response?.status === 404) {
        setError('Purchase order not found');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to edit this purchase order');
      } else {
        setError('Failed to update purchase order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/purchase-orders/${id}`);
    } else {
      navigate('/purchase-orders');
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (error && !purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => {
                setError(null);
                fetchInitialData();
                if (id) {
                  fetchPurchaseOrder();
                }
              }}
              className="btn btn-primary"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="btn btn-secondary"
            >
              Back to Purchase Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Purchase Order</h1>
              <p className="mt-2 text-gray-600">
                {purchaseOrder?.po_number}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                form="po-form"
                disabled={loading}
                className="btn btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        <form id="po-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Project</label>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Supplier</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">PO Date</label>
                <input
                  type="date"
                  name="po_date"
                  value={formData.po_date}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Expected Delivery Date</label>
                <input
                  type="date"
                  name="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Payment Terms</label>
                <input
                  type="text"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., 30 days from delivery"
                />
              </div>

              <div>
                <label className="label">Delivery Terms</label>
                <input
                  type="text"
                  name="delivery_terms"
                  value={formData.delivery_terms}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., FOB destination"
                />
              </div>

              {/* Subwork Project and Subcontractor Fields (Readonly if from MRR) */}
              {purchaseOrder?.mrr && (
                <>
                  <div>
                    <label className="label">Subwork Project</label>
                    <input
                      type="text"
                      value={formData.subwork_project_id ? projects.find(p => p.project_id === parseInt(formData.subwork_project_id))?.name || 'Unknown Project' : 'Not specified'}
                      className="input bg-gray-100"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="label">Subcontractor</label>
                    <input
                      type="text"
                      value={formData.subcontractor_id ? 'Subcontractor ID: ' + formData.subcontractor_id : 'Not specified'}
                      className="input bg-gray-100"
                      readOnly
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6">
              <label className="label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="input"
                rows={3}
                placeholder="Additional notes or comments"
              />
            </div>
          </div>

          {/* Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            {poItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {poItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="label">Item</label>
                        <select
                          value={item.item_id}
                          onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                          className="input"
                          required
                        >
                          <option value="">Select Item</option>
                          {itemsWithUnits.map(itemOption => (
                            <option key={itemOption.item_id} value={itemOption.item_id}>
                              {itemOption.item_name} ({itemOption.item_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                          className="input"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Unit Price</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="input"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Total Price</label>
                        <input
                          type="number"
                          value={item.total_price}
                          className="input bg-gray-50"
                          readOnly
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-danger w-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="label">Specifications</label>
                      <textarea
                        value={item.specifications || ''}
                        onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                        className="input"
                        rows={2}
                        placeholder="Item specifications or special requirements"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPurchaseOrder;

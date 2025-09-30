import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { purchaseOrdersAPI, projectsAPI, suppliersAPI, materialManagementAPI, mrrAPI } from '../services/api';

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
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  size?: string;
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
  component_id?: number;
}

interface Component {
  component_id: number;
  component_name: string;
  component_type?: string;
  project_id: number;
}

interface Subcontractor {
  subcontractor_id: number;
  company_name: string;
  work_type?: string;
  project_id: number;
}

interface MRR {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  project: Project;
  status: string;
}

const EditPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemsWithUnits, setItemsWithUnits] = useState<ItemWithUnit[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [mrrs, setMrrs] = useState<MRR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    mrr_id: '',
    project_id: '',
    component_id: '',
    subcontractor_id: '',
    supplier_id: '',
    po_date: '',
    expected_delivery_date: '',
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    subwork_project_id: ''
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
      const [projectsRes, suppliersRes, masterDataRes, mrrsRes] = await Promise.all([
        projectsAPI.getProjects(),
        suppliersAPI.getSuppliers(),
        materialManagementAPI.getMasterData(),
        mrrAPI.getMrrs()
      ]);

      setProjects(projectsRes.data.projects || []);
      setSuppliers(suppliersRes.data.suppliers || []);
      setMrrs(mrrsRes.data.mrrs || []);

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
        mrr_id: po.mrr?.mrr_id?.toString() || '',
        project_id: po.project?.project_id?.toString() || '',
        component_id: po.component_id?.toString() || '',
        subcontractor_id: po.subcontractor_id?.toString() || '',
        supplier_id: po.supplier.supplier_id?.toString() || '',
        po_date: po.po_date ? po.po_date.split('T')[0] : '',
        expected_delivery_date: po.expected_delivery_date ? po.expected_delivery_date.split('T')[0] : '',
        payment_terms: po.payment_terms || '',
        delivery_terms: po.delivery_terms || '',
        notes: po.notes || '',
        subwork_project_id: po.subwork_project_id?.toString() || ''
      });

      // Load components and subcontractors for the project
      if (po.project?.project_id) {
        loadComponents(po.project.project_id);
        loadSubcontractors(po.project.project_id);
      }

      // Convert PO items to editable format
      const editableItems = (po.items || []).map((item: any) => ({
        po_item_id: item.po_item_id,
        item_id: item.item.item_id,
        item_name: item.item.item_name,
        item_code: item.item.item_code,
        unit_id: item.unit.unit_id,
        unit_name: item.unit.unit_name,
        unit_symbol: item.unit.unit_symbol,
        quantity_ordered: Number(item.quantity_ordered) || 0,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || (Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0),
        specifications: item.specifications || '',
        cgst_rate: Number(item.cgst_rate) || 0,
        sgst_rate: Number(item.sgst_rate) || 0,
        igst_rate: Number(item.igst_rate) || 0,
        cgst_amount: Number(item.cgst_amount) || 0,
        sgst_amount: Number(item.sgst_amount) || 0,
        igst_amount: Number(item.igst_amount) || 0,
        size: item.size || ''
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

  const loadComponents = async (projectId: number) => {
    try {
      const response = await projectsAPI.getProjectComponents(projectId);
      setComponents(response.data.data.components || []);
    } catch (error) {
      console.error('Error loading components:', error);
      setComponents([]);
    }
  };

  const loadSubcontractors = async (projectId: number) => {
    try {
      const response = await projectsAPI.getProjectSubcontractors(projectId);
      setSubcontractors(response.data.data.subcontractors || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
      setSubcontractors([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Load components and subcontractors when project changes
    if (name === 'project_id' && value) {
      loadComponents(parseInt(value));
      loadSubcontractors(parseInt(value));
      // Clear component and subcontractor when project changes
      setFormData(prev => ({ 
        ...prev, 
        component_id: '', 
        subcontractor_id: '' 
      }));
    }
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
      specifications: '',
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      size: ''
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

    // Recalculate total price and GST amounts
    if (field === 'quantity_ordered' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity_ordered * updatedItems[index].unit_price;
      
      // Recalculate GST amounts
      const totalPrice = updatedItems[index].total_price;
      const cgstRate = updatedItems[index].cgst_rate || 0;
      const sgstRate = updatedItems[index].sgst_rate || 0;
      const igstRate = updatedItems[index].igst_rate || 0;
      
      updatedItems[index].cgst_amount = (totalPrice * cgstRate) / 100;
      updatedItems[index].sgst_amount = (totalPrice * sgstRate) / 100;
      updatedItems[index].igst_amount = (totalPrice * igstRate) / 100;
    } else if (field === 'cgst_rate' || field === 'sgst_rate' || field === 'igst_rate') {
      // Recalculate GST amounts when rates change
      const totalPrice = updatedItems[index].total_price;
      const cgstRate = field === 'cgst_rate' ? (value || 0) : (updatedItems[index].cgst_rate || 0);
      const sgstRate = field === 'sgst_rate' ? (value || 0) : (updatedItems[index].sgst_rate || 0);
      const igstRate = field === 'igst_rate' ? (value || 0) : (updatedItems[index].igst_rate || 0);
      
      updatedItems[index].cgst_amount = (totalPrice * cgstRate) / 100;
      updatedItems[index].sgst_amount = (totalPrice * sgstRate) / 100;
      updatedItems[index].igst_amount = (totalPrice * igstRate) / 100;
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
        mrr_id: formData.mrr_id ? parseInt(formData.mrr_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        component_id: formData.component_id ? parseInt(formData.component_id) : null,
        subcontractor_id: formData.subcontractor_id ? parseInt(formData.subcontractor_id) : null,
        supplier_id: parseInt(formData.supplier_id),
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        notes: formData.notes || null,
        subwork_project_id: formData.subwork_project_id ? parseInt(formData.subwork_project_id) : null,
        items: poItems.map(item => ({
          po_item_id: item.po_item_id,
          item_id: item.item_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          specifications: item.specifications || null,
          cgst_rate: item.cgst_rate || 0,
          sgst_rate: item.sgst_rate || 0,
          igst_rate: item.igst_rate || 0,
          cgst_amount: item.cgst_amount || 0,
          sgst_amount: item.sgst_amount || 0,
          igst_amount: item.igst_amount || 0,
          size: item.size || null
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
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MRR (Optional)
                </label>
                <select
                  name="mrr_id"
                  value={formData.mrr_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select MRR (Optional)</option>
                  {mrrs.filter(mrr => mrr.status === 'APPROVED').map((mrr) => (
                    <option key={mrr.mrr_id} value={mrr.mrr_id}>
                      {mrr.mrr_number} - {mrr.project?.name || 'Unknown Project'}
                    </option>
                  ))}
                </select>
                {formData.mrr_id && (
                  <p className="mt-1 text-sm text-gray-500">MRR selected from purchase order</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Project (Optional)</option>
                  {projects.map(project => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {formData.project_id && (
                  <p className="mt-1 text-sm text-gray-500">Project selected from purchase order</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Component
                </label>
                <select
                  name="component_id"
                  value={formData.component_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.project_id}
                >
                  <option value="">Select Component (Optional)</option>
                  {components.map((component) => (
                    <option key={component.component_id} value={component.component_id}>
                      {component.component_name} {component.component_type && `(${component.component_type})`}
                    </option>
                  ))}
                </select>
                {!formData.project_id && (
                  <p className="mt-1 text-sm text-gray-500">Please select a project first</p>
                )}
                {formData.component_id && (
                  <p className="mt-1 text-sm text-gray-500">Component selected from purchase order</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcontractor
                </label>
                <select
                  name="subcontractor_id"
                  value={formData.subcontractor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.project_id}
                >
                  <option value="">Select Subcontractor (Optional)</option>
                  {subcontractors
                    .filter(sub => sub.project_id === parseInt(formData.project_id))
                    .map((subcontractor) => (
                    <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                      {subcontractor.company_name} {subcontractor.work_type && `(${subcontractor.work_type})`}
                    </option>
                  ))}
                </select>
                {!formData.project_id && (
                  <p className="mt-1 text-sm text-gray-500">Please select a project first</p>
                )}
                {formData.subcontractor_id && (
                  <p className="mt-1 text-sm text-gray-500">Subcontractor selected from purchase order</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} - {supplier.contact_person}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="po_date"
                  value={formData.po_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  name="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  placeholder="e.g., Net 30 days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Terms
                </label>
                <input
                  type="text"
                  name="delivery_terms"
                  value={formData.delivery_terms}
                  onChange={handleInputChange}
                  placeholder="e.g., FOB Destination"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.item_id}
                          onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={0}>Select Item</option>
                          {itemsWithUnits.map(itemOption => (
                            <option key={itemOption.item_id} value={itemOption.item_id}>
                              {itemOption.item_name} ({itemOption.item_code}) - {itemOption.unit_symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(index, 'quantity_ordered', parseInt(e.target.value))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Price
                        </label>
                        <input
                          type="text"
                          value={`₹${(Number(item.total_price) || 0).toFixed(2)}`}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specifications
                        </label>
                        <input
                          type="text"
                          value={item.specifications || ''}
                          onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                          placeholder="Item specifications..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size
                        </label>
                        <input
                          type="text"
                          value={item.size || ''}
                          onChange={(e) => updateItem(index, 'size', e.target.value)}
                          placeholder="Item size..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* GST Fields */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">GST Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CGST Rate (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.cgst_rate || 0}
                            onChange={(e) => updateItem(index, 'cgst_rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SGST Rate (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.sgst_rate || 0}
                            onChange={(e) => updateItem(index, 'sgst_rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IGST Rate (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.igst_rate || 0}
                            onChange={(e) => updateItem(index, 'igst_rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CGST Amount
                          </label>
                          <input
                            type="text"
                            value={`₹${(Number(item.cgst_amount) || 0).toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SGST Amount
                          </label>
                          <input
                            type="text"
                            value={`₹${(Number(item.sgst_amount) || 0).toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IGST Amount
                          </label>
                          <input
                            type="text"
                            value={`₹${(Number(item.igst_amount) || 0).toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          />
                        </div>
                      </div>
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

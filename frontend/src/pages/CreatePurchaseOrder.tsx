import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Building2,
  User
} from 'lucide-react';
import { purchaseOrdersAPI, projectsAPI, suppliersAPI, mrrAPI, materialManagementAPI, subcontractorsAPI } from '../services/api';
import SearchableDropdown from '../components/SearchableDropdown';

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

interface MRR {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  project: Project;
  items: Array<{
    mrr_item_id: number;
    item: {
      item_id: number;
      item_name: string;
      item_code: string;
    };
    quantity_requested: number;
    unit: {
      unit_id: number;
      unit_name: string;
      unit_symbol: string;
    };
    specifications?: string;
    component_id?: number;
    subcontractor_id?: number;
    component?: {
      component_id: number;
      component_name: string;
      component_type: string;
    };
    subcontractor?: {
      subcontractor_id: number;
      company_name: string;
      work_type: string;
    };
  }>;
}

interface MRRForDropdown {
  mrr_id: number;
  mrr_number: string;
  project: Project;
  status: string;
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

const CreatePurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get MRR ID from URL parameters or location state
  const mrrId = searchParams.get('mrrId') || location.state?.mrrId || '';
  
  console.log('MRR ID from URL:', searchParams.get('mrrId'));
  console.log('MRR ID from location state:', location.state?.mrrId);
  console.log('Final MRR ID:', mrrId);

  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [mrr, setMrr] = useState<MRR | null>(null);
  const [mrrs, setMrrs] = useState<MRRForDropdown[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [itemsWithUnits, setItemsWithUnits] = useState<ItemWithUnit[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    mrr_id: '',
    project_id: '',
    component_id: '',
    subcontractor_id: '',
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: '',
    delivery_terms: '',
    notes: ''
  });

  const [poItems, setPoItems] = useState<POItem[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (mrrId && projects.length > 0) {
      fetchMRRData();
    }
  }, [mrrId, projects]);

  const fetchInitialData = async () => {
    try {
      console.log('Fetching initial data...');
      const [projectsRes, suppliersRes, itemsRes, mrrsRes] = await Promise.all([
        projectsAPI.getProjects(),
        suppliersAPI.getSuppliers(),
        materialManagementAPI.getMasterData(),
        mrrAPI.getMrrs()
      ]);

      console.log('Projects:', projectsRes.data);
      console.log('Suppliers:', suppliersRes.data);
      console.log('Master Data:', itemsRes.data);
      console.log('MRRs:', mrrsRes.data);

      setProjects(projectsRes.data.projects || []);
      setSuppliers(suppliersRes.data.suppliers || []);
      setItems(itemsRes.data.itemMaster || []);
      setUnits(itemsRes.data.units || []);
      setMrrs(mrrsRes.data.mrrs || []);
      // Don't load all subcontractors initially - load them per project
      setSubcontractors([]);
      
      // Combine items with units
      const itemsWithUnitsData: ItemWithUnit[] = (itemsRes.data.itemMaster || []).map((item: Item) => {
        const unit = (itemsRes.data.units || []).find((u: Unit) => u.unit_id === item.unit_id);
        return {
          ...item,
          unit_name: unit?.unit_name || '',
          unit_symbol: unit?.unit_symbol || ''
        };
      });
      setItemsWithUnits(itemsWithUnitsData);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load initial data');
      setInitialLoading(false);
    }
  };

  const loadComponents = async (projectId: number) => {
    try {
      const response = await projectsAPI.getProjectComponents(projectId);
      console.log('Components response:', response.data);
      setComponents(response.data.data?.components || []);
    } catch (error) {
      console.error('Error loading components:', error);
      setComponents([]);
    }
  };

  const loadSubcontractors = async (projectId: number) => {
    try {
      const response = await subcontractorsAPI.getSubcontractorsByProject(projectId);
      console.log('Subcontractors response:', response.data);
      setSubcontractors(response.data.data?.subcontractors || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
      setSubcontractors([]);
    }
  };

  const fetchMRRData = async () => {
    if (!mrrId || mrrId === '') {
      console.log('No MRR ID provided, skipping MRR data fetch');
      return;
    }

    try {
      console.log('Fetching MRR data for ID:', mrrId);
      const response = await mrrAPI.getMrr(parseInt(mrrId));
      const mrrData = response.data.mrr; // Note: response.data.mrr not response.data
      console.log('MRR Data:', mrrData);
      setMrr(mrrData);

      // Load components and subcontractors for the project first
      if (mrrData.project_id) {
        await Promise.all([
          loadComponents(mrrData.project_id),
          loadSubcontractors(mrrData.project_id)
        ]);
      }

      // Pre-fill form with MRR data after components and subcontractors are loaded
      console.log('Prefilling form with MRR data:', {
        mrr_id: mrrId,
        project_id: mrrData.project_id?.toString() || '',
        component_id: mrrData.component_id?.toString() || '',
        subcontractor_id: mrrData.subcontractor_id?.toString() || ''
      });
      
      setFormData(prev => ({
        ...prev,
        mrr_id: mrrId,
        project_id: mrrData.project_id?.toString() || '',
        component_id: mrrData.component_id?.toString() || '',
        subcontractor_id: mrrData.subcontractor_id?.toString() || ''
      }));

      // Convert MRR items to PO items
      const convertedItems: POItem[] = (mrrData.items || []).map((item: any) => ({
        item_id: item.item?.item_id || 0,
        item_name: item.item?.item_name || '',
        item_code: item.item?.item_code || '',
        unit_id: item.unit?.unit_id || 0,
        unit_name: item.unit?.unit_name || '',
        unit_symbol: item.unit?.unit_symbol || '',
        quantity_ordered: item.quantity_requested || 0,
        unit_price: 0,
        total_price: 0,
        specifications: item.specifications || ''
      }));

      setPoItems(convertedItems);
    } catch (error) {
      console.error('Error fetching MRR data:', error);
      console.error('Error details:', error.response?.data);
      setError(`Failed to load MRR data: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If project changes, load components and subcontractors for that project
    if (name === 'project_id' && value) {
      const projectId = parseInt(value);
      loadComponents(projectId);
      loadSubcontractors(projectId);
      // Clear component and subcontractor when project changes
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
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
      quantity_ordered: 1,
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
    setPoItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    setPoItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Calculate total price when quantity or unit price changes
      if (field === 'quantity_ordered' || field === 'unit_price') {
        updated[index].total_price = updated[index].quantity_ordered * updated[index].unit_price;
      }

      // Recalculate GST amounts when rates or total price changes
      if (field === 'cgst_rate' || field === 'sgst_rate' || field === 'igst_rate' || field === 'total_price') {
        const item = updated[index];
        item.cgst_amount = (item.total_price * (item.cgst_rate || 0)) / 100;
        item.sgst_amount = (item.total_price * (item.sgst_rate || 0)) / 100;
        item.igst_amount = (item.total_price * (item.igst_rate || 0)) / 100;
      }

      return updated;
    });
  };

  const handleItemSelect = (index: number, itemId: number) => {
    const selectedItem = itemsWithUnits.find(item => item.item_id === itemId);
    if (selectedItem) {
      updateItem(index, 'item_id', selectedItem.item_id);
      updateItem(index, 'item_name', selectedItem.item_name);
      updateItem(index, 'item_code', selectedItem.item_code);
      updateItem(index, 'unit_id', selectedItem.unit_id);
      updateItem(index, 'unit_name', selectedItem.unit_name);
      updateItem(index, 'unit_symbol', selectedItem.unit_symbol);
    }
  };

  const handleMrrSelect = async (mrrId: string) => {
    if (!mrrId) {
      setMrr(null);
      setPoItems([]);
      setFormData(prev => ({ ...prev, mrr_id: '', project_id: '', component_id: '', subcontractor_id: '' }));
      return;
    }

    try {
      const response = await mrrAPI.getMrr(parseInt(mrrId));
      const mrrData = response.data.mrr; // Note: response.data.mrr not response.data
      console.log('MRR Data for prefilling:', mrrData);
      setMrr(mrrData);

      // Load components and subcontractors for the project first
      if (mrrData.project_id) {
        await Promise.all([
          loadComponents(mrrData.project_id),
          loadSubcontractors(mrrData.project_id)
        ]);
      }

      // Pre-fill form with MRR data after components are loaded
      setFormData(prev => ({
        ...prev,
        mrr_id: mrrId,
        project_id: mrrData.project_id?.toString() || '',
        component_id: mrrData.component_id?.toString() || '',
        subcontractor_id: mrrData.subcontractor_id?.toString() || ''
      }));

      // Convert MRR items to PO items
      const convertedItems: POItem[] = (mrrData.items || []).map((item: any) => ({
        item_id: item.item?.item_id || 0,
        item_name: item.item?.item_name || '',
        item_code: item.item?.item_code || '',
        unit_id: item.unit?.unit_id || 0,
        unit_name: item.unit?.unit_name || '',
        unit_symbol: item.unit?.unit_symbol || '',
        quantity_ordered: item.quantity_requested || 0,
        unit_price: 0,
        total_price: 0,
        specifications: item.specifications || ''
      }));

      setPoItems(convertedItems);
    } catch (error) {
      console.error('Error fetching MRR data:', error);
      setError('Failed to load MRR data');
    }
  };

  const calculateTotals = () => {
    const subtotal = poItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalCgstAmount = poItems.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
    const totalSgstAmount = poItems.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
    const totalIgstAmount = poItems.reduce((sum, item) => sum + (item.igst_amount || 0), 0);
    const taxAmount = totalCgstAmount + totalSgstAmount + totalIgstAmount;
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount, totalCgstAmount, totalSgstAmount, totalIgstAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (poItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    if (!formData.supplier_id) {
      setError('Please select supplier');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { subtotal, taxAmount, totalAmount, totalCgstAmount, totalSgstAmount, totalIgstAmount } = calculateTotals();

      const poData = {
        ...formData,
        mrr_id: formData.mrr_id ? parseInt(formData.mrr_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        component_id: formData.component_id ? parseInt(formData.component_id) : null,
        supplier_id: parseInt(formData.supplier_id),
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: poItems.map(item => ({
          item_id: item.item_id,
          quantity_ordered: item.quantity_ordered,
          unit_id: item.unit_id,
          unit_price: item.unit_price,
          total_price: item.total_price,
          specifications: item.specifications,
          cgst_rate: item.cgst_rate || 0,
          sgst_rate: item.sgst_rate || 0,
          igst_rate: item.igst_rate || 0,
          cgst_amount: item.cgst_amount || 0,
          sgst_amount: item.sgst_amount || 0,
          igst_amount: item.igst_amount || 0,
          size: item.size
        }))
      };

      let response;
      if (mrrId) {
        response = await purchaseOrdersAPI.createPurchaseOrderFromMrr(parseInt(mrrId), poData);
      } else {
        response = await purchaseOrdersAPI.createPurchaseOrder(poData);
      }

      navigate(`/purchase-orders/${response.data.purchaseOrder.po_id}`);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      setError('Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, totalAmount, totalCgstAmount, totalSgstAmount, totalIgstAmount } = calculateTotals();

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mrrId ? 'Create Purchase Order from MRR' : 'Create Purchase Order'}
          </h1>
          <p className="text-gray-600">
            {mrrId ? `Creating PO from MRR: ${mrr?.mrr_number || 'Loading...'}` : 'Create a new purchase order'}
          </p>
        </div>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRR (Optional)
              </label>
              {mrrId ? (
                <input
                  type="text"
                  value={mrrs.find(m => m.mrr_id.toString() === formData.mrr_id)?.mrr_number || formData.mrr_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
                  readOnly
                />
              ) : (
                <SearchableDropdown
                options={mrrs.filter(mrr => mrr.status === 'APPROVED').map((mrr) => ({
                  value: mrr.mrr_id.toString(),
                  label: `${mrr.mrr_number} - ${mrr.project?.name || 'Unknown Project'}`,
                  searchText: `${mrr.mrr_number} ${mrr.project?.name || 'Unknown Project'}`
                }))}
                value={formData.mrr_id}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, mrr_id: value.toString() }));
                  handleMrrSelect(value.toString());
                }}
                  placeholder="Select MRR (Optional)"
                  searchPlaceholder="Search MRRs..."
                  className="w-full"
                />
              )}
              {mrrId && (
                <p className="mt-1 text-sm text-gray-500">
                  Prefilled from MRR link
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              {mrr ? (
                <input
                  type="text"
                  value={projects.find(p => p.project_id.toString() === formData.project_id)?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
                  readOnly
                />
              ) : (
                <SearchableDropdown
                options={projects.map((project) => ({
                  value: project.project_id.toString(),
                  label: project.name,
                  searchText: project.name
                }))}
                value={formData.project_id}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, project_id: value.toString(), subcontractor_id: '' }));
                  if (value) {
                    loadComponents(parseInt(value.toString()));
                  }
                }}
                  placeholder="Select Project (Optional)"
                  searchPlaceholder="Search projects..."
                  className="w-full"
                />
              )}
              {mrr && (
                <p className="mt-1 text-sm text-gray-500">Prefilled from MRR</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Component
              </label>
              {mrr && formData.component_id ? (
                <input
                  type="text"
                  value={components.find(c => c.component_id.toString() === formData.component_id)?.component_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
                  readOnly
                />
              ) : (
                <SearchableDropdown
                options={components.map((component) => ({
                  value: component.component_id.toString(),
                  label: `${component.component_name}${component.component_type ? ` (${component.component_type})` : ''}`,
                  searchText: `${component.component_name} ${component.component_type || ''}`
                }))}
                value={formData.component_id}
                onChange={(value) => setFormData(prev => ({ ...prev, component_id: value.toString() }))}
                  placeholder="Select Component (Optional)"
                  searchPlaceholder="Search components..."
                  className="w-full"
                  disabled={!formData.project_id || !!mrr}
                />
              )}
              {!formData.project_id && !mrr && (
                <p className="mt-1 text-sm text-gray-500">Please select a project first</p>
              )}
              {mrr && (
                <p className="mt-1 text-sm text-gray-500">Prefilled from MRR</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcontractor
              </label>
              {mrr && formData.subcontractor_id ? (
                <input
                  type="text"
                  value={subcontractors.find(s => s.subcontractor_id.toString() === formData.subcontractor_id)?.company_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
                  readOnly
                />
              ) : (
                <SearchableDropdown
                options={subcontractors
                  .filter(sub => sub.project_id === parseInt(formData.project_id))
                  .map((subcontractor) => ({
                    value: subcontractor.subcontractor_id.toString(),
                    label: `${subcontractor.company_name}${subcontractor.work_type ? ` (${subcontractor.work_type})` : ''}`,
                    searchText: `${subcontractor.company_name} ${subcontractor.work_type || ''}`
                  }))}
                value={formData.subcontractor_id}
                onChange={(value) => setFormData(prev => ({ ...prev, subcontractor_id: value.toString() }))}
                  placeholder="Select Subcontractor (Optional)"
                  searchPlaceholder="Search subcontractors..."
                  className="w-full"
                  disabled={!!mrr || !formData.project_id}
                />
              )}
              {!formData.project_id && !mrr && (
                <p className="mt-1 text-sm text-gray-500">Please select a project first</p>
              )}
              {mrr && (
                <p className="mt-1 text-sm text-gray-500">Prefilled from MRR</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={suppliers.map((supplier) => ({
                  value: supplier.supplier_id.toString(),
                  label: `${supplier.supplier_name} - ${supplier.contact_person}`,
                  searchText: `${supplier.supplier_name} ${supplier.contact_person}`
                }))}
                value={formData.supplier_id}
                onChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value.toString() }))}
                placeholder="Select Supplier"
                searchPlaceholder="Search suppliers..."
                className="w-full"
                required
              />
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

          <div className="space-y-4">
            {poItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={itemsWithUnits.map((it) => ({
                        value: it.item_id.toString(),
                        label: `${it.item_name} (${it.item_code}) - ${it.unit_symbol}`,
                        searchText: `${it.item_name} ${it.item_code} ${it.unit_symbol}`
                      }))}
                      value={item.item_id.toString()}
                      onChange={(value) => handleItemSelect(index, parseInt(value.toString()))}
                      placeholder="Select Item"
                      searchPlaceholder="Search items..."
                      className="w-full"
                      required
                    />
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
                      value={`₹${item.total_price.toFixed(2)}`}
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
                        value={`₹${(item.cgst_amount || 0).toFixed(2)}`}
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
                        value={`₹${(item.sgst_amount || 0).toFixed(2)}`}
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
                        value={`₹${(item.igst_amount || 0).toFixed(2)}`}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {poItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items added yet. Click "Add Item" to get started.
            </div>
          )}
        </div>

        {/* Totals Summary */}
        {poItems.length > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {totalCgstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST:</span>
                  <span className="font-medium">₹{totalCgstAmount.toFixed(2)}</span>
                </div>
              )}
              {totalSgstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST:</span>
                  <span className="font-medium">₹{totalSgstAmount.toFixed(2)}</span>
                </div>
              )}
              {totalIgstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST:</span>
                  <span className="font-medium">₹{totalIgstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                <span className="text-lg font-semibold text-gray-900">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || poItems.length === 0}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrder;
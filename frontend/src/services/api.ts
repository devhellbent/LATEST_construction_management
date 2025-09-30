import axios from 'axios';

// API Configuration for different environments
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Production HTTPS URLs
  if (hostname === 'www.constructease.hellbent.in') {
    return 'https://api.cms.hellbent.in';
  }
  
  // Production HTTP URLs (IP-based)
  if (hostname === '89.116.34.49') {
    return 'http://89.116.34.49:4041';
  }
  
  // Development URLs
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.REACT_APP_API_URL || 'http://localhost:4041';
  }
  
  // Default fallback
  return process.env.REACT_APP_API_URL || 'http://localhost:4041';
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request debouncing to prevent multiple simultaneous calls
const pendingRequests = new Map();

const debounceRequest = (key: string, requestFn: () => Promise<any>, delay: number = 300) => {
  return new Promise((resolve, reject) => {
    // Cancel previous request if it exists
    if (pendingRequests.has(key)) {
      clearTimeout(pendingRequests.get(key));
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await requestFn();
        pendingRequests.delete(key);
        resolve(result);
      } catch (error) {
        pendingRequests.delete(key);
        reject(error);
      }
    }, delay);

    pendingRequests.set(key, timeoutId);
  });
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle rate limiting (429) with retry
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Retrying request...');
      
      // Retry the request after a delay
      const config = error.config;
      if (!config._retry) {
        config._retry = true;
        config._retryCount = (config._retryCount || 0) + 1;
        
        if (config._retryCount <= 3) {
          const delay = Math.pow(2, config._retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return api(config);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: any) =>
    api.post('/auth/register', userData),
  getMe: () =>
    api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) =>
    api.get('/users', { params }),
  getUser: (id: number) =>
    api.get(`/users/${id}`),
  createUser: (userData: any) =>
    api.post('/users', userData),
  updateUser: (id: number, userData: any) =>
    api.put(`/users/${id}`, userData),
  deleteUser: (id: number) =>
    api.delete(`/users/${id}`),
  toggleUserStatus: (id: number) =>
    api.patch(`/users/${id}/toggle-status`),
};

// Projects API
export const projectsAPI = {
  getProjects: (params?: any) =>
    api.get('/projects', { params }),
  getProject: (id: number) =>
    api.get(`/projects/${id}`),
  createProject: (projectData: any) =>
    api.post('/projects', projectData),
  updateProject: (id: number, projectData: any) =>
    api.put(`/projects/${id}`, projectData),
  deleteProject: (id: number) =>
    api.delete(`/projects/${id}`),
  getProjectStats: (id: number) =>
    api.get(`/projects/${id}/stats`),
  getProjectComponents: (projectId: number) =>
    api.get(`/projects/${projectId}/components`),
};

// Tasks API
export const tasksAPI = {
  getTasks: (params?: any) =>
    api.get('/tasks', { params }),
  getTask: (id: number) =>
    api.get(`/tasks/${id}`),
  createTask: (taskData: any) =>
    api.post('/tasks', taskData),
  updateTask: (id: number, taskData: any) =>
    api.put(`/tasks/${id}`, taskData),
  deleteTask: (id: number) =>
    api.delete(`/tasks/${id}`),
  updateTaskStatus: (id: number, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),
  getTasksByProject: (projectId: number) =>
    api.get(`/tasks/project/${projectId}`),
};

// Materials API
export const materialsAPI = {
  getMaterials: (params?: any) =>
    api.get('/materials', { params }),
  getMaterial: (id: number) =>
    api.get(`/materials/${id}`),
  createMaterial: (materialData: any) =>
    api.post('/materials', materialData),
  updateMaterial: (id: number, materialData: any) =>
    api.put(`/materials/${id}`, materialData),
  deleteMaterial: (id: number) =>
    api.delete(`/materials/${id}`),
  getMaterialAllocations: (id: number) =>
    api.get(`/materials/${id}/allocations`),
  allocateMaterial: (id: number, allocationData: any) =>
    api.post(`/materials/${id}/allocate`, allocationData),
  updateStock: (id: number, quantity: number, operation: 'add' | 'set') =>
    api.patch(`/materials/${id}/stock`, { quantity, operation }),
  getMaterialsByProject: (projectId: number) =>
    api.get(`/materials/project/${projectId}`),
  getMaterialsByWarehouse: (warehouseId: number) =>
    api.get(`/materials/warehouse/${warehouseId}`),
  getFilterOptions: () =>
    api.get('/materials/filters/options'),
  getMasterData: () =>
    api.get('/materials/master-data'),
  getItemDetails: (itemId: number) =>
    api.get(`/materials/item-details/${itemId}`),
  searchItems: (query: string) =>
    api.get('/materials/search-items', { params: { q: query } }),
  getItemSuppliers: (itemId: number) =>
    api.get(`/materials/item-suppliers/${itemId}`),
};

// Labours API
export const laboursAPI = {
  getLabours: (params?: any) =>
    api.get('/labours', { params }),
  getLabour: (id: number) =>
    api.get(`/labours/${id}`),
  createLabour: (labourData: any) =>
    api.post('/labours', labourData),
  updateLabour: (id: number, labourData: any) =>
    api.put(`/labours/${id}`, labourData),
  deleteLabour: (id: number) =>
    api.delete(`/labours/${id}`),
  recordAttendance: (id: number, attendanceData: any) =>
    api.post(`/labours/${id}/attendance`, attendanceData),
  getAttendance: (id: number, params?: any) =>
    api.get(`/labours/${id}/attendance`, { params }),
  updateAttendance: (attendanceId: number, hours: number) =>
    api.put(`/labours/attendance/${attendanceId}`, { hours_worked: hours }),
  deleteAttendance: (attendanceId: number) =>
    api.delete(`/labours/attendance/${attendanceId}`),
  getLaboursByProject: (projectId: number) =>
    api.get(`/labours/project/${projectId}`),
  getAttendanceByProject: (projectId: number, params?: any) =>
    api.get(`/labours/attendance/project/${projectId}`, { params }),
  bulkAttendance: (attendanceData: any) =>
    api.post('/labours/bulk-attendance', attendanceData),
  getLabourStats: (labourId: number, params?: any) =>
    api.get(`/labours/stats/${labourId}`, { params })
};

// Payroll API
export const payrollAPI = {
  getPayrolls: (params?: any) =>
    api.get('/payroll', { params }),
  createPayroll: (payrollData: any) =>
    api.post('/payroll', payrollData),
  updatePayroll: (id: number, payrollData: any) =>
    api.put(`/payroll/${id}`, payrollData),
  deletePayroll: (id: number) =>
    api.delete(`/payroll/${id}`),
  getPayrollsByProject: (projectId: number) =>
    api.get(`/payroll/project/${projectId}`),
};

// Issues API
export const issuesAPI = {
  getIssues: (params?: any) =>
    api.get('/issues', { params }),
  getIssue: (id: number) =>
    api.get(`/issues/${id}`),
  createIssue: (issueData: any) =>
    api.post('/issues', issueData),
  updateIssue: (id: number, issueData: any) =>
    api.put(`/issues/${id}`, issueData),
  deleteIssue: (id: number) =>
    api.delete(`/issues/${id}`),
  assignIssue: (id: number, assignedToUserId: number) =>
    api.patch(`/issues/${id}/assign`, { assigned_to_user_id: assignedToUserId }),
  resolveIssue: (id: number, status: 'RESOLVED' | 'CLOSED') =>
    api.patch(`/issues/${id}/resolve`, { status }),
  getIssuesByProject: (projectId: number) =>
    api.get(`/issues/project/${projectId}`),
};

// Reports API
export const reportsAPI = {
  getReports: (params?: any) =>
    api.get('/reports', { params }),
  getReport: (id: number) =>
    api.get(`/reports/${id}`),
  generateReport: (reportData: any) =>
    api.post('/reports/generate', reportData),
  deleteReport: (id: number) =>
    api.delete(`/reports/${id}`),
  getReportsByProject: (projectId: number) =>
    api.get(`/reports/project/${projectId}`),
  
  // Restock Reports
  generateRestockReport: (projectId: number, format?: string, dateRange?: { date_from?: string, date_to?: string }) =>
    api.post(`/reports/restock/${projectId}`, {}, { 
      params: { 
        format: format || 'json',
        ...dateRange 
      } 
    }),
  getRestockSummary: (projectId: number, dateRange?: { date_from?: string, date_to?: string }) =>
    api.get(`/reports/restock/summary/${projectId}`, { 
      params: dateRange 
    }),
};

// Documents API
export const documentsAPI = {
  getDocuments: (params?: any) =>
    api.get('/documents', { params }),
  getDocument: (id: number) =>
    api.get(`/documents/${id}`),
  uploadDocument: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadDocument: (id: number) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id: number) =>
    api.delete(`/documents/${id}`),
  getDocumentsByProject: (projectId: number) =>
    api.get(`/documents/project/${projectId}`),
};

// Expenses API
export const expensesAPI = {
  getExpenses: (params?: any) =>
    api.get('/expenses', { params }),
  createExpense: (expenseData: any) =>
    api.post('/expenses', expenseData),
  updateExpense: (id: number, expenseData: any) =>
    api.put(`/expenses/${id}`, expenseData),
  approveExpense: (id: number) =>
    api.patch(`/expenses/${id}/approve`),
  deleteExpense: (id: number) =>
    api.delete(`/expenses/${id}`),
  getExpensesByProject: (projectId: number) =>
    api.get(`/expenses/project/${projectId}`),
};

// Project Members API
export const projectMembersAPI = {
  getProjectMembers: (params?: any) =>
    api.get('/project-members', { params }),
  getProjectMembersByProject: (projectId: number) =>
    api.get(`/project-members/project/${projectId}`),
  addProjectMember: (memberData: any) =>
    api.post('/project-members', memberData),
  updateProjectMember: (id: number, memberData: any) =>
    api.put(`/project-members/${id}`, memberData),
  removeProjectMember: (id: number) =>
    api.delete(`/project-members/${id}`),
  getAllRoles: () =>
    api.get('/project-members/roles/all'),
};

// Payments API
export const paymentsAPI = {
  getPayments: (params?: any) =>
    api.get('/payments', { params }),
  getPayment: (id: number) =>
    api.get(`/payments/${id}`),
  createPayment: (paymentData: any) =>
    api.post('/payments', paymentData),
  updatePayment: (id: number, paymentData: any) =>
    api.put(`/payments/${id}`, paymentData),
  approvePayment: (id: number) =>
    api.patch(`/payments/${id}/approve`),
  rejectPayment: (id: number) =>
    api.patch(`/payments/${id}/reject`),
  deletePayment: (id: number) =>
    api.delete(`/payments/${id}`),
  getPaymentsByProject: (projectId: number, params?: any) =>
    api.get('/payments', { params: { project_id: projectId, ...params } }),
  getPaymentStats: (params?: any) =>
    api.get('/payments/stats/by-category', { params }),
  getPaymentTypes: () =>
    api.get('/payments/types/all'),
  getPaymentCategories: () =>
    api.get('/payments/categories/all'),
};

// Suppliers API
export const suppliersAPI = {
  getSuppliers: (params?: any) =>
    api.get('/suppliers', { params }),
  getSupplier: (id: number) =>
    api.get(`/suppliers/${id}`),
  createSupplier: (supplierData: any) =>
    api.post('/suppliers', supplierData),
  updateSupplier: (id: number, supplierData: any) =>
    api.put(`/suppliers/${id}`, supplierData),
  deleteSupplier: (id: number) =>
    api.delete(`/suppliers/${id}`),
  getSupplierItems: (id: number) =>
    api.get(`/suppliers/${id}/items`),
  addSupplierItem: (id: number, itemData: any) =>
    api.post(`/suppliers/${id}/items`, itemData),
  updateSupplierItem: (id: number, itemId: number, itemData: any) =>
    api.put(`/suppliers/${id}/items/${itemId}`, itemData),
  deleteSupplierItem: (id: number, itemId: number) =>
    api.delete(`/suppliers/${id}/items/${itemId}`),
};

// Material Management API
export const materialManagementAPI = {
  // Inventory Management
  getInventory: (params?: any) =>
    api.get('/material-management/inventory', { params }),
  getMaterial: (id: number) =>
    api.get(`/material-management/inventory/${id}`),
  createMaterial: (materialData: any) =>
    api.post('/material-management/inventory', materialData),
  updateMaterial: (id: number, materialData: any) =>
    api.put(`/material-management/inventory/${id}`, materialData),
  deleteMaterial: (id: number) =>
    api.delete(`/material-management/inventory/${id}`),

  // Material Issues
  getMaterialIssues: (params?: any) =>
    api.get('/material-management/issues', { params }),
  createMaterialIssue: (issueData: any) =>
    api.post('/material-management/issues', issueData),
  updateMaterialIssue: (id: number, issueData: any) =>
    api.put(`/material-management/issues/${id}`, issueData),
  deleteMaterialIssue: (id: number) =>
    api.delete(`/material-management/issues/${id}`),

  // Material Returns
  getMaterialReturns: (params?: any) =>
    api.get('/material-management/returns', { params }),
  createMaterialReturn: (returnData: any) =>
    api.post('/material-management/returns', returnData),
  updateMaterialReturn: (id: number, returnData: any) =>
    api.put(`/material-management/returns/${id}`, returnData),
  deleteMaterialReturn: (id: number) =>
    api.delete(`/material-management/returns/${id}`),

  // Material Consumptions
  getMaterialConsumptions: (params?: any) =>
    api.get('/material-management/consumptions', { params }),
  createMaterialConsumption: (consumptionData: any) =>
    api.post('/material-management/consumptions', consumptionData),
  updateMaterialConsumption: (id: number, consumptionData: any) =>
    api.put(`/material-management/consumptions/${id}`, consumptionData),
  deleteMaterialConsumption: (id: number) =>
    api.delete(`/material-management/consumptions/${id}`),

  // Inventory History
  getInventoryHistory: (params?: any) =>
    api.get('/material-management/inventory-history', { params }),

  // Master Data
  getMasterData: () =>
    api.get('/material-management/master-data'),

      // Dashboard Stats
      getDashboardStats: (projectId: number) =>
        api.get(`/material-management/dashboard-stats/${projectId}`),

  // Warehouse Management
  getWarehouses: () =>
    api.get('/material-management/warehouses'),
  createWarehouse: (warehouseData: any) =>
    api.post('/material-management/warehouses', warehouseData),

  // Inventory Restocking
  getLowStockMaterials: (projectId?: number) =>
    api.get('/material-management/restock/low-stock', { 
      params: projectId ? { project_id: projectId } : {} 
    }),
  restockSingle: (restockData: any) =>
    api.post('/material-management/restock/single', restockData),
  restockBulk: (restockData: any) =>
    api.post('/material-management/restock/bulk', restockData),
  getRestockHistory: (projectId?: number, params?: any) =>
    api.get('/material-management/restock/history', { 
      params: { 
        ...(projectId ? { project_id: projectId } : {}),
        ...params 
      } 
    }),
};

// MRR API
export const mrrAPI = {
  getMrrs: (params?: any) =>
    api.get('/mrr', { params }),
  getMrr: (id: number) =>
    api.get(`/mrr/${id}`),
  createMrr: (mrrData: any) =>
    api.post('/mrr', mrrData),
  updateMrr: (id: number, mrrData: any) =>
    api.put(`/mrr/${id}`, mrrData),
  deleteMrr: (id: number) =>
    api.delete(`/mrr/${id}`),
  submitMrr: (id: number) =>
    api.patch(`/mrr/${id}/submit`),
  approveMrr: (id: number, action: 'approve' | 'reject', rejectionReason?: string) =>
    api.patch(`/mrr/${id}/approve`, { action, rejection_reason: rejectionReason }),
  addMrrItem: (id: number, itemData: any) =>
    api.post(`/mrr/${id}/items`, itemData),
  updateMrrItem: (id: number, itemId: number, itemData: any) =>
    api.put(`/mrr/${id}/items/${itemId}`, itemData),
  deleteMrrItem: (id: number, itemId: number) =>
    api.delete(`/mrr/${id}/items/${itemId}`),
  checkMrrInventory: (mrrId: number, autoCreateMaterials: boolean = false) =>
    api.post(`/mrr/${mrrId}/check-inventory`, { auto_create_materials: autoCreateMaterials }),
  updateMrrStatus: (mrrId: number, status: string, notes?: string) =>
    api.patch(`/mrr/${mrrId}/status`, { status, notes }),
  markMrrProcessing: (mrrId: number, notes?: string) =>
    api.patch(`/mrr/${mrrId}/mark-processing`, { notes }),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getPurchaseOrders: (params?: any) =>
    api.get('/purchase-orders', { params }),
  getPurchaseOrder: (id: number) =>
    api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (poData: any) =>
    api.post('/purchase-orders', poData),
  createPurchaseOrderFromMrr: (mrrId: number, poData: any) =>
    api.post(`/purchase-orders/from-mrr/${mrrId}`, poData),
  updatePurchaseOrder: (id: number, poData: any) =>
    api.put(`/purchase-orders/${id}`, poData),
  deletePurchaseOrder: (id: number) =>
    api.delete(`/purchase-orders/${id}`),
  approvePurchaseOrder: (id: number) =>
    api.patch(`/purchase-orders/${id}/approve`),
  placeOrder: (id: number) =>
    api.patch(`/purchase-orders/${id}/place-order`),
  cancelPurchaseOrder: (id: number) =>
    api.patch(`/purchase-orders/${id}/cancel`),
  addPurchaseOrderItem: (id: number, itemData: any) =>
    api.post(`/purchase-orders/${id}/items`, itemData),
  updatePurchaseOrderItem: (id: number, itemId: number, itemData: any) =>
    api.put(`/purchase-orders/${id}/items/${itemId}`, itemData),
  deletePurchaseOrderItem: (id: number, itemId: number) =>
    api.delete(`/purchase-orders/${id}/items/${itemId}`),
};

// Supplier Ledger API
export const supplierLedgerAPI = {
  getLedgerEntries: (params?: any) =>
    api.get('/supplier-ledger', { params }),
  getLedgerSummary: (params?: any) =>
    api.get('/supplier-ledger/summary', { params }),
  getSupplierLedger: (supplierId: number, params?: any) =>
    api.get(`/supplier-ledger/supplier/${supplierId}`, { params }),
  recordPayment: (paymentData: any) =>
    api.post('/supplier-ledger/payment', paymentData),
  recordAdjustment: (adjustmentData: any) =>
    api.post('/supplier-ledger/adjustment', adjustmentData),
  getOverduePayments: () =>
    api.get('/supplier-ledger/overdue'),
  getPaymentReports: (params?: any) =>
    api.get('/supplier-ledger/reports/payments', { params }),
};

// Material Receipts API
export const materialReceiptsAPI = {
  getReceipts: (params?: any) =>
    api.get('/material-receipts', { params }),
  getReceipt: (id: number) =>
    api.get(`/material-receipts/${id}`),
  createReceipt: (receiptData: any) =>
    api.post('/material-receipts', receiptData),
  updateReceipt: (id: number, receiptData: any) =>
    api.put(`/material-receipts/${id}`, receiptData),
  updateReceiptReceive: (id: number, receiveData: any) =>
    api.put(`/material-receipts/${id}/receive`, receiveData),
  verifyReceipt: (id: number, verificationData: any) =>
    api.post(`/material-receipts/${id}/verify`, verificationData),
  deleteReceipt: (id: number) =>
    api.delete(`/material-receipts/${id}`),
  addReceiptItem: (id: number, itemData: any) =>
    api.post(`/material-receipts/${id}/items`, itemData),
  updateReceiptItem: (id: number, itemId: number, itemData: any) =>
    api.put(`/material-receipts/${id}/items/${itemId}`, itemData),
  deleteReceiptItem: (id: number, itemId: number) =>
    api.delete(`/material-receipts/${id}/items/${itemId}`),
  getAvailablePoItems: (poId: number) =>
    api.get(`/material-receipts/po/${poId}/available-items`),
};

// Commercial API
export const subcontractorsAPI = {
  getSubcontractors: (params?: any) =>
    api.get('/subcontractors', { params }),
  getSubcontractorsByProject: (projectId: number, params?: any) =>
    api.get(`/subcontractors/project/${projectId}`, { params }),
  getSubcontractor: (id: number) =>
    api.get(`/subcontractors/${id}`),
  createSubcontractor: (data: any) =>
    api.post('/subcontractors', data),
  updateSubcontractor: (id: number, data: any) =>
    api.put(`/subcontractors/${id}`, data),
  deleteSubcontractor: (id: number) =>
    api.delete(`/subcontractors/${id}`),
};

export const commercialAPI = {
  // Inventory
  getInventory: (params?: any) =>
    api.get('/commercial/inventory', { params }),
  getInventoryByProject: (projectId: number, params?: any) =>
    api.get(`/commercial/inventory/${projectId}`, { params }),
  
  
  // Material Issue
  getMaterialIssues: (params?: any) =>
    api.get('/commercial/material-issue', { params }),
  createMaterialIssue: (issueData: any) =>
    api.post('/commercial/material-issue', issueData),
  updateMaterialIssue: (id: number, issueData: any) =>
    api.put(`/commercial/material-issue/${id}`, issueData),
  deleteMaterialIssue: (id: number) =>
    api.delete(`/commercial/material-issue/${id}`),
  cancelMaterialIssue: (id: number) =>
    api.patch(`/commercial/material-issue/${id}/cancel`),
  
  // Material Return
  getMaterialReturns: (params?: any) =>
    api.get('/commercial/material-return', { params }),
  createMaterialReturn: (returnData: any) =>
    api.post('/commercial/material-return', returnData),
  updateMaterialReturn: (id: number, returnData: any) =>
    api.put(`/commercial/material-return/${id}`, returnData),
  deleteMaterialReturn: (id: number) =>
    api.delete(`/commercial/material-return/${id}`),
  
  // Petty Cash
  getPettyCash: (params?: any) =>
    api.get('/commercial/petty-cash', { params }),
  
  // Consumptions
  getConsumptions: (params?: any) =>
    api.get('/commercial/consumptions', { params }),
  createMaterialConsumption: (consumptionData: any) =>
    api.post('/commercial/consumptions', consumptionData),
  updateMaterialConsumption: (id: number, consumptionData: any) =>
    api.put(`/commercial/consumptions/${id}`, consumptionData),
  deleteMaterialConsumption: (id: number) =>
    api.delete(`/commercial/consumptions/${id}`),
  calculateConsumptions: (params?: any) =>
    api.get('/commercial/consumptions/calculate', { params }),
  
  // Dashboard Stats
  getDashboardStats: (projectId: number) =>
    api.get(`/commercial/dashboard-stats/${projectId}`),
  
  // Inventory History
  getInventoryHistory: (materialId: number, params?: any) =>
    api.get(`/commercial/inventory-history/${materialId}`, { params }),
  getProjectInventoryHistory: (projectId: number, params?: any) =>
    api.get(`/commercial/inventory-history/project/${projectId}`, { params }),
  getStockLevels: (params?: any) =>
    api.get('/commercial/stock-levels', { params }),
  getLowStockAlerts: (params?: any) =>
    api.get('/commercial/low-stock-alerts', { params }),
  
  // Recent Activity
  getRecentActivity: (params?: any) =>
    api.get('/commercial/recent-activity', { params }),
};
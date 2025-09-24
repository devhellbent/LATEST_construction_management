import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
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

// Commercial API
export const commercialAPI = {
  // Inventory
  getInventory: (params?: any) =>
    api.get('/commercial/inventory', { params }),
  getInventoryByProject: (projectId: number, params?: any) =>
    api.get(`/commercial/inventory/${projectId}`, { params }),
  
  // Site Transfers
  getSiteTransfers: (params?: any) =>
    api.get('/commercial/site-transfers', { params }),
  getSiteTransfer: (id: number) =>
    api.get(`/commercial/site-transfers/${id}`),
  createSiteTransfer: (transferData: any) =>
    api.post('/commercial/site-transfers', transferData),
  updateSiteTransferStatus: (id: number, status: string) =>
    api.patch(`/commercial/site-transfers/${id}/status`, { status }),
  deleteSiteTransfer: (id: number) =>
    api.delete(`/commercial/site-transfers/${id}`),
  
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
  
  // Petty Cash
  getPettyCash: (params?: any) =>
    api.get('/commercial/petty-cash', { params }),
  
  // Consumptions
  getConsumptions: (params?: any) =>
    api.get('/commercial/consumptions', { params }),
  
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
};
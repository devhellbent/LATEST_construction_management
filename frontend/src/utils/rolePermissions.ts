// Role-based permissions configuration
// Maps role names to allowed routes and features

export interface RolePermissions {
  routes: string[];
  features: {
    canCreateProject?: boolean;
    canEditProject?: boolean;
    canDeleteProject?: boolean;
    canApproveMRR?: boolean;
    canCreateMRR?: boolean;
    canCreatePO?: boolean;
    canApprovePO?: boolean;
    canManagePettyCash?: boolean;
    canIssueMaterial?: boolean;
    canReceiveMaterial?: boolean;
    canManageInventory?: boolean;
    canManageUsers?: boolean;
    canManageSuppliers?: boolean;
    canViewReports?: boolean;
    canManagePayments?: boolean;
  };
}

// Role IDs mapping
export const ROLE_IDS = {
  ADMIN: 1,
  PROJECT_MANAGER: 2,
  ON_SITE_ENGINEER: 3,
  STORE_MANAGER: 4,
  PURCHASE_MANAGER_HO: 5,
  ACCOUNTANT: 6,
  ACCOUNTANT_HEAD: 7,
  ENGINEER_HO: 8,
};

// Role names mapping
export const ROLE_NAMES = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  ON_SITE_ENGINEER: 'On-Site Engineers',
  STORE_MANAGER: 'Store Manager',
  PURCHASE_MANAGER_HO: 'Purchase Manager HO',
  ACCOUNTANT: 'Accountant',
  ACCOUNTANT_HEAD: 'Accountant Head',
  ENGINEER_HO: 'Engineer HO',
};

// Define permissions for each role
const rolePermissions: Record<string, RolePermissions> = {
  [ROLE_NAMES.ADMIN]: {
    routes: [
      '/dashboard',
      '/projects',
      '/projects/new',
      '/projects/:id',
      '/project-members',
      '/tasks',
      '/purchase-orders',
      '/purchase-orders/create',
      '/create-purchase-order',
      '/purchase-orders/:id',
      '/purchase-orders/:id/edit',
      '/purchase-orders/:id/receipts',
      '/material-management',
      '/material-management/mrr',
      '/material-management/issue',
      '/material-management/return',
      '/material-management/consumption',
      '/material-management/inventory',
      '/material-management/receipts',
      '/material-management/supplier-ledger',
      '/material-management/workflow',
      '/commercial',
      '/commercial/petty-cash',
      '/commercial/subcontractor-ledger',
      '/labours',
      '/issues',
      '/reports',
      '/reports/subcontractor-material-issues',
      '/documents',
      '/expenses',
      '/admin',
      '/admin/suppliers',
      '/admin/users',
      '/admin/items',
    ],
    features: {
      canCreateProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canApproveMRR: true,
      canCreateMRR: true,
      canCreatePO: true,
      canApprovePO: true,
      canManagePettyCash: true,
      canIssueMaterial: true,
      canReceiveMaterial: true,
      canManageInventory: true,
      canManageUsers: true,
      canManageSuppliers: true,
      canViewReports: true,
      canManagePayments: true,
    },
  },
  [ROLE_NAMES.PROJECT_MANAGER]: {
    routes: [
      '/dashboard',
      '/projects',
      '/projects/new',
      '/projects/:id',
      '/project-members',
      '/tasks',
      '/purchase-orders',
      '/purchase-orders/:id',
      '/material-management',
      '/material-management/mrr',
      '/material-management/workflow',
      '/commercial',
      '/commercial/petty-cash',
      '/commercial/subcontractor-ledger',
      '/labours',
      '/issues',
      '/reports',
      '/reports/subcontractor-material-issues',
      '/documents',
      '/expenses',
    ],
    features: {
      canCreateProject: true,
      canEditProject: true,
      canDeleteProject: false,
      canApproveMRR: true,
      canCreateMRR: true,
      canCreatePO: false,
      canApprovePO: false,
      canManagePettyCash: true,
      canIssueMaterial: false,
      canReceiveMaterial: false,
      canManageInventory: false,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: false,
    },
  },
  [ROLE_NAMES.ON_SITE_ENGINEER]: {
    routes: [
      '/dashboard',
      '/projects',
      '/projects/:id',
      '/tasks',
      '/material-management',
      '/material-management/mrr',
      '/issues',
      '/reports',
      '/reports/subcontractor-material-issues',
    ],
    features: {
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canApproveMRR: false,
      canCreateMRR: true,
      canCreatePO: false,
      canApprovePO: false,
      canManagePettyCash: false,
      canIssueMaterial: false,
      canReceiveMaterial: false,
      canManageInventory: false,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: false,
    },
  },
  [ROLE_NAMES.STORE_MANAGER]: {
    routes: [
      '/dashboard',
      '/projects',
      '/projects/:id',
      '/material-management',
      '/material-management/issue',
      '/material-management/return',
      '/material-management/inventory',
      '/material-management/receipts',
      '/material-management/workflow',
      '/reports',
      '/reports/subcontractor-material-issues',
    ],
    features: {
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canApproveMRR: false,
      canCreateMRR: false,
      canCreatePO: false,
      canApprovePO: false,
      canManagePettyCash: false,
      canIssueMaterial: true,
      canReceiveMaterial: true,
      canManageInventory: true,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: false,
    },
  },
  [ROLE_NAMES.PURCHASE_MANAGER_HO]: {
    routes: [
      '/dashboard',
      '/purchase-orders',
      '/purchase-orders/create',
      '/create-purchase-order',
      '/purchase-orders/:id',
      '/material-management',
      '/material-management/mrr',
      '/material-management/workflow',
      '/admin',
      '/admin/suppliers',
      '/reports',
      '/reports/subcontractor-material-issues',
    ],
    features: {
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canApproveMRR: false,
      canCreateMRR: false,
      canCreatePO: true,
      canApprovePO: false,
      canManagePettyCash: false,
      canIssueMaterial: false,
      canReceiveMaterial: false,
      canManageInventory: false,
      canManageUsers: false,
      canManageSuppliers: true,
      canViewReports: true,
      canManagePayments: false,
    },
  },
  [ROLE_NAMES.ACCOUNTANT]: {
    routes: [
      '/dashboard',
      '/commercial',
      '/commercial/petty-cash',
      '/commercial/subcontractor-ledger',
      '/reports',
      '/reports/subcontractor-material-issues',
      '/documents',
      '/expenses',
    ],
    features: {
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canApproveMRR: false,
      canCreateMRR: false,
      canCreatePO: false,
      canApprovePO: false,
      canManagePettyCash: false,
      canIssueMaterial: false,
      canReceiveMaterial: false,
      canManageInventory: false,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: false,
    },
  },
  [ROLE_NAMES.ACCOUNTANT_HEAD]: {
    routes: [
      '/dashboard',
      '/purchase-orders',
      '/purchase-orders/:id',
      '/commercial',
      '/commercial/petty-cash',
      '/commercial/subcontractor-ledger',
      '/reports',
      '/reports/subcontractor-material-issues',
      '/documents',
      '/expenses',
    ],
    features: {
      canCreateProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canApproveMRR: false,
      canCreateMRR: false,
      canCreatePO: false,
      canApprovePO: true,
      canManagePettyCash: true,
      canIssueMaterial: false,
      canReceiveMaterial: false,
      canManageInventory: false,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: true,
    },
  },
  [ROLE_NAMES.ENGINEER_HO]: {
    routes: [
      '/dashboard',
      '/projects',
      '/projects/new',
      '/projects/:id',
      '/project-members',
      '/tasks',
      '/purchase-orders',
      '/purchase-orders/create',
      '/create-purchase-order',
      '/purchase-orders/:id',
      '/purchase-orders/:id/edit',
      '/purchase-orders/:id/receipts',
      '/material-management',
      '/material-management/mrr',
      '/material-management/issue',
      '/material-management/return',
      '/material-management/consumption',
      '/material-management/inventory',
      '/material-management/receipts',
      '/material-management/supplier-ledger',
      '/material-management/workflow',
      '/commercial',
      '/commercial/petty-cash',
      '/commercial/subcontractor-ledger',
      '/labours',
      '/issues',
      '/reports',
      '/reports/subcontractor-material-issues',
      '/documents',
      '/expenses',
    ],
    features: {
      canCreateProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canApproveMRR: true,
      canCreateMRR: true,
      canCreatePO: true,
      canApprovePO: true,
      canManagePettyCash: true,
      canIssueMaterial: true,
      canReceiveMaterial: true,
      canManageInventory: true,
      canManageUsers: false,
      canManageSuppliers: false,
      canViewReports: true,
      canManagePayments: true,
    },
  },
};

// Helper function to get role name from user object
export const getRoleName = (user: any): string | null => {
  if (!user?.role) return null;
  
  if (typeof user.role === 'string') {
    return user.role;
  }
  
  if (typeof user.role === 'object' && user.role.name) {
    return user.role.name;
  }
  
  return null;
};

// Helper function to get role ID from user object
export const getRoleId = (user: any): number | null => {
  if (user?.role_id) {
    return user.role_id;
  }
  
  if (user?.role && typeof user.role === 'object' && user.role.role_id) {
    return user.role.role_id;
  }
  
  return null;
};

// Check if user has access to a route
export const hasRouteAccess = (user: any, route: string): boolean => {
  const roleName = getRoleName(user);
  if (!roleName) return false;
  
  const permissions = rolePermissions[roleName];
  if (!permissions) return false;
  
  // Check exact match first
  if (permissions.routes.includes(route)) {
    return true;
  }
  
  // Check pattern matching for dynamic routes
  return permissions.routes.some((allowedRoute) => {
    // Convert route pattern to regex
    const pattern = allowedRoute.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(route);
  });
};

// Check if user has a specific feature
export const hasFeature = (user: any, feature: keyof RolePermissions['features']): boolean => {
  const roleName = getRoleName(user);
  if (!roleName) return false;
  
  const permissions = rolePermissions[roleName];
  if (!permissions) return false;
  
  return permissions.features[feature] === true;
};

// Get all permissions for a user
export const getUserPermissions = (user: any): RolePermissions | null => {
  const roleName = getRoleName(user);
  if (!roleName) return null;
  
  return rolePermissions[roleName] || null;
};

// Check if user is admin
export const isAdmin = (user: any): boolean => {
  const roleName = getRoleName(user);
  return roleName === ROLE_NAMES.ADMIN || roleName === ROLE_NAMES.ENGINEER_HO;
};

// Check if user can access admin routes
export const canAccessAdmin = (user: any): boolean => {
  const roleName = getRoleName(user);
  return roleName === ROLE_NAMES.ADMIN || 
         roleName === ROLE_NAMES.PURCHASE_MANAGER_HO;
};


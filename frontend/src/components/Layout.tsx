import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  CheckSquare, 
  Package, 
  Users, 
  AlertTriangle, 
  FileText, 
  Upload, 
  IndianRupee, 
  Settings,
  Menu,
  X,
  Bell,
  Search,
  User,
  UserCheck,
  Building2,
  ArrowRightLeft,
  ShoppingCart,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText as FileTextIcon,
  Truck,
  CreditCard,
  Workflow,
  Plus,
  History,
  Package2,
  Shield,
  UserPlus,
  PackageCheck,
  Building
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { hasRouteAccess, canAccessAdmin, isAdmin } from '../utils/rolePermissions';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commercialExpanded, setCommercialExpanded] = useState(false);
  const [materialManagementExpanded, setMaterialManagementExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

  // Filter navigation items based on user role
  const filterNavigationItems = (items: any[]) => {
    if (!user) return [];
    return items.filter(item => hasRouteAccess(user, item.href));
  };

  const commercialSubItems = [
    { name: 'Petty Cash', href: '/commercial/petty-cash', icon: IndianRupee },
    { name: 'Subcontractor Ledger', href: '/commercial/subcontractor-ledger', icon: Building2 },
  ].filter(item => !user || hasRouteAccess(user, item.href));

  const materialManagementSubItems = [
    { name: 'Dashboard', href: '/material-management', icon: LayoutDashboard },
    { name: 'MRR Management', href: '/material-management/mrr', icon: ClipboardList },
    { name: 'Material Issue', href: '/material-management/issue', icon: ShoppingCart },
    { name: 'Material Return', href: '/material-management/return', icon: RotateCcw },
    { name: 'Material Consumption', href: '/material-management/consumption', icon: RefreshCw },
    { name: 'Inventory Management', href: '/material-management/inventory', icon: Package },
    { name: 'Material Receipts', href: '/material-management/receipts', icon: Truck },
    { name: 'Supplier Ledger', href: '/material-management/supplier-ledger', icon: CreditCard },
    { name: 'Workflow Tracking', href: '/material-management/workflow', icon: Workflow },
  ].filter(item => !user || hasRouteAccess(user, item.href));

  const adminSubItems = [
    { name: 'Suppliers', href: '/admin/suppliers', icon: Building },
    { name: 'Users', href: '/admin/users', icon: UserPlus },
    { name: 'Items', href: '/admin/items', icon: PackageCheck },
  ].filter(item => !user || hasRouteAccess(user, item.href));

  // Build navigation array based on role permissions
  const allNavigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Project Associated Members', href: '/project-members', icon: UserCheck },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: FileTextIcon },
    { 
      name: 'Material Management', 
      href: '/material-management', 
      icon: Package, 
      subItems: materialManagementSubItems,
      expanded: materialManagementExpanded,
      onToggle: () => setMaterialManagementExpanded(!materialManagementExpanded)
    },
    { 
      name: 'Commercial', 
      href: '/commercial', 
      icon: Building2, 
      subItems: commercialSubItems,
      expanded: commercialExpanded,
      onToggle: () => setCommercialExpanded(!commercialExpanded)
    },
    { name: 'Labours', href: '/labours', icon: Users },
    { name: 'Issues', href: '/issues', icon: AlertTriangle },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Documents', href: '/documents', icon: Upload },
    { name: 'Expenses', href: '/expenses', icon: IndianRupee },
  ];

  // Filter navigation items based on role
  const navigation = allNavigationItems.filter(item => {
    if (!user) return false;
    
    // If item has subItems, check if user has access to the main route or any sub-item
    if (item.subItems && item.subItems.length > 0) {
      return hasRouteAccess(user, item.href) || item.subItems.length > 0;
    }
    
    return hasRouteAccess(user, item.href);
  });

  // Add Admin section for users who can access admin routes
  if (user && canAccessAdmin(user) && adminSubItems.length > 0) {
    navigation.push({ 
      name: 'Admin', 
      href: '/admin', 
      icon: Shield, 
      subItems: adminSubItems,
      expanded: adminExpanded,
      onToggle: () => setAdminExpanded(!adminExpanded)
    });
  }


  const getRoleName = () => {
    if (!user?.role) return 'User';
    
    // Handle old string format
    if (typeof user.role === 'string') {
      return user.role;
    }
    
    // Handle new object format
    if (typeof user.role === 'object' && user.role.name) {
      return user.role.name;
    }
    
    return 'User';
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const isCommercialActive = () => {
    return location.pathname.startsWith('/commercial');
  };

  const isMaterialManagementActive = () => {
    return location.pathname.startsWith('/material-management');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="relative sidebar-container w-80 sm:w-72 bg-white/95 backdrop-blur-md h-full shadow-2xl flex flex-col overflow-hidden">
          <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 flex-shrink-0 border-b border-slate-200/50">
            <div className="flex items-center">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
                <span className="text-white font-bold text-sm sm:text-lg">LM</span>
              </div>
              <div className="ml-2 sm:ml-3">
                <span className="text-lg sm:text-xl font-bold text-slate-900">LMInfra</span>
                <p className="text-xs text-slate-500 hidden sm:block">Construction Management</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="sidebar-nav flex-1 overflow-y-auto min-h-0">
            <nav className="px-2 sm:px-4 py-4 space-y-1 sidebar-scrollable">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = hasSubItems ? 
                (item.name === 'Commercial' ? isCommercialActive() : isMaterialManagementActive()) : 
                isActive(item.href);
              
              return (
                <div key={item.name}>
                  {hasSubItems ? (
                    <div>
                      <button
                        onClick={item.onToggle}
                        className={`sidebar-item w-full text-left flex items-center justify-between ${isItemActive ? 'active' : ''}`}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </div>
                        {item.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {item.expanded && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={`sidebar-item text-sm ${isActive(subItem.href) ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <SubIcon className="h-4 w-4 mr-2" />
                                {subItem.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )}
                </div>
              );
            })}
            </nav>
          </div>
          <div className="px-2 sm:px-4 py-4 border-t border-slate-200/50 text-center text-slate-500 text-xs flex-shrink-0">
            <div>
              <p>Made with <span className="text-danger-500">❤️</span> at</p>
              <p className="font-semibold text-slate-700 hidden sm:block">Hellbent Software & Educational Services LLP</p>
              <p className="font-semibold text-slate-700 sm:hidden">Hellbent Software</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="sidebar-container bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-lg flex flex-col h-full overflow-hidden">
          <div className="flex h-20 items-center px-6 flex-shrink-0 border-b border-slate-200/50">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
                <span className="text-white font-bold text-lg">LM</span>
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold text-slate-900">LMInfra</span>
                <p className="text-xs text-slate-500">Construction Management</p>
              </div>
            </div>
          </div>
          <div className="sidebar-nav flex-1 overflow-y-auto min-h-0">
            <nav className="px-4 py-4 space-y-1 sidebar-scrollable">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = hasSubItems ? 
                (item.name === 'Commercial' ? isCommercialActive() : isMaterialManagementActive()) : 
                isActive(item.href);
              
              return (
                <div key={item.name}>
                  {hasSubItems ? (
                    <div>
                      <button
                        onClick={item.onToggle}
                        className={`sidebar-item w-full text-left flex items-center justify-between ${isItemActive ? 'active' : ''}`}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </div>
                        {item.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {item.expanded && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className={`sidebar-item text-sm ${isActive(subItem.href) ? 'active' : ''}`}
                              >
                                <SubIcon className="h-4 w-4 mr-2" />
                                {subItem.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )}
                </div>
              );
            })}
            </nav>
          </div>
          <div className="px-4 py-4 border-t border-slate-200/50 text-center text-slate-500 text-xs flex-shrink-0">
            <div>
              <p>Made with <span className="text-danger-500">❤️</span> at</p>
              <p className="font-semibold text-slate-700">Hellbent Software & Educational Services LLP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 sm:h-20 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-slate-200/50 bg-white/80 backdrop-blur-md px-3 sm:px-4 shadow-sm lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search */}
          <div className="flex flex-1 gap-x-2 sm:gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center max-w-md">
              <Search className="absolute left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="search-input pl-10 sm:pl-12 pr-3 sm:pr-4"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6">
            {/* Connection status */}
            <div className="hidden sm:flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 rounded-lg">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'} animate-pulse`} />
              <span className="ml-2 text-xs sm:text-sm text-slate-600 font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-1.5 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-danger-500 text-xs text-white flex items-center justify-center font-semibold shadow-lg">
                3
              </span>
            </button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-x-2 sm:gap-x-3 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center gap-x-2 sm:gap-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{getRoleName()}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={logout}
                  className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 sm:py-6 lg:py-8 min-h-screen">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

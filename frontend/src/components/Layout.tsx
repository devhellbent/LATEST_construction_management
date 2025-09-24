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
  DollarSign, 
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
  IndianRupee,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commercialExpanded, setCommercialExpanded] = useState(false);
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

  const commercialSubItems = [
    { name: 'Inventory', href: '/commercial/inventory', icon: Package },
    { name: 'Site Transfers', href: '/commercial/site-transfers', icon: ArrowRightLeft },
    { name: 'Material Issue', href: '/commercial/material-issue', icon: ShoppingCart },
    { name: 'Material Return', href: '/commercial/material-return', icon: RotateCcw },
    { name: 'Petty Cash', href: '/commercial/petty-cash', icon: IndianRupee },
    { name: 'Consumptions', href: '/commercial/consumptions', icon: RefreshCw },
  ];

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Project Associated Members', href: '/project-members', icon: UserCheck },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
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
    { name: 'Expenses', href: '/expenses', icon: DollarSign },
  ];

  // Add Users menu item for owners and project managers
  const isAdminOrManager = () => {
    if (!user?.role) return false;
    
    // Handle old string format
    if (typeof user.role === 'string') {
      return user.role === 'OWNER' || user.role === 'PROJECT_MANAGER';
    }
    
    // Handle new object format
    if (typeof user.role === 'object') {
      return user.role.name === 'Admin' || user.role.name === 'Project Manager';
    }
    
    return false;
  };

  if (isAdminOrManager()) {
    navigation.push({ name: 'Users', href: '/users', icon: Users });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-64 flex-col bg-white h-full">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-white font-bold text-sm">CE</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">ConstructEase</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = hasSubItems ? isCommercialActive() : isActive(item.href);
              
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
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-white font-bold text-sm">CE</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">ConstructEase</span>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = hasSubItems ? isCommercialActive() : isActive(item.href);
              
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
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Search */}
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Connection status */}
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="ml-2 text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500">
              <Bell className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-x-3">
              <div className="flex items-center gap-x-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{getRoleName()}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

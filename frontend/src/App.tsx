import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import ProjectMembers from './pages/ProjectMembers';
import Tasks from './pages/Tasks';
import Materials from './pages/Materials';
import Labours from './pages/Labours';
import Issues from './pages/Issues';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Commercial from './pages/Commercial';
import CommercialSiteTransfers from './pages/CommercialSiteTransfers';
import CommercialPettyCash from './pages/CommercialPettyCash';
// New Material Management Pages
import MaterialManagementDashboard from './pages/MaterialManagementDashboard';
import MrrFlowComponent from './components/MrrFlowComponent';
import UnifiedMaterialIssue from './pages/UnifiedMaterialIssue';
import MaterialReturn from './pages/MaterialReturn';
import MaterialConsumption from './pages/MaterialConsumption';
import InventoryManagement from './pages/InventoryManagement';
import PurchaseOrderManagement from './pages/PurchaseOrderManagement';
import MaterialReceiptManagement from './pages/MaterialReceiptManagement';
import SupplierLedgerManagement from './pages/SupplierLedgerManagement';
import WorkflowStatusTracking from './pages/WorkflowStatusTracking';
// Purchase Order Pages
import PurchaseOrders from './pages/PurchaseOrders';
import CreatePurchaseOrder from './pages/CreatePurchaseOrder';
import EditPurchaseOrder from './pages/EditPurchaseOrder';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import PurchaseOrderReceipts from './pages/PurchaseOrderReceipts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 429 (rate limit) errors
        if (error?.response?.status === 429) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <div className="App">
                <Toaster position="top-right" />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/projects/new" element={<NewProject />} />
                            <Route path="/projects/:id" element={<ProjectDetail />} />
                            <Route path="/project-members" element={<ProjectMembers />} />
                            <Route path="/tasks" element={<Tasks />} />
                            <Route path="/materials" element={<Materials />} />
                            <Route path="/labours" element={<Labours />} />
                            <Route path="/issues" element={<Issues />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/documents" element={<Documents />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/users" element={<Users />} />
                            <Route path="/profile" element={<Profile />} />
                            {/* Commercial Routes */}
                            <Route path="/commercial" element={<Commercial />} />
                            <Route path="/commercial/site-transfers" element={<CommercialSiteTransfers />} />
                            <Route path="/commercial/petty-cash" element={<CommercialPettyCash />} />
                            {/* New Material Management Routes */}
                            <Route path="/material-management" element={<MaterialManagementDashboard />} />
                            <Route path="/material-management/mrr" element={<MrrFlowComponent />} />
                            <Route path="/material-management/issue" element={<UnifiedMaterialIssue />} />
                            <Route path="/material-management/return" element={<MaterialReturn />} />
                            <Route path="/material-management/consumption" element={<MaterialConsumption />} />
                            <Route path="/material-management/inventory" element={<InventoryManagement />} />
                            <Route path="/material-management/purchase-orders" element={<PurchaseOrderManagement />} />
                            <Route path="/material-management/receipts" element={<MaterialReceiptManagement />} />
                            <Route path="/material-management/supplier-ledger" element={<SupplierLedgerManagement />} />
                            <Route path="/material-management/workflow" element={<WorkflowStatusTracking />} />
                            {/* Purchase Order Routes */}
                            <Route path="/purchase-orders" element={<PurchaseOrders />} />
                            <Route path="/purchase-orders/create" element={<CreatePurchaseOrder />} />
                            <Route path="/create-purchase-order" element={<CreatePurchaseOrder />} />
                            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetails />} />
                            <Route path="/purchase-orders/:id/edit" element={<EditPurchaseOrder />} />
                            <Route path="/purchase-orders/:id/receipts" element={<PurchaseOrderReceipts />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </div>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
export {};

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
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
import Profile from './pages/Profile';
import Commercial from './pages/Commercial';
import CommercialPettyCash from './pages/CommercialPettyCash';
import SubcontractorLedger from './pages/SubcontractorLedger';
import SubcontractorMaterialIssueReport from './pages/SubcontractorMaterialIssueReport';
// New Material Management Pages
import MaterialManagementDashboard from './pages/MaterialManagementDashboard';
import MrrFlowComponent from './components/MrrFlowComponent';
import UnifiedMaterialIssue from './pages/UnifiedMaterialIssue';
import MaterialReturn from './pages/MaterialReturn';
import MaterialConsumption from './pages/MaterialConsumption';
import InventoryManagement from './pages/InventoryManagement';
import MaterialReceiptManagement from './pages/MaterialReceiptManagement';
import SupplierLedgerManagement from './pages/SupplierLedgerManagement';
import WorkflowStatusTracking from './pages/WorkflowStatusTracking';
// Purchase Order Pages
import PurchaseOrders from './pages/PurchaseOrders';
import CreatePurchaseOrder from './pages/CreatePurchaseOrder';
import EditPurchaseOrder from './pages/EditPurchaseOrder';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import PurchaseOrderReceipts from './pages/PurchaseOrderReceipts';
// Admin Pages
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminItems from './pages/admin/AdminItems';

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
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Routes>
                            <Route path="/dashboard" element={<RoleBasedRoute><Dashboard /></RoleBasedRoute>} />
                            <Route path="/projects" element={<RoleBasedRoute><Projects /></RoleBasedRoute>} />
                            <Route path="/projects/new" element={<RoleBasedRoute><NewProject /></RoleBasedRoute>} />
                            <Route path="/projects/:id" element={<RoleBasedRoute><ProjectDetail /></RoleBasedRoute>} />
                            <Route path="/project-members" element={<RoleBasedRoute><ProjectMembers /></RoleBasedRoute>} />
                            <Route path="/tasks" element={<RoleBasedRoute><Tasks /></RoleBasedRoute>} />
                            <Route path="/materials" element={<RoleBasedRoute><Materials /></RoleBasedRoute>} />
                            <Route path="/labours" element={<RoleBasedRoute><Labours /></RoleBasedRoute>} />
                            <Route path="/issues" element={<RoleBasedRoute><Issues /></RoleBasedRoute>} />
                            <Route path="/reports" element={<RoleBasedRoute><Reports /></RoleBasedRoute>} />
                            <Route path="/reports/subcontractor-material-issues" element={<RoleBasedRoute><SubcontractorMaterialIssueReport /></RoleBasedRoute>} />
                            <Route path="/documents" element={<RoleBasedRoute><Documents /></RoleBasedRoute>} />
                            <Route path="/expenses" element={<RoleBasedRoute><Expenses /></RoleBasedRoute>} />
                            <Route path="/profile" element={<RoleBasedRoute><Profile /></RoleBasedRoute>} />
                            {/* Commercial Routes */}
                            <Route path="/commercial" element={<RoleBasedRoute><Commercial /></RoleBasedRoute>} />
                            <Route path="/commercial/petty-cash" element={<RoleBasedRoute><CommercialPettyCash /></RoleBasedRoute>} />
                            <Route path="/commercial/subcontractor-ledger" element={<RoleBasedRoute><SubcontractorLedger /></RoleBasedRoute>} />
                            {/* New Material Management Routes */}
                            <Route path="/material-management" element={<RoleBasedRoute><MaterialManagementDashboard /></RoleBasedRoute>} />
                            <Route path="/material-management/mrr" element={<RoleBasedRoute><MrrFlowComponent /></RoleBasedRoute>} />
                            <Route path="/material-management/issue" element={<RoleBasedRoute><UnifiedMaterialIssue /></RoleBasedRoute>} />
                            <Route path="/material-management/return" element={<RoleBasedRoute><MaterialReturn /></RoleBasedRoute>} />
                            <Route path="/material-management/consumption" element={<RoleBasedRoute><MaterialConsumption /></RoleBasedRoute>} />
                            <Route path="/material-management/inventory" element={<RoleBasedRoute><InventoryManagement /></RoleBasedRoute>} />
                            <Route path="/material-management/receipts" element={<RoleBasedRoute><MaterialReceiptManagement /></RoleBasedRoute>} />
                            <Route path="/material-management/supplier-ledger" element={<RoleBasedRoute><SupplierLedgerManagement /></RoleBasedRoute>} />
                            <Route path="/material-management/workflow" element={<RoleBasedRoute><WorkflowStatusTracking /></RoleBasedRoute>} />
                            {/* Purchase Order Routes */}
                            <Route path="/purchase-orders" element={<RoleBasedRoute><PurchaseOrders /></RoleBasedRoute>} />
                            <Route path="/purchase-orders/create" element={<RoleBasedRoute><CreatePurchaseOrder /></RoleBasedRoute>} />
                            <Route path="/create-purchase-order" element={<RoleBasedRoute><CreatePurchaseOrder /></RoleBasedRoute>} />
                            <Route path="/purchase-orders/:id" element={<RoleBasedRoute><PurchaseOrderDetails /></RoleBasedRoute>} />
                            <Route path="/purchase-orders/:id/edit" element={<RoleBasedRoute><EditPurchaseOrder /></RoleBasedRoute>} />
                            <Route path="/purchase-orders/:id/receipts" element={<RoleBasedRoute><PurchaseOrderReceipts /></RoleBasedRoute>} />
                            {/* Admin Routes */}
                            <Route path="/admin/suppliers" element={
                              <RoleBasedRoute>
                                <AdminSuppliers />
                              </RoleBasedRoute>
                            } />
                            <Route path="/admin/users" element={
                              <RoleBasedRoute>
                                <AdminUsers />
                              </RoleBasedRoute>
                            } />
                            <Route path="/admin/items" element={
                              <RoleBasedRoute>
                                <AdminItems />
                              </RoleBasedRoute>
                            } />
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

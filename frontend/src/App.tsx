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
import CommercialInventory from './pages/CommercialInventory';
import CommercialSiteTransfers from './pages/CommercialSiteTransfers';
import CommercialMaterialIssue from './pages/CommercialMaterialIssue';
import CommercialMaterialReturn from './pages/CommercialMaterialReturn';
import CommercialPettyCash from './pages/CommercialPettyCash';
import CommercialConsumptions from './pages/CommercialConsumptions';

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
                            <Route path="/commercial/inventory" element={<CommercialInventory />} />
                            <Route path="/commercial/site-transfers" element={<CommercialSiteTransfers />} />
                            <Route path="/commercial/material-issue" element={<CommercialMaterialIssue />} />
                            <Route path="/commercial/material-return" element={<CommercialMaterialReturn />} />
                            <Route path="/commercial/petty-cash" element={<CommercialPettyCash />} />
                            <Route path="/commercial/consumptions" element={<CommercialConsumptions />} />
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

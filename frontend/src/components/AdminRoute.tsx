import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();

  // Check if user is admin
  const isAdmin = () => {
    if (!user?.role) return false;
    
    // Handle old string format
    if (typeof user.role === 'string') {
      return user.role === 'OWNER' || user.role === 'ADMIN';
    }
    
    // Handle new object format
    if (typeof user.role === 'object') {
      return user.role.name === 'Admin';
    }
    
    return false;
  };

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

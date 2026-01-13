import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasRouteAccess } from '../utils/rolePermissions';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredFeature?: string;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles,
  requiredFeature 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check route access using the route path
  const currentPath = location.pathname;
  if (!hasRouteAccess(user, currentPath)) {
    return <Navigate to="/dashboard" replace />;
  }

  // If allowedRoles is specified, check if user's role is in the list
  if (allowedRoles && allowedRoles.length > 0) {
    const roleName = typeof user.role === 'object' ? user.role.name : user.role;
    if (!allowedRoles.includes(roleName)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If requiredFeature is specified, check if user has that feature
  if (requiredFeature) {
    const { hasFeature } = require('../utils/rolePermissions');
    if (!hasFeature(user, requiredFeature as any)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default RoleBasedRoute;


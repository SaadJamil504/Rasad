import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RoleRoute = ({ children, requiredRole = 'owner' }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-container">Verifying Permissions...</div>;
  }

  if (!user || user.role !== requiredRole) {
    console.warn(`Access denied: User is not an ${requiredRole}`);
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;

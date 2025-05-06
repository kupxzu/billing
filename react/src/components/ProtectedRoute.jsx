import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // Check if user has admin role
  if (currentUser.role !== 'admin') {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default ProtectedRoute;
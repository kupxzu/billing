import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PatientRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // Check if user has patient role
  if (currentUser.role !== 'patient') {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default PatientRoute;
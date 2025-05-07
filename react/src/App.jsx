import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import BillingDashboard from './pages/BillingDashboard';
import StatementViewer from './pages/StatementViewer';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
      <Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/statement/:token" element={<StatementViewer />} />
  
  {/* Admin routes */}
  <Route 
    path="/admin/dashboard" 
    element={
      <AdminRoute>
        <BillingDashboard />
      </AdminRoute>
    } 
  />
  
  {/* Default routes */}
  <Route path="/" element={<Navigate to="/login" />} />
  <Route path="*" element={<Navigate to="/login" />} />
</Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
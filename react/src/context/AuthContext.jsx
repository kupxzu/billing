import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    // Get user from localStorage through service
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      
      // Verify token is still valid with backend
      authService.verifyToken().then(isValid => {
        if (!isValid) {
          // If token is invalid, log out
          logout();
        }
      });
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const user = await authService.login(email, password);
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
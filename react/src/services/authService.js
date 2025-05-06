import api from './api';

const authService = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      
      if (response.data.status && response.data.data) {
        // Store user info and token
        const userData = response.data.data.user;
        const token = response.data.data.token;
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        
        return userData;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw error;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      // Call logout API endpoint to invalidate token
      await api.post('/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local storage, even if API fails
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },
  
  // Get current user info
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  },
  
  // Verify token is still valid
  verifyToken: async () => {
    try {
      const response = await api.get('/user');
      return response.data.status;
    } catch (error) {
      return false;
    }
  }
};

export default authService;
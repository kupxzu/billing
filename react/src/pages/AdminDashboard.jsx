import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { currentUser } = useAuth();

  return (
    <div className="dashboard-container">
      <Navbar />
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>Welcome to Your Admin Dashboard</h2>
          <p>Manage your application from this central location</p>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Users</h3>
            <p className="stat-value">1,245</p>
          </div>
          
          <div className="stat-card">
            <h3>Products</h3>
            <p className="stat-value">342</p>
          </div>
          
          <div className="stat-card">
            <h3>Orders</h3>
            <p className="stat-value">867</p>
          </div>
          
          <div className="stat-card">
            <h3>Revenue</h3>
            <p className="stat-value">$24,589</p>
          </div>
        </div>
        
        <div className="dashboard-recent">
          <div className="recent-section">
            <h3>Recent Activity</h3>
            <ul className="activity-list">
              <li>
                <span className="activity-time">10:30 AM</span>
                <span className="activity-text">New user registered</span>
              </li>
              <li>
                <span className="activity-time">09:45 AM</span>
                <span className="activity-text">Order #38492 completed</span>
              </li>
              <li>
                <span className="activity-time">Yesterday</span>
                <span className="activity-text">Product inventory updated</span>
              </li>
              <li>
                <span className="activity-time">Yesterday</span>
                <span className="activity-text">New promotion created</span>
              </li>
              <li>
                <span className="activity-time">2 days ago</span>
                <span className="activity-text">System maintenance performed</span>
              </li>
            </ul>
          </div>
          
          <div className="recent-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="action-button">Add New User</button>
              <button className="action-button">Create Product</button>
              <button className="action-button">View Reports</button>
              <button className="action-button">Manage Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './PatientPortal.css';

const PatientPortal = () => {
  const [profile, setProfile] = useState(null);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch patient profile and statements
// Fetch patient data
const fetchPatientData = async () => {
  try {
    setLoading(true);
    
    // Get patient profile
    const profileResponse = await api.get('/patient/profile');
    setProfile(profileResponse.data.data);
    
    // Get patient statements with better error logging
    try {
      const statementsResponse = await api.get('/patient/statements');
      console.log('API Response:', statementsResponse); // Log the entire response
      setStatements(statementsResponse.data.data.data || []);
    } catch (statementsError) {
      console.error('Statements Error Response:', statementsError.response?.data);
      setError('Failed to load statements. ' + (statementsError.response?.data?.message || statementsError.message));
    }
    
    setLoading(false);
  } catch (err) {
    console.error('Error Details:', err.response?.data);
    setError('Failed to load patient data. ' + (err.response?.data?.message || err.message));
    setLoading(false);
  }
};
    
    fetchPatientData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  const handleViewStatement = (id) => {
    window.open(`/patient/statement/${id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="patient-portal-loading">
        <div className="spinner"></div>
        <p>Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="patient-portal">
      <header className="portal-header">
        <div className="header-content">
          <h1>Patient Portal</h1>
          <div className="user-info">
            {profile && (
              <>
                <span className="username">{profile.name}</span>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <div className="portal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'statements' ? 'active' : ''}`}
          onClick={() => setActiveTab('statements')}
        >
          Statements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </div>
      
      <div className="portal-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="welcome-card">
              <h2>Welcome, {profile?.name}</h2>
              <p>Welcome to your patient portal. Here you can view your statements and manage your profile information.</p>
            </div>
            
            <div className="quick-stats">
              <div className="stat-card">
                <h3>Statements</h3>
                <p className="stat-value">{statements.length}</p>
              </div>
              {statements.length > 0 && (
                <div className="stat-card">
                  <h3>Latest Statement</h3>
                  <p className="stat-value">${statements[0].total_amount}</p>
                  <p className="stat-date">Issued: {statements[0].issue_date}</p>
                </div>
              )}
            </div>
            
            <div className="recent-activity">
              <h3>Recent Statements</h3>
              {statements.length > 0 ? (
                <div className="recent-statements">
                  {statements.slice(0, 3).map(statement => (
                    <div key={statement.id} className="statement-card">
                      <div className="statement-info">
                        <h4>{statement.statement_number}</h4>
                        <p>Issue Date: {statement.issue_date}</p>
                        <p>Due Date: {statement.due_date}</p>
                      </div>
                      <div className="statement-amount">
                        <p className="amount">${statement.total_amount}</p>
                        <button 
                          className="view-btn"
                          onClick={() => handleViewStatement(statement.id)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-statements">No statements available.</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'statements' && (
          <div className="statements-tab">
            <h2>Your Statements</h2>
            {statements.length > 0 ? (
              <div className="statements-table">
                <div className="table-header">
                  <div className="header-cell">Statement #</div>
                  <div className="header-cell">Issue Date</div>
                  <div className="header-cell">Due Date</div>
                  <div className="header-cell">Status</div>
                  <div className="header-cell">Amount</div>
                  <div className="header-cell">Actions</div>
                </div>
                {statements.map(statement => (
                  <div key={statement.id} className="table-row">
                    <div className="cell">{statement.statement_number}</div>
                    <div className="cell">{statement.issue_date}</div>
                    <div className="cell">{statement.due_date}</div>
                    <div className="cell">
                      <span className={`status-badge ${statement.status}`}>
                        {statement.status}
                      </span>
                    </div>
                    <div className="cell">${statement.total_amount}</div>
                    <div className="cell">
                      <button 
                        className="view-statement-btn"
                        onClick={() => handleViewStatement(statement.id)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-statements">You don't have any statements yet.</p>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h2>Your Profile</h2>
            {profile && (
              <div className="profile-details">
                <div className="profile-field">
                  <label>Name:</label>
                  <p>{profile.name}</p>
                </div>
                <div className="profile-field">
                  <label>Email:</label>
                  <p>{profile.email}</p>
                </div>
                <div className="profile-field">
                  <label>Member Since:</label>
                  <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientPortal;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './StatementViewer.css';

const StatementViewer = () => {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { token } = useParams();
  
  useEffect(() => {
    if (token) {
      // Direct access via token URL
      window.location.href = `/api/statement/view/${token}`;
    } else {
      setError('Invalid access method. Please scan a valid QR code.');
      setLoading(false);
    }
  }, [token]);
  
  if (loading) {
    return (
      <div className="statement-viewer-loading">
        <div className="spinner"></div>
        <p>Loading statement...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="statement-error">
        <div className="error-icon">!</div>
        <h2>Error Loading Statement</h2>
        <p>{error}</p>
        <button 
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }
  
  // If token is provided, the page will redirect to the PDF
  if (token) {
    return null;
  }
  
  // If patient is viewing their statement
  return (
    <div className="statement-viewer">
      <div className="statement-header">
        <h1>Statement of Account</h1>
        <button 
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          Back to Dashboard
        </button>
      </div>
      
      {statement && (
        <div className="statement-container">
          <div className="statement-info">
            <div className="info-section">
              <h3>Statement Details</h3>
              <div className="info-row">
                <label>Statement #:</label>
                <p>{statement.statement_number}</p>
              </div>
              <div className="info-row">
                <label>Issue Date:</label>
                <p>{statement.issue_date}</p>
              </div>
              <div className="info-row">
                <label>Due Date:</label>
                <p>{statement.due_date}</p>
              </div>
              <div className="info-row">
                <label>Status:</label>
                <p className={`status-badge ${statement.status}`}>{statement.status}</p>
              </div>
            </div>
            
            <div className="info-section">
              <h3>Amount Due</h3>
              <div className="amount-display">
                <span className="currency">$</span>
                <span className="amount">{parseFloat(statement.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="services-table">
            <h3>Services</h3>
            
            {statement.services && statement.services.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.services.map(service => (
                    <tr key={service.id}>
                      <td>{service.description}</td>
                      <td>{service.service_date}</td>
                      <td className="amount-cell">${parseFloat(service.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan="2">Total Amount Due</td>
                    <td className="amount-cell">${parseFloat(statement.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="no-services">No services listed for this statement.</p>
            )}
          </div>
          
          <div className="payment-info">
            <h3>Payment Information</h3>
            <p>Please make payment before the due date to avoid any late fees. For questions about this statement, please contact our billing department.</p>
            
            <div className="payment-methods">
              <h4>Payment Methods</h4>
              <ul>
                <li>Online: Visit our patient portal to make a secure payment</li>
                <li>Phone: Call (555) 123-4567 to make a payment by phone</li>
                <li>Mail: Send check to Medical Center Hospital, 123 Health Avenue, Medical District</li>
              </ul>
            </div>
          </div>
          
          <div className="statement-actions">
            <button className="print-btn" onClick={() => window.print()}>Print Statement</button>
            <button className="download-btn">Download PDF</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementViewer;
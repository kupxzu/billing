import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './BillingDashboard.css';

const BillingDashboard = () => {
  // State for data
  const [patients, setPatients] = useState([]);
  const [statements, setStatements] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [filteredStatements, setFilteredStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showCreateStatement, setShowCreateStatement] = useState(false);
  const [showQrGenerator, setShowQrGenerator] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);

  // Search and filter state
  const [patientSearch, setPatientSearch] = useState('');
  const [statementSearch, setStatementSearch] = useState('');
  const [statementFilter, setStatementFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ startDate: '', endDate: '' });

  // Form state for create statement
  const [formData, setFormData] = useState({
    patient_id: '',
    issue_date: '',
    due_date: '',
    services: [{ description: '', date: '', amount: '' }]
  });

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch patients and statements
    const fetchBillingData = async () => {
      try {
        setLoading(true);

        // Get patients
        const patientsResponse = await api.get('/billing/patients');
        setPatients(patientsResponse.data.data);
        setFilteredPatients(patientsResponse.data.data);

        // Get all statements
        const statementsResponse = await api.get('/billing/statements');
        setStatements(statementsResponse.data.data.data);
        setFilteredStatements(statementsResponse.data.data.data);

        setLoading(false);
      } catch (err) {
        setError('Failed to load billing data. Please try again later.');
        setLoading(false);
        console.error('Error fetching billing data:', err);
      }
    };

    fetchBillingData();
  }, []);

  // Search and filter effects
  useEffect(() => {
    // Filter patients based on search
    if (patientSearch.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const searchTerm = patientSearch.toLowerCase();
      const filtered = patients.filter(
        patient =>
          patient.name.toLowerCase().includes(searchTerm) ||
          patient.email.toLowerCase().includes(searchTerm)
      );
      setFilteredPatients(filtered);
    }
  }, [patientSearch, patients]);

  useEffect(() => {
    // Filter statements based on search and filters
    let filtered = [...statements];

    // Apply search term
    if (statementSearch.trim() !== '') {
      const searchTerm = statementSearch.toLowerCase();
      filtered = filtered.filter(
        statement =>
          statement.statement_number.toLowerCase().includes(searchTerm) ||
          (statement.user?.name && statement.user.name.toLowerCase().includes(searchTerm))
      );
    }

    // Apply status filter
    if (statementFilter !== 'all') {
      filtered = filtered.filter(statement => statement.status === statementFilter);
    }

    // Apply date range filter
    if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
      const startDate = new Date(dateRangeFilter.startDate);
      const endDate = new Date(dateRangeFilter.endDate);
      endDate.setHours(23, 59, 59); // Set to end of day

      filtered = filtered.filter(statement => {
        const issueDate = new Date(statement.issue_date);
        return issueDate >= startDate && issueDate <= endDate;
      });
    }

    setFilteredStatements(filtered);
  }, [statementSearch, statementFilter, dateRangeFilter, statements]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePatientSelect = async (patientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/billing/patients/${patientId}`);
      setSelectedPatient(response.data.data.patient);
      setLoading(false);
    } catch (err) {
      setError('Failed to load patient details.');
      setLoading(false);
      console.error('Error fetching patient details:', err);
    }
  };

  const getQrStatus = (statement) => {
    const hasQr = statement.access_token !== null;
    let isExpired = false;

    if (hasQr && statement.token_expires_at) {
      isExpired = new Date(statement.token_expires_at) <= new Date();
    }

    return { hasQr, isExpired };
  };
  const handleQrAction = async (statementId) => {
    const statement = statements.find(s => s.id === statementId);

    // Check if statement already has QR
    const { hasQr, isExpired } = getQrStatus(statement);

    if (hasQr && !isExpired) {
      // If QR exists and is not expired, just view it
      setSelectedStatement(statement);
      setShowQrGenerator(true);

      // Fetch QR data directly
      try {
        const response = await api.get(`/billing/statements/${statementId}/qr`);
        setQrCodeData(response.data.data);
      } catch (err) {
        console.error('Error fetching QR code data:', err);
        setError('Failed to retrieve QR code data. Please try again.');
      }
    } else {
      // If no QR or expired, generate a new one
      handleGenerateQR(statementId);
    }
  };

  const handleUpdateExpiration = async (statementId, days) => {
    try {
      setLoading(true);

      const response = await api.put(`/billing/statements/${statementId}/qr-expiration`, {
        expiry_days: days
      });

      // Update the QR code data with new expiration
      setQrCodeData(response.data.data);

      // Also update the statement in the list
      const updatedStatements = statements.map(s => {
        if (s.id === statementId) {
          return {
            ...s,
            token_expires_at: response.data.data.expires_at
          };
        }
        return s;
      });

      setStatements(updatedStatements);
      setLoading(false);

      // Show success message
      alert('QR code expiration date updated successfully!');
    } catch (err) {
      console.error('Error updating QR expiration:', err);
      setError('Failed to update QR code expiration. Please try again.');
      setLoading(false);
    }
  };

  const QrGeneratorModal = () => {
    const [newExpiryDays, setNewExpiryDays] = useState(7);

    if (!showQrGenerator || !qrCodeData || !selectedStatement) return null;

    const { isExpired } = getQrStatus(selectedStatement);
    const expiration = new Date(qrCodeData.expires_at);
    const today = new Date();
    const daysLeft = Math.ceil((expiration - today) / (1000 * 60 * 60 * 24));

    return (
      <div className="modal-overlay">
        <div className="modal-container qr-modal">
          <div className="modal-header">
            <h3>Statement QR Code</h3>
            <button className="close-btn" onClick={handleCloseQrGenerator}>×</button>
          </div>

          <div className="qr-content">
            <div className="qr-info">
              <p><strong>Statement:</strong> {selectedStatement.statement_number}</p>
              <p><strong>Patient:</strong> {selectedStatement.user?.name || 'Unknown'}</p>
              <p><strong>Amount:</strong> ${parseFloat(selectedStatement.total_amount).toFixed(2)}</p>
              <p className="expiration-info">
                <strong>Expires:</strong> {new Date(qrCodeData.expires_at).toLocaleDateString()}
                {isExpired ? (
                  <span className="expired-tag">Expired</span>
                ) : (
                  <span className="active-tag">{daysLeft} days left</span>
                )}
              </p>
            </div>

            <div className="qr-image-container">
              <img src={qrCodeData.qr_url} alt="QR Code" className="qr-image" />
            </div>

            <div className="expiry-editor">
              <h4>Update Expiration</h4>
              <div className="expiry-form">
                <div className="form-group">
                  <label>Set expiration (days):</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newExpiryDays}
                    onChange={(e) => setNewExpiryDays(parseInt(e.target.value))}
                  />
                </div>
                <button
                  className="update-expiry-btn"
                  onClick={() => handleUpdateExpiration(selectedStatement.id, newExpiryDays)}
                >
                  Update Expiration
                </button>
              </div>
            </div>

            <div className="qr-links">
              <div className="link-group">
                <label>PDF Link:</label>
                <div className="link-box">
                  <input type="text" value={qrCodeData.pdf_url} readOnly />
                  <button onClick={() => navigator.clipboard.writeText(qrCodeData.pdf_url)}>Copy</button>
                </div>
              </div>

              <div className="link-group">
                <label>Direct Link:</label>
                <div className="link-box">
                  <input type="text" value={qrCodeData.direct_url} readOnly />
                  <button onClick={() => navigator.clipboard.writeText(qrCodeData.direct_url)}>Copy</button>
                </div>
              </div>
            </div>

            <div className="qr-buttons">
              <a 
                href={qrCodeData.direct_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="view-pdf-btn"
              >
                View PDF
              </a>
              <a 
                href={qrCodeData.qr_url} 
                download 
                className="download-qr-btn"
              >
                Download QR
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateStatementToggle = () => {
    setShowCreateStatement(!showCreateStatement);
    setFormData({
      patient_id: selectedPatient ? selectedPatient.id : '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      services: [{ description: '', date: new Date().toISOString().split('T')[0], amount: '' }]
    });
  };

  const handleAddService = () => {
    setFormData({
      ...formData,
      services: [
        ...formData.services,
        { description: '', date: new Date().toISOString().split('T')[0], amount: '' }
      ]
    });
  };

  const handleRemoveService = (index) => {
    const updatedServices = formData.services.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      services: updatedServices
    });
  };

  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...formData.services];
    updatedServices[index][field] = value;
    setFormData({
      ...formData,
      services: updatedServices
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCreateStatement = async (e) => {
    e.preventDefault();
    try {
      // console.log('Creating statement with data:', JSON.stringify(formData, null, 2));
      setLoading(true);
      const response = await api.post('/billing/statements', formData);

      // Refresh statements list
      const statementsResponse = await api.get('/billing/statements');
      setStatements(statementsResponse.data.data.data);

      // Apply filters to updated data
      const searchTerm = statementSearch.toLowerCase();
      let filtered = statementsResponse.data.data.data;

      if (statementSearch.trim() !== '') {
        filtered = filtered.filter(
          statement =>
            statement.statement_number.toLowerCase().includes(searchTerm) ||
            (statement.user?.name && statement.user.name.toLowerCase().includes(searchTerm))
        );
      }

      if (statementFilter !== 'all') {
        filtered = filtered.filter(statement => statement.status === statementFilter);
      }

      setFilteredStatements(filtered);

      setShowCreateStatement(false);
      setLoading(false);
      alert('Statement created successfully!');
    } catch (err) {
      console.error('Error creating statement:', err);
      console.error('Error response:', err.response?.data);
      setError('Failed to create statement. Please check your inputs and try again.');
      setLoading(false);
    }
  };

  const handleGenerateQR = async (statementId) => {
    try {
      setLoading(true);
      const statement = statements.find(s => s.id === statementId);
      setSelectedStatement(statement);
      setShowQrGenerator(true);

      const response = await api.post('/billing/statements/generate-qr', {
        statement_id: statementId,
        expiry_days: 7
      });

      setQrCodeData(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code. Please try again.');
      setLoading(false);
    }
  };

  const handlePrintQR = async (statementId) => {
    try {
      setLoading(true);
      const response = await api.post('/billing/statements/generate-qr', {
        statement_id: statementId,
        expiry_days: 30 // Longer expiry for patient use
      });
      
      // Get QR code URL and direct URL for PDF viewing
      const qrCodeUrl = response.data.data.qr_url;
      const directUrl = response.data.data.direct_url;
      
      // Open a new window with just the QR code for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Statement QR Code</title>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                flex-direction: column;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                margin-bottom: 20px;
              }
              img {
                max-width: 100%;
                height: auto;
                border: 1px solid #eee;
                padding: 10px;
              }
              .instructions {
                max-width: 400px;
                margin: 20px auto;
                text-align: center;
              }
              .view-link {
                margin-top: 15px;
                display: block;
                text-align: center;
              }
              .view-link a {
                color: #3474eb;
                text-decoration: none;
              }
              .view-link a:hover {
                text-decoration: underline;
              }
              @media print {
                .no-print {
                  display: none;
                }
                .page-break {
                  page-break-after: always;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>Statement of Account QR Code</h2>
              <p>Statement #: ${response.data.data.statement.statement_number}</p>
              <img src="${qrCodeUrl}" alt="Statement QR Code" />
            </div>
            <div class="instructions">
              <p>Scan this QR code to view your Statement of Account.</p>
              <p>This code will expire on ${new Date(response.data.data.expires_at).toLocaleDateString()}.</p>
              <div class="view-link">
                <a href="${directUrl}" target="_blank">View Statement Directly</a>
              </div>
            </div>
            <div class="no-print">
              <button onclick="window.print()">Print QR Code</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setLoading(false);
    } catch (err) {
      setError('Failed to generate QR code for printing. Please try again.');
      setLoading(false);
      console.error('Error generating QR code for printing:', err);
    }
  };
  const handleCloseQrGenerator = () => {
    setShowQrGenerator(false);
    setSelectedStatement(null);
    setQrCodeData(null);
  };

  const resetFilters = () => {
    setStatementSearch('');
    setStatementFilter('all');
    setDateRangeFilter({ startDate: '', endDate: '' });
    setFilteredStatements(statements);
  };

  if (loading && patients.length === 0) {
    return (
      <div className="billing-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading billing dashboard...</p>
      </div>
    );
  }

  return (
    <div className="billing-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Billing Dashboard</h1>
          <div className="user-info">
            {currentUser && (
              <>
                <span className="username">{currentUser.name}</span>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          Patients
        </button>
        <button
          className={`tab-btn ${activeTab === 'statements' ? 'active' : ''}`}
          onClick={() => setActiveTab('statements')}
        >
          Statements
        </button>
      </div>

      <div className="dashboard-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="welcome-card">
              <h2>Welcome to Billing Dashboard</h2>
              <p>Manage patient statements, generate QR codes, and track billing information.</p>
            </div>

            <div className="quick-stats">
              <div className="stat-card">
                <h3>Total Patients</h3>
                <p className="stat-value">{patients.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Statements</h3>
                <p className="stat-value">{statements.length}</p>
              </div>
              <div className="stat-card">
                <h3>Revenue</h3>
                <p className="stat-value">
                ₱{statements.reduce((total, statement) => total + parseFloat(statement.total_amount), 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="dashboard-search">
              <h3>Quick Search</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search statements by number or patient name"
                  value={statementSearch}
                  onChange={(e) => setStatementSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Statements</h3>
              {filteredStatements.length > 0 ? (
                <div className="recent-statements">
                  {filteredStatements.slice(0, 5).map(statement => {
                    const { hasQr, isExpired } = getQrStatus(statement);
                    return (
                      <div key={statement.id} className="statement-card">
                        <div className="statement-info">
                          <h4>{statement.statement_number}</h4>
                          <p>Patient: {statement.user?.name || 'Unknown'}</p>
                          <p>Issue Date: {statement.issue_date}</p>
                          {hasQr && (
                            <div className="qr-status">
                              {isExpired ? (
                                <span className="qr-status-expired">QR Expired</span>
                              ) : (
                                <span className="qr-status-active">QR Active</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="statement-amount">
                          <p className="amount">₱{parseFloat(statement.total_amount).toFixed(2)}</p>
                          <div className="statement-actions">
                            <button
                              className={`qr-btn ${hasQr && !isExpired ? 'view-qr' : 'generate-qr'}`}
                              onClick={() => handleQrAction(statement.id)}
                            >
                              {hasQr && !isExpired ? 'View QR' : (hasQr && isExpired ? 'Renew QR' : 'Generate QR')}
                            </button>
                            <button
                              className="print-qr-btn"
                              onClick={() => handlePrintQR(statement.id)}
                            >
                              Print QR
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-statements">No statements found matching your search criteria.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="patients-tab">
            <h2>Patients</h2>

            <div className="search-filter-container">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search patients by name or email"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                {patientSearch && (
                  <button
                    className="clear-search"
                    onClick={() => setPatientSearch('')}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="results-count">
                <span>{filteredPatients.length} patients found</span>
              </div>
            </div>

            <div className="patients-list-container">
              <div className="patients-list">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(patient => (
                    <div
                      key={patient.id}
                      className={`patient-item ${selectedPatient && selectedPatient.id === patient.id ? 'active' : ''}`}
                      onClick={() => handlePatientSelect(patient.id)}
                    >
                      <h3>{patient.name}</h3>
                      <p>{patient.email}</p>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    <p>No patients found matching your search.</p>
                  </div>
                )}
              </div>

              <div className="patient-details">
                {selectedPatient ? (
                  <>
                    <div className="patient-details-header">
                      <h3>{selectedPatient.name}</h3>
                      <button
                        className="create-statement-btn"
                        onClick={handleCreateStatementToggle}
                      >
                        Create Statement
                      </button>
                    </div>

                    <div className="patient-info-card">
                      <div className="info-row">
                        <label>Email:</label>
                        <p>{selectedPatient.email}</p>
                      </div>
                      <div className="info-row">
                        <label>Registered:</label>
                        <p>{new Date(selectedPatient.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <h4>Patient Statements</h4>
                    {statements.filter(s => s.user_id === selectedPatient.id).length > 0 ? (
                      <div className="patient-statements">
                        {statements
                          .filter(s => s.user_id === selectedPatient.id)
                          .map(statement => {
                            const { hasQr, isExpired } = getQrStatus(statement);
                            return (
                              <div key={statement.id} className="statement-row">
                                <div className="statement-row-info">
                                  <p className="statement-number">{statement.statement_number}</p>
                                  <p>Issued: {statement.issue_date}</p>
                                  <p>Due: {statement.due_date}</p>
                                  <p className="statement-status">{statement.status}</p>
                                  {hasQr && (
                                    <p className={`qr-status ${isExpired ? 'expired' : 'active'}`}>
                                      QR: {isExpired ? 'Expired' : 'Active'}
                                    </p>
                                  )}
                                </div>
                                <div className="statement-row-amount">
                                  <p>₱{parseFloat(statement.total_amount).toFixed(2)}</p>
                                  <div className="row-actions">
                                    <button
                                      className={`${hasQr && !isExpired ? 'view-qr-btn' : 'generate-qr-btn'}`}
                                      onClick={() => handleQrAction(statement.id)}
                                    >
                                      {hasQr && !isExpired ? 'View QR' : (hasQr && isExpired ? 'Renew QR' : 'Generate QR')}
                                    </button>
                                    <button
                                      className="print-qr-btn small"
                                      onClick={() => handlePrintQR(statement.id)}
                                    >
                                      Print QR
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    ) : (
                      <p className="no-statements">No statements for this patient.</p>
                    )}
                  </>
                ) : (
                  <div className="no-patient-selected">
                    <p>Select a patient to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statements' && (
          <div className="statements-tab">
            <h2>All Statements</h2>

            <div className="advanced-filters">
              <div className="filter-row">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by statement # or patient"
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                  />
                  {statementSearch && (
                    <button
                      className="clear-search"
                      onClick={() => setStatementSearch('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="filter-select">
                  <label>Status:</label>
                  <select
                    value={statementFilter}
                    onChange={(e) => setStatementFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="filter-row">
                <div className="date-filter">
                  <label>Date Range:</label>
                  <input
                    type="date"
                    value={dateRangeFilter.startDate}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, startDate: e.target.value })}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRangeFilter.endDate}
                    onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, endDate: e.target.value })}
                  />
                </div>

                <button
                  className="reset-filters-btn"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>

              <div className="results-count">
                <span>{filteredStatements.length} statements found</span>
              </div>
            </div>

            {filteredStatements.length > 0 ? (
              <div className="statements-table">
                <div className="table-header">
                  <div className="header-cell">Statement #</div>
                  <div className="header-cell">Patient</div>
                  <div className="header-cell">Issue Date</div>
                  <div className="header-cell">Due Date</div>
                  <div className="header-cell">Status</div>
                  <div className="header-cell">Amount</div>
                  <div className="header-cell">Actions</div>
                </div>

                {filteredStatements.map(statement => {
                  const { hasQr, isExpired } = getQrStatus(statement);
                  return (
                    <div key={statement.id} className="table-row">
                      <div className="cell">{statement.statement_number}</div>
                      <div className="cell">{statement.user?.name || 'Unknown'}</div>
                      <div className="cell">{statement.issue_date}</div>
                      <div className="cell">{statement.due_date}</div>
                      <div className="cell">
                        <span className={`status-badge ${statement.status}`}>
                          {statement.status}
                        </span>
                      </div>
                      <div className="cell">₱{parseFloat(statement.total_amount).toFixed(2)}</div>
                      <div className="cell actions">
                        <button
                          className={`action-btn ${hasQr && !isExpired ? 'view-qr-btn' : 'qr-btn'}`}
                          onClick={() => handleQrAction(statement.id)}
                        >
                          {hasQr && !isExpired ? 'View QR' : (hasQr && isExpired ? 'Renew QR' : 'Generate QR')}
                        </button>
                        {hasQr && (
                          <span className={`qr-indicator ${isExpired ? 'expired' : 'active'}`}>
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-statements">No statements found matching your search criteria.</p>
            )}
          </div>
        )}
      </div>

      {/* Create Statement Modal */}
      {showCreateStatement && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Create Statement for {selectedPatient.name}</h3>
              <button className="close-btn" onClick={handleCreateStatementToggle}>×</button>
            </div>

            <form onSubmit={handleCreateStatement}>
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="services-section">
                <h4>Services</h4>

                {formData.services.map((service, index) => (
                  <div key={index} className="service-item">
                    <div className="service-form">
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          value={service.description}
                          onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          value={service.date}
                          onChange={(e) => handleServiceChange(index, 'date', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Amount (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={service.amount}
                          onChange={(e) => handleServiceChange(index, 'amount', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {formData.services.length > 1 && (
                      <button
                        type="button"
                        className="remove-service-btn"
                        onClick={() => handleRemoveService(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="add-service-btn"
                  onClick={handleAddService}
                >
                  + Add Service
                </button>
              </div>

              <div className="total-amount">
                <h4>Total Amount</h4>
                <p className="calculated-total">
                ₱{formData.services.reduce((total, service) => total + (parseFloat(service.amount) || 0), 0).toFixed(2)}
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={handleCreateStatementToggle}>Cancel</button>
                <button type="submit" className="submit-btn">Create Statement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {showQrGenerator && qrCodeData && (
        <div className="modal-overlay">
          <div className="modal-container qr-modal">
            <div className="modal-header">
              <h3>Statement QR Code</h3>
              <button className="close-btn" onClick={handleCloseQrGenerator}>×</button>
            </div>

            <div className="qr-content">
              <div className="qr-info">
                <p><strong>Statement:</strong> {selectedStatement.statement_number}</p>
                <p><strong>Patient:</strong> {selectedStatement.user?.name || 'Unknown'}</p>
                <p><strong>Amount:</strong> ₱{parseFloat(selectedStatement.total_amount).toFixed(2)}</p>
                <p><strong>Expires:</strong> {new Date(qrCodeData.expires_at).toLocaleDateString()}</p>
              </div>

              <div className="qr-image-container">
                <img src={qrCodeData.qr_url} alt="QR Code" className="qr-image" />
              </div>

              <div className="qr-links">
                <div className="link-group">
                  <label>PDF Link:</label>
                  <div className="link-box">
                    <input type="text" value={qrCodeData.pdf_url} readOnly />
                    <button onClick={() => navigator.clipboard.writeText(qrCodeData.pdf_url)}>Copy</button>
                  </div>
                </div>

                <div className="link-group">
                  <label>Direct Link:</label>
                  <div className="link-box">
                    <input type="text" value={qrCodeData.direct_url} readOnly />
                    <button onClick={() => navigator.clipboard.writeText(qrCodeData.direct_url)}>Copy</button>
                  </div>
                </div>
              </div>

              <div className="qr-buttons">
                <a 
                  href={qrCodeData.direct_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="view-pdf-btn"
                >
                  View PDF
                </a>
                <a 
                  href={qrCodeData.qr_url} 
                  download 
                  className="download-qr-btn"
                >
                  Download QR
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
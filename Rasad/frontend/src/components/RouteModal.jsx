import React, { useState, useEffect } from 'react';
import { staffAPI, routeAPI } from '../services/api';
import './RouteModal.css';

const RouteModal = ({ isOpen, onClose, onRouteCreated, editRoute }) => {
  const [formData, setFormData] = useState({
    name: '',
    driver: '',
    customer_ids: []
  });
  const [drivers, setDrivers] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRoute) {
        setFormData({
          name: editRoute.name || '',
          driver: editRoute.driver || '',
          customer_ids: editRoute.assigned_customer_ids || []
        });
      } else {
        setFormData({ name: '', driver: '', customer_ids: [] });
      }
      fetchAssignmentData();
    }
  }, [isOpen, editRoute]);

  const fetchAssignmentData = async () => {
    try {
      const [driversRes, customersRes] = await Promise.all([
        staffAPI.getStaff('driver'),
        staffAPI.getStaff('customer') 
      ]);
      setDrivers(driversRes.data);
      
      // Eligibility: Unassigned or already in this route
      const eligible = customersRes.data.filter(c => 
        !c.route || (editRoute && c.route === editRoute.id)
      );
      setAvailableCustomers(eligible);
    } catch (err) {
      console.error('Failed to fetch assignment data:', err);
    }
  };

  const filteredCustomers = availableCustomers.filter(customer => 
    (customer.first_name || customer.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerToggle = (customerId) => {
    setFormData(prev => ({
      ...prev,
      customer_ids: prev.customer_ids.includes(customerId)
        ? prev.customer_ids.filter(id => id !== customerId)
        : [...prev.customer_ids, customerId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editRoute) {
        await routeAPI.updateRoute(editRoute.id, formData);
        alert('Route updated successfully!');
      } else {
        await routeAPI.createRoute(formData);
        alert('Route created successfully!');
      }
      onRouteCreated();
      onClose();
      setFormData({ name: '', driver: '', customer_ids: [] });
      setSearchTerm('');
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editRoute ? 'update' : 'create'} route.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content route-modal glass fade-in">
        <div className="modal-header">
          <div className="header-title">
            <span className="icon">{editRoute ? '🛠️' : '🚚'}</span>
            <h2>{editRoute ? 'Update Delivery Route' : 'Create Delivery Route'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Route Identity</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="e.g. Gulberg Morning"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Assign Driver</label>
              <select
                className="glass-input"
                required
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              >
                <option value="">Select a Driver</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name || driver.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <label style={{ margin: 0 }}>Assign Customers <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>({formData.customer_ids.length})</span></label>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Search by name or address..." 
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="selection-grid">
              {filteredCustomers.length === 0 ? (
                <div className="no-results">
                  <p className="muted-text">
                    {searchTerm ? 'No customers match your search.' : 'No unassigned customers available.'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map(customer => (
                  <div 
                    key={customer.id} 
                    className={`member-card ${formData.customer_ids.includes(customer.id) ? 'selected' : ''}`}
                    onClick={() => handleCustomerToggle(customer.id)}
                  >
                    <div className="card-check">
                      <div className="check-circle"></div>
                    </div>
                    <div className="member-info">
                      <span className="member-name">{customer.first_name || customer.username}</span>
                      <span className="member-detail">{customer.address?.substring(0, 40)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (editRoute ? 'Updating...' : 'Creating...') : (editRoute ? 'Confirm & Update' : 'Confirm & Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteModal;

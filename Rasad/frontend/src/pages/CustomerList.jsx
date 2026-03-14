import React, { useEffect, useState } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('All Routes');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // View Customer states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    try {
      const [historyRes, paymentsRes] = await Promise.all([
        deliveryAPI.getDeliveryHistory(viewMonth, viewYear, customer.id),
        deliveryAPI.getPayments(customer.id)
      ]);
      setCustomerHistory(historyRes.data);
      setCustomerPayments(paymentsRes.data);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      handleViewCustomer(selectedCustomer);
    }
  }, [viewMonth, viewYear]);

  const fetchCustomers = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      setError(null);
      const response = await staffAPI.getStaff('customer');
      setCustomers(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to fetch data';
      setError(msg);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatBalance = (balance) => {
    const val = parseFloat(balance || 0);
    if (val > 0) return <span className="balance-text negative">Rs {val.toLocaleString()}</span>;
    if (val < 0) return <span className="balance-text positive">Advance Rs {Math.abs(val).toLocaleString()}</span>;
    return <span className="balance-text">Rs 0</span>;
  };

  const getStatusBadge = (balance) => {
    const val = parseFloat(balance || 0);
    if (val > 0) return <span className="status-label-premium overdue">Overdue</span>;
    if (val < 0) return <span className="status-label-premium active">Active</span>;
    return <span className="status-label-premium active">Active</span>;
  };

  const filteredCustomers = customers.filter(customer => {
    const searchMatch = (
      (customer.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone_number || '').includes(searchTerm) ||
      (customer.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const routeMatch = routeFilter === 'All Routes' || customer.route_name === routeFilter;
    const statusMatch = statusFilter === 'All Status' || (
      statusFilter === 'Overdue' ? parseFloat(customer.outstanding_balance) > 0 :
      statusFilter === 'Active' ? parseFloat(customer.outstanding_balance) <= 0 :
      true
    );

    return searchMatch && routeMatch && statusMatch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customers Management</h1>
      </div>

      <div className="premium-toolbar">
        <div className="toolbar-left">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by name, area, number..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdowns">
            <select 
              className="premium-select"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option>All Routes</option>
              {[...new Set(customers.map(c => c.route_name).filter(Boolean))].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select 
              className="premium-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Overdue</option>
              <option>Paused</option>
            </select>
          </div>
        </div>
        <button className="premium-btn-green" onClick={() => setIsModalOpen(true)}>
          <span>+</span> Add Customer
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>NO.</th>
                <th>CUSTOMER / گاہک</th>
                <th>AREA</th>
                <th>ROUTE</th>
                <th>DAILY QTY</th>
                <th>RATE</th>
                <th>BALANCE</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id}>
                  <td><span className="id-hash">#{customer.id}</span></td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name-main">{customer.first_name || customer.username}</span>
                      <span className="customer-sub-info">
                        {customer.phone_number || 'No Number'} 
                      </span>
                    </div>
                  </td>
                  <td><span className="area-text">{customer.address || 'General'}</span></td>
                  <td>
                    <span className={`route-badge ${customer.route_name === 'Route B' ? 'route-b' : customer.route_name === 'Route C' ? 'route-c' : 'route-a'}`}>
                      {customer.route_name || 'Unassigned'}
                    </span>
                  </td>
                  <td><strong>{customer.daily_quantity || '0'}L</strong></td>
                  <td>Rs {customer.milk_type === 'cow' ? customer.cow_price : (customer.milk_type === 'buffalo' ? customer.buffalo_price : Math.max(customer.cow_price || 0, customer.buffalo_price || 0))}/L</td>
                  <td>{formatBalance(customer.outstanding_balance)}</td>
                  <td>{getStatusBadge(customer.outstanding_balance)}</td>
                  <td>
                    <button className="view-btn" onClick={() => handleViewCustomer(customer)}>View</button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No customers found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <InvitationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role="customer"
        onInviteSuccess={() => fetchCustomers(true)}
      />

      {/* View Customer Modal */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Customer Profile</h2>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <div style={{ flex: 1, minWidth: '250px', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>{selectedCustomer.first_name || selectedCustomer.username}</h3>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Phone:</strong> {selectedCustomer.phone_number || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Address:</strong> {selectedCustomer.address || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Route:</strong> {selectedCustomer.route_name || 'Unassigned'}</p>
              </div>
              <div style={{ flex: 1, minWidth: '250px', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Account Specs</h3>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Daily Qty:</strong> {selectedCustomer.daily_quantity || '0'}L ({selectedCustomer.milk_type})</p>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Milk Rate:</strong> Rs {selectedCustomer.milk_type === 'cow' ? selectedCustomer.cow_price : selectedCustomer.buffalo_price}/L</p>
                <p style={{ margin: '0.5rem 0', color: '#64748b' }}><strong>Balance Due:</strong> {formatBalance(selectedCustomer.outstanding_balance)}</p>
              </div>
            </div>

            {loadingDetails ? (
              <p>Loading details...</p>
            ) : (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Monthly Bill Section */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Monthly Bill</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select className="form-input" style={{ padding: '0.3rem', fontSize: '0.8rem' }} value={viewMonth} onChange={(e) => setViewMonth(e.target.value)}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('default', { month: 'short' })}
                          </option>
                        ))}
                      </select>
                      <select className="form-input" style={{ padding: '0.3rem', fontSize: '0.8rem' }} value={viewYear} onChange={(e) => setViewYear(e.target.value)}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {customerHistory.length > 0 ? (
                      <>
                        {customerHistory.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                            <span style={{ color: '#64748b', width: '30px' }}>{new Date(item.date).getDate()}</span>
                            <span style={{ flex: 1, fontWeight: 600 }}>{item.status === 'paused' ? 'Paused' : `${item.quantity} Liter`}</span>
                            <span style={{ color: '#27ae60', fontWeight: 600 }}>Rs {item.status === 'paused' ? '0' : item.total_amount}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0 0 0', marginTop: '0.5rem', borderTop: '2px solid #cbd5e1', fontWeight: 800, fontSize: '1rem' }}>
                          <span style={{ visibility: 'hidden', width: '30px' }}>0</span>
                          <span style={{ flex: 1 }}>Total {customerHistory.reduce((s, i) => s + parseFloat(i.quantity || 0), 0)}L</span>
                          <span style={{ color: '#27ae60' }}>Rs {customerHistory.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)}</span>
                        </div>
                      </>
                    ) : (
                      <p style={{ textAlign: 'center', color: '#94a3b8', margin: '2rem 0' }}>No deliveries for this month.</p>
                    )}
                  </div>
                </div>

                {/* Payment History Section */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Payment History</h3>
                  <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {customerPayments.length > 0 ? (
                      customerPayments.map(payment => (
                        <div key={payment.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <strong style={{ color: '#1e293b' }}>Rs {payment.amount}</strong>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '10px',
                              background: payment.status === 'confirmed' ? '#dcfce7' : payment.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              color: payment.status === 'confirmed' ? '#166534' : payment.status === 'rejected' ? '#991b1b' : '#92400e'
                            }}>
                              {payment.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Reported: {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', color: '#94a3b8', margin: '2rem 0' }}>No payment history found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

};

export default CustomerList;

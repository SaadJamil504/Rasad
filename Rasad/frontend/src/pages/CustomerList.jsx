import React, { useEffect, useState } from 'react';
import { staffAPI } from '../services/api';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customers Management</h1>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
          <span>+</span> Add New Customer
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Milk Type</th>
                <th>Qty (L)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td className="text-muted">#{customer.id}</td>
                  <td className="font-bold">{customer.first_name || customer.username}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone_number || 'N/A'}</td>
                  <td>
                    <span className="badge-blue">{customer.milk_type?.toUpperCase() || 'N/A'}</span>
                  </td>
                  <td className="font-bold">{customer.daily_quantity || '0'}L</td>
                  <td>
                    <button className="text-btn">Details</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-row">No customers found. Start by inviting some!</td>
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
    </div>
  );

};

export default CustomerList;

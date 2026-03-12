import React, { useEffect, useState } from 'react';
import { staffAPI } from '../services/api';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getStaff('customer');
      setCustomers(response.data);
    } catch (_) {
      setError('Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) return <div className="loading">Loading customers...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="table-container fade-in">
      <div className="table-header">
        <h1>Customers Management</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Add New Customer
        </button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Milk Type</th>
              <th>Qty (L)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id}>
                <td>#{customer.id}</td>
                <td className="font-bold">{customer.first_name || customer.username}</td>
                <td>{customer.email}</td>
                <td>{customer.phone_number || 'N/A'}</td>
                <td>
                  <span className="badge-blue">{customer.milk_type?.toUpperCase() || 'N/A'}</span>
                </td>
                <td>{customer.daily_quantity || '0'}L</td>
                <td>
                  <button className="text-btn">Details</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <InvitationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role="customer"
        onInviteSuccess={fetchCustomers}
      />
    </div>
  );
};

export default CustomerList;

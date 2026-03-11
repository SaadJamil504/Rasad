import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Table.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('core/customers/');
        setCustomers(response.data);
      } catch (_) {
        setError('Failed to fetch customers.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  if (loading) return <div>Loading customers...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Customer Directory</h2>
        <button className="primary-btn">+ Add Customer</button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Subscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id}>
                <td>#{customer.id}</td>
                <td className="font-bold">{customer.name}</td>
                <td>{customer.address}</td>
                <td>{customer.phone_number}</td>
                <td>
                  <span className="badge-blue">{customer.subscription_type || 'Monthly'}</span>
                </td>
                <td>
                  <button className="text-btn">Profile</button>
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
    </div>
  );
};

export default CustomerList;

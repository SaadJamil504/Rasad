import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const DriverList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDrivers = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      const response = await staffAPI.getStaff('driver');
      setDrivers(response.data);
    } catch (err) {
      console.error('Fetch drivers error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to fetch drivers';
      setError(msg);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="page-container">
      <div className="premium-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="premium-btn-green" onClick={() => setIsModalOpen(true)}>
          <span>+</span> Add New Driver
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading drivers...</div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>License Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td data-label="Full Name" className="font-bold">{driver.first_name || 'N/A'}</td>
                    <td data-label="Username">{driver.username}</td>
                    <td data-label="Email Address">{driver.email}</td>
                    <td data-label="Phone Number">{driver.phone_number || 'N/A'}</td>
                    <td data-label="License Number">{driver.license_number || 'N/A'}</td>
                    <td data-label="Status">
                      <span className="status-label-premium active">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">No drivers found. Recruit your first driver!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <InvitationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role="driver"
        onInviteSuccess={() => fetchDrivers(true)}
      />
    </div>
  );
};

export default DriverList;

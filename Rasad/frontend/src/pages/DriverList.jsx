import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const DriverList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getStaff('driver');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="table-container fade-in">
      <div className="table-header">
        <h1>Drivers Management</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Add New Driver
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
                <th>Email</th>
                <th>Phone Number</th>
                <th>License Number</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>{driver.first_name || 'N/A'}</td>
                    <td>{driver.username}</td>
                    <td>{driver.email}</td>
                    <td>{driver.phone_number || 'N/A'}</td>
                    <td>{driver.license_number || 'N/A'}</td>
                    <td>
                      <span className="status-badge active">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-row">No drivers found.</td>
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
        onInviteSuccess={fetchDrivers}
      />
    </div>
  );
};

export default DriverList;

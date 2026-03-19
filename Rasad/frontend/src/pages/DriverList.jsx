import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import InvitationModal from '../components/InvitationModal';
import './Table.css';

const DriverList = () => {
  const { t } = useLanguage();
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
          <span>+</span> {t('Add New Driver', 'نیا ڈرائیور')}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t('Loading drivers...', 'ڈرائیور لوڈ ہو رہے ہیں')}</div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>{t('Full Name', 'پورا نام')}</th>
                <th>{t('Email Address', 'ای میل')}</th>
                <th>{t('Phone Number', 'فون نمبر')}</th>
                <th>{t('License Number', 'لائسنس نمبر')}</th>
                <th>{t('Status', 'اسٹیٹس')}</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td data-label="Full Name" className="font-bold">{driver.first_name || 'N/A'}</td>
                    <td data-label="Email Address">{driver.email}</td>
                    <td data-label="Phone Number">{driver.phone_number || 'N/A'}</td>
                    <td data-label="License Number">{driver.license_number || 'N/A'}</td>
                    <td data-label="Status">
                      <span className="status-label-premium active">{t('Active', 'فعال')}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">{t('No drivers found. Recruit your first driver!', 'کوئی ڈرائیور نہیں ملا۔')}</td>
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

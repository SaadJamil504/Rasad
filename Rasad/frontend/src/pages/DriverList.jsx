import React, { useState, useEffect, useRef } from 'react';
import { staffAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useClickOutside } from '../hooks/useClickOutside';
import InvitationModal from '../components/InvitationModal';
import ManualDriverModal from '../components/ManualDriverModal';
import './Table.css';

const DriverList = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', email: '', phone_number: '', license_number: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const viewModalRef = useRef(null);
  useClickOutside(viewModalRef, () => setSelectedDriver(null));

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

  const handleViewDriver = (driver) => {
    setSelectedDriver(driver);
    setIsEditing(false);
    setEditForm({
      first_name: driver.first_name || '',
      email: driver.email || '',
      phone_number: driver.phone_number || '',
      license_number: driver.license_number || ''
    });
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await staffAPI.updateStaff(selectedDriver.id, editForm);
      setSelectedDriver(res.data);
      setIsEditing(false);
      fetchDrivers(true);
      alert(t('Driver updated successfully!', 'ڈرائیور کی تفصیلات اپ ڈیٹ ہو گئی ہیں!'));
    } catch (err) {
      console.error('Failed to update driver:', err);
      alert('Failed to update driver.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="page-container">
      <div className="premium-toolbar">
        <div className="toolbar-left"></div>
        <div className="toolbar-right">
          <div className="toolbar-actions">
            <button className="btn-secondary" onClick={() => setIsModalOpen(true)}>
              {t('Invite via Link', 'لنک سے بلاؤ')}
            </button>
            <button className="premium-btn-green" onClick={() => setIsManualModalOpen(true)}>
              <span>+</span> {t('Add Driver Manually', 'ڈرائیور خود شامل کریں')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">{t('Loading drivers...', 'ڈرائیور لوڈ ہو رہے ہیں')}</div>
      ) : (
        <div className="premium-table-wrapper">
          <table className="premium-table">
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
                  <tr key={driver.id} onClick={() => handleViewDriver(driver)} style={{ cursor: 'pointer' }}>
                    <td data-label={t('Full Name', 'پورا نام')} className="font-bold">
                       <div className="customer-name-main">{driver.first_name || 'N/A'}</div>
                    </td>
                    <td data-label={t('Email Address', 'ای میل')}>{driver.email}</td>
                    <td data-label={t('Phone Number', 'فون نمبر')}>{driver.phone_number || 'N/A'}</td>
                    <td data-label={t('License Number', 'لائسنس نمبر')}>{driver.license_number || 'N/A'}</td>
                    <td data-label={t('Status', 'اسٹیٹس')}>
                      <span className="status-label-premium active">{t('Active', 'فعال')}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-row">{t('No drivers found. Recruit your first driver!', 'کوئی ڈرائیور نہیں ملا۔')}</td>
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

      <ManualDriverModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => fetchDrivers(true)}
      />

      {selectedDriver && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDriver(null); }}>
          <div className="modal-content glass-card premium-modal" ref={viewModalRef} style={{ maxWidth: '480px', width: '90%', position: 'relative' }}>
            <div className="modal-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>{t('Driver Profile', 'ڈرائیور کا پروفائل')}</h2>
              <div className="header-btn-group" style={{ display: 'flex', gap: '0.75rem' }}>
                {!isEditing ? (
                  <button className="btn-secondary" onClick={handleEditToggle} style={{ padding: '0.5rem 1rem' }}>{t('Edit', 'ترمیم')}</button>
                ) : (
                  <button className="premium-btn-green" onClick={handleSaveEdit} disabled={saving} style={{ padding: '0.5rem 1rem' }}>
                    {saving ? t('Saving...', 'محفوظ ہو رہا ہے...') : t('Save', 'محفوظ کریں')}
                  </button>
                )}
                <button className="btn-s" onClick={() => setSelectedDriver(null)} style={{ padding: '0.5rem 1rem' }}>{t('Close', 'بند کریں')}</button>
              </div>
            </div>

            <div className="profile-card-lite" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              {isEditing ? (
                <div className="edit-fields-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{t('Full Name', 'پورا نام')}</label>
                    <input className="form-input" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{t('Email', 'ای میل')}</label>
                    <input className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{t('Phone', 'فون')}</label>
                    <input className="form-input" value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{t('License Number', 'لائسنس نمبر')}</label>
                    <input className="form-input" value={editForm.license_number} onChange={e => setEditForm({...editForm, license_number: e.target.value})} />
                  </div>
                </div>
              ) : (
                <>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>{selectedDriver.first_name || 'N/A'}</h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>{t('Email', 'ای میل')}:</strong> {selectedDriver.email}</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>{t('Phone', 'فون')}:</strong> {selectedDriver.phone_number || 'N/A'}</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>{t('License', 'لائسنس')}:</strong> {selectedDriver.license_number || 'N/A'}</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>{t('Status', 'اسٹیٹس')}:</strong> <span style={{ color: '#27ae60', fontWeight: 700 }}>{t('Active', 'فعال')}</span></p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverList;

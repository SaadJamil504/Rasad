import React, { useState, useEffect } from 'react';
import { staffAPI, routeAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ManualCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, ts } = useLanguage();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newCustomer, setNewCustomer] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    phone_number: '',
    address: '',
    milk_type: 'buffalo',
    daily_quantity: '',
    route: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
      setSuccess(false);
      setError('');
      setNewCustomer(null);
      setFormData({
        first_name: '',
        phone_number: '',
        address: '',
        milk_type: 'buffalo',
        daily_quantity: '',
        route: ''
      });
    }
  }, [isOpen]);

  const fetchRoutes = async () => {
    try {
      const res = await routeAPI.getRoutes();
      setRoutes(res.data);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await staffAPI.createStaff(formData);
      setNewCustomer(res.data);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to create customer:', err);
      const msg = err.response?.data?.phone_number?.[0] || 
                  err.response?.data?.error || 
                  err.response?.data?.detail || 
                  'Failed to add customer. Check phone number.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
            {success ? t('Customer Added Successfully!', 'گاہک کامیابی سے شامل ہو گیا!') : t('Add New Customer', 'نیا گاہک شامل کریں')}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div className="success-view fade-in">
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                {t('Customer profile created. You can now share an invite link for them to set up their dashboard.', 'گاہک کا پروفائل بن گیا ہے۔ اب آپ انہیں ڈیش بورڈ سیٹ اپ کرنے کے لیے لنک بھیج سکتے ہیں۔')}
              </p>
              
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '1.5rem' }}>
                 <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>{t('Name', 'نام')}:</strong> {newCustomer?.first_name}</p>
                 <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}><strong>{t('Phone', 'فون')}:</strong> {newCustomer?.phone_number}</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="premium-btn" onClick={onClose} style={{ flex: 1 }}>{t('Done', 'ٹھیک ہے')}</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="premium-form">
            {error && <div className="error-message" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            
            <div className="form-group">
              <label>{t('Full Name', 'پورا نام')}</label>
              <input 
                type="text" 
                required 
                className="form-input"
                placeholder={ts('Enter name', 'نام درج کریں')}
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>{t('Phone Number', 'فون نمبر')}</label>
              <input 
                type="text" 
                required 
                className="form-input"
                placeholder="03XXXXXXXXX"
                value={formData.phone_number}
                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>{t('Address', 'پتہ')}</label>
              <input 
                type="text" 
                className="form-input"
                placeholder={ts('Area or specific address', 'علاقہ یا مخصوص پتہ')}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>{t('Milk Type', 'دودھ کی قسم')}</label>
                <select 
                  className="form-input"
                  value={formData.milk_type}
                  onChange={(e) => setFormData({...formData, milk_type: e.target.value})}
                >
                  <option value="buffalo">{t('Buffalo', 'بھینس')}</option>
                  <option value="cow">{t('Cow', 'گائے')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('Daily Qty (L)', 'روزانہ مقدار')}</label>
                <input 
                  type="number" 
                  step="0.5"
                  required
                  className="form-input"
                  placeholder="2.0"
                  value={formData.daily_quantity}
                  onChange={(e) => setFormData({...formData, daily_quantity: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('Assign Route', 'روٹ منتخب کریں')}</label>
              <select 
                className="form-input"
                value={formData.route}
                onChange={(e) => setFormData({...formData, route: e.target.value})}
              >
                <option value="">{t('Unassigned', 'غیر مختص')}</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onClose} 
                style={{ 
                  flex: 1, 
                  height: '52px', 
                  fontSize: '1rem', 
                  fontWeight: '700', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0
                }}
              >
                {t('Cancel', 'منسوخ کریں')}
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  flex: 1, 
                  height: '52px', 
                  background: 'linear-gradient(135deg, #27ae60, #2ecc71)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '1rem', 
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)'
                }}
              >
                {loading ? t('Adding...', 'شامل ہو رہا ہے...') : t('Save Customer', 'گاہک محفوظ کریں')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ManualCustomerModal;

import React, { useState, useEffect } from 'react';
import { staffAPI, routeAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useClickOutside } from '../hooks/useClickOutside';
import './RouteModal.css';

const RouteModal = ({ isOpen, onClose, onRouteCreated, editRoute }) => {
  const { t, ts } = useLanguage();
  const modalRef = React.useRef(null);
  useClickOutside(modalRef, onClose);
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
      setAvailableCustomers(customersRes.data); // Show all customers
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
        alert(ts('Route updated successfully!', 'روٹ میں کامیابی سے تبدیلی کر دی گئی ہے!'));
      } else {
        await routeAPI.createRoute(formData);
        alert(ts('Route created successfully!', 'نیا روٹ کامیابی سے بنا لیا گیا ہے!'));
      }
      onRouteCreated();
      onClose();
      setFormData({ name: '', driver: '', customer_ids: [] });
      setSearchTerm('');
    } catch (err) {
      setError(err.response?.data?.error || ts(`Failed to ${editRoute ? 'update' : 'create'} route.`, `${editRoute ? 'روٹ کی تبدیلی' : 'نیا روٹ بنانے'} میں ناکامی ہوئی۔`));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content route-modal glass fade-in" ref={modalRef}>
        <div className="modal-header">
          <div className="header-title">
            <h2>{editRoute ? t('Update Delivery Route', 'ڈیلیوری روٹ بدلیں') : t('Create Delivery Route', 'نیا ڈیلیوری روٹ بنائیں')}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label>{t('Route Identity', 'روٹ کا نام')}</label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder={ts('e.g. Gulberg Morning', 'مثلاً گلبرگ مارننگ')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{t('Assign Driver', 'ڈرائیور مقرر کریں')}</label>
              <select
                className="glass-input"
                required
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              >
                <option value="">{ts('Select a Driver', 'ڈرائیور منتخب کریں')}</option>
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
              <label style={{ margin: 0 }}>{t('Assign Customers', 'گاہک مقرر کریں')} <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>({formData.customer_ids.length})</span></label>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder={ts('Search by name or address...', 'نام یا پتہ سے تلاش کریں')} 
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
                    {searchTerm ? t('No customers match your search.', 'تلاش کے مطابق کوئی گاہک نہیں ملا۔') : t('No customers found in your database.', 'ڈیٹا بیس میں کوئی گاہک نہیں ملا۔')}
                  </p>
                </div>
              ) : (
                filteredCustomers.map(customer => {
                  const isAssignedElsewhere = customer.route && (!editRoute || customer.route !== editRoute.id);
                  const isSelected = formData.customer_ids.includes(customer.id);
                  
                  return (
                    <div 
                      key={customer.id} 
                      className={`member-card ${isSelected ? 'selected' : ''} ${isAssignedElsewhere ? 'disabled' : ''}`}
                      onClick={() => !isAssignedElsewhere && handleCustomerToggle(customer.id)}
                    >
                      <div className="card-check">
                        <div className="check-circle"></div>
                      </div>
                      <div className="member-info">
                        <span className="member-name">
                          {customer.first_name || customer.username}
                          {isSelected && <span style={{ color: '#22c55e', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({t('Selected', 'منتخب')})</span>}
                          {isAssignedElsewhere && <span style={{ color: '#ef4444', fontSize: '0.7rem', marginLeft: '0.5rem' }}>({t('In Route', 'روٹ میں ہے')})</span>}
                        </span>
                        <span className="member-detail">{customer.address?.substring(0, 40)}...</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-s" onClick={onClose}>{t('Cancel', 'کینسل')}</button>
            <button type="submit" className="btn-p" disabled={loading}>
              {loading ? (editRoute ? t('Updating...', 'تبدیلی ہو رہی ہے...') : t('Creating...', 'تیار ہو رہا ہے...')) : (editRoute ? t('Confirm', 'تصدیق کریں') : t('Confirm & Create', 'تصدیق اور تخلیق کریں'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteModal;

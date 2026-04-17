import React, { useState, useEffect, useRef } from 'react';
import { staffAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useClickOutside } from '../hooks/useClickOutside';

const CustomerProfileModal = ({ customer, isOpen, onClose, onUpdateSuccess, initialEditMode }) => {
  const { t, ts } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(customer);

  const modalRef = useRef(null);
  useClickOutside(modalRef, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (customer && isOpen) {
      setCurrentCustomer(customer);
      setIsEditing(initialEditMode || false);
      if (initialEditMode) {
        setEditForm({
          first_name: customer.first_name,
          phone_number: customer.phone_number,
          house_no: customer.house_no,
          street: customer.street,
          area: customer.area,
          city: customer.city,
          daily_quantity: customer.daily_quantity,
          milk_type: customer.milk_type
        });
      } else {
        setEditForm({});
      }
    }
  }, [customer, isOpen, initialEditMode]);

  const fetchDetails = async () => {
    if (!currentCustomer?.id) return;
    setLoadingDetails(true);
    try {
      const detailRes = await staffAPI.getStaffDetail(currentCustomer.id);
      setCurrentCustomer(prev => ({ ...prev, ...detailRes.data }));
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentCustomer?.id) {
      fetchDetails();
    }
  }, [isOpen, currentCustomer?.id]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditForm({
        first_name: currentCustomer.first_name,
        phone_number: currentCustomer.phone_number,
        house_no: currentCustomer.house_no,
        street: currentCustomer.street,
        area: currentCustomer.area,
        city: currentCustomer.city,
        daily_quantity: currentCustomer.daily_quantity,
        milk_type: currentCustomer.milk_type
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await staffAPI.updateStaff(currentCustomer.id, editForm);
      setCurrentCustomer(res.data);
      setIsEditing(false);
      if (onUpdateSuccess) onUpdateSuccess(res.data);
    } catch (err) {
      console.error('Update failed:', err);
      alert(t('Update failed. Please check your inputs.', 'اپ ڈیٹ ناکام ہو گئی۔ براہ کرم اپنی معلومات چیک کریں۔'));
    } finally {
      setSaving(false);
    }
  };

  const formatBalance = (balance) => {
    const val = parseFloat(balance);
    if (val > 0) return <span className="balance-text negative">Rs {val.toLocaleString()}</span>;
    if (val < 0) return <span className="balance-text positive">{t('Advance', 'ایڈوانس')} Rs {Math.abs(val).toLocaleString()}</span>;
    return <span className="balance-text">Rs 0</span>;
  };

  if (!isOpen || !currentCustomer) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" ref={modalRef} style={{ 
        maxWidth: '500px', 
        width: '95%',
        maxHeight: 'none',
        overflowY: 'hidden',
        padding: '1.25rem 1.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {t('Customer Profile', 'گاہک کا پروفائل')}
          </h2>
          <button 
            className="close-btn" 
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="premium-form">
          {loadingDetails && !isEditing ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>{t('Loading...', 'لوڈ ہو رہا ہے...')}</div>
          ) : (
            <>
              {!isEditing && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '1.1rem' }}>{currentCustomer.first_name || currentCustomer.username}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>{t('Phone', 'فون')}:</strong><br/>{currentCustomer.phone_number || 'N/A'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>{t('Route', 'روٹ')}:</strong><br/>{currentCustomer.route_name || t('Unassigned', 'غیر مختص')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>{t('Balance', 'بقایا')}:</strong><br/>{formatBalance(currentCustomer.outstanding_balance)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>{t('Milk Spec', 'دودھ کی تفصیل')}:</strong><br/>{currentCustomer.daily_quantity}L ({currentCustomer.milk_type})
                    </p>
                  </div>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    <strong>{t('Address', 'پتہ')}:</strong><br/>
                    {currentCustomer.house_no ? `${currentCustomer.house_no}, ${currentCustomer.street}, ${currentCustomer.area}, ${currentCustomer.city}` : (currentCustomer.address || 'N/A')}
                  </p>
                </div>
              )}

              {isEditing && (
                <div className="edit-view fade-in">
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Full Name', 'پورا نام')}</label>
                    <input 
                      type="text" 
                      className="form-input"
                      style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Phone Number', 'فون نمبر')}</label>
                    <input 
                      type="text" 
                      className="form-input"
                      style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('House No #', 'گھر کا نمبر')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.house_no}
                        onChange={(e) => setEditForm({...editForm, house_no: e.target.value})}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Street', 'گلی')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.street}
                        onChange={(e) => setEditForm({...editForm, street: e.target.value})}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Area', 'علاقہ')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.area}
                        onChange={(e) => setEditForm({...editForm, area: e.target.value})}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('City', 'شہر')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.city}
                        onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Milk Type', 'دودھ کی قسم')}</label>
                      <select 
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.milk_type}
                        onChange={(e) => setEditForm({...editForm, milk_type: e.target.value})}
                      >
                        <option value="buffalo">{t('Buffalo', 'بھینس')}</option>
                        <option value="cow">{t('Cow', 'گائے')}</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>{t('Daily Qty (L)', 'روزانہ مقدار')}</label>
                      <input 
                        type="number" 
                        step="0.5"
                        className="form-input"
                        style={{ height: '42px', fontSize: '0.9rem', padding: '0 12px' }}
                        value={editForm.daily_quantity}
                        onChange={(e) => setEditForm({...editForm, daily_quantity: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {!isEditing ? (
                  <>
                    <button className="btn-secondary" onClick={handleEditToggle} style={{ 
                      flex: 1, 
                      height: '46px', 
                      fontWeight: '700', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>
                      {t('Edit Details', 'ترمیم کریں')}
                    </button>
                    <button className="premium-btn" onClick={onClose} style={{ 
                      flex: 1, 
                      height: '46px', 
                      fontWeight: '800', 
                      borderRadius: '10px', 
                      background: '#f1f5f9', 
                      color: '#475569', 
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>
                      {t('Close', 'بند کریں')}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={handleEditToggle} style={{ 
                      flex: 1, 
                      height: '46px', 
                      fontWeight: '700', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>
                      {t('Cancel', 'منسوخ کریں')}
                    </button>
                    <button 
                      className="premium-btn-green" 
                      onClick={handleSaveEdit} 
                      disabled={saving}
                      style={{ 
                        flex: 1, 
                        height: '46px', 
                        fontWeight: '800', 
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {saving ? t('Saving...', 'محفوظ ہو رہا ہے...') : t('Save Changes', 'محفوظ کریں')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileModal;

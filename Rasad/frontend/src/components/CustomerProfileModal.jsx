import React, { useState, useEffect, useRef } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useClickOutside } from '../hooks/useClickOutside';

const CustomerProfileModal = ({ customer, isOpen, onClose, onUpdateSuccess, initialEditMode }) => {
  const { t, ts } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [currentCustomer, setCurrentCustomer] = useState(customer);

  const modalRef = useRef(null);
  useClickOutside(modalRef, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (customer && isOpen) {
      // If we're opening or switching customers
      setCurrentCustomer(customer);
      setCustomerHistory([]);
      setCustomerPayments([]);
      
      // Handle initial edit mode
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
    
    // Only show big loader if we don't have any history yet
    const isFirstLoad = customerHistory.length === 0;
    if (isFirstLoad) setLoadingDetails(true);
    
    try {
      const [historyRes, paymentsRes, detailRes] = await Promise.all([
        deliveryAPI.getDeliveryHistory(viewMonth, viewYear, currentCustomer.id),
        deliveryAPI.getPayments({ customer_id: currentCustomer.id }),
        staffAPI.getStaffDetail(currentCustomer.id)
      ]);
      setCustomerHistory(historyRes.data);
      setCustomerPayments(paymentsRes.data);
      // Merge: keep partial prop data but prioritize full detail
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
  }, [isOpen, currentCustomer?.id, viewMonth, viewYear]);

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
    if (val > 0) return <span className="balance-text negative">Rs {val}</span>;
    if (val < 0) return <span className="balance-text positive">{t('Advance', 'ایڈوانس')} Rs {Math.abs(val)}</span>;
    return <span className="balance-text">Rs 0</span>;
  };

  if (!isOpen || !currentCustomer) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, padding: '1rem' }}>
      <div className="modal-content glass-card premium-modal" ref={modalRef} style={{ 
        position: 'relative', 
        maxWidth: '700px', 
        width: 'calc(100% - 20px)', 
        maxHeight: '92vh', 
        overflowY: 'auto',
        padding: window.innerWidth < 600 ? '1.25rem' : '2rem',
        margin: '10px auto',
        borderRadius: '1.5rem'
      }}>
        <div className="modal-header-actions" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: window.innerWidth < 600 ? '1.1rem' : '1.4rem', color: '#0f172a', lineHeight: 1.2 }}>
                {t('Customer Profile', 'گاہک کا پروفائل')}
            </h2>
          </div>
          <div className="header-btn-group" style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            {!isEditing ? (
              <button className="btn-secondary" onClick={handleEditToggle} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>{t('Edit', 'ترمیم')}</button>
            ) : (
              <button className="premium-btn-green" onClick={handleSaveEdit} disabled={saving} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                {saving ? t('Saving...', 'محفوظ ہو رہا ہے...') : t('Save', 'محفوظ کریں')}
              </button>
            )}
            <button className="btn-s" onClick={onClose} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>{t('Close', 'بند کریں')}</button>
          </div>
        </div>

        <div className="customer-profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div className="profile-card-lite" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', minHeight: '140px' }}>
            {isEditing ? (
              <div className="edit-fields-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} placeholder={ts('Name', 'نام')} title={ts('Name', 'نام')} />
                <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} placeholder={ts('Phone', 'فون')} title={ts('Phone', 'فون')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.house_no} onChange={e => setEditForm({...editForm, house_no: e.target.value})} placeholder={ts('House No', 'گھر نمبر')} title={ts('House No', 'گھر نمبر')} />
                  <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} placeholder={ts('Street', 'گلی')} title={ts('Street', 'گلی')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} placeholder={ts('Area', 'علاقہ')} title={ts('Area', 'علاقہ')} />
                  <input className="form-input" style={{ fontSize: '0.9rem' }} value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder={ts('City', 'شہر')} title={ts('City', 'شہر')} />
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '1.1rem' }}>{currentCustomer.first_name || currentCustomer.username}</h3>
                <p style={{ margin: '0.4rem 0', color: '#64748b', fontSize: '0.9rem', minHeight: '1.2rem' }}>
                    <strong>{t('Phone', 'فون')}:</strong> {currentCustomer.phone_number || (loadingDetails ? '...' : 'N/A')}
                </p>
                <p style={{ margin: '0.4rem 0', color: '#64748b', fontSize: '0.9rem', minHeight: '1.2rem' }}>
                    <strong>{t('Address', 'پتہ')}:</strong> {currentCustomer.house_no ? `${currentCustomer.house_no}, ${currentCustomer.street}, ${currentCustomer.area}` : (loadingDetails ? '...' : (currentCustomer.address || 'N/A'))}
                </p>
                <p style={{ margin: '0.4rem 0', color: '#64748b', fontSize: '0.9rem', minHeight: '1.2rem' }}>
                    <strong>{t('Route', 'روٹ')}:</strong> {currentCustomer.route_name || t('Unassigned', 'غیر مختص')}
                </p>
              </>
            )}
          </div>
          <div className="profile-card-lite" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', minHeight: '140px' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '1.1rem' }}>{t('Account Specs', 'اکاؤنٹ کی تفصیلات')}</h3>
            {isEditing ? (
              <div className="edit-fields-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" step="0.5" className="form-input" style={{ fontSize: '0.9rem', flex: 1 }} value={editForm.daily_quantity} onChange={e => setEditForm({...editForm, daily_quantity: e.target.value})} placeholder="Qty" title="Quantity" />
                    <select className="form-input" style={{ fontSize: '0.9rem', flex: 1 }} value={editForm.milk_type} onChange={e => setEditForm({...editForm, milk_type: e.target.value})}>
                        <option value="buffalo">{t('Buffalo', 'بھینس')}</option>
                        <option value="cow">{t('Cow', 'گائے')}</option>
                    </select>
                </div>
              </div>
            ) : (
              <>
                <p style={{ margin: '0.4rem 0', color: '#64748b', fontSize: '0.9rem' }}><strong>{t('Daily Qty', 'روزانہ مقدار')}:</strong> {currentCustomer.daily_quantity || '0'}L ({currentCustomer.milk_type || (loadingDetails ? '...' : 'N/A')})</p>
                <p style={{ margin: '0.4rem 0', color: '#64748b', fontSize: '0.9rem' }}><strong>{t('Milk Rate', 'دودھ کا ریٹ')}:</strong> Rs {currentCustomer.milk_type === 'cow' ? currentCustomer.cow_price : (currentCustomer.milk_type === 'buffalo' ? currentCustomer.buffalo_price : (loadingDetails ? '...' : 'N/A'))}/L</p>
                <p style={{ margin: '0.4rem 0', color: '#ef4444', fontSize: '1rem', fontWeight: 700 }}><strong>{t('Balance Due', 'بقایا واجب الادا')}:</strong> {loadingDetails && !currentCustomer.outstanding_balance ? '...' : formatBalance(currentCustomer.outstanding_balance)}</p>
              </>
            )}
          </div>
        </div>

        <div style={{ transition: 'opacity 0.3s ease', opacity: loadingDetails && customerHistory.length === 0 ? 0.5 : 1 }}>
          {loadingDetails && customerHistory.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>{t('Loading details...', 'تفصیل لوڈ ہو رہی ہے')}</p>
          ) : (
            <div className="customer-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('Monthly Bill', 'ماہانہ بل')}</h3>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select className="form-input" style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }} value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('default', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                    <select className="form-input" style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }} value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))}>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem', height: '300px', overflowY: 'auto' }}>
                  {customerHistory.length > 0 ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {customerHistory.map(item => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                              <span style={{ color: '#64748b', width: '30px' }}>{new Date(item.date).getDate()}</span>
                              <span style={{ flex: 1, fontWeight: 600 }}>{item.status === 'paused' ? t('Paused', 'رکا ہوا') : `${item.quantity} ${t('Liter', 'لیٹر')}`}</span>
                              <span style={{ color: '#27ae60', fontWeight: 600 }}>Rs {item.status === 'paused' ? '0' : item.total_amount}</span>
                          </div>
                          ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0 0 0', marginTop: '0.5rem', borderTop: '2px solid #cbd5e1', fontWeight: 801, fontSize: '1rem', position: 'sticky', bottom: 0, background: '#f8fafc' }}>
                        <span style={{ visibility: 'hidden', width: '30px' }}>0</span>
                        <span style={{ flex: 1 }}>{t('Total', 'کل')} {customerHistory.reduce((s, i) => s + parseFloat(i.quantity || 0), 0).toFixed(1)}{t('L', 'لیٹر')}</span>
                        <span style={{ color: '#27ae60' }}>Rs {customerHistory.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)}</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '4rem 0' }}>{t('No deliveries found.', 'کوئی ڈیلیوری نہیں ملی۔')}</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', height: '32px', display: 'flex', alignItems: 'center' }}>{t('Payment History', 'ادائیگی کی ہسٹری')}</h3>
                <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem', height: '300px', overflowY: 'auto' }}>
                  {customerPayments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {customerPayments.map(payment => (
                          <div key={payment.id} style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', background: 'white', borderRadius: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <strong style={{ color: '#1e293b' }}>Rs {payment.amount}</strong>
                              <span style={{
                              fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '10px',
                              background: payment.status === 'confirmed' ? '#dcfce7' : payment.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              color: payment.status === 'confirmed' ? '#166534' : payment.status === 'rejected' ? '#991b1b' : '#92400e'
                              }}>
                              {t(payment.status.toUpperCase(), 
                                  payment.status === 'confirmed' ? 'تصدیق شدہ' : 
                                  payment.status === 'rejected' ? 'مسترد شدہ' : 'پینڈنگ')}
                              </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {t('Reported', 'رپورٹ شدہ')}: {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                          </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: '4rem 0' }}>{t('No payments found.', 'کوئی ادائیگی نہیں ملی۔')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileModal;

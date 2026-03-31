import React, { useState, useEffect } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import './Payments.css';

const Cash = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await staffAPI.getDriverCustomers();
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  const filteredCustomers = customers.filter(c => 
    (c.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
      alert(t('Please select a customer and enter a valid amount.', 'براہ کرم صارف منتخب کریں اور درست رقم درج کریں۔'));
      return;
    }

    setSubmitting(true);
    try {
      await deliveryAPI.reportPayment({
        customer: selectedCustomerId,
        amount: parseFloat(amount),
        method: method,
        date: new Date().toISOString().split('T')[0]
      });
      alert(t('Payment recorded! Waiting for owner approval.', 'ادائیگی درج ہو گئی! مالک کی منظوری کا انتظار کریں۔'));
      navigate('/');
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(t('Failed to record payment. Please try again.', 'ادائیگی درج کرنے میں ناکامی۔ دوبارہ کوشش کریں۔'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-container fade-in"><div className="loading">{t('Loading customers...', 'صارفین لوڈ ہو رہے ہیں')}</div></div>;
  }

  return (
    <div className="page-container fade-in">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/')} className="btn-back" style={{ marginBottom: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5m0 0l7-7m-7 7l7 7" /></svg>
            {t('Back to Dashboard', 'ڈیش بورڈ پر واپس متعلقہ')}
        </button>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
          {t('Cash Collection', 'نقدی وصولی')}
        </h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>
          {t('Record payments received from your assigned customers.', 'اپنے مختص کردہ گاہکوں سے وصول شدہ ادائیگی درج کریں۔')}
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#334155' }}>
                {t('Select Customer', 'صارف منتخب کریں')}
            </label>
            <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  placeholder={t('Search customer...', 'صارف تلاش کریں...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ marginBottom: '0.5rem' }}
                />
                <select 
                  className="form-input"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  size={searchTerm ? 5 : 1}
                  style={{ height: searchTerm ? 'auto' : '50px' }}
                >
                  <option value="">-- {t('Select Customer', 'صارف منتخب کریں')} --</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.username} ({c.route_name})</option>
                  ))}
                </select>
            </div>
          </div>

          {selectedCustomer && (
            <div className="glass-card" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{t('Outstanding Balance', 'بقیہ بیلنس')}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>Rs {parseFloat(selectedCustomer.outstanding_balance).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#334155' }}>
                {t('Amount Received (PKR)', 'وصول شدہ رقم')}
            </label>
            <input 
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, color: '#334155' }}>
                {t('Payment Method', 'ادائیگی کا طریقہ')}
            </label>
            <select 
              className="form-input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Cash">{t('Cash', 'نقد')}</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="Bank">Bank Transfer</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-primary-large" 
            disabled={submitting}
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)' 
            }}
          >
            {submitting ? t('Recording...', 'درج ہو رہا ہے...') : t('Record Payment', 'ادائیگی درج کریں')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Cash;

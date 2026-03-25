import React, { useState, useEffect } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './Payments.css';

const Payments = () => {
  const { t, ts } = useLanguage();
  const [stats, setStats] = useState({
    total_outstanding: 0,
    overdue_count: 0,
    collected_this_month: 0,
    last_month_diff: 0,
    today_collection: 0,
    total_drivers: 0,
    settled_drivers: 0
  });
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  
  const [formData, setFormData] = useState({
    customer: '',
    amount: '',
    method: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, custRes, payRes] = await Promise.all([
        staffAPI.getCollectionStats(),
        staffAPI.getStaff('customer'),
        deliveryAPI.getPayments()
      ]);
      setStats(statsRes.data);
      setCustomers(custRes.data);
      setPayments(payRes.data);
    } catch (err) {
      console.error('Failed to fetch payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.amount) return;
    
    setRecording(true);
    try {
      await deliveryAPI.reportPayment(formData);
      // Reset form
      setFormData({
        ...formData,
        customer: '',
        amount: '',
        method: 'Cash',
        date: new Date().toISOString().split('T')[0]
      });
      // Refresh
      fetchData();
      alert(t('Payment recorded successfully!', 'ادائیگی کامیابی سے درج کی گئی!'));
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(t('Failed to record payment.', 'ادائیگی درج کرنے میں ناکامی۔'));
    } finally {
      setRecording(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="payments-page fade-in">
      <div className="pay-stats-grid">
        <div className="pay-stat-card border-red">
          <div className="pay-stat-icon red-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px' }}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.total_outstanding?.toLocaleString() || stats.total_outstanding_balance?.toLocaleString()}</span>
            <span className="pay-stat-label">{t('Total Outstanding', 'کل واجب الادا')}</span>
            <span className="pay-stat-sub text-red">{stats.overdue_count} {t('customers overdue', 'گاہکوں کی ادائیگی باقی ہے')}</span>
          </div>
        </div>

        <div className="pay-stat-card border-green">
          <div className="pay-stat-icon green-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px' }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.collected_this_month?.toLocaleString() || stats.current_month_collections?.toLocaleString()}</span>
            <span className="pay-stat-label">{t('Collected This Month', 'اس مہینے کی وصولی')}</span>
            <span className={`pay-stat-sub ${(stats.last_month_diff || 0) >= 0 ? 'text-green' : 'text-red'}`}>
              {(stats.last_month_diff || 0) >= 0 ? '↑' : '↓'} Rs {Math.abs(stats.last_month_diff || 0).toLocaleString()} {t('vs last month', 'گزشتہ ماہ کے مقابلے میں')}
            </span>
          </div>
        </div>

        <div className="pay-stat-card border-yellow">
          <div className="pay-stat-icon yellow-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px' }}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.today_collection?.toLocaleString() || stats.today_collections?.toLocaleString()}</span>
            <span className="pay-stat-label">{t("Today's Collection", 'آج کی وصولی')}</span>
          </div>
        </div>
      </div>

      <div className="record-payment-section glass-card">
        <div className="section-header">
          <h3 className="section-title-with-urdu">{t('Record Payment', 'ادائیگی درج کریں')}</h3>
        </div>
        
        <form onSubmit={handleRecordPayment} className="record-form">
          <div className="form-grid-payments">
            <div className="form-group-clean">
              <label>{t('CUSTOMER', 'گاہک')}</label>
              <select 
                value={formData.customer} 
                onChange={e => setFormData({...formData, customer: e.target.value})}
                required
                className="payment-input"
              >
                <option value="">{ts('Select customer...', 'گاہک منتخب کریں...')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name || c.username} (#{c.id})</option>
                ))}
              </select>
            </div>

            <div className="form-group-clean">
              <label>{t('AMOUNT', 'رقم')}</label>
              <div className="amount-input-wrapper">
                <span className="currency-prefix">Rs</span>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  required 
                  className="payment-input"
                />
              </div>
            </div>

            <div className="form-group-clean">
              <label>{t('METHOD', 'طریقہ')}</label>
              <select 
                value={formData.method} 
                className="payment-input"
                onChange={e => setFormData({...formData, method: e.target.value})}
              >
                <option value="Cash">{ts('Cash', 'نقد')}</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="form-group-clean">
              <label>{t('PENDING AMOUNT', 'باقی رقم')}</label>
              <div className="payment-input read-only" style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                Rs {(() => {
                  const selected = customers.find(c => c.id.toString() === formData.customer.toString());
                  return selected ? parseFloat(selected.outstanding_balance).toLocaleString() : '0';
                })()}
              </div>
            </div>
          </div>

          <button type="submit" className="premium-btn-green" disabled={recording} style={{ width: 'auto', padding: '0.9rem 2.5rem', marginTop: '1.5rem', alignSelf: 'flex-start' }}>
             {recording ? t('Recording...', 'درج ہو رہا ہے...') : t('Record Payment', 'ادائیگی درج کریں')}
          </button>
        </form>
      </div>

      <div className="transactions-section glass-card">
        <div className="section-header">
          <h3>{t('Recent Transactions', 'حالیہ لین دین')}</h3>
        </div>
        <div className="transactions-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {payments.length === 0 ? (
            <p className="no-data">{t('No recent transactions', 'کوئی حالیہ لین دین نہیں ہے')}</p>
          ) : (
            payments.map(p => (
              <div key={p.id} className="transaction-line-item">
                <div className="tx-status-dot" style={{ backgroundColor: p.status === 'confirmed' ? '#27ae60' : '#f39c12' }}></div>
                <div className="tx-details">
                  <div className="tx-top-row">
                    <span className="tx-user-name">{p.customer_name} #{p.customer}</span>
                    <span className="tx-amount-value">+ Rs {parseFloat(p.amount).toLocaleString()}</span>
                  </div>
                  <div className="tx-bottom-row">
                    <span className="tx-meta-info">
                      {new Date(p.created_at).toLocaleDateString()} · {p.method} · by {p.status === 'confirmed' ? (p.received_by_name || 'Owner') : 'User'}
                    </span>
                    {p.status === 'pending' && <span className="overdue-badge-small">{t('Pending', 'باقی')}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;

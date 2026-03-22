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
    received_by: 'Owner (Self)',
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
        received_by: 'Owner (Self)',
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
          <div className="pay-stat-icon red-bg">💸</div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.total_outstanding?.toLocaleString() || stats.total_outstanding_balance?.toLocaleString()}</span>
            <span className="pay-stat-label">{t('Total Outstanding', 'کل واجب الادا')}</span>
            <span className="pay-stat-sub text-red">{stats.overdue_count} {t('customers overdue', 'گاہکوں کی ادائیگی باقی ہے')}</span>
          </div>
        </div>

        <div className="pay-stat-card border-green">
          <div className="pay-stat-icon green-bg">✅</div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.collected_this_month?.toLocaleString() || stats.current_month_collections?.toLocaleString()}</span>
            <span className="pay-stat-label">{t('Collected This Month', 'اس مہینے کی وصولی')}</span>
            <span className={`pay-stat-sub ${(stats.last_month_diff || 0) >= 0 ? 'text-green' : 'text-red'}`}>
              {(stats.last_month_diff || 0) >= 0 ? '↑' : '↓'} Rs {Math.abs(stats.last_month_diff || 0).toLocaleString()} {t('vs last month', 'گزشتہ ماہ کے مقابلے میں')}
            </span>
          </div>
        </div>

        <div className="pay-stat-card border-yellow">
          <div className="pay-stat-icon yellow-bg">📅</div>
          <div className="pay-stat-info">
            <span className="pay-stat-value">Rs {stats.today_collection?.toLocaleString() || stats.today_collections?.toLocaleString()}</span>
            <span className="pay-stat-label">{t("Today's Collection", 'آج کی وصولی')}</span>
            <span className="pay-stat-sub text-muted">{stats.total_drivers} drivers · {stats.settled_drivers} settled</span>
          </div>
        </div>
      </div>

      <div className="record-payment-section glass-card">
        <div className="section-header">
          <h3 className="section-title-with-urdu">💰 {t('Record Payment', 'ادائیگی درج کریں')} <span className="urdu-title-small">ادائیگی درج کریں</span></h3>
        </div>
        
        <form onSubmit={handleRecordPayment} className="record-form">
          <div className="form-grid-payments">
            <div className="form-group-clean">
              <label>{t('CUSTOMER', 'گاہک')} <span className="urdu-label-small">گاہک</span></label>
              <select 
                value={formData.customer} 
                onChange={e => setFormData({...formData, customer: e.target.value})}
                required
                className="payment-input"
              >
                <option value="">{t('Select customer...', 'گاہک منتخب کریں...')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name || c.username} (#{c.id})</option>
                ))}
              </select>
            </div>

            <div className="form-group-clean">
              <label>{t('AMOUNT', 'رقم')} <span className="urdu-label-small">رقم</span></label>
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
              <label>{t('METHOD', 'طریقہ')} <span className="urdu-label-small">طریقہ</span></label>
              <select 
                value={formData.method} 
                className="payment-input"
                onChange={e => setFormData({...formData, method: e.target.value})}
              >
                <option value="Cash">{t('Cash', 'نقد')} — نقد</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="form-group-clean">
              <label>{t('RECEIVED BY', 'وصول کنندہ')} <span className="urdu-label-small">وصول کنندہ</span></label>
              <input type="text" value={formData.received_by} readOnly className="payment-input read-only" />
            </div>
          </div>

          <button type="submit" className="premium-btn-green" disabled={recording} style={{ width: 'auto', padding: '0.9rem 2.5rem', marginTop: '1.5rem', alignSelf: 'flex-start' }}>
             ✅ {recording ? t('Recording...', 'درج ہو رہا ہے...') : t('Record Payment', 'ادائیگی درج کریں')}
          </button>
        </form>
      </div>

      <div className="transactions-section glass-card">
        <div className="section-header">
          <h3>📋 {t('Recent Transactions', 'حالیہ لین دین')}</h3>
        </div>
        <div className="transactions-list">
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

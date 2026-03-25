import React, { useState, useEffect } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './MonthlyBills.css';

const MonthlyBills = () => {
  const { language, t, ts } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [customerHistory, setCustomerHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all customers for the dropdown
    const fetchCustomers = async () => {
      try {
        const response = await staffAPI.getStaff('customer');
        setCustomers(response.data);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch bill when customer or date changes
    const fetchBill = async () => {
      if (!selectedCustomer) {
        setCustomerHistory([]);
        return;
      }
      setLoading(true);
      try {
        const historyRes = await deliveryAPI.getDeliveryHistory(viewMonth, viewYear, selectedCustomer);
        setCustomerHistory(historyRes.data);
      } catch (err) {
        console.error('Failed to fetch bill:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBill();
  }, [selectedCustomer, viewMonth, viewYear]);

  // Find selected customer details to show specs
  const customerDetails = customers.find(c => c.id.toString() === selectedCustomer);

  // Calculate month/year options based on customer join date
  const getAvailableYears = () => {
    if (!customerDetails?.date_joined) return [2024, 2025, 2026];
    const joinYear = new Date(customerDetails.date_joined).getFullYear();
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = joinYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years.length > 0 ? years : [currentYear];
  };

  const getAvailableMonths = () => {
    if (!customerDetails?.date_joined) return Array.from({ length: 12 }, (_, i) => i + 1);
    const joinDate = new Date(customerDetails.date_joined);
    const joinMonth = joinDate.getMonth() + 1;
    const joinYear = joinDate.getFullYear();
    
    const months = [];
    const startMonth = parseInt(viewYear) === joinYear ? joinMonth : 1;
    const endMonth = parseInt(viewYear) === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

    for (let m = startMonth; m <= 12; m++) {
      months.push(m);
    }
    return months;
  };

  useEffect(() => {
    // Reset month/year if selected month/year is no longer available for new customer
    if (customerDetails?.date_joined) {
      const joinDate = new Date(customerDetails.date_joined);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;

      if (parseInt(viewYear) < joinYear) {
        setViewYear(joinYear);
      }
      if (parseInt(viewYear) === joinYear && parseInt(viewMonth) < joinMonth) {
        setViewMonth(joinMonth);
      }
    }
  }, [selectedCustomer, customerDetails]);

  return (
    <div className="page-container fade-in" style={{ maxWidth: '100vw', overflowX: 'hidden' }} dir={language === 'ur' ? 'rtl' : 'ltr'}>
      <div className="monthly-bills-toolbar" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="filter-item" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>{t('Select Customer', 'گاہک منتخب کریں')}</label>
          <select 
            className="premium-select" 
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', height: '45px' }}
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">{ts('-- Choose a Customer --', '-- گاہک کا انتخاب کریں --')}</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.first_name || c.username}</option>
            ))}
          </select>
        </div>

        <div className="month-year-item">
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>{t('Select Month', 'مہینہ منتخب کریں')}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="premium-select" style={{ flex: 1, height: '45px' }} value={viewMonth} onChange={(e) => setViewMonth(e.target.value)} disabled={!selectedCustomer}>
              {getAvailableMonths().map(m => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select className="premium-select" style={{ width: '100px', height: '45px' }} value={viewYear} onChange={(e) => setViewYear(e.target.value)} disabled={!selectedCustomer}>
              {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selectedCustomer ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3>{t('Select a customer to view their monthly bill', 'ماہانہ بل دیکھنے کے لیے گاہک منتخب کریں')}</h3>
        </div>
      ) : loading ? (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>{t('Loading bill details...', 'بل کی تفصیل لوڈ ہو رہی ہے')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '2rem' }}>
          {customerDetails && (
            <div className="glass-card bills-summary-card">
              <div style={{ minWidth: '200px', flex: '1' }}>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>{customerDetails.first_name || customerDetails.username}</h2>
                <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span>📍 {customerDetails.address || t('N/A', 'نامعلوم')}</span>
                  <span>🛣️ {customerDetails.route_name || t('Unassigned', 'غیر مختص')}</span>
                </div>
              </div>
              
              <div className="summary-details-grid">
                <div className="summary-detail-item">
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('DAILY QTY', 'روزانہ مقدار')}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{customerDetails.daily_quantity || '0'}L <small style={{ fontWeight: 600, color: '#64748b' }}>({customerDetails.milk_type})</small></div>
                </div>
                
                <div className="summary-detail-item">
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('CURRENT BALANCE', 'موجودہ بیلنس')}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: parseFloat(customerDetails.outstanding_balance) > 0 ? '#ef4444' : '#27ae60' }}>
                    {parseFloat(customerDetails.outstanding_balance) > 0 ? 'Rs ' + customerDetails.outstanding_balance : t('Advance', 'ایڈوانس') + ' Rs ' + Math.abs(customerDetails.outstanding_balance)}
                  </div>
                </div>
                
                <div className="summary-detail-item">
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('JOIN DATE', 'شمولیت کی تاریخ')}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    {customerDetails.date_joined ? new Date(customerDetails.date_joined).toLocaleDateString() : t('N/A', 'نامعلوم')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>{t('Deliveries & Bill for', 'ڈیلیوری اور بل برائے')} {new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            
            {customerHistory.length > 0 ? (
             <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>{t('DATE', 'تاریخ')}</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>{t('QUANTITY', 'مقدار')}</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>{t('AMOUNT', 'رقم')}</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>{t('STATUS', 'اسٹیٹس')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerHistory.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: index < customerHistory.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#1e293b' }}>
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem', color: '#475569', fontWeight: item.status === 'paused' ? 'normal' : '600' }}>
                          {item.status === 'paused' ? '--' : `${item.quantity}L`}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: item.status === 'paused' ? '#94a3b8' : '#27ae60' }}>
                          Rs {item.status === 'paused' ? '0' : item.total_amount}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                            background: item.status === 'paused' ? '#f1f5f9' : '#dcfce7',
                            color: item.status === 'paused' ? '#64748b' : '#16a34a'
                          }}>
                            {item.status === 'paused' ? t('Paused', 'رکا ہوا') : t('Delivered', 'مکمل')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <tr>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#1e293b' }}>{t('TOTAL', 'کل')}</td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#1e293b' }}>
                        {customerHistory.reduce((s, i) => s + parseFloat(i.quantity || 0), 0)}L
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#27ae60', fontSize: '1.2rem' }} colSpan={2}>
                        Rs {customerHistory.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', margin: '3rem 0' }}>{t('No deliveries found for this month.', 'اس مہینے کی کوئی ڈیلیوری نہیں ملی۔')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyBills;

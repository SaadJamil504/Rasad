import React, { useEffect, useState } from 'react';
import { deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './Table.css';

const LiveDeliveries = () => {
  const { t, ts } = useLanguage();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [routeFilter, setRouteFilter] = useState('All Routes');

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveryAPI.getOwnerDailyDeliveries();
      setDeliveries(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load today\'s deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
        fetchDeliveries();
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status, isDelivered) => {
    if (status === 'paused') return <span className="status-label-premium paused">{t('Paused', 'رکا ہوا')}</span>;
    if (isDelivered) return <span className="status-label-premium active">{t('Done', 'مکمل')}</span>;
    return <span className="status-label-premium overdue">{t('Pending', 'باقی')}</span>;
  };

  const filteredDeliveries = deliveries.filter(d => {
    const searchMatch = (
      (d.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.customer_phone || '').includes(searchTerm)
    );
    const statusMatch = statusFilter === 'All' || 
      (statusFilter === 'Done' && d.is_delivered) ||
      (statusFilter === 'Pending' && !d.is_delivered && d.status !== 'paused') ||
      (statusFilter === 'Paused' && d.status === 'paused');
    
    const routeMatch = routeFilter === 'All Routes' || d.route_name === routeFilter;

    return searchMatch && statusMatch && routeMatch;
  });

  return (
    <div className="page-container fade-in">
      <div className="premium-toolbar">
         <div className="toolbar-left">
           <h2 className="page-title">{t('Live Deliveries', 'براہ راست ترسیل')}</h2>
           <p className="page-subtitle">{t('Real-time tracking for today', 'آج کی ریئل ٹائم ٹریکنگ')}</p>
         </div>
         <div className="toolbar-right">
           <div className="search-container">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input 
                type="text" 
                placeholder={ts('Search customer...', 'گاہک تلاش کریں...')}
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="filter-dropdowns">
             <select className="premium-select" value={routeFilter} onChange={e => setRouteFilter(e.target.value)}>
               <option value="All Routes">{t('All Routes', 'تمام روٹس')}</option>
               {[...new Set(deliveries.map(d => d.route_name).filter(Boolean))].map(r => (
                 <option key={r}>{r}</option>
               ))}
             </select>
             <select className="premium-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
               <option value="All">{t('All Status', 'تمام اسٹیٹس')}</option>
               <option value="Pending">{t('Pending', 'باقی')}</option>
               <option value="Done">{t('Done', 'مکمل')}</option>
               <option value="Paused">{t('Paused', 'رکا ہوا')}</option>
             </select>
           </div>
           <button className="premium-btn-green" onClick={fetchDeliveries}>
             {t('Refresh Now', 'تازہ کریں')}
           </button>
         </div>
      </div>

      <div className="summary-cards-mini" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card-mini pending">
            <span className="label text-muted">{t('Pending', 'باقی')}</span>
            <span className="value">{deliveries.filter(d => !d.is_delivered && d.status !== 'paused').length}</span>
        </div>
        <div className="stat-card-mini success">
            <span className="label text-muted">{t('Completed', 'مکمل')}</span>
            <span className="value">{deliveries.filter(d => d.is_delivered).length}</span>
        </div>
        <div className="stat-card-mini paused">
            <span className="label text-muted">{t('Paused', 'رکا ہوا')}</span>
            <span className="value">{deliveries.filter(d => d.status === 'paused').length}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t('Updating live data...', 'لائیو ڈیٹا اپ ڈیٹ ہو رہا ہے...')}</p>
        </div>
      ) : error ? (
        <div className="error-card">{error}</div>
      ) : (
        <div className="premium-table-wrapper" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>{t('NO.', 'نمبر')}</th>
                <th>{t('CUSTOMER', 'گاہک')}</th>
                <th>{t('ROUTE', 'روٹ')}</th>
                <th>{t('QUANTITY', 'مقدار')}</th>
                <th>{t('STATUS', 'حالت')}</th>
                <th>{t('COMPLETED AT', 'مکمل وقت')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((d, index) => (
                <tr key={d.id} className={d.is_delivered ? 'row-completed' : ''}>
                  <td><span className="id-hash">#{index + 1}</span></td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name-main">{d.customer_name || d.customer_username}</span>
                      <span className="customer-sub-info">{d.customer_phone}</span>
                    </div>
                  </td>
                  <td>
                    <span className="route-badge-outline">{d.route_name}</span>
                  </td>
                  <td><strong style={{ fontSize: '1.05rem' }}>{d.quantity} L</strong></td>
                  <td>{getStatusBadge(d.status, d.is_delivered)}</td>
                  <td style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                    {d.delivered_at ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {new Date(d.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">{t('No deliveries matching your search.', 'تلاش کے مطابق کوئی ڈیلیوری نہیں ملی۔')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <style>{`
        .page-subtitle { color: #64748b; font-size: 0.95rem; margin-top: -0.5rem; margin-bottom: 1.5rem; }
        .stat-card-mini { flex: 1; background: white; padding: 1.25rem; border-radius: 1rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .stat-card-mini .label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card-mini .value { font-size: 1.75rem; font-weight: 800; color: #1e293b; }
        .stat-card-mini.pending { border-left: 4px solid #f59e0b; }
        .stat-card-mini.success { border-left: 4px solid #10b981; }
        .stat-card-mini.paused { border-left: 4px solid #64748b; }
        .route-badge-outline { padding: 0.25rem 0.75rem; border-radius: 2rem; border: 1.5px solid #e2e8f0; font-size: 0.8rem; font-weight: 600; color: #475569; background: #f8fafc; }
        .row-completed { background-color: rgba(16, 185, 129, 0.03); }
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; color: #64748b; }
        .loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #27ae60; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LiveDeliveries;

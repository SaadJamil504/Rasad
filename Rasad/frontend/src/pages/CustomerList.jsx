import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffAPI, deliveryAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import InvitationModal from '../components/InvitationModal';
import ManualCustomerModal from '../components/ManualCustomerModal';
import CustomerProfileModal from '../components/CustomerProfileModal';
import './Table.css';

const CustomerList = () => {
  const { t, ts } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('All Routes');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchParams, setSearchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get('id');

  // View Customer states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [shoulEditInitial, setShouldEditInitial] = useState(false);

  const handleViewCustomer = (customer, editMode = false) => {
    setShouldEditInitial(editMode);
    setSelectedCustomer(customer);
  };

  useEffect(() => {
    if (customerIdFromUrl && customers.length > 0) {
      const targetCustomer = customers.find(c => c.id.toString() === customerIdFromUrl);
      if (targetCustomer) {
        handleViewCustomer(targetCustomer);
        setSearchParams({}, { replace: true });
      }
    }
  }, [customerIdFromUrl, customers]);

  const fetchCustomers = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      setError(null);
      const response = await staffAPI.getStaff('customer');
      setCustomers(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to fetch data';
      setError(msg);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatBalance = (balance) => {
    const val = parseFloat(balance || 0);
    if (val > 0) return <span className="balance-text negative">Rs {val.toLocaleString()}</span>;
    if (val < 0) return <span className="balance-text positive">{t('Advance', 'ایڈوانس')} Rs {Math.abs(val).toLocaleString()}</span>;
    return <span className="balance-text">Rs 0</span>;
  };

  const getStatusBadge = (balance) => {
    const val = parseFloat(balance || 0);
    if (val > 0) return <span className="status-label-premium overdue">{t('Overdue', 'بقایا')}</span>;
    return <span className="status-label-premium active">{t('Active', 'فعال')}</span>;
  };

  const filteredCustomers = customers.filter(customer => {
    const searchMatch = (
      (customer.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone_number || '').includes(searchTerm) ||
      (customer.area || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.street || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const routeMatch = routeFilter === 'All Routes' || customer.route_name === routeFilter;
    const statusMatch = statusFilter === 'All Status' || (
      statusFilter === 'Overdue' ? parseFloat(customer.outstanding_balance) > 0 :
        statusFilter === 'Active' ? parseFloat(customer.outstanding_balance) <= 0 :
          true
    );

    return searchMatch && routeMatch && statusMatch;
  });

  return (
    <div className="page-container">


      <div className="premium-toolbar">
        <div className="toolbar-left">
          <div className="search-container">
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder={ts('Search by name, area, number...', 'نام یا نمبر سے تلاش کریں')}
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="toolbar-right">
          <div className="filter-dropdowns">
            <select
              className="premium-select"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="All Routes">{t('All Routes', 'تمام روٹس')}</option>
              {[...new Set(customers.map(c => c.route_name).filter(Boolean))].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              className="premium-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Status">{t('All Status', 'تمام اسٹیٹس')}</option>
              <option value="Active">{t('Active', 'فعال')}</option>
              <option value="Overdue">{t('Overdue', 'بقایا')}</option>
              <option value="Paused">{t('Paused', 'رکا ہوا')}</option>
            </select>
          </div>
          <div className="toolbar-actions">
            <button className="btn-secondary" onClick={() => setIsInviteModalOpen(true)}>
              {t('Invite via Link', 'لنک سے بلاؤ')}
            </button>
            <button className="premium-btn-green" onClick={() => setIsManualModalOpen(true)}>
              <span>+</span> {t('Add Customer', 'نیا گاہک')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">{t('Loading customers...', 'گاہک لوڈ ہو رہے ہیں')}</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="premium-table-wrapper" style={{ maxHeight: '650px', overflowY: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('NO.', 'نمبر')}</th>
                <th>{t('CUSTOMER', 'گاہک')}</th>
                <th>{t('AREA', 'علاقہ')}</th>
                <th>{t('ROUTE', 'روٹ')}</th>
                <th>{t('DAILY QTY', 'روزانہ مقدار')}</th>
                <th>{t('RATE', 'ریٹ')}</th>
                <th>{t('BALANCE', 'بقایا')}</th>
                <th>{t('STATUS', 'اسٹیٹس')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} onClick={() => handleViewCustomer(customer, false)} style={{ cursor: 'pointer' }}>
                  <td data-label="NO."><span className="id-hash" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>#{customer.id}</span></td>
                  <td data-label="CUSTOMER">
                    <div className="customer-cell">
                      <span className="customer-name-main">{customer.first_name || customer.username}</span>
                      <span className="customer-sub-info" style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontFamily: 'Noto Nastaliq Urdu' }}>{customer.first_name_urdu || ''}</span>
                        <span>{customer.phone_number || t('No Number', 'کوئی نمبر نہیں')}</span>
                      </span>
                    </div>
                  </td>
                  <td data-label="AREA"><span className="area-text" style={{ fontSize: '0.9rem', color: '#475569' }}>{customer.address || 'General'}</span></td>
                  <td data-label="ROUTE">
                    <span className={`route-badge ${customer.route_name === 'Route B' ? 'route-b' : customer.route_name === 'Route C' ? 'route-c' : 'route-a'}`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}>
                      {customer.route_name || t('Unassigned', 'غیر مختص')}
                    </span>
                  </td>
                  <td data-label="DAILY QTY"><strong style={{ fontSize: '0.95rem' }}>{parseFloat(customer.daily_quantity).toFixed(0)}L</strong></td>
                  <td data-label="RATE"><span style={{ color: '#475569', fontSize: '0.9rem' }}>Rs {customer.milk_type === 'cow' ? customer.cow_price : (customer.milk_type === 'buffalo' ? customer.buffalo_price : Math.max(customer.cow_price || 0, customer.buffalo_price || 0))}/L</span></td>
                  <td data-label="BALANCE">{formatBalance(customer.outstanding_balance)}</td>
                  <td data-label="STATUS">{getStatusBadge(customer.outstanding_balance)}</td>
                  <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                    <button className="view-btn" onClick={() => handleViewCustomer(customer, true)}>{t('Edit', 'تبدیل')}</button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">{t('No customers found matching your filters.', 'تعین کردہ فلٹرز کے مطابق کوئی گاہک نہیں ملا۔')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ManualCustomerModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => fetchCustomers(true)}
      />

      <InvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        role="customer"
        onInviteSuccess={() => fetchCustomers(true)}
      />

      <CustomerProfileModal
        isOpen={!!selectedCustomer}
        customer={selectedCustomer}
        initialEditMode={shoulEditInitial}
        onClose={() => setSelectedCustomer(null)}
        onUpdateSuccess={() => fetchCustomers(true)}
      />
    </div>
  );
};

export default CustomerList;

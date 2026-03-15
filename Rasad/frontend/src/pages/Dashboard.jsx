import React, { useState, useEffect } from 'react';
import { staffAPI, deliveryAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import './DashboardExtra.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [counts, setCounts] = useState({ drivers: 0, customers: 0 });
  const [deliveries, setDeliveries] = useState([]);
  const [history, setHistory] = useState([]);
  const [customerStatus, setCustomerStatus] = useState(null);
  const [prices, setPrices] = useState({ cow_price: 0, buffalo_price: 0 });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCurrentUser(user);

    const fetchData = async () => {
      try {
        if (user.role === 'owner') {
          const [driversRes, customersRes] = await Promise.all([
            staffAPI.getStaff('driver'),
            staffAPI.getStaff('customer')
          ]);
          setCounts({
            drivers: driversRes.data.length,
            customers: customersRes.data.length,
            totalOutstanding: customersRes.data.reduce((sum, c) => sum + parseFloat(c.outstanding_balance || 0), 0)
          });
          setPrices({
            cow_price: user.cow_price || 0,
            buffalo_price: user.buffalo_price || 0
          });
          const paymentsRes = await deliveryAPI.getPayments();
          setPendingPayments(paymentsRes.data);
        } else if (user.role === 'driver') {
          const [dailyRes, historyRes] = await Promise.all([
            deliveryAPI.getDailyDeliveries(),
            deliveryAPI.getHistory()
          ]);
          setDeliveries(dailyRes.data);
          setHistory(historyRes.data);
        } else if (user.role === 'customer') {
          const [statusRes, historyRes, profileRes] = await Promise.all([
            deliveryAPI.getCustomerStatus(),
            deliveryAPI.getHistory(),
            authAPI.getProfile()
          ]);
          setCustomerStatus(statusRes.data);
          setHistory(historyRes.data);
          setCurrentUser(profileRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleToggleDelivery = async (deliveryId) => {
    try {
      const res = await deliveryAPI.toggleDelivery(deliveryId);
      setDeliveries(deliveries.map(d => d.id === deliveryId ? res.data : d));
    } catch (err) {
      console.error('Failed to toggle delivery:', err);
      alert('Error updating delivery status.');
    }
  };

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    setUpdatingPrices(true);
    try {
      await deliveryAPI.updatePrices(prices);
      alert('Milk prices updated successfully!');
    } catch (err) {
      console.error('Failed to update prices:', err);
      alert('Error updating prices.');
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleReportPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    setSubmittingPayment(true);
    try {
      await deliveryAPI.reportPayment({ amount: paymentAmount });
      alert('Payment reported successfully! Waiting for owner confirmation.');
      setPaymentAmount('');
      // Refresh history/status/profile
      const [statusRes, historyRes, profileRes] = await Promise.all([
        deliveryAPI.getCustomerStatus(),
        deliveryAPI.getHistory(),
        authAPI.getProfile()
      ]);
      setCustomerStatus(statusRes.data);
      setHistory(historyRes.data);
      setCurrentUser(profileRes.data);
    } catch (err) {
      console.error('Failed to report payment:', err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Error reporting payment.';
      alert('Error: ' + errorMsg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleConfirmPayment = async (id, action = 'confirm') => {
    try {
      await deliveryAPI.confirmPayment(id, action);
      alert(`Payment ${action === 'confirm' ? 'confirmed' : 'rejected'}.`);
      // Refresh pending payments and customer counts
      const [paymentsRes, customersRes] = await Promise.all([
        deliveryAPI.getPayments(),
        staffAPI.getStaff('customer')
      ]);
      setPendingPayments(paymentsRes.data);
      setCounts(prev => ({
        ...prev,
        totalOutstanding: customersRes.data.reduce((sum, c) => sum + parseFloat(c.outstanding_balance || 0), 0)
      }));
    } catch (err) {
      console.error('Failed to update payment:', err);
      alert('Error updating payment.');
    }
  };

  if (loading) return <div className="loading">Loading Dashboard...</div>;
  if (!user) return <div className="loading">Redirecting...</div>;

  // Customer Profile View
  if (user.role === 'customer') {
    return (
      <div className="dashboard fade-in">
        <div className="glass-card profile-card">
          <div className="profile-header">
            <div className="avatar-large">{user.username?.charAt(0).toUpperCase()}</div>
            <h2>{user.first_name || user.username} Profile</h2>
            <div className={`status-indicator ${customerStatus?.is_delivered ? 'status-done' : 'status-pending'}`}>
              Today's Delivery: {customerStatus?.is_delivered ? 'Delivered' : 'Pending'}
            </div>
          </div>
          
          <div className="profile-details">
            <div className="detail-item">
              <label>Outstanding Balance</label>
              <span className="text-accent" style={{ color: '#ff4d4d' }}>Rs. {currentUser?.outstanding_balance || 0}</span>
            </div>
            <div className="detail-item">
              <label>Daily Milk Amount</label>
              <span className="text-accent">Rs. {customerStatus?.total_amount || 0}</span>
            </div>
            <div className="detail-item">
              <label>Milk Type</label>
              <span>{user.milk_type || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Daily Quantity</label>
              <span>{user.daily_quantity || '0'} Liters</span>
            </div>
            <div className="detail-item">
              <label>Rate (per Liter)</label>
              <span>Rs. {customerStatus?.price_at_delivery || 0}</span>
            </div>
          </div>

          <div className="delivery-section" style={{ marginTop: '2rem', textAlign: 'left' }}>
            <h3>Report a Payment</h3>
            <form onSubmit={handleReportPayment} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <input 
                type="number" 
                className="form-input" 
                placeholder="Amount Paid" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required 
              />
              <button type="submit" className="btn-primary" disabled={submittingPayment} style={{ whiteSpace: 'nowrap' }}>
                {submittingPayment ? 'Reporting...' : 'Report Payment'}
              </button>
            </form>
          </div>

          <div className="delivery-section" style={{ marginTop: '2.5rem', textAlign: 'left' }}>
            <h3>Recent Delivery History</h3>
            <div className="history-list" style={{ marginTop: '1rem' }}>
              {history.length > 0 ? (
                history.map(item => (
                  <div key={item.id} className="history-item glass-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.date}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.quantity}L x Rs. {item.price_at_delivery}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--accent)' }}>Rs. {item.total_amount}</div>
                  </div>
                ))
              ) : (
                <p>No delivery records found.</p>
              )}
            </div>
          </div>

          <button className="btn-secondary" onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }} style={{ marginTop: '2rem', width: '100%' }}>Logout</button>
        </div>
      </div>
    );
  }

  // Driver Welcome View
  if (user.role === 'driver') {
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.is_delivered).length;
    const pending = total - delivered;

    return (
      <div className="dashboard fade-in">
        <div className="welcome-banner">
          <h1>Welcome, {user.first_name || user.username}! 👋</h1>
          <p>You have {pending} deliveries remaining for today.</p>
          
          <div className="customer-stats-summary" style={{ marginTop: '2rem' }}>
            <div className="summary-item">
              <span className="label">Total Customers</span>
              <span className="value">{total}</span>
            </div>
            <div className="summary-item">
              <span className="label">Delivered</span>
              <span className="value">{delivered}</span>
            </div>
            <div className="summary-item">
              <span className="label">Remaining</span>
              <span className="value">{pending}</span>
            </div>
          </div>

          <button className="btn-secondary" onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}>Logout</button>
        </div>

        <div className="delivery-section">
          <h3>Your Delivery Route</h3>
          <div className="delivery-grid">
            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="delivery-card">
                  <div className="customer-info">
                    <h4>{delivery.customer_name || delivery.customer_username}</h4>
                    <p>{delivery.customer_address}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                      <span>{delivery.customer_quantity}L {delivery.customer_milk_type}</span>
                      <span>Rs. {delivery.total_amount}</span>
                    </div>
                  </div>
                  <div className="delivery-action">
                    <input 
                      type="checkbox" 
                      className="delivery-status-checkbox"
                      checked={delivery.is_delivered}
                      onChange={() => handleToggleDelivery(delivery.id)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p>No customers assigned to your route yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      <div className="welcome-banner">
        <h1>Welcome to Rasad Dashboard! 👋</h1>
        <p>Manage your drivers and customers efficiently.</p>
        <button className="btn-secondary" onClick={() => {
          localStorage.clear();
          window.location.href = '/login';
        }} style={{marginTop: '1rem'}}>
          Logout / Switch Account
        </button>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card" onClick={() => window.location.href='/drivers'}>
          <div className="stat-label">Total Drivers</div>
          <div className="stat-value">{counts.drivers}</div>
          <div className="stat-change positive">Invite new drivers</div>
        </div>
        <div className="stat-card" onClick={() => window.location.href='/customers'}>
          <div className="stat-label">Active Customers</div>
          <div className="stat-value">{counts.customers}</div>
          <div className="stat-change positive">Invite new customers</div>
        </div>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value" style={{ color: '#ff4d4d' }}>Rs. {counts.totalOutstanding?.toFixed(2)}</div>
          <div className="stat-change">Amount to be received</div>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="recent-activity glass-card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <h3>Pending Payment Requests</h3>
          <div className="history-list" style={{ marginTop: '1.5rem' }}>
            {pendingPayments.map(payment => (
              <div key={payment.id} className="history-item glass-card" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{payment.customer_name || payment.customer_username}</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 700 }}>Rs. {payment.amount}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(payment.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => handleConfirmPayment(payment.id, 'confirm')}>Confirm</button>
                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#ff4d4d' }} onClick={() => handleConfirmPayment(payment.id, 'reject')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="recent-activity glass-card" style={{ padding: '2.5rem' }}>
        <h3>Set Daily Milk Prices</h3>
        <form onSubmit={handleUpdatePrices} className="pricing-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Cow Milk Price (per Liter)</label>
            <input 
              type="number" 
              className="form-input"
              value={prices.cow_price} 
              onChange={(e) => setPrices({...prices, cow_price: e.target.value})}
              required
            />
          </div>
          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Buffalo Milk Price (per Liter)</label>
            <input 
              type="number" 
              className="form-input"
              value={prices.buffalo_price} 
              onChange={(e) => setPrices({...prices, buffalo_price: e.target.value})}
              required
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={updatingPrices} style={{ width: '100%' }}>
              {updatingPrices ? 'Updating...' : 'Save Prices'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="recent-activity" style={{ marginTop: '2rem' }}>
        <h3>Quick Actions</h3>
        <div className="placeholder-content">
          <div className="badge-list">
            <button className="badge-btn" onClick={() => window.location.href='/drivers'}>Drivers List</button>
            <button className="badge-btn" onClick={() => window.location.href='/customers'}>Customers List</button>
            <span className="badge">Invite-only Registration Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

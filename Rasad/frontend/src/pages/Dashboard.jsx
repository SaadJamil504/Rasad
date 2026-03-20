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
  const [adjustments, setAdjustments] = useState([]);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [adjMessage, setAdjMessage] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [adjComment, setAdjComment] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
          const [paymentsRes, adjustmentsRes] = await Promise.all([
            deliveryAPI.getPayments(),
            deliveryAPI.getAdjustments()
          ]);
          setPendingPayments(paymentsRes.data);
          setAdjustments(adjustmentsRes.data);
        } else if (user.role === 'driver') {
          const [dailyRes, historyRes, adjustmentsRes] = await Promise.all([
            deliveryAPI.getDailyDeliveries(),
            deliveryAPI.getHistory(),
            deliveryAPI.getAdjustments()
          ]);
          setDeliveries(dailyRes.data);
          setHistory(historyRes.data);
          setAdjustments(adjustmentsRes.data);
        } else if (user.role === 'customer') {
          const [statusRes, historyRes, profileRes] = await Promise.all([
            deliveryAPI.getCustomerStatus(),
            deliveryAPI.getHistory(),
            authAPI.getProfile()
          ]);
          setCustomerStatus(statusRes.data);
          setHistory(historyRes.data);
          const adjustmentsRes = await deliveryAPI.getAdjustments();
          setAdjustments(adjustmentsRes.data);
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

  useEffect(() => {
    if (showHistoryModal) {
      handleFetchFilteredHistory();
    }
  }, [showHistoryModal, filterMonth, filterYear]);

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
      setShowPaymentModal(false);
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

  const handleCreateAdjustment = async (type) => {
    console.log('[DEBUG] handleCreateAdjustment called:', type);
    if (type === 'quantity' && (!adjQty || parseFloat(adjQty) < 0)) {
      console.warn('[DEBUG] Invalid quantity:', adjQty);
      return;
    }
    setIsSubmittingAdj(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = {
        date: today,
        adjustment_type: type,
        new_quantity: type === 'quantity' ? adjQty : null,
        message: adjMessage
      };
      console.log('[DEBUG] Sending request with data:', data);
      await deliveryAPI.createAdjustment(data);
      alert('Request sent to driver for approval.');
      setShowPauseModal(false);
      setShowQtyModal(false);
      setAdjMessage('');
      setAdjQty('');
      // Refresh adjustments
      const res = await deliveryAPI.getAdjustments();
      setAdjustments(res.data);
    } catch (err) {
      console.error('Failed to create adjustment Error:', err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Error sending request.';
      alert('Error: ' + errorMsg);
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleCreateComplaint = async () => {
    if (!complaintMessage.trim()) return;
    setIsSubmittingAdj(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = {
        date: today,
        adjustment_type: 'complaint',
        message: complaintMessage
      };
      await deliveryAPI.createAdjustment(data);
      alert('Complaint sent to driver.');
      setShowComplaintModal(false);
      setComplaintMessage('');
      // Refresh adjustments
      const res = await deliveryAPI.getAdjustments();
      setAdjustments(res.data);
    } catch (err) {
      console.error('Failed to send complaint:', err);
      alert('Error sending complaint.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleFetchFilteredHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await deliveryAPI.getDeliveryHistory(filterMonth, filterYear);
      setFilteredHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch filtered history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleActionAdjustment = async (id, action) => {
    try {
      await deliveryAPI.actionAdjustment(id, { action, driver_comment: adjComment });
      setAdjComment('');
      alert(`Request ${action === 'accept' ? 'accepted' : 'rejected'}.`);
      // Refresh data
      const [dailyRes, adjRes] = await Promise.all([
        deliveryAPI.getDailyDeliveries(),
        deliveryAPI.getAdjustments()
      ]);
      setDeliveries(dailyRes.data);
      setAdjustments(adjRes.data);
    } catch (err) {
      console.error('Failed to action adjustment:', err);
      alert('Error updating request.');
    }
  };
  const renderModals = () => (
    <>
      {showPauseModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <h3>Pause Delivery</h3>
            <p style={{ margin: '1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Pause delivery for today. Your driver will need to accept this request.
            </p>
            <textarea 
              className="form-input" 
              placeholder="Message for driver (optional)"
              value={adjMessage}
              onChange={(e) => setAdjMessage(e.target.value)}
              style={{ minHeight: '100px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowPauseModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} disabled={isSubmittingAdj} onClick={() => handleCreateAdjustment('pause')}>
                {isSubmittingAdj ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQtyModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <h3>Change Quantity</h3>
            <p style={{ margin: '1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Request a different quantity for today.
            </p>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>New Quantity (Liters)</label>
              <input 
                type="number" 
                className="form-input"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <textarea 
              className="form-input" 
              placeholder="Message for driver (optional)"
              value={adjMessage}
              onChange={(e) => setAdjMessage(e.target.value)}
              style={{ minHeight: '80px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowQtyModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} disabled={isSubmittingAdj} onClick={() => handleCreateAdjustment('quantity')}>
                {isSubmittingAdj ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showComplaintModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <h3>File a Complaint</h3>
            <p style={{ margin: '1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Send a message to your driver regarding any issues (e.g. spoiled milk).
            </p>
            <textarea 
              className="form-input" 
              placeholder="Write your complaint here..."
              value={complaintMessage}
              onChange={(e) => setComplaintMessage(e.target.value)}
              style={{ minHeight: '120px', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowComplaintModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} disabled={isSubmittingAdj} onClick={handleCreateComplaint}>
                {isSubmittingAdj ? 'Sending...' : 'Send Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '600px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Past Bills & History</h3>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Month</label>
                <select className="form-input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Year</label>
                <select className="form-input" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="bill-list">
              {loadingHistory ? <p>Loading history...</p> : (
                filteredHistory.length > 0 ? (
                  <>
                    {filteredHistory.map(item => (
                      <div key={item.id} className="bill-item">
                        <span className="bill-day">{new Date(item.date).getDate()}</span>
                        <span className="bill-qty">{item.status === 'paused' ? 'Paused' : `${item.quantity} Liter`}</span>
                        <span className="bill-price">Rs {item.status === 'paused' ? '0' : item.total_amount}</span>
                      </div>
                    ))}
                    <div className="bill-item total-row">
                      <span className="bill-day" style={{ visibility: 'hidden' }}>0</span>
                      <span className="bill-qty">Total {filteredHistory.reduce((s, i) => s + parseFloat(i.quantity || 0), 0)} Liter</span>
                      <span className="bill-price">Rs {filteredHistory.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)}</span>
                    </div>
                  </>
                ) : <p style={{ textAlign: 'center', color: '#888' }}>No records found for this period.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <h3>💸 Report Past Payment</h3>
            <p style={{ margin: '1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Report the amount you have paid to the owner for confirmation.
            </p>
            <form onSubmit={handleReportPayment}>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Amount (Rs.)</label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingPayment}>
                  {submittingPayment ? 'Reporting...' : 'Report Amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  if (loading) return <div className="loading">Loading Dashboard...</div>;
  if (!user) return <div className="loading">Redirecting...</div>;

  // Customer Profile View
  if (user.role === 'customer') {
    const today = new Date();
    const currentMonthName = today.toLocaleString('default', { month: 'long' }).toUpperCase();
    const currentYear = today.getFullYear();
    
    // Calculate Monthly Stats
    const currentMonthHistory = history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    });

    const monthlyQty = currentMonthHistory.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const monthlyTotalAmount = currentMonthHistory.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);

    return (
      <div className="dashboard fade-in">
        <div className="customer-dashboard">
          <div className="customer-header-banner">
            <div className="greeting">السلام علیکم</div>
            <h2>{user.first_name || user.username}</h2>
            <div className="sub-header">#{user.id} - {user.address || 'Gulberg III'} - {user.owner_dairy_name || 'Dairy'}</div>
          </div>

          <div className="customer-stats-row">
            <div className="stat-box">
              <span className="stat-val red">Rs {currentUser?.outstanding_balance || 0}</span>
              <span className="stat-lbl">Amount Due</span>
            </div>
            <div className="stat-box">
              <span className="stat-val green">{user.daily_quantity || 0}L</span>
              <span className="stat-lbl">Daily Qty</span>
            </div>
            <div className="stat-box">
              <span className="stat-val">{monthlyQty}L</span>
              <span className="stat-lbl">This Month</span>
            </div>
          </div>

          <div className="bill-section">
            <h3>{currentMonthName} {currentYear} — Bill</h3>
            <div className="bill-list">
              {currentMonthHistory.length > 0 ? (
                currentMonthHistory.slice(0, 10).map(item => (
                  <div key={item.id} className="bill-item">
                    <span className="bill-day">{new Date(item.date).getDate()}</span>
                    <span className="bill-qty">{item.status === 'paused' ? 'Paused' : `${item.quantity} Liter`}</span>
                    <span className="bill-price">Rs. {item.status === 'paused' ? '0' : item.total_amount}</span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No deliveries recorded for this month.</p>
              )}
              
              {currentMonthHistory.length > 0 && (
                <div className="bill-item total-row">
                  <span className="bill-day" style={{ visibility: 'hidden' }}>0</span>
                  <span className="bill-qty">Total {monthlyQty} Liter</span>
                  <span className="bill-price">Rs {monthlyTotalAmount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <div className="action-card-btn" onClick={() => setShowPauseModal(true)}>
                <div>
                  <span className="btn-text-main">⏸ Pause Delivery</span>
                </div>
                <div className="btn-text-urdu">ڈیلیوری<br/>روکیں</div>
              </div>
              
              <div className="action-card-btn" onClick={() => setShowQtyModal(true)}>
                <div>
                  <span className="btn-text-main">📊 Change Qty</span>
                </div>
                <div className="btn-text-urdu">مقدار<br/>بدلیں</div>
              </div>

              <div className="action-card-btn" onClick={() => setShowHistoryModal(true)}>
                <div>
                  <span className="btn-text-main">📄 Past Bills</span>
                </div>
                <div className="btn-text-urdu">پرانے بل</div>
              </div>

              <div className="action-card-btn" onClick={() => setShowComplaintModal(true)}>
                <div>
                  <span className="btn-text-main">⚠️ Complaint</span>
                </div>
                <div className="btn-text-urdu">شکایت</div>
              </div>
            </div>
          </div>

          <div className="payment-report-section" style={{ paddingBottom: '0.5rem' }}>
            <button className="btn-primary-large" onClick={() => setShowPaymentModal(true)} style={{ background: '#1e8449' }}>
               💸 Report Payment to Owner
            </button>
          </div>

          <div style={{ padding: '0 2rem 2rem' }}>
            <button className="btn-secondary" onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }} style={{ width: '100%', borderRadius: '0.5rem' }}>Logout</button>
          </div>
        </div>
        {/* Modals for Quick Actions */}
        {renderModals()}
      </div>
    );
  }

  // Driver View
  if (user.role === 'driver') {
    const total = deliveries.length;
    const done = deliveries.filter(d => d.is_delivered || d.status === 'paused').length;
    const left = total - done;

    // Separate complaints
    const pendingComplaints = adjustments.filter(a => a.adjustment_type === 'complaint' && a.status === 'pending');
    
    // Correlate deliveries with adjustments
    const todayStr = new Date().toISOString().split('T')[0];
    const enrichedDeliveries = deliveries.map(d => {
      const pendingAdj = adjustments.find(a => 
        a.customer === d.customer && 
        a.date === d.date && 
        a.status === 'pending'
      );
      return { ...d, pendingAdj };
    });

    return (
      <div className="dashboard fade-in">
        <div className="driver-dashboard">
          <div className="driver-header-banner">
            <div className="banner-top">
              <span>Driver App . ڈرائیور ایپ</span>
              <span className="banner-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <h2>{user.first_name || user.username} — {user.assigned_route_name || 'Route A'}</h2>
          </div>

          <div className="driver-stats-row">
            <div className="stat-box">
              <span className="stat-val">{total}</span>
              <span className="stat-lbl">Total</span>
            </div>
            <div className="stat-box">
              <span className="stat-val green">{done} <span style={{fontSize: '1rem'}}>✅</span></span>
              <span className="stat-lbl">Done</span>
            </div>
            <div className="stat-box">
              <span className="stat-val orange">{left}</span>
              <span className="stat-lbl">Left</span>
            </div>
          </div>

          {pendingComplaints.length > 0 && (
            <div className="complaints-section">
              <div className="section-title">
                <h3>Customer Complaints</h3>
                <span className="urdu-title">کسٹمر کی شکایت</span>
              </div>
              <div className="complaints-list">
                {pendingComplaints.map(adj => (
                  <div key={adj.id} className="complaint-card glass-card">
                    <div className="complaint-info">
                      <strong>{adj.customer_name || adj.customer_username}</strong>
                      <p className="message">"{adj.message || 'No message'}"</p>
                    </div>
                    <div className="complaint-actions">
                      <button className="btn-primary-small" onClick={() => handleActionAdjustment(adj.id, 'accept')}>Got it</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="today-list-section">
            <div className="section-title">
              <h3>TODAY'S LIST — آج کی فہرست</h3>
            </div>
            <div className="today-list">
              {enrichedDeliveries.length > 0 ? (
                enrichedDeliveries.map((delivery) => {
                  let statusClass = 'pending';
                  let statusText = '';
                  let showActions = true;

                  if (delivery.is_delivered) {
                    statusClass = 'done';
                    statusText = 'Done';
                    showActions = false;
                  } else if (delivery.status === 'paused') {
                    statusClass = 'paused';
                    statusText = 'Paused';
                    showActions = false;
                  } else if (delivery.pendingAdj) {
                    statusClass = 'changed';
                    statusText = delivery.pendingAdj.adjustment_type === 'pause' ? 'Pause Request' : 'Change Request';
                  }

                  return (
                    <div key={delivery.id} className={`today-list-item ${statusClass}`}>
                      <div className="item-status-icon">
                        {statusClass === 'done' && <div className="icon-circle check">✓</div>}
                        {statusClass === 'changed' && <div className="icon-circle warn">!</div>}
                        {statusClass === 'paused' && <div className="icon-circle pause">双</div>}
                        {statusClass === 'pending' && <div className="icon-circle empty"></div>}
                      </div>

                      <div className="item-info">
                        <div className="customer-name">{delivery.customer_name || delivery.customer_username}</div>
                        <div className="customer-addr">{delivery.customer_address}</div>
                        
                        {statusClass === 'changed' ? (
                          <div className="adjustment-note">
                            {delivery.pendingAdj.adjustment_type === 'pause' ? (
                              'Request: Pause today'
                            ) : (
                              `Changed: ${delivery.customer_quantity}L → ${delivery.pendingAdj.new_quantity}L today`
                            )}
                          </div>
                        ) : (
                          <div className="delivery-details">
                            {delivery.quantity}L {delivery.customer_milk_type} · Rs {delivery.total_amount}
                          </div>
                        )}
                      </div>

                      <div className="item-actions">
                        {statusClass === 'done' && <span className="status-label green">Done</span>}
                        {statusClass === 'paused' && <span className="status-label gray">Paused</span>}
                        
                        {statusClass === 'changed' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-deliver" onClick={() => handleActionAdjustment(delivery.pendingAdj.id, 'accept')}>Accept</button>
                            <button className="btn-skip" onClick={() => handleActionAdjustment(delivery.pendingAdj.id, 'reject')}>Reject</button>
                          </div>
                        )}

                        {statusClass === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-deliver" onClick={() => handleToggleDelivery(delivery.id)}>Deliver</button>
                            <button className="btn-skip" onClick={() => handleActionAdjustment(delivery.id, 'pause')}>Skip</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No customers assigned for today.</p>
              )}
            </div>
          </div>
          
          <div style={{ padding: '0 2rem 2rem' }}>
            <button className="btn-secondary" onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }} style={{ width: '100%', borderRadius: '0.5rem' }}>Logout</button>
          </div>
        </div>
        {renderModals()}
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
        <h3>Activity Logs (Requests)</h3>
        <div className="history-list" style={{ marginTop: '1.5rem' }}>
          {adjustments.length > 0 ? (
            adjustments.slice(0, 10).map(adj => (
              <div key={adj.id} className="history-item glass-card" style={{ padding: '1.2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{adj.customer_name || adj.customer_username}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {adj.adjustment_type === 'pause' ? 'Pause Request' : 
                     adj.adjustment_type === 'quantity' ? `Qty Change: ${adj.new_quantity}L` : 
                     'Complaint'} - {adj.date}
                  </div>
                </div>
                <div style={{ 
                  padding: '0.3rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: adj.status === 'accepted' ? 'rgba(77, 255, 140, 0.1)' : adj.status === 'rejected' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: adj.status === 'accepted' ? '#2ecc71' : adj.status === 'rejected' ? '#ff4d4d' : 'var(--text-muted)'
                }}>
                  {adj.status}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No recent activity requests.</p>
          )}
        </div>
           </div>


      {/* Modals for Quick Actions */}
      {renderModals()}
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { staffAPI, deliveryAPI } from '../services/api';

const MonthlyBills = () => {
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

  return (
    <div className="page-container fade-in">
      

      <div className="premium-toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Select Customer</label>
          <select 
            className="premium-select" 
            style={{ width: '100%' }}
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">-- Choose a Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.first_name || c.username} - {c.address || 'No Address'}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Select Month</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="premium-select" value={viewMonth} onChange={(e) => setViewMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select className="premium-select" value={viewYear} onChange={(e) => setViewYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selectedCustomer ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3>Select a customer to view their monthly bill</h3>
        </div>
      ) : loading ? (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>Loading bill details...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '2rem' }}>
          {customerDetails && (
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{customerDetails.first_name || customerDetails.username}</h2>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {customerDetails.address || 'N/A'} • {customerDetails.route_name || 'Unassigned'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>DAILY QTY</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{customerDetails.daily_quantity || '0'}L ({customerDetails.milk_type})</div>
              </div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>CURRENT BALANCE</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: parseFloat(customerDetails.outstanding_balance) > 0 ? '#ef4444' : '#27ae60' }}>
                  {parseFloat(customerDetails.outstanding_balance) > 0 ? 'Rs ' + customerDetails.outstanding_balance : 'Advance Rs ' + Math.abs(customerDetails.outstanding_balance)}
                </div>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Deliveries & Bill for {new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            
            {customerHistory.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>DATE</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>QUANTITY</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>AMOUNT</th>
                      <th style={{ padding: '1rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>STATUS</th>
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
                            {item.status === 'paused' ? 'Paused' : 'Delivered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <tr>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#1e293b' }}>TOTAL</td>
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
              <p style={{ textAlign: 'center', color: '#94a3b8', margin: '3rem 0' }}>No deliveries found for this month.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyBills;

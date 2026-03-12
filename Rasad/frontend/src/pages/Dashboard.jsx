import React from 'react';
import { staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [counts, setCounts] = React.useState({ drivers: 0, customers: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.role !== 'owner') {
      setLoading(false);
      return;
    }
    const fetchCounts = async () => {
      try {
        const [driversRes, customersRes] = await Promise.all([
          staffAPI.getStaff('driver'),
          staffAPI.getStaff('customer')
        ]);
        setCounts({
          drivers: driversRes.data.length,
          customers: customersRes.data.length
        });
      } catch (err) {
        console.error('Failed to fetch dashboard counts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, [user]);

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
            <span className="badge-green">Active Customer</span>
          </div>
          
          <div className="profile-details">
            <div className="detail-item">
              <label>Email</label>
              <span>{user.email || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{user.phone_number || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Address</label>
              <span>{user.address || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Milk Preference</label>
              <span>{user.milk_type || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Daily Quantity</label>
              <span>{user.daily_quantity || '0'} Liters</span>
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
    return (
      <div className="dashboard fade-in">
        <div className="welcome-banner">
          <h1>Welcome, {user.first_name || user.username}! 👋</h1>
          <p>You are logged in as a Driver.</p>
          <button className="btn-secondary" onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}>Logout</button>
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
        <div className="stat-card">
          <div className="stat-label">System Status</div>
          <div className="stat-value">Online</div>
          <div className="stat-change">All services running</div>
        </div>
      </div>
      
      <div className="recent-activity">
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

import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI } from '../../services/api';
import './Layout.css';

const MainLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [prices, setPrices] = useState({ cow_price: 0, buffalo_price: 0 });
  const [updatingPrices, setUpdatingPrices] = useState(false);

  useEffect(() => {
    if (user) {
      setPrices({ cow_price: user.cow_price || 0, buffalo_price: user.buffalo_price || 0 });
    }
  }, [user]);

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    setUpdatingPrices(true);
    try {
      await deliveryAPI.updatePrices(prices);
      alert('Milk prices updated successfully!');
      setShowPriceModal(false);
    } catch (err) {
      console.error('Failed to update prices:', err);
      alert('Error updating prices.');
    } finally {
      setUpdatingPrices(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showSidebar = user.role === 'owner';
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`app-layout ${!showSidebar ? 'no-sidebar' : ''} ${user.role === 'owner' ? 'role-owner' : ''}`}>
      {showSidebar && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}
      
      {showSidebar && (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-icon">R</div>
            <h2>Rasad</h2>
          </div>
          <nav className="sidebar-nav">
            <Link to="/" className={`nav-item ${window.location.pathname === '/' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="icon">📊</span> Dashboard
            </Link>
            <Link to="/routes" className={`nav-item ${window.location.pathname === '/routes' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="icon">🛣️</span> Routes
            </Link>
            <Link to="/drivers" className={`nav-item ${window.location.pathname === '/drivers' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="icon">🚛</span> Drivers
            </Link>
            <Link to="/customers" className={`nav-item ${window.location.pathname === '/customers' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="icon">👥</span> Customers
            </Link>
            {user.role === 'owner' && (
              <>
                <Link to="/bills" className={`nav-item ${window.location.pathname === '/bills' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="icon">📄</span> Monthly Bills
                </Link>
                <Link to="/reports" className={`nav-item ${window.location.pathname === '/reports' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="icon">📊</span> Reports
                </Link>
              </>
            )}
          </nav>
          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="name">{user.username}</span>
                <span className="role">{user.role || 'User'}</span>
              </div>
            </div>
          </div>
        </aside>
      )}
      <main className="main-content">
        {showSidebar && (
          <header className="top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="hamburger-btn" onClick={toggleSidebar}>
                ☰
              </button>
              <div className="breadcrumb desktop-only">Home / Dashboard</div>
            </div>
            
            <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user.role === 'owner' && (
                <button 
                  onClick={() => setShowPriceModal(true)} 
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(39, 174, 96, 0.3)' }}
                  className="adjust-price-btn"
                >
                  Adjust Price
                </button>
              )}
              <button onClick={handleLogout} className="logout-top-btn">
                Logout
              </button>
            </div>
          </header>
        )}
        <section className={`page-body ${!showSidebar ? 'full-width' : ''}`}>
          <Outlet />
        </section>
      </main>

      {showPriceModal && (
        <div className="modal-overlay-layout" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', width: '90%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>Adjust Daily Milk Prices</h3>
            <form onSubmit={handleUpdatePrices}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Cow Milk Price (per Liter)</label>
                <input
                  type="number"
                  value={prices.cow_price}
                  onChange={(e) => setPrices({ ...prices, cow_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Buffalo Milk Price (per Liter)</label>
                <input
                  type="number"
                  value={prices.buffalo_price}
                  onChange={(e) => setPrices({ ...prices, buffalo_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowPriceModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={updatingPrices} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {updatingPrices ? 'Saving...' : 'Save Prices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;

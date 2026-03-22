import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import './Layout.css';

const MainLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [prices, setPrices] = useState({ cow_price: 0, buffalo_price: 0 });
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    if (user) {
      setPrices({ cow_price: user.cow_price || 0, buffalo_price: user.buffalo_price || 0 });
    }
  }, [user]);

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    
    // Validate prices are positive
    if (parseFloat(prices.cow_price) <= 0 || parseFloat(prices.buffalo_price) <= 0) {
      alert('Prices must be greater than 0.');
      return;
    }
    
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
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
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
              {t('Dashboard', 'ڈیش بورڈ')}
            </Link>
            <Link to="/routes" className={`nav-item ${window.location.pathname === '/routes' ? 'active' : ''}`} onClick={closeSidebar}>
              {t('Routes', 'روٹس')}
            </Link>
            <Link to="/drivers" className={`nav-item ${window.location.pathname === '/drivers' ? 'active' : ''}`} onClick={closeSidebar}>
              {t('Drivers', 'ڈرائیورز')}
            </Link>
            <Link to="/customers" className={`nav-item ${window.location.pathname === '/customers' ? 'active' : ''}`} onClick={closeSidebar}>
              {t('Customers', 'گاہک')}
            </Link>
            {user.role === 'owner' && (
              <>
                <Link to="/bills" className={`nav-item ${window.location.pathname === '/bills' ? 'active' : ''}`} onClick={closeSidebar}>
                  {t('Monthly Bills', 'ماہانہ بل')}
                </Link>
                <Link to="/payments" className={`nav-item ${window.location.pathname === '/payments' ? 'active' : ''}`} onClick={closeSidebar}>
                  {t('Payments', 'ادائیگیاں')}
                </Link>
                <Link to="/reports" className={`nav-item ${window.location.pathname === '/reports' ? 'active' : ''}`} onClick={closeSidebar}>
                  {t('Reports', 'رپورٹس')}
                </Link>
                <div className="nav-item" style={{ cursor: 'pointer' }} onClick={() => { setShowPriceModal(true); closeSidebar(); }}>
                  {t('Adjust Price', 'نرخ بدلیں')}
                </div>
              </>
            )}
          </nav>
          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="name">{user.username}</span>
                <span className="role">{t(user.role || 'User', user.role === 'owner' ? 'مالک' : (user.role === 'driver' ? 'ڈرائیور' : 'گاہک'))}</span>
              </div>
            </div>
          </div>
        </aside>
      )}
      <main className="main-content">
        <header className={showSidebar ? "owner-header-compact" : "customer-driver-header-transparent"}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {showSidebar && (
                  <button className="hamburger-btn owner-hamburger" onClick={toggleSidebar} style={{ color: '#1e293b', fontSize: '2.2rem', fontWeight: 'bold', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                    ☰
                  </button>
                )}
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: showSidebar ? '#1e293b' : 'white' }}>
                  {showSidebar ? t('Dashboard', 'ڈیش بورڈ') : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={toggleLanguage} 
                  className="lang-toggle-btn"
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '2rem', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    background: 'rgba(255,255,255,0.1)', 
                    color: showSidebar ? '#1e293b' : 'white',
                    fontWeight: 700, 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  {language === 'en' ? 'اردو' : 'English'}
                </button>
                <button 
                  onClick={handleLogout} 
                  className="logout-banner-btn-compact"
                  style={!showSidebar ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fee2e2', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}
                >
                  {t('Logout', 'لاگ آؤٹ')}
                </button>
              </div>
            </div>
          </header>
        <section className={`page-body ${!showSidebar ? 'full-width' : ''}`}>
          <Outlet />
        </section>
      </main>

      {showPriceModal && (
        <div className="modal-overlay-layout" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', width: '90%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>{t('Adjust Daily Milk Prices', 'دودھ کے روزانہ نرخ بدلیں')}</h3>
            <form onSubmit={handleUpdatePrices}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>{t('Cow Milk Price (per Liter)', 'گائے کے دودھ کا ریٹ (فی لیٹر)')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={prices.cow_price}
                  onChange={(e) => setPrices({ ...prices, cow_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>{t('Buffalo Milk Price (per Liter)', 'بھینس کے دودھ کا ریٹ (فی لیٹر)')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={prices.buffalo_price}
                  onChange={(e) => setPrices({ ...prices, buffalo_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', width: '100%', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  style={{
                    flex: '1 1 0',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    margin: 0,
                    padding: 0,
                    width: '0',
                    boxSizing: 'border-box'
                  }}
                >
                  {t('Cancel', 'کینسل')}
                </button>
                <button
                  type="submit"
                  disabled={updatingPrices}
                  style={{
                    flex: '1 1 0',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#27ae60',
                    color: 'white',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    margin: 0,
                    padding: 0,
                    width: '0',
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)'
                  }}
                >
                  {updatingPrices ? t('Saving...', 'محفوظ ہو رہا ہے...') : t('Save Prices', 'ریٹ محفوظ کریں')}
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

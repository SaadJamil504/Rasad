import React, { useEffect, useState } from 'react';
import { routeAPI } from '../services/api';
import RouteModal from '../components/RouteModal';
import CustomerProfileModal from '../components/CustomerProfileModal';
import { useLanguage } from '../context/LanguageContext';
import './Table.css';

const RouteList = () => {
  const { t } = useLanguage();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);

  const fetchRoutes = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      setError(null);
      const response = await routeAPI.getRoutes();
      setRoutes(response.data);
    } catch (err) {
      console.error('Fetch routes error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to fetch routes';
      setError(msg);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
        <button className="premium-btn-green" onClick={() => {
          setSelectedRoute(null);
          setIsModalOpen(true);
        }}>
          <span>+</span> {t('Add Route', 'نیا روٹ')}
        </button>
      </div>

      {loading ? (
        <div className="loading">{t('Loading routes...', 'روٹس لوڈ ہو رہے ہیں')}</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="route-grid">
          {routes.map((route, index) => (
            <div className="route-card-premium" key={route.id}>
              <div className="route-card-header">
                <div className="route-title-area">
                  <div className="route-dot" style={{ backgroundColor: index % 3 === 0 ? '#9333ea' : index % 3 === 1 ? '#f59e0b' : '#10b981' }}></div>
                  <div className="route-info-stack">
                    <span className="route-name-text">{route.name}</span>
                    <div className="route-driver-info">
                      <span>{t('Driver', 'ڈرائیور')}: {route.driver_name}</span>
                      <span>•</span>
                      <span>{route.customer_count} {t('customers', 'گاہک')}</span>
                      <span>•</span>
                      <span>{route.total_quantity}L/{t('day', 'دن')}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className={index % 3 === 2 ? 'pending-start-label' : 'active-today-label'}>
                    {index % 3 === 2 ? t('Pending Start', 'پینڈنگ') : t('Active Today', 'آج فعال')}
                  </span>
                  <button
                    className="edit-action-btn"
                    onClick={() => {
                      setSelectedRoute(route);
                      setIsModalOpen(true);
                    }}
                  >
                    {t('Edit', 'تبدیل')}
                  </button>
                </div>
              </div>

              <div className="route-stats-badges">
                {route.customer_details?.slice(0, 5).map(cust => (
                  <span 
                    key={cust.id} 
                    className="customer-small-pill"
                    style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                    onClick={() => setSelectedCustomerForProfile(cust)}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#27ae60'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    {cust.first_name || cust.username}
                  </span>
                ))}
                {route.customer_count > 5 && (
                  <span className="customer-small-pill">+{route.customer_count - 5} {t('more', 'اور')}</span>
                )}
                {route.customer_count === 0 && (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>No customers assigned</span>
                )}
              </div>
            </div>
          ))}
          {routes.length === 0 && (
            <div className="empty-row" style={{ background: 'white', borderRadius: '20px' }}>
              {t('No routes found. Create your first delivery route!', 'کوئی روٹ نہیں ملا- اپنا پہلا روٹ بنائیں')}
            </div>
          )}
        </div>
      )}

      <RouteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoute(null);
        }}
        onRouteCreated={() => fetchRoutes(true)}
        editRoute={selectedRoute}
      />

      <CustomerProfileModal
        isOpen={!!selectedCustomerForProfile}
        customer={selectedCustomerForProfile}
        onClose={() => setSelectedCustomerForProfile(null)}
        onUpdateSuccess={() => fetchRoutes(true)}
      />
    </div>
  );
};

export default RouteList;

import React, { useEffect, useState } from 'react';
import { routeAPI } from '../services/api';
import RouteModal from '../components/RouteModal';
import './Table.css';

const RouteList = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

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
          <span>+</span> Add Route
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading routes...</div>
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
                      <span>Driver: {route.driver_name}</span>
                      <span>•</span>
                      <span>{route.customer_count} customers</span>
                      <span>•</span>
                      <span>{route.total_quantity}L/day</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className={index % 3 === 2 ? 'pending-start-label' : 'active-today-label'}>
                    {index % 3 === 2 ? 'Pending Start' : 'Active Today'}
                  </span>
                  <button
                    className="edit-action-btn"
                    onClick={() => {
                      setSelectedRoute(route);
                      setIsModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="route-stats-badges">
                {route.customer_details?.slice(0, 5).map(cust => (
                  <span key={cust.id} className="customer-small-pill">
                    #{cust.id} {cust.first_name || cust.username}
                  </span>
                ))}
                {route.customer_count > 5 && (
                  <span className="customer-small-pill">+{route.customer_count - 5} more</span>
                )}
                {route.customer_count === 0 && (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>No customers assigned</span>
                )}
              </div>
            </div>
          ))}
          {routes.length === 0 && (
            <div className="empty-row" style={{ background: 'white', borderRadius: '20px' }}>
              No routes found. Create your first delivery route!
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
    </div>
  );

};

export default RouteList;

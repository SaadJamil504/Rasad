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
      <div className="page-header">
        <h1>Delivery Routes</h1>
        <button className="primary-btn" onClick={() => {
          setSelectedRoute(null);
          setIsModalOpen(true);
        }}>
          <span>+</span> Create Route
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading routes...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Route Name</th>
                <th>Driver Assigned</th>
                <th>Customers</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => (
                <tr key={route.id}>
                  <td className="text-muted">#{route.id}</td>
                  <td className="font-bold">{route.name}</td>
                  <td>{route.driver_name}</td>
                  <td>
                    <span className="badge-blue">{route.customer_count} Customers</span>
                  </td>
                  <td className="text-muted">{new Date(route.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="text-btn" 
                      onClick={() => {
                        setSelectedRoute(route);
                        setIsModalOpen(true);
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">No routes found. Create your first delivery route!</td>
                </tr>
              )}
            </tbody>
          </table>
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

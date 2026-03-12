import React, { useEffect, useState } from 'react';
import { routeAPI } from '../services/api';
import RouteModal from '../components/RouteModal';
import './Table.css';

const RouteList = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await routeAPI.getRoutes();
      setRoutes(response.data);
    } catch (_) {
      setError('Failed to fetch routes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  if (loading) return <div className="loading">Loading routes...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="table-container fade-in">
      <div className="table-header">
        <h1>Delivery Routes</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create Route
        </button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Route Name</th>
              <th>Driver</th>
              <th>Customers</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.id}>
                <td>#{route.id}</td>
                <td className="font-bold">{route.name}</td>
                <td>{route.driver_name}</td>
                <td>
                  <span className="badge-blue">{route.customer_count} Customers</span>
                </td>
                <td className="muted">{new Date(route.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="text-btn">Details</button>
                </td>
              </tr>
            ))}
            {routes.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center">No routes found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RouteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRouteCreated={fetchRoutes}
      />
    </div>
  );
};

export default RouteList;

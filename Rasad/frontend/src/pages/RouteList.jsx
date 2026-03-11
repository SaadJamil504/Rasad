import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Table.css';

const RouteList = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get('core/routes/');
        setRoutes(response.data);
      } catch (_) {
        setError('Failed to fetch routes.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  if (loading) return <div>Loading routes...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Delivery Routes</h2>
        <button className="primary-btn">+ Create Route</button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Route Name</th>
              <th>Area</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.id}>
                <td>#{route.id}</td>
                <td className="font-bold">{route.name}</td>
                <td>{route.area || 'N/A'}</td>
                <td>{route.driver_name || 'Unassigned'}</td>
                <td>
                  <span className={`status-pill ${route.is_active ? 'active' : 'inactive'}`}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="text-btn">Manage</button>
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
    </div>
  );
};

export default RouteList;

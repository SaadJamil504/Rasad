import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Auth.css';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Signup = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'owner',
    dairy_name: '',
    house_no: '',
    street: '',
    area: '',
    city: 'Peshawar',
    address: '',
    latitude: 34.0151,
    longitude: 71.5249,
    cow_price: '',
    buffalo_price: ''
  });
  const [mapCenter, setMapCenter] = useState([34.0151, 71.5249]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleMarkerDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng();
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const geocodeAddress = useCallback(async (area, city, fullAddress) => {
    if (!area && !city && !fullAddress) return;
    try {
      let query = '';
      if (fullAddress) {
        query = `${fullAddress}, Peshawar, Pakistan`;
      } else {
        query = `${area ? area + ', ' : ''}${city || 'Peshawar'}, Pakistan`;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);
        setMapCenter([newLat, newLon]);
        setFormData(prev => ({ ...prev, latitude: newLat, longitude: newLon }));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    // Auto-Geocode trigger for Address
    if (name === 'address') {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => {
        geocodeAddress(null, null, updatedData.address);
      }, 1000);
      setSearchTimeout(timeout);
    }
  };

  // Map helper components
  const ChangeView = ({ center }) => {
    const map = useMap();
    map.setView(center, 15);
    return null;
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
      },
    });

    return (
      <Marker 
        position={[formData.latitude, formData.longitude]} 
        draggable={true}
        eventHandlers={{ dragend: handleMarkerDragEnd }}
      />
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Basic validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (!/^03\d{9}$/.test(formData.phone_number)) {
      setError('Phone number must be exactly 11 digits and start with 03 (e.g. 03001234567).');
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email.toLowerCase())) {
      setError('Only Gmail addresses are accepted.');
      setLoading(false);
      return;
    }
    if (!formData.dairy_name) {
      setError('Dairy Name is required.');
      setLoading(false);
      return;
    }
    if (!formData.cow_price || !formData.buffalo_price) {
      setError('Cow and Buffalo milk prices are required.');
      setLoading(false);
      return;
    }

    try {
      // Create a copy of the data and ensure prices are numbers
      const submissionData = {
        ...formData,
        cow_price: parseFloat(formData.cow_price),
        buffalo_price: parseFloat(formData.buffalo_price),
        latitude: parseFloat(formData.latitude.toFixed(16)),
        longitude: parseFloat(formData.longitude.toFixed(16))
      };
      
      await signup(submissionData);
      navigate('/');
    } catch (err) {
      if (err.response?.data) {
        // If it's an object of field errors (typical DRF), show them cleanly
        const errors = err.response.data;
        if (typeof errors === 'object') {
          const errorMsg = Object.entries(errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
            .join(' | ');
          setError(errorMsg);
        } else {
          setError(JSON.stringify(errors));
        }
      } else {
        setError('Sign up failed. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="signup-white-card">
        <div className="login-header-area">
          <h1 className="login-brand-title">Rasad</h1>
          <p className="login-brand-subtitle">Owner Registration</p>
        </div>
        
        {error && <div className="error-message-clean">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form-clean">
          <div className="form-group-clean">
            <label>FULL NAME</label>
            <input 
              name="full_name"
              type="text" 
              value={formData.full_name} 
              onChange={handleChange} 
              required 
              placeholder="John Doe"
            />
          </div>

          <div className="auth-grid-responsive">
            <div className="form-group-clean">
              <label>EMAIL</label>
              <input 
                name="email"
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group-clean">
              <label>PHONE</label>
              <input 
                name="phone_number"
                type="text" 
                value={formData.phone_number} 
                onChange={handleChange} 
                maxLength="11"
                required 
                placeholder="03001234567"
              />
            </div>
          </div>

          <div className="auth-grid-responsive">
            <div className="form-group-clean">
              <label>COW MILK PRICE (Rs)</label>
              <input 
                name="cow_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.cow_price} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 180"
              />
            </div>
            <div className="form-group-clean">
              <label>BUFFALO MILK PRICE (Rs)</label>
              <input 
                name="buffalo_price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.buffalo_price} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 210"
              />
            </div>
          </div>

          <div className="form-group-clean">
            <label>DAIRY NAME</label>
            <input 
              name="dairy_name"
              type="text" 
              value={formData.dairy_name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Ahmad Milk Dairy"
            />
          </div>

          <div className="form-group-clean">
            <label>ADDRESS</label>
            <input
              type="text"
              name="address"
              placeholder="Enter your dairy/full address"
              required
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group-clean" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              LOCATION 
              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                Drag marker to pinpoint exact location
              </span>
            </label>
            <div style={{ height: '250px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ChangeView center={mapCenter} />
                <LocationMarker />
              </MapContainer>
            </div>
          </div>

          <div className="form-group-clean">
            <label>PASSWORD</label>
            <input 
              name="password"
              type="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Creating Owner Account...' : 'Sign Up as Owner'}
          </button>
        </form>
        
        <div className="login-footer-clean">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;

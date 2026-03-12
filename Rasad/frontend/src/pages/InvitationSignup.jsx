import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const InvitationSignup = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    license_number: '',
    address: '',
    milk_type: 'cow',
    daily_quantity: '',
  });

  useEffect(() => {
    const validateToken = async () => {
      console.log('Validating token:', token);
      try {
        const response = await authAPI.validateToken(token);
        console.log('Validation success:', response.data);
        setInvitation(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Validation error:', err.response?.data || err.message);
        const errorMsg = err.response?.data?.error || 'Invalid or expired invitation link.';
        setError(errorMsg);
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation Logic
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (!/^\+?[\d\s-]{10,}$/.test(formData.phone_number)) {
      setError('Please enter a valid phone number (min 10 digits).');
      setLoading(false);
      return;
    }
    if (invitation.role === 'customer' && !formData.address) {
      setError('Permanent address is required for delivery.');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.invitationSignup({
        ...formData,
        token: token
      });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="auth-container"><div className="glass-card">Loading...</div></div>;
  if (error && !invitation) return (
    <div className="auth-container">
      <div className="glass-card">
        <h2 className="error-text">Link Error</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="glass-card fade-in">
        <div className="auth-header">
          <h1>Welcome to Rasad</h1>
          <p>Complete your registration as a <strong>{invitation.role}</strong></p>
          <p className="subtitle">Invited by: {invitation.owner_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. user@gmail.com"
              required
              className="glass-input"
              value={formData.email}
              onChange={handleChange}
            />
            <p className="field-hint">Only Gmail addresses are supported.</p>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="full_name"
              placeholder="Your Full Name"
              required
              className="glass-input"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              required
              className="glass-input"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Your Password"
              required
              className="glass-input"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone_number"
              placeholder="e.g. +923001234567"
              required
              className="glass-input"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Permanent Address</label>
            <textarea
              name="address"
              placeholder="House #, Street, Area for daily delivery"
              required={invitation.role === 'customer'}
              className="glass-input"
              rows="3"
              style={{ minHeight: '80px', resize: 'vertical', padding: '12px' }}
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          {invitation.role === 'customer' && (
            <>
              <div className="form-group">
                <label>Milk Type</label>
                <select 
                  name="milk_type" 
                  className="glass-input" 
                  value={formData.milk_type} 
                  onChange={handleChange}
                  required
                >
                  <option value="cow">Cow Milk</option>
                  <option value="buffalo">Buffalo Milk</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="form-group">
                <label>Daily Quantity (Liters)</label>
                <input
                  type="number"
                  step="0.5"
                  name="daily_quantity"
                  placeholder="e.g. 2.0"
                  required
                  className="glass-input"
                  value={formData.daily_quantity}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {invitation.role === 'driver' && (
            <div className="form-group">
              <label>License Number</label>
              <input
                type="text"
                name="license_number"
                placeholder="Your Driving License Number"
                required
                className="glass-input"
                value={formData.license_number}
                onChange={handleChange}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InvitationSignup;

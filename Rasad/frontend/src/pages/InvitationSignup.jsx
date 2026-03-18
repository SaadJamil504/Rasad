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
    const { name, value } = e.target;
    
    // Validation for full_name: only alphabets and spaces allowed
    if (name === 'full_name') {
      const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
      return;
    }
    
    // Validation for license_number: only alphanumeric characters allowed (no special characters)
    if (name === 'license_number') {
      const filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
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
    if (invitation.role === 'customer' && !formData.address) {
      setError('Permanent address is required for delivery.');
      setLoading(false);
      return;
    }
    if (invitation.role === 'customer' && (!formData.daily_quantity || parseFloat(formData.daily_quantity) <= 0)) {
      setError('Daily quantity must be greater than 0.');
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
      if (err.response?.data) {
        // If the server returns a dictionary of errors, format it nicely
        const errorData = err.response.data;
        const messages = Object.keys(errorData).map(key => {
          const detail = errorData[key];
          return `${key.replace('_', ' ').toUpperCase()}: ${Array.isArray(detail) ? detail.join(', ') : detail}`;
        });
        setError(messages.join(' | '));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="login-page-bg"><div className="login-white-card">Loading...</div></div>;
  if (error && !invitation) return (
    <div className="login-page-bg">
      <div className="login-white-card">
        <h2 className="error-text">Link Error</h2>
        <p>{error}</p>
        <button className="login-submit-btn" onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="login-page-bg">
      <div className="signup-white-card">
        <div className="login-header-area">
          <h1 className="login-brand-title">Rasad</h1>
          <p className="login-brand-subtitle">Registration as {invitation.role}</p>
          <p className="field-hint-clean">Invited by: {invitation.owner_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-clean">
          <div className="form-group-clean">
            <label>FULL NAME</label>
            <input
              type="text"
              name="full_name"
              placeholder="Your Full Name"
              required
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group-clean">
            <label>EMAIL</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. user@gmail.com"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <p className="field-hint-clean">Only Gmail addresses are supported.</p>

          <div className="auth-grid-responsive">
            <div className="form-group-clean">
              <label>PHONE</label>
              <input
                type="text"
                name="phone_number"
                placeholder="03001234567"
                maxLength="11"
                required
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>
            <div className="form-group-clean">
              {invitation.role === 'driver' ? (
                <>
                  <label>LICENSE</label>
                  <input
                    type="text"
                    name="license_number"
                    placeholder="License Number"
                    required
                    value={formData.license_number}
                    onChange={handleChange}
                  />
                </>
              ) : (
                <>
                  <label>MILK TYPE</label>
                  <select 
                    name="milk_type" 
                    className="form-group-clean input" 
                    value={formData.milk_type} 
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.95rem' }}
                  >
                    <option value="cow">Cow Milk</option>
                    <option value="buffalo">Buffalo Milk</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="form-group-clean">
            <label>ADDRESS</label>
            <input
              name="address"
              placeholder="House #, Street, Area"
              required={invitation.role === 'customer'}
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="auth-grid-responsive">
            <div className="form-group-clean">
              <label>PASSWORD</label>
              <input
                type="password"
                name="password"
                placeholder="Your Password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            {invitation.role === 'customer' && (
              <div className="form-group-clean">
                <label>QTY (LITERS)</label>
                <input
                  type="number"
                  step="0.5"
                  name="daily_quantity"
                  placeholder="e.g. 2.0"
                  required
                  value={formData.daily_quantity}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {error && <div className="error-message-clean">{error}</div>}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InvitationSignup;

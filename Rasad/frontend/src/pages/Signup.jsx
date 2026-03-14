import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'owner',
    dairy_name: '',
    address: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    if (!formData.dairy_name) {
      setError('Dairy Name is required.');
      setLoading(false);
      return;
    }

    try {
      await signup(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="signup-white-card">
        <div className="login-header-area">
          <div className="login-icon">🥛</div>
          <h1 className="login-brand-title">Rasad</h1>
          <p className="login-brand-subtitle">Owner Registration</p>
        </div>
        
        {error && <div className="error-message-clean">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form-clean">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group-clean">
              <label>USERNAME</label>
              <input 
                name="username"
                type="text" 
                value={formData.username} 
                onChange={handleChange} 
                required 
                placeholder="johndoe"
              />
            </div>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                required 
                placeholder="+92..."
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
              name="address"
              type="text"
              value={formData.address} 
              onChange={handleChange} 
              placeholder="Your dairy path or office address"
            />
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

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'owner',
    dairy_name: '',
    address: '',
    cow_price: '',
    buffalo_price: ''
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
        buffalo_price: parseFloat(formData.buffalo_price)
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
          <div className="login-icon">🥛</div>
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
                maxLength="11"
                required 
                placeholder="03001234567"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group-clean">
              <label>COW MILK PRICE (Rs)</label>
              <input 
                name="cow_price"
                type="number" 
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

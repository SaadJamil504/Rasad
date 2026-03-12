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
    <div className="auth-container">
      <div className="auth-card">
        <h2>Owner Registration</h2>
        <p className="auth-subtitle">Create an account to manage your delivery network</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              name="username"
              type="text" 
              value={formData.username} 
              onChange={handleChange} 
              required 
              placeholder="johndoe"
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              name="full_name"
              type="text" 
              value={formData.full_name} 
              onChange={handleChange} 
              required 
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              name="email"
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              name="phone_number"
              type="text" 
              value={formData.phone_number} 
              onChange={handleChange} 
              required 
              placeholder="+1234567890"
            />
          </div>
          <div className="form-group">
            <label>Dairy Name</label>
            <input 
              name="dairy_name"
              type="text" 
              value={formData.dairy_name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Ahmad Milk Dairy"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea 
              name="address"
              value={formData.address} 
              onChange={handleChange} 
              placeholder="Your dairy path or office address"
              rows="2"
              className="glass-input"
              style={{ padding: '0.8rem', width: '100%', borderRadius: '12px' }}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              name="password"
              type="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Owner Account...' : 'Sign Up as Owner'}
          </button>
        </form>
        
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;

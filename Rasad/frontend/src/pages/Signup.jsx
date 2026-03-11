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
    role: 'owner'
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
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Rasad Milk Delivery System</p>
        
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
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="owner">Owner</option>
              <option value="driver">Driver</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
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

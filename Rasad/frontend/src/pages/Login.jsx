import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="login-white-card">
        <div className="login-header-area">
          <div className="login-icon">🥛</div>
          <h1 className="login-brand-title">Rasad</h1>
          <p className="login-brand-subtitle">Milk Delivery Management</p>
        </div>
        
        {error && <div className="error-message-clean">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form-clean">
          <div className="form-group-clean">
            <label>USERNAME</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group-clean">
            <label>PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="........"
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-footer-clean">
          Are you a new Owner? <Link to="/signup">Register as a New Owner</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;

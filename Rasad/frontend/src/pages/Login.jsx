import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
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
      await login(phoneNumber, password);
      navigate('/');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        setError(data.detail || data.non_field_errors?.[0] || 'Invalid credentials or server error.');
      } else {
        setError('Login failed. Please check your connection or try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setLoading(true);
    setError(null);
    
    // Set field values for visual feedback
    const bypassPhone = '03010779759';
    const bypassPass = 'saad1234';
    setPhoneNumber(bypassPhone);
    setPassword(bypassPass);

    try {
      await login(bypassPhone, bypassPass);
      navigate('/');
    } catch (err) {
      console.error('Bypass login failed:', err);
      if (err.response?.data) {
        const data = err.response.data;
        setError(data.detail || data.non_field_errors?.[0] || 'Bypass login failed: Account likely missing on new server.');
      } else {
        setError('Bypass login failed. Server may be down.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="login-white-card">
        <div className="login-header-area">
          <h1 className="login-brand-title">Rasad</h1>
          <p className="login-brand-subtitle">Milk Delivery Management</p>
        </div>
        
        {error && <div className="error-message-clean">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form-clean">
          <div className="form-group-clean">
            <label>PHONE NUMBER</label>
            <input 
              type="text" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              required 
              placeholder="e.g. 03001234567"
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
          
          <div className="login-divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="bypass-login-btn" 
            onClick={handleBypassLogin} 
            disabled={loading}
          >
            {loading ? 'Bypassing...' : 'Bypass Login'}
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

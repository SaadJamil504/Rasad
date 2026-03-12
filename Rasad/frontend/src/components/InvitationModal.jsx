import React, { useState } from 'react';
import { invitationAPI } from '../services/api';
import './InvitationModal.css';

const InvitationModal = ({ isOpen, onClose, role, onInviteSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await invitationAPI.invite({ email, role });
      setSuccess(`Invitation sent to ${email} successfully!`);
      setEmail('');
      if (onInviteSuccess) onInviteSuccess();
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 3000);
    } catch (err) {
      const serverError = err.response?.data?.error || err.response?.data?.message || 'Failed to send invitation. Please try again.';
      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>Invite New {role === 'driver' ? 'Driver' : 'Customer'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p>Send an invitation link to the {role}'s email address.</p>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. driver@example.com"
              required
              className="glass-input"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvitationModal;

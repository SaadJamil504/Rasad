import React, { useState } from 'react';
import { invitationAPI } from '../services/api';
import './InvitationModal.css';

const InvitationModal = ({ isOpen, onClose, role, onInviteSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await invitationAPI.invite({ email, role });
      setSuccess(`Invitation created successfully!`);
      setGeneratedLink(response.data.signup_url);
      setEmail('');
      if (onInviteSuccess) onInviteSuccess();
    } catch (err) {
      const serverError = err.response?.data?.error || err.response?.data?.message || 'Failed to create invitation. Please try again.';
      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  const shareOnWhatsApp = () => {
    const text = `Hello! You've been invited to join Rasad as a ${role}. Join using this link: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>Invite New {role === 'driver' ? 'Driver' : 'Customer'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        {!generatedLink ? (
          <form onSubmit={handleSubmit} className="modal-body">
            <p>Enter the {role}'s email to generate a secure invitation link.</p>
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
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Generate Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-body">
            <div className="success-message">{success}</div>
            <p className="link-label">Invitation Link:</p>
            <div className="link-display glass">
              <code>{generatedLink}</code>
            </div>
            <div className="share-actions">
              <button onClick={copyToClipboard} className="btn-secondary">
                Copy Link
              </button>
              <button onClick={shareOnWhatsApp} className="btn-whatsapp">
                Share on WhatsApp
              </button>
            </div>
            <div className="modal-footer">
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationModal;

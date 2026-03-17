import React, { useState } from 'react';
import { invitationAPI } from '../services/api';
import './InvitationModal.css';

const InvitationModal = ({ isOpen, onClose, role, onInviteSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setGeneratedLink('');
      setError('');
      setSuccess('');
      setEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = { role };
      if (email.trim()) payload.email = email.trim();
      
      const response = await invitationAPI.invite(payload);
      setGeneratedLink(response.data.signup_url);
      setSuccess(`Invitation link generated successfully!`);
      setEmail('');
      if (onInviteSuccess) onInviteSuccess();
    } catch (err) {
      console.error('Invitation creation failed:', err);
      let serverError = 'Failed to create invitation.';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          // Flatten nested error messages
          serverError = Object.values(err.response.data).flat().join(' ') || serverError;
        } else if (typeof err.response.data === 'string') {
          serverError = err.response.data;
        }
      } else if (err.message) {
        serverError = err.message;
      }
      
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
            <p>Generate a secure invitation link for a new {role}.</p>
            {error && <div className="error-message">{error}</div>}
            <div className="modal-footer" style={{ gap: '1rem' }}>
              <button type="button" onClick={onClose} className="btn-s" disabled={loading} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" className="btn-p" disabled={loading} style={{ flex: 1 }}>
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
            <div className="share-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={copyToClipboard} className="btn-s" style={{ flex: 1, height: '48px' }}>
                Copy Link
              </button>
              <button onClick={shareOnWhatsApp} className="btn-whatsapp" style={{ flex: 1, height: '48px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                WhatsApp
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

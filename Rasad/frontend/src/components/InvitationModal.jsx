import React, { useState } from 'react';
import { invitationAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './InvitationModal.css';

const InvitationModal = ({ isOpen, onClose, role, onInviteSuccess }) => {
  const { t, ts } = useLanguage();
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
      setSuccess(ts('Invitation link generated successfully!', 'دعوت نامہ لنک تیار کر لیا گیا ہے!'));
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
    alert(ts('Link copied to clipboard!', 'لنک کاپی کر لیا گیا ہے!'));
  };

  const shareOnWhatsApp = () => {
    const text = `Hello! You've been invited to join Rasad as a ${role}. Join using this link: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>{t(`Invite New ${role === 'driver' ? 'Driver' : 'Customer'}`, `نیا ${role === 'driver' ? 'ڈرائیور' : 'گاہک'} مدعو کریں`)}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        {!generatedLink ? (
          <form onSubmit={handleSubmit} className="modal-body">
            <p>{t(`Generate a secure invitation link for a new ${role}.`, `نئے ${role === 'driver' ? 'ڈرائیور' : 'گاہک'} کے لیے محفوظ لنک تیار کریں۔`)}</p>
            {error && <div className="error-message">{error}</div>}
            <div className="modal-footer" style={{ gap: '1rem' }}>
              <button type="button" onClick={onClose} className="btn-s" disabled={loading} style={{ flex: 1 }}>
                {t('Cancel', 'کینسل')}
              </button>
              <button type="submit" className="btn-p" disabled={loading} style={{ flex: 1 }}>
                {loading ? t('Creating...', 'تیار ہو رہا ہے...') : t('Generate Link', 'لنک بنائیں')}
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-body">
            <div className="success-message">{success}</div>
            <p className="link-label">{t('Invitation Link:', 'دعوت نامہ لنک:')}</p>
            <div className="link-display glass">
              <code>{generatedLink}</code>
            </div>
            <div className="share-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={copyToClipboard} className="btn-s" style={{ flex: 1, height: '48px' }}>
                {t('Copy Link', 'لنک کاپی کریں')}
              </button>
              <button onClick={shareOnWhatsApp} className="btn-whatsapp" style={{ flex: 1, height: '48px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                WhatsApp
              </button>
            </div>
            <div className="modal-footer">
              <button onClick={onClose} className="btn-primary">{t('Done', 'مکمل')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationModal;

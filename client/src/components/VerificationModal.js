import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, CheckCircle, XCircle, Clock } from 'lucide-react';

const VerificationModal = ({ verificationData, onComplete, onCancel, verificationStatus, onSimulate }) => {
  const [status, setStatus] = useState('pending');

  // Update status based on parent component polling
  useEffect(() => {
    if (verificationStatus.includes('completed successfully')) {
      setStatus('verified');
    } else if (verificationStatus.includes('failed') || verificationStatus.includes('expired')) {
      setStatus('failed');
    } else {
      setStatus('pending');
    }
  }, [verificationStatus]);

  // Extract Face Check score from status message if present
  const extractFaceCheckScore = () => {
    // Try multiple patterns to find the score
    const patterns = [
      /Face Check Score:\s*(\d+)%/i,
      /📸.*?(\d+)%/,
      /confidence\s+score[:\s]+(\d+)/i,
      /score[:\s]+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = verificationStatus.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  // Get display message without Face Check score section
  const getDisplayMessage = () => {
    return verificationStatus
      .replace(/\n\n📸 Face Check Score:.*?\n\(Required:.*?\)/s, '')
      .replace(/\s*\|\s*Face Check Score: \d+%/, '');
  };

  const faceCheckScore = extractFaceCheckScore();

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="status-icon success" size={48} />;
      case 'failed':
        return <XCircle className="status-icon error" size={48} />;
      default:
        return <Clock className="status-icon pending" size={48} />;
    }
  };

  const isLocalMode = verificationData?.localFallback || verificationData?.pollingMode;

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal">
        <h3>🔐 CFO Approval Required</h3>
        
        {isLocalMode && (
          <div className="local-mode-banner">
            <p>🏠 <strong>Local Mode:</strong> No ngrok required! Polling for status updates.</p>
          </div>
        )}
        
        <div className="verification-content">
          <div className="qr-section">
            <div className="qr-code-container">
              <img src={verificationData.qrCode} alt="QR Code" className="qr-code" />
            </div>
            
            <div className="instructions">
              <div className="instruction-item">
                <Smartphone size={24} />
                <span>Open Microsoft Authenticator app</span>
              </div>
              <div className="instruction-item">
                <QrCode size={24} />
                <span>Scan this QR code</span>
              </div>
              <div className="instruction-item">
                <CheckCircle size={24} />
                <span>Present your CFO credentials</span>
              </div>
            </div>
            
            {isLocalMode && (
              <div className="local-testing">
                <p><strong>For Testing:</strong></p>
                <button 
                  onClick={onSimulate} 
                  className="btn-simulate"
                  disabled={status === 'verified'}
                >
                  🎭 Simulate CFO Approval
                </button>
                <p className="simulate-note">Click to simulate verification without QR scan</p>
              </div>
            )}
          </div>

          <div className="status-section">
            {getStatusIcon()}
            <p className="status-message">{getDisplayMessage() || 'Initializing verification...'}</p>
            
            {status === 'failed' && faceCheckScore !== null && (
              <div className="face-check-score">
                <p className="score-label">📸 Face Check Match Score</p>
                <p className="score-value">{faceCheckScore}%</p>
                <p className="score-threshold">Required: 70% or higher</p>
              </div>
            )}
          </div>
        </div>

        <div className="verification-actions">
          {status === 'failed' && (
            <button onClick={onCancel} className="btn-cancel">
              🔄 Try Again
            </button>
          )}
          <button onClick={onCancel} className="btn-cancel">
            ❌ Cancel Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;

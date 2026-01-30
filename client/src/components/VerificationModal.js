import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, CheckCircle, XCircle, Clock, ShieldCheck, AlertTriangle, DollarSign } from 'lucide-react';

const VerificationModal = ({ verificationData, onComplete, onCancel, verificationStatus, onSimulate, transactionDetails, entities }) => {
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

  // Check if this is a detailed failure report
  const isDetailedReport = verificationStatus.includes('━━━━━') || verificationStatus.includes('TRANSACTION DETAILS');

  // Get display message - for detailed reports, show full message
  const getDisplayMessage = () => {
    if (isDetailedReport) {
      return verificationStatus;
    }
    return verificationStatus
      .replace(/\n\n📸 Face Check Score:.*?\n\(Required:.*?\)/s, '')
      .replace(/\s*\|\s*Face Check Score: \d+%/, '');
  };

  const faceCheckScore = extractFaceCheckScore();

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="status-icon success" size={36} />;
      case 'failed':
        return <XCircle className="status-icon error" size={36} />;
      default:
        return <Clock className="status-icon pending" size={36} />;
    }
  };

  const isLocalMode = verificationData?.localFallback || verificationData?.pollingMode;

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal">
        <h3>
          <ShieldCheck size={22} />
          CFO Approval Required
        </h3>
        
        {/* Transaction Info Banner */}
        {transactionDetails && (
          <div className="approval-reason-banner">
            <div className="approval-reason-header">
              <AlertTriangle size={16} />
              <span>High-Value Transaction Detected</span>
            </div>
            <div className="approval-reason-details">
              <div className="approval-amount">
                <DollarSign size={16} />
                <span className="amount-value">${transactionDetails.amount?.toLocaleString()}</span>
              </div>
              <p className="approval-explanation">
                Transactions exceeding <strong>$50,000</strong> require CFO approval with identity verification 
                to ensure proper authorization and compliance with financial controls.
              </p>
              <div className="transaction-summary">
                <span><strong>From:</strong> {entities?.find(e => e.id === transactionDetails.fromEntity)?.name || transactionDetails.fromEntity}</span>
                <span><strong>To:</strong> {entities?.find(e => e.id === transactionDetails.toEntity)?.name || transactionDetails.toEntity}</span>
                {transactionDetails.description && <span><strong>Purpose:</strong> {transactionDetails.description}</span>}
              </div>
            </div>
          </div>
        )}

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
                <span className="step-number">1</span>
                <Smartphone size={16} />
                <span>Open Microsoft Authenticator</span>
              </div>
              <div className="instruction-item">
                <span className="step-number">2</span>
                <QrCode size={16} />
                <span>Scan this QR code</span>
              </div>
              <div className="instruction-item">
                <span className="step-number">3</span>
                <CheckCircle size={16} />
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
            {isDetailedReport ? (
              <pre className="status-message detailed-report">{getDisplayMessage()}</pre>
            ) : (
              <p className="status-message">{getDisplayMessage() || 'Initializing verification...'}</p>
            )}
            
            {status === 'failed' && faceCheckScore !== null && !isDetailedReport && (
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

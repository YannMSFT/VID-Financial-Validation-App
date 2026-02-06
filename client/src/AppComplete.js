import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDemoConfig } from './DemoConfigContext';
import EntityList from './components/EntityList';
import TransactionForm from './components/TransactionForm';
import VerificationModal from './components/VerificationModal';
import TransactionHistory from './components/TransactionHistory';
import './App.css';

function App() {
  const { config } = useDemoConfig();
  const [entities, setEntities] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [successMessage, setSuccessMessage] = useState(''); // Success message - updated
  const [pollingInterval, setPollingInterval] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');

  useEffect(() => {
    fetchEntities();
    fetchTransactions();
  }, []);

  // Auto-hide success message after 30 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchEntities = async () => {
    try {
      const response = await axios.get('/api/entities');
      setEntities(response.data);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/api/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleNewTransaction = () => {
    setShowTransactionForm(true);
  };

  const handleTransactionSubmit = async (transactionData) => {
    // For high-value transactions, require approval
    if (transactionData.amount > config.company.approvalThreshold) {
      setPendingTransaction(transactionData);
      localStorage.setItem('pendingTransaction', JSON.stringify(transactionData));
      await initiateVerification(transactionData);
    } else {
      await processTransaction(transactionData);
    }
  };

  const initiateVerification = async (transactionData) => {
    try {
      const response = await axios.post('/api/verify', {
        transactionDetails: transactionData
      });
      
      setVerificationData(response.data);
      setShowVerification(true);
      setShowTransactionForm(false);
      setVerificationStatus('Waiting for verification...');
      
      // Start polling for verification status (no more dependency on ngrok!)
      startPollingForVerification(response.data.requestId);
      
    } catch (error) {
      console.error('Error initiating verification:', error);
      alert('Failed to initiate CFO verification');
    }
  };

  const startPollingForVerification = (requestId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/verification-status/${requestId}`);
        const { status, verifiedClaims, isLocalMode, faceCheck, error } = response.data;
        
        // Update status message for user
        switch (status) {
          case 'request_retrieved':
            setVerificationStatus(isLocalMode ? 
              'Local mode: Waiting for simulation or scan QR code...' : 
              'Scan the QR code with Microsoft Authenticator...'
            );
            break;
          case 'presentation_verified':
            // Try to get pending transaction from state first, then localStorage
            let transactionToProcess = pendingTransaction;
            if (!transactionToProcess) {
              const stored = localStorage.getItem('pendingTransaction');
              if (stored) {
                transactionToProcess = JSON.parse(stored);
              }
            }
            
            setVerificationStatus('✅ Verification completed successfully!');
            clearInterval(interval);
            setPollingInterval(null);
            
            // Process transaction immediately and close modal
            if (transactionToProcess) {
              const transactionCopy = { ...transactionToProcess };
              localStorage.removeItem('pendingTransaction');
              setShowVerification(false);
              processTransaction(transactionCopy, requestId, verifiedClaims, faceCheck);
            } else {
              console.error('No pending transaction to process');
              setShowVerification(false);
            }
            break;
          case 'failed':
          case 'expired':
            // Build a user-friendly error message
            let failureMessage = '❌ Verification Failed';
            
            // Try to extract Face Check score from multiple sources
            let scoreFromError = null;
            if (error) {
              const errorMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
              const patterns = [
                /confidence\s+score[:\s]+(\d+)/i,
                /score[:\s]+(\d+)/i,
                /match.*?(\d+)%/i,
                /(\d+)%.*?confidence/i,
                /threshold.*?(\d+)/i,
                /(\d+)\s*%/,
                /score\s*[=:]\s*(\d+)/i
              ];
              
              for (const pattern of patterns) {
                const match = errorMsg.match(pattern);
                if (match) {
                  scoreFromError = parseInt(match[1]);
                  break;
                }
              }
            }
            
            // Add Face Check score if available
            const displayScore = faceCheck?.matchConfidenceScore ?? scoreFromError;
            
            if (displayScore !== null && displayScore !== undefined) {
              failureMessage += `\n\n📸 Face Check Score: ${displayScore}%\n(Required: 70% or higher)`;
            }
            
            // Add generic user-friendly error message
            if (error) {
              failureMessage += `\n\nDetails: Verification did not pass`;
            }
            
            setVerificationStatus(failureMessage);
            clearInterval(interval);
            setPollingInterval(null);
            break;
        }
        
      } catch (error) {
        console.error('Error polling verification status:', error);
        setVerificationStatus('Error checking verification status');
      }
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
    
    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
      setVerificationStatus('⏱️ Verification timeout - please try again');
    }, 10 * 60 * 1000);
  };

  // Clean up polling when component unmounts or verification closes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Simulate verification for local testing
  const simulateVerification = async () => {
    if (verificationData && verificationData.requestId) {
      try {
        await axios.post(`/api/simulate-verification/${verificationData.requestId}`);
      } catch (error) {
        console.error('Error simulating verification:', error);
      }
    }
  };

  const processTransaction = async (transactionData, verificationId = null, verifiedClaims = null, faceCheck = null) => {
    try {
      const response = await axios.post('/api/transactions', {
        ...transactionData,
        verificationId,
        verifiedClaims,
        faceCheck
      });
      
      // Show embedded success message with transaction details
      const fromEntity = entities.find(e => e.id === transactionData.fromEntity);
      const toEntity = entities.find(e => e.id === transactionData.toEntity);
      
      // Build structured transaction summary
      const validatorName = verifiedClaims && (verifiedClaims.firstName || verifiedClaims.lastName)
        ? `${verifiedClaims.firstName || ''} ${verifiedClaims.lastName || ''}`.trim()
        : null;
      
      const successData = {
        amount: transactionData.amount,
        from: fromEntity?.name || transactionData.fromEntity,
        to: toEntity?.name || transactionData.toEntity,
        category: transactionData.category,
        description: transactionData.description,
        approver: validatorName,
        faceCheckScore: faceCheck?.matchConfidenceScore
      };
      
      setSuccessMessage(successData);
      
      // Clean up states AFTER setting success message
      setPendingTransaction(null);
      setVerificationData(null);
      
      // Refresh data to show the new transaction in history
      await fetchTransactions();
      await fetchEntities();
    } catch (error) {
      console.error('Error processing transaction:', error);
      
      setSuccessMessage(`ERROR: ${error.message}\nResponse: ${error.response?.data?.error || 'Unknown error'}`);
      
      if (error.response?.data?.requiresVerification) {
        alert('CFO approval required for this transaction amount');
      } else {
        alert('Failed to process transaction: ' + error.message);
      }
    }
  };

  const handleVerificationComplete = (verificationId) => {
    if (pendingTransaction) {
      processTransaction(pendingTransaction, verificationId);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          {config.company.logo && (
            <img src={config.company.logo} alt={config.company.name} className="company-logo" />
          )}
          <div>
            <h1>{config.company.portalName}</h1>
            <p>{config.company.portalDescription}</p>
          </div>
        </div>
        <div className="action-bar">
          <button 
            className="btn-primary" 
            onClick={handleNewTransaction}
          >
            + New Transaction
          </button>
        </div>
      </header>

      <div className="warning-banner">
        <span className="warning-icon">⚠️</span>
        <span className="warning-text">
          <strong>RESTRICTED ACCESS:</strong> This is a sensitive application restricted to authorized personnel only. 
          Unauthorized access or misuse may result in disciplinary action and legal consequences.
        </span>
      </div>

      <main className="main-content">
        <div className="finance-section">
          <EntityList entities={entities} />
          
          {showTransactionForm && !successMessage && (
            <TransactionForm
              entities={entities}
              onSubmit={handleTransactionSubmit}
              onCancel={() => setShowTransactionForm(false)}
            />
          )}
          
          {successMessage && (
            <div className="transaction-success">
              <div className="success-content">
                <div className="success-icon">✅</div>
                <h3>Transaction Approved</h3>
                
                <div className="highlight-section">
                  <div className="highlight-card amount-card">
                    <span className="highlight-label">Amount</span>
                    <span className="highlight-value amount-value">${successMessage.amount?.toLocaleString()}</span>
                  </div>
                  
                  {successMessage.approver && (
                    <div className="highlight-card approver-card">
                      <span className="highlight-label">Approved By</span>
                      <span className="highlight-value approver-value">{successMessage.approver}</span>
                    </div>
                  )}
                  
                  {successMessage.faceCheckScore !== undefined && (
                    <div className="highlight-card score-card">
                      <span className="highlight-label">Face Check Score</span>
                      <span className="highlight-value score-value">{Math.round(successMessage.faceCheckScore)}%</span>
                    </div>
                  )}
                </div>
                
                <div className="transaction-details">
                  <div className="detail-line"><span className="detail-label">From:</span> {successMessage.from}</div>
                  <div className="detail-line"><span className="detail-label">To:</span> {successMessage.to}</div>
                  <div className="detail-line"><span className="detail-label">Category:</span> {successMessage.category}</div>
                  <div className="detail-line"><span className="detail-label">Description:</span> {successMessage.description}</div>
                </div>
                
                <button 
                  className="btn-close-success" 
                  onClick={() => {
                    setSuccessMessage('');
                    setShowTransactionForm(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="transactions-section">
          <TransactionHistory transactions={transactions} />
        </div>
      </main>

      {showVerification && verificationData && (
        <VerificationModal
          verificationData={verificationData}
          onComplete={handleVerificationComplete}
          onCancel={() => {
            setShowVerification(false);
            setVerificationData(null);
            setPendingTransaction(null);
            setVerificationStatus('');
            localStorage.removeItem('pendingTransaction');
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          }}
          verificationStatus={verificationStatus}
          onSimulate={simulateVerification}
        />
      )}
    </div>
  );
}

export default App;

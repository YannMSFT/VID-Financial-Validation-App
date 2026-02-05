import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EntityList from './components/EntityList';
import TransactionForm from './components/TransactionForm';
import VerificationModal from './components/VerificationModal';
import TransactionHistory from './components/TransactionHistory';
import { getCompanyLogo } from './components/CompanyLogos';
import './App.css';

function App() {
  const [entities, setEntities] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
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

  // Clean up polling when component unmounts or verification closes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

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
    // For high-value transactions (>$50,000), require CFO approval
    if (transactionData.amount > 50000) {
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
        
        switch (status) {
          case 'request_retrieved':
            setVerificationStatus(isLocalMode ? 
              'Local mode: Waiting for simulation or scan QR code...' : 
              'Scan the QR code with Microsoft Authenticator...'
            );
            break;
          case 'presentation_verified':
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
            
            if (transactionToProcess) {
              const transactionCopy = { ...transactionToProcess };
              localStorage.removeItem('pendingTransaction');
              setShowVerification(false);
              processTransaction(transactionCopy, requestId, verifiedClaims, faceCheck);
            } else {
              setShowVerification(false);
            }
            break;
          case 'failed':
          case 'expired':
            const txDetails = response.data.transactionDetails || pendingTransaction;
            const fromEntityName = entities.find(e => e.id === txDetails?.fromEntity)?.name || txDetails?.fromEntity || 'Unknown';
            const toEntityName = entities.find(e => e.id === txDetails?.toEntity)?.name || txDetails?.toEntity || 'Unknown';
            const txAmount = txDetails?.amount ? `$${txDetails.amount.toLocaleString()}` : 'Unknown amount';
            
            let failureMessage = '❌ CFO Approval Verification Failed\n';
            failureMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            
            failureMessage += '📋 TRANSACTION DETAILS\n';
            failureMessage += `   • From: ${fromEntityName}\n`;
            failureMessage += `   • To: ${toEntityName}\n`;
            failureMessage += `   • Amount: ${txAmount}\n`;
            if (txDetails?.description) {
              failureMessage += `   • Description: ${txDetails.description}\n`;
            }
            if (txDetails?.category) {
              failureMessage += `   • Category: ${txDetails.category}\n`;
            }
            failureMessage += '\n';
            
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
            
            const displayScore = faceCheck?.matchConfidenceScore ?? scoreFromError;
            const requiredScore = 70;
            
            failureMessage += '📸 FACE CHECK RESULTS\n';
            if (displayScore !== null && displayScore !== undefined) {
              const scoreDiff = requiredScore - displayScore;
              const scoreBar = displayScore >= requiredScore ? '✅' : '❌';
              failureMessage += `   ${scoreBar} Confidence Score: ${displayScore}%\n`;
              failureMessage += `   • Required Threshold: ${requiredScore}%\n`;
              if (displayScore < requiredScore) {
                failureMessage += `   • Shortfall: ${scoreDiff}% below threshold\n`;
              }
              if (faceCheck?.sourcePhotoQuality) {
                failureMessage += `   • Photo Quality: ${faceCheck.sourcePhotoQuality}\n`;
              }
            } else {
              failureMessage += '   • Face verification was not completed\n';
            }
            failureMessage += '\n';
            
            failureMessage += '🔍 FAILURE REASON\n';
            if (status === 'expired') {
              failureMessage += '   The verification request has expired.\n';
              failureMessage += '   • Verification requests are valid for 10 minutes\n';
              failureMessage += '   • The QR code was not scanned in time\n';
            } else if (displayScore !== null && displayScore < requiredScore) {
              failureMessage += '   Face verification did not meet the confidence threshold.\n';
              failureMessage += '   \n';
              failureMessage += '   Possible causes:\n';
              failureMessage += '   • The person presenting the credential may not match\n';
              failureMessage += '     the photo on the Verified ID\n';
              failureMessage += '   • Poor lighting conditions during face capture\n';
              failureMessage += '   • Camera angle or distance was not optimal\n';
              failureMessage += '   • Glasses, masks, or other obstructions\n';
            } else if (error) {
              const errorStr = typeof error === 'string' ? error : (error.message || error.code || 'Unknown error');
              failureMessage += `   ${errorStr}\n`;
            } else {
              failureMessage += '   The verification process could not be completed.\n';
            }
            failureMessage += '\n';
            
            failureMessage += '📌 RECOMMENDED ACTIONS\n';
            failureMessage += '   1. Ensure proper lighting and camera positioning\n';
            failureMessage += '   2. Remove glasses or face coverings if possible\n';
            failureMessage += '   3. Verify the correct CFO credential is being used\n';
            failureMessage += '   4. Try the verification process again\n';
            failureMessage += '   5. Contact IT support if the issue persists\n';
            
            setVerificationStatus(failureMessage);
            clearInterval(interval);
            setPollingInterval(null);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Error polling verification status:', error);
        setVerificationStatus('Error checking verification status');
      }
    }, 3000);
    
    setPollingInterval(interval);
    
    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
      setVerificationStatus('⏱️ Verification timeout - please try again');
    }, 10 * 60 * 1000);
  };

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
      
      const fromEntity = entities.find(e => e.id === transactionData.fromEntity);
      const toEntity = entities.find(e => e.id === transactionData.toEntity);
      
      let transactionSummary = [
        "Transaction completed successfully!",
        "",
        `Amount: $${transactionData.amount.toLocaleString()}`,
        `From: ${fromEntity?.name || transactionData.fromEntity}`,
        `To: ${toEntity?.name || transactionData.toEntity}`,
        `Category: ${transactionData.category}`,
        `Description: ${transactionData.description}`
      ];
      
      if (verifiedClaims && (verifiedClaims.firstName || verifiedClaims.lastName)) {
        const validatorName = `${verifiedClaims.firstName || ''} ${verifiedClaims.lastName || ''}`.trim();
        transactionSummary.push('', `✅ Approved by: ${validatorName}`);
        
        if (faceCheck && faceCheck.matchConfidenceScore !== undefined) {
          transactionSummary.push(`📸 Face Check Score: ${faceCheck.matchConfidenceScore}%`);
        }
      }
      
      setSuccessMessage(transactionSummary.join('\n'));
      
      setPendingTransaction(null);
      setVerificationData(null);
      
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
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">{getCompanyLogo('CONTOSO-HQ')}</div>
            <div className="header-text">
              <h1>Contoso Finance Portal</h1>
              <p>Internal financial transaction management system</p>
            </div>
          </div>
          <div className="header-badge">
            <span className="badge-dot"></span>
            <span>System Active</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="transactions-row">
          <div className="new-transaction-section">
            <div className="section-header">
              <h2>New Transaction</h2>
              <button 
                className="btn-primary" 
                onClick={handleNewTransaction}
              >
                + Create
              </button>
            </div>
          </div>
          
          <div className="transactions-section">
            <TransactionHistory transactions={transactions} />
          </div>
        </div>

        <div className="entities-section">
          <h2 className="section-title">Company Entities & Budgets</h2>
          <EntityList entities={entities} />
        </div>
          
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
              <h3>Transaction Status</h3>
              <div className="transaction-details">
                {successMessage.split('\n').map((line, index) => (
                  <div key={index} className="detail-line">
                    {line.trim() && <span>{line.trim()}</span>}
                  </div>
                ))}
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
      </main>

      {showVerification && verificationData && (
        <VerificationModal
          verificationData={verificationData}
          transactionDetails={pendingTransaction}
          entities={entities}
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

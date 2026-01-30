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
  const [successMessage, setSuccessMessage] = useState(''); // Success message - updated
  const [pollingInterval, setPollingInterval] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');

  useEffect(() => {
    fetchEntities();
    fetchTransactions();
  }, []);

  // Auto-hide success message after 30 seconds (was 5 seconds)
  useEffect(() => {
    if (successMessage) {
      console.log('🕒 Success message will auto-hide in 30 seconds:', successMessage);
      const timer = setTimeout(() => {
        console.log('🕒 Auto-hiding success message');
        setSuccessMessage('');
      }, 30000); // 30 seconds instead of 5
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    fetchEntities();
    fetchTransactions();
  }, []);

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
    console.log('🔵 SUBMIT: Transaction data received:', transactionData);
    
    // For high-value transactions (>$50,000), require CFO approval
    if (transactionData.amount > 50000) {
      console.log('💰 HIGH VALUE: Setting pending transaction');
      setPendingTransaction(transactionData);
      
      // ALSO store in localStorage to survive hot reloads
      localStorage.setItem('pendingTransaction', JSON.stringify(transactionData));
      console.log('💾 Stored pending transaction in localStorage');
      
      console.log('💰 HIGH VALUE: Pending transaction set, calling initiateVerification');
      await initiateVerification(transactionData);
    } else {
      console.log('💚 LOW VALUE: Processing transaction directly');
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
    console.log('🔄 Starting verification polling for request:', requestId);
    
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/verification-status/${requestId}`);
        const { status, verifiedClaims, isLocalMode, faceCheck, error } = response.data;
        
        console.log('Polling status:', status);
        if (faceCheck) {
          console.log('Face Check data:', faceCheck);
        }
        
        // Update status message for user
        switch (status) {
          case 'request_retrieved':
            setVerificationStatus(isLocalMode ? 
              'Local mode: Waiting for simulation or scan QR code...' : 
              'Scan the QR code with Microsoft Authenticator...'
            );
            break;
          case 'presentation_verified':
            console.log('🎯 VERIFICATION COMPLETED - About to process transaction');
            console.log('Pending transaction (state):', pendingTransaction);
            console.log('Request ID:', requestId);
            console.log('✅ Verified claims:', verifiedClaims);
            
            // Try to get pending transaction from state first, then localStorage
            let transactionToProcess = pendingTransaction;
            if (!transactionToProcess) {
              console.log('🔍 No pending transaction in state, checking localStorage...');
              const stored = localStorage.getItem('pendingTransaction');
              if (stored) {
                transactionToProcess = JSON.parse(stored);
                console.log('💾 Retrieved pending transaction from localStorage:', transactionToProcess);
              }
            }
            
            setVerificationStatus('✅ Verification completed successfully!');
            clearInterval(interval);
            setPollingInterval(null);
            
            // Process transaction immediately and close modal
            if (transactionToProcess) {
              console.log('🎯 CALLING processTransaction with data:', transactionToProcess, requestId);
              
              // Create a copy to avoid race condition
              const transactionCopy = { ...transactionToProcess };
              console.log('📋 Transaction copy created:', transactionCopy);
              
              // Clean up localStorage
              localStorage.removeItem('pendingTransaction');
              console.log('🗑️ Cleared pendingTransaction from localStorage');
              
              // Close verification modal first
              setShowVerification(false);
              
              // Process the transaction with verifiedClaims and faceCheck data
              processTransaction(transactionCopy, requestId, verifiedClaims, faceCheck);
            } else {
              console.log('❌ NO PENDING TRANSACTION TO PROCESS');
              console.log('❌ Current state - pendingTransaction:', pendingTransaction);
              console.log('❌ localStorage - pendingTransaction:', localStorage.getItem('pendingTransaction'));
              setShowVerification(false);
            }
            break;
          case 'failed':
          case 'expired':
            console.log('===== Verification failed - DETAILED debugging =====');
            console.log('faceCheck object:', JSON.stringify(faceCheck, null, 2));
            console.log('error type:', typeof error);
            console.log('error value:', error);
            console.log('error stringified:', JSON.stringify(error, null, 2));
            console.log('Full response.data:', JSON.stringify(response.data, null, 2));
            
            // Get transaction details for context
            const txDetails = response.data.transactionDetails || pendingTransaction;
            const fromEntityName = entities.find(e => e.id === txDetails?.fromEntity)?.name || txDetails?.fromEntity || 'Unknown';
            const toEntityName = entities.find(e => e.id === txDetails?.toEntity)?.name || txDetails?.toEntity || 'Unknown';
            const txAmount = txDetails?.amount ? `$${txDetails.amount.toLocaleString()}` : 'Unknown amount';
            
            // Build a comprehensive failure report
            let failureMessage = '❌ CFO Approval Verification Failed\n';
            failureMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            
            // Transaction Context Section
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
            
            // Try to extract Face Check score from multiple sources
            let scoreFromError = null;
            if (error) {
              const errorMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
              console.log('Error message for parsing:', errorMsg);
              
              const patterns = [
                /confidence\s+score[:\s]+(\d+)/i,
                /score[:\s]+(\d+)/i,
                /match.*?(\d+)%/i,
                /(\d+)%.*?confidence/i,
                /threshold.*?(\d+)/i,
                /(\d+)\s*%/,
                /score\s*[=:]\s*(\d+)/i
              ];
              
              for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                const match = errorMsg.match(pattern);
                if (match) {
                  scoreFromError = parseInt(match[1]);
                  break;
                }
              }
            }
            
            // Get the display score
            const displayScore = faceCheck?.matchConfidenceScore ?? scoreFromError;
            const requiredScore = 70;
            
            // Face Check Results Section
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
            
            // Failure Reason Section
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
            
            // Next Steps Section
            failureMessage += '📌 RECOMMENDED ACTIONS\n';
            failureMessage += '   1. Ensure proper lighting and camera positioning\n';
            failureMessage += '   2. Remove glasses or face coverings if possible\n';
            failureMessage += '   3. Verify the correct CFO credential is being used\n';
            failureMessage += '   4. Try the verification process again\n';
            failureMessage += '   5. Contact IT support if the issue persists\n';
            
            console.log('=============================================');
            
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

  // Simulate verification for local testing (no ngrok needed!)
  const simulateVerification = async () => {
    if (verificationData && verificationData.requestId) {
      try {
        await axios.post(`/api/simulate-verification/${verificationData.requestId}`);
        console.log('🎭 Manual verification simulation triggered');
      } catch (error) {
        console.error('Error simulating verification:', error);
      }
    }
  };

  const processTransaction = async (transactionData, verificationId = null, verifiedClaims = null, faceCheck = null) => {
    console.log('🚀 PROCESS TRANSACTION CALLED');
    console.log('Transaction data:', transactionData);
    console.log('Verification ID:', verificationId);
    console.log('Verified claims:', verifiedClaims);
    console.log('Face Check data:', faceCheck);
    
    try {
      const response = await axios.post('/api/transactions', {
        ...transactionData,
        verificationId,
        verifiedClaims,
        faceCheck
      });
      
      console.log('✅ SERVER RESPONSE:', response.data);
      
      // Show embedded success message with transaction details
      const fromEntity = entities.find(e => e.id === transactionData.fromEntity);
      const toEntity = entities.find(e => e.id === transactionData.toEntity);
      
      console.log('🎯 Processing transaction success message');
      console.log('From entity:', fromEntity);
      console.log('To entity:', toEntity);
      console.log('Transaction data:', transactionData);
      console.log('Verified claims for summary:', verifiedClaims);
      
      // Build transaction summary with validator info if available
      let transactionSummary = [
        "Transaction completed successfully!",
        "",
        `Amount: $${transactionData.amount.toLocaleString()}`,
        `From: ${fromEntity?.name || transactionData.fromEntity}`,
        `To: ${toEntity?.name || transactionData.toEntity}`,
        `Category: ${transactionData.category}`,
        `Description: ${transactionData.description}`
      ];
      
      // Add validator info if we have verified claims
      if (verifiedClaims && (verifiedClaims.firstName || verifiedClaims.lastName)) {
        const validatorName = `${verifiedClaims.firstName || ''} ${verifiedClaims.lastName || ''}`.trim();
        transactionSummary.push('', `✅ Approved by: ${validatorName}`);
        
        // Add Face Check score if available
        if (faceCheck && faceCheck.matchConfidenceScore !== undefined) {
          transactionSummary.push(`📸 Face Check Score: ${faceCheck.matchConfidenceScore}%`);
        }
      }
      
      const summaryText = transactionSummary.join('\n');
      setSuccessMessage(summaryText);
      console.log('✅ Success message set:', summaryText);
      
      // Clean up states AFTER setting success message
      setPendingTransaction(null);
      setVerificationData(null);
      
      // Refresh data to show the new transaction in history
      await fetchTransactions();
      await fetchEntities(); // Refresh to update budgets
      
      console.log('✅ Transaction processed and data refreshed');
    } catch (error) {
      console.error('❌ ERROR PROCESSING TRANSACTION:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      // Force display error message
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
                  console.log('🔄 Closing success message');
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
            console.log('🚫 VERIFICATION CANCELLED');
            setShowVerification(false);
            setVerificationData(null);
            setPendingTransaction(null);
            setVerificationStatus('');
            
            // Clean up localStorage
            localStorage.removeItem('pendingTransaction');
            console.log('🗑️ Cleared pendingTransaction from localStorage (cancelled)');
            
            // Clean up polling
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

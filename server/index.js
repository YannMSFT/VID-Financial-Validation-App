const express = require('express');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Debug: Log environment variables (remove in production)
// Force restart - updated PORT
console.log('Environment variables loaded:');
console.log('TENANT_ID:', process.env.TENANT_ID ? 'Set' : 'Not set');
console.log('CLIENT_ID:', process.env.CLIENT_ID ? 'Set' : 'Not set');
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? 'Set (hidden)' : 'Not set');
console.log('VERIFIED_ID_ENDPOINT:', process.env.VERIFIED_ID_ENDPOINT || 'Using default');
console.log('BASE_URL:', process.env.BASE_URL || 'http://localhost:5000 (⚠️  Not publicly accessible!)');

// Warn about localhost callback URL
if (!process.env.BASE_URL || process.env.BASE_URL.includes('localhost')) {
  console.log('');
  console.log('🚨 WARNING: BASE_URL is set to localhost or not set!');
  console.log('💡 Microsoft Entra Verified ID requires a publicly accessible callback URL.');
  console.log('💡 Use ngrok or similar service: ngrok http 5000');
  console.log('💡 Then set BASE_URL=https://your-ngrok-url.ngrok.io in .env file');
  console.log('');
}

// Middleware
app.use(cors());
// Increase body size limit to handle Verified ID callbacks (credentials can be large)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Store for pending verifications (in production, use a proper database)
const verificationRequests = new Map();
const pendingTransactions = [];
const completedTransactions = [];

// Function to get access token for Microsoft Entra Verified ID Request Service API
async function getAccessToken() {
  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.TENANT_ID || 'common'}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', process.env.CLIENT_ID || 'your-client-id');
    params.append('client_secret', process.env.CLIENT_SECRET || 'your-client-secret');
    // Use the correct scope for Request Service API
    const scopes = [
      '3db474b9-6a0c-4840-96ac-1fceb342124f/.default', // Microsoft Entra Verified ID Request Service
      'bbb94529-53a3-4be5-a069-7eaf2712b826/.default', // Alternative Request Service scope
      'https://verifiedid.microsoft.com/.default'
    ];
    
    let lastError;
    
    for (const scope of scopes) {
      try {
        console.log(`Trying authentication with scope: ${scope}`);
        params.set('scope', scope);
        params.set('grant_type', 'client_credentials');

        const response = await axios.post(tokenEndpoint, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        console.log(`Successfully authenticated with scope: ${scope}`);
        return response.data.access_token;
      } catch (error) {
        console.log(`Authentication failed with scope ${scope}:`, error.response?.data?.error_description || error.message);
        lastError = error;
        // Continue to try next scope
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('All authentication attempts failed:', error.response?.data || error.message);
    throw error;
  }
}

// Mock company entities and departments
const companyEntities = [
  { 
    id: 'CONTOSO-HQ', 
    name: 'Contoso Corporation - Headquarters', 
    type: 'Corporate',
    budget: 5000000,
    usedBudget: 2350000,
    status: 'active'
  },
  { 
    id: 'CONTOSO-SALES', 
    name: 'Contoso Sales Division - Americas', 
    type: 'Sales',
    budget: 2500000,
    usedBudget: 1850000,
    status: 'active'
  },
  { 
    id: 'CONTOSO-ENG', 
    name: 'Contoso Engineering Department', 
    type: 'Engineering',
    budget: 8000000,
    usedBudget: 4200000,
    status: 'active'
  },
  { 
    id: 'CONTOSO-MKT', 
    name: 'Contoso Marketing & Communications', 
    type: 'Marketing',
    budget: 1500000,
    usedBudget: 890000,
    status: 'active'
  },
  { 
    id: 'FABRIKAM-US', 
    name: 'Fabrikam Inc. - US Operations', 
    type: 'Subsidiary',
    budget: 4500000,
    usedBudget: 2100000,
    status: 'active'
  },
  { 
    id: 'WOODGROVE-BANK', 
    name: 'Woodgrove Financial Services', 
    type: 'Financial',
    budget: 6800000,
    usedBudget: 3250000,
    status: 'active'
  }
];

// Routes

// Get company entities
app.get('/api/entities', (req, res) => {
  res.json(companyEntities);
});

// Initiate verification request (with polling support for local development)
app.post('/api/verify', async (req, res) => {
  try {
    const { transactionDetails } = req.body;
    const requestId = uuidv4();
    
    // Determine if we're running locally (no public URL)
    const isLocalMode = !process.env.BASE_URL || process.env.BASE_URL.includes('localhost');
    
    // Create verification request payload for Microsoft Entra Verified ID Request Service API
    const verificationRequest = {
      includeQRCode: true,
      authority: process.env.VERIFIER_AUTHORITY || 'did:web:verifiedid.contoso.com',
      registration: {
        clientName: 'Contoso Finance Portal',
        purpose: `Verify CFO credentials to approve transaction: $${transactionDetails.amount.toLocaleString()} from ${transactionDetails.fromEntity} to ${transactionDetails.toEntity}`
      },
      requestedCredentials: [
        {
          type: process.env.CREDENTIAL_TYPE || 'VerifiedCredentialExpert',
          acceptedIssuers: [process.env.ISSUER_AUTHORITY || process.env.VERIFIER_AUTHORITY || 'did:web:verifiedid.contoso.com'],
          // Face Check enabled - requires photo claim in credentials
          configuration: {
            validation: {
              faceCheck: {
                sourcePhotoClaimName: "photo",
                matchConfidenceThreshold: 70
              }
            }
          }
        }
      ],
      includeReceipt: true
    };

    // Add callback URL if BASE_URL is defined (including ngrok URLs)
    if (process.env.BASE_URL) {
      const callbackUrl = `${process.env.BASE_URL}/api/verification-callback`;
      verificationRequest.callback = {
        url: callbackUrl,
        state: requestId,
        headers: {
          'api-key': process.env.API_KEY || 'test-key'
        }
      };
      console.log('🌐 Using callback URL:', callbackUrl);
    } else {
      console.log('🏠 Local mode: No callback URL - using polling instead');
    }

    // Store the request using the state as key (this is what Microsoft Entra uses in callbacks)
    verificationRequests.set(requestId, {
      id: requestId,
      transactionDetails,
      status: 'request_retrieved',
      timestamp: new Date().toISOString(),
      isLocalMode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Get access token for Microsoft Entra Verified ID API
    let accessToken;
    try {
      accessToken = await getAccessToken();
      console.log('Successfully obtained access token for Verified ID service');
    } catch (authError) {
      console.log('Authentication failed, falling back to mock implementation:', authError.response?.data?.error_description || authError.message);
      
      // Fallback to mock implementation
      const mockQRCodeData = JSON.stringify({
        requestId,
        authority: process.env.VERIFIER_AUTHORITY || 'did:web:verifiedid.contoso.com',
        purpose: `CFO approval required for transaction: $${transactionDetails.amount.toLocaleString()}`,
        mock: true
      });

      const qrCodeUrl = await QRCode.toDataURL(mockQRCodeData);

      return res.json({
        requestId,
        qrCode: qrCodeUrl,
        url: `ms-authenticator://presentation?request=${encodeURIComponent(mockQRCodeData)}`,
        expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        mock: true,
        note: 'Using mock verification - Verified ID service not available'
      });
    }
    
    // Call Microsoft Entra Verified ID Request Service API
    try {
      console.log('Calling Microsoft Entra Verified ID Request Service API...');
      console.log('Request payload:', JSON.stringify(verificationRequest, null, 2));
      
      const apiEndpoint = process.env.VERIFIED_ID_ENDPOINT || 'https://verifiedid.did.msidentity.com/v1.0/verifiableCredentials/createPresentationRequest';
      
      const verifiedIdResponse = await axios.post(
        apiEndpoint,
        verificationRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('Successfully created Verified ID presentation request');
      console.log('Response:', JSON.stringify(verifiedIdResponse.data, null, 2));
      
      const { requestId: vidRequestId, url, expiry, qrCode } = verifiedIdResponse.data;

      // Log diagnostic information
      console.log('\n========================================');
      console.log('✅ VERIFIED ID SERVICE RESPONSE');
      console.log('========================================');
      console.log('Request ID:', vidRequestId || requestId);
      console.log('Presentation URL:', url);
      console.log('QR Code provided by service:', qrCode ? 'YES' : 'NO (generating from URL)');
      console.log('URL starts with:', url?.substring(0, 50) + '...');
      console.log('Expiry:', expiry);
      console.log('========================================\n');

      // Update stored request with Verified ID response
      verificationRequests.set(requestId, {
        ...verificationRequests.get(requestId),
        vidRequestId,
        status: 'request_created',
        presentationUrl: url
      });

      res.json({
        requestId,
        qrCode: qrCode || await QRCode.toDataURL(url), // Use provided QR or generate from URL
        url,
        expiry: expiry || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        real: true,
        isLocalMode: isLocalMode,
        pollingMode: isLocalMode, // For backward compatibility
        note: 'Generated by Microsoft Entra Verified ID Request Service'
      });
      
    } catch (apiError) {
      console.error('Verified ID API call failed:', apiError.response?.status, apiError.response?.statusText);
      console.error('Error details:', JSON.stringify(apiError.response?.data, null, 2));
      
      console.log('\n========================================');
      console.log('⚠️  FALLING BACK TO MOCK MODE');
      console.log('========================================');
      console.log('Reason: Entra Verified ID API not accessible');
      console.log('Error:', apiError.response?.data?.error?.message || apiError.message);
      console.log('========================================\n');
      
      // Check if it's a callback URL issue
      if (apiError.response?.data?.error?.innererror?.target === 'callback.url') {
        console.log('🚨 Callback URL must be publicly accessible. Using ngrok or similar service is required for local development.');
        console.log('💡 Current callback URL:', process.env.BASE_URL || 'http://localhost:5000');
        console.log('💡 Consider setting BASE_URL environment variable to your ngrok URL');
      }
      
      // Fallback to mock implementation if API fails
      const mockQRCodeData = JSON.stringify({
        requestId,
        authority: process.env.VERIFIER_AUTHORITY || 'did:web:verifiedid.contoso.com',
        purpose: `CFO approval required for transaction: $${transactionDetails.amount.toLocaleString()}`,
        mock: true,
        reason: apiError.response?.data?.error?.innererror?.message || 'API call failed'
      });

      const qrCodeUrl = await QRCode.toDataURL(mockQRCodeData);

      return res.json({
        requestId,
        qrCode: qrCodeUrl,
        url: `openid://vc/?request_uri=${encodeURIComponent(`${process.env.BASE_URL || 'http://localhost:5000'}/api/presentation-request/${requestId}`)}`,
        expiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        mock: true,
        note: 'Using mock verification - API requires public callback URL',
        error: apiError.response?.data?.error?.innererror?.message || 'API call failed',
        suggestion: 'Use ngrok or set BASE_URL to a public URL for real Verified ID integration'
      });
    }

  } catch (error) {
    console.error('Error creating verification request:', error);
    res.status(500).json({ 
      error: 'Failed to create verification request',
      details: error.message 
    });
  }
});

// Serve presentation request directly (for mock implementation)
app.get('/api/presentation-request/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = verificationRequests.get(requestId);
  
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  // Return OpenID format presentation request
  const presentationRequest = {
    client_id: process.env.VERIFIER_AUTHORITY || 'did:web:verifiedid.contoso.com',
    client_id_scheme: 'did',
    response_type: 'vp_token',
    response_mode: 'direct_post',
    response_uri: `${process.env.BASE_URL || 'http://localhost:5000'}/api/verification-callback`,
    nonce: requestId,
    presentation_definition: {
      id: requestId,
      input_descriptors: [
        {
          id: 'VerifiedCredentialExpert',
          purpose: 'CFO identity verification required for financial transaction approval',
          constraints: {
            fields: [
              {
                path: ['$.type'],
                filter: {
                  type: 'string',
                  const: process.env.CREDENTIAL_TYPE || 'VerifiedCredentialExpert'
                }
              }
            ]
          }
        }
      ]
    },
    state: requestId
  };
  
  res.json(presentationRequest);
});

// Check verification status with detailed information
app.get('/api/verify/:requestId/status', (req, res) => {
  const { requestId } = req.params;
  const request = verificationRequests.get(requestId);
  
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  // Provide comprehensive status information
  const response = {
    requestId,
    status: request.status,
    timestamp: request.timestamp,
    lastActivity: request.lastActivity,
    transactionDetails: request.transactionDetails
  };
  
  // Add verification details if completed
  if (request.status === 'presentation_verified') {
    response.verifiedAt = request.verifiedAt;
    response.verifiedClaims = request.verifiedClaims;
  }
  
  // Add error details if failed
  if (request.status === 'failed' && request.error) {
    response.error = request.error;
  }
  
  res.json(response);
});

// Webhook callback for verification results from Microsoft Entra Verified ID
app.post('/api/verification-callback', (req, res) => {
  try {
    console.log('Received verification callback:', JSON.stringify(req.body, null, 2));
    
    const { requestId, requestStatus, code, state, error, receipt, verifiedCredentialsData } = req.body;
    
    // The state is the key we use to store verification requests, not requestId
    const request = verificationRequests.get(state);
    
    if (!request) {
      console.error(`Request not found for state: ${state}`);
      console.error('Available verification requests:', Array.from(verificationRequests.keys()));
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Use requestStatus as primary status, fall back to code
    const status = requestStatus || code;
    
    // Handle different callback codes from Verified ID service
    switch (status) {
      case 'request_retrieved':
        request.status = 'request_retrieved';
        request.lastActivity = new Date().toISOString();
        console.log(`QR code scanned for request: ${state}`);
        break;
        
      case 'presentation_verified':
        request.status = 'presentation_verified';
        request.verifiedAt = new Date().toISOString();
        request.lastActivity = new Date().toISOString();
        
        // Extract Face Check results from receipt if available
        if (receipt) {
          if (receipt.faceCheck) {
            request.faceCheck = {
              matchConfidenceScore: receipt.faceCheck.matchConfidenceScore,
              sourcePhotoQuality: receipt.faceCheck.sourcePhotoQuality
            };
            console.log(`Face Check results for request ${state}:`, request.faceCheck);
          }
        }
        
        // Extract verified claims from Microsoft Entra Verified ID response
        if (verifiedCredentialsData && verifiedCredentialsData.length > 0) {
          const credential = verifiedCredentialsData[0];
          request.verifiedClaims = {
            firstName: credential.claims?.firstName,
            lastName: credential.claims?.lastName,
            issuer: credential.issuer,
            type: credential.type,
            credentialState: credential.credentialState
          };
          console.log(`Presentation verified for request: ${state}`, request.verifiedClaims);
        } else if (receipt && receipt.vp_token) {
          try {
            // Fallback: Parse VP token for claims
            const vpToken = JSON.parse(Buffer.from(receipt.vp_token.split('.')[1], 'base64').toString());
            request.verifiedClaims = vpToken.vc?.credentialSubject || {};
            console.log(`Presentation verified via VP token for request: ${state}`, request.verifiedClaims);
          } catch (parseError) {
            console.error('Error parsing VP token:', parseError);
          }
        }
        break;
        
      case 'presentation_error':
      case 'presentation_failed':
        request.status = 'failed';
        request.error = error || req.body.error || 'Presentation failed';
        request.lastActivity = new Date().toISOString();
        
        console.log('Full error object:', JSON.stringify(req.body, null, 2));
        
        // Extract Face Check results even on failure
        if (receipt && receipt.faceCheck) {
          request.faceCheck = {
            matchConfidenceScore: receipt.faceCheck.matchConfidenceScore,
            sourcePhotoQuality: receipt.faceCheck.sourcePhotoQuality
          };
          console.log(`Face Check results (failed) for request ${state}:`, request.faceCheck);
        }
        
        // Try to extract Face Check score from error message if not in receipt
        if (!request.faceCheck && request.error) {
          const errorStr = typeof request.error === 'string' ? request.error : JSON.stringify(request.error);
          const scoreMatch = errorStr.match(/confidence\s+score[:\s]+(\d+)/i) || errorStr.match(/score[:\s]+(\d+)/i);
          if (scoreMatch) {
            request.faceCheck = {
              matchConfidenceScore: parseInt(scoreMatch[1])
            };
            console.log(`Face Check score extracted from error message:`, request.faceCheck);
          }
        }
        
        console.error(`Presentation failed for request: ${state}`, request.error);
        break;
        
      default:
        console.log(`Unknown callback status: ${status} for request: ${state}`);
        request.status = status || 'unknown';
        request.lastActivity = new Date().toISOString();
    }
    
    // Update the stored request
    verificationRequests.set(state, request);
    
    // Return minimal success response to Verified ID service (to avoid 413 error)
    res.status(200).send();
    
  } catch (error) {
    console.error('Callback processing error:', error);
    // Return minimal error response (no JSON body to avoid 413)
    res.status(500).send();
  }
});

// Polling endpoint to check verification status (works without public callback URL)
app.get('/api/verification-status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = verificationRequests.get(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        error: 'Verification request not found',
        requestId 
      });
    }
    
    // Check if request has expired
    if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
      request.status = 'expired';
      verificationRequests.set(requestId, request);
    }
    
    // For local mode, simulate verification after some time for demo purposes
    if (request.isLocalMode && request.status === 'request_retrieved') {
      const timeElapsed = Date.now() - new Date(request.timestamp).getTime();
      
      // Simulate verification completion after 30 seconds for demo
      if (timeElapsed > 30000) {
        request.status = 'presentation_verified';
        request.verifiedClaims = {
          firstName: 'Alex',
          lastName: 'Wilber',
          jobTitle: 'CFO',
          email: 'alex@contoso.com',
          department: 'Finance'
        };
        request.lastActivity = new Date().toISOString();
        verificationRequests.set(requestId, request);
        
        console.log(`🎭 Local simulation: Verified request ${requestId} for demo purposes`);
      }
    }
    
    res.json({
      requestId,
      status: request.status,
      verifiedClaims: request.verifiedClaims,
      lastActivity: request.lastActivity,
      timestamp: request.timestamp,
      expiresAt: request.expiresAt,
      isLocalMode: request.isLocalMode,
      transactionDetails: request.transactionDetails,
      faceCheck: request.faceCheck,
      error: request.error
    });
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ 
      error: 'Error checking verification status',
      details: error.message 
    });
  }
});

// Local verification simulation endpoint (for demo without ngrok)
app.post('/api/simulate-verification/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = verificationRequests.get(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        error: 'Verification request not found',
        requestId 
      });
    }
    
    // Only allow simulation in local mode
    if (!request.isLocalMode) {
      return res.status(400).json({ 
        error: 'Simulation only available in local mode' 
      });
    }
    
    // Simulate successful verification
    request.status = 'presentation_verified';
    request.verifiedClaims = {
      firstName: 'Alex',
      lastName: 'Wilber',
      jobTitle: 'Chief Financial Officer',
      email: 'alex.wilber@contoso.com',
      department: 'Finance',
      employeeId: 'CFO-001'
    };
    request.lastActivity = new Date().toISOString();
    verificationRequests.set(requestId, request);
    
    console.log(`🎭 Manual simulation: Verified request ${requestId}`);
    
    res.json({
      success: true,
      message: 'Verification simulated successfully',
      requestId,
      verifiedClaims: request.verifiedClaims
    });
    
  } catch (error) {
    console.error('Error simulating verification:', error);
    res.status(500).json({ 
      error: 'Error simulating verification',
      details: error.message 
    });
  }
});

// Submit transaction (requires verification for high amounts)
app.post('/api/transactions', (req, res) => {
  try {
    const { fromEntity, toEntity, amount, description, category, verificationId, verifiedClaims, faceCheck } = req.body;
    
    console.log('📋 TRANSACTION REQUEST RECEIVED:');
    console.log('  Amount:', amount);
    console.log('  From:', fromEntity);
    console.log('  To:', toEntity);
    console.log('  VerificationId:', verificationId);
    console.log('  VerifiedClaims:', verifiedClaims);
    console.log('  FaceCheck:', faceCheck);
    
    let validatorInfo = null;
    let faceCheckInfo = null;
    
    // Check if verification was completed for high-value transactions
    if (amount > 50000) {
      console.log('💰 HIGH VALUE TRANSACTION - Checking verification...');
      const verification = verificationRequests.get(verificationId);
      console.log('🔍 Verification found:', verification);
      
      if (!verification || verification.status !== 'presentation_verified') {
        console.log('❌ VERIFICATION FAILED:', {
          verificationExists: !!verification,
          status: verification?.status,
          required: 'presentation_verified'
        });
        return res.status(403).json({ 
          error: 'CFO approval required for transactions over $50,000',
          requiresVerification: true 
        });
      }
      console.log('✅ VERIFICATION PASSED!');
      
      // Extract validator info from verification or verifiedClaims
      const claims = verification?.verifiedClaims || verifiedClaims;
      if (claims && (claims.firstName || claims.lastName)) {
        validatorInfo = {
          firstName: claims.firstName,
          lastName: claims.lastName,
          fullName: `${claims.firstName || ''} ${claims.lastName || ''}`.trim()
        };
        console.log('👤 Validator info extracted:', validatorInfo);
      }
      
      // Extract Face Check info if available
      const faceCheckData = verification?.faceCheck || faceCheck;
      if (faceCheckData && faceCheckData.matchConfidenceScore !== undefined) {
        faceCheckInfo = {
          matchConfidenceScore: faceCheckData.matchConfidenceScore,
          sourcePhotoQuality: faceCheckData.sourcePhotoQuality
        };
        console.log('📸 Face Check info extracted:', faceCheckInfo);
      }
    }

    // Find entity details from the entities database
    const fromEntityDetails = companyEntities.find(e => e.id === fromEntity);
    const toEntityDetails = companyEntities.find(e => e.id === toEntity);
    
    console.log(`🔍 Looking up entities: from=${fromEntity} to=${toEntity}`);
    console.log(`🔍 Found fromEntity:`, fromEntityDetails);
    console.log(`🔍 Found toEntity:`, toEntityDetails);
    
    // Create transaction with full entity details
    const transaction = {
      id: uuidv4(),
      fromEntity: fromEntityDetails || { id: fromEntity, name: fromEntity },
      toEntity: toEntityDetails || { id: toEntity, name: toEntity },
      amount,
      description,
      category,
      status: amount > 50000 ? 'approved' : 'completed',
      timestamp: new Date().toISOString(),
      verificationId,
      approver: validatorInfo ? validatorInfo.fullName : (verificationId ? 'Contoso CFO Team' : 'System Auto-Approved'),
      validator: validatorInfo, // Store full validator info for detailed display
      faceCheck: faceCheckInfo // Store Face Check results if available
    };
    
    completedTransactions.push(transaction);
    
    console.log(`✅ Transaction processed: ${transaction.amount} from ${fromEntityDetails?.name || fromEntity} to ${toEntityDetails?.name || toEntity}`);
    
    // Clean up verification request
    if (verificationId) {
      verificationRequests.delete(verificationId);
    }
    
    res.json(transaction);
    
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

// Get transactions
app.get('/api/transactions', (req, res) => {
  res.json(completedTransactions);
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}${process.env.NODE_ENV === 'production' ? ' (Production mode)' : ''}`);
});

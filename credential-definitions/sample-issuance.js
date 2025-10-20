/**
 * Sample Credential Issuance Script with Photo Support
 * 
 * This script demonstrates how to issue Microsoft Entra Verified ID credentials
 * that include a user photo for Face Check biometric verification.
 */

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configure multer for photo uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 // 100KB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only JPEG and PNG
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

/**
 * Get access token for Microsoft Entra Verified ID
 */
async function getAccessToken() {
  const tokenEndpoint = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.CLIENT_ID);
  params.append('client_secret', process.env.CLIENT_SECRET);
  params.append('scope', '3db474b9-6a0c-4840-96ac-1fceb342124f/.default');
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(tokenEndpoint, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}

/**
 * Convert image file to base64 data URI
 */
function imageToBase64DataUri(imagePath, mimeType = 'image/jpeg') {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  return `data:${mimeType};base64,${base64Image}`;
}

/**
 * Validate photo meets requirements for Face Check
 */
function validatePhoto(photoBase64) {
  // Check if it's a valid data URI
  if (!photoBase64.startsWith('data:image/')) {
    throw new Error('Photo must be a base64 data URI');
  }

  // Extract base64 data
  const base64Data = photoBase64.split(',')[1];
  
  // Calculate approximate size (base64 is ~33% larger than binary)
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInKB = sizeInBytes / 1024;

  if (sizeInKB > 100) {
    throw new Error(`Photo is too large: ${sizeInKB.toFixed(2)}KB (max 100KB)`);
  }

  return true;
}

/**
 * Issue credential with photo
 */
async function issueCredentialWithPhoto(userData) {
  console.log('🎫 Issuing credential for:', userData.firstName, userData.lastName);
  
  // Validate photo
  validatePhoto(userData.photo);
  console.log('✅ Photo validated');

  // Get access token
  const accessToken = await getAccessToken();
  console.log('✅ Access token obtained');

  // Create issuance request
  const issuanceRequest = {
    includeQRCode: true,
    authority: process.env.ISSUER_AUTHORITY,
    registration: {
      clientName: "Contoso Finance Portal",
      purpose: "Issue Verified Credential Expert credential with photo for Face Check"
    },
    callback: {
      url: `${process.env.BASE_URL}/api/issuance-callback`,
      state: userData.requestId,
      headers: {
        "api-key": process.env.API_KEY || "test-key"
      }
    },
    type: "VerifiedCredentialExpert",
    manifest: process.env.MANIFEST_URL,
    // Optional PIN for additional security
    pin: {
      value: Math.floor(1000 + Math.random() * 9000).toString(),
      length: 4
    },
    // Claims including photo
    claims: {
      given_name: userData.firstName,
      family_name: userData.lastName,
      photo: userData.photo  // Base64 encoded photo
    }
  };

  console.log('📤 Sending issuance request to Microsoft Entra Verified ID...');
  console.log('Claims:', {
    given_name: userData.firstName,
    family_name: userData.lastName,
    photo: `${userData.photo.substring(0, 50)}... (truncated)`
  });

  // Call Microsoft Entra Verified ID Issuance API
  const response = await axios.post(
    'https://verifiedid.did.msidentity.com/v1.0/verifiableCredentials/createIssuanceRequest',
    issuanceRequest,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('✅ Credential issuance request created');
  console.log('📱 QR Code URL:', response.data.url);
  console.log('🔢 PIN:', issuanceRequest.pin.value);

  return response.data;
}

/**
 * API Endpoint: Upload photo and issue credential
 */
app.post('/api/issue-credential', upload.single('photo'), async (req, res) => {
  try {
    const { firstName, lastName, requestId } = req.body;
    const photoFile = req.file;

    // Validate inputs
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    if (!photoFile) {
      return res.status(400).json({ error: 'Photo file is required' });
    }

    console.log('📸 Photo uploaded:', photoFile.originalname);
    console.log('📏 Photo size:', (photoFile.size / 1024).toFixed(2), 'KB');

    // Convert photo to base64
    const photoPath = photoFile.path;
    const mimeType = photoFile.mimetype;
    const photoBase64 = imageToBase64DataUri(photoPath, mimeType);

    // Clean up uploaded file
    fs.unlinkSync(photoPath);

    // Issue credential
    const userData = {
      firstName,
      lastName,
      photo: photoBase64,
      requestId: requestId || Date.now().toString()
    };

    const issuanceResponse = await issueCredentialWithPhoto(userData);

    res.json({
      success: true,
      requestId: userData.requestId,
      qrCode: issuanceResponse.qrCode,
      url: issuanceResponse.url,
      pin: issuanceResponse.pin,
      expiry: issuanceResponse.expiry
    });

  } catch (error) {
    console.error('❌ Issuance error:', error.response?.data || error.message);
    
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json({
      error: 'Failed to issue credential',
      details: error.response?.data || error.message
    });
  }
});

/**
 * API Endpoint: Issue credential with base64 photo (no upload)
 */
app.post('/api/issue-credential-base64', async (req, res) => {
  try {
    const { firstName, lastName, photo, requestId } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !photo) {
      return res.status(400).json({ 
        error: 'firstName, lastName, and photo (base64) are required' 
      });
    }

    console.log('📸 Issuing credential with provided base64 photo');

    const userData = {
      firstName,
      lastName,
      photo,
      requestId: requestId || Date.now().toString()
    };

    const issuanceResponse = await issueCredentialWithPhoto(userData);

    res.json({
      success: true,
      requestId: userData.requestId,
      qrCode: issuanceResponse.qrCode,
      url: issuanceResponse.url,
      pin: issuanceResponse.pin,
      expiry: issuanceResponse.expiry
    });

  } catch (error) {
    console.error('❌ Issuance error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to issue credential',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Webhook: Issuance callback
 */
app.post('/api/issuance-callback', (req, res) => {
  console.log('🔔 Issuance callback received:', JSON.stringify(req.body, null, 2));

  const { requestStatus, state } = req.body;

  switch (requestStatus) {
    case 'request_retrieved':
      console.log('📱 User scanned QR code for request:', state);
      break;
    case 'issuance_successful':
      console.log('✅ Credential issued successfully for request:', state);
      break;
    case 'issuance_failed':
      console.log('❌ Credential issuance failed for request:', state);
      console.log('Error:', req.body.error);
      break;
    default:
      console.log('ℹ️ Status update:', requestStatus);
  }

  res.status(200).send();
});

/**
 * Utility: Convert local image file to base64
 * Usage: node sample-issuance.js convert /path/to/image.jpg
 */
function convertImageToBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.error('❌ File not found:', imagePath);
    process.exit(1);
  }

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  
  const base64 = imageToBase64DataUri(imagePath, mimeType);
  
  console.log('✅ Image converted to base64');
  console.log('📏 Size:', (base64.length / 1024).toFixed(2), 'KB');
  console.log('');
  console.log('Base64 Data URI:');
  console.log(base64);
  console.log('');
  console.log('First 100 chars:', base64.substring(0, 100) + '...');
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'convert' && args[1]) {
    // Convert image to base64
    convertImageToBase64(args[1]);
  } else if (args[0] === 'server') {
    // Start server
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log('🚀 Credential Issuance Server running on port', PORT);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('  POST /api/issue-credential         - Upload photo and issue');
      console.log('  POST /api/issue-credential-base64  - Issue with base64 photo');
      console.log('  POST /api/issuance-callback        - Webhook endpoint');
      console.log('');
      console.log('💡 Example usage:');
      console.log('  curl -X POST http://localhost:5001/api/issue-credential-base64 \\');
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"firstName":"Miriam","lastName":"Graham","photo":"data:image/jpeg;base64,..."}\'');
    });
  } else {
    console.log('📚 Usage:');
    console.log('  node sample-issuance.js convert <image-path>  - Convert image to base64');
    console.log('  node sample-issuance.js server                - Start issuance server');
    console.log('');
    console.log('Examples:');
    console.log('  node sample-issuance.js convert ./user-photo.jpg');
    console.log('  node sample-issuance.js server');
  }
}

module.exports = {
  issueCredentialWithPhoto,
  imageToBase64DataUri,
  validatePhoto
};

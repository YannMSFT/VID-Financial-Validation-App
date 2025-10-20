# Credential Setup Guide with Photo for Face Check

## Overview

This guide walks you through creating a Microsoft Entra Verified ID credential that includes a user photo, which is required for Face Check biometric verification.

## 📁 Files Created

Two JSON files have been created in the `credential-definitions` folder:

1. **`display-definition.json`** - Controls how the credential appears in Microsoft Authenticator
2. **`rules-definition.json`** - Defines the claims structure and issuance rules

## 🎨 Display Definition Explained

The `display-definition.json` file controls the visual appearance and claim labels:

```json
{
  "locale": "en-US",
  "card": {
    "title": "Verified Credential Expert",
    "issuedBy": "Contoso Corporation",
    "backgroundColor": "#000000",
    "textColor": "#ffffff",
    "logo": {
      "uri": "https://your-logo-url.png",
      "description": "Verified Credential Expert Logo"
    },
    "description": "Use this credential to prove you are a Verified Credential Expert"
  },
  "claims": [
    {
      "claim": "vc.credentialSubject.firstName",
      "label": "First Name",
      "type": "String"
    },
    {
      "claim": "vc.credentialSubject.lastName",
      "label": "Last Name",
      "type": "String"
    },
    {
      "claim": "vc.credentialSubject.photo",
      "label": "Photo",
      "type": "String"
    }
  ]
}
```

### Key Elements:

- **`card`**: Visual branding (colors, logo, title)
- **`claims`**: List of claims to display in the credential
- **`photo` claim**: Required for Face Check (type: String for base64 data)

### Customization Options:

```json
{
  "backgroundColor": "#0078D4",  // Microsoft Blue
  "textColor": "#FFFFFF",        // White text
  "logo": {
    "uri": "https://yourdomain.com/logo.png"  // 200x200 px recommended
  }
}
```

## 📋 Rules Definition Explained

The `rules-definition.json` file defines how claims are mapped and validated:

```json
{
  "attestations": {
    "idTokens": [
      {
        "clientId": "YOUR_APP_CLIENT_ID",
        "configuration": "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0/.well-known/openid-configuration",
        "redirectUri": "https://your-app.com/callback",
        "scope": "openid profile",
        "mapping": [
          {
            "outputClaim": "firstName",
            "required": true,
            "inputClaim": "$.given_name",
            "indexed": false
          },
          {
            "outputClaim": "lastName",
            "required": true,
            "inputClaim": "$.family_name",
            "indexed": false
          },
          {
            "outputClaim": "photo",
            "required": true,
            "inputClaim": "$.picture",
            "indexed": false
          }
        ],
        "required": false
      }
    ]
  },
  "validityInterval": 2592000,  // 30 days in seconds
  "vc": {
    "type": ["VerifiedCredentialExpert"]
  }
}
```

### Key Elements:

- **`attestations.idTokens`**: Uses **Entra ID authentication** to get claims automatically
- **`clientId`**: Your Azure AD app registration client ID
- **`configuration`**: Entra ID OpenID configuration endpoint
- **`mapping`**: Maps ID token claims to credential claims
- **`photo` claim**: Maps from `$.picture` claim (Entra ID profile photo)
- **`validityInterval`**: Credential lifetime in seconds (30 days)
- **`indexed`**: Set to false for photo to prevent indexing (privacy)

### Claim Mapping:

| Input Claim | Output Claim | Required | Source |
|-------------|--------------|----------|--------|
| `$.given_name` | `firstName` | Yes | Entra ID profile |
| `$.family_name` | `lastName` | Yes | Entra ID profile |
| `$.picture` | `photo` | Yes | **Entra ID profile photo** (base64) |

> **Important**: The photo is automatically retrieved from the user's Entra ID profile photo during issuance. Users authenticate with Entra ID, and their profile photo is included in the ID token as the `picture` claim.

## 🚀 Setup Steps in Azure Portal

### Step 1: Create Credential Type

1. Navigate to **Azure Portal** → **Microsoft Entra ID** → **Verified ID**
2. Click **Credentials** → **+ Add a credential**
3. Choose **Custom credential**
4. Enter credential details:
   - **Name**: `VerifiedCredentialExpert`
   - **Display name**: `Verified Credential Expert`
   - **Issuer**: Your organization name

### Step 2: Upload Display Definition

1. In the credential configuration, go to **Display definition**
2. Choose **Upload JSON file**
3. Upload `credential-definitions/display-definition.json`
4. Review the preview in Microsoft Authenticator mockup
5. Click **Save**

### Step 3: Upload Rules Definition

1. Go to **Rules definition** tab
2. Choose **Upload JSON file**
3. Upload `credential-definitions/rules-definition.json`
4. Verify the claim mappings:
   - ✅ firstName (required)
   - ✅ lastName (required)
   - ✅ photo (required)
5. Click **Save**

### Step 4: Configure Issuance

1. Go to **Issuance** tab
2. Configure your issuance method:
   - **ID Token Hint** (recommended for enterprise)
   - **Self-attested** (for demos/testing)
   - **ID Token** (with Azure AD)

For **ID Token Hint**:
- Set callback URL: `https://your-app.com/api/issuance-callback`
- Configure trusted issuer

### Step 5: Test Configuration

1. Click **Issue credential** in the portal
2. Generate test issuance request
3. Scan QR code with Microsoft Authenticator
4. Verify photo appears in credential

## 📸 Photo Requirements for Face Check

### Image Format

- **Encoding**: Base64 string
- **Format**: JPEG or PNG
- **Size**: 200x200 to 400x400 pixels (recommended)
- **File size**: Under 100KB
- **Color**: RGB (color photos work best)

### Photo Quality Guidelines

✅ **Good Photo Characteristics:**
- Clear, well-lit face
- Face centered and directly facing camera
- Neutral expression
- No glasses glare
- Plain background
- Recent photo (within 6 months)

❌ **Avoid:**
- Blurry or low-resolution images
- Heavy shadows on face
- Sunglasses or face coverings
- Group photos or multiple faces
- Filters or heavy editing
- Side profile or angled shots

### Converting Image to Base64

#### Using Node.js:
```javascript
const fs = require('fs');

function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64Image}`;
}

const photoData = imageToBase64('./user-photo.jpg');
```

#### Using PowerShell:
```powershell
$imageBytes = [System.IO.File]::ReadAllBytes("C:\path\to\photo.jpg")
$base64 = [System.Convert]::ToBase64String($imageBytes)
$photoData = "data:image/jpeg;base64,$base64"
```

#### Using Python:
```python
import base64

def image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"

photo_data = image_to_base64("user-photo.jpg")
```

## 🔧 Issuing Credentials with Photos

### Method 1: ID Token Hint (Recommended)

When issuing via ID Token Hint, include the photo in your token payload:

```json
{
  "given_name": "Miriam",
  "family_name": "Graham",
  "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

### Method 2: Self-Attested Issuance

For testing, you can use self-attested issuance:

1. User scans issuance QR code
2. App prompts for firstName, lastName, and photo
3. User uploads photo (app converts to base64)
4. Credential is issued with photo claim

### Method 3: Azure AD Claims

If using Azure AD integration, add photo to user profile:

```powershell
# Microsoft Graph API
PATCH https://graph.microsoft.com/v1.0/users/{userId}
Content-Type: application/json

{
  "photo": "data:image/jpeg;base64,..."
}
```

## 🧪 Testing Your Credential

### Test Issuance Flow

1. **Generate issuance request** in your app:
   ```javascript
   const issuanceRequest = {
     authority: process.env.ISSUER_AUTHORITY,
     registration: {
       clientName: "Contoso Finance Portal"
     },
     claims: {
       firstName: "Miriam",
       lastName: "Graham",
       photo: photoBase64String  // Base64-encoded photo
     }
   };
   ```

2. **Issue credential** to test user

3. **Verify claims** in Microsoft Authenticator:
   - Open credential
   - Verify firstName, lastName appear
   - Verify photo claim exists (may not display in UI)

### Test Presentation with Face Check

1. **Start verification request** in your app
2. **Scan QR code** with Microsoft Authenticator
3. **Select credential** with photo
4. **Take selfie** when prompted
5. **Verify success/failure** based on face match

Expected behavior:
- ✅ Matching face: Verification succeeds
- ❌ Non-matching face: Verification fails
- ❌ Poor quality selfie: May fail or prompt retry

## 📊 Sample Issuance Request

Complete example for issuing a credential with photo:

```javascript
const axios = require('axios');

async function issueCredentialWithPhoto(accessToken, userData) {
  const issuanceRequest = {
    includeQRCode: true,
    authority: process.env.ISSUER_AUTHORITY,
    registration: {
      clientName: "Contoso Finance Portal",
      purpose: "Issue Verified Credential Expert credential"
    },
    callback: {
      url: `${process.env.BASE_URL}/api/issuance-callback`,
      state: userData.requestId,
      headers: {
        "api-key": process.env.API_KEY
      }
    },
    type: "VerifiedCredentialExpert",
    manifest: process.env.MANIFEST_URL,
    pin: {
      value: "1234",
      length: 4
    },
    claims: {
      given_name: userData.firstName,
      family_name: userData.lastName,
      photo: userData.photoBase64  // Base64 encoded photo
    }
  };

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

  return response.data;
}
```

## 🔐 Security Best Practices

### Photo Storage

- **DO**: Store photos securely during issuance process
- **DO**: Delete temporary photo files after issuance
- **DO**: Use HTTPS for all photo transmissions
- **DON'T**: Store photos in plain text
- **DON'T**: Log base64 photo data
- **DON'T**: Cache photos client-side

### Privacy Compliance

- ✅ Obtain explicit consent for photo collection
- ✅ Inform users about Face Check usage
- ✅ Provide opt-out mechanisms where applicable
- ✅ Document photo retention policies
- ✅ Comply with GDPR, CCPA, BIPA regulations
- ✅ Allow users to update/delete photos

### Access Control

- Only authorized issuers can create credentials
- Validate photo format and size before issuance
- Implement rate limiting on issuance endpoints
- Log all issuance activities for audit

## 🐛 Troubleshooting

### Issue: Photo Not Appearing in Credential

**Solutions:**
1. Verify photo claim in rules definition has `"required": true`
2. Check photo is valid base64 string
3. Ensure photo starts with `data:image/jpeg;base64,` or `data:image/png;base64,`
4. Verify file size under 100KB

### Issue: Face Check Not Working

**Solutions:**
1. Confirm credential includes photo claim
2. Verify photo is clear and face is visible
3. Check presentation request has Face Check configuration
4. Ensure Microsoft Authenticator is updated

### Issue: Photo Too Large

**Solutions:**
1. Resize image to 300x300 pixels
2. Compress JPEG with quality 80-85%
3. Convert PNG to JPEG if needed
4. Remove EXIF data

### Issue: Invalid Base64 Error

**Solutions:**
1. Check base64 encoding is correct
2. Ensure no line breaks in base64 string
3. Verify data URI prefix is included
4. Test with online base64 decoder

## 📁 File Structure

```
credential-definitions/
├── display-definition.json       # Visual appearance
├── rules-definition.json         # Claim mappings
└── README.md                     # This guide
```

## 🔄 Updating Credentials

To update existing credential type:

1. **Modify JSON files** as needed
2. **Re-upload** to Azure Portal
3. **Update version** in your app configuration
4. **Re-issue credentials** to users with new definition

Note: Existing credentials remain valid until expiry

## 📚 Related Documentation

- [FACE_CHECK_IMPLEMENTATION.md](../FACE_CHECK_IMPLEMENTATION.md) - Face Check setup
- [FACE_CHECK_SUMMARY.md](../FACE_CHECK_SUMMARY.md) - Quick reference
- [Microsoft Entra Verified ID Documentation](https://learn.microsoft.com/entra/verified-id/)

## ✅ Checklist

Before deploying to production:

- [ ] Display definition uploaded and tested
- [ ] Rules definition uploaded and validated
- [ ] Photo claim marked as required
- [ ] Test credentials issued with photos
- [ ] Face Check tested with matching/non-matching photos
- [ ] Error handling implemented for missing photos
- [ ] Privacy policy updated for biometric data
- [ ] User consent flow implemented
- [ ] Photo quality guidelines documented for users
- [ ] Monitoring set up for issuance failures

---

**Your credential type is now configured to support Face Check biometric verification!** 🎉

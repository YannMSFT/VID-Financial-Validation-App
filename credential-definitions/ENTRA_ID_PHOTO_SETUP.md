# Entra ID Profile Photo Setup for Face Check

## Overview

For Face Check to work with Verified ID credentials, user profile photos must be stored in **Microsoft Entra ID** (formerly Azure AD). During credential issuance, the photo is automatically retrieved from the user's Entra ID profile and included in the credential.

## 🎯 Photo Flow

```
User Profile Photo in Entra ID
    ↓
User authenticates during issuance
    ↓
ID token includes 'picture' claim (base64 photo)
    ↓
Photo mapped to credential 'photo' claim
    ↓
Credential issued with photo
    ↓
Face Check uses photo during verification
```

## 📸 Setting Up Profile Photos in Entra ID

### Method 1: Azure Portal (Manual)

1. **Navigate to Entra ID**
   - Go to [Azure Portal](https://portal.azure.com)
   - Select **Microsoft Entra ID** → **Users**

2. **Select a user**
   - Click on the user's name

3. **Upload photo**
   - Click **Edit** in the user profile
   - Click on the profile picture placeholder
   - Upload a photo (JPEG or PNG)
   - Recommended: 648x648 pixels
   - Max size: 4MB
   - Click **Save**

### Method 2: Microsoft Graph API (Programmatic)

#### Upload Photo for a User

```javascript
const axios = require('axios');
const fs = require('fs');

async function uploadUserPhoto(accessToken, userId, photoPath) {
  const photoBuffer = fs.readFileSync(photoPath);
  
  const response = await axios.put(
    `https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`,
    photoBuffer,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg'
      }
    }
  );
  
  console.log('✅ Photo uploaded successfully');
  return response.data;
}

// Usage
const token = await getGraphAccessToken();
await uploadUserPhoto(token, 'user@contoso.com', './user-photo.jpg');
```

#### Get User Photo (Verify Upload)

```javascript
async function getUserPhoto(accessToken, userId) {
  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    }
  );
  
  const base64Photo = Buffer.from(response.data, 'binary').toString('base64');
  return `data:image/jpeg;base64,${base64Photo}`;
}
```

### Method 3: PowerShell (Bulk Upload)

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "User.ReadWrite.All"

# Upload photo for a single user
$userId = "user@contoso.com"
$photoPath = "C:\Photos\user-photo.jpg"
Set-MgUserPhotoContent -UserId $userId -InFile $photoPath

# Bulk upload from CSV
$users = Import-Csv "C:\users-with-photos.csv"
# CSV format: Email,PhotoPath

foreach ($user in $users) {
    try {
        Set-MgUserPhotoContent -UserId $user.Email -InFile $user.PhotoPath
        Write-Host "✅ Uploaded photo for $($user.Email)"
    }
    catch {
        Write-Host "❌ Failed for $($user.Email): $_"
    }
}
```

### Method 4: Microsoft 365 Admin Center

1. Go to [admin.microsoft.com](https://admin.microsoft.com)
2. Navigate to **Users** → **Active users**
3. Select a user
4. Click on the profile photo area
5. Upload photo
6. Save

## 🔧 Configure App Registration for Photo Access

Your Azure AD app registration needs permissions to access the `picture` claim:

### Step 1: Add API Permissions

1. Go to **Azure Portal** → **App registrations**
2. Select your app
3. Go to **API permissions**
4. Click **+ Add a permission**
5. Select **Microsoft Graph** → **Delegated permissions**
6. Add these permissions:
   - `User.Read` (basic profile)
   - `User.ReadBasic.All` (optional, for reading other users)
7. Click **Grant admin consent**

### Step 2: Configure Token Claims

The `picture` claim is **automatically included** in the ID token when:
- User has a profile photo in Entra ID
- App requests `openid` and `profile` scopes
- User authenticates during issuance

### Step 3: Update Rules Definition

Ensure your `rules-definition.json` uses `idTokens` attestation:

```json
{
  "attestations": {
    "idTokens": [
      {
        "clientId": "YOUR_APP_CLIENT_ID",
        "configuration": "https://login.microsoftonline.com/TENANT_ID/v2.0/.well-known/openid-configuration",
        "redirectUri": "https://your-app.com/callback",
        "scope": "openid profile",
        "mapping": [
          {
            "outputClaim": "photo",
            "required": true,
            "inputClaim": "$.picture",
            "indexed": false
          }
        ]
      }
    ]
  }
}
```

## 📋 Photo Requirements

### Technical Specifications

- **Format**: JPEG or PNG
- **Recommended size**: 648x648 pixels (Entra ID default)
- **Min size**: 200x200 pixels
- **Max size**: 4MB (in Entra ID), but will be resized for credential
- **Aspect ratio**: 1:1 (square)
- **Color**: RGB

### Quality Guidelines for Face Check

✅ **Best Practices:**
- Clear, high-resolution photo
- Face centered and directly facing camera
- Good lighting (no harsh shadows)
- Neutral expression
- No glasses glare or sunglasses
- Plain, solid background
- Recent photo (within 6 months)

❌ **Avoid:**
- Blurry or pixelated images
- Group photos
- Side profile or angled shots
- Filters or heavy editing
- Face obstructions (hats, masks)
- Low contrast or poor lighting

## 🧪 Testing Photo Retrieval

### Test 1: Verify Photo in Entra ID

```javascript
const { Client } = require('@microsoft/microsoft-graph-client');

async function verifyUserPhoto(userId) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  try {
    // Get photo metadata
    const photoMetadata = await client
      .api(`/users/${userId}/photo`)
      .get();
    
    console.log('✅ Photo exists in Entra ID');
    console.log('Size:', photoMetadata.height, 'x', photoMetadata.width);
    
    // Get photo data
    const photoBlob = await client
      .api(`/users/${userId}/photo/$value`)
      .get();
    
    console.log('✅ Photo retrieved successfully');
    return true;
  }
  catch (error) {
    if (error.statusCode === 404) {
      console.log('❌ No photo found for user');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}
```

### Test 2: Verify Photo in ID Token

During credential issuance, check if the `picture` claim is present:

```javascript
app.post('/api/issue-credential', async (req, res) => {
  // User authenticates with Entra ID
  // After authentication, decode the ID token:
  
  const decoded = jwt.decode(idToken);
  
  if (decoded.picture) {
    console.log('✅ Picture claim found in ID token');
    console.log('Photo size:', decoded.picture.length, 'characters');
  } else {
    console.log('❌ No picture claim in ID token');
    console.log('User may not have a profile photo in Entra ID');
  }
});
```

### Test 3: Issue Test Credential

1. Start your application
2. Initiate credential issuance
3. User authenticates with Entra ID
4. Check logs for photo claim
5. Issue credential
6. Open credential in Microsoft Authenticator
7. Verify photo is included

## 🔐 Security & Privacy

### Photo Storage

- Photos in Entra ID are stored securely by Microsoft
- Access controlled via Azure AD permissions
- Audit logs track photo access

### Photo in Credentials

- Photo embedded in credential as base64
- Credential stored locally in Microsoft Authenticator
- Photo not indexed in searchable claims (`"indexed": false`)
- Photo only used for Face Check, not displayed in UI

### Compliance

- **GDPR**: Users have right to access, update, delete photo
- **BIPA**: Biometric data (face) requires explicit consent
- **Data Minimization**: Only include photo if Face Check is needed
- **Retention**: Credentials expire based on `validityInterval`

### Best Practices

✅ **Do:**
- Inform users that photo will be included in credential
- Provide mechanism to update photo in Entra ID
- Document photo usage in privacy policy
- Allow users to opt-out if Face Check is optional
- Regularly audit photo access logs

❌ **Don't:**
- Cache or store photos outside Entra ID
- Share photos with third parties
- Use photos for purposes beyond Face Check
- Keep photos after credential expiry

## 🐛 Troubleshooting

### Issue: Photo Not Included in Credential

**Possible causes:**
1. User doesn't have photo in Entra ID profile
2. App doesn't request `profile` scope
3. Rules definition doesn't map `$.picture` claim
4. Photo claim not marked as required

**Solutions:**
```bash
# Check if user has photo
curl -H "Authorization: Bearer $TOKEN" \
  https://graph.microsoft.com/v1.0/users/user@contoso.com/photo

# Verify photo in ID token
# Add logging to decode ID token and check for 'picture' claim

# Update rules-definition.json to map $.picture → photo
```

### Issue: Face Check Fails Despite Photo in Credential

**Possible causes:**
1. Poor quality profile photo
2. Photo too old (doesn't match current appearance)
3. Different lighting/angle in profile photo vs selfie

**Solutions:**
- Update profile photo with recent, clear image
- Follow photo quality guidelines
- Ensure face is clearly visible in profile photo

### Issue: "Picture" Claim Missing from ID Token

**Possible causes:**
1. App not requesting `profile` scope
2. User hasn't consented to profile scope
3. Entra ID profile photo not synced

**Solutions:**
```javascript
// Ensure app requests correct scopes
const authConfig = {
  scopes: ['openid', 'profile', 'email']
};

// Check consent in Azure Portal
// App registrations → Your app → API permissions → Grant consent
```

## 📊 Monitoring & Analytics

### Track Photo Availability

```javascript
async function checkPhotoAvailability(tenantId) {
  const users = await getAllUsers(tenantId);
  let withPhoto = 0;
  let withoutPhoto = 0;

  for (const user of users) {
    const hasPhoto = await verifyUserPhoto(user.id);
    if (hasPhoto) {
      withPhoto++;
    } else {
      withoutPhoto++;
    }
  }

  console.log('📊 Photo availability:');
  console.log(`✅ With photo: ${withPhoto} (${(withPhoto/users.length*100).toFixed(1)}%)`);
  console.log(`❌ Without photo: ${withoutPhoto} (${(withoutPhoto/users.length*100).toFixed(1)}%)`);
}
```

### Monitor Issuance Failures

Track credentials that fail to issue due to missing photos:

```javascript
app.post('/api/issuance-callback', (req, res) => {
  const { requestStatus, error } = req.body;

  if (requestStatus === 'issuance_failed') {
    if (error?.code === 'missing_required_claim' && error?.claim === 'photo') {
      console.log('❌ Issuance failed: User has no photo in Entra ID');
      // Track metric
      // Send notification to admin
    }
  }

  res.status(200).send();
});
```

## ✅ Deployment Checklist

Before deploying Face Check with Entra ID photos:

- [ ] All users have profile photos uploaded to Entra ID
- [ ] Photos meet quality guidelines (clear face, good lighting)
- [ ] App registration has correct API permissions
- [ ] Admin consent granted for permissions
- [ ] Rules definition maps `$.picture` to `photo` claim
- [ ] Photo claim marked as required
- [ ] Test issuance works with user photos
- [ ] Face Check tested with issued credentials
- [ ] Privacy policy updated for photo usage
- [ ] User notification sent about photo requirement
- [ ] Monitoring set up for missing photo errors
- [ ] Support process for users to update photos

---

**Your Entra ID is now configured to provide photos for Face Check!** 🎉

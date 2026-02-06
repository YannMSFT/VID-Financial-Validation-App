# Contoso Finance Portal with Verified ID

> **⚠️ WARNING: TESTING PURPOSE ONLY**  
> This application is a demonstration/proof-of-concept and is **NOT PRODUCTION READY**. It is intended for testing, learning, and evaluation purposes only. Do not use this application with real financial data or in production environments without proper security hardening, testing, and compliance validation.

A demo financial web application for Contoso Corporation that integrates with Microsoft Entra Verified ID to verify CFO identity before processing high-value financial transactions between company entities.

## Features

- **Entity Management Dashboard**: View all Contoso company entities and their budget status
- **Financial Transaction Processing**: Secure transactions between Contoso departments and subsidiaries
- **CFO Approval Workflow**: Automatic CFO verification for transactions over $50,000
- **Face Check Biometric Verification**: Real-time facial recognition to verify credential holder identity
- **QR Code Integration**: Easy verification via Microsoft Authenticator mobile app
- **Transaction History**: Complete audit trail of all financial transactions
- **Budget Monitoring**: Real-time budget tracking across all Contoso entities

## Architecture

- **Frontend**: React.js with modern UI for Contoso's internal finance operations
- **Backend**: Node.js with Express.js for transaction processing
- **Authentication**: Microsoft Entra Verified ID for CFO approval workflow
- **QR Code Generation**: Integrated QR code display for mobile verification

## Prerequisites

- Node.js 16+ and npm
- Microsoft Entra Verified ID tenant setup
- Microsoft Authenticator app (for testing)

## Setup Instructions

1. **Clone and Install Dependencies**
   ```powershell
   cd "c:\Users\yaduchen\OneDrive - Microsoft\Dev\FY26\VID Verifying app"
   npm run install-all
   ```

2. **Configure Environment Variables**
   ```powershell
   cp .env.example .env
   ```
   Update `.env` with your Microsoft Entra Verified ID configuration:
   - `VERIFIER_AUTHORITY`: Your verifier DID
   - `ISSUER_AUTHORITY`: Your issuer DID  
   - `CREDENTIAL_TYPE`: The credential type to request
   - `API_KEY`: Your API key for webhooks

3. **Run the Application**
   ```powershell
   npm run dev
   ```
   
   This starts both the backend server (port 5000) and React frontend (port 3000).

4. **Access the Application**
   Open http://localhost:3000 in your browser

## Usage Flow

1. **Browse Entities**: View Contoso company entities and their budget status
2. **Create Transaction**: Select source and destination entities and enter transaction details
3. **Automatic Verification**: Transactions over $50,000 trigger CFO identity verification
4. **QR Code Scan**: Use Microsoft Authenticator to scan the QR code
5. **Face Check**: Complete biometric Face Check to verify your identity
6. **Transaction Approved**: View success confirmation with approver name and Face Check score

## Project Structure

```
├── server/
│   └── index.js              # Express backend server
├── client/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.js           # Main application component
│   │   └── App.css          # Styling
│   └── public/              # Static assets
├── package.json             # Backend dependencies
└── README.md               # This file
```

## API Endpoints

- `GET /api/entities` - Get company entities and budget status
- `POST /api/verify` - Initiate CFO identity verification
- `GET /api/verification-status/:id` - Check verification status (polling)
- `POST /api/verification-callback` - Webhook for verification results from Entra Verified ID
- `POST /api/transactions` - Process financial transaction
- `GET /api/transactions` - Get transaction history
- `POST /api/simulate-verification/:id` - Simulate verification (local development only)

## Verified ID Integration

The application integrates with Microsoft Entra Verified ID through:

1. **Verification Request**: Creates a presentation request with QR code
2. **Mobile Flow**: Users scan QR code with Microsoft Authenticator
3. **Face Check Biometric**: User takes a selfie that's compared against the credential photo
4. **Credential Verification**: Backend validates the presented credential and face match
5. **Order Authorization**: Successful verification authorizes the transaction

### Face Check Implementation

This application requires **Face Check** during credential verification for enhanced security:

- **Biometric Verification**: Users must take a selfie that matches their credential photo
- **Match Confidence**: 70% threshold (configurable) for face matching
- **Photo Requirement**: Credentials must include a `photo` claim with base64-encoded image
- **Privacy**: Face images are processed but not stored by Microsoft

📄 See [FACE_CHECK_IMPLEMENTATION.md](./FACE_CHECK_IMPLEMENTATION.md) for detailed implementation guide

## Security Features

- **Threshold-based verification**: Only high-value orders require ID verification
- **Webhook validation**: Secure callback handling for verification results
- **Order correlation**: Links verification sessions to specific orders
- **Credential validation**: Ensures authenticity of presented credentials

## Development Notes

**⚠️ IMPORTANT: This is a demonstration application for testing purposes only.**

**Security Considerations for Production Use:**
- Implement proper database storage with encryption
- Add comprehensive user authentication and authorization
- Set up secure session management
- Implement input validation and sanitization
- Add rate limiting and DDoS protection
- Configure proper HTTPS endpoints with valid certificates
- Set up production-ready Microsoft Entra Verified ID tenant
- Implement comprehensive logging and monitoring
- Add error handling and graceful failure modes
- Conduct security audits and penetration testing
- Implement proper backup and disaster recovery
- Add compliance controls for financial regulations

**Current Limitations:**
- Uses in-memory storage (data is lost on restart)
- Minimal error handling
- No user authentication
- Uses ngrok for development (not suitable for production)
- No input validation on financial amounts
- No audit logging
- No encryption of sensitive data

## Testing

To test the verification flow:

1. Set up Microsoft Entra Verified ID in your tenant
2. Issue test credentials to your Microsoft Authenticator app
3. Create a transaction over $50,000 to trigger verification
4. Scan the QR code and complete Face Check
5. Verify the transaction completes with approver name and Face Check score displayed

## Support

For questions about Microsoft Entra Verified ID integration, refer to:
- [Microsoft Entra Verified ID Documentation](https://docs.microsoft.com/en-us/azure/active-directory/verifiable-credentials/)
- [Verified ID Developer Samples](https://github.com/Azure-Samples/active-directory-verifiable-credentials)

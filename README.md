# Contoso Finance Portal with Verified ID

A demo financial web application for Contoso Corporation that integrates with Microsoft Entra Verified ID to verify CFO identity before processing high-value financial transactions between company entities.

## Features

- **Entity Management Dashboard**: View all Contoso company entities and their budget status
- **Financial Transaction Processing**: Secure transactions between Contoso departments and subsidiaries
- **CFO Approval Workflow**: Automatic CFO verification for transactions over $50,000
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

1. **Browse Stocks**: View available stocks with real-time pricing
2. **Place Order**: Select a stock and create an order
3. **Automatic Verification**: Orders over $10,000 trigger identity verification
4. **QR Code Scan**: Use Microsoft Authenticator to scan the QR code
5. **Share Credential**: Present your verified credential via the mobile app
6. **Complete Transaction**: Order is processed after successful verification

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

- `GET /api/stocks` - Get available stocks
- `POST /api/verify` - Initiate identity verification
- `GET /api/verify/:id/status` - Check verification status
- `POST /api/verification-callback` - Webhook for verification results
- `POST /api/orders` - Place trading order
- `GET /api/orders` - Get order history

## Verified ID Integration

The application integrates with Microsoft Entra Verified ID through:

1. **Verification Request**: Creates a presentation request with QR code
2. **Mobile Flow**: Users scan QR code with Microsoft Authenticator
3. **Credential Verification**: Backend validates the presented credential
4. **Order Authorization**: Successful verification authorizes the transaction

## Security Features

- **Threshold-based verification**: Only high-value orders require ID verification
- **Webhook validation**: Secure callback handling for verification results
- **Order correlation**: Links verification sessions to specific orders
- **Credential validation**: Ensures authenticity of presented credentials

## Development Notes

This is a demonstration application. For production use:

- Implement proper database storage
- Add user authentication and sessions  
- Enhance error handling and logging
- Configure proper HTTPS endpoints
- Set up production-ready Verified ID tenant
- Implement additional security measures

## Testing

To test the verification flow:

1. Set up Microsoft Entra Verified ID in your tenant
2. Issue test credentials to your Microsoft Authenticator app
3. Place an order over $10,000 to trigger verification
4. Scan the QR code and present your credential
5. Verify the order completes successfully

## Support

For questions about Microsoft Entra Verified ID integration, refer to:
- [Microsoft Entra Verified ID Documentation](https://docs.microsoft.com/en-us/azure/active-directory/verifiable-credentials/)
- [Verified ID Developer Samples](https://github.com/Azure-Samples/active-directory-verifiable-credentials)

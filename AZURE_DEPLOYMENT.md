# Azure App Service Deployment Guide

This guide explains how to deploy the Contoso Finance Portal to Azure App Service.

## Prerequisites

Before deploying, ensure you have:

1. **Azure Subscription** - An active Azure subscription
2. **Azure CLI** - Installed and logged in (`az login`)
3. **Node.js 18+** - For local testing
4. **Git** - For deployment via Git push

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure App Service                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Node.js Server                      │   │
│  │                  (server/index.js)                    │   │
│  │                                                       │   │
│  │  ┌─────────────┐    ┌──────────────────────────┐    │   │
│  │  │   API       │    │   React Static Files     │    │   │
│  │  │  /api/*     │    │   (client/build)         │    │   │
│  │  └─────────────┘    └──────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Microsoft Entra Verified ID                     │
│                  (Callback URL points to App Service)       │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Create Azure Resources

### Option A: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Web App**
3. Configure:
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `contoso-finance-portal` (must be globally unique)
   - **Publish**: Code
   - **Runtime stack**: Node 18 LTS
   - **Operating System**: Windows (recommended) or Linux
   - **Region**: Choose closest to your users
   - **App Service Plan**: Create new or use existing (B1 or higher recommended)
4. Click **Review + Create** → **Create**

### Option B: Using Azure CLI

```bash
# Set variables
RESOURCE_GROUP="contoso-finance-rg"
APP_NAME="contoso-finance-portal"  # Must be globally unique
LOCATION="eastus"
APP_SERVICE_PLAN="contoso-finance-plan"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service plan (B1 tier for production)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "NODE:18-lts"
```

## Step 2: Configure Environment Variables

### Required Environment Variables

Configure these in Azure App Service → **Configuration** → **Application settings**:

| Name | Description | Example |
|------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `TENANT_ID` | Your Azure AD Tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CLIENT_ID` | App Registration Client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CLIENT_SECRET` | App Registration Secret | `your-secret-value` |
| `BASE_URL` | Your App Service URL | `https://contoso-finance-portal.azurewebsites.net` |
| `VERIFIED_ID_AUTHORITY` | Verified ID Authority | `did:web:your-tenant.verifiedid.entra.microsoft.com` |
| `CREDENTIAL_TYPE` | Credential type to verify | `CFOCredential` |
| `FACE_CHECK_ENABLED` | Enable face check | `true` |

### Using Azure CLI

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV="production" \
    TENANT_ID="your-tenant-id" \
    CLIENT_ID="your-client-id" \
    CLIENT_SECRET="your-client-secret" \
    BASE_URL="https://$APP_NAME.azurewebsites.net" \
    VERIFIED_ID_AUTHORITY="did:web:your-tenant.verifiedid.entra.microsoft.com" \
    CREDENTIAL_TYPE="CFOCredential" \
    FACE_CHECK_ENABLED="true"
```

## Step 3: Configure Startup Command

For Linux App Service, set the startup command:

```bash
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "npm run start"
```

## Step 4: Deploy the Application

### Option A: Deploy via Git (Recommended)

1. **Enable Local Git deployment:**
   ```bash
   az webapp deployment source config-local-git \
     --name $APP_NAME \
     --resource-group $RESOURCE_GROUP
   ```

2. **Get deployment credentials:**
   ```bash
   az webapp deployment list-publishing-credentials \
     --name $APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --query "{username: publishingUserName, password: publishingPassword}"
   ```

3. **Add Azure as a Git remote:**
   ```bash
   git remote add azure https://<username>@$APP_NAME.scm.azurewebsites.net/$APP_NAME.git
   ```

4. **Deploy:**
   ```bash
   git push azure main
   ```

### Option B: Deploy via ZIP

1. **Build the application locally:**
   ```bash
   npm install
   npm run build:production
   ```

2. **Create deployment package:**
   ```bash
   # On Windows (PowerShell)
   Compress-Archive -Path * -DestinationPath deploy.zip -Force
   
   # On Linux/Mac
   zip -r deploy.zip . -x "node_modules/*" -x ".git/*"
   ```

3. **Deploy:**
   ```bash
   az webapp deployment source config-zip \
     --name $APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --src deploy.zip
   ```

### Option C: Deploy via GitHub Actions

1. Go to Azure Portal → Your Web App → **Deployment Center**
2. Select **GitHub** as source
3. Authorize and select your repository
4. Azure will create a workflow file automatically

## Step 5: Update Microsoft Entra Verified ID Configuration

After deployment, update your Verified ID configuration:

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. Navigate to **Verified ID** → **Organization settings**
3. Update the **Callback URL** to: `https://your-app-name.azurewebsites.net/api/verification-callback`

## Step 6: Verify Deployment

1. **Check application logs:**
   ```bash
   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
   ```

2. **Open the application:**
   ```bash
   az webapp browse --name $APP_NAME --resource-group $RESOURCE_GROUP
   ```

3. **Test the verification flow:**
   - Create a transaction over $50,000
   - Scan the QR code with Microsoft Authenticator
   - Complete the verification

## Troubleshooting

### Common Issues

#### 1. Application not starting
- Check logs: `az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP`
- Verify Node.js version is 18+
- Ensure all environment variables are set

#### 2. Verification callback not working
- Ensure `BASE_URL` matches your App Service URL exactly
- Check that the callback URL is publicly accessible
- Verify CORS settings if issues persist

#### 3. Build failures
- Check the deployment logs in Kudu: `https://your-app.scm.azurewebsites.net`
- Ensure `client/package.json` has all required dependencies
- Try building locally first: `npm run build:production`

#### 4. 502 Bad Gateway
- Check if the app is running: `az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query state`
- Restart the app: `az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP`
- Check memory limits and consider upgrading the App Service plan

### Viewing Logs

```bash
# Real-time logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP

# Enable detailed logging
az webapp log config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true \
  --web-server-logging filesystem
```

## Scaling

### Vertical Scaling (Scale Up)
Change to a higher tier for more resources:
```bash
az appservice plan update \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku P1V2
```

### Horizontal Scaling (Scale Out)
Add more instances:
```bash
az appservice plan update \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --number-of-workers 3
```

## Custom Domain & SSL

### Add Custom Domain
```bash
az webapp config hostname add \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname www.yourdomain.com
```

### Enable HTTPS Only
```bash
az webapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --https-only true
```

## Cost Optimization

- **Development/Testing**: Use F1 (Free) or B1 (Basic) tiers
- **Production**: Use P1V2 or higher for better performance
- **Auto-scaling**: Configure scaling rules to handle traffic spikes
- **Always On**: Enable for production to prevent cold starts

## Security Recommendations

1. **Enable HTTPS Only**: Force all traffic through HTTPS
2. **Use Key Vault**: Store secrets in Azure Key Vault instead of app settings
3. **Enable Authentication**: Consider Azure AD authentication for admin access
4. **Network Security**: Use VNet integration for additional security
5. **Monitoring**: Enable Application Insights for monitoring and alerts

## Related Documentation

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Microsoft Entra Verified ID Documentation](https://docs.microsoft.com/azure/active-directory/verifiable-credentials/)
- [Node.js on Azure](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)

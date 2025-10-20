# Application Startup Scripts

This folder contains convenient scripts to start the entire VID Financial Validation application.

## 🚀 Quick Start Scripts

### Option 1: Quick Start (Recommended)
**File:** `quick-start.ps1`

Starts all services in minimized windows and opens the app in your browser.

```powershell
.\quick-start.ps1
```

**What it does:**
- ✅ Cleans up any existing processes
- ✅ Starts ngrok tunnel on port 5000
- ✅ Automatically updates BASE_URL in `.env` with current ngrok URL
- ✅ Starts backend server (port 5000)
- ✅ Starts frontend server (port 3000)
- ✅ Opens http://localhost:3000 in your browser

### Option 2: Full Start (With Status Windows)
**File:** `start-app.ps1`

Starts all services in separate PowerShell windows so you can monitor logs.

```powershell
.\start-app.ps1
```

**What it does:**
- ✅ Same as Quick Start
- ✅ Opens separate terminal windows for backend and frontend
- ✅ Displays detailed startup progress
- ✅ Shows summary of all running services

## 📋 Manual Start (Step by Step)

If you prefer to start services manually:

### 1. Start ngrok
```powershell
ngrok http 5000
```
Copy the HTTPS URL and update `server\.env` → `BASE_URL`

### 2. Start Backend
```powershell
cd server
node index.js
```

### 3. Start Frontend
```powershell
cd client
npm start
```

## 🛑 Stopping the Application

### Stop All Services
```powershell
# Stop ngrok
Get-Process ngrok | Stop-Process -Force

# Stop backend (port 5000)
$port = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($port) { Stop-Process -Id $port -Force }

# Stop frontend (port 3000)
$port = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($port) { Stop-Process -Id $port -Force }
```

Or simply close the PowerShell windows where the services are running.

## 📊 Service URLs

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend** | http://localhost:5000 | API server |
| **Ngrok Public** | https://xxxxx.ngrok-free.app | Public callback URL |
| **Ngrok Inspector** | http://localhost:4040 | View ngrok traffic |

## 🔧 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```powershell
# Check what's using port 3000 or 5000
Get-NetTCPConnection -LocalPort 3000 -State Listen
Get-NetTCPConnection -LocalPort 5000 -State Listen

# Kill the process
Stop-Process -Id <PID> -Force
```

### Ngrok Session Limit
If ngrok says "limited to 1 session":
```powershell
# Stop all ngrok processes
Get-Process ngrok | Stop-Process -Force

# Then restart
ngrok http 5000
```

### Frontend Won't Start
```powershell
cd client
npm install  # Reinstall dependencies
npm start
```

### Backend Authentication Fails
Check that `server\.env` has valid credentials:
- `TENANT_ID` - Your Azure AD tenant ID
- `CLIENT_ID` - Your app registration ID
- `CLIENT_SECRET` - Your app secret
- `VERIFIER_AUTHORITY` - Your Verified ID DID

## 💡 Tips

1. **Always use Quick Start** - It handles everything automatically
2. **Check ngrok URL** - Make sure `BASE_URL` in `.env` matches current ngrok URL
3. **Monitor logs** - Watch the backend terminal for Verified ID API responses
4. **Use Ngrok Inspector** - Visit http://localhost:4040 to debug webhooks

## 🎯 First Time Setup

Before running the scripts, make sure you have:

1. **Node.js installed** (v14 or higher)
2. **ngrok installed** and in your PATH
3. **Dependencies installed**:
   ```powershell
   cd server
   npm install
   cd ../client
   npm install
   ```
4. **Valid `.env` configuration** in the `server` folder

---

**Need help?** Check the main README.md or the documentation files in the project root.

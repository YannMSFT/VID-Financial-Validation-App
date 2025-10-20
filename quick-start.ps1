# Quick Start Script (runs in background)
# This script starts all services reliably

Write-Host "`n🚀 Starting VID Financial Validation App...`n" -ForegroundColor Cyan

# Kill any existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Start ngrok
Write-Host "Starting ngrok..." -ForegroundColor Yellow
Start-Process -FilePath "ngrok" -ArgumentList "http", "5000" -WindowStyle Hidden
Start-Sleep -Seconds 4

# Get ngrok URL and update .env
try {
    $ngrokData = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
    $ngrokUrl = $ngrokData.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1 -ExpandProperty public_url
    Write-Host "✅ Ngrok URL: $ngrokUrl" -ForegroundColor Green
    
    # Update .env
    $envPath = Join-Path $PSScriptRoot "server\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        $envContent = $envContent -replace 'BASE_URL=https://.*\.ngrok-free\.app', "BASE_URL=$ngrokUrl"
        Set-Content $envPath -Value $envContent -NoNewline
        Write-Host "✅ Updated BASE_URL in server\.env" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not update ngrok URL" -ForegroundColor Yellow
}

# Start backend in new window
Write-Host "Starting backend server..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "server"
Start-Process powershell -ArgumentList @(
    "-NoExit"
    "-Command"
    "cd '$backendPath'; Write-Host '🔧 Backend Server Starting...' -ForegroundColor Cyan; node index.js"
) -WindowStyle Normal
Start-Sleep -Seconds 4

# Verify backend is running
$backendRunning = $false
for ($i = 0; $i -lt 10; $i++) {
    $connection = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "✅ Backend server running on port 5000" -ForegroundColor Green
        $backendRunning = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $backendRunning) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    exit 1
}

# Start frontend in new window  
Write-Host "Starting frontend..." -ForegroundColor Yellow
$clientPath = Join-Path $PSScriptRoot "client"
Start-Process powershell -ArgumentList @(
    "-NoExit"
    "-Command"
    "cd '$clientPath'; Write-Host '⚛️  React Frontend Starting...' -ForegroundColor Cyan; npm start"
) -WindowStyle Normal
Start-Sleep -Seconds 8

# Verify frontend is running
$frontendRunning = $false
for ($i = 0; $i -lt 20; $i++) {
    $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "✅ Frontend running on port 3000" -ForegroundColor Green
        $frontendRunning = $true
        break
    }
    Write-Host "  Waiting for frontend to compile... ($i/20)" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $frontendRunning) {
    Write-Host "⚠️  Frontend may still be starting. Check the React window." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Application Started!" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📱 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  🔧 Backend:   http://localhost:5000" -ForegroundColor White
if ($ngrokUrl) {
    Write-Host "  🌐 Public:    $ngrokUrl" -ForegroundColor White
}
Write-Host "  🔍 Ngrok UI:  http://localhost:4040" -ForegroundColor White
Write-Host ""
Write-Host "  Two PowerShell windows opened:" -ForegroundColor Yellow
Write-Host "    - Backend Server (port 5000)" -ForegroundColor Yellow
Write-Host "    - Frontend React App (port 3000)" -ForegroundColor Yellow
Write-Host ""

# Open browser after a delay
Start-Sleep -Seconds 3
if ($frontendRunning) {
    Write-Host "Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
} else {
    Write-Host "Frontend still compiling. Browser will open automatically when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit this script (services will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

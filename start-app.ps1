# Start Application Script
# This script starts ngrok, backend server, and frontend in the correct order

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting VID Financial Validation App" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check if ngrok is already running
Write-Host "Step 1: Checking ngrok status..." -ForegroundColor Yellow
$ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "  ✅ ngrok is already running" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  ngrok not running, starting it..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000" -WindowStyle Normal
    Write-Host "  ⏳ Waiting for ngrok to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Write-Host "  ✅ ngrok started" -ForegroundColor Green
}

# Get current ngrok URL
try {
    $ngrokData = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $ngrokUrl = $ngrokData.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1 -ExpandProperty public_url
    Write-Host "  🌐 Ngrok URL: $ngrokUrl" -ForegroundColor Green
    
    # Update .env file with current ngrok URL
    $envPath = "server\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        $envContent = $envContent -replace 'BASE_URL=https://.*\.ngrok-free\.app', "BASE_URL=$ngrokUrl"
        Set-Content $envPath -Value $envContent -NoNewline
        Write-Host "  ✅ Updated BASE_URL in server\.env" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Could not get ngrok URL (ngrok may still be starting)" -ForegroundColor Yellow
}

# Step 2: Start backend server
Write-Host "`nStep 2: Starting backend server..." -ForegroundColor Yellow

# Check if server is already running
$serverProcess = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($serverProcess) {
    Write-Host "  ⚠️  Port 5000 is already in use, stopping existing process..." -ForegroundColor Yellow
    $pid = $serverProcess.OwningProcess
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 2
}

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; node index.js" -WindowStyle Normal
Write-Host "  ⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "  ✅ Backend server started on port 5000" -ForegroundColor Green

# Step 3: Start frontend
Write-Host "`nStep 3: Starting frontend..." -ForegroundColor Yellow

# Check if frontend is already running
$frontendProcess = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontendProcess) {
    Write-Host "  ⚠️  Port 3000 is already in use, stopping existing process..." -ForegroundColor Yellow
    $pid = $frontendProcess.OwningProcess
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 2
}

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm start" -WindowStyle Normal
Write-Host "  ⏳ Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "  ✅ Frontend started on port 3000" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Application Started Successfully! 🚀" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📱 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  🔧 Backend:   http://localhost:5000" -ForegroundColor White
if ($ngrokUrl) {
    Write-Host "  🌐 Public:    $ngrokUrl" -ForegroundColor White
}
Write-Host "  🔍 Ngrok UI:  http://localhost:4040" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop this script" -ForegroundColor Yellow
Write-Host "  (Note: Backend and Frontend will continue running in separate windows)" -ForegroundColor Yellow
Write-Host ""

# Keep script running
Write-Host "✅ All services started. You can close this window or press Ctrl+C." -ForegroundColor Green
Read-Host "Press Enter to exit"

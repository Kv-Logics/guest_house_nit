# Run both backend and frontend servers in the same PowerShell window

Write-Host "Starting Guest House Management System..." -ForegroundColor Cyan

# Start backend dev server via cmd.exe
$backend = Start-Process cmd.exe -ArgumentList "/c npm run dev" -WorkingDirectory "backend" -NoNewWindow -PassThru

# Start frontend dev server via cmd.exe
$frontend = Start-Process cmd.exe -ArgumentList "/c npm run dev" -WorkingDirectory "frontend" -NoNewWindow -PassThru

# Handle clean shutdown on Ctrl+C
try {
    Write-Host "Both servers are running in this window. Press Ctrl+C to stop them." -ForegroundColor Green
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    if ($backend) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontend) {
        Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Servers stopped." -ForegroundColor Red
}

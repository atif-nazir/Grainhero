# GrainHero Deployment Script
Write-Host "🚀 Deploying GrainHero..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "✅ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python first." -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location farmHomeBackend-main
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    exit 1
}

# Install Python ML dependencies
Write-Host "🐍 Installing Python ML dependencies..." -ForegroundColor Yellow
Set-Location ml
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python ML dependency installation failed" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ../farmHomeFrontend-main
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path "../farmHomeBackend-main/.env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    @"
# Database Configuration
MONGO_USER=your_mongo_username
MONGO_PASS=your_mongo_password
DATABASE_NAME=grainhero

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONT_END_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
"@ | Out-File -FilePath "../farmHomeBackend-main/.env" -Encoding UTF8
    Write-Host "✅ .env file created. Please update with your actual values." -ForegroundColor Green
}

Write-Host "🎉 Deployment setup complete!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update farmHomeBackend-main/.env with your MongoDB credentials" -ForegroundColor White
Write-Host "2. Start backend: cd farmHomeBackend-main && npm start" -ForegroundColor White
Write-Host "3. Start frontend: cd farmHomeFrontend-main && npm run dev" -ForegroundColor White

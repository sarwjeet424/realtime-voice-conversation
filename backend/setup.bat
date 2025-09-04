@echo off
echo 🚀 Setting up Advanced Voice Chat Backend...

REM Check if Redis is running
echo 📡 Checking Redis connection...
docker ps | findstr redis >nul
if %errorlevel% equ 0 (
    echo ✅ Redis is running
) else (
    echo ❌ Redis not found. Please run: docker run -d -p 6379:6379 redis:alpine
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

REM Push database schema
echo 🗄️ Setting up database schema...
npx prisma db push

REM Check database connection
echo 🔍 Testing database connection...
npx prisma db pull

echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Add your API keys to .env file:
echo    - OPENAI_API_KEY=your_key_here
echo    - ELEVENLABS_API_KEY=your_key_here
echo.
echo 2. Start the backend:
echo    npm run start:dev
echo.
echo 3. Start the frontend:
echo    cd ../frontend ^&^& npm start
pause

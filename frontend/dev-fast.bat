@echo off
echo 🚀 Optimizing frontend development environment...

REM Clear any existing build cache
echo 🧹 Clearing build cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist build rmdir /s /q build
if exist .tsbuildinfo del .tsbuildinfo

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

echo ✅ Environment optimized! Starting development server...
echo 💡 Tips for faster development:
echo    - Source maps are disabled for faster builds
echo    - TypeScript strict mode is disabled for faster compilation
echo    - Fast refresh is enabled for instant updates
echo    - ESLint errors won't block development

REM Start the development server with optimizations
npm run dev:fast

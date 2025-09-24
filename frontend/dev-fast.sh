#!/bin/bash

# Development optimization script for faster frontend startup
echo "🚀 Optimizing frontend development environment..."

# Clear any existing build cache
echo "🧹 Clearing build cache..."
rm -rf node_modules/.cache
rm -rf build
rm -f .tsbuildinfo

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Environment optimized! Starting development server..."
echo "💡 Tips for faster development:"
echo "   - Source maps are disabled for faster builds"
echo "   - TypeScript strict mode is disabled for faster compilation"
echo "   - Fast refresh is enabled for instant updates"
echo "   - ESLint errors won't block development"

# Start the development server with optimizations
npm run dev:fast

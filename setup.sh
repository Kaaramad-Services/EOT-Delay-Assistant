#!/bin/bash
# EOT Delay Assistant — First-time setup script
# Run: bash setup.sh

echo ""
echo "======================================"
echo "  EOT & Delay Analysis Assistant"
echo "  Setup Script"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (version 18+)"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created backend/.env from template"
  echo "  → Add your GEMINI_API_KEY to backend/.env for AI narrative generation"
  echo "    Get a free key at: https://aistudio.google.com"
fi
cd ..

echo ""

# Frontend setup
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✓ Frontend dependencies installed"
cd ..

echo ""
echo "======================================"
echo "  Setup complete!"
echo "======================================"
echo ""
echo "To run the tool:"
echo ""
echo "  Terminal 1 (backend):"
echo "  cd backend && npm start"
echo ""
echo "  Terminal 2 (frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "To deploy:"
echo "  1. Push to GitHub main branch"
echo "  2. Enable GitHub Pages (Settings → Pages → GitHub Actions)"
echo "  3. Connect backend to Render.com (free tier)"
echo "  4. Add GEMINI_API_KEY secret in both places"
echo ""

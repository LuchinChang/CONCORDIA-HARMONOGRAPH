#!/bin/bash

# ============================================================================
# The Celestial Harmonograph - Run Script
# ============================================================================

PORT=8000
URL="http://localhost:$PORT"

echo "🌌 The Celestial Harmonograph"
echo "=============================="
echo ""

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use."
    echo "   Opening browser to existing server..."
    echo ""
else
    echo "🚀 Starting server on port $PORT..."

    # Try Python 3 first, then Python 2
    if command -v python3 &> /dev/null; then
        python3 -m http.server $PORT &
        SERVER_PID=$!
    elif command -v python &> /dev/null; then
        python -m SimpleHTTPServer $PORT &
        SERVER_PID=$!
    else
        echo "❌ Error: Python is not installed."
        echo "   Please install Python or run manually with another server."
        exit 1
    fi

    # Wait a moment for server to start
    sleep 1

    echo "✅ Server running (PID: $SERVER_PID)"
    echo ""
fi

# Open browser
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    # macOS
    open "$URL"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$URL"
elif command -v start &> /dev/null; then
    # Windows (Git Bash)
    start "$URL"
else
    echo "   Please open $URL in your browser"
fi

echo ""
echo "📍 URL: $URL"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Keep script running to maintain server
if [ ! -z "$SERVER_PID" ]; then
    wait $SERVER_PID
fi

#!/bin/bash
# Run both backend and frontend servers in one window

echo "Starting Guest House Management System..."

# Start backend in the background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend in the background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Kill both background processes when Ctrl+C is pressed
trap "echo -e '\nStopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" SIGINT SIGTERM EXIT

# Keep script running to show output
wait

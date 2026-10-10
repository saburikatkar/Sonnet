@echo off
echo Starting Team Synora Backend...
start "Backend" cmd /k "cd %~dp0 && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo Starting Team Synora UI...
cd %~dp0ui
npm run dev

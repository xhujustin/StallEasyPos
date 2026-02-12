@echo off
cd backend
echo Running Backend Tests...
.\venv\Scripts\python -m pytest tests
pause

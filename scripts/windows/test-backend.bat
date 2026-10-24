@echo off
cd /d "%~dp0..\..\backend"
echo Running Backend Tests...
.\.venv\Scripts\python -m pytest tests
pause

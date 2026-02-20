@echo off
cd /d %~dp0

if not exist ".env" (
    echo Copying .env.example to .env...
    copy .env.example .env
)

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

if not exist "alembic.ini" (
    echo Initializing Alembic...
    alembic init migrations
)

echo Running database migrations...
alembic upgrade head

echo Running initial data (Store/Users)...
python -m app.initial_data

echo Running product seeding...
python -m app.seed_products

echo Setup Complete!
pause

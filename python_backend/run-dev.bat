@echo off
cd /d "%~dp0"
call connitor\Scripts\activate.bat 2>nul
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

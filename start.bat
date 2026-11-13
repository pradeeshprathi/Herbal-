@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto run

echo.
echo  First run - creating the Python environment, this takes a minute...
echo.

py -3 -m venv .venv 2>nul
if not exist ".venv\Scripts\python.exe" python -m venv .venv
if not exist ".venv\Scripts\python.exe" (
  echo.
  echo  Python was not found. Install Python 3.11 or newer from
  echo  https://www.python.org/downloads/  and tick
  echo  "Add python.exe to PATH" during the install, then run start.bat again.
  echo.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo  Could not install the requirements. Check the internet connection
  echo  and run start.bat again.
  echo.
  pause
  exit /b 1
)

:run
echo.
echo  Starting BUDDY herbal ... close this window to stop the website.
echo.
".venv\Scripts\python.exe" run.py --open
pause

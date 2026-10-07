@echo off
rem Dobbeltklikk for aa spille IRONCLASH ARENA lokalt paa Windows.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Fant ikke Node.js. Installer fra https://nodejs.org ^(LTS^) og proev igjen.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules call npm install
if not exist dist\index.html call npm run build
echo Starter spillet paa http://localhost:4173 - lukk dette vinduet for aa avslutte.
start "" http://localhost:4173
call npx vite preview --port 4173

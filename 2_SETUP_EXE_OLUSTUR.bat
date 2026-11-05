@echo off
chcp 65001 >nul
title NOVA Canli - Setup.exe olusturuluyor
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo [!] Once Node.js kur: https://nodejs.org & start https://nodejs.org & pause & exit /b 1 )
if not exist node_modules\electron (
  call npm install --save-dev electron@latest electron-builder@latest || goto hata
  call npm install --save ffmpeg-static@latest || goto hata
)
echo Kurulum dosyasi hazirlaniyor...
call npm run dist || goto hata
echo.
echo TAMAM! Kurulum dosyasi "dist" klasorunde: NOVA-Canli-Setup-x.x.x.exe
start "" "%~dp0dist"
pause
exit /b 0
:hata
echo [!] Hata olustu, yukaridaki mesajlari kontrol et.
pause

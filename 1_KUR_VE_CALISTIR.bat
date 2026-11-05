@echo off
chcp 65001 >nul
title NOVA Canli - Kurulum
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup bu dosyayi tekrar calistir.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules\electron (
  echo [1/2] Gerekli paketler indiriliyor ^(Electron + ffmpeg^). Ilk seferde birkac dakika surebilir...
  call npm install --save-dev electron@latest electron-builder@latest || goto hata
  call npm install --save ffmpeg-static@latest electron-updater@latest || goto hata
)
echo [2/2] NOVA Canli baslatiliyor...
call npm start
exit /b 0
:hata
echo [!] Paketler indirilemedi. Internet baglantini kontrol et.
pause

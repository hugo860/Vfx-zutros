@echo off
title Instalador VFX para Resolume
cd /d "%~dp0"
if not exist "%~dp0Instalar_VFX_Resolume.ps1" (
  echo No encuentro Instalar_VFX_Resolume.ps1 en esta carpeta.
  echo Pon INSTALAR_VFX.bat y Instalar_VFX_Resolume.ps1 juntos y vuelve a intentar.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar_VFX_Resolume.ps1" %*
echo.
pause

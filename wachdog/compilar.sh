#!/bin/sh
# Compila Wachdog.exe (necesita mono-mcs). Mete adentro los dos .ps1 de la raiz del repo.
cd "$(dirname "$0")"
mcs -target:winexe -platform:anycpu -optimize+ \
  -win32icon:wachdog.ico \
  -resource:../Instalar_VFX_Resolume.ps1,Instalar_VFX_Resolume.ps1 \
  -resource:../VFX_Actualizador.ps1,VFX_Actualizador.ps1 \
  -out:../Wachdog.exe Wachdog.cs

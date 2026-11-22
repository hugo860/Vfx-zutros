@echo off
cd /d "%~dp0"
echo Uniendo los videos HAP...
copy /b "Oasis_atardecer_LOGO_HAP.mov.parte00"+"Oasis_atardecer_LOGO_HAP.mov.parte01" "Oasis_atardecer_LOGO_HAP.mov" >nul && del "Oasis_atardecer_LOGO_HAP.mov.parte00" "Oasis_atardecer_LOGO_HAP.mov.parte01"
copy /b "Oasis_caustica_LOGO_HAP.mov.parte00"+"Oasis_caustica_LOGO_HAP.mov.parte01"+"Oasis_caustica_LOGO_HAP.mov.parte02" "Oasis_caustica_LOGO_HAP.mov" >nul && del "Oasis_caustica_LOGO_HAP.mov.parte00" "Oasis_caustica_LOGO_HAP.mov.parte01" "Oasis_caustica_LOGO_HAP.mov.parte02"
copy /b "Oasis_neon_ondas_LOGO_HAP.mov.parte00"+"Oasis_neon_ondas_LOGO_HAP.mov.parte01" "Oasis_neon_ondas_LOGO_HAP.mov" >nul && del "Oasis_neon_ondas_LOGO_HAP.mov.parte00" "Oasis_neon_ondas_LOGO_HAP.mov.parte01"
echo Listo. Ya puedes arrastrar los .mov a Resolume.
pause

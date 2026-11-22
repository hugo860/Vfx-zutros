@echo off
cd /d "%~dp0"
echo Uniendo los videos HAP...
copy /b "Zutros_brasas_LOGO_HAP.mov.parte00"+"Zutros_brasas_LOGO_HAP.mov.parte01" "Zutros_brasas_LOGO_HAP.mov" >nul && del "Zutros_brasas_LOGO_HAP.mov.parte00" "Zutros_brasas_LOGO_HAP.mov.parte01"
copy /b "Zutros_deco_LOGO_HAP.mov.parte00"+"Zutros_deco_LOGO_HAP.mov.parte01"+"Zutros_deco_LOGO_HAP.mov.parte02" "Zutros_deco_LOGO_HAP.mov" >nul && del "Zutros_deco_LOGO_HAP.mov.parte00" "Zutros_deco_LOGO_HAP.mov.parte01" "Zutros_deco_LOGO_HAP.mov.parte02"
copy /b "Zutros_floral_LOGO_HAP.mov.parte00"+"Zutros_floral_LOGO_HAP.mov.parte01"+"Zutros_floral_LOGO_HAP.mov.parte02" "Zutros_floral_LOGO_HAP.mov" >nul && del "Zutros_floral_LOGO_HAP.mov.parte00" "Zutros_floral_LOGO_HAP.mov.parte01" "Zutros_floral_LOGO_HAP.mov.parte02"
copy /b "Zutros_humo_vino_LOGO_HAP.mov.parte00"+"Zutros_humo_vino_LOGO_HAP.mov.parte01"+"Zutros_humo_vino_LOGO_HAP.mov.parte02" "Zutros_humo_vino_LOGO_HAP.mov" >nul && del "Zutros_humo_vino_LOGO_HAP.mov.parte00" "Zutros_humo_vino_LOGO_HAP.mov.parte01" "Zutros_humo_vino_LOGO_HAP.mov.parte02"
copy /b "Zutros_logo_luz_LOGO_HAP.mov.parte00"+"Zutros_logo_luz_LOGO_HAP.mov.parte01" "Zutros_logo_luz_LOGO_HAP.mov" >nul && del "Zutros_logo_luz_LOGO_HAP.mov.parte00" "Zutros_logo_luz_LOGO_HAP.mov.parte01"
copy /b "Zutros_marmol_LOGO_HAP.mov.parte00"+"Zutros_marmol_LOGO_HAP.mov.parte01" "Zutros_marmol_LOGO_HAP.mov" >nul && del "Zutros_marmol_LOGO_HAP.mov.parte00" "Zutros_marmol_LOGO_HAP.mov.parte01"
copy /b "Zutros_pines_LOGO_HAP.mov.parte00"+"Zutros_pines_LOGO_HAP.mov.parte01" "Zutros_pines_LOGO_HAP.mov" >nul && del "Zutros_pines_LOGO_HAP.mov.parte00" "Zutros_pines_LOGO_HAP.mov.parte01"
copy /b "Zutros_seda_LOGO_HAP.mov.parte00"+"Zutros_seda_LOGO_HAP.mov.parte01" "Zutros_seda_LOGO_HAP.mov" >nul && del "Zutros_seda_LOGO_HAP.mov.parte00" "Zutros_seda_LOGO_HAP.mov.parte01"
echo Listo. Ya puedes arrastrar los .mov a Resolume.
pause

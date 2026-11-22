<#
  Instalador de VFX para Resolume Arena
  -------------------------------------
  1 = Oasis   2 = Zutros   3 = Quitar el actualizador automatico

  - Baja del repo hugo860/Vfx-zutros TODO lo que haya HOY en la carpeta elegida (oasis/ o zutros/):
      * los HAP de <carpeta>/HAP_Resolume se unen (.parte00, .parte01...) y quedan en
        Documentos\Resolume Arena\Media\<Cliente>\          <- estos son los clips para Resolume
      * todo lo demas (MP4, imagenes, logos, codigo...) va a
        Documentos\Resolume Arena\Media\<Cliente>\Extras\   (misma estructura que el repo)
  - Si lo vuelves a correr, solo baja lo nuevo o lo que cambio.
  - Al final ofrece instalar el ACTUALIZADOR AUTOMATICO: un icono junto al reloj que revisa
    el repo cada 30 min y baja solo lo nuevo de lo que elegiste.

  Desde PowerShell (repo publico):
    irm https://raw.githubusercontent.com/hugo860/Vfx-zutros/main/Instalar_VFX_Resolume.ps1 | iex
  O doble clic en INSTALAR_VFX.bat

  Parametros (avanzado):
    -Opcion 1|2|3   salta el menu
    -Destino D:\VJ  carpeta base (se le agrega \Oasis o \Zutros)
    -Actualizar     modo silencioso: actualiza lo que se eligio antes (lo usa el actualizador)
    -Desinstalar    quita el actualizador automatico (los videos se quedan)
#>
param(
    [string]$Opcion = '',
    [string]$Destino = '',
    [string]$Token = '',
    [string]$Repo = 'hugo860/Vfx-zutros',
    [string]$Rama = 'main',
    [switch]$Actualizar,
    [switch]$Desinstalar,
    [switch]$SinActualizador,
    [switch]$OlvidarToken
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest es lentisimo con la barra en PS 5.1
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$EsWindows = ($env:OS -eq 'Windows_NT')
$Api = "https://api.github.com/repos/$Repo"
$Raw = "https://raw.githubusercontent.com/$Repo"
$CarpetaConfig = if ($env:VFX_CONFIG_DIR) { $env:VFX_CONFIG_DIR } elseif ($EsWindows) { Join-Path $env:LOCALAPPDATA 'VFX_Resolume' } else { Join-Path $HOME '.config/vfx_resolume' }
$ArchivoToken = Join-Path $CarpetaConfig 'token.dat'
$ArchivoConfig = Join-Path $CarpetaConfig 'config.json'
$Silencioso = [bool]$Actualizar

# Todo va por Write-Host (nunca por la salida de las funciones, para no ensuciar lo que devuelven)
function Titulo($t) { Write-Host ''; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t)   { Write-Host "  $t" }
function Aviso($t)  { Write-Host "  [!] $t" -ForegroundColor Yellow }
function MB($b)     { '{0:N0} MB' -f ($b / 1MB) }

# ---------------------------------------------------------------- configuracion guardada
function Leer-Config {
    $c = @{ Clientes = @{} }
    if (Test-Path -LiteralPath $ArchivoConfig) {
        try {
            $j = Get-Content -LiteralPath $ArchivoConfig -Raw | ConvertFrom-Json
            if ($j.Clientes) { $j.Clientes.PSObject.Properties | ForEach-Object { $c.Clientes[$_.Name] = [string]$_.Value } }
        } catch {}
    }
    return $c
}
function Guardar-Config($c) {
    New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
    $c | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ArchivoConfig
}

# ---------------------------------------------------------------- token de GitHub (solo si el repo es privado)
function Cabeceras([string]$t, [string]$accept = 'application/vnd.github+json') {
    $h = @{ Accept = $accept; 'X-GitHub-Api-Version' = '2022-11-28' }
    if ($t) { $h.Authorization = "Bearer $t" }
    return $h
}

function Repo-EsPublico {
    try { $r = Invoke-RestMethod -Uri $Api -Headers (Cabeceras '') -UseBasicParsing; return (-not $r.private) } catch { return $false }
}

function Probar-Token([string]$t) {
    if (-not $t) { return $false }
    try { Invoke-RestMethod -Uri $Api -Headers (Cabeceras $t) -UseBasicParsing | Out-Null; return $true } catch { return $false }
}

function Guardar-Token([string]$t) {
    try {
        New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
        if ($EsWindows) {
            # Cifrado con tu usuario de Windows (DPAPI): solo tu cuenta en esta PC lo puede leer
            ConvertTo-SecureString $t -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $ArchivoToken
        } else { Set-Content -LiteralPath $ArchivoToken -Value $t }
    } catch { Aviso 'No pude guardar el token (no pasa nada, te lo pedira la proxima vez).' }
}

function Leer-TokenGuardado {
    if (-not (Test-Path -LiteralPath $ArchivoToken)) { return '' }
    try {
        $c = (Get-Content -LiteralPath $ArchivoToken -Raw).Trim()
        if ($EsWindows) {
            $s = ConvertTo-SecureString $c
            return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
        }
        return $c
    } catch { return '' }
}

function Token-DeGh {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return '' }
    try { $t = (& gh auth token 2>$null | Out-String).Trim(); if ($LASTEXITCODE -eq 0) { return $t } } catch {}
    return ''
}

function Pedir-Token {
    Titulo 'Hace falta un token de GitHub (el repo es privado)'
    Info 'Como crearlo (una sola vez, 1 minuto):'
    Info '  1. Abre  https://github.com/settings/personal-access-tokens/new'
    Info '  2. Token name: "Resolume PC".  Expiration: la que quieras (ej. 1 year).'
    Info '  3. Repository access: "Only select repositories" -> elige  Vfx-zutros'
    Info '  4. Permissions -> Repository permissions -> Contents: "Read-only"'
    Info '  5. Generate token, copialo (empieza con github_pat_...) y pegalo aqui.'
    Info '  (Clic derecho pega en la ventana. No se ve nada al pegar: es normal.)'
    Write-Host ''
    $seg = Read-Host '  Pega el token y pulsa Enter' -AsSecureString
    return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))).Trim()
}

function Conseguir-Token {
    if ($OlvidarToken -and (Test-Path -LiteralPath $ArchivoToken)) { Remove-Item -LiteralPath $ArchivoToken -Force }
    if (-not $Token -and (Repo-EsPublico)) { Ok 'El repo es publico: no hace falta token.'; return '' }
    $candidatos = @(
        @{ n = 'parametro -Token'; v = $Token },
        @{ n = 'variable VFX_GITHUB_TOKEN'; v = $env:VFX_GITHUB_TOKEN },
        @{ n = 'variable GITHUB_TOKEN'; v = $env:GITHUB_TOKEN },
        @{ n = 'token guardado'; v = (Leer-TokenGuardado) },
        @{ n = 'GitHub CLI (gh)'; v = (Token-DeGh) }
    )
    foreach ($c in $candidatos) {
        if ($c.v -and (Probar-Token $c.v)) { Ok "Acceso a GitHub con $($c.n)."; return $c.v }
    }
    if ($Silencioso) { throw 'Sin acceso al repo (es privado y no hay token guardado). Corre el instalador a mano.' }
    for ($i = 1; $i -le 3; $i++) {
        $t = Pedir-Token
        if (Probar-Token $t) {
            Ok 'Token correcto.'
            $r = Read-Host '  Guardar el token en esta PC para no pedirlo otra vez? (S/n)'
            if ($r -notmatch '^[nN]') { Guardar-Token $t; Ok 'Guardado.' }
            return $t
        }
        Aviso 'Ese token no abre el repo. Revisa que tenga acceso a Vfx-zutros y permiso Contents: Read-only.'
    }
    throw 'No se pudo entrar al repo con ningun token.'
}

# ---------------------------------------------------------------- descargas
$CurlExe = $null
if ($EsWindows) { $c = Join-Path $env:SystemRoot 'System32\curl.exe'; if (Test-Path $c) { $CurlExe = $c } }
elseif (Get-Command curl -CommandType Application -ErrorAction SilentlyContinue) { $CurlExe = (Get-Command curl -CommandType Application | Select-Object -First 1).Source }

function Descargar-Archivo([string]$ruta, [string]$salida, [string]$t, [string]$ref) {
    $rutaUrl = ($ruta -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    if ($t) { $url = "$Api/contents/$($rutaUrl)?ref=$ref" }
    else    { $url = "$Raw/$ref/$rutaUrl" }          # repo publico: sin limite de la API
    $tmp = "$salida.descargando"
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($salida)) | Out-Null
    if ($CurlExe) {
        # Las cabeceras van en un archivo para que el token no se vea en la lista de procesos
        $hdr = [IO.Path]::GetTempFileName()
        try {
            $lineas = @('Accept: application/vnd.github.raw', 'User-Agent: vfx-resolume-instalador')
            if ($t) { $lineas += "Authorization: Bearer $t" }
            [IO.File]::WriteAllLines($hdr, $lineas)
            $barra = if ($Silencioso) { '-sS' } else { '--progress-bar' }
            & $CurlExe -fL --retry 3 --retry-delay 2 $barra -H "@$hdr" -o $tmp $url
            if ($LASTEXITCODE -ne 0) { throw "curl fallo (codigo $LASTEXITCODE) bajando $ruta" }
        } finally { Remove-Item -LiteralPath $hdr -Force -ErrorAction SilentlyContinue }
    } else {
        $intento = 0
        while ($true) {
            try { Invoke-WebRequest -Uri $url -Headers (Cabeceras $t 'application/vnd.github.raw') -OutFile $tmp -UseBasicParsing; break }
            catch { $intento++; if ($intento -ge 3) { throw }; Start-Sleep 2 }
        }
    }
    Move-Item -LiteralPath $tmp -Destination $salida -Force
}

function Unir-Partes([string[]]$partes, [string]$salida) {
    $tmp = "$salida.uniendo"
    $out = [IO.File]::Create($tmp)
    try {
        foreach ($p in $partes) {
            $in = [IO.File]::OpenRead($p)
            try { $in.CopyTo($out, 8MB) } finally { $in.Dispose() }
        }
    } finally { $out.Dispose() }
    Mover-Final $tmp $salida
}

# Si Resolume tiene el clip abierto, Windows no deja reemplazarlo: se reintenta en la proxima vuelta
function Mover-Final([string]$tmp, [string]$salida) {
    try { Move-Item -LiteralPath $tmp -Destination $salida -Force }
    catch {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
        throw "EN_USO"
    }
}

function Carpeta-MediaResolume {
    $docs = [Environment]::GetFolderPath('MyDocuments')   # respeta OneDrive / carpetas movidas
    if (-not $docs) { $docs = Join-Path $HOME 'Documents' }
    foreach ($n in 'Resolume Arena', 'Resolume Arena 7', 'Resolume Avenue') {
        $p = Join-Path $docs $n
        if (Test-Path -LiteralPath $p) { return (Join-Path $p 'Media') }
    }
    return (Join-Path (Join-Path $docs 'Resolume Arena') 'Media')
}

# ---------------------------------------------------------------- sincronizar un cliente
function Sincronizar-Cliente([string]$Cliente, [string]$Base, [string]$tok, $arbol, [string]$ref) {
    $prefijo = $Cliente.ToLower() + '/'
    $prefHap = $prefijo + 'HAP_Resolume/'
    $CarpetaFinal = Join-Path $Base $Cliente
    $todos = @($arbol | Where-Object { $_.type -eq 'blob' -and $_.path.StartsWith($prefijo) })
    if (-not $todos) { Aviso "No hay nada en $prefijo"; return 0 }

    # Que se baja y a donde:  clave = ruta de salida relativa a la carpeta del cliente
    $items = [ordered]@{}
    foreach ($a in ($todos | Sort-Object path)) {
        if ($a.path.StartsWith($prefHap)) {
            if ($a.path -notmatch '\.mov(\.parte\d+)?$') { continue }   # .bat/.sh/.md para unir a mano: no hacen falta
            $dest = [IO.Path]::GetFileName($a.path) -replace '\.parte\d+$', ''
        } else {
            $dest = 'Extras/' + $a.path.Substring($prefijo.Length)
        }
        if (-not $items.Contains($dest)) { $items[$dest] = New-Object System.Collections.ArrayList }
        [void]$items[$dest].Add($a)
    }
    $nVideos = @($items.Keys | Where-Object { $_ -notlike 'Extras/*' }).Count
    $total = ($todos | Measure-Object size -Sum).Sum
    Titulo "$Cliente : $nVideos videos HAP + $($items.Count - $nVideos) archivos extra ($(MB $total))"
    Info "Carpeta: $CarpetaFinal"

    New-Item -ItemType Directory -Force -Path $CarpetaFinal | Out-Null
    $Temp = Join-Path $Base "_descargando_$Cliente"
    New-Item -ItemType Directory -Force -Path $Temp | Out-Null

    # Estado: ruta de salida -> sha de las partes (para saber que cambio)
    New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
    $ArchivoEstado = Join-Path $CarpetaConfig "estado_$Cliente.json"
    $estado = @{}
    if (Test-Path -LiteralPath $ArchivoEstado) {
        try { (Get-Content -LiteralPath $ArchivoEstado -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $estado[$_.Name] = $_.Value } } catch {}
    }

    try {
        $libre = (New-Object IO.DriveInfo ([IO.Path]::GetPathRoot((Resolve-Path -LiteralPath $CarpetaFinal).Path))).AvailableFreeSpace
        if ($libre -lt 2GB) { Aviso "Poco espacio libre en el disco: $(MB $libre)." }
    } catch {}

    $nuevos = 0; $enUso = 0; $i = 0
    foreach ($dest in $items.Keys) {
        $i++
        $partes = @($items[$dest] | Sort-Object path)
        $tam = ($partes | Measure-Object size -Sum).Sum
        $firma = ($partes | ForEach-Object { $_.sha }) -join ','
        $final = Join-Path $CarpetaFinal ($dest -replace '/', [IO.Path]::DirectorySeparatorChar)
        $esVideo = $dest -notlike 'Extras/*'

        if ((Test-Path -LiteralPath $final) -and ((Get-Item -LiteralPath $final).Length -eq $tam) -and
            (-not $estado.ContainsKey($dest) -or $estado[$dest] -eq $firma)) {
            $estado[$dest] = $firma; continue      # ya esta al dia
        }

        Titulo "[$i/$($items.Count)] $dest  ($(MB $tam))"
        try {
            if ($partes.Count -eq 1 -and -not $esVideo) {
                $tmp = Join-Path $Temp ('extra_' + [IO.Path]::GetFileName($final))
                Descargar-Archivo $partes[0].path $tmp $tok $ref
                New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($final)) | Out-Null
                Mover-Final $tmp $final
            } else {
                $locales = @()
                foreach ($p in $partes) {
                    $local = Join-Path $Temp ([IO.Path]::GetFileName($p.path))
                    if (-not ((Test-Path -LiteralPath $local) -and ((Get-Item -LiteralPath $local).Length -eq $p.size))) {
                        Info "Bajando $([IO.Path]::GetFileName($p.path)) ($(MB $p.size))..."
                        Descargar-Archivo $p.path $local $tok $ref
                        if ((Get-Item -LiteralPath $local).Length -ne $p.size) { throw "Tamano incorrecto en $($p.path). Vuelve a correr el instalador." }
                    }
                    $locales += $local
                }
                if ($locales.Count -gt 1) { Info "Uniendo $($locales.Count) partes..." }
                Unir-Partes $locales $final
                $locales | ForEach-Object { Remove-Item -LiteralPath $_ -Force }
            }
        } catch {
            if ("$($_.Exception.Message)" -eq 'EN_USO') {
                Aviso "$dest esta abierto en Resolume: se actualiza la proxima vez."; $enUso++; continue
            }
            throw
        }
        if ((Get-Item -LiteralPath $final).Length -ne $tam) { throw "El archivo $dest no tiene el tamano esperado." }
        $estado[$dest] = $firma
        $estado | ConvertTo-Json | Set-Content -LiteralPath $ArchivoEstado
        Ok 'Listo.'; $nuevos++
    }
    $estado | ConvertTo-Json | Set-Content -LiteralPath $ArchivoEstado
    if (-not (Get-ChildItem -LiteralPath $Temp -Force)) { Remove-Item -LiteralPath $Temp -Force -ErrorAction SilentlyContinue }
    Ok "$Cliente : $nuevos archivos nuevos/actualizados$(if ($enUso) { ", $enUso pendientes (en uso)" })."
    if ($Silencioso) { Write-Host "RESULTADO $Cliente NUEVOS=$nuevos ENUSO=$enUso" }
}

# ---------------------------------------------------------------- actualizador automatico (icono en la bandeja)
$NombreRun = 'VFX_Resolume_Actualizador'
$ClaveRun = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

function Detener-Actualizador {
    if (-not $EsWindows) { return }
    try {
        Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like '*VFX_Actualizador.ps1*' } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch {}
}

function Instalar-Actualizador([string]$ref) {
    Titulo 'Instalando el actualizador automatico'
    New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
    $app = Join-Path $CarpetaConfig 'VFX_Actualizador.ps1'
    $ins = Join-Path $CarpetaConfig 'Instalar_VFX_Resolume.ps1'
    $aqui = if ($PSCommandPath) { Split-Path -Parent $PSCommandPath } else { '' }
    foreach ($f in @(@{ n = 'VFX_Actualizador.ps1'; d = $app }, @{ n = 'Instalar_VFX_Resolume.ps1'; d = $ins })) {
        $local = if ($aqui) { Join-Path $aqui $f.n } else { '' }
        if ($local -and (Test-Path -LiteralPath $local) -and ($local -ne $f.d)) { Copy-Item -LiteralPath $local -Destination $f.d -Force }
        elseif (-not ($local -eq $f.d)) { Descargar-Archivo $f.n $f.d $script:TokenGH $ref }
    }
    if (-not $EsWindows) { Ok "Archivos copiados a $CarpetaConfig (el icono solo funciona en Windows)."; return }

    $cmd = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$app`""
    New-ItemProperty -Path $ClaveRun -Name $NombreRun -Value $cmd -PropertyType String -Force | Out-Null
    Detener-Actualizador
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', "`"$app`"")
    Ok 'Listo: hay un icono nuevo junto al reloj (puede estar en la flechita ^).'
    Info 'Arranca solo al prender la PC y revisa el repo cada 30 minutos.'
    Info 'Clic derecho en el icono: Buscar ahora / Abrir carpeta / Pausar / Salir.'
}

function Desinstalar-Actualizador {
    Titulo 'Quitando el actualizador automatico'
    Detener-Actualizador
    if ($EsWindows) { Remove-ItemProperty -Path $ClaveRun -Name $NombreRun -ErrorAction SilentlyContinue }
    $cfg = Leer-Config
    if (Test-Path -LiteralPath $CarpetaConfig) { Remove-Item -LiteralPath $CarpetaConfig -Recurse -Force -ErrorAction SilentlyContinue }
    Ok 'Actualizador quitado (y el token guardado, si habia).'
    foreach ($k in $cfg.Clientes.Keys) { Info "Los videos siguen en: $(Join-Path $cfg.Clientes[$k] $k)  (borralos a mano si quieres)" }
}

# ================================================================= programa
trap {
    if ($Silencioso) { Write-Host "ERROR $($_.Exception.Message)"; exit 1 }
    Write-Host ''
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Puedes volver a correr el instalador: sigue donde se quedo.' -ForegroundColor Yellow
    break
}

if ($Desinstalar) { $Opcion = '3' }
$cfg = Leer-Config

if ($Actualizar) {
    # ---- modo silencioso (lo llama el actualizador automatico)
    if (-not $cfg.Clientes.Count) { throw 'No hay nada elegido todavia. Corre el instalador primero.' }
    Write-Host "Actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $script:TokenGH = Conseguir-Token
    $ref = (Invoke-RestMethod -Uri "$Api/commits/$Rama" -Headers (Cabeceras $script:TokenGH) -UseBasicParsing).sha
    $arbol = (Invoke-RestMethod -Uri "$Api/git/trees/$($ref)?recursive=1" -Headers (Cabeceras $script:TokenGH) -UseBasicParsing).tree
    foreach ($k in @($cfg.Clientes.Keys)) { Sincronizar-Cliente $k $cfg.Clientes[$k] $script:TokenGH $arbol $ref }
    Write-Host "COMMIT $ref"
    exit 0
}

Write-Host ''
Write-Host '  ##########################################' -ForegroundColor Magenta
Write-Host '  #     INSTALADOR DE VFX PARA RESOLUME    #' -ForegroundColor Magenta
Write-Host '  ##########################################' -ForegroundColor Magenta
Write-Host ''
Write-Host '    1 = Oasis  (Oasis VIP Club)'
Write-Host '    2 = Zutros (Zutros Steak Bar & Lounge)'
Write-Host '    3 = Quitar el actualizador automatico'
if ($cfg.Clientes.Count) { Write-Host "    (ya instalado: $(@($cfg.Clientes.Keys) -join ', '))" -ForegroundColor DarkGray }
Write-Host ''
$Eleccion = "$Opcion".Trim()
while ($Eleccion -notin '1', '2', '3') { $Eleccion = (Read-Host '  Elige 1, 2 o 3').Trim() }

if ($Eleccion -eq '3') { Desinstalar-Actualizador; return }

$Cliente = @{ '1' = 'Oasis'; '2' = 'Zutros' }[$Eleccion]
if (-not $Destino) {
    $def = if ($cfg.Clientes.ContainsKey($Cliente)) { $cfg.Clientes[$Cliente] } else { Carpeta-MediaResolume }
    Info "Se instalara en:  $(Join-Path $def $Cliente)"
    $r = Read-Host '  Enter para aceptar, o escribe otra carpeta base (ej. D:\VJ)'
    $Destino = if ($r.Trim()) { $r.Trim().Trim('"') } else { $def }
}

Titulo 'Conectando con GitHub'
$script:TokenGH = Conseguir-Token
$ref = (Invoke-RestMethod -Uri "$Api/commits/$Rama" -Headers (Cabeceras $script:TokenGH) -UseBasicParsing).sha
$arbol = (Invoke-RestMethod -Uri "$Api/git/trees/$($ref)?recursive=1" -Headers (Cabeceras $script:TokenGH) -UseBasicParsing).tree

$cfg.Clientes[$Cliente] = $Destino
Guardar-Config $cfg

Sincronizar-Cliente $Cliente $Destino $script:TokenGH $arbol $ref

Titulo 'TERMINADO'
$CarpetaFinal = Join-Path $Destino $Cliente
Info "Clips para Resolume:  $CarpetaFinal"
Info "MP4, imagenes y logos: $(Join-Path $CarpetaFinal 'Extras')"
Write-Host ''
Info 'En Resolume Arena: panel Files -> navega a esa carpeta y arrastra los clips'
Info '(o la carpeta entera a una capa vacia) a la composicion.'

if (-not $SinActualizador) {
    Write-Host ''
    $r = Read-Host '  Instalar el ACTUALIZADOR AUTOMATICO (revisa el repo cada 30 min y baja lo nuevo)? (S/n)'
    if ($r -notmatch '^[nN]') { Instalar-Actualizador $ref }
}
if ($EsWindows) { try { Start-Process explorer.exe $CarpetaFinal } catch {} }

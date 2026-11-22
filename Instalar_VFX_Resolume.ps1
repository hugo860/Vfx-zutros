<#
  Instalador de VFX para Resolume Arena
  -------------------------------------
  1 = Oasis   2 = Zutros

  - Descarga del repo privado hugo860/Vfx-zutros lo que haya HOY en <carpeta>/HAP_Resolume
    (no usa listas fijas: si se suben videos nuevos, el instalador los trae).
  - Une los pedazos .parte00, .parte01... en los .mov completos.
  - Los deja en  Documentos\Resolume Arena\Media\Oasis  (o \Zutros).
  - Si lo vuelves a correr, solo baja lo que falte o haya cambiado.

  Uso normal: doble clic en INSTALAR_VFX.bat
  Desde PowerShell (repo publico, sin descargar nada antes):
    irm https://raw.githubusercontent.com/hugo860/Vfx-zutros/main/Instalar_VFX_Resolume.ps1 | iex
  Uso avanzado:  .\Instalar_VFX_Resolume.ps1 -Opcion 1 -Destino "D:\VJ\Media"
#>
param(
    [string]$Opcion = '',            # 1 = Oasis, 2 = Zutros
    [string]$Destino = '',          # carpeta base; se le agrega \Oasis o \Zutros
    [string]$Token = '',
    [string]$Repo = 'hugo860/Vfx-zutros',
    [string]$Rama = 'main',
    [switch]$OlvidarToken
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest es lentisimo con la barra en PS 5.1
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$EsWindows = ($env:OS -eq 'Windows_NT')
$Api = "https://api.github.com/repos/$Repo"
$CarpetaConfig = if ($EsWindows) { Join-Path $env:LOCALAPPDATA 'VFX_Resolume' } else { Join-Path $HOME '.config/vfx_resolume' }
$ArchivoToken = Join-Path $CarpetaConfig 'token.dat'

function Titulo($t) { Write-Host ''; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t)   { Write-Host "  $t" }
function Aviso($t)  { Write-Host "  [!] $t" -ForegroundColor Yellow }
function MB($b)     { '{0:N0} MB' -f ($b / 1MB) }

# ---------------------------------------------------------------- token de GitHub
function Guardar-Token([string]$t) {
    try {
        New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
        if ($EsWindows) {
            # Cifrado con tu usuario de Windows (DPAPI): solo tu cuenta en esta PC lo puede leer
            ConvertTo-SecureString $t -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $ArchivoToken
        } else {
            Set-Content -LiteralPath $ArchivoToken -Value $t
        }
    } catch { Aviso "No pude guardar el token (no pasa nada, te lo pedira la proxima vez)." }
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

function Pedir-Token {
    Titulo 'Hace falta un token de GitHub (el repo es privado)'
    Info 'Como crearlo (una sola vez, 1 minuto):'
    Info '  1. Abre  https://github.com/settings/personal-access-tokens/new'
    Info '  2. Token name: "Resolume PC".  Expiration: la que quieras (ej. 1 year).'
    Info '  3. Repository access: "Only select repositories" -> elige  Vfx-zutros'
    Info '  4. Permissions -> Repository permissions -> Contents: "Read-only"'
    Info '  5. Generate token, copialo (empieza con github_pat_...) y pegalo aqui.'
    Info '  (Clic derecho pega en la ventana negra. No se ve nada al pegar: es normal.)'
    Write-Host ''
    $seg = Read-Host '  Pega el token y pulsa Enter' -AsSecureString
    $t = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))
    return $t.Trim()
}

function Token-DeGh {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return '' }
    try { $t = (& gh auth token 2>$null | Out-String).Trim(); if ($LASTEXITCODE -eq 0) { return $t } } catch {}
    return ''
}

function Probar-Token([string]$t) {
    if (-not $t) { return $false }
    try {
        Invoke-RestMethod -Uri $Api -Headers (Cabeceras $t) -UseBasicParsing | Out-Null
        return $true
    } catch { return $false }
}

function Cabeceras([string]$t, [string]$accept = 'application/vnd.github+json') {
    $h = @{ Accept = $accept; 'X-GitHub-Api-Version' = '2022-11-28' }
    if ($t) { $h.Authorization = "Bearer $t" }
    return $h
}

function Repo-EsPublico {
    try {
        $r = Invoke-RestMethod -Uri $Api -Headers (Cabeceras '') -UseBasicParsing
        return (-not $r.private)
    } catch { return $false }
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

function Descargar-Archivo([string]$ruta, [string]$salida, [string]$t) {
    $rutaUrl = ($ruta -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
    if ($t) { $url = "$Api/contents/$($rutaUrl)?ref=$Rama" }
    else    { $url = "https://raw.githubusercontent.com/$Repo/$Rama/$rutaUrl" }   # publico: sin limite de la API
    $tmp = "$salida.descargando"
    if ($CurlExe) {
        # Las cabeceras van en un archivo para que el token no se vea en la lista de procesos
        $hdr = [IO.Path]::GetTempFileName()
        try {
            $lineas = @('Accept: application/vnd.github.raw', 'User-Agent: vfx-resolume-instalador')
            if ($t) { $lineas += "Authorization: Bearer $t" }
            [IO.File]::WriteAllLines($hdr, $lineas)
            & $CurlExe -fL --retry 3 --retry-delay 2 --progress-bar -H "@$hdr" -o $tmp $url
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
    Move-Item -LiteralPath $tmp -Destination $salida -Force
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

# ================================================================= programa
trap {
    Write-Host ''
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Puedes volver a correr el instalador: sigue donde se quedo.' -ForegroundColor Yellow
    break
}
Write-Host ''
Write-Host '  ##########################################' -ForegroundColor Magenta
Write-Host '  #     INSTALADOR DE VFX PARA RESOLUME    #' -ForegroundColor Magenta
Write-Host '  ##########################################' -ForegroundColor Magenta
Write-Host ''
Write-Host '    1 = Oasis  (Oasis VIP Club)'
Write-Host '    2 = Zutros (Zutros Steak Bar & Lounge)'
Write-Host ''
$Eleccion = "$Opcion".Trim()
while ($Eleccion -notin '1', '2') { $Eleccion = (Read-Host '  Elige 1 o 2').Trim() }

$Cliente = @{ '1' = 'Oasis'; '2' = 'Zutros' }[$Eleccion]
$CarpetaRepo = $Cliente.ToLower() + '/HAP_Resolume/'

if (-not $Destino) {
    $def = Carpeta-MediaResolume
    Info "Se instalara en:  $(Join-Path $def $Cliente)"
    $r = Read-Host '  Enter para aceptar, o escribe otra carpeta base (ej. D:\VJ)'
    $Destino = if ($r.Trim()) { $r.Trim().Trim('"') } else { $def }
}
$CarpetaFinal = Join-Path $Destino $Cliente

Titulo 'Conectando con GitHub'
$TokenGH = Conseguir-Token

Titulo "Buscando videos de $Cliente en el repo"
$arbol = Invoke-RestMethod -Uri "$Api/git/trees/$($Rama)?recursive=1" -Headers (Cabeceras $TokenGH) -UseBasicParsing
if ($arbol.truncated) { Aviso 'GitHub devolvio la lista cortada; puede faltar algun archivo.' }
$archivos = @($arbol.tree | Where-Object { $_.type -eq 'blob' -and $_.path.StartsWith($CarpetaRepo) -and $_.path -match '\.mov(\.parte\d+)?$' })
if (-not $archivos) { throw "No encontre videos en $CarpetaRepo" }

# Agrupar: video.mov  <-  video.mov.parte00, .parte01 ...  (o un .mov entero)
$videos = [ordered]@{}
foreach ($a in ($archivos | Sort-Object path)) {
    $nombre = [IO.Path]::GetFileName($a.path)
    $base = $nombre -replace '\.parte\d+$', ''
    if (-not $videos.Contains($base)) { $videos[$base] = New-Object System.Collections.ArrayList }
    [void]$videos[$base].Add($a)
}
$total = ($archivos | Measure-Object size -Sum).Sum
Ok "$($videos.Count) videos, $(MB $total) en total."

New-Item -ItemType Directory -Force -Path $CarpetaFinal | Out-Null
# Las partes se bajan a una carpeta temporal en el mismo disco y se borra al final
$Temp = Join-Path $Destino "_descargando_$Cliente"
New-Item -ItemType Directory -Force -Path $Temp | Out-Null

# Espacio libre (aprox., hace falta ~2x mientras se unen las partes)
try {
    $libre = (New-Object IO.DriveInfo ([IO.Path]::GetPathRoot((Resolve-Path -LiteralPath $CarpetaFinal).Path))).AvailableFreeSpace
    if ($libre -lt ($total * 2)) { Aviso "Espacio libre: $(MB $libre). Se recomiendan $(MB ($total*2)) mientras se instala." }
} catch {}

# Estado de la instalacion anterior: nombre -> sha de las partes (para detectar videos actualizados)
New-Item -ItemType Directory -Force -Path $CarpetaConfig | Out-Null
$ArchivoEstado = Join-Path $CarpetaConfig "estado_$Cliente.json"
$estado = @{}
if (Test-Path -LiteralPath $ArchivoEstado) {
    try { (Get-Content -LiteralPath $ArchivoEstado -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $estado[$_.Name] = $_.Value } } catch {}
}

$n = 0; $nuevos = 0; $saltados = 0
foreach ($base in $videos.Keys) {
    $n++
    $partes = @($videos[$base] | Sort-Object path)
    $tam = ($partes | Measure-Object size -Sum).Sum
    $firma = ($partes | ForEach-Object { $_.sha }) -join ','
    $final = Join-Path $CarpetaFinal $base
    Titulo "[$n/$($videos.Count)] $base  ($(MB $tam))"

    if ((Test-Path -LiteralPath $final) -and ((Get-Item -LiteralPath $final).Length -eq $tam) -and
        (-not $estado.ContainsKey($base) -or $estado[$base] -eq $firma)) {
        Ok 'Ya estaba instalado. Lo salto.'; $saltados++; $estado[$base] = $firma; continue
    }

    $locales = @()
    foreach ($p in $partes) {
        $local = Join-Path $Temp ([IO.Path]::GetFileName($p.path))
        if ((Test-Path -LiteralPath $local) -and ((Get-Item -LiteralPath $local).Length -eq $p.size)) {
            Info "$([IO.Path]::GetFileName($p.path)) ya descargado."
        } else {
            Info "Bajando $([IO.Path]::GetFileName($p.path)) ($(MB $p.size))..."
            Descargar-Archivo $p.path $local $TokenGH
            if ((Get-Item -LiteralPath $local).Length -ne $p.size) { throw "Tamano incorrecto en $($p.path). Vuelve a correr el instalador." }
        }
        $locales += $local
    }

    if ($locales.Count -gt 1) { Info "Uniendo $($locales.Count) partes..." }
    Unir-Partes $locales $final
    if ((Get-Item -LiteralPath $final).Length -ne $tam) { throw "El video unido $base no tiene el tamano esperado." }
    $locales | ForEach-Object { Remove-Item -LiteralPath $_ -Force }
    $estado[$base] = $firma
    $estado | ConvertTo-Json | Set-Content -LiteralPath $ArchivoEstado
    Ok 'Listo.'; $nuevos++
}
$estado | ConvertTo-Json | Set-Content -LiteralPath $ArchivoEstado
Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue

Titulo 'TERMINADO'
Ok "$nuevos videos instalados/actualizados, $saltados ya estaban."
Info "Carpeta:  $CarpetaFinal"
Write-Host ''
Info 'En Resolume Arena: panel Files (abajo a la derecha) -> navega a esa carpeta'
Info "y arrastra la carpeta $Cliente (o los .mov) a la composicion."
Info 'Truco: arrastra la carpeta entera a una capa vacia y Resolume carga todos los clips.'
if ($EsWindows) { try { Start-Process explorer.exe $CarpetaFinal } catch {} }

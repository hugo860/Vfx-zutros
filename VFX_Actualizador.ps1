<#
  WACHDOG - actualizador automatico de VFX para Resolume  (icono junto al reloj de Windows)
  -------------------------------------------------------------------------------
  Lo instala Instalar_VFX_Resolume.ps1 en %LOCALAPPDATA%\VFX_Resolume y arranca solo con Windows.
  Cada 30 minutos mira si el repo hugo860/Vfx-zutros tiene commits nuevos. Si los hay, corre
  "Instalar_VFX_Resolume.ps1 -Actualizar", que baja solo lo nuevo de lo que elegiste (Oasis y/o Zutros).

  Clic derecho en el icono:
    Buscar actualizaciones ahora | Abrir carpeta de videos | Esperar a que Resolume se cierre
    Pausar | Ver registro | Salir
  Para quitarlo del todo: corre el instalador y elige 3.
#>
$ErrorActionPreference = 'Continue'
$Dir = $PSScriptRoot
$Repo = 'hugo860/Vfx-zutros'
$Rama = 'main'
$Minutos = 30
$Instalador = Join-Path $Dir 'Instalar_VFX_Resolume.ps1'
$Log = Join-Path $Dir 'actualizador.log'
$Salida = Join-Path $Dir 'ultima_actualizacion.txt'
$ArchivoUltimo = Join-Path $Dir 'ultimo_commit.txt'
$ArchivoConfig = Join-Path $Dir 'config.json'
$MarcaConResolume = Join-Path $Dir 'bajar_con_resolume_abierto.txt'

# Una sola copia abierta
$nueva = $false
$script:Mutex = New-Object System.Threading.Mutex($true, 'Local\VFX_Resolume_Actualizador', [ref]$nueva)
if (-not $nueva) { exit }

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Log([string]$t) {
    try {
        if ((Test-Path $Log) -and (Get-Item $Log).Length -gt 1MB) { Move-Item $Log "$Log.viejo" -Force }
        Add-Content -LiteralPath $Log -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $t"
    } catch {}
}

function Clientes {
    $r = @{}
    try { (Get-Content -LiteralPath $ArchivoConfig -Raw | ConvertFrom-Json).Clientes.PSObject.Properties | ForEach-Object { $r[$_.Name] = [string]$_.Value } } catch {}
    return $r
}

# ---------------------------------------------------------------- icono
function Crear-Icono {
    $bmp = New-Object System.Drawing.Bitmap 32, 32
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $rect = New-Object System.Drawing.Rectangle 1, 1, 30, 30
    $brocha = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 230, 40, 140), [System.Drawing.Color]::FromArgb(255, 250, 190, 60), 45)
    $g.FillEllipse($brocha, $rect)
    $fuente = New-Object System.Drawing.Font('Arial', 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
    $g.DrawString('W', $fuente, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 1, 32, 32), $fmt)
    $g.Dispose()
    return [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}

$Icono = New-Object System.Windows.Forms.NotifyIcon
$Icono.Icon = Crear-Icono
$Icono.Visible = $true

function Estado([string]$t) {
    $txt = "Wachdog: $t"
    if ($txt.Length -gt 63) { $txt = $txt.Substring(0, 63) }
    $Icono.Text = $txt
}
function Aviso([string]$titulo, [string]$t, [string]$tipo = 'Info') {
    $Icono.BalloonTipTitle = $titulo; $Icono.BalloonTipText = $t; $Icono.BalloonTipIcon = $tipo
    $Icono.ShowBalloonTip(8000)
}

# ---------------------------------------------------------------- logica
$script:Proc = $null
$script:Pausado = $false
$script:Forzado = $false

function Resolume-Abierto { [bool](Get-Process -Name 'Arena', 'Avenue' -ErrorAction SilentlyContinue) }

function Ultimo-Commit {
    try {
        return [string](Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/commits/$Rama" -Headers @{ Accept = 'application/vnd.github.sha' } -UseBasicParsing -TimeoutSec 30)
    } catch { return '' }   # sin internet o repo privado: el instalador decide
}

function Revisar([bool]$forzar) {
    if ($script:Proc -and -not $script:Proc.HasExited) { return }
    if ($script:Pausado -and -not $forzar) { Estado 'en pausa'; return }
    if (-not (Clientes).Count) { Estado 'nada elegido (corre el instalador)'; return }
    if (-not $forzar -and -not (Test-Path $MarcaConResolume) -and (Resolume-Abierto)) {
        Estado 'esperando a que cierres Resolume'; return
    }

    $sha = Ultimo-Commit
    $ultimo = if (Test-Path $ArchivoUltimo) { (Get-Content $ArchivoUltimo -Raw).Trim() } else { '' }
    if ($sha -and $sha -eq $ultimo -and -not $forzar) {
        Estado "al dia ($(Get-Date -Format 'HH:mm'))"; return
    }

    # Auto-actualizacion: usar la version del instalador de ese mismo commit
    if ($sha) {
        try {
            Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$Repo/$sha/Instalar_VFX_Resolume.ps1" -OutFile "$Instalador.nuevo" -UseBasicParsing -TimeoutSec 60
            Move-Item "$Instalador.nuevo" $Instalador -Force
        } catch { Log "No pude refrescar el instalador: $($_.Exception.Message)" }
    }

    Log "Buscando cambios (commit $sha)..."
    Estado 'descargando novedades...'
    $script:Forzado = $forzar
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"& '$Instalador' -Actualizar *> '$Salida'; exit `$LASTEXITCODE`""
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true          # nada de ventanas encima del output de Resolume
    $script:Proc = [System.Diagnostics.Process]::Start($psi)
}

function Al-Terminar {
    $codigo = $script:Proc.ExitCode
    $script:Proc = $null
    $texto = if (Test-Path $Salida) { Get-Content $Salida -Raw } else { '' }
    Log ("Resultado (codigo $codigo):`r`n" + $texto)
    $nuevos = 0; $enUso = 0; $detalle = @()
    foreach ($m in [regex]::Matches($texto, 'RESULTADO (\S+) NUEVOS=(\d+) ENUSO=(\d+)')) {
        $nuevos += [int]$m.Groups[2].Value; $enUso += [int]$m.Groups[3].Value
        if ([int]$m.Groups[2].Value) { $detalle += "$($m.Groups[2].Value) de $($m.Groups[1].Value)" }
    }
    if ($codigo -eq 0) {
        $c = [regex]::Match($texto, 'COMMIT ([0-9a-f]{40})')
        if ($c.Success -and $enUso -eq 0) { Set-Content -LiteralPath $ArchivoUltimo -Value $c.Groups[1].Value }
        if ($nuevos) { Aviso 'Wachdog: VFX nuevos' ("Se bajaron $($detalle -join ' y ') archivos. Ya estan en la carpeta de Resolume.") }
        elseif ($script:Forzado) { Aviso 'Wachdog' 'Todo esta al dia.' }
        if ($enUso) { Estado "$enUso en uso: reintento luego" } else { Estado "al dia ($(Get-Date -Format 'HH:mm'))" }
    } else {
        $e = [regex]::Match($texto, 'ERROR (.+)')
        $msg = if ($e.Success) { $e.Groups[1].Value.Trim() } else { 'ver registro' }
        Estado 'error, reintento luego'
        if ($script:Forzado) { Aviso 'Wachdog: no se pudo actualizar' $msg 'Warning' }
    }
}

# ---------------------------------------------------------------- menu
$Menu = New-Object System.Windows.Forms.ContextMenuStrip
$miBuscar = $Menu.Items.Add('Buscar actualizaciones ahora')
$miAbrir = $Menu.Items.Add('Abrir carpeta de videos')
[void]$Menu.Items.Add('-')
$miResolume = New-Object System.Windows.Forms.ToolStripMenuItem 'Esperar a que Resolume se cierre para bajar'
$miResolume.Checked = -not (Test-Path $MarcaConResolume)
[void]$Menu.Items.Add($miResolume)
$miPausa = New-Object System.Windows.Forms.ToolStripMenuItem 'Pausar actualizaciones'
[void]$Menu.Items.Add($miPausa)
[void]$Menu.Items.Add('-')
$miLog = $Menu.Items.Add('Ver registro')
$miSalir = $Menu.Items.Add('Salir (vuelve al reiniciar la PC)')
$Icono.ContextMenuStrip = $Menu

function Abrir-Carpetas {
    $c = Clientes
    if (-not $c.Count) { Aviso 'Wachdog' 'Todavia no instalaste nada. Abre Wachdog.exe y elige 1 o 2.'; return }
    foreach ($k in $c.Keys) { $p = Join-Path $c[$k] $k; if (Test-Path $p) { Start-Process explorer.exe $p } }
}

$miBuscar.add_Click({ Estado 'buscando...'; Revisar $true })
$miAbrir.add_Click({ Abrir-Carpetas })
$Icono.add_DoubleClick({ Abrir-Carpetas })
$miResolume.add_Click({
    $miResolume.Checked = -not $miResolume.Checked
    if ($miResolume.Checked) { Remove-Item $MarcaConResolume -ErrorAction SilentlyContinue } else { Set-Content $MarcaConResolume 'si' }
})
$miPausa.add_Click({
    $script:Pausado = -not $script:Pausado
    $miPausa.Checked = $script:Pausado
    if ($script:Pausado) { Estado 'en pausa' } else { Estado 'activo'; Revisar $false }
})
$miLog.add_Click({ if (Test-Path $Log) { Start-Process notepad.exe $Log } })

$Contexto = New-Object System.Windows.Forms.ApplicationContext
$miSalir.add_Click({
    if ($script:Proc -and -not $script:Proc.HasExited) { try { $script:Proc.Kill() } catch {} }
    $Icono.Visible = $false
    $Contexto.ExitThread()
})

# ---------------------------------------------------------------- relojes
$Reloj = New-Object System.Windows.Forms.Timer
$Reloj.Interval = $Minutos * 60 * 1000
$Reloj.add_Tick({ Revisar $false })

$Vigia = New-Object System.Windows.Forms.Timer     # mira si termino la descarga
$Vigia.Interval = 3000
$Vigia.add_Tick({ if ($script:Proc -and $script:Proc.HasExited) { Al-Terminar } })

$Inicio = New-Object System.Windows.Forms.Timer    # primera revision 1 min despues de prender
$Inicio.Interval = 60 * 1000
$Inicio.add_Tick({ $Inicio.Stop(); Revisar $false })

Estado 'activo'
Log 'Wachdog iniciado.'
$Reloj.Start(); $Vigia.Start(); $Inicio.Start()
[System.Windows.Forms.Application]::Run($Contexto)
$Icono.Dispose()

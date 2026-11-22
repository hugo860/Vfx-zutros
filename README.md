# VFX

Visuales y loops para Resolume Arena.

| Carpeta | Cliente |
|---|---|
| [`zutros/`](zutros/) | Zutros Steak Bar & Lounge |
| [`oasis/`](oasis/) | Oasis VIP Club |

## Instalar los videos en Resolume (Windows)

El instalador baja del repo **todo** lo que haya de la carpeta que elijas, une los pedazos
de los HAP (`.parte00`, `.parte01`...) y lo deja así:

```
Documentos\Resolume Arena\Media\Oasis\            <- clips HAP para Resolume   (opción 1)
Documentos\Resolume Arena\Media\Oasis\Extras\     <- MP4, imágenes, logos, código
Documentos\Resolume Arena\Media\Zutros\  ...                                     (opción 2)
```

### Forma rápida (PowerShell)

Abre **PowerShell** (tecla Windows → escribe `powershell` → Enter), pega esta línea y Enter:

```powershell
irm https://raw.githubusercontent.com/hugo860/Vfx-zutros/main/Instalar_VFX_Resolume.ps1 | iex
```

Como el repo es público, no pide token. Elige 1 (Oasis) o 2 (Zutros). Al final pregunta si
quieres el **actualizador automático** (ver abajo): pulsa Enter para decir que sí.
Si quieres los dos clientes, córrelo dos veces (una con 1 y otra con 2).

### Actualizador automático (segundo plano)

Es un icono junto al reloj de Windows (una bolita rosada con una **V**; si no se ve, está en la flechita `^`).

- Arranca solo al prender la PC y cada **30 minutos** revisa si el repo cambió.
- Si hay algo nuevo, baja **solo** lo nuevo de lo que elegiste (Oasis, Zutros o los dos) y te avisa.
- Por defecto **espera a que cierres Resolume** para bajar, así no le quita disco ni internet al show.
  Se cambia con clic derecho → *Esperar a que Resolume se cierre para bajar*.
- Clic derecho: *Buscar actualizaciones ahora*, *Abrir carpeta de videos*, *Pausar*, *Ver registro*, *Salir*.
- Doble clic: abre la carpeta de videos.
- Si un clip está abierto en Resolume, Windows no deja reemplazarlo: lo intenta de nuevo en la próxima revisión.
- Se instala en `%LOCALAPPDATA%\VFX_Resolume` (no necesita permisos de administrador).

**Para quitarlo:** corre la misma línea de PowerShell y elige **3**. Los videos no se borran.


### Pasos (con el .bat)

1. Descarga estos dos archivos y ponlos **juntos en la misma carpeta** (por ejemplo el Escritorio):
   - [`INSTALAR_VFX.bat`](INSTALAR_VFX.bat)
   - [`Instalar_VFX_Resolume.ps1`](Instalar_VFX_Resolume.ps1)
   - [`VFX_Actualizador.ps1`](VFX_Actualizador.ps1) (opcional; si no está, el instalador lo baja)

   (Abre cada uno aquí en GitHub y pulsa el botón de descarga, el icono de la flecha hacia abajo, "Download raw file".)
2. Doble clic en **INSTALAR_VFX.bat**. Si Windows muestra "Windows protegió su PC", pulsa
   *Más información* → *Ejecutar de todas formas*.
3. Escribe **1** (Oasis), **2** (Zutros) o **3** (quitar el actualizador) y Enter.
4. Pulsa Enter para usar la carpeta de Resolume, o escribe otra (por ejemplo `D:\VJ`).
5. Solo si el repo vuelve a ser privado te pide un **token de GitHub**. Ver abajo.
6. Al terminar se abre la carpeta. En Resolume: panel **Files** → ve a
   `Documentos\Resolume Arena\Media\Oasis` (o `Zutros`) y arrastra los clips o la carpeta
   entera a la composición.

Si se corta el internet, vuelve a correrlo: sigue donde se quedó. Cuando se suban videos
nuevos al repo, córrelo otra vez y solo baja lo nuevo o lo que cambió.

### Crear el token de GitHub (solo si el repo es privado)

1. Entra a <https://github.com/settings/personal-access-tokens/new> (con tu cuenta).
2. **Token name**: `Resolume PC`. **Expiration**: la que quieras (por ejemplo 1 año).
3. **Repository access** → *Only select repositories* → elige `Vfx-zutros`.
4. **Permissions** → *Repository permissions* → **Contents: Read-only**.
5. **Generate token** y cópialo (empieza con `github_pat_`).
6. Pégalo en la ventana del instalador (clic derecho pega; no se ve al pegar, es normal).

El instalador puede guardarlo cifrado con tu usuario de Windows para no pedirlo otra vez.
Si tienes GitHub CLI (`gh auth login`) instalado, lo usa solo y no pide token.
Para borrar el token guardado: `INSTALAR_VFX.bat -OlvidarToken`.

### Opciones avanzadas

```
INSTALAR_VFX.bat -Opcion 1 -Destino "D:\VJ\Media"
```

`-Opcion 1|2|3` salta el menú, `-Destino` cambia la carpeta base, `-Rama` usa otra rama del repo,
`-SinActualizador` no pregunta por el actualizador, `-Actualizar` actualiza en silencio lo ya elegido.

> Nota: Resolume no trae una carpeta "Media" en Documentos por defecto; el instalador la crea.
> El panel Files de Resolume deja navegar a cualquier carpeta del disco.

# VFX

Visuales y loops para Resolume Arena.

| Carpeta | Cliente |
|---|---|
| [`zutros/`](zutros/) | Zutros Steak Bar & Lounge |
| [`oasis/`](oasis/) | Oasis VIP Club |

## Instalar los videos en Resolume (Windows)

El instalador baja del repo los HAP con logo que haya en ese momento, une los pedazos
(`.parte00`, `.parte01`...) y los deja listos en:

```
Documentos\Resolume Arena\Media\Oasis     (opción 1)
Documentos\Resolume Arena\Media\Zutros    (opción 2)
```

### Pasos

1. Descarga estos dos archivos y ponlos **juntos en la misma carpeta** (por ejemplo el Escritorio):
   - [`INSTALAR_VFX.bat`](INSTALAR_VFX.bat)
   - [`Instalar_VFX_Resolume.ps1`](Instalar_VFX_Resolume.ps1)

   (Abre cada uno aquí en GitHub y pulsa el botón de descarga, el icono de la flecha hacia abajo, "Download raw file".)
2. Doble clic en **INSTALAR_VFX.bat**. Si Windows muestra "Windows protegió su PC", pulsa
   *Más información* → *Ejecutar de todas formas*.
3. Escribe **1** (Oasis) o **2** (Zutros) y Enter.
4. Pulsa Enter para usar la carpeta de Resolume, o escribe otra (por ejemplo `D:\VJ`).
5. La primera vez te pide un **token de GitHub** (el repo es privado). Ver abajo.
6. Al terminar se abre la carpeta. En Resolume: panel **Files** → ve a
   `Documentos\Resolume Arena\Media\Oasis` (o `Zutros`) y arrastra los clips o la carpeta
   entera a la composición.

Si se corta el internet, vuelve a correrlo: sigue donde se quedó. Cuando se suban videos
nuevos al repo, córrelo otra vez y solo baja lo nuevo o lo que cambió.

### Crear el token de GitHub (una sola vez)

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

`-Opcion 1|2` salta el menú, `-Destino` cambia la carpeta base, `-Rama` usa otra rama del repo.

> Nota: Resolume no trae una carpeta "Media" en Documentos por defecto; el instalador la crea.
> El panel Files de Resolume deja navegar a cualquier carpeta del disco.

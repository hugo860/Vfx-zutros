// Wachdog.exe - instalador y actualizador automatico de VFX para Resolume (hugo860/Vfx-zutros)
//
// Es un lanzador pequeno: lleva dentro Instalar_VFX_Resolume.ps1 y VFX_Actualizador.ps1,
// los deja en %LOCALAPPDATA%\VFX_Resolume y los corre con el PowerShell que trae Windows.
//   Wachdog.exe                  -> menu: 1 Oasis / 2 Zutros / 3 Quitar Wachdog
//   Wachdog.exe --segundo-plano  -> icono junto al reloj que revisa el repo cada 30 min
// Compilar (Linux/Mac con mono):  sh compilar.sh
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;

[assembly: AssemblyTitle("Wachdog")]
[assembly: AssemblyDescription("Instalador y actualizador de VFX para Resolume")]
[assembly: AssemblyProduct("Wachdog")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Wachdog
{
    const string Instalador = "Instalar_VFX_Resolume.ps1";
    const string Actualizador = "VFX_Actualizador.ps1";

    static string Carpeta
    {
        get
        {
            string env = Environment.GetEnvironmentVariable("VFX_CONFIG_DIR");
            if (!string.IsNullOrEmpty(env)) return env;
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "VFX_Resolume");
        }
    }

    [STAThread]
    static int Main(string[] args)
    {
        try
        {
            bool fondo = args.Length > 0 && args[0] == "--segundo-plano";
            Directory.CreateDirectory(Carpeta);
            if (fondo)
            {
                // El instalador se auto-actualiza desde el repo: no pisarlo si ya existe
                Extraer(Instalador, false);
                Extraer(Actualizador, true);
                return Correr(Actualizador, "", false);
            }
            Extraer(Instalador, true);
            Extraer(Actualizador, true);
            var extra = new StringBuilder();
            extra.Append(" -Lanzador ").Append(Comillas(Assembly.GetExecutingAssembly().Location));
            foreach (string a in args) extra.Append(' ').Append(Comillas(a));
            return Correr(Instalador, extra.ToString(), true);
        }
        catch (Exception e)
        {
            try { File.AppendAllText(Path.Combine(Carpeta, "wachdog_error.log"), DateTime.Now + "  " + e + Environment.NewLine); } catch { }
            return 1;
        }
    }

    static void Extraer(string nombre, bool pisar)
    {
        string destino = Path.Combine(Carpeta, nombre);
        if (!pisar && File.Exists(destino)) return;
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(nombre))
        {
            if (s == null) throw new Exception("Falta el recurso " + nombre);
            string tmp = destino + ".tmp";
            using (FileStream f = File.Create(tmp)) s.CopyTo(f);
            if (File.Exists(destino)) File.Delete(destino);
            File.Move(tmp, destino);
        }
    }

    static string PowerShell()
    {
        string ps = Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe");
        if (File.Exists(ps)) return ps;
        return Environment.OSVersion.Platform == PlatformID.Win32NT ? "powershell.exe" : "pwsh";   // pwsh: solo para pruebas fuera de Windows
    }

    static int Correr(string script, string extra, bool visible)
    {
        var psi = new ProcessStartInfo(PowerShell());
        psi.Arguments = "-NoProfile -ExecutionPolicy Bypass " + (visible ? "" : "-WindowStyle Hidden ") +
                        "-File " + Comillas(Path.Combine(Carpeta, script)) + extra;
        psi.WorkingDirectory = Path.GetTempPath();
        psi.UseShellExecute = false;
        psi.CreateNoWindow = !visible;   // visible: ventana de consola nueva para el menu
        using (Process p = Process.Start(psi))
        {
            p.WaitForExit();
            return p.ExitCode;
        }
    }

    static string Comillas(string s)
    {
        return "\"" + s.Replace("\"", "\\\"") + "\"";
    }
}

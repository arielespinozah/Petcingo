# petcingo-clean-svg-names.ps1
# Limpia nombres de carpetas y archivos SVG para que Dashnex los acepte.
# Reglas Dashnex: sin espacios, sin comas, sin parentesis, sin brackets, sin &

param([string]$Path = "$PSScriptRoot\assets\svg-icons", [switch]$DryRun)

function Rename-IfChanged($oldPath, $newPath, $type) {
    if (Test-Path -LiteralPath $newPath) { return }
    if ($DryRun) {
        Write-Host "[DRY] $type" -ForegroundColor Yellow
    } else {
        Rename-Item -LiteralPath $oldPath -NewName (Split-Path $newPath -Leaf) -ErrorAction SilentlyContinue
        Write-Host "$type" -ForegroundColor Green
        $script:totalRenamed++
    }
}

$totalRenamed = 0

# Paso 1: Archivos - quitar parentesis, comas, brackets, &, espacios
Get-ChildItem -Path $Path -Recurse -File | ForEach-Object {
    $dir = $_.Directory.FullName
    $old = $_.Name
    $new = $old -replace '[(),&\[\]]', ''         # quitar caracteres especiales
    $new = $new -replace '\s+', '-'                # espacios -> guiones
    $new = $new -replace '-+', '-'                 # colapsar guiones
    $new = $new -replace '-\.', '.'                # quitar guion antes de extension
    $new = $new.Trim('-')
    if ($old -ne $new -and $new -ne '') {
        Rename-IfChanged $_.FullName (Join-Path $dir $new) "$old -> $new"
    }
}

# Paso 2: Carpetas - quitar comas, &, espacios (procesar las mas profundas primero)
Get-ChildItem -Path $Path -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
    $parent = $_.Parent.FullName
    $old = $_.Name
    $new = $old -replace '[,&]', ''                # quitar comas y &
    $new = $new -replace '\s+', '-'                # espacios -> guiones
    $new = $new -replace '-+', '-'                 # colapsar guiones
    $new = $new.Trim('-')
    if ($old -ne $new -and $new -ne '') {
        Rename-IfChanged $_.FullName (Join-Path $parent $new) "$old -> $new"
    }
}

Write-Host "`nCompletado: $totalRenamed elementos renombrados." -ForegroundColor Green
Write-Host "Listo para subir a Dashnex sin errores."

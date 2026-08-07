# ============================================================================
#  split-i18n.ps1  —  Generador de traduccions i18n (Festuc)
# ----------------------------------------------------------------------------
#  FONT ÚNICA:  i18n.source.js  (arrel del repo). NO es serveix; s'edita aquí.
#  GENERA:      i18n-core.js               (runtime: TRANSLATIONS={} + t/…)
#               i18n/{ca,es,en,fr}.js      (TRANSLATIONS.{lang} = {…})
#
#  ÚS:  pwsh tools/split-i18n.ps1     (o:  & tools\split-i18n.ps1)
#       Executa-ho SEMPRE després d'editar i18n.source.js (p. ex. traduir
#       receptes). Avorta si la paritat de claus top-level no és igual als 4
#       idiomes (gate de paritat).
#
#  Detecció de límits DINÀMICA (per contingut/indentació, no per número de
#  línia) perquè sobrevisqui a l'edició constant de la font.
#
#  TODO (sub-pas 4): estampar I18N_V a index.html en generar, per no oblidar
#  el cache-bust dels blocs.
# ============================================================================

$ErrorActionPreference = 'Stop'
$enc  = New-Object System.Text.UTF8Encoding($false)
$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root 'i18n.source.js'
if (-not (Test-Path $src)) { Write-Output "!! No trobo la font: $src"; exit 1 }
$lines = [System.IO.File]::ReadAllLines($src, $enc)

$langs = @('ca','es','en','fr')
$HDR = @(
  '// ============================================================================',
  '// GENERAT AUTOMATICAMENT per tools/split-i18n.ps1 des d''i18n.source.js.',
  '//   NO editis aquest fitxer: els canvis es perdran a la propera regeneracio.',
  '//   Per traduir, edita i18n.source.js i executa tools/split-i18n.ps1.',
  '// ============================================================================',
  ''
)

function Find-Block($lines, $lang) {
  $open = '^  ' + $lang + ': \{\s*$'
  $start = -1
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match $open) { $start = $i; break } }
  if ($start -lt 0) { throw "Bloc '$lang' no trobat (esperava '  ${lang}: {')" }
  $end = -1
  for ($i = $start + 1; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^  \}') { $end = $i; break } }
  if ($end -lt 0) { throw "Tancament del bloc '$lang' no trobat" }
  return @($start, $end)
}
function Key-Count($arr) { ($arr | Where-Object { $_ -match '^    [A-Za-z_][A-Za-z0-9_]*:' }).Count }

$i18ndir = Join-Path $root 'i18n'
if (-not (Test-Path $i18ndir)) { New-Item -ItemType Directory -Path $i18ndir | Out-Null }

$counts = @{}
foreach ($lang in $langs) {
  $b = Find-Block $lines $lang
  $slice = @($lines[$b[0]..$b[1]])
  $slice[0] = 'TRANSLATIONS.' + $lang + ' = {'
  $slice[$slice.Count - 1] = '};'
  $counts[$lang] = Key-Count $slice
  $out = (($HDR + $slice) -join "`n") + "`n"
  [System.IO.File]::WriteAllText((Join-Path $i18ndir ($lang + '.js')), $out, $enc)
}

# --- i18n-core.js: tot el que hi ha DESPRES del tancament de TRANSLATIONS ---
$tstart = -1
for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^const TRANSLATIONS\s*=\s*\{') { $tstart = $i; break } }
if ($tstart -lt 0) { throw "'const TRANSLATIONS = {' no trobat" }
$tclose = -1
for ($i = $tstart + 1; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\};') { $tclose = $i; break } }
if ($tclose -lt 0) { throw "Tancament '};' de TRANSLATIONS no trobat" }
$tailText = (($lines[($tclose + 1)..($lines.Count - 1)]) -join "`n")

$old = 'if (v == null) v = TRANSLATIONS.ca[key];'
$new = 'if (v == null && TRANSLATIONS.ca) v = TRANSLATIONS.ca[key];'
if (-not $tailText.Contains($old)) { throw "Linia de fallback de t() no trobada a la font" }
$tailText = $tailText.Replace($old, $new)

$core = ($HDR -join "`n") + "`n" + 'const TRANSLATIONS = {};' + "`n`n" + $tailText + "`n"
[System.IO.File]::WriteAllText((Join-Path $root 'i18n-core.js'), $core, $enc)

# --- Gate de paritat ---
Write-Output ('Claus top-level: ' + (($langs | ForEach-Object { $_ + '=' + $counts[$_] }) -join '  '))
$uniq = @($counts.Values | Select-Object -Unique)
if ($uniq.Count -ne 1) { Write-Output '!! PARITAT DESIGUAL entre idiomes -> AVORTAT'; exit 1 }
Write-Output ('OK: paritat ' + $uniq[0] + ' x4. Generats: i18n-core.js + i18n/{ca,es,en,fr}.js')

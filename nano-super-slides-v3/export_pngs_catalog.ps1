$ErrorActionPreference = "Stop"
$deck = "$PSScriptRoot\style-catalog.pptx"
$outDir = "$PSScriptRoot\render_catalog"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Remove-Item "$outDir\*.png" -ErrorAction SilentlyContinue

$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($deck, $true, $false, $false)
  $i = 1
  foreach ($slide in $pres.Slides) {
    $name = "slide-{0:d2}.png" -f $i
    $slide.Export("$outDir\$name", "PNG", 1920, 1080)
    $i++
  }
  $pres.Close()
  Write-Output "EXPORTED $($i - 1) SLIDES"
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

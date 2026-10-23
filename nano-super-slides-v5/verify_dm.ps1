$ErrorActionPreference = "Stop"
$deck = "$PSScriptRoot\data-model.pptx"
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($deck, $true, $false, $false)
  Write-Output ("SLIDES: " + $pres.Slides.Count)
  $bad = 0
  foreach ($s in $pres.Slides) {
    if ($s.Shapes.Count -le 0) { $bad++ }
    Write-Output ("slide {0}: {1} shapes" -f $s.SlideIndex, $s.Shapes.Count)
  }
  if ($bad -eq 0 -and $pres.Slides.Count -eq 14) {
    Write-Output "ASSERT PASS: 14 slides, all non-empty"
  } else {
    Write-Output "ASSERT FAIL"
    exit 1
  }
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

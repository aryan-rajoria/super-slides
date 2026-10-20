$ErrorActionPreference = "Stop"
$deck = "$PSScriptRoot\nano-super-agent-registry.pptx"
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($deck, $true, $false, $false)
  Write-Output ("SLIDES: " + $pres.Slides.Count)
  $bad = 0
  $imgs = 0
  foreach ($s in $pres.Slides) {
    if ($s.Shapes.Count -le 0) { $bad++ }
    $n = 0
    foreach ($sh in $s.Shapes) { if ($sh.Type -eq 13) { $n++ } }  # msoPicture
    $imgs += $n
    Write-Output ("slide {0}: {1} shapes ({2} images)" -f $s.SlideIndex, $s.Shapes.Count, $n)
  }
  if ($bad -eq 0 -and $pres.Slides.Count -eq 13 -and $imgs -gt 0) {
    Write-Output "ASSERT PASS: 13 slides, all non-empty, images present"
  } else {
    Write-Output "ASSERT FAIL"
    exit 1
  }
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

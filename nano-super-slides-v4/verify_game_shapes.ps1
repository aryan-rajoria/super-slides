$ErrorActionPreference = "Stop"
$deck = "$PSScriptRoot\nano-super-agent-registry.pptx"
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($deck, $true, $false, $false)
  Write-Output ("SLIDES: " + $pres.Slides.Count)
  $bad = 0; $imgs = 0; $noname = 0
  foreach ($s in $pres.Slides) {
    if ($s.Shapes.Count -le 0) { $bad++ }
    $n = 0
    foreach ($sh in $s.Shapes) {
      if ($sh.Type -eq 13) { $n++ }
      if ([string]::IsNullOrEmpty($sh.Name)) { $noname++ }
    }
    $imgs += $n
    Write-Output ("slide {0}: {1} shapes ({2} images)" -f $s.SlideIndex, $s.Shapes.Count, $n)
  }
  $s13 = $pres.Slides.Item(13)
  $names = @{}
  foreach ($sh in $s13.Shapes) { $names[$sh.Name] = $sh }
  $want = "runner","machine","machineCup","banner","art1","art2","art3","art4","heart1","heart2","heart3","timeText","cfgTime","cfgScale"
  $miss = @($want | Where-Object { -not $names[$_] })
  Write-Output ("slide13 game shapes missing: [" + ($miss -join ",") + "]")
  Write-Output ("machineCup left=" + $names["machineCup"].Left + " banner left=" + $names["banner"].Left + " cfgTime left=" + $names["cfgTime"].Left + " (all must be < 0 = hidden)")
  Write-Output ("machine W=" + [math]::Round($names["machine"].Width/72,2) + "in H=" + [math]::Round($names["machine"].Height/72,2) + "in")
  if ($bad -eq 0 -and $pres.Slides.Count -eq 13 -and $imgs -gt 0 -and $miss.Count -eq 0 -and $noname -eq 0 -and $names["machineCup"].Left -lt 0 -and $names["banner"].Left -lt 0) {
    Write-Output "ASSERT PASS: 13 slides, images resolve, all shapes named, game contract on s13"
  } else { Write-Output "ASSERT FAIL"; exit 1 }
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

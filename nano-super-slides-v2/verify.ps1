$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$f = Join-Path $here "nano-super-coffee-quest.pptm"

$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($f, $true, $false, $false)
  Write-Output ("FILE: " + $pres.Name + "  slides: " + $pres.Slides.Count)
  $vb = $pres.VBProject
  Write-Output ("VBComponents: " + $vb.VBComponents.Count)
  foreach ($c in $vb.VBComponents) {
    Write-Output ("  comp: " + $c.Name + " type:" + $c.Type + " lines:" + $c.CodeModule.CountOfLines)
  }
  $names = @("man_runA","man_runB","man_jump","man_idle","cactus","rock","skyline","cloud1","cloud2","mark1","mark2","sign1","sign2","sign3","bush","heartF1","heartF2","heartF3","heartE1","heartE2","heartE3","timerbar","timetext","cfgTime")
  $found = 0; $missing = @()
  foreach ($n in $names) {
    try { $s = $pres.Slides.Item(2).Shapes.Item($n); $found++ } catch { $missing += $n }
  }
  Write-Output ("SLIDE2 shapes: " + $found + "/" + $names.Count + ($(if ($missing) { "  MISSING: " + ($missing -join ",") } else { "" })))
  $names13 = @("machine","machine_on","machine_done","steam","steam2","coffeetext","man_idle")
  $found13 = 0; $missing13 = @()
  foreach ($n in $names13) {
    try { $s = $pres.Slides.Item(13).Shapes.Item($n); $found13++ } catch { $missing13 += $n }
  }
  Write-Output ("SLIDE13 shapes: " + $found13 + "/" + $names13.Count + ($(if ($missing13) { "  MISSING: " + ($missing13 -join ",") } else { "" })))
  # timer cfg spot check
  foreach ($i in 1,2,7,13) {
    $cfg = $pres.Slides.Item($i).Shapes.Item("cfgTime").TextFrame.TextRange.Text
    Write-Output ("slide $i cfgTime=" + $cfg)
  }
  $pres.Close()
  Write-Output "VERIFY OK"
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open((Join-Path $here "nano-super-coffee-quest.pptm"), $true, $false, $true)
  $s1 = $pres.Slides.Item(1)

  # initialize (lazy-load) the VBA project BEFORE the show - required for auto-macros in COM sessions
  try {
    $null = $pp.GetType().InvokeMember("Run", [Reflection.BindingFlags]::InvokeMethod, $null, $pp, @("nano-super-coffee-quest.pptm!DBG_PING"))
  } catch {}
  Write-Output ("pre: cfg=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text)

  $show = $pres.SlideShowSettings.Run()
  Start-Sleep -Milliseconds 2800
  $runB = $s1.Shapes.Item("man_runB").Visible
  Write-Output ("start s1: runBvis=" + $runB + " skylineL=" + [math]::Round($s1.Shapes.Item("skyline").Left,1) + " cactusVis=" + $s1.Shapes.Item("cactus").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible)

  $show.View.Next()
  Start-Sleep -Milliseconds 3800
  $s2 = $pres.Slides.Item(2)
  Write-Output ("s2 fwd: cactusVis=" + $s2.Shapes.Item("cactus").Visible + " rockVis=" + $s2.Shapes.Item("rock").Visible + " skylineL=" + [math]::Round($s2.Shapes.Item("skyline").Left,1) + " timer=" + $s2.Shapes.Item("timetext").TextFrame.TextRange.Text + " barW=" + [math]::Round($s2.Shapes.Item("timerbar").Width,0) + " heartE3vis=" + $s2.Shapes.Item("heartE3").Visible)

  $show.View.Previous()
  Start-Sleep -Milliseconds 2400
  Write-Output ("s1 back: heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible + " E3L=" + [math]::Round($s1.Shapes.Item("heartE3").Left,1))

  $show.View.GotoSlide(13)
  Start-Sleep -Milliseconds 9000
  $s13 = $pres.Slides.Item(13)
  Write-Output ("s13 finale: machineVis=" + $s13.Shapes.Item("machine").Visible + " machineDoneVis=" + $s13.Shapes.Item("machine_done").Visible + " idleVis=" + $s13.Shapes.Item("man_idle").Visible + " idleL=" + [math]::Round($s13.Shapes.Item("man_idle").Left,0) + " coffeeTextVis=" + $s13.Shapes.Item("coffeetext").Visible + " steamVis=" + ($s13.Shapes.Item("steam").Visible + $s13.Shapes.Item("steam2").Visible) + " heartF1vis=" + $s13.Shapes.Item("heartF1").Visible)

  $show.View.Exit()
  Start-Sleep -Milliseconds 2500
  Write-Output ("exit: cfg=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text + " | s1 heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " E3vis=" + $s1.Shapes.Item("heartE3").Visible + " manAL=" + [math]::Round($s1.Shapes.Item("man_runA").Left,0) + " sign2vis=" + $s1.Shapes.Item("sign2").Visible + " cactusVis=" + $s1.Shapes.Item("cactus").Visible + " | s13 machineVis=" + $s13.Shapes.Item("machine").Visible + " machineDoneVis=" + $s13.Shapes.Item("machine_done").Visible + " coffeeVis=" + $s13.Shapes.Item("coffeetext").Visible)
  $pres.Close()
  Write-Output "FINAL VERIFY DONE"
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

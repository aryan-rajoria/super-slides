$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open((Join-Path $here "nano-super-coffee-quest-compact.pptm"), $true, $false, $true)
  $s1 = $pres.Slides.Item(1)

  # lazy-load + compile signal (machine gotcha D/A); a throw = compile failure
  try {
    $null = $pp.GetType().InvokeMember("Run", [Reflection.BindingFlags]::InvokeMethod, $null, $pp, @("nano-super-coffee-quest-compact.pptm!DBG_PING"))
    Write-Output "probe: DBG_PING ok"
  } catch { Write-Output ("probe: DBG_PING THREW -> " + $_.Exception.Message) }
  Write-Output ("pre: cfgTime=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text + " cfgScale=" + $s1.Shapes.Item("cfgScale").TextFrame.TextRange.Text)

  # machine gotcha #13/#14: SlideShowSettings.Run() is E_FAIL machine-wide and
  # View.Next() double-advances - start via the ribbon command, drive with GotoSlide only.
  $pp.Visible = -1
  $pp.CommandBars.ExecuteMso("SlideShowFromBeginning")
  Start-Sleep -Milliseconds 4500
  $show = $pp.SlideShowWindows.Item(1)
  Write-Output ("start s1(16c): runBvis=" + $s1.Shapes.Item("man_runB").Visible + " cloud1L=" + [math]::Round($s1.Shapes.Item("cloud1").Left,1) + " (authored 3.1in=223.2) chestVis=" + $s1.Shapes.Item("chest").Visible + " cactusVis=" + $s1.Shapes.Item("cactus").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible)

  $show.View.GotoSlide(2)
  Start-Sleep -Milliseconds 1200
  $s2 = $pres.Slides.Item(2)
  Write-Output ("s2 fwd(13c) @1.2s: cactusVis=" + $s2.Shapes.Item("cactus").Visible + " skylineL=" + [math]::Round($s2.Shapes.Item("skyline").Left,1) + " (authored -160)")
  Start-Sleep -Milliseconds 2500
  $v1 = $s2.Shapes.Item("timerbar").Visible; Start-Sleep -Milliseconds 300
  $v2 = $s2.Shapes.Item("timerbar").Visible; Start-Sleep -Milliseconds 300
  $v3 = $s2.Shapes.Item("timerbar").Visible
  Write-Output ("s2 settled: timer=" + $s2.Shapes.Item("timetext").TextFrame.TextRange.Text + " barW=" + [math]::Round($s2.Shapes.Item("timerbar").Width,0) + " blink=" + $v1 + "/" + $v2 + "/" + $v3 + " heartE3vis=" + $s2.Shapes.Item("heartE3").Visible)

  $show.View.GotoSlide(1)
  Start-Sleep -Milliseconds 2600
  Write-Output ("s1 back: heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible + " E3L=" + [math]::Round($s1.Shapes.Item("heartE3").Left,1))

  # chest observation window: spawns 8-20s into a slide's normal run - watch s3 for 14s
  $show.View.GotoSlide(3)
  Start-Sleep -Milliseconds 14000
  $s3 = $pres.Slides.Item(3)
  Write-Output ("s3 chest watch(14s): chestVis=" + $s3.Shapes.Item("chest").Visible + " chestL=" + [math]::Round($s3.Shapes.Item("chest").Left,0) + " hearts intact=" + $s3.Shapes.Item("heartF1").Visible)

  $show.View.GotoSlide(6)
  Start-Sleep -Milliseconds 10000
  $s6 = $pres.Slides.Item(6)
  Write-Output ("s6 finale(7c): machineVis=" + $s6.Shapes.Item("machine").Visible + " machineDoneVis=" + $s6.Shapes.Item("machine_done").Visible + " idleVis=" + $s6.Shapes.Item("man_idle").Visible + " idleL=" + [math]::Round($s6.Shapes.Item("man_idle").Left,0) + " coffeeVis=" + $s6.Shapes.Item("coffeetext").Visible + " steamVis=" + ($s6.Shapes.Item("steam").Visible + $s6.Shapes.Item("steam2").Visible) + " heartF1vis=" + $s6.Shapes.Item("heartF1").Visible + " chestVis=" + $s6.Shapes.Item("chest").Visible)

  $show.View.Exit()
  Start-Sleep -Milliseconds 3000
  Write-Output ("exit: cfg=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text + " | s1 heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " E3vis=" + $s1.Shapes.Item("heartE3").Visible + " manAL=" + [math]::Round($s1.Shapes.Item("man_runA").Left,0) + " (rest 150) cloudL=" + [math]::Round($s1.Shapes.Item("cloud1").Left,1) + " chestVis=" + $s1.Shapes.Item("chest").Visible + " | s6 machineVis=" + $s6.Shapes.Item("machine").Visible + " doneVis=" + $s6.Shapes.Item("machine_done").Visible + " coffeeVis=" + $s6.Shapes.Item("coffeetext").Visible + " chestL=" + [math]::Round($s6.Shapes.Item("chest").Left,0))
  $pres.Close()
  Write-Output "FINAL VERIFY DONE"
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

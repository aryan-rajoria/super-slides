$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open((Join-Path $here "nano-super-coffee-quest-v3.pptm"), $true, $false, $true)
  $s1 = $pres.Slides.Item(1)

  # initialize (lazy-load) the VBA project BEFORE the show - required for
  # auto-macros in COM sessions. A throw here also signals a compile failure.
  try {
    $null = $pp.GetType().InvokeMember("Run", [Reflection.BindingFlags]::InvokeMethod, $null, $pp, @("nano-super-coffee-quest-v3.pptm!DBG_PING"))
    Write-Output "probe: DBG_PING ok (project loads)"
  } catch { Write-Output ("probe: DBG_PING THREW -> " + $_.Exception.Message) }
  Write-Output ("pre: cfgTime=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text + " cfgScale=" + $s1.Shapes.Item("cfgScale").TextFrame.TextRange.Text)

  # SlideShowSettings.Run() is currently E_FAIL machine-wide (26200 box; blank
  # decks fail too) - the ribbon command path (same as pressing F5) works, so
  # start the show through ExecuteMso and grab the window it creates.
  $pp.Visible = -1
  $pp.CommandBars.ExecuteMso("SlideShowFromBeginning")
  Start-Sleep -Milliseconds 1200
  $show = $pp.SlideShowWindows.Item(1)
  Start-Sleep -Milliseconds 4200
  $runB = $s1.Shapes.Item("man_runB").Visible
  $cloudL = [math]::Round($s1.Shapes.Item("cloud1").Left, 1)
  Write-Output ("start s1(MICRO): runBvis=" + $runB + " cloud1L=" + $cloudL + " (authored 3.1in=223.2) cactusVis=" + $s1.Shapes.Item("cactus").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible)

  # NOTE: View.Next() double-advances on this 26200 build (one call fired TWO
  # page-change events: 1->2->3) - drive exclusively with GotoSlide, which
  # fires exactly one event per call. Direction (fwd/back) derives from the
  # index diff, so GotoSlide(2) = jump, GotoSlide(1) = heart-pop, GotoSlide(5)
  # = finale, same coverage as Next/Previous.
  $show.View.GotoSlide(2)
  Start-Sleep -Milliseconds 1500
  $s2 = $pres.Slides.Item(2)
  Write-Output ("s2 fwd(SMALL) @1.5s: cactusVis=" + $s2.Shapes.Item("cactus").Visible + " runJumpVis=" + $s2.Shapes.Item("man_jump").Visible)
  Start-Sleep -Milliseconds 3000
  $v1 = $s2.Shapes.Item("timerbar").Visible; Start-Sleep -Milliseconds 300
  $v2 = $s2.Shapes.Item("timerbar").Visible; Start-Sleep -Milliseconds 300
  $v3 = $s2.Shapes.Item("timerbar").Visible
  Write-Output ("s2 fwd(SMALL): skylineL=" + [math]::Round($s2.Shapes.Item("skyline").Left,1) + " (authored -160) timer=" + $s2.Shapes.Item("timetext").TextFrame.TextRange.Text + " barW=" + [math]::Round($s2.Shapes.Item("timerbar").Width,0) + " blink=" + $v1 + "/" + $v2 + "/" + $v3 + " heartE3vis=" + $s2.Shapes.Item("heartE3").Visible)

  $show.View.GotoSlide(1)
  Start-Sleep -Milliseconds 2600
  Write-Output ("s1 back: heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " heartE3vis=" + $s1.Shapes.Item("heartE3").Visible + " E3L=" + [math]::Round($s1.Shapes.Item("heartE3").Left,1))

  $show.View.GotoSlide(5)
  Start-Sleep -Milliseconds 10000
  $s5 = $pres.Slides.Item(5)
  Write-Output ("s5 finale(JUMBO): machineVis=" + $s5.Shapes.Item("machine").Visible + " machineDoneVis=" + $s5.Shapes.Item("machine_done").Visible + " idleVis=" + $s5.Shapes.Item("man_idle").Visible + " idleL=" + [math]::Round($s5.Shapes.Item("man_idle").Left,0) + " coffeeTextVis=" + $s5.Shapes.Item("coffeetext").Visible + " steamVis=" + ($s5.Shapes.Item("steam").Visible + $s5.Shapes.Item("steam2").Visible) + " heartF1vis=" + $s5.Shapes.Item("heartF1").Visible + " heartF3vis=" + $s5.Shapes.Item("heartF3").Visible)

  $show.View.Exit()
  Start-Sleep -Milliseconds 3000
  Write-Output ("exit: cfg=" + $s1.Shapes.Item("cfgTime").TextFrame.TextRange.Text + " | s1 heartF3vis=" + $s1.Shapes.Item("heartF3").Visible + " E3vis=" + $s1.Shapes.Item("heartE3").Visible + " manAL=" + [math]::Round($s1.Shapes.Item("man_runA").Left,0) + " (rest 150) cloudL=" + [math]::Round($s1.Shapes.Item("cloud1").Left,1) + " sign2vis=" + $s1.Shapes.Item("sign2").Visible + " cactusVis=" + $s1.Shapes.Item("cactus").Visible + " | s5 machineVis=" + $s5.Shapes.Item("machine").Visible + " machineDoneVis=" + $s5.Shapes.Item("machine_done").Visible + " coffeeVis=" + $s5.Shapes.Item("coffeetext").Visible + " manAL=" + [math]::Round($s5.Shapes.Item("man_runA").Left,0))
  $pres.Close()
  Write-Output "FINAL VERIFY DONE"
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

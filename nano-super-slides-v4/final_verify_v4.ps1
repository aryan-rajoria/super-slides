$ErrorActionPreference = "Continue"
# REGISTRY BREWING runtime verification (COM; v3 final_verify pattern)
#   stage 0  static: 13 slides, slide-13 = authored+7 IO shapes, button actions
#   stage 1  compile: DBG_PING + DBG_COMPILE probes (lazy-compile trap)
#   stage 2  show 1: entry reset, spawn+drift, 4x lane-intercept collect,
#            BREW+WIN (cup/banner/buttons), exit restore
#   stage 3  show 2: 3 misses -> hearts drain -> 0-hearts soft reset
#   stage 4  show 3: cfgTime=8 -> countdown -> timeout soft reset
#   final    slides 1-12 shape counts identical to the authored .pptx
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pptx = Join-Path $here "nano-super-agent-registry.pptx"
$pptm = Join-Path $here "nano-super-agent-registry.pptm"
$script:pass = 0; $script:fail = 0
function OK($cond, $label) {
  if ($cond) { $script:pass++; Write-Output ("PASS  " + $label) }
  else { $script:fail++; Write-Output ("FAIL  " + $label) }
}
function RunMacro($pp, $name) {
  $null = $pp.GetType().InvokeMember("Run", [Reflection.BindingFlags]::InvokeMethod, $null, $pp, @($name))
}
function TT($shape) { $shape.TextFrame.TextRange.Text }          # text shorthand
function Vis($shape) { ($shape.Visible -eq -1) }                 # msoTrue
# wait for a DRIFTING cube (visible, right of the runner); null on timeout
function WaitSpawn($s13, $maxMs) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.ElapsedMilliseconds -lt $maxMs) {
    Start-Sleep -Milliseconds 200
    foreach ($i in 1..4) {
      $a = $s13.Shapes.Item("art$i")
      if ((Vis $a) -and $a.Left -gt 660) { return $a }
    }
  }
  return $null
}
function NHearts($s13) {
  $n = 0; foreach ($i in 1..3) { if (Vis $s13.Shapes.Item("heart$i")) { $n++ } }; $n
}

cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
Start-Sleep -Seconds 2

$pp = New-Object -ComObject PowerPoint.Application
try {
  # ---------------- baseline from the authored .pptx ----------------
  $b = $pp.Presentations.Open($pptx, $true, $false, $true)
  OK ($b.Slides.Count -eq 13) ("pptx has 13 slides (" + $b.Slides.Count + ")")
  $base = @{}
  foreach ($i in @(1, 2, 7, 12, 13)) { $base[$i] = $b.Slides.Item($i).Shapes.Count }
  $bx = $b.Slides.Item(13)
  $bRunT = $bx.Shapes.Item("runner").Top;  $bRunL = $bx.Shapes.Item("runner").Left
  $bArt1L = $bx.Shapes.Item("art1").Left
  $bBanL = $bx.Shapes.Item("banner").Left
  $bCupL = $bx.Shapes.Item("machineCup").Left
  $bMachW = $bx.Shapes.Item("machine").Width
  Write-Output ("baseline counts 1/2/7/12/13 = " + ($base[1]) + "/" + ($base[2]) + "/" + ($base[7]) + "/" + ($base[12]) + "/" + ($base[13]))
  $b.Close()

  # ---------------- open the pptm read-write (never saved) ----------------
  $pres = $pp.Presentations.Open($pptm, $false, $false, $true)
  $s13 = $pres.Slides.Item(13)

  # stage 0: static structure
  OK ($pres.Slides.Count -eq 13) ("pptm has 13 slides (" + $pres.Slides.Count + ")")
  $c13 = $s13.Shapes.Count
  OK ($c13 -eq $base[13] + 7) ("slide13 = authored + 7 IO shapes (" + $c13 + " vs " + $base[13] + "+7)")
  foreach ($i in @(1, 2, 7, 12)) { OK ($pres.Slides.Item($i).Shapes.Count -eq $base[$i]) ("slide $i shape count unchanged (" + $pres.Slides.Item($i).Shapes.Count + ")") }
  $actU = $s13.Shapes.Item("btnUp").ActionSettings.Item(1)
  $actD = $s13.Shapes.Item("btnDown").ActionSettings.Item(1)
  OK (($actU.Action -eq 7) -and ($actU.Run -eq "RunnerUp") -and ($actD.Action -eq 7) -and ($actD.Run -eq "RunnerDown")) ("btnUp/btnDown run-macro actions wired")
  $chipsHidden = (-not (Vis $s13.Shapes.Item("brewR"))) -and (-not (Vis $s13.Shapes.Item("brewG"))) -and (-not (Vis $s13.Shapes.Item("brewA")))
  OK $chipsHidden "brewR/brewG/brewA authored hidden"
  OK (-not (Vis $s13.Shapes.Item("banner"))) "banner authored hidden"
  OK (-not (Vis $s13.Shapes.Item("machineCup"))) "machineCup authored hidden"

  # stage 1: compile probes (must run BEFORE the show - lazy VBA init)
  try { RunMacro $pp "nano-super-agent-registry.pptm!DBG_PING";   OK $true "probe DBG_PING ran" }
  catch { OK $false ("probe DBG_PING THREW: " + $_.Exception.Message) }
  try { RunMacro $pp "nano-super-agent-registry.pptm!DBG_COMPILE"; OK $true "probe DBG_COMPILE ran (whole call graph compiles)" }
  catch { OK $false ("probe DBG_COMPILE THREW: " + $_.Exception.Message) }
  $cfg = TT $s13.Shapes.Item("cfgTime")
  OK ($cfg -match "M" -and $cfg -match "C") ("telemetry channel live (cfgTime = '" + $cfg + "')")

  # ---------------- show 1: the win path ----------------
  $pp.Visible = -1
  $pp.CommandBars.ExecuteMso("SlideShowFromBeginning")
  Start-Sleep -Milliseconds 4500
  $show = $pp.SlideShowWindows.Item(1)
  $show.View.GotoSlide(13)
  Start-Sleep -Milliseconds 900
  $hidden = $true
  foreach ($i in 1..4) { if (Vis $s13.Shapes.Item("art$i")) { $hidden = $false } }
  OK $hidden "entry: showcase cubes art1..4 hidden"
  OK ((NHearts $s13) -eq 3) "entry: 3 hearts full"
  OK ((TT $s13.Shapes.Item("timeText")) -eq "1:30") ("entry: timeText = 1:30 (got '" + (TT $s13.Shapes.Item("timeText")) + "')")
  OK ((TT $s13.Shapes.Item("cfgTime")) -match "GO") "entry: engine GO marker"
  foreach ($i in @(1, 2, 7, 12)) { OK ($pres.Slides.Item($i).Shapes.Count -eq $base[$i]) ("mid-show: slide $i count unchanged") }

  $runH = $s13.Shapes.Item("runner").Height
  $collected = 0
  for ($k = 1; $k -le 4; $k++) {
    $sp = WaitSpawn $s13 9000
    if ($null -eq $sp) { OK $false "cube $k spawned"; break }
    OK $true ("cube $k spawned (art at Left=" + [math]::Round($sp.Left, 0) + ", Top=" + [math]::Round($sp.Top, 1) + ")")
    if ($k -eq 1) {
      $l1 = $sp.Left; Start-Sleep -Milliseconds 600; $l2 = $sp.Left
      OK (($l2 - $l1) -lt -25) ("cube drifts left (" + [math]::Round($l2 - $l1, 1) + "pt/600ms)")
    }
    # lane-intercept: bottom-align the runner with the cube = same lane
    $s13.Shapes.Item("runner").Top = $sp.Top + $sp.Height - $runH
    $gotIt = $false
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.ElapsedMilliseconds -lt 8500) {
      Start-Sleep -Milliseconds 250
      if ($sp.Left -lt 400) { $gotIt = $true; break }    # parked in HUD row
      if (-not (Vis $sp)) { break }                      # missed (bad)
    }
    if ($gotIt) { $collected++; OK ($sp.Width -lt 20) ("cube $k collected into HUD slot (w=" + [math]::Round($sp.Width, 1) + "pt)") }
    else { OK $false ("cube $k NOT collected (Left=" + [math]::Round($sp.Left, 0) + ")") }
  }
  OK ($collected -eq 4) "all 4 skill-cubes collected"
  Start-Sleep -Milliseconds 3200                  # brew = 56 ticks ~ 1.4s + margin
  OK (Vis $s13.Shapes.Item("machineCup")) "WIN: machineCup revealed"
  OK ($s13.Shapes.Item("machineCup").Left -gt 0) "WIN: cup in the dispense slot"
  OK (vis $s13.Shapes.Item("banner")) "WIN: banner revealed"
  OK ($s13.Shapes.Item("banner").Left -gt 0) ("WIN: banner on-slide (L=" + [math]::Round($s13.Shapes.Item("banner").Left, 0) + ")")
  OK ((Vis $s13.Shapes.Item("brewR")) -and (Vis $s13.Shapes.Item("brewG")) -and (Vis $s13.Shapes.Item("brewA"))) "WIN: RED/GREEN/AMBER buttons lit"
  OK ((TT $s13.Shapes.Item("cfgTime")) -match "WIN") "WIN: engine WIN marker"
  $show.View.Exit()
  Start-Sleep -Milliseconds 3000
  OK ((Vis $s13.Shapes.Item("art1")) -and ([math]::Abs($s13.Shapes.Item("art1").Left - $bArt1L) -lt 1)) "exit: art1 restored visible at authored x"
  OK (-not (Vis $s13.Shapes.Item("banner"))) "exit: banner hidden"
  OK (-not (Vis $s13.Shapes.Item("machineCup"))) "exit: machineCup hidden"
  OK (([math]::Abs($s13.Shapes.Item("runner").Top - $bRunT) -lt 1) -and ([math]::Abs($s13.Shapes.Item("runner").Left - $bRunL) -lt 1)) "exit: runner restored"
  OK ([math]::Abs($s13.Shapes.Item("machine").Width - $bMachW) -lt 1) "exit: machine un-pulsed"
  OK ((TT $s13.Shapes.Item("timeText")) -eq "") "exit: timeText cleared"
  OK ((NHearts $s13) -eq 3) "exit: hearts restored"

  # ---------------- show 2: misses -> hearts -> soft reset ----------------
  $s13.Shapes.Item("cfgTime").TextFrame.TextRange.Text = "90"   # fresh budget read
  $pp.CommandBars.ExecuteMso("SlideShowFromBeginning")
  Start-Sleep -Milliseconds 4500
  $show = $pp.SlideShowWindows.Item(1)
  $show.View.GotoSlide(13)
  Start-Sleep -Milliseconds 900
  $pitch = 1.35 * $runH
  $misses = 0
  for ($k = 1; $k -le 3; $k++) {
    $sp = WaitSpawn $s13 9000
    if ($null -eq $sp) { OK $false "miss $k spawn"; break }
    $s13.Shapes.Item("runner").Top = $sp.Top + 0.55 * $pitch   # deliberately between lanes
    $done = $false
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.ElapsedMilliseconds -lt 17000) {
      Start-Sleep -Milliseconds 300
      if (-not (Vis $sp)) { $done = $true; break }             # exited left -> miss
      if ($sp.Left -lt 400) { break }                          # accidental collect
    }
    if ($done) {
      $misses++
      OK ((NHearts $s13) -eq (3 - $k)) ("miss ${k}: cube exited, hearts now " + (3 - $k))
    } else { OK $false ("miss $k did not register (hearts=" + (NHearts $s13) + ")") }
  }
  OK ($misses -eq 3) "3 misses drained all hearts"
  Start-Sleep -Milliseconds 1200
  OK ((NHearts $s13) -eq 3) "0 hearts -> soft reset: hearts refilled"
  OK ((TT $s13.Shapes.Item("timeText")) -eq "1:30") "soft reset: timer back to 1:30"
  OK ((TT $s13.Shapes.Item("cfgTime")) -match "RST") "engine RST marker"
  $show.View.Exit()
  Start-Sleep -Milliseconds 3000

  # ---------------- show 3: timeout soft reset (cfgTime = 8 s) ----------------
  # (SetTimer wall-rate jitters 15-31 ms/tick, so the wrap is detected by
  #  polling: countdown must reach <= 0:02, then climb back past 0:05)
  $s13.Shapes.Item("cfgTime").TextFrame.TextRange.Text = "8"
  $pp.CommandBars.ExecuteMso("SlideShowFromBeginning")
  Start-Sleep -Milliseconds 4500
  $show = $pp.SlideShowWindows.Item(1)
  $show.View.GotoSlide(13)
  Start-Sleep -Milliseconds 900
  OK ((TT $s13.Shapes.Item("timeText")) -eq "0:08") ("timeout deck: timeText 0:08 (got '" + (TT $s13.Shapes.Item("timeText")) + "')")
  $sawLow = $false; $wrapped = $false; $lo = ""; $hi = ""
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.ElapsedMilliseconds -lt 16000) {
    Start-Sleep -Milliseconds 300
    $sec = -1; [int]::TryParse(((TT $s13.Shapes.Item("timeText")) -split ":")[1], [ref]$sec) | Out-Null
    if ($sec -ge 0 -and $sec -le 2) { $sawLow = $true; $lo = TT $s13.Shapes.Item("timeText") }
    if ($sawLow -and $sec -ge 5) { $wrapped = $true; $hi = TT $s13.Shapes.Item("timeText"); break }
  }
  OK $sawLow ("countdown reached near zero (saw '" + $lo + "')")
  OK $wrapped ("timeout -> soft reset, timer re-counting (after '" + $lo + "' saw '" + $hi + "')")
  OK ((NHearts $s13) -eq 3) "post-timeout: hearts full"
  $show.View.Exit()
  Start-Sleep -Milliseconds 3000

  # ---------------- final: nothing outside slide 13 changed ----------------
  foreach ($i in @(1, 2, 7, 12)) { OK ($pres.Slides.Item($i).Shapes.Count -eq $base[$i]) ("final: slide $i shape count unchanged") }
  OK ((Vis $s13.Shapes.Item("art1")) -and ([math]::Abs($s13.Shapes.Item("art1").Left - $bArt1L) -lt 1)) "final: slide13 restored (art1)"
  OK ((TT $s13.Shapes.Item("cfgTime")) -match "T loop=") "terminate marker written"
  $finalCfg = TT $s13.Shapes.Item("cfgTime")
  Write-Output ("cfgTime trail: " + $finalCfg)
  OK ($finalCfg -match "e=\[\]") "engine reports zero runtime errors"
  $pres.Saved = $true
  $pres.Close()
} finally {
  try { $pp.Quit() } catch { Write-Output ("quit best-effort failed (zombie killed below) :: " + $_.Exception.Message.Trim()) }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}
cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
Write-Output ("FINAL VERIFY: " + $script:pass + " passed, " + $script:fail + " failed")
if ($script:fail -gt 0) { exit 1 } else { exit 0 }

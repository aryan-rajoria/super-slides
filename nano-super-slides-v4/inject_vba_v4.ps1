$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here "nano-super-agent-registry.pptx"
$out = Join-Path $here "nano-super-agent-registry.pptm"
$code = [IO.File]::ReadAllText((Join-Path $here "game_engine_v4.vba"))
if (Test-Path $out) { Remove-Item $out -Force }

# zombie PowerPoint makes every COM slideshow E_FAIL machine-wide - kill first
cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
Start-Sleep -Seconds 2

# v4 folder must be a Trusted Location for auto-macros to run without a prompt
# (v2 = Location900, v3 = Location901; this deck gets Location902 - same hive)
$tlKey = "HKCU:\Software\Microsoft\Office\16.0\PowerPoint\Security\Trusted Locations\Location902"
if (-not (Test-Path $tlKey)) {
  New-Item -Path $tlKey -Force | Out-Null
  New-ItemProperty -Path $tlKey -Name "Path" -Value $here -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $tlKey -Name "AllowSubFolders" -Value 1 -PropertyType DWord -Force | Out-Null
  Write-Output "ADDED Trusted Location Location902 = $here"
} else {
  Write-Output "Trusted Location Location902 already present"
}

# VBA project access must be trusted for COM injection (kept = 1 on this box)
$secKey = "HKCU:\Software\Microsoft\Office\16.0\PowerPoint\Security"
if ((Get-ItemProperty -Path $secKey -Name "AccessVBOM" -ErrorAction SilentlyContinue).AccessVBOM -ne 1) {
  New-ItemProperty -Path $secKey -Name "AccessVBOM" -Value 1 -PropertyType DWord -Force | Out-Null
  Write-Output "SET AccessVBOM = 1"
}

$script:injectFailed = $false
$pp = New-Object -ComObject PowerPoint.Application
try {
  try {
    # ---------------- (body) ----------------
  # READ-WRITE + WITH WINDOW (machine gotcha: windowless/read-only = dead modules)
  $pres = $pp.Presentations.Open($src, $false, $false, $true)
  if ($pres.Slides.Count -ne 13) { throw ("deck has " + $pres.Slides.Count + " slides, expected 13") }

  # ---- player-input chips on slide 13 (run-macro actions, the proven v3
  # btnStart mechanism). Arrow keys belong to the slideshow and key capture
  # needs ActiveX (blocked on this build), so input = click chips +
  # runner.Top as the engine-read input register. Styled like the HUD
  # timeChip: DK_CARD fill 24272F, DK_LINE border 3C414C, 05060A shadow.
  $s13 = $pres.Slides.Item($pres.Slides.Count)
  Write-Output ("slide13 bound: " + $s13.Shapes.Count + " shapes")

  # engine contract: every bound shape name must exist before we inject
  $need = @("runner","machine","machineCup","banner","art1","art2","art3","art4",
            "heart1","heart2","heart3","timeChip","timeText","cfgTime","cfgScale")
  foreach ($n in $need) {
    try { $null = $s13.Shapes.Item($n) }
    catch { throw ("slide13 is missing contract shape: " + $n) }
  }
  Write-Output ("contract check: " + $need.Count + " engine shapes present")
  Write-Output ("cfgTime=" + $s13.Shapes.Item("cfgTime").TextFrame.TextRange.Text +
                " cfgScale=" + $s13.Shapes.Item("cfgScale").TextFrame.TextRange.Text)

  $vb = $pres.VBProject
  $comp = $vb.VBComponents.Add(1)   # vbext_ct_StdModule
  $comp.Name = "GameEngine"
  $comp.CodeModule.AddFromString($code)
  Write-Output ("INJECTED GameEngine (" + $comp.CodeModule.CountOfLines + " lines)")

  # COM ForeColor.RGB = R + G*256 + B*65536 (low byte = red)
  $FILL_DKCARD = 36 + 39 * 256 + 47 * 65536      # 24272F
  $LINE_DKLINE = 60 + 65 * 256 + 76 * 65536      # 3C414C
  $TXT_DKTXT   = 233 + 235 * 256 + 238 * 65536   # E9EBEE
  $FILL_SHADOW = 5 + 6 * 256 + 10 * 65536        # 05060A
  foreach ($b in @(
      @{ n = "btnUp";   x = 320.4; t = "UP"; run = "RunnerUp"   },
      @{ n = "btnDown"; x = 370.8; t = "DN"; run = "RunnerDown" }
    )) {
    $sh = $s13.Shapes.AddShape(1, $b.x + 1.44, 126.36 + 1.44, 44.64, 20.16)
    $sh.Name = "$($b.n)_sh"
    $sh.Fill.ForeColor.RGB = $FILL_SHADOW
    $sh.Line.Visible = 0
    $btn = $s13.Shapes.AddShape(1, $b.x, 126.36, 44.64, 20.16)
    $btn.Name = $b.n
    $btn.Fill.ForeColor.RGB = $FILL_DKCARD
    $btn.Line.Visible = -1
    $btn.Line.ForeColor.RGB = $LINE_DKLINE
    $btn.Line.Weight = 1.5
    $tr = $btn.TextFrame.TextRange
    $tr.Text = $b.t
    $tr.Font.Name = "Consolas"
    $tr.Font.Size = 8
    $tr.Font.Bold = $true
    $tr.Font.Color.RGB = $TXT_DKTXT
    $tr.ParagraphFormat.Alignment = 2      # ppAlignCenter
    $btn.TextFrame.VerticalAnchor = 3      # msoAnchorMiddle
    $act = $btn.ActionSettings.Item(1)     # ppMouseClick
    $act.Action = 7                        # ppActionRunMacro
    $act.Run = $b.run
    Write-Output ("ADDED " + $b.n + " (runs " + $b.run + ")")
  }

  # ---- brew button overlays: bright RED/GREEN/AMBER chips parked exactly on
  # the machine sprite's own button column (cells 21..23 of 26 wide; rows
  # 6-8 RED, 11-13 GREEN, 16-18 AMBER of 46 tall - see gen_sprites_v4.py).
  # Geometry derived from the machine shape's OWN rect, nothing hardcoded.
  # Authored HIDDEN; the engine flashes them during BREW and lights them at WIN.
  $mach = $s13.Shapes.Item("machine")
  $RED_L   = 0xFF + 0x6B * 256 + 0x6B * 65536   # FF6B6B lit red
  $GREEN_L = 0x4A + 0xDE * 256 + 0x80 * 65536   # 4ADE80 lit green
  $AMBER_L = 0xFB + 0xBF * 256 + 0x24 * 65536   # FBBF24 lit amber
  $colCx = $mach.Left + (22.5 / 26.0) * $mach.Width    # centre of button column
  $cw = (5.0 / 26.0) * $mach.Width                     # slightly wider than 3 cells
  $chh = (4.5 / 46.0) * $mach.Height
  foreach ($b in @(
      @{ n = "brewR"; row = 7.5;  col = $RED_L   },
      @{ n = "brewG"; row = 12.5; col = $GREEN_L },
      @{ n = "brewA"; row = 17.5; col = $AMBER_L }
    )) {
    $cy = $mach.Top + ($b.row / 46.0) * $mach.Height
    $chip = $s13.Shapes.AddShape(1, $colCx - $cw / 2.0, $cy - $chh / 2.0, $cw, $chh)
    $chip.Name = $b.n
    $chip.Fill.ForeColor.RGB = $b.col
    $chip.Line.Visible = 0
    $chip.Visible = 0                     # authored hidden; engine reveals
    Write-Output ("ADDED " + $b.n + " (machine button overlay, hidden)")
  }
  Write-Output ("slide13 now: " + $s13.Shapes.Count + " shapes (authored + 7 engine IO)")

  Write-Output "SaveAs pptm..."
  $pres.SaveAs($out, 25)            # ppSaveAsOpenXMLPresentationMacroEnabled
  Write-Output "SAVED $out"
  $pres.Saved = $true
  $pres.Close()
  Write-Output "closed"
  }
  catch {
    # print the REAL failure verbatim (a bare finally-Quit used to mask it);
    # swallow so the trailing taskkill ALWAYS runs - zombie prevention
    Write-Output ("INJECT FAILED :: " + $_.Exception.GetType().Name + " :: " + $_.Exception.Message.Trim() + " :: HR=0x" + $_.Exception.HResult.ToString("X8"))
    $script:injectFailed = $true
  }
} finally {
  try { $pp.Quit() } catch { Write-Output ("quit best-effort failed (zombie killed below) :: " + $_.Exception.Message.Trim()) }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}
# kill again: this session's PowerPoint must not linger as a zombie
cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
Start-Sleep -Seconds 1
if ($script:injectFailed) { Write-Output "FAILED inject_vba_v4"; exit 1 }
Write-Output "DONE inject_vba_v4"

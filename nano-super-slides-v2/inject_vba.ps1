$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here "nano-super-coffee-quest.pptx"
$out = Join-Path $here "nano-super-coffee-quest.pptm"
$code = [IO.File]::ReadAllText((Join-Path $here "game_engine.vba"))
if (Test-Path $out) { Remove-Item $out -Force }

$pp = New-Object -ComObject PowerPoint.Application
try {
  # READ-WRITE + WITH WINDOW: windowless/read-only injection produced modules
  # that never run - PowerPoint requires a windowed, writable presentation.
  $pres = $pp.Presentations.Open($src, $false, $false, $true)
  $vb = $pres.VBProject
  $comp = $vb.VBComponents.Add(1)   # vbext_ct_StdModule
  $comp.Name = "GameEngine"
  $comp.CodeModule.AddFromString($code)
  $lines = $comp.CodeModule.CountOfLines
  Write-Output "INJECTED GameEngine ($lines lines)"
  # START button on the cover (run-macro action): PowerPoint lazy-loads VBA
  # projects, so until any macro runs once the auto-macros never fire - even
  # for an interactively opened .pptm on this Office build. Clicking this
  # button during the show runs StartGame, which arms and starts the engine.
  # (Programmatic Shapes.AddOLEControl is blocked here, so the classic
  #  off-slide ActiveX kicker from PPT FAQ FAQ01152 is not an option.)
  $s1 = $pres.Slides.Item(1)
  $btn = $s1.Shapes.AddShape(1, 310, 454, 230, 20)   # msoShapeRectangle
  $btn.Name = "btnStart"
  $btn.Fill.ForeColor.RGB = 15560495                  # 2F6FED
  $btn.Line.ForeColor.RGB = 2235675                   # 1B1D22
  $btn.Line.Weight = 2
  $tr = $btn.TextFrame.TextRange
  $tr.Text = "CLICK TO START COFFEE QUEST"
  $tr.Font.Name = "Consolas"
  $tr.Font.Size = 9
  $tr.Font.Bold = $true
  $tr.Font.Color.RGB = 16777215                       # FFFFFF
  $tr.ParagraphFormat.Alignment = 2                   # ppAlignCenter
  $btn.TextFrame.VerticalAnchor = 3                   # msoAnchorMiddle
  $act = $btn.ActionSettings.Item(1)                  # ppMouseClick
  $act.Action = 7                                     # ppActionRunMacro
  $act.Run = "StartGame"
  Write-Output "ADDED btnStart (click-to-start, runs StartGame)"
  $pres.SaveAs($out, 25)            # ppSaveAsOpenXMLPresentationMacroEnabled
  Write-Output "SAVED $out"
  $pres.Saved = $true
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

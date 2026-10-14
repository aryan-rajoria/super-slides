$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here "nano-super-coffee-quest-compact.pptx"
$out = Join-Path $here "nano-super-coffee-quest-compact.pptm"
$code = [IO.File]::ReadAllText((Join-Path $here "game_engine_compact.vba"))
if (Test-Path $out) { Remove-Item $out -Force }

# Folder is already a Trusted Location (Location901, AllowSubFolders) - nothing to add.

$pp = New-Object -ComObject PowerPoint.Application
try {
  # READ-WRITE + WITH WINDOW (machine gotcha: windowless/read-only = dead modules)
  $pres = $pp.Presentations.Open($src, $false, $false, $true)
  $vb = $pres.VBProject
  $comp = $vb.VBComponents.Add(1)   # vbext_ct_StdModule
  $comp.Name = "GameEngine"
  $comp.CodeModule.AddFromString($code)
  Write-Output ("INJECTED GameEngine (" + $comp.CodeModule.CountOfLines + " lines)")
  # START button on slide 1: lazy VBA project load kicker (machine gotcha D).
  # Dino-look: solid ink rect, white text, NO border.
  $s1 = $pres.Slides.Item(1)
  $btn = $s1.Shapes.AddShape(1, 310, 300, 230, 20)   # mid-slide, clear of the tiny strip
  $btn.Name = "btnStart"
  $btn.Fill.ForeColor.RGB = 2235675                  # 1B1D22 ink
  $btn.Line.Visible = 0
  $tr = $btn.TextFrame.TextRange
  $tr.Text = "CLICK TO START COFFEE QUEST"
  $tr.Font.Name = "Consolas"
  $tr.Font.Size = 9
  $tr.Font.Bold = $true
  $tr.Font.Color.RGB = 16777215
  $tr.ParagraphFormat.Alignment = 2
  $btn.TextFrame.VerticalAnchor = 3
  $act = $btn.ActionSettings.Item(1)
  $act.Action = 7
  $act.Run = "StartGame"
  Write-Output "ADDED btnStart"
  $pres.SaveAs($out, 25)            # ppSaveAsOpenXMLPresentationMacroEnabled
  Write-Output "SAVED $out"
  $pres.Saved = $true
  $pres.Close()
} finally {
  $pp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}

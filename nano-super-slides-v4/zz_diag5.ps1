$ErrorActionPreference = "Continue"
# ONE targeted diagnostic session (fail-fast compliant): capture the VERBATIM
# exception for each edit class + the app caption, then decide routing.
$here = "C:\Users\aryan\pro\slides\nano-super-slides-v4"
$src = Join-Path $here "nano-super-agent-registry.pptx"
cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
Start-Sleep -Seconds 2
$pp = New-Object -ComObject PowerPoint.Application
Write-Output ("CAPTION: [" + $pp.Caption + "] ver=" + $pp.Version + " build=" + $pp.Build)
function Step($label, $fn) {
  try { & $fn | Out-Null; Write-Output ("ok    " + $label) }
  catch { Write-Output ("DENY  " + $label + " :: " + $_.Exception.GetType().Name + " :: " + $_.Exception.Message.Trim() + " :: HR=0x" + $_.Exception.HResult.ToString("X8")) }
}
try {
  $pres = $pp.Presentations.Open($src, $false, $false, $true)
  $s13 = $pres.Slides.Item(13)
  Write-Output ("opened: slides=" + $pres.Slides.Count + " s13 shapes=" + $s13.Shapes.Count + " final=" + $pres.Final)
  Step "read shape Left"        { $null = $s13.Shapes.Item("runner").Left }
  Step "write existing Left+0"  { $s13.Shapes.Item("runner").Left = $s13.Shapes.Item("runner").Left + 0 }
  Step "AddShape on s13"        { $sh = $s13.Shapes.AddShape(1, 400, 400, 44.64, 20.16); $sh.Delete() }
  Step "VBA module add"         { $vb = $pres.VBProject; $c = $vb.VBComponents.Add(1); $c.Name = "ZzProbe"; $c.CodeModule.AddFromString("' probe") }
  Step "SaveAs pptm"            { $pres.SaveAs((Join-Path $here "zz_probe.pptm"), 25) }
  Write-Output ("post-save exists: " + (Test-Path (Join-Path $here "zz_probe.pptm")))
  $pres.Saved = $true
  $pres.Close()
} catch {
  Write-Output ("OUTER :: " + $_.Exception.GetType().Name + " :: " + $_.Exception.Message.Trim())
} finally {
  try { $pp.Quit() } catch { Write-Output ("QUIT THREW :: " + $_.Exception.Message.Trim()) }
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null
}
cmd /c "taskkill /IM POWERPNT.EXE /F >nul 2>&1"
if (Test-Path (Join-Path $here "zz_probe.pptm")) { Remove-Item (Join-Path $here "zz_probe.pptm") -Force }
Write-Output "DIAG5 DONE"

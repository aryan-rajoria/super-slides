' =====================================================================
'  REGISTRY BREWING ENGINE - nano-super v4 closer mini-game (slide 13)
'  v3 architecture verbatim: SetTimer 25 ms callback ticking a bounded
'  phase state machine; auto-macros return immediately; no blocking
'  loops; all state in module-level vars; shape lookups by objectName
'  through a Dictionary rebuilt at Bind; geometry captured from the
'  slide's own shapes (never hardcoded); telemetry = ring-buffer trail
'  written into the hidden cfgTime shape of the LAST slide.
'
'  Only the LAST slide (the closer) activates. Slides 1..N-1 are never
'  bound, never animated, never written - they stay static.
'
'  GAME
'   * runner (BLUE voxel runner) stands at his authored x, feet on the
'     ground lane; the player lifts him UP/DOWN across 3 lanes
'   * skill-cubes art1..art4 (CLAUDE amber / CODEX green / OPENCODE
'     blue / PI purple) drift in ONE AT A TIME from the right on one
'     of the 3 lanes (v3 drifting-chest mechanic)
'   * input: the click chips btnUp/btnDown (added by inject_vba_v4.ps1,
'     run-macro actions RunnerUp/RunnerDown) snap runner.Top to the
'     next lane; the engine reads runner.Top every tick as the INPUT
'     register, so COM verification drives the game by setting the same
'     shape property (arrow keys are owned by the slideshow and key
'     capture needs ActiveX, which this Office build blocks)
'   * lane-matched touch = collect: the cube parks miniaturised in the
'     HUD inventory row next to the time chip (all 4 slots = the
'     machine's cup window)
'   * all 4 collected -> BREW: machine pulses, the HUD cubes flash,
'     the RED/GREEN/AMBER button overlays (brewR/brewG/brewA, added by
'     the inject script over the machine's button column) chase, then
'     light solid; machineCup drops into the dispense slot; banner ONE
'     REGISTRY - EVERY AGENT rises right-aligned over the machine
'     -> WON (idle)
'   * miss (cube exits the left edge) = -1 of 3 hearts, cube respawns
'     later; 0 hearts OR cfgTime (default 90 s) elapsed = soft reset
'     (fresh board, full hearts) - the closer easter egg is never a
'     dead end
'   * leaving the slide / ending the show restores the authored slide
' =====================================================================
#If VBA7 Then
Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal ms As Long)
Private Declare PtrSafe Function SetTimer Lib "user32" (ByVal hWnd As LongPtr, ByVal nIDEvent As LongPtr, ByVal uElapse As Long, ByVal lpTimerFunc As LongPtr) As LongPtr
Private Declare PtrSafe Function KillTimer Lib "user32" (ByVal hWnd As LongPtr, ByVal uIDEvent As LongPtr) As Long
#Else
Private Declare Sub Sleep Lib "kernel32" (ByVal ms As Long)
Private Declare Function SetTimer Lib "user32" (ByVal hWnd As Long, ByVal nIDEvent As Long, ByVal uElapse As Long, ByVal lpTimerFunc As Long) As Long
Private Declare Function KillTimer Lib "user32" (ByVal hWnd As Long, ByVal uIDEvent As Long) As Long
#End If

' ---- tuned constants (pt per 25 ms tick) ----
' Gameplay travel speeds stay UNSCALED (v3 compact lesson: the slide
'  width to cross is constant); there is no parallax layer here.
Private Const TICK As Single = 0.025     ' seconds per timer tick
Private Const SPD_ART As Single = 2.4    ' artifact drift (96 pt/s)
Private Const TOUCH As Single = 8        ' collision slack (pt) - well under
                                         '  the lane pitch, so neighbours never collect
Private Const LANES As Integer = 3       ' vertical lanes incl. the ground lane
Private Const PITCH_F As Single = 1.35   ' lane pitch = PITCH_F * runner height

' ---- session state ----
Private timerId As LongPtr
Private homePres As Presentation
Private lastIdx As Integer
Private loopCount As Long
Private stopAll As Boolean
Private active As Boolean     ' game is live (we are ON the closer slide)
Private captured As Boolean   ' authored rects cached (once per VBA session)
Private allocGot As Boolean   ' cfgTime budget latched (once per SHOW - the
                              '  trail later reuses that shape's text, and
                              '  Terminate re-arms the latch for the next show)
Private trail As String
Private lastErr As String

' ---- authored rects (captured from the slide's own shapes) ----
Private aRunL As Single, aRunT As Single, aRunW As Single, aRunH As Single
Private aMachL As Single, aMachT As Single, aMachW As Single, aMachH As Single
Private aBanL As Single, aBanT As Single, aBanW As Single, aBanH As Single
Private aCupL As Single, aCupT As Single, aCupW As Single, aCupH As Single
Private aArtL(1 To 4) As Single, aArtT As Single, aArtW As Single, aArtH As Single
Private aChipL As Single, aChipT As Single, aChipW As Single, aChipH As Single
Private aHrtH As Single
Private alloc As Single, allocStr As String

' ---- derived geometry ----
Private mSlideW As Single
Private mGameIdx As Integer    ' the closer = LAST slide (never hardwired)
Private mPitch As Single       ' lane pitch
Private mSlotX As Single, mSlotY As Single, mSlotS As Single, mSlotD As Single
Private mCupShowL As Single, mCupShowT As Single
Private mBanShowL As Single

' ---- live game state ----
Private hearts As Integer
Private phase As Integer       ' 0 play, 1 brew, 2 won (idle)
Private phT As Integer
Private elapsed As Single
Private lastSec As Integer
Private artOn As Integer       ' drifting artifact 1..4 (0 = none)
Private artX As Single
Private got(1 To 4) As Boolean
Private nGot As Integer
Private spawnT As Single       ' ticks until the next spawn

Private sc As Object           ' objectName -> Shape cache

' =====================================================================
'  AUTO-MACROS (return immediately - the timer does the work)
' =====================================================================
Public Sub OnSlideShowPageChange(ByVal Wn As SlideShowWindow)
    On Error Resume Next
    Set homePres = Wn.Presentation
    If homePres Is Nothing Then Exit Sub
    mGameIdx = homePres.Slides.Count
    Dim idx As Integer
    idx = PollIdx()
    If idx < 0 Then Exit Sub
    TraceIt "PC i" & idx
    lastIdx = idx
    HandleEnter idx
End Sub

Public Sub OnSlideShowTerminate(ByVal Wn As SlideShowWindow)
    On Error Resume Next         ' cleanup is best-effort
    TraceIt "T loop=" & loopCount & " h=" & hearts & " p=" & phase & " e=[" & lastErr & "]"
    stopAll = True
    If timerId <> 0 Then
        KillTimer 0, timerId
        timerId = 0
    End If
    If homePres Is Nothing Then Set homePres = Wn.Presentation
    If active Or captured Then ResetAuthored
    active = False
    phase = 0
    hearts = 3
    lastIdx = 0
    captured = False       ' shapes are restored now; recapture next show
    allocGot = False       ' budget must be re-read next show (cfgTime text
                           '  now holds telemetry, and a COM driver may have
                           '  rewritten it between shows)
    Set sc = Nothing
    If Not homePres Is Nothing Then homePres.Saved = True
End Sub

' =====================================================================
'  TIMER CALLBACK - one bounded step per tick
' =====================================================================
Public Sub OnGameTimer(ByVal hWnd As LongPtr, ByVal uMsg As Long, ByVal idEvent As LongPtr, ByVal dwTime As Long)
    On Error Resume Next
    If stopAll Then Exit Sub
    loopCount = loopCount + 1
    GameTick
End Sub

Private Sub GameTick()
    On Error Resume Next
    Dim idx As Integer
    idx = PollIdx()
    If idx < 0 Then         ' show is gone: stop ticking, self-clean
        If timerId <> 0 Then
            KillTimer 0, timerId
            timerId = 0
        End If
        If active Then ResetAuthored
        active = False
        Exit Sub
    End If
    If idx <> lastIdx Then  ' navigation detected between ticks
        TraceIt "TK i" & idx
        lastIdx = idx
        HandleEnter idx
        Exit Sub            ' give the entry state one frame to settle
    End If
    If Not active Then Exit Sub
    Select Case phase
        Case 0: StepPlay
        Case 1: StepBrew
        Case Else           ' 2 = won: idle until nav/terminate
    End Select
End Sub

' =====================================================================
'  ENTRY / LEAVE
' =====================================================================
Private Sub HandleEnter(idx As Integer)
    On Error Resume Next
    If mGameIdx <= 0 Then
        If homePres Is Nothing Then Exit Sub
        mGameIdx = homePres.Slides.Count
    End If
    If idx = mGameIdx Then
        stopAll = False
        Bind homePres.Slides(idx)
        InitGame
        If timerId = 0 Then
            timerId = SetTimer(0, 0, 25, AddressOf OnGameTimer)
            TraceIt "TM"
        End If
    Else
        If active Then      ' left the closer mid-show: stop + restore
            TraceIt "LEAVE"
            ResetAuthored
            If timerId <> 0 Then
                KillTimer 0, timerId
                timerId = 0
            End If
            active = False
        End If
    End If
End Sub

Private Sub InitGame()
    On Error Resume Next
    If Not captured Then CaptureAuthored
    InitState
    active = True
    TraceIt "GO"
End Sub

' fresh board (game start, hearts=0 soft fail, timeout soft fail)
Private Sub InitState()
    On Error Resume Next
    hearts = 3
    phase = 0
    phT = 0
    elapsed = 0
    lastSec = -1
    artOn = 0
    nGot = 0
    spawnT = 60                       ' first cube ~1.5 s in
    Dim i As Integer
    For i = 1 To 4
        got(i) = False
    Next i
    Dim r As Shape
    Set r = Sh("runner")
    If Not r Is Nothing Then
        r.Left = aRunL
        r.Top = aRunT
        r.Width = aRunW
        r.Height = aRunH
    End If
    Dim a As Shape
    For i = 1 To 4
        Set a = Sh("art" & i)
        If Not a Is Nothing Then
            a.Visible = False
            a.Left = aArtL(i)
            a.Top = aArtT
            a.Width = aArtW            ' undo any HUD-slot shrink
            a.Height = aArtH
        End If
    Next i
    Dim m As Shape
    Set m = Sh("machine")
    If Not m Is Nothing Then
        m.Width = aMachW               ' undo any brew pulse
        m.Height = aMachH
        m.Left = aMachL
        m.Top = aMachT
    End If
    If Not Sh("machineCup") Is Nothing Then
        Sh("machineCup").Visible = False
        Sh("machineCup").Left = aCupL
        Sh("machineCup").Top = aCupT
    End If
    If Not Sh("banner") Is Nothing Then
        Sh("banner").Visible = False
        Sh("banner").Left = aBanL
        Sh("banner").Top = aBanT
    End If
    If Not Sh("timeChip") Is Nothing Then Sh("timeChip").Visible = True
    If Not Sh("timeText") Is Nothing Then
        If alloc > 0 Then
            Sh("timeText").TextFrame.TextRange.Text = (alloc \ 60) & ":" & Format(alloc Mod 60, "00")
        End If
    End If
    BrewOff
    DrawHearts
End Sub

' restore the deck's authored closer (leave slide / end show)
Private Sub ResetAuthored()
    On Error Resume Next
    If Not captured Then Exit Sub
    If sc Is Nothing Then Exit Sub
    Dim i As Integer
    Dim r As Shape
    Set r = Sh("runner")
    If Not r Is Nothing Then
        r.Left = aRunL
        r.Top = aRunT
        r.Width = aRunW
        r.Height = aRunH
    End If
    Dim a As Shape
    For i = 1 To 4
        Set a = Sh("art" & i)
        If Not a Is Nothing Then
            a.Visible = True           ' showcase strip is authored-visible
            a.Left = aArtL(i)
            a.Top = aArtT
            a.Width = aArtW
            a.Height = aArtH
        End If
    Next i
    Dim m As Shape
    Set m = Sh("machine")
    If Not m Is Nothing Then
        m.Width = aMachW
        m.Height = aMachH
        m.Left = aMachL
        m.Top = aMachT
    End If
    If Not Sh("machineCup") Is Nothing Then
        Sh("machineCup").Visible = False
        Sh("machineCup").Left = aCupL
        Sh("machineCup").Top = aCupT
    End If
    If Not Sh("banner") Is Nothing Then
        Sh("banner").Visible = False
        Sh("banner").Left = aBanL
        Sh("banner").Top = aBanT
    End If
    If Not Sh("timeChip") Is Nothing Then Sh("timeChip").Visible = True
    If Not Sh("timeText") Is Nothing Then
        Sh("timeText").TextFrame.TextRange.Text = ""   ' authored is empty
    End If
    hearts = 3
    DrawHearts
    ' cfgTime deliberately NOT restored: it is the telemetry channel
    ' (v3 convention); the budget is cached in alloc for the session.
End Sub

' =====================================================================
'  PHASES
' =====================================================================
Private Sub StepPlay()
    On Error Resume Next
    UpdateArtifact
    elapsed = elapsed + TICK
    UpdateClock
End Sub

Private Sub StepBrew()
    On Error Resume Next
    phT = phT + 1
    If phT Mod 4 = 0 Then
        Dim k As Integer, li As Integer, i As Integer
        k = Int(phT / 4)
        li = (k Mod 3) + 1
        BrewLit li                     ' chase RED -> GREEN -> AMBER
        ' flash the collected HUD cubes (the machine's window row)
        For i = 1 To 4
            If Not Sh("art" & i) Is Nothing Then Sh("art" & i).Visible = (k Mod 2 = 0)
        Next i
    End If
    If phT Mod 8 = 0 Then
        Dim m As Shape
        Set m = Sh("machine")
        If Not m Is Nothing Then
            If (phT \ 8) Mod 2 = 0 Then    ' pulse up, bottom-left anchored
                m.Width = aMachW * 1.05
                m.Height = aMachH * 1.05
                m.Left = aMachL
                m.Top = aMachT + aMachH - m.Height
            Else                           ' settle back
                m.Width = aMachW
                m.Height = aMachH
                m.Left = aMachL
                m.Top = aMachT
            End If
        End If
    End If
    If phT >= 56 Then
        Set m = Sh("machine")
        If Not m Is Nothing Then
            m.Width = aMachW
            m.Height = aMachH
            m.Left = aMachL
            m.Top = aMachT
        End If
        For i = 1 To 4
            If Not Sh("art" & i) Is Nothing Then Sh("art" & i).Visible = True
        Next i
        Dim cp As Shape, bn As Shape
        Set cp = Sh("machineCup")
        If Not cp Is Nothing Then
            cp.Visible = True
            cp.Left = mCupShowL
            cp.Top = mCupShowT
        End If
        Set bn = Sh("banner")
        If Not bn Is Nothing Then
            bn.Visible = True
            bn.Left = mBanShowL        ' right-aligned over the machine
            bn.Top = aBanT             ' authored parked top doubles as show top
        End If
        BrewLit 0                      ' all three buttons lit solid
        phase = 2
        TraceIt "WIN"
    End If
End Sub

' =====================================================================
'  WORLD
' =====================================================================
Private Sub UpdateArtifact()
    On Error Resume Next
    If nGot >= 4 Then Exit Sub
    If artOn = 0 Then
        spawnT = spawnT - 1
        If spawnT <= 0 Then SpawnArt
        Exit Sub
    End If
    Dim a As Shape
    Set a = Sh("art" & artOn)
    If a Is Nothing Then
        artOn = 0
        Exit Sub
    End If
    artX = artX - SPD_ART
    Dim r As Shape
    Set r = Sh("runner")
    If Not r Is Nothing Then
        If artX < r.Left + r.Width + TOUCH And artX + a.Width > r.Left - TOUCH And _
           a.Top < r.Top + r.Height + TOUCH And a.Top + a.Height > r.Top - TOUCH Then
            CollectArt a
            Exit Sub
        End If
    End If
    If artX + a.Width < -12 Then       ' fully off the left edge
        MissArt a
        Exit Sub
    End If
    a.Left = artX
End Sub

Private Sub SpawnArt()
    On Error Resume Next
    Dim i As Integer, k As Integer, lane As Integer, nc As Integer
    Dim cand(1 To 4) As Integer
    For i = 1 To 4
        If Not got(i) Then
            nc = nc + 1
            cand(nc) = i
        End If
    Next i
    If nc = 0 Then Exit Sub
    k = cand(1 + Int(Rnd() * nc))
    Dim a As Shape
    Set a = Sh("art" & k)
    If a Is Nothing Then Exit Sub
    lane = Int(Rnd() * LANES)
    artOn = k
    artX = mSlideW + 40
    With a
        .Visible = True
        .Left = artX
        .Top = LaneTop(lane) + aRunH - .Height   ' rides the lane's floor line
    End With
    TraceIt "SP" & k & "L" & lane
End Sub

Private Sub CollectArt(a As Shape)
    On Error Resume Next
    got(artOn) = True
    nGot = nGot + 1
    With a                            ' park the mini-cube in the HUD slot
        .Left = mSlotX + (nGot - 1) * mSlotD
        .Top = mSlotY
        .Width = mSlotS
        .Height = mSlotS
    End With
    TraceIt "COL" & artOn & " n" & nGot
    artOn = 0
    If nGot >= 4 Then
        phase = 1
        phT = 0
        TraceIt "BREW"
    Else
        spawnT = 80 + Rnd() * 80      ' next cube in ~2-4 s
    End If
End Sub

Private Sub MissArt(a As Shape)
    On Error Resume Next
    a.Visible = False
    hearts = hearts - 1
    DrawHearts
    TraceIt "MISS h" & hearts
    artOn = 0
    If hearts <= 0 Then
        TraceIt "RST"                 ' soft fail: fresh board, full hearts
        InitState
    Else
        spawnT = 100 + Rnd() * 80     ' same pool respawns in ~2.5-4.5 s
    End If
End Sub

Private Sub UpdateClock()
    On Error Resume Next
    If alloc <= 0 Then Exit Sub
    Dim sLeft As Single
    sLeft = alloc - elapsed
    If sLeft < 0 Then sLeft = 0
    If Int(sLeft) <> lastSec Then
        lastSec = Int(sLeft)
        If Not Sh("timeText") Is Nothing Then
            Sh("timeText").TextFrame.TextRange.Text = (lastSec \ 60) & ":" & Format(lastSec Mod 60, "00")
        End If
    End If
    If sLeft <= 10 Then
        If loopCount Mod 6 = 0 Then
            If Not Sh("timeChip") Is Nothing Then Sh("timeChip").Visible = Not Sh("timeChip").Visible
        End If
    ElseIf sLeft <= 30 Then
        If loopCount Mod 20 = 0 Then
            If Not Sh("timeChip") Is Nothing Then Sh("timeChip").Visible = Not Sh("timeChip").Visible
        End If
    Else
        If Not Sh("timeChip") Is Nothing Then Sh("timeChip").Visible = True
    End If
    If sLeft <= 0 Then
        TraceIt "TIME"                ' timeout = same soft reset
        InitState
    End If
End Sub

Private Sub DrawHearts()
    On Error Resume Next
    Dim i As Integer
    For i = 1 To 3
        If Not Sh("heart" & i) Is Nothing Then Sh("heart" & i).Visible = (i <= hearts)
    Next i
End Sub

' =====================================================================
'  PLAYER INPUT (click chips on the slide - run-macro actions)
'  runner.Top is the input register: these snap it to the nearest lane
'  one step up/down; the collision test reads the shape every tick, so
'  anything else that writes runner.Top (COM verification) works too.
' =====================================================================
Public Sub RunnerUp()
    On Error Resume Next
    MoveRunnerLane -1
End Sub

Public Sub RunnerDown()
    On Error Resume Next
    MoveRunnerLane 1
End Sub

Private Sub MoveRunnerLane(d As Integer)
    On Error Resume Next
    If Not active Then Exit Sub
    If phase <> 0 Then Exit Sub
    Dim r As Shape
    Set r = Sh("runner")
    If r Is Nothing Then Exit Sub
    Dim cur As Integer, i As Integer, best As Single
    cur = 0
    best = 1E+15
    For i = 0 To LANES - 1
        If Abs(r.Top - LaneTop(i)) < best Then
            best = Abs(r.Top - LaneTop(i))
            cur = i
        End If
    Next i
    cur = cur + d
    If cur < 0 Then cur = 0
    If cur > LANES - 1 Then cur = LANES - 1
    r.Top = LaneTop(cur)
End Sub

Private Function LaneTop(l As Integer) As Single
    On Error Resume Next
    LaneTop = aRunT - l * mPitch
End Function

' =====================================================================
'  BREW BUTTON OVERLAYS (brewR/brewG/brewA - inject-placed over the
'  machine's own RED/GREEN/AMBER button column; engine only toggles
'  Visible, never moves them)
' =====================================================================
Private Sub BrewLit(onIdx As Integer)
    On Error Resume Next
    Dim nm As Variant, i As Integer
    i = 1
    For Each nm In Array("brewR", "brewG", "brewA")
        If Not Sh(CStr(nm)) Is Nothing Then Sh(CStr(nm)).Visible = (onIdx = 0 Or onIdx = i)
        i = i + 1
    Next nm
End Sub

Private Sub BrewOff()
    On Error Resume Next
    Dim nm As Variant
    For Each nm In Array("brewR", "brewG", "brewA")
        If Not Sh(CStr(nm)) Is Nothing Then Sh(CStr(nm)).Visible = False
    Next nm
End Sub

' =====================================================================
'  GEOMETRY CAPTURE (once per VBA session; shapes are authored-restored
'  before every recapture, so a mid-game leave can never poison it)
' =====================================================================
Private Sub CaptureAuthored()
    On Error Resume Next
    If homePres Is Nothing Then Exit Sub
    mSlideW = 960                       ' 13.333 in deck (fallback)
    If homePres.PageSetup.SlideWidth > 0 Then mSlideW = homePres.PageSetup.SlideWidth
    mGameIdx = homePres.Slides.Count
    LatchAlloc                          ' budget FIRST: TraceIt reuses the
                                        '  cfgTime shape as its telemetry channel
    Dim r As Shape, m As Shape, bn As Shape, cp As Shape, a As Shape
    Dim ch As Shape, h1 As Shape, cs As Shape
    Dim i As Integer
    Set r = Sh("runner")
    If r Is Nothing Then Exit Sub       ' not the game slide after all
    aRunL = r.Left: aRunT = r.Top: aRunW = r.Width: aRunH = r.Height
    Set m = Sh("machine")
    If m Is Nothing Then
        aMachL = mSlideW - 90: aMachT = aRunT: aMachW = 80: aMachH = aRunH * 1.8
    Else
        aMachL = m.Left: aMachT = m.Top: aMachW = m.Width: aMachH = m.Height
    End If
    Set bn = Sh("banner")
    If bn Is Nothing Then
        aBanL = -450: aBanT = aRunT - 1.4 * aRunH: aBanW = 414: aBanH = 19
    Else
        aBanL = bn.Left: aBanT = bn.Top: aBanW = bn.Width: aBanH = bn.Height
    End If
    Set cp = Sh("machineCup")
    If cp Is Nothing Then
        aCupL = -65: aCupT = aRunT: aCupW = 25: aCupH = 19
    Else
        aCupL = cp.Left: aCupT = cp.Top: aCupW = cp.Width: aCupH = cp.Height
    End If
    aArtT = aRunT + aRunH              ' fallback only (off the field)
    aArtW = 25: aArtH = 25
    For i = 1 To 4
        Set a = Sh("art" & i)
        If Not a Is Nothing Then
            aArtL(i) = a.Left
            aArtT = a.Top
            aArtW = a.Width
            aArtH = a.Height
        Else
            aArtL(i) = -30
        End If
    Next i
    Set ch = Sh("timeChip")
    If ch Is Nothing Then
        aChipL = 116: aChipT = 128: aChipW = 72: aChipH = 17
    Else
        aChipL = ch.Left: aChipT = ch.Top: aChipW = ch.Width: aChipH = ch.Height
    End If
    aHrtH = 14
    Set h1 = Sh("heart1")
    If Not h1 Is Nothing Then aHrtH = h1.Height
    ' cfgScale cross-check (runner authored height in inches) - log only
    Set cs = Sh("cfgScale")
    If Not cs Is Nothing Then
        Dim scIn As Single
        scIn = Val(cs.TextFrame.TextRange.Text)
        If scIn > 0 And aRunH > 0 Then
            If Abs(scIn * 72 - aRunH) > 1 Then TraceIt "SCALE cfg=" & scIn
        End If
    End If
    ' derived
    mPitch = aRunH * PITCH_F
    mSlotS = aHrtH * 1.1                        ' HUD mini-cube size
    mSlotX = aChipL + aChipW + 9.36             ' right of the time chip
    mSlotY = aChipT + (aChipH - mSlotS) / 2
    If mSlotY < 0 Then mSlotY = aChipT
    mSlotD = mSlotS + 7.2                       ' slot pitch
    mCupShowL = aMachL + (aMachW - aCupW) / 2   ' dispense slot, bottom-centre
    mCupShowT = aMachT + aMachH - aCupH - 3
    mBanShowL = aMachL + aMachW - aBanW         ' banner right-aligned to machine
    captured = True
End Sub

' Read the cfgTime budget (seconds) ONCE per show, BEFORE any TraceIt
' write can clobber the shape text. Fallback 90 only if the cfg shape is
' missing/unparseable - the authored value itself is never hardcoded.
Private Sub LatchAlloc()
    On Error Resume Next
    If allocGot Then Exit Sub
    Dim pr As Presentation, tg As Shape
    Set pr = ActivePresentation
    If pr Is Nothing Then Set pr = homePres
    If pr Is Nothing Then Set pr = Presentations(1)
    If pr Is Nothing Then Exit Sub
    alloc = 0
    allocStr = ""
    Set tg = Nothing
    Set tg = pr.Slides(pr.Slides.Count).Shapes("cfgTime")
    If Not tg Is Nothing Then
        allocStr = tg.TextFrame.TextRange.Text
        alloc = Val(allocStr)
    End If
    If alloc <= 0 Then alloc = 90
    allocGot = True
End Sub

' =====================================================================
'  PLUMBING
' =====================================================================
Private Sub Bind(sl As Slide)
    On Error Resume Next
    Set sc = CreateObject("Scripting.Dictionary")
    If sl Is Nothing Then Exit Sub
    Dim n As Variant, shp As Shape
    For Each n In Array( _
        "runner", "machine", "machineCup", "banner", _
        "art1", "art2", "art3", "art4", _
        "heart1", "heart2", "heart3", _
        "timeChip", "timeText", "cfgTime", "cfgScale", _
        "brewR", "brewG", "brewA")
        Set shp = Nothing
        Set shp = sl.Shapes(CStr(n))
        If Not shp Is Nothing Then Set sc(CStr(n)) = shp
    Next n
End Sub

Private Function Sh(n As String) As Shape
    On Error Resume Next
    Set Sh = Nothing
    If sc Is Nothing Then Exit Function
    If sc.Exists(n) Then Set Sh = sc(n)
End Function

' current slide of the live show; -1 if no show
' (View.CurrentSlideIndex is unreadable under COM-automated shows on this
'  machine - View.Slide.SlideIndex is the reliable equivalent)
Private Function PollIdx() As Integer
    On Error GoTo bad
    PollIdx = homePres.Application.SlideShowWindows(1).View.Slide.SlideIndex
    Exit Function
bad:
    PollIdx = -1
End Function

Private Sub TraceIt(t As String)
    On Error Resume Next
    trail = Right(trail & " " & t, 180)
    If Not allocGot Then Exit Sub       ' never clobber cfgTime before the
                                        '  budget is latched out of it
    Dim pr As Presentation, tg As Shape
    Set pr = ActivePresentation
    If pr Is Nothing Then Set pr = homePres
    If pr Is Nothing Then Set pr = Presentations(1)
    If pr Is Nothing Then Exit Sub
    Set tg = Nothing
    Set tg = pr.Slides(pr.Slides.Count).Shapes("cfgTime")
    If Not tg Is Nothing Then tg.TextFrame.TextRange.Text = trail & "|" & Format(Timer, "0.0")
End Sub

' callable externally via COM to prove macros execute (outside slideshows)
Public Sub DBG_PING()
    LatchAlloc
    TraceIt "M"
End Sub

' MANUAL START - Alt+F8 path (no cover button: slide 1 must stay static).
' PowerPoint lazy-loads VBA projects: this arms the engine and, if a show
' is already running, starts it immediately.
Public Sub StartGame()
    On Error Resume Next
    Dim pr As Presentation
    Set pr = ActivePresentation
    If pr Is Nothing Then Set pr = Presentations(1)
    If pr Is Nothing Then Exit Sub
    Set homePres = pr
    mGameIdx = pr.Slides.Count
    stopAll = False
    Dim idx As Integer
    idx = PollIdx()
    If idx > 0 Then
        lastIdx = idx
        HandleEnter idx
        TraceIt "GO"
    Else
        LatchAlloc
        TraceIt "ARMED"   ' edit mode: project is loaded now; F5 will fire events
    End If
End Sub

' forces compilation of the whole engine call graph without running it
Public Sub DBG_COMPILE()
    If False Then
        OnSlideShowPageChange Nothing
        OnSlideShowTerminate Nothing
        OnGameTimer 0, 0, 0, 0
        GameTick
        HandleEnter 13
        InitGame
        InitState
        ResetAuthored
        StepPlay
        StepBrew
        UpdateArtifact
        SpawnArt
        CollectArt Nothing
        MissArt Nothing
        UpdateClock
        DrawHearts
        RunnerUp
        RunnerDown
        MoveRunnerLane 1
        LaneTop 1
        BrewLit 1
        BrewOff
        LatchAlloc
        CaptureAuthored
        Bind Nothing
        Sh "x"
        PollIdx
        TraceIt "x"
        DBG_PING
        StartGame
    End If
    TraceIt "C"
End Sub

' =====================================================================
'  COFFEE QUEST ENGINE - nano-super coffee quest edition (v3, scale-free)
'  Timer-driven (SetTimer callback, 25 ms): auto-macros return instantly,
'  the game ticks on PowerPoint's own message pump. No blocking loops.
'
'   * runner man jogs slowly at the bottom of every slide (constant speed)
'   * forward slide change  -> he jumps an obstacle
'   * backward slide change -> one of 3 hearts pops empty
'   * per-slide countdown (cfgTime shape, seconds); at 60 s left the bar
'     starts blinking (slow), at 12 s left it blinks fast and the man
'     auto-jumps as the "wrap it up" cue (v3: blink replaces recolor -
'     the deck is strictly ink/gray, no colors)
'   * LAST slide -> he sprints to the coffee machine, brews, gets his cup
'  v3 runs the same game at several sprite scales: ALL geometry and all
'  per-tick pt deltas are captured from the slide's own shapes at Bind
'  (see LoadGeom) or scaled by mF = man height / 45 (the v2 tune size).
'  Requires macros enabled. Hearts reset at the start of each show.
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

' ---- geometry & speeds ----
' v2 pinned every rect for ONE 45pt-tall man on a 960pt deck. v3 plays the
' same game at several sprite scales, so rects are READ from the slide's
' own shapes once per slide per show (LoadGeom) and every per-tick pt
' delta is either shape-derived or scaled by mF = mManH / 45.
Private Const PARK As Single = -216       ' off-slide parking x (-3.0 in, every scale)
Private Const BASE_MANH As Single = 45    ' man height the base speeds below were tuned at
' base speeds (pt per 25ms tick at man height BASE_MANH) - scaled by mF
Private Const SPD_GROUND As Single = 0.65  ' ground scroll
Private Const SPD_SKY As Single = 0.175    ' skyline parallax
Private Const SPD_OBST As Single = 10.5    ' obstacle fly-past
Private Const SPD_FINALE As Single = 5.75  ' sprint to the machine
Private Const SPD_RUNIN As Single = 3      ' slide-1 run-in approach
Private Const SPD_CLOUD1 As Single = 0.08  ' cloud parallax (near)
Private Const SPD_CLOUD2 As Single = 0.115 ' cloud parallax (far)

' per-slide captured geometry (pt); filled by LoadGeom/CaptureGeom
Private mManL As Single, mManT As Single, mManW As Single, mManH As Single
Private mGround As Single        ' feet line = man_runA top + height (NEVER a shape ref:
                                 ' the "groundline" rect only exists on some slides)
Private mJumpH As Single         ' jump apex height above rest = 0.622 * mManH (v2 ratio)
Private mSlideW As Single        ' deck width in pt (960 fallback)
Private mSlideCount As Integer   ' finale = LAST slide (Slides.Count, never hardwired)
Private mSkyL0 As Single         ' skyline authored left
Private mSkyPeriod As Single     ' skyline pattern width = skyline.Width / 2 (2 periods wide)
Private mHeartL0 As Single       ' heart slot-1 left (heartF1 authored rect)
Private mHeartT As Single        ' heart row top
Private mHeartD As Single        ' heart slot pitch = heartF2.Left - heartF1.Left
Private mHeartW As Single, mHeartH As Single   ' heart rest size (heartF1 authored rect)
Private mBarW As Single          ' timer bar full (authored) width
Private mMarkL1 As Single, mMarkL2 As Single   ' track marks authored lefts
Private mCloudL1 As Single, mCloudT1 As Single ' clouds authored rects
Private mCloudL2 As Single, mCloudT2 As Single
Private mPropL0(1 To 4) As Single, mPropT0(1 To 4) As Single  ' sign1 sign2 sign3 bush authored
Private mMachineL As Single, mMachineT As Single ' finale machine rest rect
Private mSprintX As Single       ' man's stop mark just left of the machine
Private mSteamL As Single, mSteamT As Single     ' steam show rect (top = authored parked top)
Private mCtParkL As Single       ' coffeetext authored park left
Private mCtL As Single, mCtT As Single           ' coffeetext show rect (top = authored parked top)
Private mRunInX As Single        ' slide-1 run-in start left (off-slide)
Private mObstSlowX As Single     ' obstacle spawn left, far (forward nav)
Private mObstFastX As Single     ' obstacle spawn left, near (auto-jump cue)
Private mJumpTrigX As Single     ' obstacle left that starts the man's jump arc
' scaled values (set by DeriveGeom after each capture/cache load)
Private mF As Single             ' mManH / BASE_MANH
Private mSpdGround As Single, mSpdSky As Single, mSpdObst As Single
Private mSpdFinale As Single, mSpdRunIn As Single
Private mSpdCloud1 As Single, mSpdCloud2 As Single
Private mGeom As Object          ' Dictionary: slide index -> captured geometry (once per show)

' ---- state ----
Private hearts As Integer
Private stopAll As Boolean
Private warned As Boolean
Private alloc As Single
Private elapsed As Single
Private lastSec As Integer
Private frameFlip As Integer
Private steamFlip As Integer
Private nextObstRock As Boolean
Private timerId As LongPtr
Private homePres As Presentation
Private lastIdx As Integer
Private loopCount As Long
Private lastErr As String
Private trail As String
' scroll positions
Private xSky As Single, xC1 As Single, xC2 As Single, xMk1 As Single, xMk2 As Single
Private pL(1 To 4) As Single    ' prop lefts: sign1 sign2 sign3 bush
Private pT(1 To 4) As Single    ' prop respawn timers (s)
Private pOn(1 To 4) As Boolean
Private sc As Object            ' name -> Shape cache
' animation phases: 0 idle, 1 run-in, 2 jump, 3 heartpop, 4 sprint,
'                   5 brew, 6 refill, 7 steam-idle
Private phase As Integer
Private phT As Single           ' phase time (ticks*0.025) / generic counter
Private jumpOb As Shape
Private jumpFast As Boolean
Private popIdx As Integer
Private popStep As Integer
Private frameB As Boolean

' =====================================================================
'  AUTO-MACROS (return immediately - the timer does the work)
' =====================================================================
Public Sub OnSlideShowPageChange(ByVal Wn As SlideShowWindow)
    On Error Resume Next
    Set homePres = Wn.Presentation
    Dim idx0 As Integer, d0 As Integer
    idx0 = PollIdx()
    If lastIdx = 0 Then
        hearts = 3        ' fresh show (lastIdx resets at terminate) - init lives
        trail = ""
    End If
    If lastIdx = 0 Then d0 = 0 Else d0 = Sgn(idx0 - lastIdx)
    TraceIt "PC i" & idx0 & " d" & d0 & " h" & hearts
    stopAll = False
    Dim idx As Integer, d As Integer
    idx = idx0
    d = d0
    lastIdx = idx
    HandleEnter idx, d
    If timerId = 0 And idx > 0 Then
        timerId = SetTimer(0, 0, 25, AddressOf OnGameTimer)
        TraceIt "TM"
    End If
End Sub

Public Sub OnSlideShowTerminate(ByVal Wn As SlideShowWindow)
    On Error Resume Next         ' cleanup is best-effort
    TraceIt "T loop=" & loopCount & " h=" & hearts & " p=" & phase & " e=[" & lastErr & "]"
    stopAll = True
    If timerId <> 0 Then
        KillTimer 0, timerId
        timerId = 0
    End If
    phase = 0
    hearts = 3
    lastIdx = 0
    If homePres Is Nothing Then Set homePres = Wn.Presentation
    mSlideCount = 0
    If Not homePres Is Nothing Then mSlideCount = homePres.Slides.Count
    Dim sl As Slide
    For Each sl In homePres.Slides
        Bind sl
        ResetWorld sl, sl.SlideIndex
        DrawHearts
        ResetTimer sl
        If mSlideCount > 0 And sl.SlideIndex <> mSlideCount Then   ' restore authored static props
            If Not Sh("sign2") Is Nothing Then
                Sh("sign2").Visible = True
                Sh("sign2").Left = mPropL0(2)
                Sh("sign2").Top = mPropT0(2)
            End If
            If Not Sh("bush") Is Nothing Then
                Sh("bush").Visible = True
                Sh("bush").Left = mPropL0(4)
                Sh("bush").Top = mPropT0(4)
            End If
        End If
    Next
    Set mGeom = Nothing       ' cache served the restore above; drop it so the
                              ' next show recaptures the now-authored shapes
    homePres.Saved = True
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
        Exit Sub
    End If
    If idx <> lastIdx Then  ' navigation detected between ticks
        Dim d As Integer
        d = Sgn(idx - lastIdx)
        TraceIt "TK i" & idx & " d" & d & " h" & hearts
        lastIdx = idx
        HandleEnter idx, d
        Exit Sub            ' give the entry state one frame to settle
    End If
    ' advance the world & timers
    ScrollWorld
    Select Case phase
        Case 0: NormalTick idx
        Case 1: StepRunIn
        Case 2: StepJump idx
        Case 3: StepHeartPop
        Case 4: StepSprint
        Case 5: StepBrew
        Case 6: StepRefill
        Case 7: StepSteamIdle
    End Select
End Sub

' ---------- phases ----------
Private Sub NormalTick(idx As Integer)
    On Error Resume Next
    UpdateProps
    frameFlip = frameFlip + 1
    If frameFlip >= 7 Then
        frameFlip = 0
        ToggleRun
    End If
    elapsed = elapsed + 0.025
    UpdateTimer idx
End Sub

Private Sub StepRunIn()
    On Error Resume Next
    Dim mA As Shape
    Set mA = Sh("man_runA")
    If mA Is Nothing Then phase = 0: Exit Sub
    If mA.Left < mManL Then
        frameFlip = frameFlip + 1
        If frameFlip >= 5 Then
            frameFlip = 0
            frameB = Not frameB
        End If
        ShowRunFrame frameB, Qz(mA.Left + mSpdRunIn)
        If Sh("man_runA").Left >= mManL Then
            ShowRunFrame False, mManL
            phase = 0
        End If
    Else
        phase = 0
    End If
End Sub

Private Sub StepJump(idx As Integer)
    On Error Resume Next
    If jumpOb Is Nothing Then
        phase = 0
        Exit Sub
    End If
    Dim obL As Single
    obL = jumpOb.Left - mSpdObst
    jumpOb.Left = Qz(obL)
    If phT < 0 And obL < mJumpTrigX Then phT = 0
    If phT >= 0 Then
        phT = phT + 0.025
        Dim tt As Single
        tt = phT / 0.8
        If tt > 1 Then tt = 1
        ShowJumpPose Qz(mManT - mJumpH * 4 * tt * (1 - tt))
    End If
    If obL < -jumpOb.Width - 12 * mF Then   ' fully off by a 12pt-at-tune margin
        LandFromJump
        phase = 0
    End If
End Sub

Private Sub LandFromJump()
    On Error Resume Next
    ShowRunFrame False, mManL
    If Not Sh("man_jump") Is Nothing Then Sh("man_jump").Visible = False
    If Not jumpOb Is Nothing Then
        jumpOb.Visible = False
        jumpOb.Left = PARK
    End If
    Set jumpOb = Nothing
End Sub

Private Sub StepHeartPop()
    On Error Resume Next
    popStep = popStep + 1
    Dim f As Shape, e As Shape
    Set f = Sh("heartF" & popIdx)
    Set e = Sh("heartE" & popIdx)
    If f Is Nothing Then phase = 0: Exit Sub
    Dim slotL As Single
    slotL = mHeartL0 + (popIdx - 1) * mHeartD
    Select Case popStep
        Case 1 To 3
            f.Width = mHeartW * (1 + 0.14 * popStep)
            f.Height = mHeartH * (1 + 0.14 * popStep)
            f.Left = slotL - (f.Width - mHeartW) / 2
            f.Top = mHeartT - (f.Height - mHeartH) / 2
        Case 4
            f.Visible = False
            f.Width = mHeartW
            f.Height = mHeartH
            f.Left = PARK
            If Not e Is Nothing Then
                e.Visible = True
                e.Left = slotL
                e.Top = mHeartT
            End If
        Case Else
            phase = 0
    End Select
End Sub

Private Sub StepSprint()
    On Error Resume Next
    Dim mL As Single
    mL = Sh("man_runA").Left
    If mL < mSprintX Then
        frameFlip = frameFlip + 1
        If frameFlip >= 4 Then
            frameFlip = 0
            frameB = Not frameB
        End If
        If mL + mSpdFinale >= mSprintX Then mL = mSprintX
        ShowRunFrame frameB, Qz(mL + mSpdFinale)
    Else
        phase = 5
        phT = 0
        If Not Sh("steam") Is Nothing Then
            Sh("steam").Visible = True
            Sh("steam").Left = mSteamL
            Sh("steam").Top = mSteamT
        End If
    End If
End Sub

Private Sub StepBrew()
    On Error Resume Next
    phT = phT + 1
    If phT Mod 9 = 0 Then
        Dim k As Integer
        k = Int(phT / 9)
        ' machine_on sits exactly on the machine's rect (v2 left it parked
        ' at PARK while toggling Visible - the lit frame never showed)
        If Not Sh("machine_on") Is Nothing Then
            Sh("machine_on").Visible = (k Mod 2 = 1)
            Sh("machine_on").Left = mMachineL
            Sh("machine_on").Top = mMachineT
        End If
        If Not Sh("machine") Is Nothing Then Sh("machine").Visible = (k Mod 2 = 0)
        SwapSteam
        If k >= 6 Then
            ' done: full cup in hand
            If Not Sh("machine") Is Nothing Then
                Sh("machine").Visible = False
                Sh("machine").Left = PARK
            End If
            If Not Sh("machine_on") Is Nothing Then
                Sh("machine_on").Visible = False
                Sh("machine_on").Left = PARK
            End If
            If Not Sh("machine_done") Is Nothing Then
                Sh("machine_done").Visible = True
                Sh("machine_done").Left = mMachineL
                Sh("machine_done").Top = mMachineT
            End If
            If Not Sh("man_runA") Is Nothing Then
                Sh("man_runA").Visible = False
                Sh("man_runA").Left = PARK
            End If
            If Not Sh("man_runB") Is Nothing Then
                Sh("man_runB").Visible = False
                Sh("man_runB").Left = PARK
            End If
            If Not Sh("man_idle") Is Nothing Then
                Sh("man_idle").Visible = True
                Sh("man_idle").Left = mSprintX
                Sh("man_idle").Top = mManT
            End If
            phase = 6
            phT = 0
        End If
    End If
End Sub

Private Sub StepRefill()
    On Error Resume Next
    phT = phT + 1
    If phT = 1 Or (phT Mod 10 = 0 And hearts < 3) Then
        If hearts < 3 Then
            hearts = hearts + 1
            Dim f As Shape
            Set f = Sh("heartF" & hearts)
            If Not f Is Nothing Then
                f.Visible = True
                f.Left = mHeartL0 + (hearts - 1) * mHeartD
                f.Top = mHeartT
                f.Width = mHeartW * 9 / 7    ' v2 pulse: 9x8 cells vs 7x6 rest
                f.Height = mHeartH * 4 / 3
            End If
            If Not Sh("heartE" & hearts) Is Nothing Then Sh("heartE" & hearts).Visible = False
        End If
    End If
    If phT Mod 10 = 5 And hearts > 0 Then
        ' settle the pulse
        Dim f2 As Shape
        Set f2 = Sh("heartF" & hearts)
        If Not f2 Is Nothing Then
            f2.Left = mHeartL0 + (hearts - 1) * mHeartD
            f2.Width = mHeartW
            f2.Height = mHeartH
        End If
    End If
    If phT >= 35 Then
        ' coffee acquired!
        Dim ct As Shape
        Set ct = Sh("coffeetext")
        If Not ct Is Nothing Then
            ct.Visible = True
            ct.Left = mCtL
            ct.Top = mCtT
        End If
        phase = 7
        phT = 0
    End If
End Sub

Private Sub StepSteamIdle()
    On Error Resume Next
    steamFlip = steamFlip + 1
    If steamFlip >= 16 Then
        steamFlip = 0
        SwapSteam
    End If
End Sub

' =====================================================================
'  ENTRY
' =====================================================================
Private Sub HandleEnter(idx As Integer, d As Integer)
    On Error Resume Next
    Dim sl As Slide
    Set sl = homePres.Slides(idx)
    Bind sl
    warned = False
    elapsed = 0
    lastSec = -1
    frameFlip = 0
    steamFlip = 0
    phase = 0
    Set jumpOb = Nothing
    ResetWorld sl, idx
    DrawHearts
    ResetTimer sl
    If mSlideCount > 0 And idx = mSlideCount Then
        phase = 4          ' sprint to the machine
        phT = 0
        Exit Sub
    End If
    If d > 0 Then StartJump True
    If d < 0 Then StartHeartPop
    If idx = 1 And d = 0 Then
        phase = 1          ' run in from the left
        ShowRunFrame False, mRunInX
    End If
End Sub

Private Sub StartJump(fast As Boolean)
    On Error Resume Next
    Dim ob As Shape
    If nextObstRock And Not Sh("rock") Is Nothing Then
        Set ob = Sh("rock")
    Else
        Set ob = Sh("cactus")
    End If
    nextObstRock = Not nextObstRock
    If ob Is Nothing Then Exit Sub
    Set jumpOb = ob
    jumpFast = fast
    ShowRunFrame False, mManL
    ob.Visible = True
    ob.Top = mGround - ob.Height
    If fast Then ob.Left = mObstFastX Else ob.Left = mObstSlowX
    phT = -1
    phase = 2
End Sub

Private Sub StartHeartPop()
    On Error Resume Next
    TraceIt "POP(h" & hearts & ")"
    If hearts > 0 Then
        hearts = hearts - 1
        popIdx = hearts + 1
        popStep = 0
        phase = 3
    Else
        ' zero hearts: quick shake via pop animation on the empties
        popIdx = 0
        popStep = 0
        phase = 3
    End If
End Sub

' =====================================================================
'  WORLD
' =====================================================================
Private Sub ScrollWorld()
    On Error Resume Next
    xSky = xSky - mSpdSky
    If xSky < -mSkyPeriod Then xSky = xSky + mSkyPeriod
    xC1 = xC1 - mSpdCloud1
    If xC1 < -40 * mF Then
        xC1 = mSlideW + 40 * mF + Rnd() * 300 * mF
        If Not Sh("cloud1") Is Nothing Then Sh("cloud1").Top = mCloudT1 + Int(Rnd() * 3) * 0.75 * mF
    End If
    xC2 = xC2 - mSpdCloud2
    If xC2 < -36 * mF Then xC2 = mSlideW + 40 * mF + Rnd() * 400 * mF
    xMk1 = xMk1 - mSpdGround
    If xMk1 < -20 * mF Then xMk1 = xMk1 + mSlideW + 20 * mF
    xMk2 = xMk2 - mSpdGround
    If xMk2 < -20 * mF Then xMk2 = xMk2 + mSlideW + 20 * mF
    If Not Sh("skyline") Is Nothing Then Sh("skyline").Left = Qz(xSky)
    If Not Sh("cloud1") Is Nothing Then Sh("cloud1").Left = Qz(xC1)
    If Not Sh("cloud2") Is Nothing Then Sh("cloud2").Left = Qz(xC2)
    If Not Sh("mark1") Is Nothing Then Sh("mark1").Left = Qz(xMk1)
    If Not Sh("mark2") Is Nothing Then Sh("mark2").Left = Qz(xMk2)
End Sub

Private Sub UpdateProps()
    On Error Resume Next
    Dim i As Integer
    For i = 1 To 4
        If pOn(i) Then
            pL(i) = pL(i) - mSpdGround
            If pL(i) < -(PropShape(i).Width + 12 * mF) Then   ' fully off + margin
                pOn(i) = False
                pT(i) = 15 + Rnd() * 20
                PropShape(i).Visible = False
            Else
                PropShape(i).Left = Qz(pL(i))
            End If
        Else
            pT(i) = pT(i) - 0.025
            If pT(i) <= 0 Then
                pOn(i) = True
                pL(i) = mSlideW + 40 * mF + Rnd() * 120 * mF
                With PropShape(i)
                    .Visible = True
                    .Left = Qz(pL(i))
                    .Top = mGround - .Height
                End With
            End If
        End If
    Next i
End Sub

Private Function PropShape(i As Integer) As Shape
    On Error Resume Next
    Select Case i
        Case 1: Set PropShape = Sh("sign1")
        Case 2: Set PropShape = Sh("sign2")
        Case 3: Set PropShape = Sh("sign3")
        Case 4: Set PropShape = Sh("bush")
    End Select
End Function

Private Sub UpdateTimer(idx As Integer)
    On Error Resume Next
    If alloc <= 0 Then Exit Sub
    Dim bar As Shape, tx As Shape
    Set bar = Sh("timerbar")
    Set tx = Sh("timetext")
    If bar Is Nothing Then Exit Sub
    Dim secsLeft As Single
    secsLeft = alloc - elapsed
    If secsLeft < 0 Then secsLeft = 0
    bar.Width = mBarW * secsLeft / alloc
    If Int(secsLeft) <> lastSec Then
        lastSec = Int(secsLeft)
        If Not tx Is Nothing Then
            tx.TextFrame.TextRange.Text = (lastSec \ 60) & ":" & Format(lastSec Mod 60, "00")
        End If
    End If
    If secsLeft > 60 Then
        bar.Visible = True          ' full bar is always shown
    ElseIf secsLeft > 12 Then
        ' last minute: slow blink (no recolor - the deck is ink/gray only)
        If loopCount Mod 20 = 0 Then bar.Visible = Not bar.Visible
    Else
        ' final seconds: fast blink + one-shot auto-jump "wrap it up" cue
        If loopCount Mod 6 = 0 Then bar.Visible = Not bar.Visible
        If Not warned Then
            warned = True
            StartJump False         ' time nearly out: jump!
        End If
    End If
End Sub

' =====================================================================
'  MAN POSES
' =====================================================================
Private Sub ShowRunFrame(useB As Boolean, mL As Single)
    On Error Resume Next
    Dim mA As Shape, mB As Shape
    Set mA = Sh("man_runA")
    Set mB = Sh("man_runB")
    If mA Is Nothing Or mB Is Nothing Then Exit Sub
    mA.Visible = Not useB
    mB.Visible = useB
    mA.Left = mL
    mA.Top = mManT
    mB.Left = mL
    mB.Top = mManT
End Sub

Private Sub ShowJumpPose(mT As Single)
    On Error Resume Next
    Dim mA As Shape, mB As Shape, mJ As Shape
    Set mA = Sh("man_runA")
    Set mB = Sh("man_runB")
    Set mJ = Sh("man_jump")
    If mJ Is Nothing Then Exit Sub
    mA.Visible = False
    If Not mB Is Nothing Then mB.Visible = False
    mJ.Visible = True
    mJ.Left = mManL
    mJ.Top = mT
End Sub

Private Sub ToggleRun()
    On Error Resume Next
    Dim a As Shape, b As Shape
    Set a = Sh("man_runA")
    Set b = Sh("man_runB")
    If a Is Nothing Or b Is Nothing Then Exit Sub
    If a.Visible Then
        a.Visible = False
        b.Visible = True
        b.Left = a.Left
        b.Top = mManT
    ElseIf b.Visible Then
        b.Visible = False
        a.Visible = True
        a.Left = b.Left
        a.Top = mManT
    End If
End Sub

Private Sub SwapSteam()
    On Error Resume Next
    Dim s1 As Shape, s2 As Shape
    Set s1 = Sh("steam")
    Set s2 = Sh("steam2")
    If s1 Is Nothing Or s2 Is Nothing Then Exit Sub
    If s1.Visible Then
        s1.Visible = False
        s2.Visible = True
    Else
        s2.Visible = False
        s1.Visible = True
    End If
End Sub

' =====================================================================
'  RESET / STATE HELPERS
' =====================================================================
Private Sub ResetWorld(sl As Slide, idx As Integer)
    On Error Resume Next
    If Not Sh("skyline") Is Nothing Then
        xSky = mSkyL0
        Sh("skyline").Left = mSkyL0
    End If
    If Not Sh("cloud1") Is Nothing Then
        xC1 = mCloudL1
        Sh("cloud1").Left = mCloudL1
        Sh("cloud1").Top = mCloudT1
        Sh("cloud1").Visible = True
    End If
    If Not Sh("cloud2") Is Nothing Then
        xC2 = mCloudL2
        Sh("cloud2").Left = mCloudL2
        Sh("cloud2").Top = mCloudT2
        Sh("cloud2").Visible = True
    End If
    xMk1 = mMarkL1
    xMk2 = mMarkL2
    If Not Sh("mark1") Is Nothing Then Sh("mark1").Left = mMarkL1
    If Not Sh("mark2") Is Nothing Then Sh("mark2").Left = mMarkL2
    If Not Sh("cactus") Is Nothing Then
        Sh("cactus").Visible = False
        Sh("cactus").Left = PARK
    End If
    If Not Sh("rock") Is Nothing Then
        Sh("rock").Visible = False
        Sh("rock").Left = PARK
    End If
    If Not Sh("man_runA") Is Nothing Then
        Sh("man_runA").Visible = True
        Sh("man_runA").Left = mManL
        Sh("man_runA").Top = mManT
    End If
    Dim f As Variant
    For Each f In Array("man_runB", "man_jump", "man_idle")
        If Not Sh(CStr(f)) Is Nothing Then
            Sh(CStr(f)).Visible = False
            Sh(CStr(f)).Left = PARK
            Sh(CStr(f)).Top = mManT
        End If
    Next f
    If mSlideCount > 0 And idx = mSlideCount Then
        pOn(1) = False: pOn(2) = False: pOn(3) = False: pOn(4) = False
        pT(1) = 999: pT(2) = 999: pT(3) = 999: pT(4) = 999
        Dim q As Variant
        For Each q In Array("sign1", "sign2", "sign3", "bush")
            If Not Sh(CStr(q)) Is Nothing Then
                Sh(CStr(q)).Visible = False
                Sh(CStr(q)).Left = PARK
            End If
        Next q
        If Not Sh("machine") Is Nothing Then
            Sh("machine").Visible = True
            Sh("machine").Left = mMachineL
            Sh("machine").Top = mMachineT
        End If
        If Not Sh("machine_on") Is Nothing Then
            Sh("machine_on").Visible = False
            Sh("machine_on").Left = PARK
        End If
        If Not Sh("machine_done") Is Nothing Then
            Sh("machine_done").Visible = False
            Sh("machine_done").Left = PARK
        End If
        If Not Sh("steam") Is Nothing Then
            Sh("steam").Visible = False
            Sh("steam").Left = PARK
            ' Top stays at the authored (= show) height; only Left is parked
        End If
        If Not Sh("steam2") Is Nothing Then
            Sh("steam2").Visible = False
            Sh("steam2").Left = PARK
        End If
        If Not Sh("coffeetext") Is Nothing Then
            Sh("coffeetext").Visible = False
            Sh("coffeetext").Left = mCtParkL    ' wide banner: park fully off-slide
        End If
    Else
        pOn(1) = True: pL(1) = mPropL0(1)
        pOn(2) = False: pT(2) = 18 + Rnd() * 10
        pOn(3) = False: pT(3) = 45 + Rnd() * 12
        pOn(4) = False: pT(4) = 70 + Rnd() * 15
        If Not Sh("sign1") Is Nothing Then
            Sh("sign1").Visible = True
            Sh("sign1").Left = mPropL0(1)
            Sh("sign1").Top = mPropT0(1)
        End If
        If Not Sh("sign2") Is Nothing Then
            Sh("sign2").Visible = False
            Sh("sign2").Left = mPropL0(2)
            Sh("sign2").Top = mPropT0(2)
        End If
        If Not Sh("sign3") Is Nothing Then
            Sh("sign3").Visible = False
            Sh("sign3").Left = PARK
            Sh("sign3").Top = mPropT0(3)
        End If
        If Not Sh("bush") Is Nothing Then
            Sh("bush").Visible = False
            Sh("bush").Left = PARK
            Sh("bush").Top = mPropT0(4)
        End If
    End If
End Sub

Private Sub DrawHearts()
    On Error Resume Next
    Dim i As Integer
    For i = 1 To 3
        If Not Sh("heartF" & i) Is Nothing Then
            If i <= hearts Then
                Sh("heartF" & i).Visible = True
                Sh("heartF" & i).Left = mHeartL0 + (i - 1) * mHeartD
                Sh("heartF" & i).Top = mHeartT
                Sh("heartF" & i).Width = mHeartW
                Sh("heartF" & i).Height = mHeartH
            Else
                Sh("heartF" & i).Visible = False
                Sh("heartF" & i).Left = PARK
            End If
        End If
        If Not Sh("heartE" & i) Is Nothing Then
            If i <= hearts Then
                Sh("heartE" & i).Visible = False
                Sh("heartE" & i).Left = PARK
            Else
                Sh("heartE" & i).Visible = True
                Sh("heartE" & i).Left = mHeartL0 + (i - 1) * mHeartD
                Sh("heartE" & i).Top = mHeartT
            End If
        End If
    Next i
End Sub

Private Sub ResetTimer(sl As Slide)
    On Error Resume Next
    alloc = 0
    If Not Sh("cfgTime") Is Nothing Then
        alloc = Val(Sh("cfgTime").TextFrame.TextRange.Text)
    End If
    If alloc > 0 Then
        If Not Sh("timerbar") Is Nothing Then
            Sh("timerbar").Width = mBarW
            Sh("timerbar").Visible = True    ' un-blink on reset/slide change
        End If
        If Not Sh("timetext") Is Nothing Then
            Sh("timetext").TextFrame.TextRange.Text = (alloc \ 60) & ":" & Format(alloc Mod 60, "00")
        End If
    End If
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
        "man_runA", "man_runB", "man_jump", "man_idle", _
        "cactus", "rock", "skyline", "cloud1", "cloud2", "mark1", "mark2", _
        "sign1", "sign2", "sign3", "bush", _
        "heartF1", "heartF2", "heartF3", "heartE1", "heartE2", "heartE3", _
        "timerbar", "timetext", _
        "machine", "machine_on", "machine_done", "steam", "steam2", "coffeetext", _
        "cfgTime", "cfgScale")
        Set shp = Nothing
        Set shp = sl.Shapes(CStr(n))
        If Not shp Is Nothing Then Set sc(CStr(n)) = shp
    Next n
    LoadGeom sl
End Sub

' ---------- geometry capture (v3: no hardcoded slide geometry) ----------
' On the FIRST bind of each slide (per show) the shapes are still in their
' authored positions, so every rect is read from them and cached by slide
' index; re-entries load the cache so shapes left mid-animation by an
' earlier visit (a popped heart, a half-run-down timer bar, the sprinting
' man) can never poison the capture. The cache is dropped at show end.
Private Sub LoadGeom(sl As Slide)
    On Error Resume Next
    If sl Is Nothing Then Exit Sub
    If homePres Is Nothing Then Set homePres = sl.Parent
    mSlideW = 960                       ' deck is 13.333 in wide (fallback)
    If Not homePres Is Nothing Then
        If homePres.PageSetup.SlideWidth > 0 Then mSlideW = homePres.PageSetup.SlideWidth
        mSlideCount = homePres.Slides.Count
    End If
    Dim key As String
    key = "s" & sl.SlideIndex
    If mGeom Is Nothing Then Set mGeom = CreateObject("Scripting.Dictionary")
    If mGeom.Exists(key) Then
        ApplyGeom mGeom(key)
    Else
        CaptureGeom
        mGeom(key) = PackGeom()
    End If
End Sub

' read authored rects off the freshly-bound slide (all lookups tolerant:
' missing shapes fall back to shape-derived estimates, never to v2 pt values)
Private Sub CaptureGeom()
    On Error Resume Next
    Dim mA As Shape, h1 As Shape, h2 As Shape, tbar As Shape
    Dim cl As Shape, pp As Shape, mm As Shape, st As Shape, ct As Shape
    ' man: the rest pose is authored on-slide (man_runA is the one frame
    ' the builder leaves on-screen); his feet define the ground line -
    ' the "groundline" rect is NEVER referenced (it only exists on some slides)
    Set mA = Sh("man_runA")
    If mA Is Nothing Then
        mManL = 0: mManT = 0: mManW = 0: mManH = 0
    Else
        mManL = mA.Left: mManT = mA.Top: mManW = mA.Width: mManH = mA.Height
    End If
    DeriveGeom      ' sets mF/mGround first: fallbacks below are phrased with them
    ' cross-check the hidden cfgScale hint (cell pt) against the man's own
    ' cells (manH / 20): log mismatches, never fail
    Dim cs As Shape, cellPt As Single
    Set cs = Sh("cfgScale")
    If Not cs Is Nothing Then
        cellPt = Val(cs.TextFrame.TextRange.Text)
        If cellPt > 0 And mManH > 0 Then
            If Abs(cellPt - mManH / 20) > 0.01 Then
                TraceIt "SCALE cfg=" & cellPt & " manH/20=" & (mManH / 20)
            End If
        End If
    End If
    mSkyL0 = 0
    If Not Sh("skyline") Is Nothing Then mSkyL0 = Sh("skyline").Left
    ' hearts: slot-1 rect + slot pitch
    Set h1 = Sh("heartF1")
    Set h2 = Sh("heartF2")
    mHeartL0 = 0: mHeartT = 0: mHeartW = 0: mHeartH = 0: mHeartD = 0
    If Not h1 Is Nothing Then
        mHeartL0 = h1.Left: mHeartT = h1.Top
        mHeartW = h1.Width: mHeartH = h1.Height
    End If
    If Not h1 Is Nothing And Not h2 Is Nothing Then
        mHeartD = h2.Left - h1.Left
    ElseIf mHeartW > 0 Then
        mHeartD = mHeartW * 9 / 7        ' v2 slot pitch / heart width cell ratio
    End If
    ' timer bar authored (full) width - the engine only ever shrinks it
    mBarW = 0
    Set tbar = Sh("timerbar")
    If Not tbar Is Nothing Then mBarW = tbar.Width
    ' track marks + clouds authored rects
    mMarkL1 = 0: mMarkL2 = 0
    If Not Sh("mark1") Is Nothing Then mMarkL1 = Sh("mark1").Left
    If Not Sh("mark2") Is Nothing Then mMarkL2 = Sh("mark2").Left
    mCloudL1 = 0: mCloudT1 = 0: mCloudL2 = 0: mCloudT2 = 0
    Set cl = Sh("cloud1")
    If Not cl Is Nothing Then mCloudL1 = cl.Left: mCloudT1 = cl.Top
    Set cl = Sh("cloud2")
    If Not cl Is Nothing Then mCloudL2 = cl.Left: mCloudT2 = cl.Top
    ' props authored rects (sign1 sign2 sign3 bush)
    Dim i As Integer
    For i = 1 To 4
        Set pp = PropShape(i)
        If pp Is Nothing Then
            mPropL0(i) = PARK: mPropT0(i) = 0
        Else
            mPropL0(i) = pp.Left: mPropT0(i) = pp.Top
        End If
    Next i
    ' finale furniture (present on the last slide; absent elsewhere - the
    ' fallbacks keep the unused values sane on the other slides)
    Set mm = Sh("machine")
    If mm Is Nothing Then
        mMachineL = mSlideW - 170         ' v2 authored machine x (absolute inches)
        mMachineT = mGround - 1.1 * mManH ' machine is 22 cells = 1.1 man heights
    Else
        mMachineL = mm.Left: mMachineT = mm.Top
    End If
    Set st = Sh("steam")
    If st Is Nothing Then
        mSteamT = mMachineT - 0.25 * mManH    ' steam rides 5 cells above the machine
    Else
        mSteamT = st.Top      ' authored parked top doubles as the show top
    End If
    Set ct = Sh("coffeetext")
    If ct Is Nothing Then
        mCtParkL = 2 * PARK               ' wide banner parks fully off-slide
        mCtT = mGround - 2.3 * mManH      ' 1.6 manH + 14 cells above the ground
    Else
        mCtParkL = ct.Left: mCtT = ct.Top ' authored parked top doubles as the show top
    End If
    DeriveGeom      ' re-derive with the full capture in place
End Sub

' everything that follows from the captured rects (called after every
' capture AND after every cache load, so derived state can never go stale)
Private Sub DeriveGeom()
    On Error Resume Next
    mGround = mManT + mManH              ' feet line from the man himself
    mJumpH = 0.622 * mManH               ' v2 apex ratio
    If mManH > 0 Then mF = mManH / BASE_MANH Else mF = 1
    mSpdGround = SPD_GROUND * mF
    mSpdSky = SPD_SKY * mF
    mSpdObst = SPD_OBST * mF
    mSpdFinale = SPD_FINALE * mF
    mSpdRunIn = SPD_RUNIN * mF
    mSpdCloud1 = SPD_CLOUD1 * mF
    mSpdCloud2 = SPD_CLOUD2 * mF
    ' skyline strip is exactly 2 seamless periods wide; only its Left ever
    ' changes, so Width is safe to re-read on every bind
    mSkyPeriod = mSlideW
    If Not Sh("skyline") Is Nothing Then
        If Sh("skyline").Width > 0 Then mSkyPeriod = Sh("skyline").Width / 2
    End If
    mSprintX = mMachineL - 35 * mF       ' man stops just clear of the machine (v2 gap)
    mRunInX = -50 * mF                   ' slide-1 run-in starts off-slide left
    mObstSlowX = mSlideW + 50 * mF       ' forward-nav jump: spawn past the right edge
    mObstFastX = mObstSlowX - 10 * mManH ' wrap-up cue: 10 man-heights nearer
    mJumpTrigX = 300 * mF                ' obstacle reaches the man as the arc peaks
    mCtL = mSlideW - 16 * mF             ' banner right-anchored ~16pt-at-tune from edge
    If Not Sh("coffeetext") Is Nothing Then
        If Sh("coffeetext").Width > 0 Then mCtL = mSlideW - Sh("coffeetext").Width - 16 * mF
    End If
    mSteamL = mMachineL + 5 * mF         ' spout ~half a steam-width in from machine left
    If Not Sh("steam") Is Nothing Then
        If Sh("steam").Width > 0 Then mSteamL = mMachineL + Sh("steam").Width * 5 / 11.25
    End If
End Sub

Private Sub ApplyGeom(g As Variant)
    On Error Resume Next
    If Not IsArray(g) Then CaptureGeom: Exit Sub
    mManL = g(0): mManT = g(1): mManW = g(2): mManH = g(3)
    mSkyL0 = g(4)
    mHeartL0 = g(5): mHeartT = g(6): mHeartD = g(7): mHeartW = g(8): mHeartH = g(9)
    mBarW = g(10)
    mMarkL1 = g(11): mMarkL2 = g(12)
    mCloudL1 = g(13): mCloudT1 = g(14): mCloudL2 = g(15): mCloudT2 = g(16)
    mPropL0(1) = g(17): mPropL0(2) = g(18): mPropL0(3) = g(19): mPropL0(4) = g(20)
    mPropT0(1) = g(21): mPropT0(2) = g(22): mPropT0(3) = g(23): mPropT0(4) = g(24)
    mMachineL = g(25): mMachineT = g(26)
    mCtParkL = g(27): mCtT = g(28)
    mSteamT = g(29)
    DeriveGeom
End Sub

' snapshot of the captured rects - order MUST mirror ApplyGeom
Private Function PackGeom() As Variant
    PackGeom = Array( _
        mManL, mManT, mManW, mManH, _
        mSkyL0, _
        mHeartL0, mHeartT, mHeartD, mHeartW, mHeartH, _
        mBarW, _
        mMarkL1, mMarkL2, _
        mCloudL1, mCloudT1, mCloudL2, mCloudT2, _
        mPropL0(1), mPropL0(2), mPropL0(3), mPropL0(4), _
        mPropT0(1), mPropT0(2), mPropT0(3), mPropT0(4), _
        mMachineL, mMachineT, _
        mCtParkL, mCtT, _
        mSteamT)
End Function

Private Function Sh(n As String) As Shape
    On Error Resume Next
    Set Sh = Nothing
    If sc Is Nothing Then Exit Function
    If sc.Exists(n) Then Set Sh = sc(n)
End Function

Private Function Qz(v As Single) As Single
    On Error Resume Next
    Qz = Int(v / 0.75 + 0.5) * 0.75
End Function

' current slide of the live show; -1 if no show
' (View.CurrentSlideIndex is unreadable under COM-automated shows on some
'  machines - View.Slide.SlideIndex is the reliable equivalent)
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
    Dim pr As Presentation
    Set pr = ActivePresentation
    If pr Is Nothing Then
        If Not homePres Is Nothing Then Set pr = homePres
    End If
    If pr Is Nothing Then Set pr = Presentations(1)
    If Not pr Is Nothing Then pr.Slides(1).Shapes("cfgTime").TextFrame.TextRange.Text = trail & "|" & Format(Timer, "0.0")
End Sub

' callable externally via COM to prove macros execute (outside slideshows)
Public Sub DBG_PING()
    TraceIt "M"
End Sub

' MANUAL START - run via the cover button (run-macro action) or Alt+F8.
' PowerPoint lazy-loads VBA projects: until any macro runs once, the
' auto-macros never fire. This arms the engine and, if a show is already
' running, starts it immediately.
Public Sub StartGame()
    On Error Resume Next
    Dim pr As Presentation
    Set pr = ActivePresentation
    If pr Is Nothing Then Set pr = Presentations(1)
    If pr Is Nothing Then Exit Sub
    Set homePres = pr
    stopAll = False
    Dim idx As Integer
    idx = PollIdx()
    If idx > 0 Then
        If lastIdx = 0 Then
            hearts = 3    ' fresh show reached via the button/Alt+F8 path
            trail = ""
        End If
        Dim d As Integer
        If lastIdx = 0 Then d = 0 Else d = Sgn(idx - lastIdx)
        lastIdx = idx
        HandleEnter idx, d
        If timerId = 0 Then timerId = SetTimer(0, 0, 25, AddressOf OnGameTimer)
        TraceIt "GO"
    Else
        TraceIt "ARMED"   ' edit mode: project is loaded now; F5 will fire events
    End If
End Sub

' forces compilation of the whole engine call graph without running it
Public Sub DBG_COMPILE()
    If False Then
        OnGameTimer 0, 0, 0, 0
        GameTick
        HandleEnter 1, 0
        StartJump True
        StartHeartPop
        ScrollWorld
        UpdateProps
        PropShape 1
        UpdateTimer 1
        ShowRunFrame True, 0
        ShowJumpPose 0
        ToggleRun
        SwapSteam
        StepRunIn
        StepJump 1
        StepHeartPop
        StepSprint
        StepBrew
        StepRefill
        StepSteamIdle
        LandFromJump
        NormalTick 1
        ResetWorld Nothing, 1
        DrawHearts
        ResetTimer Nothing
        Bind Nothing
        LoadGeom Nothing
        CaptureGeom
        DeriveGeom
        ApplyGeom 0
        PackGeom
        Sh "x"
        Qz 0
        PollIdx
        TraceIt "x"
    End If
    TraceIt "C"
End Sub

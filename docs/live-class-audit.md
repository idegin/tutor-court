# Live Class, Whiteboard & VideoSDK Audit

_Audit date: 2026-06-15 · Fixes applied: 2026-06-16_

## Resolution log (2026-06-16)

**Fixed**
- 🔴 Whiteboard alignment — strokes now stored/replayed in normalized 0–1 coords; legacy
  absolute-pixel boards auto-detected and rendered as-is (§5).
- 🔴 Shared whiteboards created mid-class now reach already-joined students (new
  `GET /api/whiteboards?classId=` + `resolveAndSelectWhiteboard` refetch) (§1, §4).
- 🔴 `/api/live-sessions/[id]/status` now requires auth and authorizes tutor/enrolled
  users; only the tutor's poll drives billing/auto-close/reconciliation (§3).
- 🔴 Per-role VideoSDK tokens — students get `allow_join` only (can't kick / can't
  hijack the stage with a screen share); tutor keeps mod + screenshare (§2).
- 🟠 `start` no longer creates a session on VideoSDK room-creation failure (surfaces a
  502 "not charged" instead of billing a dead class); guards duplicate live sessions (§3, §4).
- 🟠 `join` rejects ended sessions (§3).
- 🟠 Participant dedup is id-only (same-name students no longer vanish); video grid is
  responsive to participant count; non-tutor presenter can't override a shared whiteboard (§2).
- 🟠 Whiteboard eraser now truly removes strokes; poll diff is content-based; draw state
  updates immutably; save-on-pointer-up uses a ref so the latest strokes persist (§5).

**Deferred (need infra / product decisions — not done in this pass)**
- Server-side billing/auto-close worker so a session is billed/closed even if the tutor
  closes the tab. Auth on `/status` + the room-creation gate reduce the blast radius, but
  the lifecycle is still client-poll-driven (§3).
- Billing on *actual connected media minutes* (track `onMeetingJoined` server-side) rather
  than time-on-page (§3, §4).
- Real-time whiteboard streaming (still 3s polling) and tutor→student slide-index sync (§5).
- Classroom features not present: mute-all, raise-hand, recording, device picker,
  active-speaker view, offline-roster tile (§2).

---

_Audit date: 2026-06-15_

Scope: the waiting room → live class handoff, the live classroom UI, the live-session
backend APIs, VideoSDK billing/credit behaviour, and the whiteboard. Findings are grouped
by the five questions asked, with severity tags:

- 🔴 **Critical** – breaks the feature for users / data or money integrity / security.
- 🟠 **Major** – frequently noticeable, degrades the experience badly.
- 🟡 **Minor** – polish, edge cases, or latent risk.

Key files:
- Frontend: [classroom-client.tsx](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx), [whiteboard-canvas.tsx](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx), [page.tsx](../src/app/(frontend)/classroom/[classId]/page.tsx)
- Backend: [api/live-sessions/](../src/app/(frontend)/api/live-sessions/), [api/whiteboards/](../src/app/(frontend)/api/whiteboards/)
- VideoSDK helper: [videosdk.ts](../src/lib/videosdk.ts)

---

## TL;DR — the headline problems

1. **Billing is decoupled from whether media actually worked.** A tutor's wallet is drained
   based on how long participants sat on the page, even if VideoSDK never connected a single
   audio/video stream (e.g. provider out of credit). Students/tutors get charged for a class
   where nothing worked.
2. **The whole session lifecycle (billing + auto-end) runs inside a client-polled, unauthenticated GET.**
   If the tutor closes the tab, the session is never billed or closed. Anyone on the internet
   can trigger billing/auto-close for any session ID.
3. **The whiteboard stores drawings in raw canvas pixel coordinates with no normalization.**
   Every viewer has a different canvas size, so lines land in the wrong place / wrong scale for
   everyone except the person who drew them. This is almost certainly the #1 user complaint.
4. **Newly created whiteboards and tutor slide navigation never reach students mid-class** —
   the student's whiteboard list is frozen at page load.
5. **All real-time features (audio, video, screen share, chat) collapse together** if VideoSDK
   is unavailable, with no graceful degradation — the page looks "live" but is dead.

---

## 1. Waiting room → live class

The student polls `/api/live-sessions/status?classId=` every 3s; when the tutor starts, the
student flips `isLive` and mounts `<MeetingProvider>`. Issues:

- 🔴 **Newly created whiteboards never reach students.** When the tutor shares a whiteboard, the
  client does `whiteboards.find(w => w.id === data.activeWhiteboard)`
  ([classroom-client.tsx:280-285](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L280-L285) and
  [:405-410](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L405-L410)). `whiteboards`
  is the static `initialWhiteboards` list loaded at page render. Any whiteboard the tutor creates
  *after* the student opened the page is not in that list, so `selectedWhiteboard` stays `null` and
  the board never displays for that student — even though the tutor sees it shared.
- 🟠 **Room-ID fallback can split tutor and students into different rooms.** The meeting ID is
  `session.roomId || \`room-${cls.id}\`` ([:618](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L618)).
  If `roomId` is ever empty/missing on one side, that side joins a different meeting. The server's
  fallback room ID is `room-${classId}-${Date.now()}` ([start/route.ts:60](../src/app/(frontend)/api/live-sessions/start/route.ts#L60)) —
  a string that is **not** a VideoSDK-created room, so the meeting may also fail to connect at all.
- 🟠 **Students wait forever with no failure path.** If the tutor never starts, or starts but media
  fails, the student sees "Waiting for your tutor…" indefinitely. There's no timeout, no "class
  failed to connect" state, no retry.
- 🟡 **`mediaDenied` only gates the tutor.** Students with blocked camera/mic are allowed straight in
  and silently appear with no media; no warning is shown to them
  ([:570-585](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L570-L585)).
- 🟡 **Mount pre-requests both camera and mic** unconditionally
  ([:221-232](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L221-L232)), ignoring the
  user's mic/cam toggles, so users who intended to join muted/no-video still get prompted for both.
- 🟡 **Two polling loops with different cadences** (3s waiting-room poll, 5s in-call status poll) and
  both depend on `whiteboards`, re-creating intervals whenever that array changes.

---

## 2. Live classroom (frontend) — do the buttons/features work?

Button / feature check:

| Control | Works? | Notes |
|---|---|---|
| Mic toggle | ✅ | Drives `localMicOn` correctly. |
| Camera toggle | ✅ | Drives `localWebcamOn`. |
| Screen share | ⚠️ | Works, but see screen-share priority bug below. |
| End class / Leave | ✅ | Tutor gets confirm + bills; student just routes away. |
| Chat send | ⚠️ | Works via VideoSDK PubSub — dies entirely if VideoSDK is down. |
| Participants list | ⚠️ | Works but dedup logic is unreliable (below). |
| Kick participant | ⚠️ | Works, but relies on mod permission granted to *everyone* (security issue below). |
| Whiteboard share/close | ⚠️ | Works for tutor; broken for students who joined before creation (§1). |
| Fullscreen whiteboard | ✅ | Portal + remount via `key` is sound. |

Issues:

- 🔴 **Every participant is minted as a moderator and screen-sharer.** The token grants
  `['allow_join','allow_mod','ask_join','allow_screenshare']` to all users
  ([videosdk.ts:52](../src/lib/videosdk.ts#L52)). So **any student can kick other participants**
  (the `p.remove()` path) and **any student can screen-share**. Permissions should be role-scoped
  (tutor = mod, students = join only, or screenshare gated).
- 🟠 **A student screen-sharing hijacks the whiteboard for the whole class.** Render priority is
  `presenterId ? screenshare : showWhiteboard ? whiteboard : grid`
  ([:963-1052](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L963-L1052)). Because students
  can present (above), a student starting a share overrides the tutor's shared whiteboard for everyone.
- 🟠 **Participant dedup merges different people with the same first name / display name.**
  `uniqueParticipants` treats `displayName === displayName` as a duplicate
  ([:754-782](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L754-L782)). Two students
  both named e.g. "John" → one disappears from the grid and participant list.
- 🟠 **All real-time UX is single-point-of-failure on VideoSDK.** Chat (`usePubSub("CHAT")`),
  whiteboard toggle sync, video, audio, and screen share all go through VideoSDK. If it errors, the
  only feedback is a toast from `onError` ([:723-726](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L723-L726));
  the UI still presents as a live class.
- 🟡 **Video grid is hard-locked to 2 columns** (`md:grid-cols-2`,
  [:1037](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L1037)); 5+ participants get
  cramped/overflowing tiles. No active-speaker view, no pagination.
- 🟡 **`OfflineParticipantView` is dead code** ([:1462](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L1462)) —
  expected-but-not-joined students are never shown, so the tutor can't see who's missing.
- 🟡 **No "mute all", "raise hand", "lower participant mic", recording, or device picker** — common
  classroom expectations are absent.
- 🟡 **`leave()` runs in the `beforeunload` handler and on unmount**, and a separate analytics
  `keepalive` fetch also fires; on a normal route transition both run, which is redundant but
  harmless.

---

## 3. Live class (backend)

- 🔴 **`/api/live-sessions/[id]/status` is unauthenticated and has heavy side effects.** The `GET`
  ([status/route.ts](../src/app/(frontend)/api/live-sessions/[id]/status/route.ts)) has **no
  `payload.auth()` check**, yet it: reconciles participant/attendance records, **charges the tutor's
  wallet**, **creates transaction rows**, and **auto-ends the session**. Anyone who knows/guesses a
  session ID can repeatedly trigger billing logic and force-close classes, and it returns
  `remainingCredits` to any caller.
- 🔴 **Session billing & auto-close depend on the tutor's browser polling.** All of the above only
  runs when a client hits the status endpoint (the tutor polls every 5s,
  [:359-419](../src/app/(frontend)/classroom/[classId]/classroom-client.tsx#L359-L419)). If the tutor
  closes the tab / loses network, nothing polls → the session stays `status: 'live'` forever, is
  never billed, and never auto-closes on credit exhaustion. There is no server-side cron/worker.
- 🔴 **Tutors are billed even when VideoSDK never connected.** `start` only checks
  `isVideoSdkAvailable()` (credentials present), never whether media actually established. Billing in
  both `end` and `status` is computed purely from `joinedAt`/`leftAt` wall-clock of participant logs
  ([end/route.ts:141-154](../src/app/(frontend)/api/live-sessions/[id]/end/route.ts#L141-L154)). A class
  where audio/video failed still drains credits. (See §4.)
- 🟠 **No guard against multiple concurrent live sessions per class.** `start`
  ([start/route.ts](../src/app/(frontend)/api/live-sessions/start/route.ts)) never checks for an existing
  `live` session, so double-clicks or two tabs create duplicate sessions/rooms for the same class.
- 🟠 **VideoSDK participant reconciliation can mass-mark everyone "left".**
  `getActiveVideoSdkParticipants` compares VideoSDK `participantId` to the DB user id
  ([status/route.ts:20-68](../src/app/(frontend)/api/live-sessions/[id]/status/route.ts#L20-L68)). If
  VideoSDK ever returns a suffixed/different participant id than `String(currentUser.id)`, **no one
  matches**, so all active logs get closed early → durations and billing understated, attendance wrong.
- 🟠 **Room creation failure is swallowed.** If the VideoSDK `POST /v2/rooms` call throws, the code
  logs and proceeds with a fake `room-…-timestamp` id
  ([start/route.ts:63-79](../src/app/(frontend)/api/live-sessions/start/route.ts#L63-L79)); the session is
  marked `live` but clients can never join that non-existent room.
- 🟠 **Duplicated billing logic in two places** (`end` route and `status` auto-close) — same math
  copy-pasted; easy to drift, and a race between a manual end and an auto-close is only loosely guarded
  by the `status === 'ended'` check.
- 🟡 **`join` doesn't verify the session is still `live`** — a user can POST `join` against an ended
  session and create participant/attendance rows.
- 🟡 **`leave` and `status` aren't transactional** — partial failures mid-loop leave some
  participant/attendance rows reconciled and others not.
- 🟡 **`whiteboard` route and slide routes do `depth` lookups per request** but there's no rate
  limiting on the polling endpoints, which the clients hit every 3–5s per user.

---

## 4. What happens if VideoSDK runs out of credit?

**Short answer: the class will *appear* to start, the tutor will still be billed, but audio, video,
and screen sharing will NOT work. The whiteboard drawing will mostly still work; chat will not.**

Why:

- `isVideoSdkAvailable()` only checks that **API credentials/token strings are present**, not that the
  VideoSDK account has balance ([videosdk.ts:17-29](../src/lib/videosdk.ts#L17-L29)). So the 503 gate on
  `start`/`join` passes, the session is created and marked `live`, and the client mounts the meeting.
- When the VideoSDK account is out of credit, the **WebRTC media layer fails to connect** (room
  creation may also 4xx, but it's swallowed — §3). The user sees, at best, a single error toast from
  `onError`; the header still shows "Live Classroom".
- **Audio: ❌**, **Video: ❌**, **Screen share: ❌**, **Chat: ❌** — all of these ride VideoSDK
  (`useMeeting`, `useParticipant`, `usePubSub`).
- **Whiteboard: ⚠️ partially works.** Drawing strokes are persisted through the app's own API and
  synced by polling `/api/whiteboards/[id]/slides` every 3s
  ([whiteboard-canvas.tsx:65-115](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L65-L115)) —
  independent of VideoSDK. Show/hide also syncs via the DB status poll for students. **However**, the
  tutor's "share with class" toggle that uses `publishWhiteboard` (PubSub) won't propagate instantly;
  students rely on the 5s DB status poll to pick it up, and the §1 "new whiteboard not in list" bug
  still applies.
- 🔴 **Billing still happens.** Because cost is computed from how long participants were on the page,
  not from real media minutes, the tutor's wallet is charged for the dead class
  ([end/route.ts:141-154](../src/app/(frontend)/api/live-sessions/[id]/end/route.ts#L141-L154),
  [status/route.ts:207-219](../src/app/(frontend)/api/live-sessions/[id]/status/route.ts#L207-L219)), and on
  "out of credits" (the *tutor's wallet*, not the VideoSDK account) it even auto-closes and writes a
  transaction.

> ⚠️ Note there are **two unrelated "credit" concepts** that are easy to confuse: (a) the tutor's
> in-app **wallet credits** (billing), and (b) the **VideoSDK account balance/minutes** with the
> provider. Nothing in the code checks (b). There is no health signal, no pre-flight balance check,
> and no user-facing message distinguishing "you're out of credits" from "our video provider is down".

**Recommended:** add a real VideoSDK health/balance probe, only mark a session billable once
`onMeetingJoined` fires for the tutor, bill on actual connected media minutes, and surface a clear
"video service unavailable — you were not charged" state.

---

## 5. Whiteboard (frontend) — the most-complained-about area

[whiteboard-canvas.tsx](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx)

- 🔴 **Drawings are stored in raw canvas pixel coordinates — no normalization.** Strokes are captured
  as `clientX - rect.left`, `clientY - rect.top`
  ([:196-218](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L196-L218)) and saved/replayed
  in those absolute pixels. Each participant's canvas is sized to their own container
  (`canvas.width = container.clientWidth`,
  [:179-194](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L179-L194)). Result: a line
  the tutor draws at the top-right of a 1200px canvas shows up in the wrong place / wrong scale on a
  student's 700px canvas, and shifts again in fullscreen vs inline. **This is the classic "the
  whiteboard is misaligned / drawings are in the wrong spot" complaint.** Fix: store coordinates
  normalized to 0–1 (or a fixed virtual canvas) and scale on render.
- 🔴 **Not real-time — 3-second polling.** Students only see new strokes when the 3s poll fires
  ([:65-73](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L65-L73)), so the board updates
  in jerky chunks and feels laggy/broken during live explanation. Should be event-streamed (VideoSDK
  PubSub or websocket).
- 🟠 **Tutor slide navigation is not synced to students.** Only "which whiteboard" and show/hide sync.
  When the tutor clicks next/prev slide ([:283-297](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L283-L297)),
  students stay on whatever `currentSlideIndex` they were on — they watch a blank/old slide while the
  tutor teaches on another.
- 🟠 **Resize shifts/!rescales existing drawings.** `handleResize` resets the canvas backing size and
  redraws from the same absolute coordinates ([:179-194](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L179-L194)),
  so any window resize (or opening the side panel, or fullscreen) moves the artwork.
- 🟠 **The eraser is fake.** It paints white strokes (`'#ffffff'`,
  [:226-233](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L226-L233)) on top instead of
  removing line data. It paints over the background grid (leaving white gaps), the "erased" data keeps
  growing the payload, and on any re-render/normalization it can reappear. No true erase, no undo/redo.
- 🟠 **Whole-slide save on every stroke-end.** `handleStopDrawing` PATCHes the entire `lines` array
  ([:250-254](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L250-L254)). A busy board
  sends ever-larger JSON blobs; combined with the 3s full re-fetch this is wasteful and gets slower as
  the lesson goes on. No incremental/delta updates.
- 🟡 **Poll diff is point-count based.** `pollCurrentSlide` only updates when total point count differs
  ([:99-111](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L99-L111)); equal-count but
  different content (e.g. erase-then-redraw same number of points) won't refresh.
- 🟡 **State mutation anti-pattern.** `handleDrawing` mutates the existing line object's `points` in
  place inside `setLines` ([:235-248](../src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx#L235-L248)),
  which can cause missed or inconsistent renders.
- 🟡 **No max-canvas/JSON size guard.** The slide `data` is an unbounded JSON field
  ([WhiteboardSlides.ts:100](../src/collections/WhiteboardSlides.ts#L100)); a long lesson can produce
  very large documents that slow every poll and PATCH.
- 🟡 **Students are hard view-only with no pointer/laser/annotation** — fine as a decision, but worth
  confirming it's intended.

---

## Suggested priority order

1. **Money & security first:** authenticate `/status`, move billing + auto-close to a server-side
   job, and only bill on real connected media (§3, §4).
2. **Whiteboard coordinate normalization + real-time sync + slide sync** — biggest user-visible win (§5, §1).
3. **Scope VideoSDK token permissions per role** (stop minting every student as mod/presenter) (§2).
4. **Fix the "new whiteboard not visible to already-joined students" bug** (§1).
5. **Graceful VideoSDK-unavailable state** distinct from out-of-wallet-credits (§4).
</content>
</invoke>

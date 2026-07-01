# Live Class / VideoSDK Audit — Critical Bugs & Remediation Plan

**Date:** 2026-07-01
**Scope:** The entire live-class stack built on **VideoSDK.live** (`@videosdk.live/react-sdk`) — token/secret layer, live-session lifecycle APIs, the classroom React client, and the shared whiteboard.
**Method:** Four parallel focused code audits (token/auth, session lifecycle, video client, whiteboard), followed by manual verification of every Critical finding against the source.

> All line numbers reflect the state of `main` at audit time. IDs are integer Postgres primary keys throughout; the client frequently sends them as strings — a recurring root cause below.

---

## Files in scope

| Area | Files |
|---|---|
| Token / secrets | `src/lib/videosdk.ts` |
| Session lifecycle APIs | `src/app/(frontend)/api/live-sessions/{start,join,leave,status}/route.ts`, `.../live-sessions/[id]/{end,status,whiteboard}/route.ts` |
| Classroom client | `src/app/(frontend)/classroom/[classId]/{classroom-client.tsx,page.tsx,live-class-unavailable.tsx}` |
| Whiteboard | `src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx`, `src/app/(frontend)/api/whiteboards/route.ts`, `.../whiteboards/[id]/slides/route.ts`, `.../whiteboards/[id]/slides/[slideId]/route.ts` |

---

## How the live class actually works (as-built)

- **Video:** `page.tsx` (server) mints a VideoSDK JWT via `generateVideoSdkToken()` and passes it as a prop into the `'use client'` classroom. `MeetingProvider` uses it. Join/leave/end are tracked server-side via `/api/live-sessions/*` and billed against the tutor's wallet.
- **Whiteboard:** **Not** real-time. VideoSDK `usePubSub` only broadcasts `WHITEBOARD_TOGGLE` (show/hide + board id) and `CHAT`. Drawing content is one-way: the tutor PATCHes the **entire** slide `lines` array to the DB on pointer-up, and **every participant polls the full slide list every 3s** to pick up changes. No deltas, no merge, no versioning.
- **Presence:** The client sets the VideoSDK `participantId` to `String(user.id)`, and a 5s tutor-side status poll reconciles VideoSDK participants against DB attendance and auto-closes the session when the tutor's wallet runs out of credits.

---

## Severity summary

| ID | Severity | Area | One-line |
|---|---|---|---|
| SEC-1 | 🔴 Critical | Token | `NEXT_PUBLIC_VIDEOSDK_TOKEN` fallback ships a full-permission token to every browser |
| SEC-2 | 🔴 Critical | Token | Tokens carry no room/participant scoping — any token joins any room |
| SEC-3 | 🔴 Critical | API | Unauthenticated `GET /api/live-sessions/status` leaks `roomId` for any class |
| SEC-4 | 🔴 Critical | API | Unauthenticated `GET /api/whiteboards/[id]/slides` leaks all whiteboard content |
| SEC-5 | 🔴 Critical | API | Any tutor can **start** a live session for **any** class |
| SEC-6 | 🔴 Critical | API | Any tutor can **end** any session and bill the victim tutor's wallet |
| SEC-7 | 🔴 Critical | API | Slide PATCH/DELETE don't verify the slide belongs to the authorized whiteboard |
| COR-1 | 🔴 Critical | Client | Camera/mic not stopped on the leave/end button path |
| COR-2 | 🔴 Critical | Client | Camera leak + ghost participant on tab close |
| COR-3 | 🔴 Critical | API | String IDs written into integer relationships → unhandled 500 (empty body) |
| COR-4 | 🔴 Critical | API | Double-start race → two live sessions, two rooms, double billing |
| COR-5 | 🔴 Critical | API | Double-close race (status auto-close vs end) → double wallet deduction |
| HI-1 | 🟠 High | Client | 2h token, no reconnection / refresh / state handling → frozen call |
| HI-2 | 🟠 High | Whiteboard | Last-write-wins full-array clobber → stroke loss / flicker |
| HI-3 | 🟠 High | Whiteboard | Poll matches slides by array index, not id → wrong-slide content |
| HI-4 | 🟠 High | API | Parents rejected at `join` but billed/tracked everywhere else |
| HI-5 | 🟠 High | API | `findByID` throws instead of returning null → deleted refs 500 not 404 |
| HI-6 | 🟠 High | Client | Status-poll interval re-armed on every participant change → request bursts |
| HI-7 | 🟠 High | Whiteboard | Unbounded slide payload re-downloaded every 3s per participant |
| HI-8 | 🟠 High | Client | `res.json()` before `res.ok` on empty bodies → "Unexpected end of JSON input" |
| ME-1…ME-10 | 🟡 Medium | — | See Medium section |

---

## 🔴 Critical — Security

### SEC-1 — `NEXT_PUBLIC_VIDEOSDK_TOKEN` fallback ships a god-token to every browser
**`src/lib/videosdk.ts:27-28, 64-67`**

```ts
const fallbackToken = process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN
if (!isPlaceholder(fallbackToken, 'videosdk_token_placeholder')) {
  return fallbackToken as string
}
```

Both `isVideoSdkAvailable()` and `generateVideoSdkToken()` fall back to `NEXT_PUBLIC_VIDEOSDK_TOKEN`. Next.js inlines any `NEXT_PUBLIC_*` var into the client bundle, so this token is shipped to every visitor. VideoSDK tokens are bearer credentials signed with the account secret and grant full REST/room access — and `permissionsForRole('server')` is the default (`allow_join, allow_mod, ask_join, allow_screenshare`).

**Exploit:** If deployed with the fallback set (a first-class supported config per `isVideoSdkAvailable`), an unauthenticated attacker greps the JS bundle for the JWT and can create/destroy rooms, pull recordings, and join any meeting on the account — video-service account takeover + billing abuse.

**Fix:** Delete the `NEXT_PUBLIC` fallback entirely. Require `VIDEOSDK_API_KEY` + `VIDEOSDK_SECRET` and mint every token server-side per request.

---

### SEC-2 — Tokens carry no room/participant scoping
**`src/lib/videosdk.ts:75-81`**, consumed at **`page.tsx:118`**

```ts
const payload = {
  apikey: apiKey,
  permissions: permissionsForRole(role),
  version: 2,
  iat: ..., exp: ...,
}
```

The JWT has `permissions` but no `roomId`/`participantId` claim, so every token of a given role is interchangeable across **all** rooms on the account. The token is (correctly) delivered to the browser for the client SDK, but because it isn't bound to `session.roomId`, a student's join-only token works on **any** class's room.

**Exploit:** A student in class A extracts their token from the page props and joins class B's room (they aren't enrolled in B). Role permissions still cap them at `allow_join`, but they gain unauthorized presence in arbitrary classrooms.

**Fix:** Add `roomId` (and ideally `participantId`) to the JWT payload; issue the client token only after the room is known and the user is authorized for it.

> **Reconciled:** the separate concern that a *student* could screen-share/kick is **mitigated** — `permissionsForRole('student')` is `['allow_join']` only (`videosdk.ts:45`). The real gap is cross-room reuse, not privilege escalation, provided tokens are always minted with the correct role.

---

### SEC-3 — Unauthenticated `GET /api/live-sessions/status` leaks `roomId`
**`src/app/(frontend)/api/live-sessions/status/route.ts:5-46`**

The handler calls **no** `payload.auth()` and returns `sessionId`, `roomId`, `startedAt`, and whiteboard state for any `classId` query param.

**Exploit:** `GET /api/live-sessions/status?classId=<n>` from anyone (no cookie) enumerates active classes and their VideoSDK `roomId`s — the exact input needed alongside SEC-1/SEC-2 to join rooms.

**Fix:** Require auth + class membership before returning `roomId`.

---

### SEC-4 — Unauthenticated `GET /api/whiteboards/[id]/slides` leaks all drawing content
**`src/app/(frontend)/api/whiteboards/[id]/slides/route.ts:6-27`**

The `GET` has no `payload.auth`, no membership check. It returns full `data.lines` for any whiteboard id. This is the endpoint the canvas polls every 3s.

**Exploit:** Any unauthenticated actor enumerates small integer ids and reads every tutor's private whiteboard content.

**Fix:** Authenticate, then authorize against the whiteboard's class membership / ownership / `isPublic` (mirror the `whiteboards/route.ts` GET).

---

### SEC-5 — Any tutor can start a session for any class
**`src/app/(frontend)/api/live-sessions/start/route.ts:24, 35, 114-118`**

The only gate is `user.accountType !== 'tutor'`. The class is never fetched to confirm `user.id` owns it; `classId` from the body is written straight into the new session.

```ts
if (!user || user.accountType !== 'tutor') { /* 403 */ }
...
const session = await payload.create({
  collection: 'live-sessions',
  data: { class: classId, tutor: user.id, roomId, ... } as any,
})
```

**Exploit:** Tutor A posts `{ classId: <B's class> }` → a live session + VideoSDK room is created billing A, and B's students can be funneled into A's room.

**Fix:** Fetch the class and require `classTutorId === user.id` (else 403/404) before creating.

---

### SEC-6 — Any tutor can end any session and bill the victim's wallet
**`src/app/(frontend)/api/live-sessions/[id]/end/route.ts:26, 33, 159`**

Checks `accountType === 'tutor'`, fetches the session by URL id, checks only `status === 'ended'` — but **never** checks `session.tutor === user.id`. Billing/wallet logic targets `session.tutor` (line 159).

**Exploit:** `POST /api/live-sessions/<anyId>/end` from any tutor forcibly ends another tutor's live class and triggers wallet deduction against that other tutor.

**Fix:** After fetching, require `sessionTutorId === user.id` (or admin) else 403.

---

### SEC-7 — Slide PATCH/DELETE don't verify slide ↔ whiteboard ownership
**`src/app/(frontend)/api/whiteboards/[id]/slides/[slideId]/route.ts:22-56` (PATCH), `:80-102` (DELETE)**

Authorization confirms the caller owns whiteboard `id`, but the update/delete then targets `slideId` **without checking that slide's `whiteboard === id`**.

**Exploit:** A tutor who owns board A calls `PATCH /api/whiteboards/A/slides/<slideId-of-B>` → passes the ownership check on A, mutates/deletes B's slide.

**Fix:** Load the slide and assert `slide.whiteboard === Number(id)` (or add `where: { whiteboard: { equals: id } }`), else 404/403.

---

## 🔴 Critical — Correctness & Data Integrity

### COR-1 — Camera/mic not stopped on the leave/end button path
**`src/app/(frontend)/classroom/[classId]/classroom-client.tsx:476-498`**

```js
const handleLeaveSession = () => {
  if (isTutor) { handleEndSession() }   // fetch + router.push, no leave()
  else { router.push('/dashboard/student') }  // no leave()
}
```

Neither branch calls the SDK `leave()`. Teardown is left entirely to the `useEffect` unmount cleanup (`:764-770`), which races with `router.push`. In practice the camera indicator can stay on and `onMeetingLeft` (the intended redirect) never fires.

**Fix:** Call `leave()` in `handleLeaveSession` and let `onMeetingLeft` own the redirect; drop the direct `router.push` from the leave path.

---

### COR-2 — Camera leak + ghost participant on tab close
**`src/app/(frontend)/classroom/[classId]/classroom-client.tsx:363-385`**

The `beforeunload` handler only fires a `keepalive` analytics `fetch('/api/live-sessions/leave')`. It never calls `meeting.leave()` or stops local tracks (and `leave` isn't in scope in this parent component).

**Exploit/effect:** Closing the tab mid-class leaves a ghost participant in the VideoSDK room until server timeout, other participants see a frozen tile, and the camera light can persist.

**Fix:** Add a `beforeunload → leave()` listener **inside** `ClassroomMeetingView` where `leave` is available, and stop local tracks explicitly.

---

### COR-3 — String IDs written into integer relationships → unhandled 500 (empty body)
Confirmed pattern (already fixed elsewhere in this app for onboarding/assessments): passing a string into a Payload integer relationship throws `ValidationError` → unhandled → HTTP 500 with an empty/opaque body → the client's `res.json()` fails.

Instances found:
- **`api/whiteboards/[id]/slides/route.ts:74`** — `whiteboard: id` (URL param is always a string). **"Add Slide" is broken.**
- **`api/live-sessions/join/route.ts:111`** — `liveSession: sessionId` (client body).
- **`api/whiteboards/route.ts:96`** — `class: classId` (client body).
- **`api/live-sessions/[id]/whiteboard/route.ts:34`** — `activeWhiteboard` (client, round-trips through pubsub JSON).
- **`api/live-sessions/start/route.ts:117`** — `class: classId` (client body).

**Fix:** Coerce with `Number(id)` and validate `Number.isInteger` before every relationship write (reject non-integers with 400). Return a proper JSON error even when Payload's `error.message` is empty (serialize `error?.data`/`error?.errors`).

---

### COR-4 — Double-start race → two live sessions
**`src/app/(frontend)/api/live-sessions/start/route.ts:62-72, 114`**

The duplicate guard is a non-atomic check-then-create; `roomId` is unique but `(class, status='live')` is not DB-constrained.

**Effect:** Two concurrent starts (double-click / two tabs) both see zero live sessions, both create rooms and `status:live` rows → participants split across rooms, double billing, and `status` polling returns whichever `limit:1` wins.

**Fix:** Add a partial unique index on `(class)` where `status='live'`, or do an atomic conditional create; create as `waiting` then flip to `live`.

---

### COR-5 — Double-close race → double wallet deduction
**`src/app/(frontend)/api/live-sessions/[id]/status/route.ts:277-454`** (auto-close) racing with **`[id]/end`**

The auto-close block is a non-atomic check-then-act guarded only by a `status === 'live'` read. Two overlapping 5s polls (or a poll racing the `end` route) both read `live`, both deduct credits, and both write `transactions` rows (references differ by `Date.now()`, so no dedupe).

**Fix:** Make the `live → ended` transition atomic (conditional update `where status='live'`) and short-circuit the losers.

---

## 🟠 High

### HI-1 — 2-hour token, no reconnection / refresh / state handling
**`classroom-client.tsx:747-757`; token TTL at `page.tsx:118` (`3600*2`)**
No `onMeetingStateChanged`, no handling of `FAILED`/`DISCONNECTED`, no token refresh. A class longer than 2h (or any auth-requiring reconnect) drops and the user is left on frozen tiles with only a toast.
**Fix:** Add reconnection/state UI ("Reconnecting…"), handle `FAILED`, and re-mint/extend the token before expiry.

### HI-2 — Whiteboard last-write-wins clobber
**`whiteboard-canvas.tsx:115-137, 139-154`**
Each save PATCHes the entire `lines` array with no merge/version. A poll response landing between pointer-up and save-completion reverts freshly drawn strokes (`isDrawingRef` only guards while the pointer is down).
**Fix:** Send stroke deltas via pubsub, and/or gate polling on a monotonic version/`updatedAt`; suppress polling for N ms after a local write.

### HI-3 — Poll matches slides by index, not id
**`whiteboard-canvas.tsx:115-133`** — `data.slides[currentSlideIndex]`.
After a concurrent add/delete/reorder, position `currentSlideIndex` points at a different slide, copying an unrelated slide's lines onto the current view. The tutor's active slide is also never propagated.
**Fix:** Match by `slide.id`; broadcast the tutor's active slide id via pubsub.

### HI-4 — Parents rejected at `join` but billed/tracked elsewhere
**`api/live-sessions/join/route.ts:78-80`** allows only `classTutorId` and `studentIds`; parents (`cls.parents`) get 403, yet `status`/`end` treat parents as participants.
**Fix:** Include `cls.parents` in the join allow-list.

### HI-5 — `findByID` throws instead of returning null
**`join:50,71`, `end:39`, `status:89`, etc.** `payload.findByID` throws `NotFound`; the `if (!session)`/`if (!cls)` guards are dead code, so a deleted reference yields a 500 (via the generic catch) instead of a clean 404.
**Fix:** Use `payload.find({ where: { id: { equals } } })` or wrap in try/catch to return real 404s.

### HI-6 — Status-poll interval re-armed on every participant change
**`classroom-client.tsx:389-446`** — deps include `activeStudentsCount` and `whiteboards`, so the 5s interval is torn down/rebuilt on every join/leave and every whiteboard refresh, causing request bursts.
**Fix:** Read the current count via a ref inside the interval; drop `activeStudentsCount`/`whiteboards` from deps.

### HI-7 — Unbounded slide payload polled every 3s per participant
**`whiteboard-canvas.tsx:88-96`; slides GET**
`data.lines` has no cap; every participant re-downloads the full board every 3s and the tutor re-uploads the whole array on each stroke. After a dense session this is multi-MB × participants × (1/3s).
**Fix:** Decimate strokes / cap points, sync deltas, return only changed slides with a version/If-Modified-Since.

### HI-8 — `res.json()` before `res.ok` on empty bodies
**`classroom-client.tsx:456, 479, 342`; `whiteboard-canvas.tsx:101, 121, 326`**
Same class as the already-fixed assessment bug: an empty 500/502 body makes `res.json()` throw "Unexpected end of JSON input", masking the real error.
**Fix:** `const data = await res.json().catch(() => ({}))` and check `res.ok` first.

---

## 🟡 Medium

- **ME-1 — Info leak in error responses.** Generic catches return raw `error.message` (`start:129`, `join:219`, `status:464`, whiteboard routes). Log server-side; return a generic message.
- **ME-2 — Default token role is `server` (full perms).** `videosdk.ts:55` — make `role` required so a god-token can't be minted by omission.
- **ME-3 — Participant id type mismatch.** `classroom-client.tsx:882, 885-886` compares numeric DB ids against string `participantId`s, so `guestParticipantIds` classifies **every** real participant as a guest. Currently mostly dead code, but will misbehave the moment it's wired to UI. Normalize both sides to `String()`.
- **ME-4 — Black/frozen remote tile race.** `classroom-client.tsx:1360-1397` — `<video>` is mounted only when `webcamOn`, `.play()` rejections are only logged with no retry, and old `MediaStream` wrappers aren't torn down. Keep the element mounted (toggle visibility) and retry `.play()`.
- **ME-5 — Waiting-room poll replaces `session` with a partial object.** `classroom-client.tsx:300-325` — `setSession({ id, roomId, status })` drops other fields. Use `setSession(prev => ({ ...prev, ... }))`.
- **ME-6 — Slide `order` race.** `slides/route.ts:61-79` — `max+1` computed non-atomically → duplicate `order` on concurrent adds → nondeterministic sort (compounds HI-3). Derive order from a sequence/transaction.
- **ME-7 — Canvas resets to slide 0 mid-session.** `whiteboard-canvas.tsx:72-80` — mount effect depends on `initialSlides`; a new prop reference resets `currentSlideIndex`/lines. Key the reset on `whiteboardId` only.
- **ME-8 — Resize-listener churn.** `whiteboard-canvas.tsx:205-220` — resize effect depends on `[lines]`, re-subscribing the window listener on every stroke. Split one-time listener from the redraw effect.
- **ME-9 — `leave` without `join` writes bogus logs + no membership check.** `leave/route.ts:31-105` — writes a "Left (0 minutes)" activity log and accepts arbitrary `sessionId`. Skip logging when `!latestLog`; verify participation.
- **ME-10 — State machine ignores `cancelled`/`waiting`.** `end:43` gates only on `ended`; `start`'s dup check only matches `live`. Gate `end` on `status === 'live'`; account for `waiting` in the start guard.

---

## Verified NOT bugs (to save re-investigation)

- **Presence reconciliation works.** The status route compares `String(p.participantId)` to `String(user.id)`; the client sets `participantId: String(currentUser.id)` (`classroom-client.tsx:649`), so the ids match. (An earlier audit pass flagged this as possibly catastrophic — it is not, but it is fragile: it silently breaks if the client ever stops setting `participantId` to the user id.)
- **Student write-access to whiteboard is blocked** both by route ownership checks and the `WhiteboardSlides` collection access (`accountType === 'tutor'`). The whiteboard gaps are **read-side** (SEC-4) and **cross-board** (SEC-7).
- **Token signing is correct** — HS256 with the server secret and a proper `exp` (2h). The problem is delivery/scoping (SEC-1/SEC-2), not the crypto.
- **Intervals are cleaned up** (`clearInterval` present for the 3s/5s polls). The lifecycle issues are re-arming churn (HI-6) and the resize listener (ME-8), not leaked intervals.
- The main `join()/leave()` effect with `[]` deps (`classroom-client.tsx:764-770`) is the correct VideoSDK pattern; `LocalMediaPreview` correctly stops preview tracks on cleanup.

---

## Remediation plan

### Phase 0 — Security hotfixes (do first; small, high-impact)
1. **SEC-1:** Remove the `NEXT_PUBLIC_VIDEOSDK_TOKEN` fallback from `videosdk.ts`; require server-side key+secret.
2. **SEC-3, SEC-4:** Add `payload.auth` + membership/ownership checks to the `status` GET and the `slides` GET.
3. **SEC-5, SEC-6:** Add ownership checks — `class.tutor === user.id` in `start`; `session.tutor === user.id` in `end`.
4. **SEC-7:** Verify `slide.whiteboard === Number(id)` in slide PATCH/DELETE.
5. **ME-2:** Make `generateVideoSdkToken`'s `role` a required argument.

### Phase 1 — Stop the bleeding (functional correctness)
6. **COR-3:** Add `Number()` coercion + integer validation to every relationship write (5 sites); fixes broken "Add Slide" and prevents empty-500s. Ensure routes always return non-empty JSON errors.
7. **COR-1, COR-2:** Call `leave()` on the leave/end button path and on `beforeunload` inside `ClassroomMeetingView`; stop local tracks — fixes the camera-stays-on complaints and ghost participants.
8. **HI-8:** Defensive `res.json().catch(() => ({}))` + `res.ok`-first across the classroom/whiteboard fetches.

### Phase 2 — Billing & state-machine integrity
9. **COR-4, COR-5:** Make `live` start and `live → ended` transitions atomic (partial unique index / conditional updates); prevents double sessions and double billing.
10. **HI-4, HI-5, ME-9, ME-10:** Fix the join allow-list (parents), replace throwing `findByID` guards with real 404s, and tighten state gating.

### Phase 3 — Scoped tokens & resilience
11. **SEC-2:** Add `roomId`/`participantId` claims; mint the client token per-room after authorization.
12. **HI-1:** Add reconnection/`MEETING_STATE` handling and token refresh for long/interrupted sessions.

### Phase 4 — Whiteboard sync rework
13. **HI-2, HI-3, HI-7, ME-6, ME-7, ME-8:** Move from 3s full-state polling to pubsub stroke deltas; match slides by id; cap/decimate stroke data; add slide versioning; fix canvas effect churn.

### Phase 5 — Polish
14. **ME-1, ME-3, ME-4, ME-5, HI-6:** Generic error responses, participant-id normalization, video-tile `.play()` retry, `setSession` merge, and interval-deps cleanup.

---

## Suggested next step
Phase 0 items are all small, localized edits with outsized security payoff and no schema changes — a good first PR. Phase 1's COR-3 (ID coercion) and COR-1/COR-2 (camera teardown) resolve the most user-visible breakage. Phases 2–4 are larger and should be scoped/estimated separately.

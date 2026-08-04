# Live Classroom v2 — Rebuild Plan (remove VideoSDK → Cloudflare Realtime + Ably)

> **Goal:** rip VideoSDK out 100%, delete the old live-classroom UI, and rebuild a
> Google-Meet-style live class from scratch that works on **Vercel serverless**,
> scales to large group classes, and is cheap to run.

---

## Original brief (kept for reference)

Remove the Video SDK from the project 100% and delete all files that aren't needed.
Delete the live-classroom files/components and redesign the entire live classroom
using the Cloudflare vars in `.env` as the TURN server; build the live class from scratch.

**Features:** Google-Meet-like flow · mute mic/cam before joining · everything real-time ·
tutor has full control (whiteboard, remove participants) · multiple whiteboards per meeting ·
live chat.

**Requirements:** (1) mobile-first at all costs · (2) chat + whiteboard fully real-time ·
(3) students wait in a waiting area until the tutor joins · (4) beautiful toasts on join &
new chat message · (5) chat reactions · (6) fallback avatar API when no avatar · (7) beautiful,
mobile-first, responsive UI · (8) raise hand · (9) meeting SFX (`public/sfx/sfx-1.mp3`,
`sfx-2.mp3`) · (10) tutor credit draws down live, tutor-only "credit almost finished" alert ·
(11) only the tutor can see credit during the class.

---

## 0. Answers to the 3 questions that shaped this plan

**Q: What's missing from the original brief?**
The brief describes features but not the **transport layer**. Cloudflare TURN is *only*
NAT-traversal relay — it does not do signaling and does not route group media. The plan below
adds the two missing pieces: an **SFU** for media (Cloudflare Realtime) and a **realtime data
plane** for signaling/chat/whiteboard/presence (Ably). It also adds: short-lived TURN credential
minting, server-authoritative waiting-room/roles, and a heartbeat-driven credit charger.

**Q: Do we need a `server.ts`/`server.js`?**
**No.** A custom Node socket server would break Vercel (serverless has no long-lived
WebSockets). We avoid it entirely: Cloudflare Realtime's SFU is a **stateless HTTP API**
(WHIP/WHEP-style — POST an SDP, get one back), and Ably is a **managed** WebSocket service.
Both are reachable from ordinary Next.js route handlers. Zero persistent server to run.

**Q: Will it work on Vercel and Netlify?**
**Yes** — because there is no custom socket server. All realtime lives in Cloudflare Realtime
(HTTP) and Ably (managed WS). Next.js stays 100% serverless. TURN is an external Cloudflare
service and is unaffected.

---

## 1. Architecture decision (given: 10–1000 students · low funds · Vercel)

At 10–1000 participants this is **not a mesh meeting** — it's a **broadcast/webinar**. Everyone
publishing video is impossible (mesh dies at ~4; 1000 upstreams is absurd). The model is:

- **Publishers ("on stage"):** the tutor, plus students promoted from a raised hand (cap ~1–10).
- **Viewers:** everyone else — they *pull* the stage tracks and interact only via data
  (chat, reactions, raise-hand). A promoted viewer becomes a publisher; demotion reverses it.

This is how you serve a big class cheaply: viewers cost data-plane messages, not media uplinks.

| Plane | Choice | Why | Cost |
|---|---|---|---|
| **Media (SFU + TURN)** | **Cloudflare Realtime (Calls)** + existing Cloudflare TURN | You're already on Cloudflare (TURN creds in `.env`). SFU is HTTP → Vercel-safe. Scales one-to-many. | SFU free; pay only TURN egress ~$0.05/GB |
| **Realtime data** (signaling app-events, chat, reactions, hands, presence, waiting-room, whiteboard ops) | **Ably** | Most generous free tier of the managed options; built-in presence + history; managed WS → Vercel-safe. | Free: 6M msgs/mo, **200 peak concurrent connections** |
| **Persistence / auth / business logic** | **Existing Payload + Mongo** (reuse collections) | Already models sessions, participants, messages, whiteboards, wallets, notifications. | — |
| **Deploy** | **Vercel serverless** | No `server.ts`. | — |

**Cap decision:** keep a hard cap. `classes.maxStudents` already caps at **100** in schema — keep
it. Free Ably tolerates ~200 concurrent, so 100 viewers/class fits the free tier. Enforce a small
**publisher-slot cap** (tutor + N promoted). If classes ever need >200 concurrent, the only piece
that must change is the data plane → swap Ably for **Cloudflare Durable Objects (WebSocket
hibernation)**, same vendor, cheapest at scale. Everything is built behind a `RealtimeClient`
interface so this swap doesn't touch the UI.

### New env vars (Phase 0 provisions these)
```
CLOUDFLARE_TURN_KEY_ID=...          # already present — reuse for ICE
CLOUDFLARE_TURN_API_TOKEN=...       # already present — server-side only, mints short-lived creds
CLOUDFLARE_REALTIME_APP_ID=...      # NEW — Cloudflare Realtime (Calls) app
CLOUDFLARE_REALTIME_APP_SECRET=...  # NEW — server-side only
ABLY_API_KEY=...                    # NEW — server-side only; issue tokenRequests to clients
NEXT_PUBLIC_LIVE_LOW_CREDIT_THRESHOLD=... # optional tuning for the low-credit alert
```

---

## 2. Delete inventory (VideoSDK + old classroom)

**Remove dependency**
- `@videosdk.live/react-sdk` from `package.json` (+ lockfile).

**Delete files**
- `src/lib/videosdk.ts`
- `src/lib/live-participant-id.ts` *(VideoSDK participant-id workaround — see memory note; obsolete under Realtime)*
- `src/app/(frontend)/api/live-sessions/token/route.ts` *(VideoSDK token)*
- `src/app/(frontend)/api/live-sessions/health/route.ts` *(VideoSDK health)*
- `src/app/(frontend)/classroom/[classId]/classroom-client.tsx` *(2101 lines — full rewrite)*
- `src/app/(frontend)/classroom/[classId]/whiteboard-canvas.tsx` *(rewrite against new sync)*
- `src/app/(frontend)/classroom/[classId]/classroom-loader.tsx` *(rewrite)*

**Rewrite in place (keep the route, replace VideoSDK internals)**
- `src/app/(frontend)/api/live-sessions/join/route.ts`
- `src/app/(frontend)/api/live-sessions/start/route.ts`
- `src/app/(frontend)/api/live-sessions/leave/route.ts`
- `src/app/(frontend)/api/live-sessions/status/route.ts` and `[id]/status/route.ts`
  *(polling → mostly replaced by realtime; keep a thin status/heartbeat endpoint for billing)*
- `src/app/(frontend)/api/live-sessions/[id]/chat/route.ts` *(persist only; delivery via Ably)*
- `src/app/(frontend)/api/live-sessions/[id]/whiteboard/route.ts` *(persist snapshots; ops via Ably)*
- `src/app/(frontend)/api/live-sessions/[id]/end/route.ts`
- `src/app/(frontend)/classroom/[classId]/page.tsx` and `live-class-unavailable.tsx`

**Keep as-is / preserve (do NOT delete)**
- `src/lib/live-billing.ts` — billing math is well-designed; only its *trigger* changes.
- `src/collections/LiveSessions.ts`, `LiveSessionParticipants.ts`, `LiveSessionMessages.ts`
- `src/collections/Whiteboards.ts`
- `src/lib/notification-service.ts` — reuse for the low-credit alert.
- All `src/migrations/2026070*_live_session_*` — data model stays.

> ⚠️ Before deleting, `grep -r videosdk src` again to catch stragglers, and check
> `class-invite`, tutor/parent/student `classes` pages, and dashboards for links into
> `/classroom/[classId]` so nothing dangles.

---

## 3. Data-model refactor (small, additive migrations)

Reuse existing collections; add fields where the new flow needs server-authoritative state:

- **`live-sessions`**: add `stagePublishers` (hasMany users — current on-stage set),
  `raisedHands` (hasMany users, ordered), and a Realtime `sessionResourceId` (Cloudflare
  Realtime session handle). `showWhiteboard`, `activeWhiteboard`, `whiteboardWritable`,
  `coinsConsumed`, `durationMinutes`, `status(scheduled|waiting|live|ended|cancelled)` already exist.
- **`live-session-participants`**: add `role (host|publisher|viewer)`, `handRaisedAt`,
  `removed (bool)` + `removedReason`. Keep `joinedAt/leftAt/durationSeconds` (billing depends on them).
- **`live-session-messages`**: add `reactions` (array of `{ emoji, userId }`) and optional
  `replyTo`. Keep `sender/senderName/senderAccountType/message`.
- **`whiteboards`**: already linked to `class` + `liveSession`; add `snapshot` (JSON of latest
  strokes) so a late joiner renders current state, then subscribes to live ops via Ably.

---

## 4. Phased build

### Phase 0 — Provision & scaffolding (no UI yet)
- Create Cloudflare Realtime app → `CLOUDFLARE_REALTIME_APP_ID/SECRET`. Create Ably app → `ABLY_API_KEY`.
- `src/lib/realtime/turn.ts` — server-only: mint **short-lived** ICE creds from the TURN API token
  (never ship the static token to the browser).
- `src/lib/realtime/cf-realtime.ts` — server wrapper over Cloudflare Realtime REST
  (create session, add local/remote tracks, renegotiate).
- `src/lib/realtime/ably.ts` — server issues Ably `tokenRequest` scoped to `live:{sessionId}`;
  client `RealtimeClient` interface (publish/subscribe/presence) so the data plane is swappable.
- Remove `@videosdk.live/react-sdk`; run the Phase-2 deletions after the new pages compile.

### Phase 1 — Data model & API refactor (server)
- Ship the additive migrations from §3 (`payload migrate:create`).
- Rewrite `start` (tutor → `status: live`, creates CF Realtime session, broadcasts `class-started`
  on Ably → waiting-room students auto-advance), `join` (admission + role assignment + ICE creds +
  Ably token), `leave` (close participant log), `end` (settle final billing delta), and a thin
  `heartbeat` endpoint that drives billing (§Phase 6).
- `chat` route persists to `live-session-messages` and returns; **delivery is via Ably**, not polling.
- `whiteboard` route persists snapshots; **ops broadcast via Ably**.

### Phase 2 — Pre-join lobby + waiting room (mobile-first)
- New route shell under `classroom/[classId]`: device-permission + mic/cam **preview with
  pre-join mute toggles** (req 2 of features, Google-Meet parity).
- **Waiting room**: students land here until `status: live`; subscribe to Ably `class-started`
  to auto-advance (replaces the old status poll). Tutor bypasses.
- Fallback avatars via a free API (e.g. DiceBear/UI-Avatars) with per-user deterministic color
  when `user.avatar` is empty (req 6).

### Phase 3 — Core media (SFU broadcast)
- Client publishes local tracks to Cloudflare Realtime; viewers pull stage tracks.
- Publisher/viewer split with promote/demote; renegotiation on stage changes.
- TURN-only fallback + reconnect handling; screen-wake; adaptive layout for 1–N tiles.
- Grid/speaker layouts, mobile-first tiles, active-speaker highlight.

### Phase 4 — Realtime interactions (Ably)
- **Live chat** with **reactions** (reqs feat-6, req 5) — optimistic UI, persisted via chat route.
- **Raise hand** queue (req 8); tutor sees ordered hands and can promote to stage.
- **Presence** → join/leave events drive the toasts.
- **Beautiful toasts** (build on existing `sonner`) for joins and new messages (req 4).
- **SFX**: play `public/sfx/sfx-1.mp3` / `sfx-2.mp3` on join / new message / hand-raise, with a
  mute-sounds control and `prefers-reduced-motion`/autoplay-policy respect (req 9).

### Phase 5 — Tutor control & whiteboards
- Tutor-only control rail: **remove participant** (server marks `removed`, revokes Ably token,
  drops their CF tracks), mute-all, lock chat, toggle whiteboard, toggle student-writable.
- **Multiple whiteboards** per meeting (feat: create/switch), tutor-authored, students view
  (or draw when writable). Real-time strokes over Ably; snapshot persisted for late joiners.
- Rewrite `whiteboard-canvas.tsx` against the new op-based sync.

### Phase 6 — Live credit billing & alerts
- Reuse `src/lib/live-billing.ts` unchanged. Replace the old VideoSDK status poll trigger with:
  a client **heartbeat** (every ~15–30s while the tutor is present) hitting the `heartbeat`
  endpoint, which calls `chargeSessionDelta` — so credit **draws down live** and a dropped tab is
  still billed to the last heartbeat (req 10). A Vercel **cron** sweeps stale live sessions as a
  backstop.
- **Tutor-only** live credit readout; **low-credit alert** via `notification-service` + a toast
  when balance crosses `NEXT_PUBLIC_LIVE_LOW_CREDIT_THRESHOLD` (reqs 10–11). Auto-end on zero
  credit (already modeled in billing). Escrow/booking-backed classes stay skip-billed (existing logic).

### Phase 7 — QA, polish, cleanup
- Cross-device mobile-first pass (req 1/7); accessibility (focus, captions-ready, contrast).
- Load-shape test: 1 publisher + ~100 viewers; confirm Ably concurrency + CF egress stay in budget.
- Final `grep -r videosdk src` = empty; remove dead migrations only if truly unused; update
  `.env.example` and docs.

---

## 5. Requirement → phase traceability

| Req | Where |
|---|---|
| Google-Meet flow, pre-join mute | Phase 2, 3 |
| Everything real-time | Ably (Phase 1,4,5) + CF Realtime (Phase 3) |
| Students wait for tutor | Phase 2 waiting room |
| Join / new-message toasts | Phase 4 |
| Chat reactions | Phase 4 |
| Fallback avatar API | Phase 2 |
| Beautiful mobile-first responsive UI | Phases 2–5 + `ui-ux-pro-max` |
| Raise hand | Phase 4 (queue) → Phase 5 (promote) |
| Meeting SFX | Phase 4 |
| Tutor full control, remove participant | Phase 5 |
| Multiple whiteboards, real-time | Phase 5 |
| Live credit draw-down + tutor-only alert | Phase 6 |

---

## 6. Cost & risk notes
- **Cheapest path** given low funds: Cloudflare SFU (free) + your existing TURN (~$0.05/GB egress) +
  Ably free (6M msgs, 200 concurrent). Realistic small-group cost ≈ $0.
- **Free-tier ceiling:** Ably free = ~200 concurrent connections. A single 100-student class fits;
  many *simultaneous* large classes won't. Mitigation is pre-built: `RealtimeClient` abstraction →
  swap Ably for Cloudflare Durable Objects when needed. **This is the only scale risk — flagged, not hidden.**
- **Autoplay/permissions:** SFX and media need a user gesture; the pre-join lobby is that gesture.
- **Billing integrity:** heartbeat + cron backstop preserves the existing "billed even if tab closes"
  guarantee; `chargeSessionDelta`'s claim-guard still prevents double-charge.

> Build UI under the `ui-ux-pro-max` bar (per global instructions); consult Magic UI / React Bits
> before hand-rolling components; GSAP for motion, respecting `prefers-reduced-motion`.

---

## 7. Implementation status (living)

**Done — UI-first (mock data):** pre-join lobby (real camera/mic via getUserMedia, device picker,
permission handling), waiting room, live stage (16:9 tiles + scroll), control bar, chat + reactions,
people panel + tutor moderation, multi-whiteboard (freehand), tutor credit meter, SFX, legible
in-call toasts, styled ScrollAreas. VideoSDK UI deleted.

**Done — Phase 0 backend foundation (audited ×3):**
- `src/lib/live/config.ts` — env-gated capability flags (turn/sfu/ably/ready).
- `src/lib/live/turn.ts` — live short-lived ICE from Cloudflare TURN (`generate-ice-servers`), returns `{iceServers, degraded}`.
- `src/lib/live/cf-realtime.ts` — Cloudflare Realtime SFU REST wrapper (session/tracks/renegotiate/close).
- `src/lib/live/ably-server.ts` — signed Ably TokenRequest (HMAC) + host/student/observer capability tiers.
- `src/lib/live/access.ts` — session membership + host resolution + status gate + normalized id.
- `src/lib/live/rate-limit.ts` — best-effort per-instance limiter.
- Routes: `/api/live/ice`, `/api/live/ably-token`, `/api/live/capabilities` (auth + membership + rate-limit + `runtime='nodejs'`).
- `.env` + `.env.example` placeholders added.

**Done — Phase 1 data model + API refactor (audited ×3):**
- Fields added: `live-sessions.{sfuSessionId,stagePublishers,raisedHands}`, `live-session-participants.{role,handRaisedAt,removed,removedReason}`, `live-session-messages.{reactions[],replyTo}`, `whiteboards.snapshot`.
- Migration `20260804_101918_live_classroom_v2_fields.ts` (hand-trimmed to drop already-applied disputes DDL). Local dev DB is push-synced; migration applies in prod via the build script.
- Routes refactored off VideoSDK: `join` (sets role, 503 when backend not ready, 403 on removed), `start` (local roomId + Cloudflare SFU session, gates on isLiveClassroomReady), `status` (VideoSDK presence poll → null stub; presence returns in Phase 4).
- Deleted `lib/videosdk.ts`, `lib/live-participant-id.ts`, token + health routes; removed `@videosdk.live/react-sdk`. Added `ably`.
- Billing hardened: `computeBillableMinutes` caps runaway open-log accrual; removed users can't be readmitted or re-billed (join/chat/status all guard).

**Carried-forward backlog (from audits — address in later phases):**
- Rate limiter is per-instance/fail-open → back with Upstash/Redis before relying on it for cost control.
- Ably token TTL (1h) can outlive a force-ended session; align TTL to remaining session time / channel teardown when control+whiteboard go live.
- TURN creds can't be revoked before TTL (Cloudflare limit) — short TTL + membership gating mitigate.
- Validate `session.tutor` is authorized for the class at session-creation time (substitute-host trust).
- Access is derived from `classes.students/parents`, not the `live-session-participants` ledger — reconcile when presence-eviction lands.
- **No `removed`-setter route yet** — moderation guards are in place but nothing sets `removed:true` until the Phase-5 remove-participant route lands.
- **Real presence + heartbeat billing needed (Phase 4/6):** `getActiveParticipantUserIds` is a null stub; until Ably presence + a heartbeat land, billing is time-based and the status reconcile block is dead code. Do NOT wire the real UI polling loop to `/status` billing until the heartbeat exists.
- Wallet write is read-modify-write (not atomic decrement) — revisit for concurrency later.
- Chat accepts posts on an `ended` session (harmless; polish).

**Done — Phase 3 SFU media (audited ×3):**
- `/api/live/rtc` signalling proxy (session/tracks/renegotiate/close) — app secret stays server-side; membership + rate-limit gated; FAIL-CLOSED ownership (a member can't act on another's SFU session); observers (parents) can't publish.
- `_live/rtc/sfu-client.ts` — browser RTCPeerConnection engine: serialized SDP (no glare), publish local + pull remote tracks, answer-on-any-offer, teardown via pc.close() + unload beacon.
- `_live/rtc/use-capabilities.ts` + a "Demo" badge shown until the real backend is configured.
- Server-side media teardown backstop: `forceCloseParticipantTracks` closes `${userId}-audio|video` on leave (client beacon is best-effort).
- Added `live-session-participants.sfuSessionId` (+ migration column) for ownership binding.

**Phase 3 carry-forward (for Phase 4 wiring):**
- `SfuClient.publish(stream, publisherUserId)` — the caller MUST pass the authed user id (server closes by that convention).
- No consumer yet drives connect→publish→pull; the pull/ontrack path is verified statically, not live.

**Done — Phase 4 Ably realtime wiring (audited ×3):**
- `_live/rtc/realtime-room.ts` — Ably Realtime (authCallback → /api/live/ably-token) + presence as the roster/track-discovery source, wired to the SFU: publishes local (publish-on-ready so a late camera grant still publishes; `replaceTracks` on device switch), pulls remote publishers' tracks (coalesced reconcile, retry-capped), cleans up leavers.
- `_live/rtc/use-realtime-room.ts` — React lifecycle hook (join/leave, streams, connection state, publish-on-ready effect).
- `experience.tsx` — real mode when `caps.ready && realtime` (roster from presence, remote video from SFU, chat/reactions/hands/mic-cam over Ably; mock simulation gated off); Demo fallback otherwise. Moderation routes over the host-only control channel.
- `page.tsx` resolves the real user + live session and passes `realtime` (falls back to mock preview).
- Chat deduped by message id; connection-state indicator in the top bar.

**Phase 4 carry-forward (Phase 5+):**
- **Whiteboard sync is a documented dead wire** — transport (`sendWhiteboard`/`onWhiteboard` + Ably channel) exists but board ops aren't wired to it yet (local-only).
- `promote` control has no receiver yet (host-local UI only until Phase 5 stage-promotion).
- `removeOne` only broadcasts a control message — a removed client can ignore it; needs the Phase-5 server `/remove` route (set `removed` + force-close SFU tracks).

**Done — Phase 5 moderation + stage promotion + whiteboard sync (audited ×3):**
- `/api/live/moderate` (host-only): remove (sets `removed` + force-closes SFU tracks + revokes Ably token), promote/demote (participant `role`).
- **Kick actually sticks:** `resolveSessionAccess` now refuses a `removed` participant everywhere (token reissue, RTC, moderate) — one participant-row read also serves stage status.
- **Broadcast model:** students are viewers until the host promotes them; `participant.role` is the authoritative, race-free stage flag (media publish gated in `/api/live/rtc`). Promote awaits the authoritative write before signalling; client retries publish on lag.
- Demote tears down the peer's tile (reconcile track-removal) and `unpublish()`es cleanly so re-promote doesn't reuse a trackName.
- Whiteboard sync over Ably: stroke ops + presentation (show/active/create/writable), `rewind:100` for late joiners.
- `revokeAblyTokens` helper.

**Phase 5 carry-forward:**
- Whiteboard `writable` is client-trust only (any non-observer can publish whiteboard ops); needs server-authorized ops or per-toggle token re-mint.
- Whiteboard durability beyond the rewind window needs a server snapshot store.
- Promote-before-join is a fail-closed no-op (student must join first).
- Ably token revocation needs "Revocable tokens" enabled on the key.

**Done — Phase 6 real billing heartbeat + sweep cron (audited ×3):**
- `/api/live/heartbeat` (host-only): the tutor client posts every ~20s in real mode → charges elapsed minutes, bumps `lastHeartbeatAt`, auto-ends on zero credits. Replaces the demo credit simulation.
- `/api/cron/live-sweep` (CRON_SECRET Bearer): ends abandoned sessions (stale heartbeat / age ceiling) — settles billing, closes logs, revokes Ably tokens, force-closes SFU. Point a free scheduler (Upstash QStash / cron-job.org / Vercel Cron) at it every ~2-3 min.
- `src/lib/live/lifecycle.ts` — shared `settleBilling` + `endLiveSession`.
- Added `live-sessions.lastHeartbeatAt` (+ migration column). `.env` placeholders for optional Upstash (durable rate-limit / QStash).

**Done — cross-cutting hardening (audited ×3):**
- 🔴 **Money bug fixed:** `chargeSessionDelta` was an absolute wallet write (double-spend / lost-update across concurrent polls & two-classes-one-wallet). Now ONE atomic CTE — per-session claim (`coins_consumed IS NOT DISTINCT FROM prev`) + relative `GREATEST(0, credit_balance - charge)` decrement gated on the winning claim; charge derived from live rows; never negative; no crash-gap.
- Ably token TTL 1h → **5min** (stale/removed/ended tokens die fast; re-auth then refuses).
- `runtime='nodejs'` pinned on the 8 live-sessions routes (were unpinned).
- Chat POST rejected on a non-live session.

**Deferred backlog (documented, lower-severity):** Upstash-backed rate limiter (env placeholders added; in-memory fallback stands); whiteboard `writable` server-enforcement + snapshot durability; substitute/co-tutor host allowlist; revoke Ably tokens in the manual `/end` route (cron + heartbeat auto-end already do); defensive `toIntId` on join's classId; unify chat/status inline auth onto `resolveSessionAccess`.

**Done — Phase 7 deep audit & hardening (audited ×3):** ran 4 parallel deep audits (billing/money, realtime/SFU/access security, client RTC/whiteboard/chat, data-model/migrations) across the whole live surface, then verified the fixes with two further adversarial passes. tsc clean; VideoSDK 100% gone (one doc comment only). Fixes landed:
- 🔴 **Ghost-log over-billing (HIGH):** a student who dropped without a `/leave` beacon left an open participant log that every tutor heartbeat kept billing (up to the 6h cap). The tutor heartbeat now carries the Ably presence roster it already observes; `/api/live/heartbeat` checks out open logs for users no longer present (45s join-grace, tutor protected, non-empty-roster guarded) — ghost minutes stop accruing.
- 🔴 **Track-name impersonation (HIGH):** `/api/live/rtc` publish path now rejects local tracks whose `trackName` isn't prefixed with the caller's own user id (a publisher could otherwise name a track `${victim}-video` and dodge kick/demote teardown).
- **Own-chat mislabel (HIGH):** in real mode the mock local identity is reconciled to the real user (id/name/type/role), so the user's own messages render as "You" and reactions/roster key correctly.
- **Whiteboard double-draw + rejoin-blank:** own live op echoes are deduped by op-id (not by sender), which stops the drawer seeing every stroke twice AND still repaints their own board from Ably rewind on rejoin.
- **Whiteboard writable now server-enforced:** Ably token scopes `:whiteboard` publish to `isHost || whiteboardWritable`; `toggleWritable` persists to the DB (partial-update route) then broadcasts + re-auths students, reverting the UI if the write fails. (Was client-trust only — any student could draw with the toggle off.)
- **Media auto-recovery:** `SfuClient` reports PeerConnection state (ICE-restart on `disconnected`); the room rebuilds the SFU session on terminal `failed` (bounded 4 consecutive / 15 lifetime, backoff, re-publishes the live stream) so a network blip no longer kills video permanently while Ably reconnects.
- **Mount/unmount leak:** `RealtimeRoom.join()` bails + tears down if unmounted mid-connect (no orphaned Ably connection / SFU session).
- **Lost final settle:** `endStaleSession` (duplicate/abandoned session healing in `/start`) now settles billing before ending, matching the cron's settle-then-close ordering.
- **Moderation hardening:** promote requires the target to have joined (no silent stage/role desync); `stagePublishers` writes coerced through `toIntId` (Postgres string-id guard).
- **TURN TTL** 1h → 10min (bounds unrevocable relay creds to ~the data-plane re-auth cadence).

**Remaining documented backlog (lower severity, unchanged):** per-instance/fail-open rate limiter → back with Upstash/Redis for real cost control; whiteboard snapshot durability beyond the `rewind:100` window (server snapshot store) + persist `showWhiteboard`/`activeWhiteboard`; unused DB fields (`raisedHands`, participant `handRaisedAt`, message `reactions`/`replyTo`) — either wire persistence or trim; heartbeat reconcile can under-bill a present student if the tutor's own presence view transiently drops them (customer-safe); `wbLocalOpIds`/`appliedRef` dedup sets grow for the session lifetime (negligible); rare duplicate `transactions` ledger row on a same-millisecond `/end`-vs-autoclose race (money debit itself is safe).

**Not yet started:** Phase 7 load-shape test (1 publisher + ~100 viewers). **Real E2E for Phases 3-6 needs the Cloudflare Realtime + Ably keys in `.env`.**

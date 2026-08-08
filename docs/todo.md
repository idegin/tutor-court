What the issue is

  This is 100% the media (WebRTC/SFU) layer — not the data plane. Proof from your three images: presence works (both tiles show), chat works, and
  Mercy sees her own camera (that's just local getUserMedia, not proof of publish). But on Emeka's end Mercy's tile is the "camera-on, no-stream" 
  placeholder — his browser never pulled her video track from Cloudflare's SFU, and audio is dead both ways.

  Data plane fine + media dead = TURN/ICE, ~90% of the time — and it fits perfectly here: one side is on a Nigerian mobile/ISP network with
  restrictive NAT, where a TURN relay is mandatory for WebRTC to connect. Ably (Mercy↔chat) runs over plain WSS so it works; Cloudflare SFU media
  needs UDP/TURN, so it fails.
● Pushed (3abd070). Here's the full diagnosis and plan.

  What the issue is

  This is 100% the media (WebRTC/SFU) layer — not the data plane. Proof from your three images: presence works (both tiles show), chat works, and
  Mercy sees her own camera (that's just local getUserMedia, not proof of publish). But on Emeka's end Mercy's tile is the "camera-on, no-stream"
  placeholder — his browser never pulled her video track from Cloudflare's SFU, and audio is dead both ways.

  Data plane fine + media dead = TURN/ICE, ~90% of the time — and it fits perfectly here: one side is on a Nigerian mobile/ISP network with
  restrictive NAT, where a TURN relay is mandatory for WebRTC to connect. Ably (Mercy↔chat) runs over plain WSS so it works; Cloudflare SFU media
  needs UDP/TURN, so it fails.

  Do we need another service?

  Not yet. Cloudflare SFU is fine; you just need working TURN (which Cloudflare also provides). Switching to LiveKit/Daily/Agora would only help if
  TURN is confirmed working and media still fails — and they'd need the same relay anyway. Don't switch until we've ruled out TURN.

  Confirm it in one look (after 3abd070 deploys)

  The ?debug=1 panel now shows the media layer. Open the class with ?debug=1 and read these four rows:
  - Media (SFU) state — connected? or stuck connecting/failed?
  - Remote streams pulled — 0 while 2 people are present = pull broken.
  - TURN reachable — must be true.
  - If it shows "ICE degraded → set TURN", that's the answer.

  (Or hit demo.tutorcourt.com/api/live/diagnostics?sessionId=X for the raw JSON.)

  Plan by outcome

  1. TURN reachable = false / ICE degraded (my bet) → CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN are missing/invalid on the deploy (they work
  locally — I tested them). Set them in Vercel, redeploy. Media connects. Done.
  2. TURN reachable = true but Media state ≠ connected / streams = 0 → the SFU publish/pull negotiation is failing (code). I'll dig into the
  offer/answer + track-pull path.
  3. Media connected + streams > 0 but no video → track attach/render bug; I'll fix the tile.

  Send me those four debug values (or the diagnostics JSON) once it deploys — that tells us exactly which branch we're in. I'm confident it's #1.
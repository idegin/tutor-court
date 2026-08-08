# Escrow Engagement Flow — Recommended UX, Current Gaps & Service Needs

_Author: engineering analysis · Date: 2026-08-08_

This document covers three things you asked for:

1. The **recommended end-to-end user flow** for parent, student, and tutor.
2. The **current gaps, limitations, and bugs** blocking that flow.
3. **What's missing** and whether we need any service beyond what's already in `.env`.

It is grounded in the actual code: `src/lib/escrow.ts`, `src/collections/{Bookings,Classes,LiveSessions,Disputes,Transactions,Wallets,PayoutRequests}.ts`, the booking/payment/dispute/cron API routes, and the dashboard components.

---

## Update — 2026-08-08 (implemented)

Items **#1 (wire the crons)** and **#2 (split tutor-completion from parent-release)** from §7 are now built:

- **Crons wired:** `CRON_SECRET` added; `vercel.json` schedules the daily escrow release; `scripts/setup-qstash-schedules.ts` (`pnpm setup:crons`) registers both jobs on QStash (idempotent via `Upstash-Schedule-Id`, forwards the bearer token). Auto-release + abandoned-session sweep can now actually run.
- **Release model flipped:** the tutor's "complete" now marks the engagement **delivered** → booking status `awaiting_release` (new status + `awaitingReleaseAt` column + migration), and **notifies the booker** (in-app + email). The **booker** releases via a new `action=release` (or the cron auto-releases after a **3-day grace**, only if ≥1 session actually ran). Per-session drip is suppressed once delivered so the tutor can't self-release. Money accounting nets exactly to `price` (verified across 3 audit rounds).
- Money-event emails added for deliver + release (partial progress on §4.4).

Still open from the list below: §4.4 (remaining money-event emails), §4.5 (USD gateway), §4.6/§4.6b (automated payouts + bank-detail collection), §4.7–§4.11, §5, and the pre-existing wallet-update concurrency race (see §7 "next").

## Update 2 — 2026-08-08 (implemented)

Follow-up hardening + payout automation (NGN):

- **Wallet-update race fixed (§7 "next" #1):** every wallet mutation in `src/lib/escrow.ts` is now an atomic relative-SQL statement bound to the enclosing Payload transaction (`moveEscrowToTutorAtomic`, `unlockEscrowAtomic`, `reserveLockedAtomic`, `debitWalletAtomic`, `creditWalletAtomic`, `spendBalanceForCreditsAtomic`) with `LEAST/GREATEST` clamps — no more read-then-write lost-update / money-creation window. Applied across escrow payouts, refunds, holds, withdrawals, buy-credits, and Paystack funding. Backstopped by DB `CHECK (… >= 0)` constraints on wallets. Also fixed the refund ledger overstatement (records the actual remaining, not full price).
- **Money-event emails (§4.4):** added for payment held (tutor), refund (booker), dispute opened/resolved (both), auto-release (both), and withdrawal paid/failed (tutor) via a shared `emailUserById` helper. The "booking funded" notify+email is now centralized in `holdBookingEscrow` so **all** funding sources (wallet + Paystack) notify.
- **Paystack Transfers + tutor bank details (§4.6/§4.6b):** tutors save a verified bank account (Paystack Resolve Account → Transfer Recipient) in a Payout Settings dialog; withdrawals disburse to the saved recipient. Disbursement is **decoupled** from the approval DB transaction — approval persists intent, a `process-payouts` cron sends the idempotent transfer and reconciles via the transfer webhook, and failures auto-reverse the wallet. USD gateway (§4.5) intentionally deferred — NGN only.

Still open: automated-payout live testing, admin ops UI (§5), USD gateway (§4.5), platform fee/split (§4.11), and the migrations/QStash smoke-test before deploy.

## 0. TL;DR

The escrow **engine** is genuinely solid — atomic, idempotent, dispute-aware, with per-session drip payout and a completion sweep. But the **engagement contract you described** ("parent pays → we hold → tutor finishes → **parent is prompted to release** → if parent goes silent, tutor can escalate") is **not** the flow that's implemented. Today:

- **The tutor unilaterally releases the entire escrow to themselves** by clicking "Complete & release payout." The parent has no confirm/release step. This inverts the escrow protection.
- **The auto-release safety net does not run** — both cron routes require `CRON_SECRET`, which is **not configured** in `.env`, and nothing schedules them. So money can silently sit locked forever, and abandoned live sessions never get swept/settled.
- There is **no "release funds" action for the parent** anywhere in the UI or API.

Fix those three and the model you described works. No new third-party service is strictly required — everything needed is already in `.env` (Paystack, QStash, ZeptoMail). Details below.

---

## 1. Recommended End-to-End User Flow

### 1.1 Roles at a glance

| Role | Pays? | Attends? | Gets paid? | Key power |
|------|-------|----------|------------|-----------|
| **Parent** | ✅ funds escrow | ❌ | ❌ | Confirms work & **releases** escrow; raises disputes |
| **Student** (incl. managed child) | ❌ | ✅ joins class | ❌ | Attends, learns |
| **Tutor** | ❌ | ✅ teaches | ✅ receives escrow | Accepts booking, teaches, marks work done, withdraws |

> A student booking for themselves (adult learner) plays both the "parent" (payer/releaser) and "student" (attendee) role.

### 1.2 The happy path (recommended)

```
      PARENT / STUDENT                    TUTOR                       PLATFORM (escrow)
 ─────────────────────────────────────────────────────────────────────────────────────
 1. Find tutor, click "Book"
    pick subjects, schedule, msg  ──▶  new_booking request        booking: pending / unpaid
                                        (email + in-app)
 2.                                 3. Accept (or Decline)          booking: confirmed
                                        (booker notified)
 4. Pay (wallet or Paystack)                                        HOLD funds in escrow
                                                                    booking: confirmed / held
                                                                    → class auto-materialized
 5. Attend sessions  ◀───────────▶  Teach live sessions            per-session drip payout
    (student joins classroom)         (mark attendance)            releases each session's
                                                                    share to tutor on end
 6.                                 7. Mark "Work delivered"        booking: awaiting_release
                                        (NOT an instant payout)     (remaining escrow still held)
 8. Prompted: "Confirm & release"                                  RELEASE remainder to tutor
    → Release  OR  Raise dispute                                   booking: completed / paid
 9. (if silent N days) ──────────────────────────────────────────▶ AUTO-release remainder
                                                                    booking: completed / paid
10. Leave a review              11. Withdraw earnings to bank       payout-request → admin pays
```

### 1.3 Step detail

1. **Booking request** — Parent/student books from the tutor profile: subjects, date range, days-of-week, hours/day, message. Price is computed server-side (`computeBookingPrice`). Tutor gets `new_booking` (email + in-app). _[implemented]_
2. **Tutor accepts / declines** — `pending → confirmed` or `cancelled`. Booker notified. _[implemented]_
3. **Payment → escrow hold** — Booker pays from wallet or via Paystack. Funds move into `wallet.lockedBalance` (`paymentStatus: held`), and the class is auto-materialized from the booking. _[implemented]_
4. **Delivery** — Students join the classroom; tutor runs live sessions and marks attendance. As **each** session ends, that session's fair share drips from booker → tutor automatically. _[implemented — see §3]_
5. **Tutor marks work delivered** — Should flip the booking to an **`awaiting_release`** state and **notify the parent** — it should **not** immediately hand the tutor the rest of the money. _[GAP — today it pays out instantly, see §4.1]_
6. **Parent confirms & releases** — Parent is prompted ("Your tutor marked the engagement complete — release the held funds?"). Parent either **releases** (remainder → tutor) or **raises a dispute**. _[GAP — no parent release action exists, see §4.2]_
7. **Auto-release fallback** — If the parent neither releases nor disputes within a grace window (e.g. 3–7 days after the tutor marks done, or after `endDate`), the platform auto-releases so tutors aren't left hanging. _[GAP — cron exists but is not runnable, see §4.3]_
8. **Dispute path** — At any point while funds are `held`, the parent can dispute (no_show / quality / scheduling / other). Escrow freezes; an admin resolves as refund-to-booker or release-to-tutor. _[implemented, admin-only UI, see §3 / §5]_
9. **Review** — After completion the booker can review the tutor. _[implemented]_
10. **Tutor withdrawal** — Tutor requests a bank payout; admin approves and the debit + payout transaction are booked. _[implemented, manual approval, see §4.6]_

---

## 2. Payment / Escrow Domain Model (as built)

**Wallet accounting** (`Wallets.ts`): `balance` = total; `lockedBalance` = reserved for escrow/withdrawals; **spendable = balance − lockedBalance**; `creditBalance` = live-session minute credits (separate system).

**Booking state machine** (`Bookings.ts`):
- `status`: `pending → confirmed → in_progress → completed` (or `cancelled` / `refunded`)
- `paymentStatus`: `unpaid → held → paid` (or `refunded` / `failed`)

**Transactions** (`Transactions.ts`): append-only audit log; every money move has a **unique `reference`** → full idempotency. Types: `deposit`, `payment`, `refund`, `payout`, `credit_grant`, `adjustment`.

**Escrow primitives** (`src/lib/escrow.ts`), all atomic + idempotent:
| Function | Purpose | Trigger today |
|----------|---------|---------------|
| `holdBookingEscrow` | Reserve funds (wallet or Paystack) | `POST /bookings/[id]/pay`, Paystack verify + webhook |
| `payoutSessionEscrow` | Drip one session's share booker→tutor | `POST /live-sessions/[id]/end` ✅ (verified wired) |
| `releaseRemainingEscrowToTutor` | Release all remaining to tutor | tutor "complete", cron, dispute-release |
| `releaseBookingEscrow` | Refund remainder to booker | booker cancel, dispute-refund |
| `hasOpenDispute` | Freeze guard | checked before any payout |

---

## 3. What's Actually Implemented (works today)

- ✅ **Booking lifecycle**: create → accept/decline → cancel, with server-side pricing and access control.
- ✅ **Escrow hold** from **both** wallet balance and fresh Paystack payment; idempotent; class auto-materializes on hold.
- ✅ **Paystack** initialize / verify / webhook (HMAC-verified) all route into escrow or wallet top-up.
- ✅ **Per-session drip payout** — verified wired at `live-sessions/[id]/end/route.ts:245`; equal per-session share, exact remainder on last session, hard ceiling against over-release, frozen during disputes.
- ✅ **Refund-on-cancel** back to booker's wallet.
- ✅ **Disputes**: booker opens while `held`; admin resolves refund/release; money moves atomically with the status change and **rolls back** if the transfer fails; both parties notified.
- ✅ **Tutor withdrawals**: reserve → admin approve → debit + payout txn (or reject → release reservation).
- ✅ **Wallet UI**: parent funds wallet + buys credits; tutor funds/withdraws.
- ✅ **Notifications (in-app)** for booking created/accepted/declined/cancelled/completed, payment received, dispute opened/resolved.

---

## 4. Gaps, Limitations & Bugs

Ordered by severity. Each item notes the file(s) involved.

### 🔴 4.1 Tutor can self-release the entire escrow (design inversion) — CRITICAL
`PATCH /bookings/[id]?action=complete` is **tutor-only** and immediately calls `releaseRemainingEscrowToTutor()` (`src/app/api/private/bookings/[id]/route.ts:66-102`). So the person being paid decides when to pay themselves. This defeats the "parent releases" model you described and is the biggest trust hole.
- **Recommended:** `action=complete` (tutor) should set a new booking `status: awaiting_release` and notify the parent — **not** move money. Add a **parent** release action (§4.2) plus an auto-release fallback (§4.3).

### 🔴 4.2 No parent "release funds" action anywhere — CRITICAL (missing feature)
There is no API endpoint and no UI button for the parent/booker to release escrow. The parent UI only shows a passive "Paid · in escrow" badge (`src/components/bookings/my-bookings-list.tsx`). This is the single most important missing piece of the flow you described.
- **Recommended:** add `PATCH /bookings/[id]?action=release` (booker-only, requires `paymentStatus: held`, blocked by open dispute) → calls `releaseRemainingEscrowToTutor()`. Surface a "Confirm & release payment" button on the parent/student bookings card, shown once the tutor marks work delivered.

### 🔴 4.3 Auto-release + abandoned-session sweep don't actually run — CRITICAL (broken config)
Both cron routes require `CRON_SECRET` (`src/app/api/cron/complete-engagements/route.ts:21-29`, `.../live-sweep/route.ts`), but **`CRON_SECRET` is not in `.env`** — the handler returns `500 "CRON_SECRET is not configured"`. Nothing schedules these routes either. Consequences:
- **`complete-engagements`** never runs → if a tutor never marks complete (and now, per §4.1 fix, if the parent never releases), escrow stays **locked forever**.
- **`live-sweep`** never runs → a live session whose tutor tab died never flips to `ended`, so its **per-session drip payout never fires** and the room never closes.
- **Recommended:** add `CRON_SECRET` to `.env`; schedule both routes with **QStash** (token already present — see §6) or Vercel Cron. Daily for `complete-engagements`, every 2–3 min for `live-sweep`.

### 🟠 4.4 Money-moving events don't send email — IMPORTANT
`sendEmail` fires only from the booking routes (create/accept/decline/cancel/complete). **No email** on: payment received, dispute opened, dispute resolved, escrow released, or payout paid (in-app notification only). For a payments product these are exactly the moments users expect an email receipt/alert. ZeptoMail is already configured.
- **Recommended:** add emails on payment-received, release, refund, dispute open/resolve, and payout paid.

#### Email trigger matrix (current vs. recommended)
| Event | Recipient | Email today? | Recommended |
|-------|-----------|--------------|-------------|
| Booking requested | Tutor | ✅ | keep |
| Booking accepted / declined | Booker | ✅ | keep |
| Booking cancelled | Tutor | ✅ | keep |
| Tutor marks complete | Booker | ✅ | keep (as "confirm & release" prompt) |
| **Payment held (escrow funded)** | Tutor | ❌ in-app only | **add** (receipt) |
| **Per-session / final payout to tutor** | Tutor | ❌ | **add** |
| **Escrow released / refunded** | Booker | ❌ | **add** (receipt) |
| **Dispute opened** | Tutor (+ admin) | ❌ | **add** |
| **Dispute resolved** | Both | ❌ | **add** |
| **Auto-release fired** | Both | ❌ | **add** |
| **Withdrawal paid** | Tutor | ❌ | **add** |

### 🟠 4.5 Paystack is NGN-only, but the model claims USD support — IMPORTANT
Wallets/transactions carry `ngn|usd`, and the product supports both currencies, but Paystack initialization is effectively NGN-only. A USD booking cannot be funded via the gateway.
- **Recommended:** either scope USD to wallet-only for now and hide gateway USD, or add a USD-capable rail (see §6). Don't let a USD booking reach a dead-end pay button.

### 🟠 4.6 Tutor payout is fully manual — IMPORTANT (operational)
Withdrawals are reserved on request and only leave the wallet when an **admin** flips the `payout-requests` status in the Payload admin (`PayoutRequests.ts`). There's no bank transfer automation and no frontend admin queue. Fine for low volume; a bottleneck as you scale.
- **Recommended:** integrate **Paystack Transfers/Transfer Recipients** to disburse to the tutor's bank on approval (still admin-gated, but automated execution).

### 🟠 4.6b Tutor bank details are re-typed per withdrawal, unverified — IMPORTANT
The tutor enters `bankName/accountNumber/accountName` fresh on every withdrawal (`withdrawals` route → `PayoutRequests.ts`); nothing validates that the account exists or that the name matches.
- **Recommended:** add a **"Payout settings"** section on the tutor dashboard that (a) resolves the account via Paystack **Resolve Account** (`GET /bank/resolve`) to confirm the real account name, and (b) creates a Paystack **Transfer Recipient**, storing the `recipient_code` on the tutor profile. Withdrawals then reference the saved recipient instead of re-typing. This is a **prerequisite** for automated payouts (§4.6) and better UX even for manual ones.

### 🟠 4.6c Mid-engagement cancellation — behavior, ledger bug, missing policy — IMPORTANT
A booker can cancel while `pending`/`confirmed`; because `in_progress` is never set (§4.9), cancel is effectively allowed **throughout** the engagement. On cancel (`releaseBookingEscrow`, `escrow.ts:320-414`):
- Sessions already ended were **already dripped to the tutor** (per-session payout); only the **remaining un-dripped escrow is unlocked back to the booker**. Net wallet math is correct — tutor keeps delivered-session pay, booker refunded the rest.
- 🐛 **Ledger bug:** the refund transaction records `amount: price` (the **full** booking price) even when only the remainder was refunded (`escrow.ts:385`). Wallet balances stay correct, but the transaction log overstates the refund — breaks reconciliation/reporting. Fix: record the actual amount unlocked (`min(price, lockedBalance)` after prior drips).
- ⚠️ **No cancellation policy:** no notice window, no penalty, no "last session already scheduled" guard. A booker can cancel at any time with zero cost beyond delivered sessions. Decide the business policy (e.g. non-refundable window before a session) and enforce it.

### 🟡 4.7 Paid-but-never-taught bookings have no resolution path — MODERATE
`complete-engagements` deliberately **skips** bookings with zero ended sessions (no-show guard) — correct, so a no-show tutor isn't auto-paid. But nothing then prompts the parent to dispute or auto-refunds. The money can sit `held` indefinitely with no nudge.
- **Recommended:** if `endDate` passed with 0 sessions, notify the parent to dispute/refund, and auto-refund after a grace window.

### 🟡 4.8 Double-charge risk: escrow + per-minute credits — MODERATE (verify)
`chargeSessionDelta()` skips credit billing when the class's booking is escrow-`held` (`src/lib/live-billing.ts`). The guard reads the booking's `paymentStatus` live; if that read is stale or the relationship isn't populated, an escrow-funded session could also burn tutor credits. Worth a targeted test.

### 🟡 4.9 `in_progress` status is never set — MINOR (cosmetic/state hygiene)
Booking `status: in_progress` exists but nothing transitions into it; bookings jump `confirmed → completed`. UI/filters that expect `in_progress` will always be empty. Either set it when the first session starts or drop it.

### 🟡 4.10 Refunds only return to wallet, never to card — MINOR (policy)
Refunds credit the platform wallet, not the original Paystack card. Acceptable, but must be a stated policy; some users will expect card refunds.

### 🟡 4.11 No withdrawal KYC / limits, no split/platform fee — MINOR (business)
100% of escrow goes to the tutor — there's no platform commission split, and withdrawals have no KYC or velocity limits. If the business model takes a cut, that split needs to be built into `releaseRemainingEscrowToTutor`/`payoutSessionEscrow`.

---

## 5. Admin tooling gap

Dispute resolution and payout approval **only exist in the Payload admin console** via collection `afterChange` hooks — there's no purpose-built ops UI. Functional, but every dispute/payout requires an admin in the CMS. Consider a lightweight admin queue as volume grows.

---

## 6. Services: what we have vs. what we need

### Already in `.env` — sufficient for the core flow
| Service | Used for | Status |
|---------|----------|--------|
| **Paystack** (`PAYSTACK_*`) | Payments in, webhook, escrow funding | ✅ working (NGN) |
| **QStash** (`QSTASH_TOKEN`) | Scheduling the cron routes | ⚠️ present but **not wired** — this is what should drive §4.3 |
| **ZeptoMail** (`ZEPTO_MAIL_*`) | Transactional email | ✅ used for booking events; ⚠️ not used for money events (§4.4) |
| **Upstash Redis** | Caching / rate-limit / idempotency helpers | present |
| **VideoSDK / Cloudflare Realtime+TURN / Ably** | Live classroom, signalling | ✅ live-class stack |
| **Tigris** | Media/object storage | ✅ |

### Config/wiring needed (no new vendor)
1. **Add `CRON_SECRET`** to `.env` and **schedule both cron routes via QStash** (token already present). This alone fixes the auto-release safety net and abandoned-session sweep (§4.3). QStash can call the routes with the Bearer secret on a schedule — no new service required.
2. **Turn on money-event emails** through the existing ZeptoMail integration (§4.4).

### Only needed if the business requires it (new capability)
- **Automated bank payouts** → **Paystack Transfers** (same vendor, extra API + a transfers balance/approval). Prereq: a **"Payout settings"** section collecting + verifying tutor bank details via Paystack **Resolve Account** and **Transfer Recipient** APIs (§4.6b). Removes the manual disbursement step in §4.6. _Recommended but not blocking._
- **USD collection** → if USD bookings must be funded by card, you need a USD-capable processor (e.g. **Stripe**), since Paystack settlement is NGN-oriented (§4.5). _Only if USD gateway payments are a real requirement; otherwise keep USD wallet-only._

**Bottom line:** to make the flow you described work, you do **not** need a new third-party service — you need to (a) split "tutor marks done" from "funds released," (b) add a parent release action, and (c) wire the existing QStash + a `CRON_SECRET` to run the auto-release/sweep crons. Automated payouts (Paystack Transfers) and a USD rail (Stripe) are optional, business-driven add-ons.

---

## 7. Suggested build order

1. **Wire the crons** (add `CRON_SECRET`, schedule via QStash) — restores auto-release + session sweep. _Small, high impact._
2. **Split completion from release**: tutor `complete` → `awaiting_release` + parent notification; add parent `action=release`; add auto-release grace window in `complete-engagements`. _Core of the requested flow._
3. **Money-event emails** via ZeptoMail. _Trust/receipts._
4. **No-show handling** (§4.7) + verify no double-charge (§4.8).
5. **Automated payouts** (Paystack Transfers) and **admin ops queue** (§4.6, §5). _Scale._
6. **USD gateway decision** (§4.5) and **platform fee/split** (§4.11) — business calls.

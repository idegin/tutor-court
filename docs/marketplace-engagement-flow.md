# TutorCourt — Marketplace Engagement Flow (Booking → Payment → Live Class → After)

**Status:** Proposal / gap analysis
**Date:** 2026-07-06
**Scope:** The parent/student side of the product — discovering a tutor, booking them, paying, running the live classes, and closing out the engagement. This is the "on-demand marketplace" path, which is **partially built and currently broken end-to-end**.

---

## 1. Why this document exists

The PRD (`docs/PRD/*`) is written almost entirely around the **SaaS model**: a tutor who *already has* students subscribes to TutorCourt, invites those parents/students, and runs classes. In that model the parent never pays TutorCourt — the tutor does, via subscription. The PRD explicitly **defers** the marketplace booking + parent payment path (see `build-scope.md` §5 "Can wait": *"in-platform parent payment processing"*, and `user-flow.md` Flow E: *"future parent marketplace path"*).

But the **codebase has already started building the marketplace path** — and it's the one the user is asking about:

- `Bookings` collection with escrow-style `paymentStatus` (`held`, `paid`, `refunded`)
- `Wallets` with `balance`, `lockedBalance` (escrow), and `creditBalance`
- `Transactions` with `deposit / payment / refund / payout` types
- Paystack integration (`/api/payments/paystack/*`), buy-coins, buy-credits
- Tutor search + public tutor profiles (`/tutors/[slug]`)
- A booking request endpoint (`/api/private/bookings`)
- A working live classroom (VideoSDK) driven by `Classes` + `LiveSessions`

The problem: **these pieces are not wired into a single flow.** The booking request is a dead end, payment is disconnected from bookings, and the live class is disconnected from bookings. That is why "the flow isn't complete" — it literally is not, in code.

This document maps what exists, names every missing link, proposes one coherent end-to-end flow, and breaks the work into phases.

---

## 2. What actually exists today (grounded in code)

| Capability | Status | Evidence |
|---|---|---|
| Discover tutors (search, filters) | ✅ Exists | `components/search`, `/tutors`, `/(site)/search` |
| Public tutor profile | ✅ Exists | `/(site)/tutors/[slug]/page.tsx` |
| Create a booking **request** | ⚠️ Partial | `POST /api/private/bookings` — creates `status: pending`, emails tutor, **stops there** |
| Tutor accepts / declines booking | ❌ Missing | No update/confirm endpoint exists for bookings |
| Pay for a booking (escrow hold) | ❌ Missing | `paymentStatus: 'held'` & `wallet.lockedBalance` are **defined but referenced nowhere** in app code |
| Wallet top-up (Paystack) | ✅ Exists | `/api/payments/paystack/{initialize,verify,webhook}`, `buy-coins`, `buy-credits` |
| Booking → creates a Class | ❌ Missing | `Bookings` has **no relationship to `classes`**; nothing generates a class from a booking |
| Scheduled live sessions | ✅ Exists (SaaS path) | `LiveSessions` requires a `class`; classes are created **only by tutors manually** |
| Live classroom (video/whiteboard/chat) | ✅ Exists | `/classroom/[classId]`, VideoSDK, whiteboards, `LiveSessionMessages` |
| Per-minute billing via credits | ✅ Exists | `LiveSessions.coinsConsumed`, `wallet.creditBalance` (incremental billing per recent commits) |
| Tutor payout / withdrawal | ❌ Missing | No payout/withdraw endpoint; tutors can only *top up* |
| Escrow release on completion | ❌ Missing | `paymentStatus: 'paid'` transition is never triggered |
| Booking completion / lifecycle transitions | ❌ Missing | Statuses exist (`confirmed/in_progress/completed/refunded`) but nothing moves them |
| Reviews after engagement | ⚠️ Partial | `Reviews` collection supports `booking` link, but nothing **prompts** a review |
| Tutor bookings dashboard | ⚠️ Stub | `components/bookings/tutor-bookings-table.tsx` renders **hardcoded mock data**, not real bookings |
| Disputes / refunds | ❌ Missing | `refunded` status exists; no flow drives it |

### The two disconnected billing models

There are **two independent money models** in the schema that were never reconciled:

1. **Booking escrow model** — parent pays a `price` up front, held in escrow (`lockedBalance` / `paymentStatus: held`), released to the tutor on completion (`paid`).
2. **Live-session credit model** — parent buys `creditBalance`, and each live minute burns credits (`coinsConsumed`), billed incrementally.

Today the live class runs on **model #2** (credits), while the booking captures a `price` under **model #1** (escrow) that is never charged, held, or released. A parent could "book and pay" and still be unable to start a class for lack of credits — or be double-charged. **This is the single most important thing to resolve** (see §6, Decision D1).

---

## 3. The missing links (root cause of "incomplete flow")

```
 Discover ──► Booking request ──► [❌ accept] ──► [❌ pay/escrow] ──► [❌ becomes a class]
    ✅               ⚠️ dead-ends                                              │
                                                                              ▼
                              Live class  ◄── [❌ scheduled from booking] ── Class
                                  ✅ (only from manually-created classes)
                                  │
                                  ▼
                          [❌ completion] ──► [❌ payout] ──► [❌ review prompt] ──► [❌ rebook]
```

Every ❌ above is a required link that does not exist. The recommended flow below fills them in.

---

## 4. Recommended end-to-end flow

Terminology: an **engagement** = one accepted, paid booking that spans a date range with a recurring weekly schedule (this matches the existing `Bookings` shape: `date`, `endDate`, `daysOfWeek`, `hoursPerDay`). An engagement contains many **sessions** (individual live classes).

### Stage 1 — Discover (✅ mostly built)
1. Parent/student browses `/tutors`, filters by subject/level, opens a tutor profile.
2. Profile shows rate, rating, reviews, availability, subjects. **Add:** a clear "Book this tutor" CTA and an availability preview.

### Stage 2 — Request a booking (⚠️ tighten)
3. Booker (student *or* parent-on-behalf-of-student) picks subjects, date range, days of week, hours/day, and an optional message.
4. System computes an **authoritative price** server-side from the tutor's `hourlyRate` (the current estimate in the route is rough — make it the source of truth and show the breakdown before submit).
5. Booking is created `status: pending`, `paymentStatus: unpaid`. Tutor is notified (email + in-app notification).

### Stage 3 — Tutor accepts / declines (❌ new)
6. Tutor sees the request in a **real** bookings dashboard (replace the mock table).
7. Tutor **accepts** → `status: confirmed`; or **declines** → `status: cancelled` (booker notified either way).
8. Optional: tutor may propose a schedule tweak (a counter-offer) before accepting. *(Can be a later phase.)*

### Stage 4 — Payment & escrow (❌ new — the core missing piece)
9. On acceptance, the booker is prompted to pay. Two supported funding sources:
   - **Wallet balance** (top up first via Paystack if short), or
   - **Direct Paystack checkout** for this booking.
10. Payment **holds funds in escrow**: create a `payment` transaction, move money into `wallet.lockedBalance`, set `booking.paymentStatus: held`, `booking.status` stays `confirmed`. Link the transaction to the booking (`relatedBooking`).
11. Only a **paid (held)** booking can generate classes. This is the gate that currently doesn't exist.

### Stage 5 — Booking becomes a schedulable Class (❌ new)
12. On `paymentStatus: held`, a hook (or the accept/pay handler) **materializes a `Class`** from the booking: subject, tutor, student(s)/parent, `startDate`/`endDate`, `schedule` derived from `daysOfWeek` + `hoursPerDay`.
13. Add a `booking` relationship to `Classes` (and/or `class` to `Bookings`) so the two are linked. **This is the bridge between the marketplace path and the existing live-class engine.**
14. The class's recurring schedule drives `LiveSessions` (either pre-generated per occurrence, or created on-demand at start time).

### Stage 6 — Run the live classes (✅ built, needs billing reconciliation)
15. At each scheduled time, tutor starts the session; student joins `/classroom/[classId]`. Video, whiteboard, chat all work today.
16. **Billing decision (D1):** either (a) burn escrow per completed session instead of the parallel credit model, or (b) keep credits for live minutes and make the booking price a *deposit/commitment* only. Pick one; do not run both silently.
17. Attendance is recorded per session (already have `Attendance`, `LiveSessionParticipants`).

### Stage 7 — Complete the engagement (❌ new)
18. Engagement completes when `endDate` passes **or** all sessions are done **or** the tutor marks it complete.
19. On completion: `booking.status: completed`, escrow **released to tutor** — move funds from `lockedBalance` to tutor `wallet.balance`, create a `payout`/`credit` transaction, set `booking.paymentStatus: paid`.
20. Trigger a **review prompt** to the booker (create pathway already exists; just needs the nudge + a "leave review" surface). Optionally let the tutor leave feedback on the student.

### Stage 8 — After the engagement (❌ new)
21. **Payout/withdrawal:** tutor requests withdrawal of `wallet.balance` to a bank account (Paystack transfer or manual admin payout). Create `payout` transactions; admin approval in early phases.
22. **Rebook / extend:** one-click "book again" from a completed engagement, prefilled from the prior booking.
23. **Disputes / refunds:** if a session didn't happen or quality was disputed, admin can refund from escrow before release (`paymentStatus: refunded`, `booking.status: refunded`, reverse transaction).
24. **Receipts & history:** both sides see transaction history (parent wallet page exists; extend with per-booking receipts).

---

## 5. Data-model changes required

Minimal, additive changes — the collections are already close.

- **`Bookings`**: add `class` relationship (the generated class); consider a `schedule` mirror or derive on the fly. Add `completedAt`, `payoutTransaction`.
- **`Classes`**: add `booking` relationship (nullable — SaaS classes won't have one). This is the key join.
- **`Wallets`**: already has `lockedBalance` — start actually using it. Consider a `pendingPayout` field.
- **`Transactions`**: already sufficient (`payment`, `refund`, `payout`, `relatedBooking`). Add a `bankAccount`/destination for payouts, or a separate `PayoutRequests` collection.
- **New (optional): `PayoutRequests`** collection — tutor withdrawal requests with admin approval state.
- **New (optional): `Disputes`** collection — or reuse the admin "support/issues" surface from the PRD.

All wallet/transaction mutations must remain **server-side only** (they already are — writes are admin/override-access only via route handlers). Every money mutation must be **idempotent** (keyed on Paystack reference / an idempotency key) and wrapped so wallet + transaction + booking update together — partial writes here cause the exact "billing race" class of bugs already noted in `docs/audits/`.

---

## 6. Open decisions (need a founder/product call before/at build)

- **D1 — One money model.** Escrow-per-booking **or** per-minute credits for live classes? (Recommend: **escrow per booking** for the marketplace path; keep credits only if a pay-as-you-go single-session product is also wanted. Running both silently is the current bug.)
- **D2 — Who pays: student or parent?** Bookings support both. Confirm whether students can self-pay or only parents fund.
- **D3 — Payment timing.** Pay in full on acceptance, or per-session/installments across the engagement?
- **D4 — Cancellation & refund policy.** Full refund before first session? Pro-rated after? No-show handling for tutor vs. student?
- **D5 — Payout mechanism.** Automated Paystack transfers vs. manual admin payouts (start manual, automate later).
- **D6 — Platform fee.** Does TutorCourt take a commission on marketplace bookings? (PRD lists "tutor commission engine" as *later*, but escrow makes it trivial to add — decide the % and whether to show it.)
- **D7 — Group classes.** MVP marketplace = 1:1 only, or also group bookings? (`classType: group` exists but pricing/seat logic isn't defined.)

---

## 7. Phased delivery plan

Each phase is independently shippable and leaves the product in a working state. Estimates are relative sizing, not calendar commitments.

### Phase 0 — Decisions & reconciliation (S)
**Goal:** unblock everything by resolving the money-model split.
- Resolve D1–D7 (at minimum D1, D2, D5).
- Write the definitive "one money model" spec.
- **No code** beyond documenting the chosen model.
- **Exit:** a signed-off billing model that the rest of the phases implement.

### Phase 1 — Real booking lifecycle (M)
**Goal:** a booking can be accepted/declined and shows up truthfully.
- Server-side authoritative pricing in the booking endpoint (show breakdown pre-submit).
- `PATCH /api/private/bookings/[id]` for accept / decline / cancel with proper access checks and status transitions (`pending → confirmed | cancelled`).
- Replace the **mock** `tutor-bookings-table` with real data; add a parent/student "my bookings" view.
- Notifications (email + in-app) on request, accept, decline.
- **Exit:** tutor accepts a request; both sides see accurate status. No money yet.

### Phase 2 — Payment & escrow (L) — *the core fix*
**Goal:** money actually moves and is held safely.
- Fund-a-booking flow: pay from wallet or Paystack checkout; top-up if short.
- Escrow hold: `payment` transaction + `wallet.lockedBalance` + `booking.paymentStatus: held`, all idempotent and atomic.
- Link transaction ↔ booking; receipts on both sides.
- Extend Paystack webhook to confirm booking payments (not just top-ups).
- **Exit:** an accepted booking can be paid; funds are visibly held in escrow; double-pay is impossible.

### Phase 3 — Booking → Class → Live sessions bridge (M)
**Goal:** a paid booking produces real, joinable classes.
- Add `Classes.booking` and `Bookings.class` relationships + migration.
- On `paymentStatus: held`, generate a `Class` (schedule derived from `daysOfWeek`/`hoursPerDay`/date range).
- Generate/schedule `LiveSessions` for each occurrence (pre-generate or on-demand).
- Surface the engagement's sessions in parent/student/tutor calendars (calendars already exist).
- **Exit:** parent books+pays → classes appear on the calendar → student joins the existing live room.

### Phase 4 — Completion, payout & reviews (L)
**Goal:** close the loop and pay the tutor.
- Completion transition (endDate reached / all sessions done / tutor marks complete) → `booking.status: completed`.
- Escrow release: `lockedBalance` → tutor `wallet.balance`, `payout`/`credit` transaction, `paymentStatus: paid`. Apply platform fee if D6 = yes.
- Payout/withdrawal request flow for tutors (manual admin approval first; Paystack transfer later).
- Review prompt to booker after completion; tutor feedback optional.
- **Exit:** finished engagement pays the tutor and requests a review; tutor can withdraw earnings.

### Phase 5 — After-care: rebook, disputes, admin (M)
**Goal:** operational completeness and trust.
- One-click rebook/extend from a completed engagement.
- Cancellation/refund handling per D4 (admin-initiated refund reverses escrow).
- Admin surfaces: bookings monitor, escrow/held funds, payout queue, dispute handling (extends the PRD admin dashboard).
- Notifications for reminders (upcoming session, engagement ending, review pending).
- **Exit:** the marketplace path is operationally supportable end-to-end.

### Phase 6 (later) — Automation & scale
- Automated Paystack payouts, automated refunds, installment billing, group-class pricing, ratings-driven ranking, tutor availability calendar with real conflict detection. (Maps to PRD "Definitely later".)

---

## 8. TL;DR

The marketplace booking-to-payment-to-live-class flow is **scaffolded but not connected**. Discovery and the live classroom both work; the booking request and payment primitives exist but dead-end. The four missing links are: **(1)** tutor accept/decline, **(2)** pay-into-escrow, **(3)** turn a paid booking into a Class that the live engine already understands, and **(4)** complete → release escrow → payout → review. Resolve the escrow-vs-credits split first (Decision D1), then build Phases 1→4 to have a working end-to-end marketplace engagement.

# Pending Issues & Recommended Plan

_Source: `docs/Test Case Master List.html` (TutorCourt MVP Testing Tracker) cross-referenced against the current codebase._
_Generated: 2026-07-06 · **Implementation pass completed: 2026-07-06**_

---

## ✅ Resolution status (2026-07-06)

All confirmed code gaps below have been implemented, type-checked (`tsc --noEmit` clean), and the DB migration applied. Summary of what shipped:

| Test case(s) | Status | What was done |
|---|---|---|
| **INV-050 / INV-052** (+ unblocks 053/058/059/060/065) | ✅ Done | Invite API now returns a shareable `inviteUrl` (`/class-invite/{token}`). Invite dialog shows a copyable link + **Copy link** and **Share on WhatsApp** buttons; every pending-invite row has a **Copy link** action. |
| **PROG-106** | ✅ Done | New `GET /api/assessments/progress` role-aware aggregation + a shared `progress-dashboard.tsx` (stat cards, score-trend chart, per-subject breakdown, results table with deep-links). New **Progress** page + nav item for tutor, student, and parent. |
| **CLASS-039 / CLASS-040** | ✅ Done | Added `DELETE /api/tutor/classes/[id]` (ownership check, blocks deletion during a live/waiting session, cascades pending invitations). Wired the dropdown **Delete** item to a confirm dialog. |
| **CLASS-044** | ✅ Done | New `DELETE /api/tutor/classes/[id]/students?studentId=` unenroll endpoint + a per-row **Remove** action with confirmation in the roster UI. |
| **QUIZ-089 / QUIZ-095 / QUIZ-097** | ✅ Done | Students can answer `short_answer`/`essay` questions; builder allows creating them without options; short-answer/essay are flagged `pendingManualGrading` at submit; new `POST /api/assessments/results/grade` + inline tutor grading UI (points + correct/incorrect + feedback) with a "Pending review" badge, then a full re-score. Added the `pendingManualGrading` field + migration. |
| **CLASS-047** | ✅ Done | Both POST (create) and PATCH (edit) validate valid dates and `endDate > startDate`; create also rejects past start dates. Calendar pickers disable past/invalid ranges + client-side guards. |
| **NOTIF-165** | ✅ Done | Sender moved off the personal `idegin.com` address to `noreply@tutorcourt.com` (env-overridable via `ZEPTO_MAIL_FROM` / `ZEPTO_MAIL_FROM_NAME`) in both the email service and the Payload auth adapter. |

### Phase 0 audit + fixes (2026-07-06)

Audited the three "verify before you build" items. Two had real, user-facing bugs (now fixed and verified in Chrome); billing was found arithmetically correct.

**Calendar (CLASS-041 / TDASH-026) — bugs fixed:**
- 🔴 Student & parent calendars queried a `hasMany` relationship with `contains` (matches nothing on Postgres) → both calendars were always empty. Changed to `equals`. _This was the direct cause of "there is no calendar view."_
- 🟠 Class `timezone` was ignored — event times used the server's local TZ via `setHours`. Now interpreted in the class timezone (new `src/lib/calendar-events.ts` with an Intl-based zoned-time helper).
- 🟡 Status→colour mapping collapsed everything non-`active` to "pending" and still rendered `cancelled` classes. Now mapped explicitly and cancelled classes are excluded.
- 🟡 No empty state — a blank grid read as "broken." Added an empty-state banner.
- Refactored three near-duplicate `generateRecurringEvents` copies into one shared, role-aware helper.
- ✅ Verified in Chrome: student & parent calendars now render the seeded class's Mon/Wed sessions at the correct times.

**Notifications tab (NOTIF-171) — bugs fixed:**
- 🔴 Root cause found & fixed earlier: `createNotification` passed stringified ids to a Postgres relationship and lacked `overrideAccess`, so **no in-app notification ever persisted**. (Then a follow-up regression where the fix over-coerced the `relatedEntity.id` text field was also fixed.)
- 🟠 Coverage gap: parent/student invite-acceptance never notified the tutor (the `parent_accepted_invite` type existed but was never emitted). Added notifications on both accept routes.
- 🟡 `notifications-list` optimistic UI ignored HTTP failures (`res.ok` unchecked) → UI desynced from the DB on 4xx/5xx. Fixed in fetch + mark-one + mark-all.
- 🟡 `markAllNotificationsRead` (service) lacked `overrideAccess` and numeric coercion. Hardened.
- 🟡 Tutor "Bookings" nav was `devOnly` (hidden in prod) while booking notifications deep-link to it. Made it visible (the feature is now real).
- ✅ Verified in Chrome: the notifications tab now renders real notifications with unread badge, type tags, View links, and mark-read.

**Per-pupil billing (SUB-142) — audited, no code change:**
- The billing **arithmetic is correct**: per-pupil summation, incremental non-re-charging delta accounting, no negative/over-draft, idempotent across reconnects/`/end`. SUB-142's actual scope passes.
- Known structural issues (documented for a dedicated hardening pass, not fixed here to avoid destabilising recently-hardened code): billing is driven only by the tutor's browser poll (no server-side tick → stops if the tab closes), the wallet write is a non-atomic read-modify-write, and a parent observing alongside their child is currently billed as a second pupil. These need a server-side billing scheduler + atomic wallet decrement and a product decision on parent-as-observer.

### Phase 1 & 2 audit + fixes (2026-07-06)

**Phase 1 (invite link, progress dashboard) — audited & fixed:** expired invites are now rejected (INV-058); the register page no longer drops the invite token; parent accept+enroll is atomic; the missing parent `inviteeType` check was added; progress excludes/labels pending-grading results. All Chrome-verified (acceptance page, expired screen, progress charts).

**Phase 2 (delete class, remove student, quiz manual-grading, sender) — audited & fixed:**
- 🔴 **Security (pre-existing):** `GET /api/assessments/questions` leaked the answer key (`isCorrect`) to any authenticated user — now stripped for non-owners. `PATCH`/`DELETE` on questions had no ownership check (any tutor could edit/delete another tutor's questions, IDOR) — ownership now enforced. _Verified: student sees no key; cross-tutor PATCH/DELETE → 403._
- 🟠 **Delete class orphaned data:** with `ON DELETE set null` FKs, deleting a class left orphaned live-sessions, whiteboards, tutor-assessments, results, attendance. Now cascades them (children-first). Also cleans scheduled/ended sessions. _Verified: deleting a class removed its 3 tutor-assessments + 5 results, 0 orphans._
- 🔴 **Removed student kept assessment access:** unenroll now deletes the student's non-completed tutor-assessments for the class, and auto-removes a now-childless parent from the class (revoking their live-room access). Returns 404 if the student wasn't enrolled. _Verified: removing the child also dropped the childless parent._
- 🟠 **Grading display:** the class-results table and the result summary showed ungraded essays as a provisional "Failed"; now show "Needs grading" / "Pending" and exclude them from pass/average stats. _Verified: essay result shows "Needs grading"; grading it rescored to 80% + passed + cleared the flag._
- 🟡 Coerced `assessmentId` in the questions POST (Postgres string-id trap); fixed the create/edit button label in the class form.

**Documented as intentional / out-of-scope (not defects):** short-answer/essay are graded manually by design (no fragile exact-match auto-grader); assessments are single-attempt by design. Live-billing structural hardening (server-side tick, atomic wallet decrement, parent-as-observer) remains a separate tracked effort.

### Marketplace Stages 1–3 audit + fixes (2026-07-06)

**Stage 1 — Discover:** completed end-to-end. Fixed 🔴 unapproved profiles/reviews leaking (profile now 404s for unapproved unless owner/admin; reviews + rating aggregation are approved-only), added keyword search + sort + mobile filter drawer + null-rate handling, added the missing **weekly-availability** model + profile preview (+ migration), `/tutors`→`/search` redirect and dead-link repointing, and a role-gated Book CTA. Build passes; Chrome-verified.

**Stage 2 — Request a booking (tighten) & Stage 3 — Accept/decline:** audited; core flow was correct. Fixes:
- 🔴 **The booking modal was silently broken** — the zod schema required a string `tutorId` but the UI passes a numeric (Postgres) id, so every real submit 400'd. Schema now accepts both. _Verified end-to-end in Chrome: modal → POST 200 → booking created → success screen._
- 🟠 Added a server-side **duplicate/spam guard** (one active booking per booker+tutor → 409); the CTA guard was UI-only before.
- 🟠 `Bookings` collection read/update access omitted the `parent` — added (was masked by `overrideAccess`).
- 🟡 Success screen was destroyed by an immediate page reload → now the "Request Sent!" step persists and refreshes on close.
- 🟡 Booking dates displayed in local time (off-by-one west of UTC) → now formatted in UTC.
- 🟡 Invalid tutorId returned 500 → now 404; misleading "no sessions" message now distinguishes a 0/null rate; client validates past start date; modal got a11y (role/aria, ESC, backdrop close); true-empty vs filtered-empty states.
- **Deferred (documented):** per-tutor USD currency (needs a data-model decision — all bookings are NGN today), pagination beyond 100 bookings, decline-reason capture, and stale-price-on-rate-change. Counter-offer is explicitly a later phase.

### Stage 4 — Payment & escrow (2026-07-06)

Built the "fund a booking into escrow" flow (`src/lib/escrow.ts`): a booker pays a confirmed booking from wallet balance or via direct Paystack checkout; funds move into `wallet.lockedBalance`, the booking flips to `paymentStatus:'held'`, and a linked `payment` transaction is recorded — atomic (Payload DB transaction) and idempotent (unique `transactions.reference`). New `POST /api/private/bookings/[id]/pay`; Paystack `initialize`/`verify`/`webhook` extended for `booking_escrow`; UI pay dialog + payment-status badges.

**Deep money-audit fixes (all verified):**
- 🔴 Fixed an inconsistent wallet accounting model — the code decremented `balance` on a wallet hold while the invariant is `available = balance − lockedBalance`, double-counting the lock. Now: wallet hold reserves (`lockedBalance += price`, balance unchanged); Paystack hold adds fresh funds (`balance += price` AND `lockedBalance += price`).
- 🔴 Cancelling a **held** booking now **releases the escrow** back to the booker (`releaseBookingEscrow`: `lockedBalance -= price`, `paymentStatus:'refunded'`, a `refund` transaction) — previously the funds were trapped.
- 🔴 A second real Paystack charge on an already-funded booking is now **credited to the wallet** (never silently dropped).
- 🟠 Escrow refuses to write non-atomically (hard error if a DB transaction can't be started); currency guard (wallet vs booking); zero-price bookings rejected.
- 🟡 The Paystack return handler is scoped to booking payments (a `tc_purpose=booking` marker) so an unrelated `?reference=` can't trigger a bad verify.

**Verified:** wallet hold keeps `balance` intact + reserves into `lockedBalance`; idempotent re-pay (no double-charge); insufficient funds → 400 + shortfall; cancel of a held booking fully refunds (both payment + refund txns recorded); Chrome-verified the pay dialog + escrow badge.

**Known limitation (documented, shared with existing wallet flows):** two concurrent holds of *different* bookings from the same wallet could over-commit under high concurrency (reads are re-done inside the transaction to narrow the window, but true serialization needs row-level locking / an atomic conditional `UPDATE`). Also deferred: escrow **release to the tutor on completion** (Stage 4/7 payout), per-tutor **USD** currency, and Paystack **refund-to-card** (refunds currently return to the wallet). D1 money-model reconciliation (escrow-per-booking vs per-minute live-class credits) still needs a founder call before wiring escrow into the live-class engine.

### Remaining follow-ups (ops / test-execution — not code gaps)
- **Deploy step:** run `pnpm migrate` in each environment to add the `pending_manual_grading` column (already applied to local dev).
- **NOTIF-165 ops:** verify `tutorcourt.com` as a sending domain in ZeptoMail so mail from `noreply@tutorcourt.com` actually delivers.
- **Phase 0 re-tests (zero code):** CLASS-041/TDASH-026 (calendar), NOTIF-171 (notifications tab), SUB-142 (per-pupil billing) — the code exists; run a verification pass on the live build.
- **Alpha stability (LIVE-085 / LIVE-087):** long-session and multi-participant test executions.

## Where we stand (tester summary)

205 test cases across 12 modules. Roll-up from the tracker's Summary sheet:

| Status | Count |
|---|---|
| Passed | 93 |
| Not Started | 62 |
| Retest Required | 14 |
| Failed | 8 |
| **Declared launch blockers** | **0** _(none yet triaged, but several Critical cases are Failed/Retest — see below)_ |

**Launch rule (from the tracker's README):** _No Critical test case should remain Failed or Retest Required before controlled public launch._ Today several Critical cases still are — those are the real gate.

---

## Reality check: 3 discrepancies between tester feedback and code

The testers were likely on an older build or hit environment/routing issues, because code exists for some things reported "missing." **Verify these on the current deployed build before spending dev time:**

1. **Calendar view (CLASS-041, TDASH-026 — "there is no calendar view").** A calendar actually exists: nav item in `dashboard/tutor/layout.tsx:59` → `dashboard/tutor/calendar/page.tsx`, rendering `components/dashboard/dashboard-calendar.tsx` (also student/parent). → Likely a build/routing regression or the tester missed the nav item. Re-test first.
2. **In-app Notifications tab (NOTIF-171 — "Notifications Tab is not functional").** The tab is wired: `dashboard/{tutor,student}/notifications/page.tsx` → `components/dashboard/notifications-list.tsx`, fetching `GET /api/notifications` + `POST /api/notifications/mark-read`, backed by `collections/Notifications.ts` and `lib/notification-service.ts`. → Could be an empty-state that _looks_ dead, or a real fetch bug. Re-test and check the network tab.
3. **Per-pupil billing (SUB-142).** Logic exists in `lib/live-billing.ts` (`computeBillableMinutes`, `chargeSessionDelta`). No written defect was recorded — this case just needs an actual verification pass, not new code.

---

## Confirmed gaps (code genuinely missing or broken)

### 🔴 Critical — launch blockers

| Test ID | Issue | Code reality |
|---|---|---|
| **INV-050** | No way to generate a shareable invite link for parent/student; only a direct email is sent. Needed as a fallback when invite emails fail to deliver. | `api/tutor/classes/invite/route.ts` mints a `crypto` token and emails a register URL, but the link is **never surfaced in the UI** to copy/share. |
| **INV-053** | Invite acceptance can't be tested — blocked by INV-050. | Acceptance flow exists (`class-invite/[token]/`, `api/{parent,student}/invitations/accept`); it's the _link surfacing_ that's missing. |
| **PROG-106** | "Can't locate the progress dashboard" — did 2 assessments, no dashboard to view scores. | Confirmed: **no unified progress dashboard route exists.** Scores are scattered across per-assessment pages only. |
| **LIVE-085** | 1-hour session stability not yet validated. | Deferred to Alpha testing — this is a test-execution task, not a code gap. |

### 🟠 High

| Test ID | Issue | Code reality |
|---|---|---|
| **CLASS-039 / CLASS-040** | Delete button does nothing; class is not deleted. | Confirmed: the "Delete" dropdown item in `classes-client.tsx:519` has **no `onClick`**, and `api/tutor/classes/[id]/route.ts` has **no `DELETE` handler**. Dead UI. |
| **CLASS-044** | Cannot remove a student from a class. | Confirmed missing. Roster UI renders students but offers no remove action; invite route's `DELETE` only cancels pending invitations, not enrolled students. |
| **QUIZ-089** | No short-answer option; selecting any non-multiple-choice type doesn't work. | 5 types are _defined_ (`collections/AssessmentQuestions.ts`) but grading (`api/assessments/results/submit/route.ts` `gradeAnswer`) only handles `single_choice`/`multiple_choice`/`true_false`. `short_answer`/`essay` fall through ungraded with no manual-review path. |
| **QUIZ-095 / QUIZ-097** | Short-answer & manual-review flows blocked. | Both depend on QUIZ-089. |
| **INV-052** | WhatsApp invite creates no link. | Same root cause as INV-050 — no shareable link is generated. |
| **INV-058 / INV-059 / INV-065** | Expired / duplicate / mobile invite cases blocked. | All marked dependent on INV-050. |
| **NOTIF-165** | Notification emails currently send from idegin's personal email. | Sender identity needs to move to a proper TutorCourt address/domain. |
| **LIVE-087** | Multi-participant session not yet validated. | Test-execution task (billing/session code exists). |

### 🟡 Medium

| Test ID | Issue | Code reality |
|---|---|---|
| **CLASS-047** | A class can be created with any date, including past dates. | Confirmed: neither the create form (`classes-client.tsx`) nor `api/tutor/classes/route.ts` POST (lines ~34–54) validates `startDate >= now` or `endDate > startDate`. |
| **INV-060** | Wrong-user invite case blocked by INV-050. | Dependent. |

---

## Recommended plan

Ordered to clear launch blockers first, then unblock the dependency chains.

### Phase 0 — Verify before you build (½ day)
- Re-test **CLASS-041/TDASH-026 (calendar)**, **NOTIF-171 (notifications tab)**, and **SUB-142 (per-pupil billing)** on the current build. If they work, mark Passed and reclaim the dev time. If not, file precise defects (screenshots + network tab).

### Phase 1 — Critical launch blockers
1. **Shareable invite link (INV-050 → unblocks INV-052/053/058/059/060/065).** Highest leverage: one fix clears 7 tracked cases.
   - Surface the existing invite token as a copyable URL in the invite UI (and a "Copy link" / WhatsApp `wa.me` share button).
   - Return the token/link from `api/tutor/classes/invite/route.ts` response so the client can display it; ensure it works for both existing and new users.
2. **Progress dashboard (PROG-106).** Add a dashboard page that aggregates `AssessmentResults` per student/class (reuse `score-chart.tsx` and the existing per-assessment pages). Link it from tutor, parent, and student dashboards.

### Phase 2 — High-value functional gaps
3. **Delete class (CLASS-039/040).** Add a `DELETE` handler to `api/tutor/classes/[id]/route.ts` (with ownership check + cascade/guard for active sessions & invitations) and wire the dropdown item + confirm dialog in `classes-client.tsx`.
4. **Remove student from class (CLASS-044).** Add an unenroll endpoint + a remove action in the roster UI (`class-details-client.tsx`), with confirmation.
5. **Quiz types (QUIZ-089/095/097).** Add `short_answer` support: expose it in the quiz builder, store `textAnswer` (already stored), and add a **manual grading / review UI** for the tutor so short-answer/essay results can be scored. This unblocks the two dependent cases.
6. **Notification sender (NOTIF-165).** Move the from-address off idegin's personal email to a TutorCourt domain sender (env/config).

### Phase 3 — Validation & polish
7. **Class date validation (CLASS-047).** Reject past `startDate` and `endDate <= startDate` on both the form (disable past dates in the picker) and the POST route.
8. **Alpha stability passes (LIVE-085, LIVE-087, SUB-142).** Run the long-session and multi-participant tests once the above are stable; confirm per-pupil billing numbers against the participant logs.

### Launch gate
Do not open controlled public launch until every **Critical** case (INV-050, INV-053, PROG-106, LIVE-085, SUB-142) is Passed and no Critical remains Failed/Retest Required — per the tracker's own rule.

---

## One-fix-clears-many (leverage note)
- **INV-050** unblocks **7** cases (INV-052/053/058/059/060/065). Do it first.
- **QUIZ-089** unblocks **2** cases (QUIZ-095/097).
- Phase 0 verification could reclaim **3** cases (CLASS-041/TDASH-026 pair + NOTIF-171 + SUB-142) with zero code.

# PRD: Tutor Approval Workflow & Admin Panel

**Status:** Draft  
**Date:** 2026-10-11  
**Scope:** Tutor post-onboarding states, approval workflow, access controls, admin management panel

---

## 1. Background & Problem Statement

After a tutor completes onboarding their profile is created with `isApproved: false` and `onboardingCompleted: true`. Currently:

- The onboarding banner disappears — there is **nothing** telling the tutor what happens next
- Tutors can immediately create classes even though they haven't been reviewed
- There is no admin interface to review and approve tutor applications; approvals would require going into the raw Payload `/admin` panel
- The tutor search page already filters `isApproved: true`, so unapproved tutors don't appear — but tutors don't know this

This PRD covers:
1. Tutor post-onboarding state banner (replace the onboarding CTA with a pending-review notice)
2. Clear access policy for what pending tutors can and cannot do
3. Admin panel — app shell decision, pages, and feature spec

---

## 2. Tutor State Machine

A tutor profile has three meaningful states from the tutor's perspective:

```
INCOMPLETE ONBOARDING
  └─► PENDING REVIEW       (onboardingCompleted=true, isApproved=false)
        └─► APPROVED        (onboardingCompleted=true, isApproved=true)
```

The current code only handles the first transition (banner disappears). We need to handle the second.

---

## 3. Tutor Dashboard Banner Spec

The existing banner at `/dashboard/tutor` should switch based on state:

### State 1 — Onboarding Incomplete (existing)
- **Color:** Purple (`bg-tutor-purple-100`, `border-foreground`)
- **Icon:** `HiOutlineInformationCircle`
- **Heading:** "Complete Your Tutor Profile"
- **Body:** "Your profile is missing some important details…"
- **CTA:** "Complete Profile Now" → `/tutor-onboarding`

### State 2 — Pending Review (NEW)
Replace the onboarding banner with this when `onboardingCompleted=true && isApproved=false`:

- **Color:** Amber/Yellow (`bg-amber-50`, `border-amber-300`)
- **Icon:** `HiOutlineClock` (amber)
- **Heading:** "Your Profile is Under Review"
- **Body:** "Thanks for completing your profile! Our team is reviewing your application. This usually takes 1–3 business days. You'll get an email once you're approved."
- **Secondary note:** "In the meantime, you can set up your classes and assessments — they'll go live for students to find once you're approved."
- **No CTA button** — nothing actionable for the tutor here

### State 3 — Approved (NEW)
Banner disappears entirely. No persistent notice needed.

**Implementation location:** `src/app/(frontend)/dashboard/tutor/page.tsx`  
The server component already has `tutorProfile` in scope. Simply add an `else if` after the existing `!tutorProfile.onboardingCompleted` check.

---

## 4. Access Control Policy

### What pending tutors CAN do:
| Action | Allowed | Rationale |
|---|---|---|
| Create classes | ✅ Yes | Lets tutors prepare; classes hidden from students until approved |
| Create assessments | ✅ Yes | Setup work, not student-facing yet |
| View calendar | ✅ Yes | |
| View wallet | ✅ Yes | Balance is 0 but access doesn't hurt |

### What pending tutors CANNOT do:
| Action | Blocked | How |
|---|---|---|
| Appear in `/search` | ❌ Blocked | Already implemented — `isApproved: true` filter in `search/actions.ts` |
| Have a public profile page at `/tutors/[slug]` | ❌ Blocked | Add `isApproved` check to `tutors/[slug]/page.tsx`, return 404 if not approved |
| Accept bookings | ❌ Blocked | Bookings come through search/profile — blocked by above |
| Join live class sessions | ✅ Allowed | For classes they created, can still run test sessions |

### Change from current behaviour:
The onboarding gate modal currently checks `onboardingCompleted`. This is correct — once onboarding is done the gate lifts and they can create classes while pending. **No change needed here.** The gate is about completing their profile, not about approval.

---

## 5. Admin Panel

### 5a. App Shell Decision: Reuse vs New

**Recommendation: Reuse the existing app shell with an admin-only route group.**

Rationale:
- Building a new shell is a full layout rebuild (nav, sidebar, responsive, dark mode, auth) — significant work for no user-facing benefit
- The existing sidebar+topnav pattern already works and is maintained
- The admin panel has the same auth session model as the rest of the app
- We can scope the admin sidebar links to `accountType === 'admin'` with a redirect guard

Implementation: Create `/dashboard/admin` route group with its own layout that shares the outer shell but replaces the sidebar with admin-specific navigation. Gate the entire route group with a server-side admin check (redirect to `/` if not admin).

### 5b. Admin Routes

```
/dashboard/admin                   → redirect to /dashboard/admin/overview
/dashboard/admin/overview          → platform stats overview
/dashboard/admin/tutors            → tutor management (all tutors + pending applications)
```

More routes can be added later (users, disputes, payouts, subjects). Start with these two.

### 5c. Page 1 — Overview (`/dashboard/admin/overview`)

**Purpose:** At-a-glance platform health for the admin.

**Stat cards (top row):**
- Total Tutors (approved)
- Pending Applications (count with red badge if > 0)
- Total Students
- Total Active Classes
- Revenue (NGN + USD)
- Open Disputes

**Charts / tables:**
- New registrations over last 30 days (line chart — tutors vs students)
- Recent activity feed (new signups, approvals, bookings)

**Quick actions:**
- "Review Pending Applications" → `/dashboard/admin/tutors?tab=pending`

### 5d. Page 2 — Tutors (`/dashboard/admin/tutors`)

**Purpose:** Full tutor management. Two tabs:

#### Tab 1 — All Tutors
- **Table columns:** Avatar, Name, Email, Subjects, Status (Approved/Pending), Joined date, Rating, Actions
- **Search:** Full-text search by name or email
- **Filters:** Status (All / Approved / Pending), Subject, Date range
- **Pagination:** 20 per page, server-side
- **Row actions:** View profile, Approve/Revoke, Edit

#### Tab 2 — Pending Applications
- Same table but pre-filtered to `isApproved=false && onboardingCompleted=true`
- Emphasised with an amber header: "X tutors awaiting review"
- **Per-row:** Expand to see full profile details inline (teaching profile, subjects, timezone, country)
- **Actions per row:**
  - ✅ **Approve** — sets `isApproved: true`, triggers approval email to tutor
  - ❌ **Reject** — sets `onboardingCompleted: false` (sends them back to onboarding) OR adds a `rejectionReason` field and emails them
  - 💬 **View full profile** — opens detail drawer/sheet

**Approval email** (on approve):
- Subject: "You're approved on TutorCourt!"
- Body: "Congrats — your profile is now live. Students can find and book you. Log in to set your availability and classes."
- CTA: "Go to Dashboard" → `/dashboard/tutor`

### 5e. Admin Sidebar Navigation

```
📊 Overview
👨‍🏫 Tutors
  └ All Tutors
  └ Pending Applications  [badge: count]
(future)
👤 Users
💰 Finances
⚖️ Disputes
📚 Subjects
⚙️ Settings
```

### 5f. Admin Guard

- Middleware or server-side check: `if (user.accountType !== 'admin') redirect('/')`
- The Payload `/admin` route should also remain but is now redundant for tutor approval — the custom panel replaces it for day-to-day ops
- Route: `/dashboard/admin/layout.tsx` — server component, calls `getServerSideUser()`, redirects if not admin

---

## 6. Data Model Changes

### TutorProfiles collection — add `rejectionReason` field:
```ts
{
  name: 'rejectionReason',
  type: 'textarea',
  admin: {
    description: 'Reason for rejection, included in the rejection email to the tutor.',
    condition: (data) => !data?.isApproved,
  },
  access: {
    update: ({ req: { user } }) => user?.accountType === 'admin',
  },
}
```

### New admin API route — `POST /api/private/admin/tutors/[id]/approve`:
```
Body: { approved: boolean, rejectionReason?: string }
Action:
  - Updates tutor-profiles.isApproved
  - If approved: sends approval email via ZeptoMail
  - If rejected: sends rejection email with reason, resets onboardingCompleted = false
  - Returns updated profile
```

### No DB migrations needed beyond adding the `rejectionReason` field.

---

## 7. Email Notifications

| Trigger | Recipient | Subject |
|---|---|---|
| Tutor approved | Tutor | "You're live on TutorCourt — welcome!" |
| Tutor rejected | Tutor | "Your TutorCourt application needs attention" |

Both via ZeptoMail SDK (same pattern as existing invite/auth emails).

---

## 8. What We Are NOT Changing

- `isApproved` access control on the field itself (already admin-only) — no change
- Search page filter (`isApproved: true`) — already correct, no change
- Tutor onboarding gate modal — checks `onboardingCompleted`, correct as-is
- Payload `/admin` — leave it; it remains for raw data management

---

## 9. Implementation Order

1. **Pending review banner** — `dashboard/tutor/page.tsx` — small, high-value, one file
2. **Public profile 404 for unapproved tutors** — `tutors/[slug]/page.tsx` — one guard
3. **Admin layout + guard** — `dashboard/admin/layout.tsx`
4. **Admin overview page** — `dashboard/admin/overview/page.tsx`
5. **Admin tutors page** — `dashboard/admin/tutors/page.tsx` (with tabs, table, search, pagination)
6. **Approve/reject API route** — `api/private/admin/tutors/[id]/approve/route.ts`
7. **Approval/rejection emails** — ZeptoMail templates
8. **`rejectionReason` field** — add to TutorProfiles collection + Payload migration

Items 1–2 can ship independently without the admin panel. Items 3–8 ship together as the admin panel release.

# PRD: Admin Dashboard V2 — Users, Calendar, Tutor Detail Redesign & Suspension System

**Status:** 🔨 In Progress  
**Date:** 2026-11-01  
**Scope:** Admin users management, platform calendar, tutor detail page redesign, user suspension system

---

## 1. Problem Statement

The admin dashboard is functional but limited. Currently it only has Overview and Tutors. Three major gaps:

1. **No Users page** — admin cannot see or manage all users (students, parents, tutors, admins) in one place, and has no ability to suspend bad actors.
2. **No platform-wide calendar** — admin cannot see the global class schedule. There's no visibility into what's happening across the platform on any given day.
3. **Tutor detail page is a flat scroll** — all info is dumped in a single scrollable page. On mobile this is unusable. Critical actions are buried. There's no way to see a tutor's classes, students, or calendar from within their profile.

---

## 2. Features

---

### 2.1 Admin Users Page (`/dashboard/admin/users`)

**Goal:** Give admin full visibility over all platform users and the ability to take account actions.

**Who can access:** Admin only (guarded at layout and server level).

#### 2.1.1 User List

- **Columns:** Avatar + Name + Email | Account Type (badge) | Status (Active / Suspended) | Joined date | Actions
- **Filters / Search:**
  - Search bar: name or email
  - Account type tab filter: All / Tutors / Parents / Students / Admins
- **Pagination:** 20 per page, URL-based (`?page=&tab=&search=`)
- **Each row actions:**
  - **Suspend** (amber alert button) — only when `isActive: true`
  - **Unsuspend** (green button) — only when `isActive: false`
  - **View profile** (external link icon) — links to tutor profile if tutor, otherwise their dashboard type

#### 2.1.2 Suspend Flow

1. Admin clicks **Suspend** → opens a confirmation `AlertDialog` with:
   - Warning: "This will immediately block this user's access to TutorCourt."
   - Optional reason textarea (included in the notification email)
   - Destructive confirm button: "Suspend Account"
2. On confirm → `POST /api/private/admin/users/[id]/suspend` with `{ suspend: true, reason?: string }`
3. Server: sets `isActive: false` on the user record → sends suspension email to user
4. Page refreshes, user row shows "Suspended" badge

#### 2.1.3 Unsuspend Flow

1. Admin clicks **Unsuspend** → simple confirmation dialog (no reason field)
2. On confirm → `POST /api/private/admin/users/[id]/suspend` with `{ suspend: false }`
3. Server: sets `isActive: true` → sends reinstatement email to user

#### 2.1.4 Suspension Enforcement

Since JWT tokens are stateless (`useSessions: false`), we cannot revoke tokens server-side. Enforcement happens at two levels:

**Level 1 — Server auth helpers:**  
Both `getServerSideUser()` (pages) and `getRouteUser()` (API routes) check `user.isActive` after JWT validation. If `isActive: false`, they return `{ user: null }` — identical to unauthenticated. The session guard in the client-side `AuthProvider` then notices the user is gone and redirects to `/auth/login?reason=suspended`.

**Level 2 — Login page:**  
When Payload rejects a login for an inactive account, it returns the generic "The email or password provided is incorrect." error. After any failed login, the login page calls `POST /api/auth/check-suspension` with the email. If the account is inactive, it returns `{ suspended: true }` and the login page shows a persistent red alert: "Your account has been suspended for violating our platform guidelines. Contact support if you think this is a mistake."

---

### 2.2 Admin Platform Calendar (`/dashboard/admin/calendar`)

**Goal:** Give admin a bird's-eye view of all scheduled classes across the platform.

**Who can access:** Admin only.

#### Layout

- **Week view** (default): 7-column grid showing Mon–Sun. Each column lists classes scheduled for that day.
- **Navigation:** Previous/next week buttons + "Today" reset. Week range displayed as "28 Oct – 3 Nov 2026".
- **Each class card shows:**
  - Time slot (e.g. "09:00 – 10:00")
  - Subject name
  - Tutor name
  - Status badge (scheduled / active / completed / cancelled)
  - Student count
- **Click on class card** → links to `/dashboard/admin/classes` (or a modal in v2)
- **Filter bar:** Status filter (All / Scheduled / Active / Completed / Cancelled)

#### Data source

Classes have `schedule` (array of `{ day, startTime, endTime }`) and `startDate` / `endDate`.

The server fetches all classes whose date range overlaps the displayed week, then renders each day's classes by matching `schedule[].day` to the displayed weekday.

---

### 2.3 Redesigned Admin Tutor Detail Page (mobile-first, tabs)

**Goal:** Completely redesign the tutor detail page to be mobile-first, scannable, and give admin access to all tutor data in one place through tabs.

**Route:** `/dashboard/admin/tutors/[id]` (same URL, full rewrite of the UI)

#### 2.3.1 Hero Section

Full-width header section with:
- **Cover banner**: Solid gradient or pattern (no editable cover image needed)
- **Avatar**: Large circular avatar (80px) overlapping the banner bottom edge
- **Name + Status badges** (Verified / Approved / Pending / Onboarding / Suspended) inline
- **Email** below name
- **Headline** (tutor's bio headline)
- **Public profile link** (top-right, icon button)
- **Stats bar** (horizontal scroll on mobile):
  - Classes count
  - Total students
  - Bookings
  - Reviews (count + avg rating)
  - Credit balance (from wallet)

#### 2.3.2 Tab System

Tabs are sticky on scroll (on desktop). On mobile: horizontal scroll tab bar.

| Tab | Contents |
|-----|----------|
| **Overview** | Profile info (bio, subjects, mode, type, hourly rate, experience, grades, age range), Account info (phone, country, joined, last updated, onboarding, identity, background check), Payout details, Teaching certifications |
| **Admin Actions** | Verify/unverify, Approve/reject, Give credits, Suspend/unsuspend — all with warning dialogs. Full action panel, not squeezed into the overview |
| **Classes** | Table of all classes this tutor teaches: subject, status, student count, start date. Paginated. |
| **Students** | Table of all unique students enrolled in this tutor's classes. Student name, email, class count. |
| **Calendar** | This tutor's weekly schedule pulled from their classes. Same week-view layout as the platform calendar but scoped to this tutor. |

#### 2.3.3 Mobile-first Requirements

- Hero avatar + name stacks vertically, then stats scroll horizontally
- Tabs are a scrollable horizontal bar, not dropdown
- All tab content is a full-width stack on mobile
- Admin action buttons are large tap targets (min 44px)
- No horizontal overflow anywhere

---

### 2.4 Suspension Email Templates

#### Suspension email to user
- **Subject:** "Your TutorCourt account has been suspended"
- **Heading:** "Your account has been suspended"
- **Body:** "We've temporarily suspended your account for violating TutorCourt's community guidelines. [reason if provided]. If you believe this is a mistake, please contact our support team."
- **CTA:** "Contact Support" → mailto or support page

#### Reinstatement email to user
- **Subject:** "Your TutorCourt account has been reinstated"  
- **Heading:** "Welcome back!"
- **Body:** "Your TutorCourt account has been reinstated and you can now log in as usual. We appreciate your patience."
- **CTA:** "Go to Dashboard"

---

## 3. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/private/admin/users` | List all users, paginated |
| POST | `/api/private/admin/users/[id]/suspend` | Suspend or unsuspend user |
| POST | `/api/auth/check-suspension` | Public — check if email is suspended (called after failed login) |

---

## 4. Schema Changes

**Users collection** — no new fields needed. The existing `isActive: boolean` field is the suspension flag. The admin description already reads "Uncheck to disable account access without deleting the record."

**`getServerSideUser()` change** — after `payload.auth()`, check `user.isActive`. If `false`, return `{ user: null }`.

**`getRouteUser()` change** — same check.

---

## 5. Navigation Updates

Admin sidebar gets two new items (in addition to the ones just added):
- **Users** (`/dashboard/admin/users`) — person-group icon
- **Calendar** (`/dashboard/admin/calendar`) — calendar icon (different from the Classes icon)

---

## 6. Implementation Order

1. Schema changes + auth helper patch (`getServerSideUser`, `getRouteUser`)
2. Suspension API route + emails
3. Login page suspension detection
4. Admin Users page (list + suspend/unsuspend)
5. Admin Platform Calendar page
6. Admin Tutor Detail page redesign (hero + tabs)
7. Admin nav update (Users + Calendar items)

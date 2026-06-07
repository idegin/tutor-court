# Tutor Court Feature Redesign & Enhancements Plan

This document outlines the detailed plans, recommendations, and execution steps for improving the tutor dashboard home page, creating reusable notification and calendar components, restricting live class access, and updating the class invitation onboarding flow.

---

## 1. Tutor Dashboard Home Page Redesign

### Objective
Transition the tutor dashboard home page from static mock data to dynamic queries retrieving real-time metrics, class status, and student info from Payload CMS.

### Current Mock Data vs. Real Schema Mapping
1. **Active Students**
   - *Current representation:* Hardcoded text `"24"`.
   - *Real implementation:* Query the `classes` collection where `tutor` matches the active user's ID. Flatten the `students` relationship array of all matching classes, deduplicate the user IDs, and display the count.
2. **Upcoming Classes**
   - *Current representation:* Hardcoded text `"12"`.
   - *Real implementation:* Query the `classes` collection where `tutor` matches the active user's ID, `status` is `'scheduled'` or `'active'`, and `endDate` is greater than or equal to the current time (`now`).
3. **Avg. Quiz Score**
   - *Current representation:* Hardcoded text `"86%"`.
   - *Real implementation:* Query the `assessment-results` collection where `tutor` matches the active user's ID and `submittedAt` exists. Compute the mathematical average of the `score` field across all matched result records.
4. **Attendance Rate**
   - *Current representation:* Hardcoded text `"98%"`.
   - *Real implementation:* Query the `attendance` collection where `tutor` matches the active user's ID. Filter/calculate the percentage: `(present + late + left-early) / (total attendance records for the tutor) * 100`.

### Proposed Schema Additions & Updates
* **`users` (Tutors) / `tutor-profiles` collection update**:
  - Add a metric caching layer or background jobs if queries become too heavy in production. For now, live database queries via Payload's local API are sufficient.
* **`activity-logs` integration**:
  - Use the existing `activity-logs` collection to drive the **Recent Activity** feed on the home page instead of fetching across multiple collections.

### Sections to Remove or Modify
* **Remove / Hide the hardcoded "Action Needed" items**:
  - Instead, query `attendance` to find students with more than two consecutive `status: 'absent'` entries, and query `assessment-results` where `feedback` or grading is pending (if manual grading is introduced). If no database alerts are present, display a clean "No action items" illustration.
* **Remove the static "Average Score Trends" line chart**:
  - Replace the chart with a clean, dynamic bar or area chart showing average scores grouped by subject or week using real data queried from `assessment-results` over the past 8 weeks.

---

## 2. Reusable Notification Component & Page Setup

### Objective
Allow students, parents, and tutors to view their in-app notifications using a single unified client-side UI component.

### Reusability Architecture
1. **Create the Component (`src/components/dashboard/notifications-list.tsx`)**:
   - Extract the entire UI state, fetch logic, and mark-as-read mutations from the tutor notification page.
   - Accept the user's role/account type via props (e.g. `userRole: 'tutor' | 'student' | 'parent'`) to allow role-specific custom messages or filter tweaks.
2. **Refactor Existing Page & Add New Routes**:
   - **Tutor:** Clean `src/app/(frontend)/dashboard/tutor/notifications/page.tsx` and import `<NotificationsList userRole="tutor" />`.
   - **Student:** Create `src/app/(frontend)/dashboard/student/notifications/page.tsx` and render `<NotificationsList userRole="student" />`.
   - **Parent:** Create `src/app/(frontend)/dashboard/parent/notifications/page.tsx` and render `<NotificationsList userRole="parent" />`.
3. **Add Navigation links**:
   - Update `student-shell.tsx` and parent navigation sidebar configuration files to include the notifications route.

---

## 3. Reusable Calendar Component & Page Setup

### Objective
Enable parents and students to see their scheduled classes in a calendar view, sharing the same polished Big-Calendar UI that tutors use.

### Reusability Architecture
1. **Create the Component (`src/components/dashboard/dashboard-calendar.tsx`)**:
   - Refactor `calendar-client.tsx` to become a shared component.
   - Accept properties:
     * `initialEvents: Array`: List of generated calendar events.
     * `userRole: 'tutor' | 'student' | 'parent'`: Adjusts sheet actions (e.g., hiding tutor class details button from students/parents, or showing specific student labels).
     * `isLoading?: boolean`: Displays loading skeleton when fetching updated events.
2. **Add Student and Parent Pages**:
   - **Student Page (`src/app/(frontend)/dashboard/student/calendar/page.tsx`)**:
     * Fetch `classes` where the student is enrolled (`students` contains `user.id`).
     * Generate recurring calendar events and pass them to `<DashboardCalendar userRole="student" initialEvents={events} />`.
   - **Parent Page (`src/app/(frontend)/dashboard/parent/calendar/page.tsx`)**:
     * Fetch `classes` where the parent's children are enrolled (`parents` contains `user.id`).
     * Generate recurring events showing which child is attending each session, and render `<DashboardCalendar userRole="parent" initialEvents={events} />`.
   - **Tutor Page:** Refactor the current calendar page to pass events to the new shared calendar component.

---

## 4. Live Class Session Entry Guarding (Video SDK)

### Objective
Prevent unauthorized users from entering live classroom video sessions by applying gatekeeping checks on both the frontend and backend.

### Backend Changes (`src/app/(frontend)/api/live-sessions/join/route.ts`)
* Add a relationship validation step:
  1. Extract `classId` / `sessionId` from the join request.
  2. Fetch the corresponding class from the database:
     ```typescript
     const cls = await payload.findByID({
       collection: 'classes',
       id: classIdVal,
       depth: 0,
     })
     ```
  3. Validate access:
     - Allow entry if the user is the owner of the class (`user.id === cls.tutor`).
     - Allow entry if the user is enrolled in the class as a student (`cls.students` contains `user.id`).
     - Block entry with a `403 Forbidden` response for all other users:
       ```typescript
       return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });
       ```

### Frontend Changes (`src/app/(frontend)/classroom/[classId]/classroom-client.tsx`)
* Before rendering the Video SDK conference interface, fetch the validation state or intercept join errors.
* If a `403` error is returned from the join API, display a "Classroom Unauthorized" state showing a warning message and a "Go Back to Dashboard" button.

---

## 5. Class Invitation & Joining Flow (Parent & Student Onboarding)

### Recommendation & Strategy
We strongly recommend **decoupling student addition/class invitation from the core parent onboarding flow** and instead introducing a dedicated **"Accept Invitation"** landing page.

#### Recommended Architecture
1. **Decoupled Parent Onboarding**:
   - Keep parent onboarding simple and focused on general setup (creating parent account profile, optional general child profile creation).
2. **Dedicated Invitation Accepting Page (`/class-invite/[token]`)**:
   - Provide a unified page that handles invite tokens for both parents and students.
   - **If the Invitee is a Parent**:
     * The page displays the class details, tutor name, and weekly schedule.
     * It prompts the parent: *"Which child should join this class?"*
     * It lists the parent's existing children/managed students and includes a quick "Add new child profile" form.
     * Once selected/created, the parent confirms and assigns that student to the class.
   - **If the Invitee is a Student**:
     * The student simply clicks *"Accept & Join"* to be enrolled.
3. **Smart Redirects for Guest/New Users**:
   - If a parent opens an invite link but is **not registered or logged in**:
     1. Store the invite token in `sessionStorage` or cookies.
     2. Redirect them to `/auth/register` (as parent).
     3. Take them through the Parent Onboarding steps.
     4. Upon completing onboarding, detect the stored token and redirect them back to `/class-invite/[token]` to complete class registration.
   - If a student opens an invite link and is **not registered**:
     1. Guide them to register/onboard under the parent, then accept the invite.

---

## 6. Unified Dashboard Redesign Finalizations & Parent Classes Integration

### 6.1 Clickable Upcoming Classes on Tutor Dashboard
- **Implementation:** Wrapped the upcoming schedule cards in the tutor's dashboard homepage (`src/app/(frontend)/dashboard/tutor/page.tsx`) in a `<Link>` pointing to `/dashboard/tutor/classes/${evt.classId}`.
- **Outcome:** Tutors can click directly on class events to view detailed student performance metrics, schedule plans, and materials.

### 6.2 Parent Classes Page & Class Details Page
- **Parent Classes List (`/dashboard/parent/classes/page.tsx`)**:
  - Displays a clean overview card for each class the parent has joined.
  - Displays subject tags, tutor details, class schedules (recurrence days and times), class status, start dates, and which children are enrolled in each class.
- **Parent Class Details (`/dashboard/parent/classes/[id]/page.tsx` and `class-details-client.tsx`)**:
  - Shows comprehensive details about the class: tutor email/contact, schedule lists, and enrolled children.
  - Displays a section where parents can choose from a list of their children who are **not currently enrolled** in this class and register them directly.
  - Integrates the inline "Create Child Profile" form from the onboarding page. If a parent needs to add a child to enroll, they can create the child profile inline, copy their login credentials, and immediately assign them to the class.
- **Database Schema Recommendations**:
  - `classes`: Parents are tracked via `parents` (relationship to users), and students are tracked via `students` (relationship to users).
  - `students`: Used to fetch the parent's children (where parent matches active user) and their associated login details.

### 6.3 Secure Enrollment Constraints
- **Endpoint (`/api/parent/classes/enroll/route.ts`)**:
  - Verifies parent session, child ownership, and class membership.
  - **One-on-One Constraint Check:** If `cls.classType === 'one-on-one'` and any student is already enrolled, blocks enrollment and throws an error: `"One-on-One classes can only have 1 student."`
  - **Maximum Capacity Check:** If `cls.maxStudents` is set and the enrolled students count equals or exceeds `maxStudents`, blocks enrollment and throws an error: `"Class capacity limit reached. Maximum limit is ${cls.maxStudents} student(s)."`

### 6.4 Calendar View Filter and Attendee Displays
- **Calendar Event Filtering:** Updated `tutor`, `student`, and `parent` calendar pages to only fetch and generate events for classes that have students (`students.length > 0`).
- **Sheet/Drawer Details updates:** 
  - Passes `tutorName` and `student` details as fields in calendar event payloads.
  - Updated `DashboardCalendar` sheet to conditionally display the tutor's name.
  - Shows `"You"` for the student when they look at the attendee list, and the corresponding list of students/children for tutors and parents.

### 6.5 Class Invitation Auto-Enrollment Restrictions
- **Endpoint (`/api/tutor/classes/invite/route.ts`)**:
  - Modified the parent invite logic. When a parent is added directly, their children are only enrolled automatically **if the parent has exactly 1 child profile**.
  - If the parent has more than 1 child profile, no students are enrolled automatically, and the tutor can add them manually, or the parent can select which child to enroll via their new class details page.

### 6.6 Parent invitation Email Redirection
- **Action Links:** Updated invitation email template inside `/api/tutor/classes/invite` to direct existing parent accounts to `/dashboard/parent/classes/${classId}` instead of `/dashboard/parent`. This immediately brings them to the enrollment panel for the invited class.

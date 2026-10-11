# PRD: Assessment System Improvements

**Status:** ✅ Complete  
**Date:** 2026-10-11  
**Scope:** Assessment types, question types, grading model, parent notifications, rich text editor, flashcard system

---

## 1. Current State Audit

### What's built and working

| Layer | Status |
|---|---|
| Assessments collection (Quiz / Flashcard / Practice Test / Homework types) | Schema exists, only Quiz is fully functional end-to-end |
| Question types: Single Choice, Multiple Choice, True/False | Auto-graded correctly by `submit/route.ts` |
| Question types: Short Answer, Essay | Stored, flagged `pendingManualGrading = true`, tutor grades via `/api/assessments/results/grade` |
| Tutor assessment builder (question editor) | Works but UX rough — markdown textarea, no image upload UX, etc. |
| Student take-assessment flow | Works for choice-based and text answer types |
| Tutor manual grading UI | Exists in `assessment-detail.tsx` |
| Student notified when assigned | ✅ via `createNotification` + `createActivityLogs` |
| Tutor notified when student submits | ✅ activity log only |
| Parent notified for any assessment event | ❌ Not implemented |

### What's broken or misleading

- **Flashcard type**: exists in the DB schema and appears as a badge in the UI, but there is no flashcard-specific student experience (no flip card UI, no study mode). Students who receive a "flashcard" assessment see the same quiz flow as any other type — the type label is cosmetic only.
- **"Question Text (supports Markdown)"**: raw `<textarea>` with a tooltip; tutors who don't know Markdown get a broken experience and tutors who do get no preview. The student side renders the text as plain text (no Markdown parsing).
- **Assessment type selector**: shows four options to the tutor but three of them (Flashcard, Practice Test, Homework) either don't have a differentiated UX or have no UX at all.
- **`textAnswer` schema**: stored as `type: 'text'` (single-line) in the AssessmentResults Payload schema, even though Short Answer and Essay need multi-line.
- **No parent-facing assessment view**: parents can't see their child's assignment or results.

---

## 2. Recommendations

### 2a. Assessment Types — Lock to "Quiz" only for now

**Recommendation:** Remove Flashcard, Practice Test, and Homework from the tutor-facing type selector. Keep `quiz` as the only available option. Keep the schema values (`flashcard`, `practice_test`, `homework`) in the DB for future use — just hide them in the UI.

**Rationale:**  
- Practice Test and Homework are functionally identical to Quiz from a code standpoint. The distinction is only semantic — tutors can convey the intent in the title ("Homework 3 — Fractions"). Adding them as first-class types adds complexity with zero unique behaviour.
- Flashcard is a fundamentally different UX paradigm (see §2b). Shipping it half-baked (a quiz labelled "flashcard") misleads tutors into thinking it works differently.
- Locking to one type removes cognitive load during assessment creation. When Flashcards are properly built (see §2b), they can be re-enabled.

**Change:** In the `Create Assessment` dialog, remove the Type field entirely or lock it to a read-only "Quiz" value. Optionally render a pill/badge that says "Quiz" non-interactively.

---

### 2b. Flashcards — Separate spec (do NOT ship yet)

Flashcards are a study-mode tool, not a graded assessment. They require:

- A different question format: **front** (question/term) + **back** (answer/definition) — no options array
- A different student UX: flip animation, self-rate (Got it / Almost / No), spaced-repetition queue
- No passing score, no auto-grading, no `pendingManualGrading`
- A different tutor builder: front/back fields instead of options
- A different result model: not a `score %` but a "mastery %" based on self-ratings

This is a meaningful chunk of work and should be a separate PRD/sprint.

---

### 2c. Question Types — Keep all five, but clarify grading mode visually

Keep: **Single Choice, Multiple Choice, True/False, Short Answer, Essay**

These cover the full range of K-12 assessment needs.

**Add a visual grading indicator** in both the tutor question builder and the student result view:

| Type | Auto-graded? | Show to tutor during creation |
|---|---|---|
| Single Choice | ✅ Yes | "System marks this automatically" |
| Multiple Choice | ✅ Yes | "System marks this automatically" |
| True / False | ✅ Yes | "System marks this automatically" |
| Short Answer | ❌ No | "You will grade this manually after submission" |
| Essay | ❌ No | "You will grade this manually after submission" |

**Assessment-level grading indicator:** Once the tutor has added questions, display a banner:
> "This assessment contains manual questions. You'll need to grade it after the student submits."

This replaces the current silent `pendingManualGrading` flag that tutors only discover when looking at results.

---

### 2d. Short Answer vs Essay — Clarify the distinction

Currently both types are described as "you grade it manually." That's correct but vague.

| Type | Student input | Max length | Intended use |
|---|---|---|---|
| Short Answer | Single paragraph textarea | ~500 chars | One-sentence to one-paragraph answers |
| Essay | Full-page multi-line textarea | Unlimited | Long-form written responses |

**Schema fix:** Change `textAnswer` in `AssessmentResults` from `type: 'text'` to `type: 'textarea'` so Payload stores and surfaces it correctly in the admin panel.

**UI:** Both types should render a `<textarea>` (not an `<input>`) in the student take-assessment flow. Short Answer gets a smaller textarea (4 rows), Essay gets a larger one (10+ rows) with character count.

---

### 2e. Replace "supports Markdown" textarea with TipTap editor

**Problem:** The tutor's question text field is a raw textarea with `(supports Markdown)` as a label. This is bad UX in both directions:
- Tutors who don't know Markdown write plain text and can't format their questions
- Tutors who do know Markdown write `**bold**` and see the raw syntax — no preview
- Students receive text rendered as plain text anyway (no Markdown parser on the student side)

**Recommendation: Replace with TipTap**

TipTap is the right choice for this:
- MIT license, production-ready React component
- Exports clean Markdown via `@tiptap/extension-code-block` + the `tiptap-markdown` extension
- Supports bold, italic, inline code, code blocks, bullet lists, ordered lists, images — everything a tutor needs for a Math/Science question
- Has a starter kit with exactly the subset we need (no CMS-level features)
- Light bundle compared to alternatives (Slate, Quill, CKEditor)
- First-class Next.js/React support (client component only — that's fine, the builder is already a client component)

**What TipTap covers for tutors:**
- Bold, italic, underline
- Inline `code` (for variable names, formulas as text)
- Code block (for programming questions)
- Bullet and numbered lists (for multi-part questions)
- Math: add `@tiptap/extension-mathematics` (KaTeX) for inline `$x^2$` and display `$$...$$` blocks — critical for Maths and Physics questions

**Student side:** Render stored Markdown via `react-markdown` + `remark-math` + `rehype-katex` for math. This replaces the current plain-text render.

**Implementation scope:**
1. Add TipTap to the question builder (tutor assessments dashboard)
2. Change storage format: `questionText` field remains `type: 'textarea'` in Payload — it just stores the Markdown string TipTap exports
3. Add `react-markdown` rendering on the student take-assessment and result pages
4. Optionally: add TipTap to the `explanation` field too

**Do NOT add TipTap to the option text fields** — options should stay plain text for clarity and to avoid nested editor UX issues.

---

### 2f. Parent Notifications — Add for assessment events

**Currently:** parents have no visibility into their child's assessments.

**What parents should be notified about:**

| Event | Notification | How |
|---|---|---|
| Child assigned an assessment | In-app notification + email | When tutor calls `POST /api/assessments/tutor-assessments` |
| Child submits an assessment | In-app notification only | When `POST /api/assessments/results/submit` completes |
| Child's assessment is graded | In-app notification + email | When `POST /api/assessments/results/grade` completes |

**How to find the parent:** The student `User` document has a `parent` relationship field. Look up the student, get `student.parent`, and if set, send the notification to that user ID.

**Implementation:** Add a `notifyParent(studentId, payload, event, data)` helper that:
1. Fetches the student with depth 1 to resolve `parent`
2. If `parent` exists, calls `createNotification` + optionally `sendEmail`

**Parent notification copy:**

- **Assigned:** `"[Tutor name] has assigned [Child name] a new assessment: '[Assessment title]'. Due: [date or 'no deadline']."`
- **Submitted:** `"[Child name] has submitted their assessment: '[Assessment title]'."`
- **Graded:** `"[Child name]'s assessment '[Assessment title]' has been graded. Score: [score]% ([Pass/Did not pass])."`

**Parent portal:** Add an assessments section to the parent dashboard (`/dashboard/parent/students/[id]/assessments`) — this already exists as a page but may not be linked from the main nav. Ensure it shows status (Pending / Submitted / Graded) and score.

---

### 2g. Grading Mode — Implicit is fine, but make it visible

**Question:** Should tutors select "auto-graded" vs "manually graded" at the assessment level?

**Answer: No — keep it implicit at the question-type level.** 

Explicitly asking tutors to choose a grading mode is redundant: the grading mode is already 100% determined by which question types they include. Adding a separate toggle means the two can fall out of sync (e.g. tutor marks "auto-graded" but adds a Short Answer question).

What SHOULD happen:
1. **Warning at build time:** When the tutor saves a question of type Short Answer or Essay, show a persistent notice: *"This assessment contains questions you'll need to grade manually after the student submits."*
2. **Warning at send time:** When the tutor sends the assessment to a student, if any questions are Short Answer or Essay, surface the same note in the confirmation dialog.
3. **Results page indicator:** In the tutor's results view, show a "Needs grading" badge/status clearly when `pendingManualGrading = true`, rather than the current subtle display.

---

## 3. Implementation Order

### Phase 1 — Quick wins ✅ COMPLETE

1. ✅ **Lock assessment type to Quiz** — Type selector replaced with static "Quiz" label in Create dialog; Flashcard re-enabled in Phase 4 alongside Quiz.
2. ✅ **Short Answer / Essay textarea** — `textAnswer` changed to `type: 'textarea'` in `AssessmentResults.ts`; migration `20261011_000002_assessment_answers_textarea.ts` alters column to `text` type.
3. ✅ **Grading mode banners** — per-question amber banner for short_answer/essay; assessment-level banner if any manual questions exist; both surface in the tutor builder.
4. ✅ **"Pending grading" badge** — `pendingManualGrading` shown as "Pending review" badge + amber info banner in the assessment detail view.

### Phase 2 — Parent notifications ✅ COMPLETE

5. ✅ **`notifyParent()` helper** — added to `src/lib/notification-service.ts`; looks up `student.parent` and calls `createNotification` fire-and-forget.
6. ✅ **Wire into tutor-assessments POST** — parent notified on assignment with tutor name, assessment title, and due date.
7. ✅ **Wire into submit route** — parent notified when child submits (fire-and-forget after tutor notification).
8. ✅ **Wire into grade route** — parent notified when tutor grades, including score and pass/fail.
9. ✅ **Parent dashboard assessments section** — `src/app/(frontend)/dashboard/parent/students/[id]/assessments/[tutorAssessmentId]/page.tsx` exists and uses `AssessmentDetail` with read-only view.

### Phase 3 — Rich text editor ✅ COMPLETE

10. ✅ **Install TipTap** — `@tiptap/react@3.31.4`, `@tiptap/starter-kit`, `tiptap-markdown`, `@tiptap/extension-mathematics` installed via pnpm.
11. ✅ **KaTeX CSS** — imported directly in client components (`import 'katex/dist/katex.min.css'`) to avoid Lightning CSS build errors with `@import` in `global.css`.
12. ✅ **`<QuestionEditor>` component** — `src/components/assessments/question-editor.tsx`; TipTap with StarterKit + Mathematics + Markdown extensions; exports Markdown via `tiptap-markdown`; toolbar for bold/italic/code/lists; `$...$` math hint.
13. ✅ **Replace textarea in question builder** — TipTap editor used for `questionText` in the tutor assessments page inline question editor.
14. ✅ **Install react-markdown** — `react-markdown@10`, `remark-math`, `rehype-katex` installed.
15. ✅ **`<QuestionRenderer>` component** — `src/components/assessments/question-renderer.tsx`; renders stored Markdown + KaTeX math.
16. ✅ **Replace plain text renders** — `take-assessment.tsx`, `assessment-detail.tsx`, and the tutor question list all use `<QuestionRenderer>`.

### Phase 4 — Flashcard system ✅ COMPLETE

17. ✅ **New question format** — `backText` field (textarea) added to `AssessmentQuestions`; `flashcard` added as a question type value; `mastery` field (number 0–100) added to `AssessmentResults`; migration `20261011_000003_flashcard_fields.ts`.
18. ✅ **Flashcard player UI** — `src/components/assessments/flashcard-player.tsx`; CSS 3D flip with `perspective`/`rotateY`/`backface-visibility`; progress bar with per-card color coding (green=got_it, amber=almost, red=no); self-rate buttons "Got it / Almost / Not yet"; mastery result screen after all cards rated.
19. ✅ **Mastery tracking model** — `mastery = got_it_count / total_rated * 100`; stored on `assessment-results.mastery`; flashcard-study route `POST /api/assessments/results/flashcard-study`; notifies tutor + parent on completion.
20. ✅ **Re-enable Flashcard in type selector** — Create Assessment dialog now shows Quiz + Flashcard; question builder auto-switches to front/back mode when assessment type is flashcard; tutor question list shows "Front" / "Back" labels for flashcard cards.

**Additional Phase 4 changes:**
- Student assessment page (`student/assessments/[id]/page.tsx`) branches to `FlashcardPlayer` when `assessment.type === 'flashcard'` (unsubmitted) or `AssessmentDetail` (submitted).
- `AssessmentDetail` shows mastery % instead of score/passed stats for flashcard type; hides per-question breakdown (no answers stored for flashcards).
- `questions/route.ts` POST accepts `backText` for flashcard questions and skips the "must have a correct option" validation.

---

## 4. What We Are NOT Changing

- The five question types — they're all valid and well-implemented in the backend
- The `pendingManualGrading` flag and the tutor grade endpoint — the model is correct, just needs better UI
- The `passingScore` concept — keep it; it's meaningful for both Quiz and future Practice Test
- The `timeLimitMinutes` field — keep it, tutors use it for timed quizzes
- The `isPublished` flag — keep it, useful for draft assessments

---

## 5. Open Questions

| Question | Recommendation |
|---|---|
| Should students be able to retake assessments? | `maxAttempts` field already exists; tutor can set it. Default 1. No change needed. |
| Should Practice Test be a separate type from Quiz? | No. The semantic difference (practice = no grade consequence) should be handled by the tutor setting `passingScore = 0`, not a separate type. |
| Should Essay questions have a word count minimum/maximum? | Nice to have, but Phase 3+. Store `minWords`/`maxWords` on the question record. |
| Should assessment instructions support rich text? | Yes — add TipTap to the instructions field in Phase 3 alongside question text. |

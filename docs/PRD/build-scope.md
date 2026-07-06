# **TutorCourt MVP User Flow and Build Scope**

## **1\. Purpose of this document**

This document translates the validated TutorCourt concept into a practical MVP structure for the technical partner. It defines:

* the MVP pillars  
* the recommended launch sequence  
* the core user roles  
* the primary user flows  
* the pages and modules required  
* the data each profile or record should contain  
* the decisions that should remain open for iteration after pilot use

The aim is to build the smallest version of TutorCourt that is still credible, testable, and useful.

---

## **2\. MVP strategic framing**

TutorCourt has two related but distinct product pillars:

### **Pillar A: Tutor SaaS workspace**

A software layer for tutors who already have clients and need one place to manage online teaching.

This pillar solves:

* fragmented tools  
* difficulty managing sessions  
* weak parent visibility into child’s progress  
* lack of progress records  
* lack of integrated quiz and reporting workflows

### **Pillar B: Tutor marketplace / freelancer discovery**

A recruitment and profile layer where vetted tutors can be displayed and eventually discovered by parents looking for tutors.

This pillar solves:

* limited tutor discoverability  
* lack of structured tutor profiles  
* weak trust and screening for parents  
* no central system for matching supply and demand

### **Recommended launch logic**

The SaaS layer should launch first in practical use, while the freelancer layer begins with tutor recruitment and profile preparation.

This means the first MVP should support:

1. tutors with existing clients using the platform for class delivery and progress tracking  
2. parent and pupil access linked to those tutors  
3. internal recruitment and vetting of marketplace tutors  
4. draft public tutor profiles for later marketplace release

This is more realistic than launching both sides fully at once.

---

## **3\. Recommended MVP phases**

## **Phase 1: Private SaaS beta**

Target users:

* tutors who already have paying clients  
* the parents and pupils they invite

Goal:

* validate tutor workflow  
* test class delivery experience  
* test whiteboard / video / quiz / dashboard experience  
* gather product usage data and error reports

## **Phase 2: Tutor recruitment for marketplace**

Target users:

* tutors who want to be listed for future discovery by parents

Goal:

* define tutor vetting workflow  
* standardise tutor profile format  
* build initial supply before parent acquisition begins

## **Phase 3: Parent-facing marketplace release**

Target users:

* parents looking for tutors

Goal:

* enable browse, shortlist, and tutor enquiry / matching  
* eventually connect parent demand to recruited tutors

---

## **4\. Core user roles in MVP**

There are three main external user roles and one internal admin role.

### **4.1 Tutor**

Two tutor states should exist:

* SaaS tutor: uses TutorCourt to teach own clients  
* Marketplace tutor applicant: applies to be listed on TutorCourt for future discovery

One tutor may eventually be both.

### **4.2 Parent**

Parent creates an account either:

* because a tutor invited them for an existing child’s classes, or  
* later, because they want to discover a tutor on the platform

The parent may manage one or multiple children.

### **4.3 Student / pupil**

Student participates in classes, completes quizzes, and sees progress information relevant to them.

### **4.4 Admin / operations team**

Internal team role needed for:

* tutor recruitment review  
* tutor approval or rejection  
* quiz / user / class troubleshooting  
* subscription monitoring  
* marketplace profile moderation

---

## **5\. MVP scope: what must be in and what can wait**

## **Must be in MVP**

### **For Tutor SaaS**

* tutor sign-up and login  
* tutor onboarding  
* tutor creates classes  
* tutor invites parent / student  
* calendar and session scheduling  
* session room with video and whiteboard  
* quiz creation and student submission  
* progress tracking dashboard  
* parent dashboard  
* student dashboard  
* tutor basic subscription handling

### **For marketplace preparation**

* tutor application form  
* tutor vetting workflow  
* tutor profile builder  
* admin review dashboard  
* approved tutor database

## **Can wait until later**

* in-platform parent payment processing  
* automated matching engine  
* ratings and reviews  
* advanced messaging/chat system  
* parent search filters with heavy sophistication  
* tutor commissions  
* referral payouts automation  
* academy or multi-tutor organisation accounts  
* deep analytics

---

## **6\. Product architecture at MVP level**

The MVP can be thought of as 7 major modules.

1. Authentication and role selection  
2. Tutor workspace  
3. Parent and student workspace  
4. Live class delivery module  
5. Assessment and progress module  
6. Marketplace tutor recruitment module  
7. Admin and moderation module

---

## **7\. Key user flows**

## **Flow 1: Tutor signs up for SaaS use**

### **Goal**

A tutor with existing clients joins TutorCourt to manage classes and student progress.

### **Steps**

1. Tutor lands on homepage  
2. Clicks “Get started as a tutor”  
3. Creates account  
4. Chooses use case:  
   * I already have students and want to use TutorCourt tools  
   * I want to apply to be listed as a TutorCourt tutor  
   * both  
5. Completes tutor onboarding  
6. Creates first class or programme  
7. Adds subject, level, schedule, and class settings  
8. Invites parent by email / link / WhatsApp share link  
9. Parent creates linked account  
10. Student gets access through parent account or separate student login  
11. Tutor runs first session  
12. Tutor creates first quiz / assignment  
13. Student completes work  
14. Dashboard begins recording progress data

### **Pages involved**

* homepage  
* sign-up  
* role selection  
* tutor onboarding  
* tutor dashboard  
* class creation page  
* invitation page  
* class details page

---

## **Flow 2: Parent joins because invited by a tutor**

### **Goal**

A parent joins to manage a child enrolled by an existing tutor.

### **Steps**

1. Parent receives invitation link  
2. Opens invite page  
3. Sees tutor name, subject/class, child invitation context  
4. Creates parent account  
5. Adds child profile  
6. Links child to tutor class  
7. Accesses parent dashboard  
8. Views class schedule, completed quizzes, and progress summaries

### **Pages involved**

* invite acceptance page  
* parent sign-up  
* child profile creation page  
* parent dashboard  
* child progress page

---

## **Flow 3: Student joins and attends a class**

### **Goal**

A student accesses the platform to attend lessons and complete assessments.

### **Steps**

1. Student receives login access from tutor or parent  
2. Logs in  
3. Lands on student dashboard  
4. Sees upcoming classes and pending quizzes  
5. Joins live class  
6. Uses session room tools as permitted  
7. Completes quiz or assignment  
8. Views own score / progress history

### **Pages involved**

* student login  
* student dashboard  
* live class room  
* quiz page  
* progress page

---

## **Flow 4: Tutor creates and manages a live class**

### **Goal**

Tutor schedules and conducts lessons without leaving the platform.

### **Steps**

1. Tutor opens dashboard  
2. Creates new class / session  
3. Sets title, subject, level, date, time, participants  
4. Generates class room  
5. Starts session at scheduled time  
6. Uses video, screen share, and whiteboard  
7. Ends session  
8. Marks attendance / adds notes if required

### **Functional requirements**

* calendar integration or internal calendar view  
* session reminders  
* join links for participants  
* whiteboard availability  
* optional upload of lesson materials

---

## **Flow 5: Tutor creates a quiz and tracks performance**

### **Goal**

Tutor assigns short assessments and sees performance over time.

### **Steps**

1. Tutor opens assessment module  
2. Creates quiz  
3. Selects linked class / student(s)  
4. Sets questions, answers, marks, time limits if any  
5. Publishes quiz  
6. Student completes quiz  
7. System records scores  
8. Parent and tutor dashboards update  
9. Progress chart accumulates data over time

### **MVP quiz types to start with**

* multiple choice  
* short answer scored manually or semi-manually

### **Dashboard outputs**

* quiz score history  
* attendance trend  
* completion rate  
* basic progress graph over time

---

## **Flow 6: Tutor applies to become a marketplace tutor**

### **Goal**

A tutor who wants future discoverability submits profile and screening information.

### **Steps**

1. Tutor chooses “Apply to be listed”  
2. Opens tutor recruitment application form  
3. Submits professional information  
4. Uploads requested materials  
5. Application enters admin review queue  
6. Admin reviews and updates status  
7. Approved tutor gets notification to complete public profile  
8. Profile is stored as approved, hidden, or published depending on launch stage

---

## **Flow 7: Parent discovers a tutor in future marketplace phase**

This is future-near, but the structure should be prepared now.

### **Steps**

1. Parent lands on marketplace  
2. Browses tutors by subject, level, format, and availability  
3. Opens tutor profile  
4. Reviews bio, intro video, experience, fees if shown, and subjects  
5. Sends interest or booking request

For MVP, this can remain hidden or admin-only until enough tutors are onboarded.

---

## **8\. Core pages required for MVP**

## **Public pages**

* Home page  
* About / How it works page  
* Pricing page for SaaS tutors  
* Become a tutor / apply page  
* Login page  
* Sign-up page  
* Contact / support page

## **Tutor pages**

* Tutor onboarding page  
* Tutor dashboard home  
* Create class page  
* Classes list page  
* Single class details page  
* Calendar / schedule page  
* Live class room page  
* Quiz / assignment builder page  
* Assessments list page  
* Students list page  
* Student progress page  
* Parent invitations page  
* Tutor profile builder page  
* Subscription / billing page  
* Settings page

## **Parent pages**

* Parent onboarding page  
* Parent dashboard  
* Children list page  
* Single child overview page  
* Child class schedule page  
* Child progress page  
* Messages / notifications page if included  
* Settings page

## **Student pages**

* Student dashboard  
* Upcoming classes page  
* Live class room page  
* Quiz / assignment page  
* Results / progress page  
* Settings page

## **Marketplace recruitment pages**

* Tutor application landing page  
* Tutor application form  
* Application submitted page  
* Tutor public profile preview page

## **Admin pages**

* Admin dashboard  
* Tutor applications queue  
* Tutor approval page  
* Users management page  
* Classes monitoring page  
* Subscription monitoring page  
* Support / issue tracking page  
* Tutor profile moderation page

---

## **9\. Information architecture: what data each record needs**

## **9.1 Tutor account data**

* full name  
* email  
* phone number  
* password / auth record  
* country / city  
* subjects taught  
* levels taught  
* tutoring mode: online only / hybrid / in-person later  
* years of experience  
* short bio  
* profile photo  
* onboarding status  
* SaaS user status  
* marketplace applicant status  
* subscription status

## **9.2 Tutor marketplace profile data**

* full name / display name  
* profile photo  
* headline (e.g. Mathematics Tutor for Primary and Secondary Students)  
* subjects taught  
* levels taught  
* short written introduction  
* longer bio  
* years of experience  
* qualifications / certifications  
* languages spoken  
* teaching style / approach  
* intro video  
* LinkedIn link optional  
* portfolio or proof link optional  
* availability summary  
* location / timezone  
* verification or approval badge

## **9.3 Parent account data**

* full name  
* email  
* phone number  
* relationship to child  
* number of children  
* invitation source or tutor link source

## **9.4 Student / child profile data**

* full name  
* age  
* class / grade level  
* subjects enrolled in  
* linked tutor(s)  
* parent link  
* attendance record  
* quiz score history  
* progress trend data

## **9.5 Class data**

* class title  
* subject  
* level  
* tutor  
* linked students  
* recurring or one-time session  
* start time / end time  
* session link / room ID  
* class notes  
* attendance log

## **9.6 Quiz / assessment data**

* quiz title  
* linked class or student  
* date assigned  
* due date  
* question type  
* total marks  
* student submission data  
* score  
* feedback

---

## **10\. Tutor recruitment process for marketplace**

This needs to be documented clearly because it is one of the first operational systems you will run manually.

## **Suggested tutor recruitment stages**

1. Application submitted  
2. Initial screening / Test  
3. Credentials / experience review  
4. Demo lesson or sample content review  
5. Interview or verification call if required  
6. Approved / waitlisted / rejected  
7. Profile completion  
8. Ready for listing

## **Suggested questions for tutor recruitment**

* full name  
* email and phone number  
* subjects taught  
* levels taught  
* years of tutoring experience  
* formal teaching qualification if any  
* online tutoring experience  
* tools currently used  
* link to LinkedIn or portfolio optional  
* short written bio  
* short intro video upload  
* evidence of teaching quality optional  
* preferred fee range optional for future  
* availability  
* country / timezone

## **Suggested vetting criteria**

* communication quality  
* subject fit  
* professionalism  
* clarity of teaching style  
* confidence on video  
* digital readiness  
* responsiveness

---

## **11\. Profile design considerations for marketplace tutors**

A good tutor profile should balance trust, quality, and conversion.

## **Minimum profile fields recommended for public display**

* profile photo  
* full name or approved display name  
* subjects and levels  
* short headline  
* years of experience  
* short bio  
* intro video  
* location / timezone  
* availability summary  
* badge if verified by TutorCourt

## **Optional fields**

* LinkedIn profile  
* certifications  
* teaching philosophy  
* languages spoken  
* student success notes

### **Important caution**

Do not overcrowd the first profile version. Parents mainly need:

* trust  
* subject fit  
* age / level fit  
* a sense of the tutor’s communication style

An intro video may be especially powerful.

---

## **12\. Role entry logic at sign-up**

The platform should have a very clear role selection step.

### **Recommended sign-up choices**

* I am a tutor  
* I am a parent  
* I am a student

If tutor is selected, ask:

* Are you here to use TutorCourt with your existing students?  
* Do you also want to apply to be listed for future discovery by parents?

If parent is selected, ask:

* Are you joining because a tutor invited you?  
* Are you looking for a tutor for your child?

For MVP phase 1, the second parent pathway can be collected but kept in waitlist mode until marketplace goes live.

---

## **13\. Notifications and communications required**

At MVP, basic notifications are necessary.

### **Tutor notifications**

* welcome email  
* invitation accepted  
* upcoming class reminder  
* quiz submitted  
* application status update  
* subscription reminder

### **Parent notifications**

* invitation received  
* child added successfully  
* upcoming class reminder  
* quiz completed / result available  
* progress summary available

### **Student notifications**

* upcoming class reminder  
* quiz assigned  
* quiz due reminder

---

## **14\. Admin requirements**

Even if hidden from users, admin tooling is essential.

## **Must-have admin abilities**

* view all tutors  
* approve / reject marketplace applications  
* view parent and student accounts  
* view classes created  
* troubleshoot join issues  
* monitor quiz usage and submissions  
* activate / deactivate accounts  
* monitor subscriptions  
* hide or publish tutor profiles

---

## **15\. Recommended MVP priorities for technical build**

## **Priority 1: foundations**

* auth and roles  
* tutor onboarding  
* parent / student invite flow  
* dashboards shell

## **Priority 2: class delivery**

* class creation  
* schedule view  
* live session integration  
* whiteboard integration

## **Priority 3: assessment and tracking**

* quiz builder  
* submissions  
* basic progress charts  
* parent visibility

## **Priority 4: billing for SaaS tutors**

* trial logic if any  
* subscription plan selection  
* payment activation

## **Priority 5: marketplace preparation**

* tutor application form  
* admin review backend  
* profile builder  
* profile approval status

---

## **16\. Practical MVP decisions still to confirm**

These need founder decisions before build begins or early during design.

1. Will live class video be built from scratch or integrated from an external provider?  
2. Will the whiteboard be native or integrated?  
3. What quiz types are in MVP?  
4. Will students have separate logins, or can they join only via parent-managed access initially?  
5. Will subscription start as free trial then paid, or paid from first full use?  
6. Will tutor marketplace profiles be public at MVP launch or only stored internally first?  
7. What minimum screening criteria will approve a marketplace tutor?

---

## **17\. Suggested founder-facing deliverables to prepare next**

To help the technical partner build efficiently, the next documents should be:

1. MVP feature prioritisation sheet: must-have, should-have, later  
2. Role-by-role user flow diagram  
3. Low-fidelity wireframe list for each page  
4. Tutor recruitment SOP  
5. Tutor profile information template  
6. Subscription and pricing logic note  
7. Admin operations checklist

---

## **18\. Recommendation summary**

The most sensible way to start TutorCourt is:

* launch as a tutor SaaS tool first  
* invite tutors from your survey pool who already have clients  
* onboard their parents and students into controlled usage  
* collect product feedback from real classes  
* simultaneously recruit and vet tutors for the future discovery marketplace  
* delay open parent marketplace search until tutor supply is strong enough

This sequence reduces operational risk and matches how real trust-based marketplaces are built.

---

## **19\. Immediate next-step checklist**

### **Product decisions**

* confirm MVP feature list  
* confirm sign-up role logic  
* confirm subscription test model  
* confirm tutor recruitment stages

### **Design decisions**

* list each required page  
* sketch page wireframes  
* map user navigation between pages

### **Build preparation**

* choose integration providers for video and whiteboard  
* define database entities  
* define admin workflows  
* define pilot tutor cohort

---

## **20\. Final note for technical partner**

This MVP is not intended to prove every part of the long-term TutorCourt vision at once. It is intended to validate two things quickly and credibly:

1. that tutors with existing clients will pay for an integrated tutoring workflow tool  
2. that TutorCourt can build a high-quality, trusted tutor supply base for future parent-side marketplace launch

Everything in this document should therefore be interpreted through an MVP lens: practical, focused, testable, and expandable.

---


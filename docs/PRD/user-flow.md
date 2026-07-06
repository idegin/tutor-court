## **21\. User flow diagram structure for technical planning**

This section converts the MVP into a flow structure the technical partner can use for architecture, navigation, and wireframing.

The best way to think about TutorCourt MVP is as two connected tracks:

* Track A: SaaS workflow for tutors with existing students  
* Track B: tutor recruitment workflow for the future marketplace

These tracks share the same authentication layer and admin backend, but their journeys differ.

---

## **22\. Global top-level user flow**

### **Entry points**

Users may enter TutorCourt from different places:

* homepage  
* invite link from tutor  
* tutor application page  
* future marketplace page  
* direct login page

### **Top-level branching**

After entry, the system should route users into one of these paths:

1. Tutor path  
2. Parent path  
3. Student path  
4. Admin path

### **Recommended top-level logic**

**Visitor arrives**  
→ clicks Sign up / Get started  
→ selects role:

* Tutor  
* Parent  
* Student

If Tutor:

* choose purpose:  
  * use TutorCourt with my existing students  
  * apply to be listed as a TutorCourt tutor  
  * both

If Parent:

* choose purpose:  
  * I was invited by a tutor  
  * I am looking for a tutor

If Student:

* sign up via tutor or parent access route

---

## **23\. Detailed user flow: Tutor SaaS path**

This is the main operational flow for the first MVP.

### **Flow A1: Tutor signs up and starts using TutorCourt with existing students**

**Landing / Home**  
→ Click “Get started as Tutor”  
→ Sign up page  
→ Role selected: Tutor  
→ Purpose selected: Use TutorCourt with my existing students  
→ Tutor onboarding  
→ Tutor dashboard

### **Tutor onboarding sub-flow**

Tutor enters:

* profile basics  
* subjects taught  
* levels taught  
* timezone / location  
* preferred teaching mode

Then system routes to:  
→ “Create your first class”

### **Flow A2: Tutor creates first class**

Tutor dashboard  
→ Click Create Class  
→ Enter class details:

* title  
* subject  
* level  
* one-time or recurring  
* date and time  
* session duration

→ Save class  
→ Class created  
→ Prompt shown: “Invite parent / student”

### **Flow A3: Tutor invites parent**

Class details page  
→ Click Invite Parent  
→ Choose invitation method:

* copy invite link  
* email invite  
* WhatsApp share

→ Invite sent  
→ Parent joins via invite flow

### **Flow A4: Tutor schedules and runs class**

Tutor dashboard / calendar  
→ Opens upcoming class  
→ Click Start Session  
→ Session room opens  
→ Uses:

* video  
* screen share  
* whiteboard  
* participant list

→ Ends session  
→ Optional post-session action:

* mark attendance  
* add session note  
* assign quiz

### **Flow A5: Tutor creates quiz**

Tutor dashboard  
→ Click Create Quiz  
→ Select class or student  
→ Add questions and answers  
→ Publish quiz  
→ Students notified  
→ Submissions received  
→ Scores recorded  
→ Dashboards updated

### **Flow A6: Tutor reviews progress**

Tutor dashboard  
→ Students list  
→ Open student profile  
→ View:

* attendance  
* quiz history  
* score trend  
* completion behaviour

---

## **24\. Detailed user flow: Parent invited by tutor**

This is the first parent path to support in MVP.

### **Flow B1: Parent receives invite**

Parent receives link from tutor  
→ Opens invite page  
→ Page shows:

* tutor name  
* class / programme context  
* brief explanation of TutorCourt

→ Click Accept Invite  
→ Parent sign-up page

### **Flow B2: Parent creates account and adds child**

Parent sign-up  
→ Create account  
→ Add child details:

* child name  
* age  
* grade / level

→ Child linked to tutor class  
→ Parent dashboard opens

### **Flow B3: Parent monitors child**

Parent dashboard  
→ Sees:

* upcoming classes  
* completed quizzes  
* latest scores  
* progress graph

→ Can open child profile  
→ Can view detailed performance trend

### **Optional MVP-lite parent flow**

At first release, parent may be view-only rather than interactive. That is acceptable if it simplifies build.

---

## **25\. Detailed user flow: Student path**

### **Flow C1: Student receives access**

Student gets access either:

* via parent-managed account  
* via direct login created by tutor / parent

### **Flow C2: Student login and dashboard**

Student login  
→ Student dashboard  
→ Sees:

* next class  
* pending quizzes  
* recent scores

### **Flow C3: Student joins class**

Student dashboard  
→ Click Join Class  
→ Session room opens  
→ Student participates in live lesson

### **Flow C4: Student takes quiz**

Student dashboard  
→ Click pending quiz  
→ Answer questions  
→ Submit  
→ Confirmation shown  
→ Results later visible according to system rules

---

## **26\. Detailed user flow: Tutor marketplace recruitment path**

This runs in parallel with SaaS usage but does not need public marketplace release yet.

### **Flow D1: Tutor applies to be listed**

Homepage / Become a Tutor page  
→ Click Apply to be Listed  
→ Tutor application page  
→ Complete recruitment form  
→ Upload intro video and optional proof documents  
→ Submit application  
→ Status \= Submitted  
→ Confirmation page

### **Flow D2: Admin reviews tutor application**

Admin dashboard  
→ Tutor applications queue  
→ Open application  
→ Review fields and uploads  
→ Decision:

* approve  
* waitlist  
* reject  
* request more information

### **Flow D3: Approved tutor completes profile**

Tutor receives approval notification  
→ Logs in  
→ Opens Profile Builder  
→ Uploads:

* profile photo  
* headline  
* bio  
* subjects  
* experience  
* intro video  
* optional LinkedIn link

→ Saves profile  
→ Status becomes Approved / Hidden or Approved / Publish-ready

---

## **27\. Detailed user flow: Future parent marketplace path**

This flow should be designed now, even if not publicly enabled in the first release.

### **Flow E1: Parent wants to find tutor**

Homepage / marketplace page  
→ Click Find a Tutor  
→ Browse tutor list  
→ Filter by:

* subject  
* level  
* location / timezone later if needed

→ Open tutor profile  
→ Review tutor details  
→ Click Express Interest / Request Contact

For first MVP, this path can be replaced with:

* “Join waitlist to find a tutor”  
* or hidden entirely until tutor supply is ready

---

## **28\. Admin flow structure**

Admin is critical because many early-stage functions will remain semi-manual.

### **Admin core flows**

**Admin login**  
→ Admin dashboard  
→ Branch to:

* Users management  
* Tutor application queue  
* Class monitoring  
* Subscription monitoring  
* Support issues  
* Tutor profile moderation

### **Admin actions needed**

* approve / reject tutors  
* view tutor, parent, and student records  
* activate / deactivate accounts  
* inspect classes and usage  
* inspect quiz activity  
* monitor subscriptions  
* publish or hide tutor profiles

---

## **29\. Navigation map by user role**

### **Tutor navigation**

* Dashboard  
* Classes  
* Calendar  
* Students  
* Quizzes  
* Profile  
* Subscription  
* Settings

### **Parent navigation**

* Dashboard  
* Children  
* Progress  
* Schedule  
* Settings

### **Student navigation**

* Dashboard  
* Classes  
* Quizzes  
* Results  
* Settings

### **Admin navigation**

* Dashboard  
* Tutor Applications  
* Users  
* Classes  
* Billing  
* Profiles  
* Support

---

## **30\. System state and branching notes for engineers**

There are several status conditions the product should recognise.

### **Tutor states**

* new tutor  
* onboarded tutor  
* active SaaS tutor  
* marketplace applicant  
* approved marketplace tutor  
* rejected marketplace tutor  
* subscription inactive  
* subscription active

### **Parent states**

* invited parent  
* registered parent  
* parent with one child  
* parent with multiple children  
* parent seeking tutor later

### **Student states**

* invited student  
* active student  
* quiz pending  
* class scheduled

### **Tutor profile states**

* draft  
* submitted for review  
* approved hidden  
* published

### **Application states**

* submitted  
* under review  
* more info requested  
* approved  
* rejected  
* waitlisted

These states will help engineers define permissions, dashboard messages, and routing.

---

## **31\. Simplified engineering flow summary**

This can be handed to the technical partner as the shortest practical logic view.

### **SaaS flow**

Tutor signs up  
→ creates class  
→ invites parent  
→ parent adds child  
→ student joins class  
→ tutor teaches via session room  
→ tutor assigns quiz  
→ student submits quiz  
→ parent and tutor view progress

### **Marketplace supply flow**

Tutor signs up  
→ applies to be listed  
→ admin reviews application  
→ approved tutor completes profile  
→ tutor enters hidden approved pool  
→ public listing later

---


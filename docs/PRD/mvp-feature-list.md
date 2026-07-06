# **Final TutorCourt MVP Feature List**

Below is the **clean feature list you should give to your technical partner**.

I have separated them into:

* **Core MVP (Must Build Now)**  
* **Important but Can Wait**  
* **Definitely Later**

This prevents feature creep.

---

# **1\. Core MVP Features (Must Build Now)**

These features are required to launch the **SaaS tutoring workspace** and begin **tutor recruitment**.

---

# **A. Authentication & Account System**

### **Role Selection at Sign-Up**

Users must choose:

* Tutor  
* Parent  
* Student

If **Tutor**, they choose:

* Use TutorCourt with my existing students  
* Apply to be listed as a TutorCourt tutor  
* Both

---

### **Account Creation**

Required fields:

**Tutor**

* Name  
* Email  
* Phone  
* Password  
* Country  
* Subjects taught  
* Levels taught

**Parent**

* Full Name  
* Email  
* Phone

**Student**

* Full Name  
* Age  
* Grade / level

---

# **B. Tutor Workspace (SaaS Core)**

This is the **most important module**.

### **Tutor Dashboard**

Displays:

* Upcoming classes  
* Students  
* Recent quiz results  
* Notifications  
* Quick buttons:  
  * Create class  
  * Invite parent  
  * Create quiz

---

### **Class Creation System**

Tutor can:

* Create a class  
* Set subject  
* Set level  
* Set schedule  
* Add students  
* Generate class session

---

### **Calendar / Schedule**

Tutor sees:

* Upcoming classes  
* Past sessions  
* Class reminders

Parents and students see:

* their class schedule

---

# **C. Live Class Session**

When class starts:

Tutor opens **Session Room**

Session includes:

* Video conferencing  
* Screen sharing  
* Digital whiteboard  
* Participant list  
* End session button

**Important:**  
Video and whiteboard should **not be built from scratch**.

Integrate existing solutions such as:

* WebRTC solution  
* Zoom SDK  
* Daily.co  
* LiveKit

---

# **D. Digital Whiteboard**

Essential for:

* Mathematics  
* Science  
* Diagram explanations

Minimum features:

* Draw  
* Erase  
* Shapes  
* Text  
* Screen share

---

# **E. Student Invitation System**

Tutor must be able to:

* Invite parents via link  
* Invite via email  
* Share invite link via WhatsApp

Parent then:

1. Creates account  
2. Adds child  
3. Child joins class

---

# **F. Quiz & Assessment Module**

Tutor must be able to:

### **Create Quiz**

Quiz fields:

* Quiz title  
* Linked class  
* Questions  
* Answers  
* Marks

---

### **Quiz Types (MVP)**

Start with:

* Multiple choice  
* Short answer

Later you can add more.

---

### **Student Submission**

Student can:

* Take quiz  
* Submit answers

System records:

* Score  
* Date  
* Attempt

---

# **G. Progress Tracking Dashboard**

This is **a major differentiator**.

Tutor and parent must see:

### **Student Progress Data**

* Quiz history  
* Score trends  
* Attendance  
* Completion rate

Display as:

* Score history table  
* Simple progress chart

---

# **H. Parent Dashboard**

Parent can:

* See child's classes  
* See quiz scores  
* See progress chart  
* See upcoming classes

This builds **trust and transparency**.

---

# **I. Tutor Subscription System**

Basic subscription system:

Tutor can:

* Choose plan  
* Activate subscription  
* View billing status

Keep it simple.

You only need:

* Monthly plan  
* Per-student logic later

Integrate payment with:

* Stripe  
* Paystack  
* Flutterwave

---

# **J. Tutor Marketplace Recruitment**

Even though the marketplace is not public yet, you must start **recruiting tutors now**.

---

### **Tutor Application Form**

Fields:

* Name  
* Email  
* Phone  
* Subjects  
* Levels  
* Years of experience  
* Teaching qualifications  
* Online teaching experience  
* Short bio  
* LinkedIn (optional)  
* Intro video upload  
* Country / timezone  
* Availability

---

### **Tutor Application Status**

Status types:

* Submitted  
* Under review  
* Approved  
* Waitlisted  
* Rejected

---

### **Tutor Profile Builder**

Approved tutors can create:

* Profile photo  
* Headline  
* Bio  
* Subjects  
* Experience  
* Intro video

These profiles remain **hidden initially** until marketplace launch.

---

# **K. Admin Dashboard**

Internal team must be able to:

### **Manage Tutors**

* Approve tutor applications  
* Reject applications  
* View tutor profiles

---

### **Manage Users**

Admin can:

* View tutors  
* View parents  
* View students

---

### **Monitor Platform**

Admin can see:

* Classes created  
* Quiz usage  
* Active tutors  
* Subscription status

---

# **2\. Important but Can Wait**

These are useful but **not required for first MVP**.

* Chat messaging system  
* Parent search for tutors  
* Tutor ratings & reviews  
* Automated tutor matching  
* Homework submission with file uploads  
* Tutor analytics dashboard  
* Referral reward automation

---

# **3\. Definitely Later**

Do **not** build these now.

* Mobile apps  
* AI tutoring  
* AI grading  
* Video recording of classes  
* Multi-tutor academies  
* Parent payment escrow system  
* Tutor commission engine

These will come **after product-market fit**.

---

# **Summary of MVP Modules**

Your MVP will consist of **8 modules**.

1️⃣ Authentication & roles  
2️⃣ Tutor dashboard  
3️⃣ Class scheduling system  
4️⃣ Live session room  
5️⃣ Whiteboard tool  
6️⃣ Quiz / assessment module  
7️⃣ Progress tracking dashboards  
8️⃣ Tutor recruitment & profile system  
9️⃣ Admin dashboard  
🔟 Subscription system
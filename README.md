# Skill Progress Portfolio (Campus Skill Exchange)

An interactive, modern web platform designed for students to share skills, learn through embedded **video tutorials**, clear doubts directly beside lessons, and connect with peer mentors.

---

## ✨ Features & Capabilities

1. **🎬 Video Learning Classroom & Syllabus**:
   - Every skill features an interactive video tutorial (YouTube embed, Vimeo, Loom, or direct video).
   - Once signed in, students unlock the full **Interactive Video Classroom** with structured syllabus topics and duration.
   - Video view counts are tracked live for student learning progress.

2. **💬 Q&A Doubts Discussion Beside the Video**:
   - Right beside the video player is a dedicated **Lesson Doubts & Discussion Panel**.
   - Students can ask questions / doubts directly related to the video lesson.
   - Mentors and peers can answer doubts with threaded replies.
   - Doubts display `Answered` or `Pending` status badges in real time.

3. **📹 Teach Others with Video Format**:
   - In **Offer Skills**, students can upload/share their knowledge by providing:
     - Skill Title & Category
     - Proficiency Level
     - Video Lesson Link / Embed URL (with one-click presets for web dev, Figma, and MERN)
     - Approximate lesson duration
     - Bullet-point syllabus checklist
     - Mentorship description

4. **🔒 Authentication Gating (Access Control)**:
   - Visitors can browse the marketplace and previews in read-only guest mode.
   - **Signed-in students** get:
     - Access to watch the full video lessons and view complete syllabi.
     - Ability to post doubts in the classroom discussion panel beside the video.
     - Access to publish skills and upload video lessons.
     - Access to submit learning requests and send 1-on-1 mentorship requests.

5. **🛡️ 100% Separate Administrator Portal (`/admin`)**:
   - The Admin Portal is **completely separated** from student pages — no admin buttons clutter the student navigation bar.
   - Accessible strictly at: **`http://localhost:5000/admin`**
   - **Track Student Progress**:
     - 8 KPI cards: Total Students, Skills, Video Lessons, Video Views, Doubts Asked, Doubts Answered, Requests, and Matches.
     - **Video Lessons Progress Table**: Monitor each skill's video status, view count, and question count.
     - **Student Doubts Oversight**: Inspect every question asked across all video lessons with filter by answered/pending.
     - **Moderate Content**: Delete spam skills or requests.
     - **User Directory**: View student accounts, join dates, and manage admin roles.
     - **Campus Broadcast Notice**: Update announcement banners visible on student pages.
     - **Live Audit Trail**: Chronological event stream tracking views, doubts, replies, and signups.

---

## 🔑 Demo Accounts

| Portal | URL | Username / Email | Password | Role |
|---|---|---|---|---|
| **Student Portal** | [http://localhost:5000](http://localhost:5000) | `Raghava` or `raghava@campus.edu` | `password123` | Student |
| **Separate Admin Portal** | [http://localhost:5000/admin](http://localhost:5000/admin) | `admin` or `admin@campus.edu` | `admin123` | Administrator |

---

## 🏃 Running the Application

```bash
npm start
```
- **Student Platform:** [http://localhost:5000](http://localhost:5000)
- **Separate Admin Portal:** [http://localhost:5000/admin](http://localhost:5000/admin)

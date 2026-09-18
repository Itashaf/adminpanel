# Exam Module — UI Rebuild Prompt

Copy everything below and give it to whichever tool/designer you use to rebuild the UI. It explains the exact flow, screens, and data so the new UI matches what the backend already does.

---

## The Big Picture

There are 3 people involved, in this order:

```
ADMIN                    TEACHER                   ADMIN                  PARENT
creates exam      →      enters marks       →      verifies marks    →    views result
+ schedules              + submits                 + generates result
+ publishes exam                                    + publishes result
```

Nothing skips a step. A Teacher can't enter marks until the Admin publishes the exam. A Parent can't see a result until the Admin publishes it. Once Admin approves marks, the Teacher can't touch them again unless Admin unlocks.

---

## Roles & What Each One Does

### 1. Admin — Exam Setup

**Screen: Exam Dashboard**
Shows at a glance: Total Exams, Upcoming Exams, Completed Exams, Results Pending, a marks-entry progress bar, and a "Recent Activity" feed. One big "+ Create Exam" button.

**Screen: Manage Exams (list)**
Table/list of every exam with filters (Session, Class, Status, Type). Each row: name, type, session, date range, classes, status badge (Draft/Published/Completed). Row actions: View, Edit, Delete, Publish, Duplicate.

**Screen: Create/Edit Exam (form)**
Fields: Exam Name, Academic Session, Exam Type (free text allowed — schools use their own codes like SA1, FA1, PT1, not a fixed list), Start Date, End Date, Applicable Classes (multi-select checkboxes, with a "Select all" toggle), Description.
Status starts as **Draft** — nothing else can happen until Admin flips it to **Published**.

**Screen: Exam Detail (per exam)**
This is the hub for one exam. Shows the exam's own info + three sub-sections:
- **Subjects & Schedule** — the actual date sheet. A table of rows, each row = one subject + class + section combo: Subject, Class, Section (or "whole class" if blank), Exam Date, Start/End Time, Max Marks, Passing Marks, Theory/Practical, Room, Invigilator. Admin adds one row per subject via a small form. This is what a Teacher's marks-entry screen and a Parent's schedule view both read from.
- **Marks Entry Progress** — per subject, a progress bar: "X / Y entered", pending count, absent count.
- Buttons to jump to **Verify Marks** and **Results** (below).

**Screen: Marks Verification**
Admin picks Class → Section → Subject (this resolves to one row in the date sheet above). Sees every student's entered mark, with status (Submitted / Approved / Rejected). Actions: **Approve** (locks the marks, teacher can no longer edit), **Reject** (must give a reason — sends it back to the teacher to fix), **Unlock** (undoes an approval if Admin made a mistake).
Important: approve/reject/unlock happens for the whole subject+class+section at once, not one student at a time.

**Screen: Results**
Button: **Generate Results** — calculates each student's total, percentage, grade, pass/fail from every subject that's been Approved. A student with even one un-approved subject is skipped (so results are never based on incomplete marks). Table shows every student: total marks, %, grade, pass/fail, status (Draft/Published). Button: **Publish Results** (parents can now see it) / **Unpublish** (hide it again).

---

### 2. Teacher — Marks Entry (this is the screen that gets used most, make it fast on mobile)

**Screen: Marks Entry**
Flow: pick **Exam** → pick **Class** → tap the **Subject** you teach there (a Teacher only ever sees subjects/classes they're actually assigned to — never someone else's).

Then the actual entry screen:
- Header: back button, subject + class name, exam name, a live "Saving... / Saved 2:45 PM" status (auto-saves quietly every couple seconds, no manual save-button-spam needed).
- A compact progress bar: "X / Y entered", pending count.
- Search box (by name or roll number) + filter chips: All / Pending / Entered / Absent.
- One compact row per student: roll number, name, a small numeric input for marks, an "Absent" toggle button, a checkmark once entered. Numeric keyboard on mobile. Pressing Enter jumps to the next student. Entering more than the max marks shows an inline error right there.
- A row that's already been Approved by Admin is grayed out with a lock icon — can't be edited.
- Sticky bottom bar: **Save Draft** (manual save) and **Submit Marks** (locks it in as "ready for review" — but Admin can still Reject it back if needed). If some students are still blank when submitting, show a confirmation: "N students have pending marks. Submit anyway?"

---

### 3. Parent — Result View

**Screen: Exam Home**
Two cards at the top: **Next Exam** (name + date range + "View Schedule" link) and **Latest Result** (percentage + grade + Pass/Fail + "View Result" link). Below that, a plain list of every exam announced for their child's class.

**Screen: Exam Detail (per exam)**
One screen, two parts:
- **Result** (only shows if Admin has published it — otherwise says "not published yet"): total marks, percentage, grade, pass/fail, and a subject-wise breakdown table (subject name, marks/max, or "Absent").
- **Schedule**: the date sheet for their child's class — subject, date, time, room.

A parent can only ever see exams/results for their own child's class — never another class's data.

---

## Data You'll Need Per Screen (so the design has real fields to work with)

- **Exam**: name, academicSession, examType, startDate, endDate, classes[], description, status (Draft/Published/Completed)
- **Schedule row**: subject, className, sectionName, examDate, startTime, endTime, maxMarks, passingMarks, mode (Theory/Practical), room, invigilator
- **Mark row** (one per student per subject): studentId, marksObtained (or null), isAbsent, status (Draft → Submitted → Approved/Rejected → Published)
- **Result** (one per student per exam): totalMarks, totalMaxMarks, percentage, grade, isPass, status (Draft/Published)

## Explicitly Not Needed (keep it simple)

No online exam / question papers, no OMR, no ranking system, no AI predictions, no fancy report-card PDF designer, no per-student approve/reject (it's per subject+class+section), no syllabus feature (doesn't exist in this system).

---

If you want the exact current screen-by-screen implementation as a reference while redesigning, the working routes are:
- Admin: `/dashboard/exams`, `/dashboard/exams/list`, `/dashboard/exams/[id]`, `/dashboard/exams/[id]/verify`, `/dashboard/exams/[id]/results`
- Teacher: `/dashboard/marks-entry`
- Parent: `/parent/exams`, `/parent/exams/[id]`

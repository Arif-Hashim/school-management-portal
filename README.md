# Northstar School Portal

A role-based school management MVP built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, and secure signed sessions.

## Included

- Four role-aware dashboards: administrator, teacher, student, and parent
- Email/password sign-in with bcrypt password verification and HTTP-only JWT session cookies
- MongoDB models for users, classes, students, attendance, exams, and marks
- Admin and assigned-teacher class attendance marking (present, absent, late), with server-side class/student validation
- School student/class lists, upcoming exams, and role-specific dashboard summaries
- Responsive layout with mobile navigation
- Demo seeding script

## Run locally (Windows PowerShell)

1. Install Node.js 20 or newer and create a MongoDB Atlas database.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI` and a random `JWT_SECRET` (at least 32 characters).

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Install dependencies and seed demo records:

   ```powershell
   npm install
   npm run seed
   npm run dev
   ```

4. Open `http://localhost:3000`.

Demo accounts (password for all is `School123!`):

| Role | Email |
| --- | --- |
| Admin | `admin@northstar.edu` |
| Teacher | `teacher@northstar.edu` |
| Student | `student@northstar.edu` |
| Parent | `parent@northstar.edu` |

Change demo passwords and remove seed-only accounts before deploying. Keep `.env.local` and credentials out of Git.

## Deployment

Set `MONGODB_URI` and a unique, random `JWT_SECRET` in the Vercel project environment variables, deploy, then run `npm run seed` against the intended database only when you want demo records. Restrict Atlas network access to the hosts you need.

## Current scope

This is the Phase 1 foundation. Attendance, role-based dashboards, authentication, and demo data are included. Admissions CRUD, marks entry/report cards, fee and payroll workflows, timetable and homework management, and SMS/WhatsApp/email delivery remain planned follow-on modules; the `Exam` and `Mark` data models are ready for those additions. Notifications are not sent by this MVP.

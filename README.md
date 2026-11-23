# Northstar School Portal

A role-based school management application built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, and signed HTTP-only sessions.

## Included

- Four role-aware dashboards with secure sign-in
- MongoDB records for users, classes, students, attendance, and exams
- Administrator and assigned-teacher attendance workflows
- Fee assignments and student/parent fee views
- Monthly staff payroll records and teacher payroll views
- Class timetables and homework assignments
- School notices and in-app notifications
- Downloadable PDF report cards for student and parent accounts
- Responsive interfaces and server-side role/ownership validation

## Run locally (Windows PowerShell)

1. Install Node.js 20 or newer and configure a MongoDB Atlas database.
2. Copy `.env.example` to `.env.local` and set `MONGODB_URI` and a random `JWT_SECRET` (at least 32 characters).

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Install dependencies, seed demo records, and start the app:

   ```powershell
   npm install
   npm run seed
   npm run dev
   ```

4. Open `http://localhost:3000`, sign in, and select **School tools** from the dashboard.

Demo accounts (password for all is `School123!`):

| Role | Email |
| --- | --- |
| Admin | `admin@northstar.edu` |
| Teacher | `teacher@northstar.edu` |
| Student | `student@northstar.edu` |
| Parent | `parent@northstar.edu` |

## Security and deployment

Set `MONGODB_URI` and a unique `JWT_SECRET` in Vercel environment variables. Keep local secrets out of Git. Replace demo passwords and remove seed-only records before production use. Configure Atlas access for your deployment environment.

Notices create in-app notification records for the selected audience. Email, SMS, and WhatsApp delivery are not configured in this release; connect a delivery provider and establish consent, templates, and opt-out handling before enabling external messages. Payroll records track scheduled amounts and payment status; no bank transfers or payment collection are performed.

## Phase 2 scope

Fees and payroll can be recorded and viewed by permitted roles. Timetable and homework entries can be managed by administrators and assigned teachers. Notices are distributed in-app. Student/parent-linked accounts can download report cards as PDFs using available marks and attendance records. Payment settlement workflows, payroll disbursement, marks-entry UI, external message delivery, and edit/delete screens are follow-up work.

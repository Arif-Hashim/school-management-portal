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
- Consent-based email and WhatsApp notice delivery
- Wise sandbox payroll transfer creation

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

## Phase 3 integrations

### Wise payroll disbursement

Configure `WISE_ENVIRONMENT=sandbox`, `WISE_API_TOKEN`, and `WISE_PROFILE_ID`. Administrators can create a Wise sandbox transfer for a draft payroll record with `POST /api/payroll/{payrollId}/wise`, providing `recipientId` and ISO 4217 `currency`. The endpoint is hardcoded to Wise's sandbox API, records an idempotent attempt, and reports the Wise transfer as created but not funded. It never marks payroll paid and cannot send a production transfer. Configure sandbox recipient accounts and funding in Wise before testing.

### SendGrid email and Twilio WhatsApp

Users can set their own delivery preferences using `POST /api/communications` with `emailOptIn`, `whatsappOptIn`, and an optional E.164 `phone`. Preferences default to opted out. An administrator can send a notice using `PUT /api/communications` with `title`, `message`, and `audience` (`all`, `parent`, `student`, or `teacher`). Delivery is limited to active users who opted in to the selected channel. Configure `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` to enable providers. WhatsApp users must have separately opted in under applicable provider policies. Unconfigured providers are skipped; provider failures are reported without exposing secrets.

### Vercel deployment

This app uses Next.js App Router route handlers with Node.js runtime for integrations, so it can deploy using Vercel's standard Next.js build. Set `MONGODB_URI`, `JWT_SECRET`, and only the provider credentials you use in Vercel Project Settings → Environment Variables. Keep Wise sandbox credentials only; never supply production Wise tokens. Configure Atlas network access for Vercel and redeploy after changing environment variables. No persistent local filesystem or background process is required by these integrations.

## Security and deployment

Keep local secrets out of Git. Replace demo passwords and remove seed-only records before production use. Communication preferences are opt-in and users may turn either channel off by setting its value to `false`. API keys are server-side only and must never use `NEXT_PUBLIC_` prefixes.

## Checks

Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.

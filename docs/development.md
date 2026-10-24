# After Care

A Next.js PWA for the everyday steps after hospital discharge. Nurses create and review a personal care plan; patients and caregivers use separate hospital-issued credentials to follow the same schedule.

## Run locally

Requires Node.js 24.x and npm, matching the Vercel deployment runtime.

```sh
npm install
npm run dev
```

Open **http://localhost:3000** for the public landing page, **http://localhost:3000/present** for the keyboard-controlled project presentation, and **http://localhost:3000/workspace** for the care application. Without Supabase configuration, the workspace uses clearly labeled fictional demo data. Use the view selector to explore the patient, caregiver, and nurse experiences. The demo stores records and hashed credentials on the local server in the ignored `.data/` directory. It is for local evaluation, not real patient records or multiple server instances.

The **Nurse view → New discharge** workflow creates working demo accounts. Use the generated sign-in details at `/login` to test the patient and caregiver separately. The role selector is available only to demo accounts, and demo access is disabled when either Supabase setting is supplied.

## Included in this phase

- Patient dashboard with daily progress, medications, recovery activities, and upcoming follow-ups.
- Nurse patient roster, search, text instructions, and browser-supported voice dictation.
- Editable discharge draft with medications, exact daily reminder times, inclusive start/end dates, general care instructions, warning signs, and follow-up appointments.
- Required nurse review before publication and credential creation. Generated passwords are shown once and can be copied or downloaded in a private access sheet.
- Separate patient/caregiver access to one shared care plan. Completion records include the person and date; duplicate submissions cannot count a dose twice. Visible plans refresh every 30 seconds and when the tab becomes active.
- Medication supply estimates from the starting quantity, completed doses, and recorded refills. Refill recording is also idempotent.
- Appointment calendar export and a printable care plan.
- Care assistant grounded in the reviewed plan. With no AI key, a clearly labeled plan guide retrieves existing instructions without pretending to generate AI answers.
- Installable PWA manifest, app icons, service worker, and a connection-loss screen. Patient data and authenticated HTML are deliberately never cached offline.
- Web Push subscription, patient and caregiver reminders, refill alerts, appointment reminders, and follow-ups for unchecked tasks. Delivery needs the production configuration below.

Daily tasks repeat every day between their selected dates. This phase does not implement as-needed medication decisions, taper schedules, alternating-day courses, symptom monitoring, automatic treatment changes, messaging clinicians, pharmacy orders, or SMS/email delivery.

## Server-only database access

```text
Browser → /api/* (Next.js) → authenticated role/record checks → Supabase
```

All application database reads and writes happen in `src/lib/server/` and Next.js route handlers. There is no browser Supabase client, no browser database key, and no direct browser table operation. `server-only` imports enforce the boundary. Supabase Auth access and refresh tokens use HttpOnly, SameSite cookies. Server endpoints authorize every record against the signed-in nurse, patient, or caregiver.

The migration enables RLS and revokes table access from both `anon` and `authenticated`. The server service role accesses the tables only after application-level authorization. Staff status comes from `staff_members`, never user-editable auth metadata. Completion and refill events are paginated so PostgREST row limits cannot silently corrupt inventory estimates.

## Connect Supabase

1. Copy `.env.example` to the ignored `.env.local`.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your project's URL and server-side service role/secret key. Do not add a `NEXT_PUBLIC_` prefix.
3. Apply `supabase/migrations/202610240001_after_care.sql` through your Supabase migration workflow. This initializes the schema; application table operations continue to use Next.js only.
4. Set `APP_URL` to the exact origin used by the browser, including scheme and port. On Vercel, leave it unset for automatic deployment domains or set the production HTTPS origin. See the [Vercel deployment guide](vercel-deployment.md).
5. Restart Next.js.

The schema includes `staff_members`, `care_records`, `care_completions`, `care_refills`, `push_subscriptions`, and `reminder_deliveries`.

### Provision a hospital nurse

Set a long, random `STAFF_PROVISIONING_SECRET` on the server temporarily. The hospital administrator can provision a nurse through:

```http
POST /api/admin/staff
Authorization: Bearer <STAFF_PROVISIONING_SECRET>
Content-Type: application/json

{"name":"Emily Wilson","email":"nurse@your-hospital.example"}
```

The response contains a generated password once. Keep it private and share it using the hospital's approved channel. Unset the provisioning secret afterward; the endpoint is disabled without it. Nurses then create patient and optional caregiver accounts in the application. Credential creation compensates already-created Auth accounts if saving a discharge fails.

## Connect AI when ready

Add your `OPENAI_API_KEY` to `.env.local` or the deployment's secret manager and restart the app. `OPENAI_MODEL` defaults to `gpt-4.1-mini` and can be changed to a model supporting the Responses API and structured outputs.

The organizer requests structured output and validates it with Zod. The nurse must review the result before publication. Missing clinical details are intended to be preserved as notes and raised as clarifications, rather than inferred. The care assistant cannot modify the plan or contact anyone. Live extraction and care-assistant calls have been verified with fictional instructions. If the provider returns a quota or billing error, add API credits before retrying; the manual plan editor remains available.

Record identifiers, patient names, and account emails are omitted from the constructed AI context, but the supplied clinical notes, plan content, and patient questions are sent to OpenAI when connected. Those free-text fields may themselves contain identifying information. Configure the appropriate provider arrangements and hospital workflow before using real records.

Voice dictation uses the browser's SpeechRecognition service when supported (typically Chrome/Edge), requires microphone permission, and may send audio to the browser provider. Text entry remains available.

### Working without an AI key

The **Enter plan manually** action always opens an editable draft with the original notes, including when AI is unavailable. Free text is preserved as care notes. The structured import recognizes these line formats; replace template examples with the actual discharge instructions:

```text
Summary: Exact recovery summary
Medication: Name | Exact prescribed dose | Units per dose | Starting quantity | 08:00,20:00 | Instructions | 2026-11-01
Activity: Task title | 10:00 | Therapist instructions | 2026-11-01
Care: Task title | 18:00 | Care instructions | 2026-11-01
Check-in: Task title | 21:00 | Check-in instructions | 2026-11-01
Follow-up: Visit title | Clinician | 2026-11-01 | 10:30 | Clinic location | Preparation notes
General: One instruction
Warning: One hospital-provided warning or contact instruction
```

The starting supply and units per dose must use the same unit. Reminder times use the patient's timezone. Unstructured lines do not automatically become medication schedules; nurses can add and edit those explicitly in the review form.

## Background reminders and PWA installation

1. Configure Supabase and deploy with HTTPS. Localhost also supports service workers for development.
2. Generate missing Web Push keys and a cron secret privately in `.env.local` with `npm run setup:push`. Existing values are preserved.
3. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a valid `VAPID_SUBJECT` contact such as `mailto:care@your-hospital.example`.
4. Set a long, random `CRON_SECRET`.
5. Schedule a server request **every five minutes** to `GET /api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`. Use your hosting provider's scheduler or another trusted scheduler. For a single manual run, `npm run reminders` calls the same endpoint using server environment values.
6. Patients and caregivers each sign in and enable notifications on their own devices from the bell menu. On iPhone/iPad, install from Safari using **Share → Add to Home Screen** before enabling Web Push where supported.

The scheduler uses each patient's timezone. Task reminders are eligible within 15 minutes of the scheduled time, and an unchecked-task reminder is eligible 60–75 minutes later. Refill and same-day/next-day appointment notices are eligible at 09:00–09:15. These windows require the five-minute scheduler. The default Vercel config uses an external scheduler; the optional `vercel.pro.json` includes Vercel's five-minute cron for Pro/Enterprise. See the [deployment guide](vercel-deployment.md). A prolonged outage can miss a reminder window, and browser/OS push delivery is not guaranteed.

Both linked accounts receive due reminders on subscribed devices. Completed tasks are excluded. A database claim lease and a per-device delivery key prevent overlapping job runs from duplicating normal deliveries; failed sends can retry and expired subscriptions are removed. A crash after delivery but before acknowledgment can still retry, so OS notification tags also collapse matching notices. Lock-screen payloads are generic and contain no medication names or patient details.

Installation works from the sidebar button when the browser exposes an install prompt, with platform instructions otherwise. Offline mode provides a connection screen, not an offline clinical record. Keep hospital discharge instructions independently available.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

For the browser workflow tests, start `npm run dev` without provider credentials in another terminal, then:

```sh
npx playwright install chromium
npm run test:e2e
```

`PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an existing Chromium executable. `TEST_BASE_URL` optionally changes the local test server. These tests create fictional QA discharge records in the demo store and never need real patient data or live provider keys. Run them only against a local demo workspace. Browser output files go to the operating system's temporary directory.

The end-to-end checks cover nurse approval and account creation; separate credential login; patient isolation; caregiver synchronization; duplicate check-offs and refills; calendar download; the non-AI guide; urgent-concern escalation; sign-out; mobile navigation; notification setup status; and offline recovery. Unit tests cover timezone/date boundaries, reminder windows, inventory, and plan validation. Supabase, OpenAI, real microphone input, actual device installation, and delivered push notifications require separate live-environment checks after configuration.

### Connected session regression

For an app already connected to Supabase, `tests/connected-auth.spec.ts` checks a real nurse sign-in, removes the access cookie to force refresh, and verifies that server database access still works. This guards against accidentally using the refreshed patient/staff session as the database service client. It is skipped by default and does not create or delete patient records.

In PowerShell, with the connected app running:

```powershell
$env:AFTERCARE_LIVE_TESTS = 'true'
npx playwright test tests/connected-auth.spec.ts
```

The test reads `.data/nurse-access.txt`, or the path in `NURSE_ACCESS_FILE`. When a development nurse is provisioned during setup, this ignored file contains the sign-in address, email, and generated password. Never commit it. Nurse accounts themselves are managed by Supabase Auth; the file is a local access copy. No API keys or nurse passwords are included in test output.

## Design

The implemented patient dashboard follows the generated [interface concept](interface-concept.png): sage landscape, white sidebar, teal actions, daily timeline, care-assistant panel, and care team. The standalone landscape was generated with the built-in image tool and saved at `public/recovery-landscape.png`; UI controls and text are native React components. Inter is self-hosted, with its license in `public/fonts/OFL.txt`.

## Deployment scope

For Vercel, follow [Deploy After Care on Vercel](vercel-deployment.md). `vercel.json` configures the framework, reproducible installation, and environment checks before the production build. `vercel.pro.json` additionally enables five-minute cron on a suitable paid plan. Nurse credentials stay in Supabase Auth; the ignored local access file is never deployed.

Other Node-compatible Next.js hosts can use `npm run build` and `npm start`. The demo is always disabled on Vercel. Outside Vercel, production demo access requires `ALLOW_DEMO=true` for a local evaluation without Supabase. The local demo file store does not provide production durability or horizontal scaling.

This is a functional phase-one implementation. Live hospital rollout still needs the configured-provider checks above and hospital decisions about identity recovery, clinical validation, records retention, audit access, monitoring, and operating procedures. The app's in-memory request throttling is per server process; configure host-level rate limiting for a public deployment.

Implementation references: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Supabase server-side account creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser), and [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

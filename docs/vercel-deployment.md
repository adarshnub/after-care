# Deploy After Care on Vercel

The repository includes `vercel.json` for a standard Next.js deployment using Node.js 24, `npm ci`, and a checked production build. The app needs server functions; do not configure a static export or change the output directory. All Supabase operations continue through the Next.js backend.

## 1. Import and configure

Push the project source to your Git repository, then import it in Vercel. Choose the repository root and the **Next.js** framework preset. Keep the build settings from `vercel.json` and select **Node.js 24.x**. Alternatively, link the project with `npx vercel link`.

`.env.local`, `.data/` (including nurse credentials), and `.vercel/` are ignored by Git. `.vercelignore` also excludes local secrets and demo files from CLI uploads. Do not copy development access files into `public/`.

In **Project Settings → Environment Variables**, set the following for **Production**:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Existing Supabase project's HTTPS URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing server-side service role/secret key |
| `OPENAI_API_KEY` | Your working OpenAI API key |
| `OPENAI_MODEL` | Your currently tested model from `.env.local` |
| `APP_URL` | Exact production HTTPS origin, e.g. `https://care.example.org`; or leave unset to use automatic Vercel domains |
| `VAPID_PUBLIC_KEY` | Generated Web Push public key |
| `VAPID_PRIVATE_KEY` | Matching private key; keep private |
| `VAPID_SUBJECT` | Real hospital contact, e.g. `mailto:care@hospital.example` |
| `CRON_SECRET` | Random secret of at least 32 characters |

Use the values in your private `.env.local`; local files are not automatically transferred to Vercel. Never prefix the service key or AI key with `NEXT_PUBLIC_`. Do not import `APP_URL=http://localhost:3000` into Vercel. Leave `ALLOW_DEMO` unset or `false`, and leave `STAFF_PROVISIONING_SECRET` unset unless creating a nurse. Redeploy after environment changes.

Generate missing push keys and a cron secret locally with:

```sh
npm run setup:push
```

This updates only missing values in the ignored `.env.local`, prints variable names rather than secret values, and preserves existing keys. Set a real `VAPID_SUBJECT` before using notifications. Keep the same VAPID pair across redeployments; rotating it requires devices to subscribe again.

The environment check runs before every Vercel build. It fails for missing Supabase configuration, localhost URLs, an enabled file demo, or partial push configuration. AI and Web Push can be omitted entirely for a deployment using manual plans and in-app reminders; the check reports those limitations.

## 2. Database and sign-in

The migration has already been applied to your current Supabase project. Deploying this app against the **same project** needs no new migration and preserves the existing nurse account. Sign in at `https://YOUR_DOMAIN/login` using the existing nurse credentials saved locally in `.data/nurse-access.txt`. That file stays on your computer; Supabase Auth manages the actual account.

For a different Supabase project, apply `supabase/migrations/202610240001_after_care.sql` first and provision a nurse through the backend endpoint described in the main README. Do not rerun the initial migration against an initialized database.

Vercel preview URLs and branch aliases are accepted automatically using Vercel's system environment variables. Keep **Automatically expose System Environment Variables** enabled. For Preview, use a separate test Supabase project and test provider keys, with `APP_URL` unset. Never give an untrusted preview deployment production credentials. Only domains from `APP_URL` and the current Vercel environment are accepted for browser mutations; no wildcard origin is allowed. Redirect additional production aliases to the configured canonical domain.

## 3. Schedule reminders

The default `vercel.json` has no cron job, so it can deploy on Hobby or paid plans. Background reminders require a scheduler **every five minutes**, the VAPID values above, and a `CRON_SECRET`. Merely deploying does not schedule reminders.

### External scheduler

Configure a trusted scheduler to request:

```http
GET https://YOUR_PRODUCTION_DOMAIN/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Use the canonical production URL directly, no redirects. Keep the bearer secret in the scheduler's secret storage. If deployment protection covers production, configure the scheduler with Vercel's protection bypass as well; `CRON_SECRET` only authenticates the application endpoint. Do not schedule preview URLs against the production database.

### Vercel Pro or Enterprise cron

`vercel.pro.json` includes the same build settings plus the five-minute reminder job. Deploy from the project root using:

```sh
npx vercel --prod --local-config vercel.pro.json
```

For Git-driven deployments, copy the `crons` array from `vercel.pro.json` into `vercel.json`, commit it, and deploy. Vercel supplies the `Authorization: Bearer <CRON_SECRET>` header automatically. Cron runs on production deployments.

Hobby's built-in cron only permits daily runs, which cannot meet this application's reminder windows. Adding the five-minute job to a Hobby project will fail deployment. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Each reminder invocation has a 60-second function budget. The current implementation processes records sequentially; monitor runtime and failures as usage grows. A larger patient population needs bounded queue workers before it outgrows this function budget. Push is subject to browser permissions, OS delivery, and scheduler availability; it is not a guaranteed alarm.

## 4. Verify the deployment

1. Open `/login`, sign in as nurse, and confirm the correct patient roster.
2. Create a fictional discharge; review AI output and use its generated patient/caregiver accounts to verify the shared plan and check-offs. Test credentials are generated by the server.
3. Confirm `/manifest.webmanifest`, `/sw.js`, and the app icons load over HTTPS. Install the app and enable notifications separately on patient and caregiver devices. On iOS, install from Safari first.
4. Confirm an unauthenticated call to `/api/cron/reminders` returns `401`. Invoke it with the scheduler secret and verify a successful JSON response; actual push needs a subscribed device and a reminder in its eligible time window.
5. Check Vercel function logs and scheduler history for failures. API responses must use `Cache-Control: no-store`. Browser network requests should reach `/api/*`, never Supabase tables directly.

Local build checks:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm run check:deploy` validates production configuration. On your computer it reads `.env.local`, so the development `APP_URL=http://localhost:3000` intentionally fails this check; supply the intended HTTPS origin when checking deployment settings. `npm run dev` continues to use localhost normally.

Use Vercel Firewall rate limiting for the public authentication and AI endpoints. The app's in-memory throttle is only per function instance. This deployment configuration does not change the clinical rollout scope documented in the README.

To roll back an application change, promote a previous working Vercel deployment. This does not roll back database data or environment settings. The initial database migration is managed separately.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables), [CLI upload exclusions](https://vercel.com/docs/deployments/vercel-ignore).

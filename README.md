# ⚽ FIFA World Cup 2026 — Personal Telegram Reminder

Sends a Telegram notification **10 minutes before every World Cup match**, with kickoff time in IST.

**Stack:** Vercel Cron + TypeScript + Telegram Bot API  
**Cost:** Free  
**Maintenance:** Zero once deployed

---

## Architecture

```
Vercel Cron (every minute)
  └── GET /api/cron  (auth: Bearer CRON_SECRET)
        ├── Load data/schedule.json
        ├── Find matches starting in ~10 min (±30s buffer)
        └── POST Telegram Bot API → Your phone
```

---

## Step 1 — Create Telegram Bot (5 minutes)

1. Open Telegram → search **@BotFather** → send `/newbot`
2. Follow prompts, pick any name/username
3. Copy the `BOT_TOKEN` it gives you (format: `123456:ABC...`)
4. Send **any message** to your new bot (just say "hi")
5. Open this URL in browser (replace TOKEN):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
6. In the JSON response, find `"id"` inside `"chat"` — that's your `CHAT_ID`

---

## Step 2 — Generate a CRON_SECRET

Run this in your terminal:
```bash
openssl rand -hex 32
```
Save the output — it's your `CRON_SECRET`.

---

## Step 3 — Deploy to Vercel

### Option A: Via CLI
```bash
npm install -g vercel
cd wc2026-reminder
npm install
vercel          # follow prompts, link/create project
```

### Option B: Via GitHub
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework preset: **Other** (no framework)
4. Deploy

---

## Step 4 — Set Environment Variables

In **Vercel Dashboard → Your Project → Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | Your Telegram bot token |
| `CHAT_ID` | Your Telegram user ID |
| `CRON_SECRET` | Your generated secret |

Set all three for **Production** (and optionally Preview/Development).

Then **redeploy** once after adding env vars:
```bash
vercel --prod
```
or trigger a redeploy from the Vercel dashboard.

---

## Step 5 — Test It

Send a POST request to verify everything works:
```bash
curl -X POST https://YOUR-VERCEL-URL.vercel.app/api/test \
  -H "x-test-secret: YOUR_CRON_SECRET"
```

You should receive a test notification on Telegram within seconds.

---

## Step 6 — Verify Cron Is Running

Check health endpoint:
```
https://YOUR-VERCEL-URL.vercel.app/api/index
```
Returns upcoming matches and server time in IST.

Check debug/dry-run endpoint:
```
https://YOUR-VERCEL-URL.vercel.app/api/dry-run
```
Shows current UTC/IST times, the next upcoming match with its kickoff and notification times in IST, and whether a notification would be sent right now.

*Note on Cron limitations:* The Vercel Hobby plan restricts built-in cron jobs to running once per day. If you are on the Hobby plan and need every-minute checks, see the **Vercel Hobby Plan Cron Limitations** section below.

---

## Updating the Schedule

When official match fixtures are confirmed (teams for knockout rounds), edit `data/schedule.json`:

```json
{
  "id": 49,
  "home": "Brazil",
  "away": "South Korea",
  "utc": "2026-07-06T20:00:00Z",
  "venue": "MetLife Stadium"
}
```

Always use UTC time. Commit and push → Vercel auto-redeploys.

**Important:** The schedule currently uses placeholder team names for knockout stages since draws haven't happened. Update these as the tournament progresses.

---

## Files

```
wc2026-reminder/
├── api/
│   ├── cron.ts      — main cron worker (runs every minute)
│   ├── test.ts      — send a test notification
│   └── index.ts     — health check, shows upcoming matches
├── data/
│   └── schedule.json — all 64 match slots in UTC
├── .env.example      — environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
└── vercel.json       — cron schedule config
```

---

## How the 10-Minute Detection Works

Every minute, the cron checks every match:
```
diff = kickoff_time - now
notify if: 9m30s < diff <= 10m30s
```

The ±30s buffer handles Vercel cron jitter (it doesn't fire at exactly :00 every minute).

---

## Troubleshooting

**No notification received:**
1. Check env vars are set and project was redeployed after adding them
2. Run the `/api/test` endpoint to confirm Telegram connectivity
3. Check Vercel Function Logs (Dashboard → Functions → cron)

**"Unauthorized" error from /api/cron:**
- Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` — ensure `CRON_SECRET` env var is set

**getUpdates returns empty:**
- Make sure you sent at least one message to your bot before calling getUpdates

---

## Vercel Hobby Plan Cron Limitations & Deduplication

### Cron Frequency limit
Although Vercel allows defining cron schedules in `vercel.json`, Hobby accounts are limited to running cron jobs **once per day**. If you try to deploy a Hobby project with a `* * * * *` (every minute) schedule, Vercel may reject the deployment or fail to run it.
* **Workaround:** You can use a free external scheduler (such as [cron-job.org](https://cron-job.org)) to trigger your `/api/cron` endpoint every minute. Be sure to configure it to send the `Authorization: Bearer YOUR_CRON_SECRET` header so the request is authorized.

### Deduplication
To prevent duplicate notifications when the cron scheduler suffers from jitter or triggers multiple times, the bot implements two layers of deduplication:
1. **Vercel KV (Recommended):** If the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set, the bot will use Vercel KV/Upstash Redis as a distributed lock. This guarantees 100% reliable deduplication across all serverless function instances.
2. **Local `/tmp` File Lock:** If Vercel KV is not configured, the bot falls back to writing notified match IDs to `/tmp/wc2026-notified-matches.json`. This provides simple, zero-config deduplication for subsequent calls on warm instances.

---

## Cost

| Service | Cost |
|---------|------|
| Vercel Hobby | Free |
| External Cron (e.g. cron-job.org) | Free |
| Telegram Bot API | Free |
| **Total** | **$0** |


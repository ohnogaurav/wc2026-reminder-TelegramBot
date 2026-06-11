# ⚽ World Cup 2026 Telegram Reminder Bot 🏆

> A personal Telegram bot that alerts you **10 minutes before every kickoff** in the FIFA World Cup 2026. Made for zero-cost, zero-maintenance, and pure football fun.

---

## 🌟 Features

* **📅 Full 104-Match Schedule:** The complete World Cup schedule is baked directly into the app ([`data/schedule.json`](file:///c:/Users/gaura/Downloads/wc2026-reminder/wc2026-reminder/data/schedule.json)).
* **🕒 Built for IST (Asia/Kolkata):** No more timezone mental math. Every notification displays the kickoff time in your local time (IST).
* **🛡️ Zero-Double-Pings:** Implements a smart deduplication mechanism (Vercel KV / Upstash Redis with a local `/tmp` file lock fallback) to ensure you only get notified once per match, even if the cron scheduler jitters.
* **💸 100% Free:** Uses Vercel Serverless + Telegram Bot API + free cron triggers. Cost = **$0**.

---

## 📱 The Notification

This is exactly what slides into your Telegram chat 10 minutes before the referee blows the whistle:

```text
⚽ FIFA World Cup 2026

Group A

Mexico vs South Africa

Kickoff:
Fri, 12 Jun, 12:30 am IST

Venue:
Estadio Azteca, Mexico City

Starts in 10 minutes.
```

---

## 🛠️ The Tech Stack

* **Language:** TypeScript (Node.js runtime)
* **Hosting:** Vercel (Serverless Functions)
* **Scheduler:** External minute cron (e.g. [cron-job.org](https://cron-job.org))
* **Database (Optional):** Vercel KV / Upstash Redis (for distributed deduplication)
* **Message Delivery:** Telegram Bot API

---

## 🚀 Quick Start (In 3 Steps)

### Step 1: Create your Telegram Bot 🤖
1. Message **@BotFather** on Telegram and send `/newbot`.
2. Follow the steps to get your **`BOT_TOKEN`**.
3. Send a friendly `"hi"` to your new bot.
4. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` and look for the `"chat":{"id":...}` block to find your **`CHAT_ID`**.

### Step 2: Push & Deploy 🌐
1. Fork or push this repository to your GitHub.
2. Link it to **Vercel** and add these Environment Variables:
   * `BOT_TOKEN` — Your Telegram bot token
   * `CHAT_ID` — Your Telegram chat ID
   * `CRON_SECRET` — A secure random string to protect your endpoints
3. Deploy!

### Step 3: Trigger the Cron 🕒
*Because Vercel Hobby accounts restrict built-in cron jobs to running once per day, you need a free scheduler to ping the bot every minute.*

1. Go to [cron-job.org](https://cron-job.org) (completely free).
2. Create a cron job pointing to `https://your-project.vercel.app/api/cron`.
3. Set the execution to **every 1 minute**.
4. In Advanced Settings, add the header:
   * **Key:** `Authorization`
   * **Value:** `Bearer YOUR_CRON_SECRET`

---

## 💻 Local Development & Testing

Want to test it or hack on the matching logic locally?

### Setup local environment:
Create a `.env.local` file in the root directory:
```env
BOT_TOKEN=your_token
CHAT_ID=your_chat_id
CRON_SECRET=your_secret
```

### Start the server:
```bash
npx vercel dev
```
*(Runs locally at `http://localhost:3000`)*

### 🔍 Cool Endpoints for Debugging

* **`GET /api/index`** — Quick status check showing server time and the next 5 upcoming matches in IST.
* **`GET /api/dry-run`** — Debug tool showing current times, the next match kickoff/notification times in IST, and a boolean indicating whether the bot would send a notification *right now*.
* **`POST /api/test`** — Sends a mock Brazil vs Argentina notification to your Telegram to verify connectivity. 
  *(Requires passing the `x-test-secret: YOUR_CRON_SECRET` header).*

---

## 💡 How it works (Under the Hood)
Every minute, your cron-job triggers `/api/cron`. 
The bot grabs the current time and the kickoff times in `schedule.json`, rounds both to the nearest minute, and checks if the difference is **exactly 10 minutes**.
If matched, it checks the lock (KV or local `/tmp`), fires the Telegram message, and locks the match ID. Simple, stateless, and robust.

---

*Built for the love of the game. Enjoy the World Cup!* ⚽🏆

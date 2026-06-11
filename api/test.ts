import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadEnv } from "../lib/env";

loadEnv();

const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const CHAT_ID = process.env.CHAT_ID?.trim();
const CRON_SECRET = process.env.CRON_SECRET?.trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const secret = (req.headers["x-test-secret"] as string)?.trim();
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: "Configuration error: BOT_TOKEN or CHAT_ID is not set." });
  }

  const message = [
    `⚽ FIFA World Cup 2026`,
    ``,
    `Group Stage (TEST)`,
    ``,
    `Brazil vs Argentina`,
    ``,
    `Kickoff:`,
    `Mon, 1 Jun, 08:30 pm IST`,
    ``,
    `Venue:`,
    `MetLife Stadium`,
    ``,
    `Starts in 10 minutes.`,
    ``,
    `✅ Your reminder system is working correctly.`,
  ].join("\n");

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const teleRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
    }),
  });

  if (!teleRes.ok) {
    const err = await teleRes.text();
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ ok: true, message: "Test notification sent!" });
}

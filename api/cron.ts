import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/kv";
import fs from "fs";
import path from "path";
import os from "os";
import matches from "../data/schedule.json";

const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const CHAT_ID = process.env.CHAT_ID?.trim();
const CRON_SECRET = process.env.CRON_SECRET?.trim();
const KV_REST_API_URL = process.env.KV_REST_API_URL?.trim();
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN?.trim();

const hasKV = !!KV_REST_API_URL && !!KV_REST_API_TOKEN;
const kvClient = hasKV ? createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
}) : null;

const TMP_FILE = path.join(os.tmpdir(), "wc2026-notified-matches.json");

function getNotifiedFromTmp(): Set<number> {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, "utf-8");
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error("Error reading temp file:", e);
  }
  return new Set();
}

function saveNotifiedToTmp(ids: Set<number>) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(Array.from(ids)), "utf-8");
  } catch (e) {
    console.error("Error writing temp file:", e);
  }
}

async function isMatchNotified(matchId: number): Promise<boolean> {
  if (kvClient) {
    const val = await kvClient.get(`notified:${matchId}`);
    return !!val;
  } else {
    return getNotifiedFromTmp().has(matchId);
  }
}

async function markMatchAsNotified(matchId: number): Promise<void> {
  if (kvClient) {
    // 24 hours TTL (86400 seconds)
    await kvClient.set(`notified:${matchId}`, "true", { ex: 86400 });
  } else {
    const notified = getNotifiedFromTmp();
    notified.add(matchId);
    saveNotifiedToTmp(notified);
  }
}

function toIST(utcStr: string): string {
  return new Date(utcStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

async function sendTelegram(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram error: ${err}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate env vars
  if (!BOT_TOKEN || !CHAT_ID || !CRON_SECRET) {
    console.error("Missing configuration: BOT_TOKEN, CHAT_ID, or CRON_SECRET is not set.");
    return res.status(500).json({ error: "Configuration error: Missing environment variables." });
  }

  // Vercel cron auth check
  const authHeader = req.headers["authorization"]?.trim();
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = Date.now();
  const normalizedNow = Math.round(now / 60000) * 60000;
  const TEN_MIN_MS = 10 * 60 * 1000;

  const notified: number[] = [];

  for (const match of matches) {
    const kickoff = new Date(match.utc).getTime();
    const normalizedKickoff = Math.round(kickoff / 60000) * 60000;
    const diff = normalizedKickoff - normalizedNow;

    // Trigger if kickoff is exactly 10 minutes away (normalized to minutes)
    if (diff === TEN_MIN_MS) {
      // Check deduplication
      const alreadyNotified = await isMatchNotified(match.id);
      if (alreadyNotified) {
        console.log(`Match ${match.id} (${match.home} vs ${match.away}) already notified. Skipping.`);
        continue;
      }

      const istTime = toIST(match.utc);
      const message = [
        `⚽ FIFA World Cup 2026`,
        ``,
        `${match.round}`,
        ``,
        `${match.home} vs ${match.away}`,
        ``,
        `Kickoff:`,
        `${istTime} IST`,
        ``,
        `Venue:`,
        `${match.venue}`,
        ``,
        `Starts in 10 minutes.`,
      ].join("\n");

      await sendTelegram(message);
      await markMatchAsNotified(match.id);
      notified.push(match.id);
    }
  }

  return res.status(200).json({
    ok: true,
    checked: matches.length,
    notified,
    ts: new Date().toISOString(),
  });
}

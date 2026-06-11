import type { VercelRequest, VercelResponse } from "@vercel/node";
import matches from "../data/schedule.json";

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

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const now = Date.now();

  const upcoming = matches
    .filter((m) => new Date(m.utc).getTime() > now)
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      match: `${m.home} vs ${m.away}`,
      kickoff_ist: toIST(m.utc),
      venue: m.venue,
    }));

  return res.status(200).json({
    status: "ok",
    service: "FIFA World Cup 2026 Reminder",
    total_matches: matches.length,
    upcoming_next_5: upcoming,
    server_time_utc: new Date().toISOString(),
  });
}

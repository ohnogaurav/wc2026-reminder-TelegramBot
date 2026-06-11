import type { VercelRequest, VercelResponse } from "@vercel/node";
import matches from "../data/schedule.json";

function toIST(dateInput: string | number | Date): string {
  return new Date(dateInput).toLocaleString("en-IN", {
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
  const normalizedNow = Math.round(now / 60000) * 60000;
  const TEN_MIN_MS = 10 * 60 * 1000;

  // Find the next upcoming match
  const upcomingMatches = matches
    .filter((m) => new Date(m.utc).getTime() > now)
    .sort((a, b) => new Date(a.utc).getTime() - new Date(b.utc).getTime());

  const nextMatch = upcomingMatches[0] || null;

  let nextMatchDetails = null;
  if (nextMatch) {
    const kickoffMs = new Date(nextMatch.utc).getTime();
    const normalizedKickoff = Math.round(kickoffMs / 60000) * 60000;
    const notificationTimeMs = kickoffMs - TEN_MIN_MS;
    const diff = normalizedKickoff - normalizedNow;

    nextMatchDetails = {
      id: nextMatch.id,
      round: nextMatch.round,
      match: `${nextMatch.home} vs ${nextMatch.away}`,
      venue: nextMatch.venue,
      kickoff_utc: nextMatch.utc,
      kickoff_ist: `${toIST(nextMatch.utc)} IST`,
      notification_time_ist: `${toIST(notificationTimeMs)} IST`,
      would_notify_this_match_right_now: diff === TEN_MIN_MS,
    };
  }

  // Check if any match in the database would trigger right now
  let wouldSendNotificationRightNow = false;
  const triggeringMatches = [];

  for (const match of matches) {
    const kickoffMs = new Date(match.utc).getTime();
    const normalizedKickoff = Math.round(kickoffMs / 60000) * 60000;
    const diff = normalizedKickoff - normalizedNow;

    if (diff === TEN_MIN_MS) {
      wouldSendNotificationRightNow = true;
      triggeringMatches.push({
        id: match.id,
        round: match.round,
        match: `${match.home} vs ${match.away}`,
        kickoff_ist: `${toIST(match.utc)} IST`,
      });
    }
  }

  return res.status(200).json({
    current_utc_time: new Date(now).toISOString(),
    current_ist_time: `${toIST(now)} IST`,
    would_send_notification_right_now: wouldSendNotificationRightNow,
    triggering_matches: triggeringMatches,
    next_upcoming_match: nextMatchDetails,
  });
}

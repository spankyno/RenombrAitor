/**
 * Usage tracking for anonymous (non-logged-in) users.
 * Guests: 2 Toolbox sessions/day, 50 files max per session.
 * Logged-in users: unlimited.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const usageMap = new Map<string, { date: string; count: number }>();
const GUEST_MAX_SESSIONS_PER_DAY = 2;
const GUEST_MAX_FILES = 30;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  let userId = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (e) {}

  if (userId) return NextResponse.json({ isAuthenticated: true, remaining: 999, maxFiles: 999 });
  const ip = getIp(req);
  const entry = usageMap.get(ip);
  const todayStr = today();
  if (!entry || entry.date !== todayStr) {
    return NextResponse.json({ isAuthenticated: false, remaining: GUEST_MAX_SESSIONS_PER_DAY, used: 0, maxFiles: GUEST_MAX_FILES });
  }
  return NextResponse.json({
    isAuthenticated: false,
    remaining: Math.max(0, GUEST_MAX_SESSIONS_PER_DAY - entry.count),
    used: entry.count,
    maxFiles: GUEST_MAX_FILES,
  });
}

export async function POST(req: NextRequest) {
  let userId = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (e) {}

  if (userId) return NextResponse.json({ ok: true, isAuthenticated: true });
  const ip = getIp(req);
  const todayStr = today();
  const entry = usageMap.get(ip);
  if (!entry || entry.date !== todayStr) {
    usageMap.set(ip, { date: todayStr, count: 1 });
    return NextResponse.json({ ok: true, remaining: GUEST_MAX_SESSIONS_PER_DAY - 1 });
  }
  if (entry.count >= GUEST_MAX_SESSIONS_PER_DAY) {
    return NextResponse.json({ ok: false, error: "Límite diario alcanzado. Regístrate para uso ilimitado." }, { status: 429 });
  }
  entry.count++;
  usageMap.set(ip, entry);
  return NextResponse.json({ ok: true, remaining: GUEST_MAX_SESSIONS_PER_DAY - entry.count });
}

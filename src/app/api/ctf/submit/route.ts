import { NextResponse } from "next/server";
import {
  getServerChallengeBySlug,
  sha256Hex,
  verifyFlagHash,
} from "@/lib/ctf/loader";
import { flagRateLimiter } from "@/lib/ctf/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { slug?: unknown; flag?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown; flag?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const flag = typeof body.flag === "string" ? body.flag.trim() : "";

  if (!slug || !flag) {
    return NextResponse.json({ status: "wrong" }, { status: 400 });
  }

  const challenge = getServerChallengeBySlug(slug);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  // Per-user (or per-guest-IP) rate limit: max 5 attempts per minute
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "local";
  const clientIp = forwardedFor.split(",")[0]?.trim() || "local";
  const rateKey = user ? `user:${user.id}` : `guest:${clientIp}`;
  const rate = flagRateLimiter.checkAndRecord(rateKey);

  if (!rate.allowed) {
    return NextResponse.json(
      { status: "rate_limited", retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  // Signed-in user: verify and record via SECURITY DEFINER RPC (strict RLS)
  if (supabase && user) {
    const submittedHash = sha256Hex(flag);
    const { data, error } = await supabase.rpc("submit_ctf_flag", {
      p_slug: slug,
      p_submitted_hash: submittedHash,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0] as { status: string; points_awarded: number };
      if (row.status === "rate_limited") {
        return NextResponse.json({ status: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({
        status: row.status,
        pointsAwarded: row.points_awarded ?? 0,
        saved: true,
      });
    }

    // Fallback when 003_ctf.sql has not been run yet in Supabase
    const ok = verifyFlagHash(flag, challenge.flagSha256);
    return NextResponse.json({
      status: ok ? "correct" : "wrong",
      pointsAwarded: ok ? challenge.points : 0,
      saved: false,
    });
  }

  // Guest mode: verify on server only, never save
  const isCorrect = verifyFlagHash(flag, challenge.flagSha256);
  return NextResponse.json({
    status: isCorrect ? "correct" : "wrong",
    pointsAwarded: isCorrect ? challenge.points : 0,
    saved: false,
    guest: true,
  });
}

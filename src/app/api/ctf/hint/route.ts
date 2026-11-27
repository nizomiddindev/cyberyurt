import { NextResponse } from "next/server";
import { getServerChallengeBySlug } from "@/lib/ctf/loader";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { slug?: unknown; hintId?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown; hintId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const hintId = typeof body.hintId === "string" ? body.hintId.trim() : "";

  const challenge = getServerChallengeBySlug(slug);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const hint = challenge.hints.find((h) => h.id === hintId);
  if (!hint) {
    return NextResponse.json({ error: "Hint not found" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  let saved = false;
  if (supabase && user) {
    const { error } = await supabase.rpc("unlock_ctf_hint", {
      p_slug: slug,
      p_hint_id: hintId,
    });
    if (!error) {
      saved = true;
    }
  }

  return NextResponse.json({
    hintId: hint.id,
    cost: hint.cost,
    text: hint.text,
    saved,
  });
}

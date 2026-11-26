import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSafeNextPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/";
  }
  return nextParam;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));

  const supabase = await createServerSupabaseClient();
  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/kirish", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/kirish", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/profil-sozlash", url.origin));
    }
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}

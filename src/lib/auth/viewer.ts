import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GUEST_USERNAME, type UserProfile, type Viewer } from "@/types/auth";

export const GUEST_VIEWER: Viewer = {
  isGuest: true,
  userId: null,
  username: GUEST_USERNAME,
  displayName: null,
  role: "guest",
  xp: 0,
  level: 1,
  hasClass: false,
  needsProfileSetup: false,
};

export async function getCurrentViewer(): Promise<Viewer> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return GUEST_VIEWER;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return GUEST_VIEWER;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, class_name, xp, level")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  if (!profile) {
    return {
      isGuest: false,
      userId: user.id,
      username: GUEST_USERNAME,
      displayName: null,
      role: "student",
      xp: 0,
      level: 1,
      hasClass: false,
      needsProfileSetup: true,
    };
  }

  return {
    isGuest: false,
    userId: user.id,
    username: profile.username,
    displayName: profile.display_name,
    role: profile.role,
    xp: profile.xp ?? 0,
    level: profile.level ?? 1,
    hasClass: Boolean(profile.class_name?.trim()),
    needsProfileSetup: false,
  };
}

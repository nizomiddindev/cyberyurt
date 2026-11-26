export const USER_ROLES = ["student", "teacher", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type ViewerRole = UserRole | "guest";

export const GUEST_USERNAME = "mehmon" as const;

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  class_name: string | null;
  xp: number;
  level: number;
}

export interface Viewer {
  isGuest: boolean;
  userId: string | null;
  username: string;
  displayName: string | null;
  role: ViewerRole;
  needsProfileSetup: boolean;
}

export const RESERVED_USERNAMES = [
  "root",
  "admin",
  "mehmon",
  "system",
  "guest",
] as const;

export type UsernameErrorCode =
  | "usernameRequired"
  | "usernameLength"
  | "usernameStartLetter"
  | "usernameCharacters"
  | "usernameReserved";

export type UsernameValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: UsernameErrorCode };

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const ALLOWED_CHARS_REGEX = /^[a-z0-9_-]+$/;
const STARTS_WITH_LETTER_REGEX = /^[a-z]/;

export function validateUsername(raw: string): UsernameValidationResult {
  const value = raw.trim();

  if (value.length === 0) {
    return { valid: false, error: "usernameRequired" };
  }

  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
    return { valid: false, error: "usernameLength" };
  }

  if (!ALLOWED_CHARS_REGEX.test(value)) {
    return { valid: false, error: "usernameCharacters" };
  }

  if (!STARTS_WITH_LETTER_REGEX.test(value)) {
    return { valid: false, error: "usernameStartLetter" };
  }

  if (
    (RESERVED_USERNAMES as readonly string[]).includes(value.toLowerCase())
  ) {
    return { valid: false, error: "usernameReserved" };
  }

  return { valid: true, normalized: value };
}

export type DisplayNameErrorCode = "displayNameRequired" | "displayNameTooLong";

export type DisplayNameValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: DisplayNameErrorCode };

const MAX_DISPLAY_NAME_LENGTH = 50;

export function validateDisplayName(raw: string): DisplayNameValidationResult {
  const value = raw.trim();

  if (value.length === 0) {
    return { valid: false, error: "displayNameRequired" };
  }

  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return { valid: false, error: "displayNameTooLong" };
  }

  return { valid: true, normalized: value };
}

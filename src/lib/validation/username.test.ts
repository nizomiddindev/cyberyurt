import { describe, expect, it } from "vitest";
import {
  RESERVED_USERNAMES,
  validateDisplayName,
  validateUsername,
} from "@/lib/validation/username";

describe("validateUsername", () => {
  it("accepts valid lowercase usernames starting with a letter", () => {
    expect(validateUsername("ali")).toEqual({ valid: true, normalized: "ali" });
    expect(validateUsername("utkir_2026")).toEqual({
      valid: true,
      normalized: "utkir_2026",
    });
    expect(validateUsername("a-1_2345678901234567")).toEqual({
      valid: true,
      normalized: "a-1_2345678901234567",
    });
  });

  it("rejects empty or whitespace-only usernames", () => {
    expect(validateUsername("")).toEqual({
      valid: false,
      error: "usernameRequired",
    });
    expect(validateUsername("   ")).toEqual({
      valid: false,
      error: "usernameRequired",
    });
  });

  it("enforces length between 3 and 20 characters", () => {
    expect(validateUsername("ab")).toEqual({
      valid: false,
      error: "usernameLength",
    });
    expect(validateUsername("a".repeat(21))).toEqual({
      valid: false,
      error: "usernameLength",
    });
  });

  it("rejects uppercase letters, spaces, and unsupported symbols", () => {
    expect(validateUsername("Ali")).toEqual({
      valid: false,
      error: "usernameCharacters",
    });
    expect(validateUsername("ali val")).toEqual({
      valid: false,
      error: "usernameCharacters",
    });
    expect(validateUsername("ali.uz")).toEqual({
      valid: false,
      error: "usernameCharacters",
    });
  });

  it("requires starting with a lowercase letter", () => {
    expect(validateUsername("1ali")).toEqual({
      valid: false,
      error: "usernameStartLetter",
    });
    expect(validateUsername("_ali")).toEqual({
      valid: false,
      error: "usernameStartLetter",
    });
    expect(validateUsername("-ali")).toEqual({
      valid: false,
      error: "usernameStartLetter",
    });
  });

  it("blocks all reserved usernames", () => {
    for (const reserved of RESERVED_USERNAMES) {
      expect(validateUsername(reserved)).toEqual({
        valid: false,
        error: "usernameReserved",
      });
    }
  });
});

describe("validateDisplayName", () => {
  it("accepts any non-empty trimmed text including Uzbek Latin characters", () => {
    expect(validateDisplayName("  O‘tkir Karimov  ")).toEqual({
      valid: true,
      normalized: "O‘tkir Karimov",
    });
  });

  it("rejects empty or overly long display names", () => {
    expect(validateDisplayName("   ")).toEqual({
      valid: false,
      error: "displayNameRequired",
    });
    expect(validateDisplayName("a".repeat(51))).toEqual({
      valid: false,
      error: "displayNameTooLong",
    });
  });
});

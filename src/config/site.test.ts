import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { getMessages } from "@/locales";

describe("siteConfig", () => {
  it("keeps site identity in one place", () => {
    expect(siteConfig.siteName).toBe("CyberYurt");
    expect(siteConfig.terminalHost).toBe("yurt");
    expect(siteConfig.domain).toBe("cyberyurt.com");
  });
});

describe("Uzbek locale", () => {
  it("uses U+2018 in o‘ and g‘ instead of ASCII apostrophe", () => {
    const raw = JSON.stringify(getMessages());
    expect(raw).not.toMatch(/[oOgG]'/);
    expect(raw).toContain("O\u2018zbekiston");
  });
});

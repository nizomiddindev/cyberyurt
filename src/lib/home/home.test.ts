import { describe, expect, it } from "vitest";
import { CTF_CATEGORIES } from "@/lib/ctf/types";
import { resolveCommandBarNavigation } from "@/lib/home/command-bar";
import { getContinueTarget } from "@/lib/home/continue";
import { getAllLessons } from "@/lib/lessons/loader";

describe("Home command bar navigation", () => {
  it("navigates to every CTF category with cd <category>", () => {
    for (const category of CTF_CATEGORIES) {
      expect(resolveCommandBarNavigation(`cd ${category.toLowerCase()}`)).toEqual(
        {
          kind: "navigate",
          href: `/mashq?kategoriya=${encodeURIComponent(category)}`,
        },
      );
    }
  });

  it("supports section shortcuts, ls, and rejects unknown commands", () => {
    expect(resolveCommandBarNavigation("cd darslar")).toEqual({
      kind: "navigate",
      href: "/darslar",
    });
    expect(resolveCommandBarNavigation("cd terminal")).toEqual({
      kind: "navigate",
      href: "/terminal",
    });
    expect(resolveCommandBarNavigation("ls")?.kind).toBe("list");
    expect(resolveCommandBarNavigation("cd nomalum")).toEqual({
      kind: "error",
      target: "nomalum",
    });
    expect(resolveCommandBarNavigation("   ")).toBeNull();
  });
});

describe("getContinueTarget", () => {
  it("returns first lesson for new users, in-progress lesson first, then next unfinished", () => {
    const lessons = getAllLessons();
    expect(lessons.length).toBeGreaterThanOrEqual(2);

    const fresh = getContinueTarget(lessons, {});
    expect(fresh?.lessonId).toBe(lessons[0].id);

    const midSecond = getContinueTarget(lessons, {
      [lessons[1].id]: [lessons[1].tasks[0].id],
    });
    expect(midSecond?.lessonId).toBe(lessons[1].id);

    const firstDone = getContinueTarget(lessons, {
      [lessons[0].id]: lessons[0].tasks.map((t) => t.id),
    });
    expect(firstDone?.lessonId).toBe(lessons[1].id);
  });
});

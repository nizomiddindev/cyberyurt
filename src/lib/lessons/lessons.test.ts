import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAllGlossaryEntries,
  getAllLessons,
  getLessonHierarchy,
} from "@/lib/lessons/loader";
import { extractGlossaryRefs, parseLessonMarkdown } from "@/lib/lessons/parser";

// Import validator dynamically in tests
import { validateLessons } from "../../../scripts/validate-lessons.mjs";

describe("Lessons & Glossary content", () => {
  it("loads the 3 required Uzbek lessons in Path > Module > Lesson hierarchy", () => {
    const lessons = getAllLessons();
    const titles = lessons.map((l) => l.title);
    expect(titles).toContain("Fayl nima?");
    expect(titles).toContain("Terminal bilan tanishuv");
    expect(titles).toContain("SOC nima?");

    const hierarchy = getLessonHierarchy();
    expect(hierarchy[0]?.id).toBe("0-daraja");
    expect(hierarchy[0]?.modules[0]?.lessons.length).toBeGreaterThanOrEqual(2);
  });

  it("parses all 4 visual diagram blocks, simpler versions, explanations, and terminal tasks", () => {
    const lessons = getAllLessons();
    const allBlocks = lessons.flatMap((l) => l.tasks.flatMap((t) => t.blocks));
    const types = new Set(allBlocks.map((b) => b.type));

    expect(types.has("diagram-tree")).toBe(true);
    expect(types.has("diagram-flow")).toBe(true);
    expect(types.has("steps")).toBe(true);
    expect(types.has("compare")).toBe(true);

    const terminalLesson = lessons.find(
      (l) => l.id === "terminal-bilan-tanishuv",
    );
    expect(terminalLesson?.tasks.some((t) => Boolean(t.terminalTask))).toBe(true);
    expect(lessons.every((l) => l.scenario.length > 0)).toBe(true);
  });

  it("loads glossary entries sorted A-Z and passes scripts/validate-lessons", () => {
    const glossary = getAllGlossaryEntries();
    expect(glossary.length).toBeGreaterThanOrEqual(10);
    expect(validateLessons()).toEqual([]);
  });

  it("fails validation when a lesson references a missing glossary term", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyberyurt-m3-"));
    const lessonsDir = path.join(tmpDir, "lessons");
    const glossaryDir = path.join(tmpDir, "glossary");
    fs.mkdirSync(lessonsDir);
    fs.mkdirSync(glossaryDir);

    fs.writeFileSync(
      path.join(lessonsDir, "broken.md"),
      `---
id: broken
title: Sinov
pathId: 0-daraja
pathTitle: 0-daraja
pathOrder: 1
moduleId: m1
moduleTitle: M1
moduleOrder: 1
lessonOrder: 1
prerequisites: []
hasTerminal: false
---

## Senariy

Bu sinov senariysi.

## Vazifa 1: Sinov

Bu yerda [[yoq-atama]] ishlatilgan.
`,
    );

    const errors = validateLessons(lessonsDir, glossaryDir);
    expect(errors.some((e: string) => e.includes("yoq-atama"))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts glossary slugs from both [[term]] and [[term|label]] syntax", () => {
    expect(extractGlossaryRefs("Bu [[tor]] va [[fayl|fayllar]] haqida.")).toEqual([
      "tor",
      "fayl",
    ]);

    const sample = parseLessonMarkdown(`---
id: sample
title: Sample
pathId: p
pathTitle: P
pathOrder: 1
moduleId: m
moduleTitle: M
moduleOrder: 1
lessonOrder: 1
prerequisites: []
---

## Senariy

Real life scenario.

## Vazifa 1: First

Hello world.
`);
    expect(sample.tasks).toHaveLength(1);
    expect(sample.scenario).toBe("Real life scenario.");
  });
});

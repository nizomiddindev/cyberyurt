import fs from "node:fs";
import path from "node:path";
import {
  parseGlossaryMarkdown,
  parseLessonMarkdown,
} from "@/lib/lessons/parser";
import type {
  GlossaryEntry,
  Lesson,
  LessonModuleGroup,
  LessonPathGroup,
} from "@/lib/lessons/types";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_ROOT, "lessons");
const GLOSSARY_DIR = path.join(CONTENT_ROOT, "glossary");

export function getAllGlossaryEntries(): GlossaryEntry[] {
  if (!fs.existsSync(GLOSSARY_DIR)) return [];
  const files = fs
    .readdirSync(GLOSSARY_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const entries = files.map((fileName) => {
    const raw = fs.readFileSync(path.join(GLOSSARY_DIR, fileName), "utf-8");
    return parseGlossaryMarkdown(raw);
  });

  entries.sort((a, b) => a.term.localeCompare(b.term, "uz"));
  return entries;
}

export function getGlossaryMap(): Record<string, GlossaryEntry> {
  const map: Record<string, GlossaryEntry> = {};
  for (const entry of getAllGlossaryEntries()) {
    map[entry.slug] = entry;
  }
  return map;
}

export function getAllLessons(): Lesson[] {
  if (!fs.existsSync(LESSONS_DIR)) return [];
  const files = fs
    .readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const lessons = files.map((fileName) => {
    const raw = fs.readFileSync(path.join(LESSONS_DIR, fileName), "utf-8");
    return parseLessonMarkdown(raw);
  });

  lessons.sort(
    (a, b) =>
      a.pathOrder - b.pathOrder ||
      a.moduleOrder - b.moduleOrder ||
      a.lessonOrder - b.lessonOrder,
  );

  return lessons;
}

export function getLessonById(id: string): Lesson | null {
  return getAllLessons().find((lesson) => lesson.id === id) ?? null;
}

export function getLessonHierarchy(): LessonPathGroup[] {
  const lessons = getAllLessons();
  const pathsMap = new Map<string, LessonPathGroup>();

  for (const lesson of lessons) {
    let pathGroup = pathsMap.get(lesson.pathId);
    if (!pathGroup) {
      pathGroup = {
        id: lesson.pathId,
        title: lesson.pathTitle,
        order: lesson.pathOrder,
        modules: [],
      };
      pathsMap.set(lesson.pathId, pathGroup);
    }

    let moduleGroup: LessonModuleGroup | undefined = pathGroup.modules.find(
      (m) => m.id === lesson.moduleId,
    );
    if (!moduleGroup) {
      moduleGroup = {
        id: lesson.moduleId,
        title: lesson.moduleTitle,
        order: lesson.moduleOrder,
        lessons: [],
      };
      pathGroup.modules.push(moduleGroup);
    }

    moduleGroup.lessons.push(lesson);
  }

  const paths = [...pathsMap.values()].sort((a, b) => a.order - b.order);
  for (const p of paths) {
    p.modules.sort((a, b) => a.order - b.order);
    for (const m of p.modules) {
      m.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
    }
  }

  return paths;
}

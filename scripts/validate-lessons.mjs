import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = process.cwd();
const LESSONS_DIR = path.join(ROOT, "content", "lessons");
const GLOSSARY_DIR = path.join(ROOT, "content", "glossary");

function splitFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Missing YAML frontmatter");
  }
  return {
    data: YAML.parse(match[1]) ?? {},
    body: match[2].trim(),
  };
}

export function validateLessons(
  lessonsDir = LESSONS_DIR,
  glossaryDir = GLOSSARY_DIR,
) {
  const errors = [];

  if (!fs.existsSync(glossaryDir)) {
    errors.push("Missing content/glossary directory");
    return errors;
  }
  if (!fs.existsSync(lessonsDir)) {
    errors.push("Missing content/lessons directory");
    return errors;
  }

  const glossarySlugs = new Set();
  const glossaryFiles = fs
    .readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".md"));

  for (const file of glossaryFiles) {
    const raw = fs.readFileSync(path.join(glossaryDir, file), "utf-8");
    try {
      const { data } = splitFrontmatter(raw);
      const expectedSlug = file.replace(/\.md$/, "");
      if (data.slug !== expectedSlug) {
        errors.push(
          `Glossary ${file}: frontmatter slug "${data.slug}" must match filename "${expectedSlug}"`,
        );
      }
      if (!data.term || !data.definition) {
        errors.push(`Glossary ${file}: missing term or definition`);
      }
      if (/[oOgG]'/.test(raw)) {
        errors.push(
          `Glossary ${file}: found ASCII apostrophe in o'/g' (use U+2018 ‘)`,
        );
      }
      glossarySlugs.add(expectedSlug);
    } catch (err) {
      errors.push(`Glossary ${file}: ${err.message}`);
    }
  }

  const lessonFiles = fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith(".md"));
  const lessonIds = new Set();
  const parsedLessons = [];

  for (const file of lessonFiles) {
    const raw = fs.readFileSync(path.join(lessonsDir, file), "utf-8");
    try {
      const { data, body } = splitFrontmatter(raw);
      const id = String(data.id ?? "").trim();
      if (!id) {
        errors.push(`Lesson ${file}: missing frontmatter id`);
        continue;
      }
      if (lessonIds.has(id)) {
        errors.push(`Lesson ${file}: duplicate lesson id "${id}"`);
      }
      lessonIds.add(id);

      if (/[oOgG]'/.test(raw)) {
        errors.push(
          `Lesson ${file}: found ASCII apostrophe in o'/g' (use U+2018 ‘)`,
        );
      }

      // Check real-life scenario appears BEFORE any tasks
      if (!/^## Senariy\b/m.test(body)) {
        errors.push(`Lesson ${file}: missing "## Senariy" section`);
      } else {
        const scenarioPos = body.search(/^## Senariy\b/m);
        const firstTaskPos = body.search(/^## Vazifa\b/m);
        if (firstTaskPos !== -1 && scenarioPos > firstTaskPos) {
          errors.push(
            `Lesson ${file}: "## Senariy" must appear before tasks`,
          );
        }
      }

      // Check every [[term]] reference has a glossary file
      const refRegex = /\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g;
      let match;
      while ((match = refRegex.exec(body)) !== null) {
        const slug = match[1];
        if (!glossarySlugs.has(slug)) {
          errors.push(
            `Lesson ${file}: references unknown glossary term "[[${slug}]]" (missing content/glossary/${slug}.md)`,
          );
        }
      }

      // Check every question block has answer and explanation
      const qRegex = /:::question\n([\s\S]*?)\n:::/g;
      let qMatch;
      let qIdx = 0;
      while ((qMatch = qRegex.exec(body)) !== null) {
        qIdx++;
        const qData = YAML.parse(qMatch[1]) ?? {};
        if (!qData.prompt || !qData.answer) {
          errors.push(`Lesson ${file}: question #${qIdx} missing prompt or answer`);
        }
        if (!qData.explanation || String(qData.explanation).trim().length === 0) {
          errors.push(
            `Lesson ${file}: question #${qIdx} must include an "explanation" for wrong answers`,
          );
        }
      }

      parsedLessons.push({
        file,
        id,
        prerequisites: Array.isArray(data.prerequisites)
          ? data.prerequisites
          : [],
      });
    } catch (err) {
      errors.push(`Lesson ${file}: ${err.message}`);
    }
  }

  // Validate prerequisite IDs exist
  for (const lesson of parsedLessons) {
    for (const prereq of lesson.prerequisites) {
      if (!lessonIds.has(prereq)) {
        errors.push(
          `Lesson ${lesson.file}: prerequisite "${prereq}" does not exist`,
        );
      }
    }
  }

  return errors;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const errors = validateLessons();
  if (errors.length > 0) {
    console.error("Lesson validation failed:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log("Lesson validation passed.");
}

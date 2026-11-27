import YAML from "yaml";
import type {
  CompareRow,
  GlossaryEntry,
  Lesson,
  LessonContentBlock,
  LessonQuestion,
  LessonTask,
  LessonTerminalTask,
  StepItem,
  TreeNode,
} from "@/lib/lessons/types";

export function splitFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Missing YAML frontmatter (--- ... ---)");
  }
  const parsed = YAML.parse(match[1]);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid YAML frontmatter");
  }
  return {
    data: parsed as Record<string, unknown>,
    body: match[2].trim(),
  };
}

export function extractGlossaryRefs(markdown: string): string[] {
  const refs = new Set<string>();
  const regex = /\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    refs.add(match[1]);
  }
  return [...refs];
}

export function parseGlossaryMarkdown(raw: string): GlossaryEntry {
  const { data } = splitFrontmatter(raw);
  const slug = String(data.slug ?? "").trim();
  const term = String(data.term ?? "").trim();
  const definition = String(data.definition ?? "").trim();
  const analogy = data.analogy ? String(data.analogy).trim() : undefined;

  if (!slug || !term || !definition) {
    throw new Error(`Glossary entry missing slug, term, or definition`);
  }

  return { slug, term, definition, analogy };
}

function parseContentBlocks(sectionBody: string): {
  blocks: LessonContentBlock[];
  simpler?: string;
  question?: LessonQuestion;
  terminalTask?: LessonTerminalTask;
} {
  const lines = sectionBody.replace(/\r\n/g, "\n").split("\n");
  const blocks: LessonContentBlock[] = [];
  let simpler: string | undefined;
  let question: LessonQuestion | undefined;
  let terminalTask: LessonTerminalTask | undefined;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join("\n").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed === "::diagram tree" ||
      trimmed === "::diagram flow" ||
      trimmed === "::steps" ||
      trimmed === "::compare"
    ) {
      flushParagraph();
      const directive = trimmed;
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "::end") {
        inner.push(lines[i]);
        i++;
      }
      const innerText = inner.join("\n").trim();

      if (directive === "::diagram tree") {
        const root = YAML.parse(innerText) as TreeNode;
        blocks.push({ type: "diagram-tree", root });
      } else if (directive === "::diagram flow") {
        const steps = YAML.parse(innerText) as string[];
        blocks.push({ type: "diagram-flow", steps });
      } else if (directive === "::steps") {
        const items = YAML.parse(innerText) as StepItem[];
        blocks.push({ type: "steps", items });
      } else if (directive === "::compare") {
        const parsed = YAML.parse(innerText) as {
          leftTitle: string;
          rightTitle: string;
          rows: CompareRow[];
        };
        blocks.push({
          type: "compare",
          leftTitle: parsed.leftTitle,
          rightTitle: parsed.rightTitle,
          rows: parsed.rows ?? [],
        });
      }
      continue;
    }

    if (
      trimmed === ":::simpler" ||
      trimmed === ":::question" ||
      trimmed === ":::terminal-task"
    ) {
      flushParagraph();
      const blockType = trimmed;
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        inner.push(lines[i]);
        i++;
      }
      const innerText = inner.join("\n").trim();

      if (blockType === ":::simpler") {
        simpler = innerText;
      } else if (blockType === ":::question") {
        const parsed = YAML.parse(innerText) as LessonQuestion;
        question = {
          prompt: String(parsed.prompt ?? "").trim(),
          options: Array.isArray(parsed.options)
            ? parsed.options.map((opt) => String(opt))
            : undefined,
          answer: String(parsed.answer ?? "").trim(),
          explanation: String(parsed.explanation ?? "").trim(),
        };
      } else if (blockType === ":::terminal-task") {
        const parsed = YAML.parse(innerText) as LessonTerminalTask;
        terminalTask = {
          instruction: String(parsed.instruction ?? "").trim(),
          matchCommand: parsed.matchCommand
            ? String(parsed.matchCommand).trim()
            : undefined,
          checkFile: parsed.checkFile
            ? String(parsed.checkFile).trim()
            : undefined,
        };
      }
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
    } else {
      paragraphLines.push(line);
    }
  }

  flushParagraph();
  return { blocks, simpler, question, terminalTask };
}

export function parseLessonMarkdown(raw: string): Lesson {
  const { data, body } = splitFrontmatter(raw);

  const id = String(data.id ?? "").trim();
  const title = String(data.title ?? "").trim();
  const pathId = String(data.pathId ?? "").trim();
  const pathTitle = String(data.pathTitle ?? "").trim();
  const pathOrder = Number(data.pathOrder ?? 1);
  const moduleId = String(data.moduleId ?? "").trim();
  const moduleTitle = String(data.moduleTitle ?? "").trim();
  const moduleOrder = Number(data.moduleOrder ?? 1);
  const lessonOrder = Number(data.lessonOrder ?? 1);
  const prerequisites = Array.isArray(data.prerequisites)
    ? data.prerequisites.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const hasTerminal = Boolean(data.hasTerminal);

  if (!id || !title || !pathId || !moduleId) {
    throw new Error(`Lesson frontmatter missing required fields (id=${id})`);
  }

  // Split markdown body on top-level `## ` headings
  const sections = body.split(/^## /m).filter((s) => s.trim().length > 0);

  let scenario = "";
  const tasks: LessonTask[] = [];

  for (const section of sections) {
    const newlineIdx = section.indexOf("\n");
    const heading = (
      newlineIdx === -1 ? section : section.slice(0, newlineIdx)
    ).trim();
    const content = (
      newlineIdx === -1 ? "" : section.slice(newlineIdx + 1)
    ).trim();

    if (heading.toLowerCase() === "senariy") {
      scenario = content;
      continue;
    }

    const parsed = parseContentBlocks(content);
    tasks.push({
      id: `vazifa-${tasks.length + 1}`,
      title: heading,
      blocks: parsed.blocks,
      simpler: parsed.simpler,
      question: parsed.question,
      terminalTask: parsed.terminalTask,
    });
  }

  return {
    id,
    title,
    pathId,
    pathTitle,
    pathOrder,
    moduleId,
    moduleTitle,
    moduleOrder,
    lessonOrder,
    prerequisites,
    hasTerminal,
    scenario,
    tasks,
    glossaryRefs: extractGlossaryRefs(body),
  };
}

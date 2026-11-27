import { COMMAND_NAMES } from "@/lib/terminal/commands";
import { resolvePath } from "@/lib/terminal/path";
import type { VirtualFileSystem } from "@/lib/terminal/types";

export interface CompletionResult {
  completedLine: string;
  candidates: string[];
}

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (let i = 1; i < values.length; i++) {
    let j = 0;
    while (
      j < prefix.length &&
      j < values[i].length &&
      prefix[j] === values[i][j]
    ) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (!prefix) break;
  }
  return prefix;
}

export async function completeInput(
  line: string,
  cwd: string,
  fs: VirtualFileSystem,
): Promise<CompletionResult> {
  const splitIdx = Math.max(
    line.lastIndexOf("|"),
    line.lastIndexOf(";"),
    line.lastIndexOf("&&") !== -1 ? line.lastIndexOf("&&") + 1 : -1,
  );
  const segmentStart = splitIdx === -1 ? 0 : splitIdx + 1;
  const beforeSegment = line.slice(0, segmentStart);
  const segment = line.slice(segmentStart);

  const leadingSpacesMatch = segment.match(/^\s*/);
  const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[0] : "";
  const trimmedSegment = segment.slice(leadingSpaces.length);

  // Command completion if there is no whitespace after the command token yet
  const isCommandPosition = !/\s/.test(trimmedSegment);

  if (isCommandPosition) {
    const matches = COMMAND_NAMES.filter((name) =>
      name.startsWith(trimmedSegment),
    ).sort();

    if (matches.length === 0) {
      return { completedLine: line, candidates: [] };
    }
    if (matches.length === 1) {
      return {
        completedLine: `${beforeSegment}${leadingSpaces}${matches[0]} `,
        candidates: matches,
      };
    }

    const common = longestCommonPrefix(matches);
    return {
      completedLine: `${beforeSegment}${leadingSpaces}${common}`,
      candidates: matches,
    };
  }

  // Path argument completion
  const lastSpaceIdx = line.lastIndexOf(" ");
  const tokenStart = lastSpaceIdx + 1;
  const token = line.slice(tokenStart);
  const linePrefix = line.slice(0, tokenStart);

  const lastSlash = token.lastIndexOf("/");
  const dirPart = lastSlash === -1 ? "" : token.slice(0, lastSlash + 1);
  const namePrefix = lastSlash === -1 ? token : token.slice(lastSlash + 1);

  const searchDir =
    dirPart === ""
      ? cwd
      : resolvePath(dirPart === "/" ? "/" : dirPart.slice(0, -1) || "/", cwd, fs.homeDir);

  let entries;
  try {
    entries = await fs.listDir(searchDir);
  } catch {
    return { completedLine: line, candidates: [] };
  }

  const showHidden = namePrefix.startsWith(".");
  const matchingEntries = entries.filter(
    (entry) =>
      entry.name.startsWith(namePrefix) &&
      (showHidden || !entry.name.startsWith(".")),
  );

  if (matchingEntries.length === 0) {
    return { completedLine: line, candidates: [] };
  }

  const candidateNames = matchingEntries.map((entry) =>
    entry.type === "dir" ? `${entry.name}/` : entry.name,
  );

  if (matchingEntries.length === 1) {
    const only = matchingEntries[0];
    const suffix = only.type === "dir" ? "/" : " ";
    return {
      completedLine: `${linePrefix}${dirPart}${only.name}${suffix}`,
      candidates: candidateNames,
    };
  }

  const common = longestCommonPrefix(matchingEntries.map((e) => e.name));
  return {
    completedLine: `${linePrefix}${dirPart}${common}`,
    candidates: candidateNames,
  };
}

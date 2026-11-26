export function normalizePath(input: string): string {
  const parts = input.split("/");
  const stack: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return "/" + stack.join("/");
}

export function expandTilde(input: string, homeDir: string): string {
  if (input === "~") {
    return homeDir;
  }
  if (input.startsWith("~/")) {
    return `${homeDir}/${input.slice(2)}`;
  }
  return input;
}

export function resolvePath(
  input: string,
  cwd: string,
  homeDir: string,
): string {
  const expanded = expandTilde(input, homeDir);
  if (expanded.startsWith("/")) {
    return normalizePath(expanded);
  }
  const base = cwd === "/" ? "" : cwd;
  return normalizePath(`${base}/${expanded}`);
}

export function dirname(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "/";
  const idx = normalized.lastIndexOf("/");
  return idx <= 0 ? "/" : normalized.slice(0, idx);
}

export function basename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "/";
  const idx = normalized.lastIndexOf("/");
  return normalized.slice(idx + 1);
}

export function formatPromptCwd(cwd: string, homeDir: string): string {
  const normalizedCwd = normalizePath(cwd);
  const normalizedHome = normalizePath(homeDir);
  if (normalizedCwd === normalizedHome) {
    return "~";
  }
  if (normalizedCwd.startsWith(`${normalizedHome}/`)) {
    return `~${normalizedCwd.slice(normalizedHome.length)}`;
  }
  return normalizedCwd;
}

export function splitPathSegments(path: string): string[] {
  const normalized = normalizePath(path);
  if (normalized === "/") return [];
  return normalized.slice(1).split("/");
}

export function sanitizeUploadName(fileName: string): string {
  const cleaned = fileName.replaceAll("\\", "/").split("/").pop() ?? "";
  const safe = cleaned.replace(/[\x00-\x1f]/g, "").trim();
  if (!safe || safe === "." || safe === "..") {
    return "uploaded_file";
  }
  return safe;
}

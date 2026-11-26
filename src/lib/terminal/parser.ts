export interface ParsedCommand {
  name: string;
  args: string[];
  redirect?: {
    mode: "overwrite" | "append";
    target: string;
  };
}

export interface ParseResult {
  commands: ParsedCommand[];
  error?: string;
}

type Token =
  | { kind: "word"; value: string; quoted: boolean }
  | { kind: "pipe" }
  | { kind: "redirect"; mode: "overwrite" | "append" };

function tokenize(
  input: string,
  env: { homeDir: string; username: string },
): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let current = "";
  let hasWord = false;
  let wasQuoted = false;
  let quote: "'" | '"' | null = null;

  const flush = () => {
    if (hasWord) {
      tokens.push({ kind: "word", value: current, quoted: wasQuoted });
      current = "";
      hasWord = false;
      wasQuoted = false;
    }
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (ch === "\\" && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === '"' || next === "\\" || next === "$") {
          current += next;
          i++;
        } else {
          current += ch;
        }
      } else if (ch === "$") {
        const expanded = expandVar(input, i, env);
        current += expanded.value;
        i = expanded.nextIndex;
      } else {
        current += ch;
      }
      continue;
    }

    // Outside quotes
    if (ch === " " || ch === "\t") {
      flush();
      continue;
    }

    if (ch === "|") {
      flush();
      tokens.push({ kind: "pipe" });
      continue;
    }

    if (ch === ">") {
      flush();
      if (input[i + 1] === ">") {
        tokens.push({ kind: "redirect", mode: "append" });
        i++;
      } else {
        tokens.push({ kind: "redirect", mode: "overwrite" });
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      hasWord = true;
      wasQuoted = true;
      continue;
    }

    if (ch === "\\" && i + 1 < input.length) {
      current += input[i + 1];
      hasWord = true;
      i++;
      continue;
    }

    if (ch === "$") {
      const expanded = expandVar(input, i, env);
      current += expanded.value;
      hasWord = true;
      i = expanded.nextIndex;
      continue;
    }

    current += ch;
    hasWord = true;
  }

  if (quote !== null) {
    return { tokens: [], error: "syntax error: unclosed quote" };
  }

  flush();
  return { tokens };
}

function expandVar(
  input: string,
  dollarIndex: number,
  env: { homeDir: string; username: string },
): { value: string; nextIndex: number } {
  const rest = input.slice(dollarIndex + 1);
  if (rest.startsWith("HOME") && !/^[A-Za-z0-9_]/.test(rest[4] ?? "")) {
    return { value: env.homeDir, nextIndex: dollarIndex + 4 };
  }
  if (rest.startsWith("USER") && !/^[A-Za-z0-9_]/.test(rest[4] ?? "")) {
    return { value: env.username, nextIndex: dollarIndex + 4 };
  }
  return { value: "$", nextIndex: dollarIndex };
}

export function parseCommandLine(
  input: string,
  env: { homeDir: string; username: string },
): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { commands: [] };
  }

  const { tokens, error } = tokenize(trimmed, env);
  if (error) {
    return { commands: [], error };
  }

  const commands: ParsedCommand[] = [];
  let words: string[] = [];
  let redirect: ParsedCommand["redirect"] | undefined;

  const pushCurrent = (): string | null => {
    if (words.length === 0) {
      return "syntax error near unexpected token `|'";
    }
    commands.push({
      name: words[0],
      args: words.slice(1),
      redirect,
    });
    words = [];
    redirect = undefined;
    return null;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "pipe") {
      const err = pushCurrent();
      if (err) return { commands: [], error: err };
      if (i === tokens.length - 1) {
        return {
          commands: [],
          error: "syntax error: unexpected end of pipeline",
        };
      }
      continue;
    }

    if (token.kind === "redirect") {
      const next = tokens[i + 1];
      if (!next || next.kind !== "word") {
        return {
          commands: [],
          error: "syntax error: missing redirection target",
        };
      }
      redirect = {
        mode: token.mode,
        target: next.value,
      };
      i++;
      continue;
    }

    words.push(token.value);
  }

  const finalErr = pushCurrent();
  if (finalErr) {
    return { commands: [], error: finalErr };
  }

  return { commands };
}

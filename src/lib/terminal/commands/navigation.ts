import { resolvePath } from "@/lib/terminal/path";
import {
  errResult,
  okText,
  type CommandHandler,
  type FsEntryStat,
} from "@/lib/terminal/types";

function formatLongEntry(
  entry: FsEntryStat,
  displayName: string,
  username: string,
): string {
  const perms = entry.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
  const links = entry.type === "dir" ? "2" : "1";
  const size = String(entry.size).padStart(6, " ");
  const date = new Date(entry.mtime);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()] ?? "Jan";
  const day = String(date.getDate()).padStart(2, " ");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${perms} ${links} ${username} ${username} ${size} ${month} ${day} ${hh}:${mm} ${displayName}`;
}

export const lsCommand: CommandHandler = async (args, ctx) => {
  let showAll = false;
  let longFormat = false;
  const targets: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "a") showAll = true;
        else if (flag === "l") longFormat = true;
        else return errResult(`ls: invalid option -- '${flag}'`);
      }
    } else {
      targets.push(arg);
    }
  }

  const listTargets = targets.length > 0 ? targets : ["."];
  const sections: string[] = [];
  const errors: string[] = [];

  for (const target of listTargets) {
    const resolved = resolvePath(target, ctx.cwd, ctx.fs.homeDir);
    const stat = await ctx.fs.stat(resolved);
    if (!stat) {
      errors.push(`ls: cannot access '${target}': No such file or directory`);
      continue;
    }

    if (stat.type === "file") {
      sections.push(
        longFormat
          ? formatLongEntry(stat, target, ctx.username)
          : target,
      );
      continue;
    }

    const entries = await ctx.fs.listDir(resolved);
    const visible = showAll
      ? entries
      : entries.filter((entry) => !entry.name.startsWith("."));

    const lines: string[] = [];
    if (listTargets.length > 1) {
      lines.push(`${target}:`);
    }

    if (longFormat) {
      if (showAll) {
        lines.push(formatLongEntry(stat, ".", ctx.username));
        lines.push(formatLongEntry(stat, "..", ctx.username));
      }
      for (const entry of visible) {
        lines.push(formatLongEntry(entry, entry.name, ctx.username));
      }
      sections.push(lines.join("\n"));
    } else {
      const names = showAll
        ? [".", "..", ...visible.map((e) => e.name)]
        : visible.map((e) => e.name);
      if (listTargets.length > 1) {
        lines.push(names.join("  "));
        sections.push(lines.join("\n"));
      } else {
        sections.push(names.join("  "));
      }
    }
  }

  const nonEmpty = sections.filter((s) => s.length > 0);
  const stdoutText = nonEmpty.length > 0 ? `${nonEmpty.join("\n\n")}\n` : "";
  const stderrText = errors.length > 0 ? `${errors.join("\n")}\n` : "";

  return {
    stdout: okText(stdoutText).stdout,
    stderr: stderrText,
    exitCode: errors.length > 0 ? 1 : 0,
  };
};

export const cdCommand: CommandHandler = async (args, ctx) => {
  if (args.length > 1) {
    return errResult("cd: too many arguments");
  }

  const rawTarget = args[0] ?? "~";
  const target = rawTarget === "-" ? ctx.prevCwd : rawTarget;
  const resolved = resolvePath(target, ctx.cwd, ctx.fs.homeDir);

  const stat = await ctx.fs.stat(resolved);
  if (!stat) {
    return errResult(`cd: ${rawTarget}: No such file or directory`);
  }
  if (stat.type !== "dir") {
    return errResult(`cd: ${rawTarget}: Not a directory`);
  }

  ctx.setCwd(resolved);
  return rawTarget === "-" ? okText(`${resolved}\n`) : okText("");
};

export const pwdCommand: CommandHandler = async (_args, ctx) => {
  return okText(`${ctx.cwd}\n`);
};

export const whoamiCommand: CommandHandler = async (_args, ctx) => {
  return okText(`${ctx.username}\n`);
};

export const clearCommand: CommandHandler = async () => {
  return {
    stdout: new Uint8Array(0),
    stderr: "",
    exitCode: 0,
    clearScreen: true,
  };
};

export const historyCommand: CommandHandler = async (_args, ctx) => {
  const lines = ctx.history.map(
    (entry, index) => `${String(index + 1).padStart(4, " ")}  ${entry}`,
  );
  return okText(lines.length > 0 ? `${lines.join("\n")}\n` : "");
};

import {
  base64Command,
  fileCommand,
  hexdumpCommand,
  stringsCommand,
  xxdCommand,
} from "@/lib/terminal/commands/analysis";
import {
  catCommand,
  cpCommand,
  echoCommand,
  mkdirCommand,
  mvCommand,
  rmCommand,
  touchCommand,
} from "@/lib/terminal/commands/files";
import {
  cdCommand,
  clearCommand,
  historyCommand,
  lsCommand,
  pwdCommand,
  whoamiCommand,
} from "@/lib/terminal/commands/navigation";
import { wgetCommand } from "@/lib/terminal/commands/network";
import {
  findCommand,
  grepCommand,
  headCommand,
  sortCommand,
  tailCommand,
  uniqCommand,
  wcCommand,
} from "@/lib/terminal/commands/text";
import { revCommand, trCommand } from "@/lib/terminal/commands/transform";
import { getMessages } from "@/locales";
import { okText, type CommandHandler } from "@/lib/terminal/types";

export const COMMAND_NAMES = [
  "ls",
  "cd",
  "pwd",
  "cat",
  "echo",
  "mkdir",
  "rm",
  "cp",
  "mv",
  "touch",
  "head",
  "tail",
  "wc",
  "grep",
  "find",
  "sort",
  "uniq",
  "rev",
  "tr",
  "file",
  "strings",
  "base64",
  "xxd",
  "hexdump",
  "wget",
  "clear",
  "help",
  "history",
  "whoami",
] as const;

const helpCommand: CommandHandler = async () => {
  const t = getMessages().terminal;
  const lines = [
    t.helpTitle,
    `  ${t.helpFiles}`,
    `  ${t.helpText}`,
    `  ${t.helpAnalysis}`,
    `  ${t.helpSystem}`,
    `  ${t.helpExtra}`,
  ];
  return okText(`${lines.join("\n")}\n`);
};

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  ls: lsCommand,
  cd: cdCommand,
  pwd: pwdCommand,
  cat: catCommand,
  echo: echoCommand,
  mkdir: mkdirCommand,
  rm: rmCommand,
  cp: cpCommand,
  mv: mvCommand,
  touch: touchCommand,
  head: headCommand,
  tail: tailCommand,
  wc: wcCommand,
  grep: grepCommand,
  find: findCommand,
  sort: sortCommand,
  uniq: uniqCommand,
  rev: revCommand,
  tr: trCommand,
  file: fileCommand,
  strings: stringsCommand,
  base64: base64Command,
  xxd: xxdCommand,
  hexdump: hexdumpCommand,
  wget: wgetCommand,
  clear: clearCommand,
  help: helpCommand,
  history: historyCommand,
  whoami: whoamiCommand,
};

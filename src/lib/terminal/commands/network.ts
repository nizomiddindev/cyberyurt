import { siteConfig } from "@/config/site";
import { resolvePath, sanitizeUploadName } from "@/lib/terminal/path";
import {
  errResult,
  okBytes,
  okText,
  type CommandHandler,
} from "@/lib/terminal/types";

export function isAllowedWgetUrl(
  rawUrl: string,
  allowedOrigin: string,
): { allowed: true; url: URL } | { allowed: false; reason: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { allowed: false, reason: "missing URL" };
  }

  let parsed: URL;
  try {
    parsed = trimmed.startsWith("/")
      ? new URL(trimmed, allowedOrigin)
      : new URL(trimmed);
  } catch {
    return { allowed: false, reason: "invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { allowed: false, reason: "only http/https URLs are allowed" };
  }

  let originHostname = "";
  try {
    originHostname = new URL(allowedOrigin).hostname.toLowerCase();
  } catch {
    originHostname = "";
  }

  const host = parsed.hostname.toLowerCase();
  const allowedHosts = new Set<string>([
    siteConfig.domain.toLowerCase(),
    `www.${siteConfig.domain.toLowerCase()}`,
  ]);
  if (originHostname) {
    allowedHosts.add(originHostname);
  }

  if (!allowedHosts.has(host)) {
    return {
      allowed: false,
      reason: `only ${siteConfig.domain} is allowed`,
    };
  }

  return { allowed: true, url: parsed };
}

export const wgetCommand: CommandHandler = async (args, ctx) => {
  let outputTarget: string | null = null;
  const urls: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-O") {
      const next = args[i + 1];
      if (!next) {
        return errResult("wget: option requires an argument -- 'O'");
      }
      outputTarget = next;
      i++;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`wget: invalid option -- '${arg.slice(1)}'`);
    } else {
      urls.push(arg);
    }
  }

  if (urls.length === 0) {
    return errResult("wget: missing URL");
  }

  const check = isAllowedWgetUrl(urls[0], ctx.allowedOrigin);
  if (!check.allowed) {
    return errResult(`wget: blocked (${check.reason})`);
  }

  let response;
  try {
    response = await ctx.fetcher(check.url.toString());
  } catch {
    return errResult(`wget: failed to fetch ${check.url.toString()}`);
  }

  // Re-check final URL after any redirects to ensure no external domain escape
  if (response.url) {
    const finalCheck = isAllowedWgetUrl(response.url, ctx.allowedOrigin);
    if (!finalCheck.allowed) {
      return errResult(`wget: blocked redirect (${finalCheck.reason})`);
    }
  }

  if (!response.ok) {
    return errResult(`wget: server returned HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (outputTarget === "-") {
    return okBytes(bytes);
  }

  const fallbackName =
    check.url.pathname.split("/").filter(Boolean).pop() ?? "index.html";
  const fileName = outputTarget ?? sanitizeUploadName(fallbackName);
  const destPath = resolvePath(fileName, ctx.cwd, ctx.fs.homeDir);

  try {
    await ctx.fs.writeFile(destPath, bytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Write error";
    return errResult(`wget: cannot save '${fileName}': ${msg}`);
  }

  return okText(`Saved '${fileName}' (${bytes.byteLength} bytes)\n`);
};

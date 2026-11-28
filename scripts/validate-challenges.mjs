import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = process.cwd();
const CHALLENGES_DIR = path.join(ROOT, "content", "challenges");

const ALLOWED_CATEGORIES = new Set([
  "Kriptografiya",
  "Forensika",
  "Veb",
  "Linux",
  "OSINT",
  "Tarmoq",
  "Reverse",
  "Fishing",
]);

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function findPythonExecutable() {
  for (const candidate of ["python", "python3"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "pipe" });
      return candidate;
    } catch {
      // Try next executable name
    }
  }
  return null;
}

function listChallengeDirs(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const results = [];
  for (const categoryDir of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!categoryDir.isDirectory() || categoryDir.name.startsWith(".")) continue;
    const catPath = path.join(baseDir, categoryDir.name);
    for (const slugDir of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!slugDir.isDirectory() || slugDir.name.startsWith(".")) continue;
      results.push({
        categoryFolder: categoryDir.name,
        slug: slugDir.name,
        dirPath: path.join(catPath, slugDir.name),
      });
    }
  }
  results.sort((a, b) => a.slug.localeCompare(b.slug));
  return results;
}

export function validateChallenges(challengesDir = CHALLENGES_DIR) {
  const errors = [];
  const dirs = listChallengeDirs(challengesDir);

  if (dirs.length === 0) {
    errors.push("No challenges found in content/challenges/");
    return errors;
  }

  const python = findPythonExecutable();
  if (!python) {
    errors.push("Python interpreter (python or python3) is required to run solve.py");
    return errors;
  }

  const seenSlugs = new Set();

  for (const item of dirs) {
    const yamlPath = path.join(item.dirPath, "challenge.yaml");
    const genPath = path.join(item.dirPath, "generate.py");
    const solvePath = path.join(item.dirPath, "solve.py");
    const filesPath = path.join(item.dirPath, "files");

    if (!fs.existsSync(yamlPath)) {
      errors.push(`${item.slug}: missing challenge.yaml`);
      continue;
    }
    if (!fs.existsSync(genPath)) {
      errors.push(`${item.slug}: missing generate.py`);
    }
    if (!fs.existsSync(solvePath)) {
      errors.push(`${item.slug}: missing solve.py`);
    }
    if (!fs.existsSync(filesPath)) {
      errors.push(`${item.slug}: missing files/ directory`);
    }

    // Security check: ensure NO plaintext KIBER{ flag is committed anywhere in the challenge folder
    const filesToScan = [yamlPath, genPath, solvePath];
    if (fs.existsSync(filesPath)) {
      for (const f of fs.readdirSync(filesPath)) {
        const full = path.join(filesPath, f);
        if (fs.statSync(full).isFile()) {
          filesToScan.push(full);
        }
      }
    }
    for (const filePath of filesToScan) {
      if (!fs.existsSync(filePath)) continue;
      const buf = fs.readFileSync(filePath);
      if (buf.includes(Buffer.from("KIBER{"))) {
        errors.push(
          `${item.slug}: plaintext flag prefix "KIBER{" found in ${path.relative(ROOT, filePath)}`,
        );
      }
    }

    const rawYaml = fs.readFileSync(yamlPath, "utf-8");
    let data;
    try {
      data = YAML.parse(rawYaml);
    } catch (err) {
      errors.push(`${item.slug}: invalid YAML in challenge.yaml (${err.message})`);
      continue;
    }

    if (data.slug !== item.slug) {
      errors.push(`${item.slug}: challenge.yaml slug "${data.slug}" does not match folder name`);
    }
    if (seenSlugs.has(item.slug)) {
      errors.push(`${item.slug}: duplicate challenge slug`);
    }
    seenSlugs.add(item.slug);

    if (!data.title || !data.description) {
      errors.push(`${item.slug}: missing title or description`);
    }
    if (!ALLOWED_CATEGORIES.has(data.category)) {
      errors.push(`${item.slug}: invalid category "${data.category}"`);
    }
    if (typeof data.points !== "number" || data.points <= 0) {
      errors.push(`${item.slug}: points must be a positive number`);
    }
    if (
      typeof data.flag_sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.flag_sha256)
    ) {
      errors.push(`${item.slug}: flag_sha256 must be a 64-character lowercase hex SHA-256 hash`);
      continue;
    }

    if (!Array.isArray(data.hints)) {
      errors.push(`${item.slug}: hints must be an array`);
    } else {
      for (const hint of data.hints) {
        if (!hint.id || !hint.text || typeof hint.cost !== "number" || hint.cost < 0) {
          errors.push(`${item.slug}: invalid hint entry`);
        }
      }
    }

    // Run solve.py and verify SHA-256(output) === flag_sha256
    if (fs.existsSync(solvePath)) {
      try {
        const output = execFileSync(python, [solvePath], {
          cwd: item.dirPath,
          encoding: "utf-8",
          timeout: 10000,
        }).trim();

        const actualHash = sha256Hex(output);
        if (actualHash !== data.flag_sha256) {
          errors.push(
            `${item.slug}: solve.py output hash does not match flag_sha256`,
          );
        }
      } catch (err) {
        errors.push(`${item.slug}: solve.py failed to execute (${err.message})`);
      }
    }
  }

  return errors;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const dirFlagIdx = process.argv.indexOf("--dir");
  const targetDir =
    dirFlagIdx !== -1 && process.argv[dirFlagIdx + 1]
      ? path.resolve(ROOT, process.argv[dirFlagIdx + 1])
      : CHALLENGES_DIR;

  const errors = validateChallenges(targetDir);
  if (errors.length > 0) {
    console.error(`Challenge validation failed (${path.relative(ROOT, targetDir)}):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log(`Challenge validation passed (${path.relative(ROOT, targetDir)}).`);
}

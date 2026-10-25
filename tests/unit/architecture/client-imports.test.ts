import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Client components must not import server modules. Bundling a service for the browser
 * pulls Prisma in with it, which throws on load ("defineExtension is unable to run in this
 * browser environment") and blanks the page — that's how the content pages broke.
 * Type-only imports are fine: they're erased at build time.
 */

/** Folders that mostly hold server code. */
const SERVER_FOLDERS = /^@\/lib\/(services|data|prisma|recommender|cache|ai\/provider|ai\/providers)(\/|$)/;
/** What makes a module server-only when it's imported. */
const SERVER_DEPENDENCY = /from\s+["'](@\/lib\/(prisma|services\/|cache\/|recommender\/)[^"']*|@prisma\/client|server-only)["']|^import\s+["']server-only["']/m;

const clientFiles = execSync("git ls-files -- components app hooks lib", { encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx?|jsx?)$/.test(file))
  .filter((file) => /^\s*["']use client["']/m.test(readFileSync(file, "utf8").slice(0, 200)));

function resolve(alias: string) {
  const base = alias.replace(/^@\//, "");
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((file) => existsSync(file));
}

/** Value imports from server folders whose target really depends on the server (static config like lib/data/landing is fine). */
function serverImports(file: string) {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)]
    .map((match) => match[1]!)
    .filter((path) => SERVER_FOLDERS.test(path))
    .filter((path) => {
      const target = resolve(path);
      return !target || SERVER_DEPENDENCY.test(readFileSync(target, "utf8"));
    });
}

describe("client components", () => {
  it("are found", () => {
    expect(clientFiles.length).toBeGreaterThan(50);
  });

  it("never import server-only modules", () => {
    const offenders = clientFiles.flatMap((file) => serverImports(file).map((path) => `${file} → ${path}`));
    expect(offenders).toEqual([]);
  });
});

/**
 * Reset the E2E database to a known state: drop everything, apply every migration, seed.
 * Runs before the app server starts (`npm run test:e2e`), so the server only ever sees seeded data.
 */
import { execSync } from "node:child_process";
import { assertE2eDatabase, E2E_DATABASE_URL } from "../tests/e2e/support/env";

assertE2eDatabase(E2E_DATABASE_URL);

const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
const run = (command: string) => execSync(command, { stdio: "inherit", env });

console.log(`Resetting E2E database ${new URL(E2E_DATABASE_URL).pathname.slice(1)}…`);
run("npx prisma migrate reset --force --skip-seed --skip-generate");
run("npx tsx prisma/seed.ts");

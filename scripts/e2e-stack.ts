/**
 * End-to-end tests against the production layout: two app servers (Docker) behind a load
 * balancer, sharing Postgres, Redis and S3 — see docker-compose.e2e.yml.
 *
 *   1. build the app image
 *   2. start Postgres, Redis and S3 from scratch
 *   3. migrate and seed the database
 *   4. start both servers and the load balancer
 *   5. run Playwright (extra arguments are passed on)
 *   6. remove everything, unless --keep
 *
 * The stack's Postgres keeps its data in memory, so a fresh start is an empty database —
 * it's only ever migrated and seeded, never reset. Seeding happens before the servers
 * start, so each boots (and warms its cache) with the seeded data.
 */
import { execSync } from "node:child_process";
import { assertE2eDatabase } from "../tests/e2e/support/env";

const compose = "docker compose -f docker-compose.e2e.yml";
// The stack's Postgres (docker-compose.e2e.yml), as seen from this machine.
const DATABASE_URL = "postgresql://test:test@localhost:55434/entertainverse_e2e";
assertE2eDatabase(DATABASE_URL);

const keep = process.argv.includes("--keep");
const playwrightArgs = process.argv.slice(2).filter((arg) => arg !== "--keep");
const run = (command: string) => execSync(command, { stdio: "inherit", env: { ...process.env, E2E_STACK: "1", DATABASE_URL } });

let failed = false;
try {
  run("docker build -t entertainverse:local .");
  run(`${compose} down`);
  run(`${compose} up -d --wait postgres redis s3`);
  run("prisma migrate deploy");
  run("tsx prisma/seed.ts");
  run(`${compose} up -d --wait app-a app-b lb`);
  run(["playwright test", ...playwrightArgs].join(" "));
} catch {
  failed = true;
} finally {
  if (keep) console.log(`\nStack left running: http://localhost:8080 — remove it with \`${compose} down\``);
  else run(`${compose} down`);
}
process.exit(failed ? 1 : 0);

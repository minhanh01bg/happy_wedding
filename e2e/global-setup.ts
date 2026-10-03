import { execFileSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
export default function setup() {
  // This path is fixed on purpose: an E2E reset must never target the development DB.
  for (const file of [
    "prisma/e2e.db",
    "prisma/e2e.db-wal",
    "prisma/e2e.db-shm",
  ])
    if (existsSync(file)) unlinkSync(file);
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execFileSync("pnpm", ["exec", "prisma", "db", "push", "--skip-generate"], {
    env,
    stdio: "inherit",
  });
  execFileSync("pnpm", ["db:seed"], { env, stdio: "inherit" });
}

setup();

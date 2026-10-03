import { randomBytes, pbkdf2Sync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Only generate local credentials on first setup. Never copy the source project's secrets or database.
if (!existsSync(".env")) {
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    password,
    Buffer.from(salt, "hex"),
    100000,
    32,
    "sha256",
  ).toString("hex");
  writeFileSync(
    ".env",
    `DATABASE_URL="file:./dev.db"\nNEXT_PUBLIC_APP_NAME="Hỷ Studio"\nNEXT_PUBLIC_APP_URL="http://localhost:3200"\nSESSION_SECRET="${randomBytes(32).toString("hex")}"\nSTORE_PASSWORD_HASH="${salt}:${hash}"\nCSP_MODE="report-only"\n`,
    { mode: 0o600 },
  );
  writeFileSync(".local-admin-password", password + "\n", { mode: 0o600 });
  process.stdout.write(
    "Đã tạo mật khẩu admin tại .local-admin-password (chỉ máy này).\n",
  );
}
execFileSync("pnpm", ["db:migrate"], { stdio: "inherit" });
execFileSync("pnpm", ["db:seed"], { stdio: "inherit" });

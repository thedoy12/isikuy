import fs from "node:fs";

const required = ["APP_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD", "DATABASE_URL"];
const envPath = ".env";

function parseDotEnv(content) {
  const values = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function fail(message) {
  console.error(`ENV ERROR: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(envPath)) {
  fail("Missing .env file. Create it from .env.example and fill production values.");
  process.exit();
}

const env = parseDotEnv(fs.readFileSync(envPath, "utf8"));

for (const key of required) {
  if (!env.get(key)) {
    fail(`${key} is required.`);
  }
}

const databaseUrl = env.get("DATABASE_URL") || "";
if (databaseUrl.includes("${{")) {
  fail("DATABASE_URL still contains an unresolved platform placeholder.");
}

try {
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    fail("DATABASE_URL must start with postgres:// or postgresql://.");
  }
  if (!parsed.hostname || !parsed.pathname.slice(1)) {
    fail("DATABASE_URL must include host and database name.");
  }
} catch {
  fail("DATABASE_URL is not a valid URL.");
}

if (!process.exitCode) {
  console.log("Environment looks ready for production startup.");
}

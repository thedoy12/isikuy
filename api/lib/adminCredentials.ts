import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { siteSettings } from "@db/schema";
import { getDb } from "../queries/connection";
import { env } from "./env";

const USERNAME_KEY = "adminUsername";
const PASSWORD_HASH_KEY = "adminPasswordHash";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, salt, hash] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function getSetting(key: string) {
  const [setting] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return setting?.value || "";
}

async function setSetting(key: string, value: string) {
  await getDb()
    .insert(siteSettings)
    .values({ key, value, type: "string" })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAdminCredentials() {
  const username = (await getSetting(USERNAME_KEY)) || env.adminUsername;
  const passwordHash = await getSetting(PASSWORD_HASH_KEY);
  return { username, passwordHash };
}

export async function verifyAdminPassword(password: string) {
  const { passwordHash } = await getAdminCredentials();
  if (passwordHash) return verifyPassword(password, passwordHash);
  return password === env.adminPassword;
}

export async function setAdminPassword(password: string) {
  await setSetting(PASSWORD_HASH_KEY, hashPassword(password));
}

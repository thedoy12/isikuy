import { eq, or } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";

export async function findUserByUsername(username: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  return rows.at(0);
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.trim().toLowerCase()))
    .limit(1);
  return rows.at(0);
}

export async function findUserByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return undefined;
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, normalizedPhone))
    .limit(1);
  return rows.at(0);
}

export async function findUserByIdentifier(identifier: string) {
  const raw = identifier.trim().toLowerCase();
  const phone = normalizePhone(raw);
  const filters = [
    eq(schema.users.username, raw),
    eq(schema.users.email, raw),
  ];

  if (phone) {
    filters.push(eq(schema.users.phone, phone));
  }

  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(or(...filters))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  await getDb()
    .insert(schema.users)
    .values(values)
    .onConflictDoUpdate({
      target: schema.users.username,
      set: updateSet,
    });
}

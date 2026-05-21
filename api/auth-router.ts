import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import {
  getAdminCredentials,
  hashPassword,
  setAdminPassword,
  verifyAdminPassword,
  verifyPassword,
} from "./lib/adminCredentials";
import { checkRateLimit, rateLimitKey } from "./lib/rateLimit";
import { signSessionToken } from "./auth/session";
import {
  findUserByEmail,
  findUserByIdentifier,
  findUserByPhone,
  findUserByUsername,
  normalizePhone,
  upsertUser,
} from "./queries/users";

function publicUser(user: Awaited<ReturnType<typeof findUserByUsername>>) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}

export const authRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const identifier = input.username.trim().toLowerCase();
      checkRateLimit({
        key: rateLimitKey(ctx.req.headers, "auth:login", identifier),
        limit: 8,
        windowMs: 15 * 60 * 1000,
        message: "Terlalu banyak percobaan login. Coba lagi nanti.",
      });
      const credentials = await getAdminCredentials();
      const passwordIsValid = await verifyAdminPassword(input.password);

      if (identifier === credentials.username.toLowerCase() && passwordIsValid) {
        await upsertUser({
          username: credentials.username,
          name: "Admin ISIKUY",
          role: "admin",
          lastSignInAt: new Date(),
        });

        const token = await signSessionToken({
          username: credentials.username,
        });
        const opts = getSessionCookieOptions(ctx.req.headers);
        ctx.resHeaders.append(
          "set-cookie",
          cookie.serialize(Session.cookieName, token, {
            httpOnly: opts.httpOnly,
            path: opts.path,
            sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
            secure: opts.secure,
            maxAge: Session.maxAgeMs / 1000,
          }),
        );

        return publicUser(await findUserByUsername(credentials.username));
      }

      if (identifier === credentials.username.toLowerCase()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Username atau password salah",
        });
      }

      const user = await findUserByIdentifier(identifier);
      if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Username atau password salah",
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Akun tidak aktif",
        });
      }

      await upsertUser({
        username: user.username,
        passwordHash: user.passwordHash,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        balance: user.balance,
        isActive: user.isActive,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        username: user.username,
      });
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );

      return publicUser(await findUserByUsername(user.username));
    }),
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(80),
        email: z.string().email().max(320),
        phone: z.string().min(8).max(30),
        username: z
          .string()
          .min(3)
          .max(32)
          .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
        password: z.string().min(8, "Password minimal 8 karakter"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const username = input.username.trim().toLowerCase();
      const email = input.email.trim().toLowerCase();
      checkRateLimit({
        key: rateLimitKey(ctx.req.headers, "auth:register", username || email),
        limit: 5,
        windowMs: 60 * 60 * 1000,
        message: "Terlalu banyak percobaan daftar. Coba lagi nanti.",
      });
      const phone = normalizePhone(input.phone);
      const credentials = await getAdminCredentials();
      if (username === credentials.username.toLowerCase()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username tidak tersedia",
        });
      }

      const existing = await findUserByUsername(username);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username sudah digunakan",
        });
      }
      if (await findUserByEmail(email)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email sudah digunakan",
        });
      }
      if (!phone || phone.length < 8) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nomor telepon tidak valid",
        });
      }
      if (await findUserByPhone(phone)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Nomor telepon sudah digunakan",
        });
      }

      await upsertUser({
        username,
        passwordHash: hashPassword(input.password),
        name: input.name,
        email,
        phone,
        role: "user",
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({ username });
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );

      return publicUser(await findUserByUsername(username));
    }),
  me: authedQuery.query((opts) => publicUser(opts.ctx.user)),
  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().min(2).max(80),
        email: z.string().email().max(320),
        phone: z.string().min(8).max(30),
        avatar: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();
      const phone = normalizePhone(input.phone);
      if (!phone || phone.length < 8) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nomor telepon tidak valid",
        });
      }

      const emailOwner = await findUserByEmail(email);
      if (emailOwner && emailOwner.id !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email sudah digunakan",
        });
      }

      const phoneOwner = await findUserByPhone(phone);
      if (phoneOwner && phoneOwner.id !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Nomor telepon sudah digunakan",
        });
      }

      await getDb()
        .update(users)
        .set({
          name: input.name.trim(),
          email,
          phone,
          avatar: input.avatar?.trim() || null,
        })
        .where(eq(users.id, ctx.user.id));

      return publicUser(await findUserByUsername(ctx.user.username));
    }),
  changePassword: authedQuery
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const credentials = await getAdminCredentials();
      const isEnvAdmin = ctx.user.username.toLowerCase() === credentials.username.toLowerCase();

      if (isEnvAdmin) {
        const currentPasswordIsValid = await verifyAdminPassword(input.currentPassword);
        if (!currentPasswordIsValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Password lama tidak sesuai" });
        }
        await setAdminPassword(input.newPassword);
        return { success: true };
      }

      if (!ctx.user.passwordHash || !verifyPassword(input.currentPassword, ctx.user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Password lama tidak sesuai" });
      }

      await getDb()
        .update(users)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});

import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import {
  getAdminCredentials,
  hashPassword,
  verifyAdminPassword,
  verifyPassword,
} from "./lib/adminCredentials";
import { signSessionToken } from "./auth/session";
import { findUserByUsername, upsertUser } from "./queries/users";

function publicUser(user: Awaited<ReturnType<typeof findUserByUsername>>) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
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
      const username = input.username.trim().toLowerCase();
      const credentials = await getAdminCredentials();
      const passwordIsValid = await verifyAdminPassword(input.password);

      if (username === credentials.username.toLowerCase() && passwordIsValid) {
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

      if (username === credentials.username.toLowerCase()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Username atau password salah",
        });
      }

      const user = await findUserByUsername(username);
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

      await upsertUser({
        username,
        passwordHash: hashPassword(input.password),
        name: input.name,
        email: input.email,
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
  logout: authedQuery.mutation(async ({ ctx }) => {
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

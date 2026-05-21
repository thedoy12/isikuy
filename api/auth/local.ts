import * as cookie from "cookie";
import { Errors } from "@contracts/errors";
import { Session } from "@contracts/constants";
import { findUserByUsername } from "../queries/users";
import { verifySessionToken } from "./session";

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }

  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }

  const user = await findUserByUsername(claim.username);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  if (!user.isActive) {
    throw Errors.forbidden("Akun tidak aktif. Silakan hubungi admin.");
  }

  return user;
}

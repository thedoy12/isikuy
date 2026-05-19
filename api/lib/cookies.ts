import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function isHttpsRequest(headers: Headers): boolean {
  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }

  const forwardedSsl = headers.get("x-forwarded-ssl");
  if (forwardedSsl) {
    return forwardedSsl.toLowerCase() === "on";
  }

  const origin = headers.get("origin") || headers.get("referer");
  return !!origin?.toLowerCase().startsWith("https://");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);
  const https = isHttpsRequest(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: localhost || !https ? "Lax" : "None",
    secure: https,
  };
}

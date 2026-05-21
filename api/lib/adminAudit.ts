import type { TrpcContext } from "../context";
import { activityLogs } from "@db/schema";
import { getDb } from "../queries/connection";
import { clientIp } from "./rateLimit";

export async function logAdminAction(input: {
  ctx: TrpcContext;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await getDb().insert(activityLogs).values({
      userId: input.ctx.user?.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ?? {},
      ipAddress: clientIp(input.ctx.req.headers),
      userAgent: input.ctx.req.headers.get("user-agent") || "",
    });
  } catch (error) {
    console.warn("[audit] Failed to write admin action log", error);
  }
}

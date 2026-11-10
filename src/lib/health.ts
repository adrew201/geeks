import { prisma } from "./prisma.js";
import { connection } from "./queues.js";

const TIMEOUT_MS = 2000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
  ]);
}

async function check(fn: () => Promise<unknown>): Promise<"ok" | "down"> {
  try {
    await withTimeout(fn());
    return "ok";
  } catch {
    return "down";
  }
}

/** Used by GET /health and Render's health check. 503 if either dependency is down. */
export async function getHealth() {
  const [db, redis] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(() => connection.ping()),
  ]);
  const ok = db === "ok" && redis === "ok";
  return { statusCode: ok ? 200 : 503, body: { status: ok ? "ok" : "degraded", db, redis } };
}

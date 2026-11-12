import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { AppError, errorHandler } from "./errors.js";

// The 502 response hides the cause from the client, so the cause must reach the server log.
describe("errorHandler", () => {
  it("logs the cause of a 5xx AppError and still sends the generic message", async () => {
    const app = Fastify({ logger: false });
    const logged: unknown[] = [];
    app.setErrorHandler((err: Parameters<typeof errorHandler>[0], req, reply) => {
      (req as unknown as { log: { error: (...a: unknown[]) => void } }).log = {
        error: (...a: unknown[]) => logged.push(a),
      } as never;
      return errorHandler(err, req, reply);
    });
    app.get("/boom", async () => {
      throw new AppError(502, "PAYPAL_UNAVAILABLE", "PayPal didn't respond, please try again", {
        cause: new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set"),
      });
    });

    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({
      error: { code: "PAYPAL_UNAVAILABLE", message: "PayPal didn't respond, please try again" },
    });
    const [first] = logged as [[{ code: string; cause: Error }, string]];
    expect(first[0].code).toBe("PAYPAL_UNAVAILABLE");
    expect(first[0].cause.message).toBe("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
    await app.close();
  });

  it("does not log a 4xx AppError", async () => {
    const app = Fastify({ logger: false });
    const logged: unknown[] = [];
    app.setErrorHandler((err: Parameters<typeof errorHandler>[0], req, reply) => {
      (req as unknown as { log: unknown }).log = { error: (...a: unknown[]) => logged.push(a) };
      return errorHandler(err, req, reply);
    });
    app.get("/nope", async () => {
      throw new AppError(404, "GAMER_NOT_FOUND", "Gamer not found");
    });
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(logged).toHaveLength(0);
    await app.close();
  });
});

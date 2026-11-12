import type { FastifyReply, FastifyRequest } from "fastify";

/** One error shape everywhere: { error: { code, message } } (README section 14). */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export function errorHandler(
  err: Error & { validation?: unknown },
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (err instanceof AppError) {
    // A 5xx hides its cause from the client; log the cause so the Render logs say why.
    if (err.status >= 500) req.log.error({ code: err.code, cause: err.cause }, err.message);
    return reply.code(err.status).send({ error: { code: err.code, message: err.message } });
  }
  if (err.validation) {
    return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: err.message } });
  }
  req.log.error(err);
  return reply.code(500).send({ error: { code: "INTERNAL", message: "Something went wrong" } });
}

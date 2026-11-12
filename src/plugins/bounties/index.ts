import type { FastifyPluginAsync } from "fastify";
import { getBounty, listBounties, rejectSubmission, toApiBounty } from "./service.js";

function sendError(reply: { code(n: number): any; send(e: unknown): unknown }, err: unknown) {
  const status =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode: unknown }).statusCode) || 400
      : 500;
  return reply.code(status).send({ error: err instanceof Error ? err.message : "failed" });
}

const bountiesPlugin: FastifyPluginAsync = async (app) => {
  app.get("/bounties", async (_req, reply) => {
    try {
      const bounties = await listBounties();
      return reply.send(bounties.map((b) => toApiBounty(b)));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Reads are public; a logged-in non-creator sees only their own entries.
  app.get<{ Params: { id: string } }>("/bounties/:id", async (req, reply) => {
    try {
      let viewerId: string | null = null;
      try {
        await req.jwtVerify();
        viewerId = req.user.sub;
      } catch {
        viewerId = null;
      }
      return reply.send(await getBounty((req.params as { id: string }).id, viewerId));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Migration plan O5: creator-only reject. Authenticate first; the creator
  // check lives in the service.
  app.post<{ Params: { id: string; submissionId: string } }>(
    "/bounties/:id/submissions/:submissionId/reject",
    { preHandler: app.authenticate },
    async (req, reply) => {
      try {
        const { id, submissionId } = req.params as { id: string; submissionId: string };
        return reply.send(
          await rejectSubmission({ bountyId: id, submissionId, requesterId: req.user.sub })
        );
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );
};

export default bountiesPlugin;

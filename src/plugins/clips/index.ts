import type { FastifyPluginAsync } from "fastify";
import { clipRoutes } from "./routes.js";

const clipsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(clipRoutes);
};

export default clipsPlugin;

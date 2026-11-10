import "dotenv/config";
import { buildApp } from "./app.js";

const app = buildApp();
await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });

// Render free tier has no background workers: run BullMQ workers in this process instead.
if (process.env.RUN_WORKERS_IN_API === "true") {
  await import("./workers/index.js");
  app.log.info("BullMQ workers started inside the API process");
}

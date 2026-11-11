import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. DATABASE_URL on Render is the internal URL.
// DATABASE_SCHEMA is optional (default "public"); set it to point the app at another Postgres schema.
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  { schema: process.env.DATABASE_SCHEMA || undefined },
);
export const prisma = new PrismaClient({ adapter });

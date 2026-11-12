-- Self-declared date of birth, collected at signup (src/lib/age.ts).
-- Nullable: accounts created before this change have none.
-- IF NOT EXISTS: safe if the column was already added by hand on a database (Render runs
-- migrations manually, see render.yaml).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;

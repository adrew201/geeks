-- Self-declared date of birth, collected at signup (src/lib/age.ts).
-- Nullable: accounts created before this change have none.
ALTER TABLE "users" ADD COLUMN "dateOfBirth" DATE;

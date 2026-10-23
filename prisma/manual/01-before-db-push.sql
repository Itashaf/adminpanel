-- Run BEFORE `npx prisma db push` (safe to run twice).
-- ReportLocks gets a required schoolId. Add it as nullable, fill it from the report each lock
-- belongs to, and drop any lock whose report no longer exists. db push then makes it NOT NULL.
ALTER TABLE "ReportLocks" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
UPDATE "ReportLocks" l SET "schoolId" = r."schoolId" FROM "MonthlyReports" r WHERE l."schoolId" IS NULL AND l."reportKind" = 'MONTHLY' AND l."reportId" = r."id";
UPDATE "ReportLocks" l SET "schoolId" = r."schoolId" FROM "YearlyReports" r WHERE l."schoolId" IS NULL AND l."reportKind" = 'YEARLY' AND l."reportId" = r."id";
DELETE FROM "ReportLocks" WHERE "schoolId" IS NULL;

-- Payment.receiptNumber + its per-school unique index, created here (the column is empty, so
-- nothing can clash) so `db push` has no data-loss warning to stop on.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptNumber" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_schoolId_receiptNumber_key" ON "Payment" ("schoolId", "receiptNumber");

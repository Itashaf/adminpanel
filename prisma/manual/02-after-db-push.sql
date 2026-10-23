-- Run AFTER `npx prisma db push` (safe to run twice).
-- Before running, these two should return no rows (otherwise fix that data first):
--   SELECT "schoolId" FROM "AcademicSessions" WHERE status = 'Active' GROUP BY 1 HAVING COUNT(*) > 1;
--   SELECT "classTeacherId", "academicSession" FROM "Sections" WHERE "classTeacherId" IS NOT NULL AND status = 'Active' GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- DB-011: rules that used to be enforced only in code.
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicSessions_one_active_per_school" ON "AcademicSessions" ("schoolId") WHERE status = 'Active';
CREATE UNIQUE INDEX IF NOT EXISTS "Sections_one_class_teacher_per_session" ON "Sections" ("classTeacherId", "academicSession") WHERE "classTeacherId" IS NOT NULL AND status = 'Active';

-- DB-010: money can never be negative / zero.
DO $$ BEGIN
  ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_amounts_check" CHECK ("paidAmount" >= 0 AND "totalAmount" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check" CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StudentFeeItem" ADD CONSTRAINT "StudentFeeItem_amount_check" CHECK (amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

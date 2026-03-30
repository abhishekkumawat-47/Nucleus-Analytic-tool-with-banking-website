/*
  Warnings:

  - The values [COMPANY] on the enum `CustomerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CustomerType_new" AS ENUM ('INDIVIDUAL', 'SHOPPING', 'ENTERTAINMENT', 'HOUSING', 'FOOD', 'OTHERS');
ALTER TABLE "Customer" ALTER COLUMN "customerType" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "customerType" TYPE "CustomerType_new" USING ("customerType"::text::"CustomerType_new");
ALTER TABLE "Payee" ADD COLUMN "payeeType" "CustomerType_new" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Payee" ALTER COLUMN "payeeType" TYPE "CustomerType_new" USING ("payeeType"::text::"CustomerType_new");
ALTER TYPE "CustomerType" RENAME TO "CustomerType_old";
ALTER TYPE "CustomerType_new" RENAME TO "CustomerType";
DROP TYPE "CustomerType_old";
ALTER TABLE "Customer" ALTER COLUMN "customerType" SET DEFAULT 'INDIVIDUAL';
COMMIT;

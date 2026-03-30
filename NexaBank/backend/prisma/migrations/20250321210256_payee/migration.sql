/*
  Warnings:

  - The values [FIXED_DEPOSIT,RECURRING_DEPOSIT] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - The values [option1,option2] on the enum `LoanType` will be removed. If these variants are still used in the database, this will fail.
  - The values [DEPOSIT,WITHDRAW] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `accNo` on the `Loan` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('SAVINGS', 'CURRENT', 'LOAN', 'CREDIT_CARD', 'INVESTMENT');
ALTER TABLE "Account" ALTER COLUMN "accountType" DROP DEFAULT;
ALTER TABLE "Account" ALTER COLUMN "accountType" TYPE "AccountType_new" USING ("accountType"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
ALTER TABLE "Account" ALTER COLUMN "accountType" SET DEFAULT 'SAVINGS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LoanType_new" AS ENUM ('HOME', 'AUTO', 'PERSONAL', 'STUDENT');
ALTER TABLE "Loan" ALTER COLUMN "loanType" TYPE "LoanType_new" USING ("loanType"::text::"LoanType_new");
ALTER TYPE "LoanType" RENAME TO "LoanType_old";
ALTER TYPE "LoanType_new" RENAME TO "LoanType";
DROP TYPE "LoanType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('PAYMENT', 'TRANSFER');
ALTER TABLE "Transaction" ALTER COLUMN "transactionType" TYPE "TransactionType_new" USING ("transactionType"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_accNo_fkey";

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "accNo",
ADD COLUMN     "accNo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Payee" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "payeeAccNo" TEXT NOT NULL,
    "payeeifsc" TEXT NOT NULL,
    "payeeCustomerId" UUID NOT NULL,
    "payerCustomerId" UUID NOT NULL,

    CONSTRAINT "Payee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_accNo_fkey" FOREIGN KEY ("accNo") REFERENCES "Account"("accNo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payee" ADD CONSTRAINT "Payee_payeeAccNo_fkey" FOREIGN KEY ("payeeAccNo") REFERENCES "Account"("accNo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payee" ADD CONSTRAINT "Payee_payeeCustomerId_fkey" FOREIGN KEY ("payeeCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payee" ADD CONSTRAINT "Payee_payerCustomerId_fkey" FOREIGN KEY ("payerCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

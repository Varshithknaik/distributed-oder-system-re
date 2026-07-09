-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('OUT_OF_STOCK', 'PAYMENT_FAILED', 'USER_REQUESTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationReason" "CancellationReason";

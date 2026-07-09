/*
  Warnings:

  - Made the column `productName` on table `order_items` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "productName" SET NOT NULL;

/*
  Warnings:

  - You are about to alter the column `type` on the `category` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `category` MODIFY `type` ENUM('INCOME', 'EXPENSE') NOT NULL;

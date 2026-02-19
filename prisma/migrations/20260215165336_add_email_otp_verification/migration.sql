-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `emailOtpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `emailOtpHash` VARCHAR(191) NULL,
    ADD COLUMN `emailOtpLastSentAt` DATETIME(3) NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT true;

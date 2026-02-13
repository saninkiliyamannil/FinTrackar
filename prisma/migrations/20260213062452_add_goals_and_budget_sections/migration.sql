-- CreateTable
CREATE TABLE `Goal` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `targetAmount` DECIMAL(14, 2) NOT NULL,
    `currentAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `targetDate` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `Goal_userId_status_targetDate_idx`(`userId`, `status`, `targetDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

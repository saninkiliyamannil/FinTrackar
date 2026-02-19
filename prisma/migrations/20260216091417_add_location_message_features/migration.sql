-- CreateTable
CREATE TABLE `LocationAnchor` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `locationKey` VARCHAR(191) NOT NULL,
    `hourStart` INTEGER NOT NULL,
    `hourEnd` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `LocationAnchor_userId_isActive_idx`(`userId`, `isActive`),
    UNIQUE INDEX `LocationAnchor_userId_label_key`(`userId`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationReminderLog` (
    `id` VARCHAR(191) NOT NULL,
    `remindedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `anchorId` VARCHAR(191) NOT NULL,

    INDEX `LocationReminderLog_userId_remindedAt_idx`(`userId`, `remindedAt`),
    INDEX `LocationReminderLog_anchorId_remindedAt_idx`(`anchorId`, `remindedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageImport` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'SAMPLE_IMAGE',
    `imagePath` VARCHAR(191) NULL,
    `extractedText` VARCHAR(191) NULL,
    `parsedAmount` DECIMAL(14, 2) NULL,
    `parsedType` ENUM('INCOME', 'EXPENSE') NULL,
    `parsedDate` DATETIME(3) NULL,
    `parsedNote` VARCHAR(191) NULL,
    `confidence` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('PARSED', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'PARSED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `MessageImport_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LocationAnchor` ADD CONSTRAINT `LocationAnchor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationReminderLog` ADD CONSTRAINT `LocationReminderLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationReminderLog` ADD CONSTRAINT `LocationReminderLog_anchorId_fkey` FOREIGN KEY (`anchorId`) REFERENCES `LocationAnchor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageImport` ADD CONSTRAINT `MessageImport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `SharedExpense` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `splitMethod` ENUM('EQUAL', 'CUSTOM') NOT NULL DEFAULT 'EQUAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `SharedExpense_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedExpenseParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `participantName` VARCHAR(191) NOT NULL,
    `shareAmount` DECIMAL(14, 2) NOT NULL,
    `paidAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `isSettled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sharedExpenseId` VARCHAR(191) NOT NULL,

    INDEX `SharedExpenseParticipant_sharedExpenseId_isSettled_idx`(`sharedExpenseId`, `isSettled`),
    UNIQUE INDEX `SharedExpenseParticipant_sharedExpenseId_participantName_key`(`sharedExpenseId`, `participantName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SharedExpense` ADD CONSTRAINT `SharedExpense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedExpenseParticipant` ADD CONSTRAINT `SharedExpenseParticipant_sharedExpenseId_fkey` FOREIGN KEY (`sharedExpenseId`) REFERENCES `SharedExpense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

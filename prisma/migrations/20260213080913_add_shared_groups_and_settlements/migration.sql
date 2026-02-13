-- AlterTable
ALTER TABLE `sharedexpense` ADD COLUMN `groupId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SharedGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `inviteCode` VARCHAR(191) NOT NULL,
    `isPersonal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SharedGroup_inviteCode_key`(`inviteCode`),
    INDEX `SharedGroup_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedGroupMember` (
    `id` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `SharedGroupMember_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `SharedGroupMember_groupId_userId_key`(`groupId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedSettlement` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `note` VARCHAR(191) NULL,
    `status` ENUM('PROPOSED', 'SETTLED', 'CANCELED') NOT NULL DEFAULT 'PROPOSED',
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `fromMemberId` VARCHAR(191) NOT NULL,
    `toMemberId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,

    INDEX `SharedSettlement_groupId_status_createdAt_idx`(`groupId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SharedExpense_groupId_date_idx` ON `SharedExpense`(`groupId`, `date`);

-- AddForeignKey
ALTER TABLE `SharedExpense` ADD CONSTRAINT `SharedExpense_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `SharedGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedGroup` ADD CONSTRAINT `SharedGroup_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedGroupMember` ADD CONSTRAINT `SharedGroupMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `SharedGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedGroupMember` ADD CONSTRAINT `SharedGroupMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedSettlement` ADD CONSTRAINT `SharedSettlement_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `SharedGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedSettlement` ADD CONSTRAINT `SharedSettlement_fromMemberId_fkey` FOREIGN KEY (`fromMemberId`) REFERENCES `SharedGroupMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedSettlement` ADD CONSTRAINT `SharedSettlement_toMemberId_fkey` FOREIGN KEY (`toMemberId`) REFERENCES `SharedGroupMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedSettlement` ADD CONSTRAINT `SharedSettlement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

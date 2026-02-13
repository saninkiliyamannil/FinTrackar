-- Add as nullable first for existing rows.
ALTER TABLE `user` ADD COLUMN `passwordHash` VARCHAR(191) NULL;

-- Backfill existing users; these users must reset by creating a new account/password.
UPDATE `user`
SET `passwordHash` = 'legacy-account-reset-required'
WHERE `passwordHash` IS NULL;

-- Enforce required field for all future writes.
ALTER TABLE `user` MODIFY `passwordHash` VARCHAR(191) NOT NULL;

-- FinTrackar MySQL bootstrap
-- Run this as a privileged MySQL user, then set DATABASE_URL accordingly.

CREATE DATABASE IF NOT EXISTS fintrackar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional: create a dedicated app user
-- CREATE USER 'fintrackar_app'@'%' IDENTIFIED BY 'replace_with_strong_password';
-- GRANT ALL PRIVILEGES ON fintrackar.* TO 'fintrackar_app'@'%';
-- FLUSH PRIVILEGES;
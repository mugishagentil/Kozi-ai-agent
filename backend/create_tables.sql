-- Kozi AI Database Schema
-- Run this in phpMyAdmin or MySQL command line

-- Use kozi database
USE kozi;

-- 1. Create documents table (Knowledge Base)
CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NULL,
  `content` TEXT NULL,
  `embedding` LONGTEXT NULL,
  `source` VARCHAR(100) NULL COMMENT 'knowledge_base, website, pdf, etc.',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create ChatSession table (Conversation Tracking)
CREATE TABLE IF NOT EXISTS `ChatSession` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `users_id` INT NOT NULL,
  `role_type` VARCHAR(191) NOT NULL DEFAULT 'employee' COMMENT 'employee, employer, admin',
  `title` VARCHAR(191) NULL,
  `thread_id` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Current active thread for user',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ChatSession_thread_id_key` (`thread_id`),
  INDEX `ChatSession_users_id_idx` (`users_id`),
  INDEX `ChatSession_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create ChatMessage table (Optional - Not currently used)
CREATE TABLE IF NOT EXISTS `ChatMessage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sessionId` INT NOT NULL,
  `role` VARCHAR(191) NOT NULL COMMENT 'user, assistant, system',
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ChatMessage_sessionId_idx` (`sessionId`),
  CONSTRAINT `ChatMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ChatSession` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables created
SHOW TABLES;

-- Check table structures
DESCRIBE documents;
DESCRIBE ChatSession;
DESCRIBE ChatMessage;

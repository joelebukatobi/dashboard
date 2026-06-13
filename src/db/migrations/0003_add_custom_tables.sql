-- Migration: Add custom application tables
-- Consolidated: setup_tokens, albums
-- Created: 2026-05-15

-- Setup tokens for initial admin creation wizard
CREATE TABLE IF NOT EXISTS `setup_tokens` (
	`id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `setup_tokens_token_hash_unique` UNIQUE(`token_hash`)
);

--> statement-breakpoint

-- Albums table for media organization
CREATE TABLE IF NOT EXISTS `albums` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `title` varchar(200) NOT NULL,
  `slug` varchar(200) NOT NULL UNIQUE,
  `description` TEXT,
  `cover_image_id` varchar(36),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `fk_albums_cover_image` FOREIGN KEY (`cover_image_id`) REFERENCES `media_items` (`id`) ON DELETE SET NULL
);

--> statement-breakpoint

-- Add album_id to media_items for album organization
ALTER TABLE `media_items`
  ADD COLUMN `album_id` varchar(36) NULL AFTER `uploaded_by`,
  ADD CONSTRAINT `fk_media_items_album` FOREIGN KEY (`album_id`) REFERENCES `albums` (`id`) ON DELETE SET NULL;

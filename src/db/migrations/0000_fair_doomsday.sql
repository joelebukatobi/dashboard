CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`type` enum('POST_CREATED','POST_UPDATED','POST_PUBLISHED','POST_DELETED','CATEGORY_CREATED','CATEGORY_UPDATED','CATEGORY_DELETED','TAG_CREATED','TAG_UPDATED','TAG_DELETED','USER_CREATED','USER_UPDATED','USER_DELETED','USER_INVITED','USER_SUSPENDED','USER_ACTIVATED','IMAGE_UPLOADED','IMAGE_UPDATED','IMAGE_DELETED','VIDEO_UPLOADED','VIDEO_UPDATED','VIDEO_DELETED','LOGIN','LOGOUT','SETTINGS_UPDATED','COMMENT_CREATED','SUBSCRIBER_CREATED') NOT NULL,
	`description` text NOT NULL,
	`entity_type` varchar(50),
	`entity_id` varchar(36),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`post_id` varchar(36),
	`session_id` varchar(255),
	`ip_address` varchar(45),
	`user_agent` text,
	`referrer` text,
	`path` varchar(500),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`title` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`post_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`parent_id` varchar(36),
	`author_name` varchar(100),
	`author_email` varchar(255),
	`content` text NOT NULL,
	`status` enum('PENDING','APPROVED','SPAM') NOT NULL DEFAULT 'APPROVED',
	`is_edited` boolean NOT NULL DEFAULT false,
	`edited_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_page_views` (
	`id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`total_views` int NOT NULL DEFAULT 0,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_page_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_page_views_date_idx` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` varchar(36) NOT NULL,
	`type` enum('IMAGE','VIDEO') NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`width` int,
	`height` int,
	`duration` int,
	`alt_text` varchar(255),
	`title` varchar(255),
	`caption` text,
	`description` text,
	`tag` varchar(50),
	`path` varchar(500) NOT NULL,
	`thumbnail_path` varchar(500),
	`hash` varchar(64),
	`uploaded_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_accounts_provider_provider_account_id_pk` PRIMARY KEY(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_resets_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_tags_post_id_tag_id_pk` PRIMARY KEY(`post_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`featured_image_id` varchar(36),
	`author_id` varchar(36) NOT NULL,
	`category_id` varchar(36),
	`status` enum('PUBLISHED','DRAFT','ARCHIVED','SCHEDULED') NOT NULL DEFAULT 'DRAFT',
	`view_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`meta_title` varchar(60),
	`meta_description` varchar(160),
	`published_at` timestamp,
	`scheduled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(500) NOT NULL,
	`remember_me` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	`user_agent` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`group` enum('GENERAL','SECURITY','CONTENT','EMAIL','SOCIAL') NOT NULL DEFAULT 'GENERAL',
	`type` enum('STRING','NUMBER','BOOLEAN','JSON') NOT NULL DEFAULT 'STRING',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(100),
	`status` enum('ACTIVE','PENDING','UNSUBSCRIBED','BOUNCED') NOT NULL DEFAULT 'ACTIVE',
	`confirmed_at` timestamp,
	`unsubscribed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`post_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255),
	`role` enum('ADMIN','EDITOR','AUTHOR','VIEWER') NOT NULL DEFAULT 'VIEWER',
	`status` enum('ACTIVE','INVITED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
	`avatar_url` varchar(500),
	`email_verified` boolean NOT NULL DEFAULT false,
	`invited_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`last_active_at` timestamp,
	`failed_login_attempts` int NOT NULL DEFAULT 0,
	`locked_until` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_parent_id_comments_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_items` ADD CONSTRAINT `media_items_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_tags` ADD CONSTRAINT `post_tags_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_tags` ADD CONSTRAINT `post_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_featured_image_id_media_items_id_fk` FOREIGN KEY (`featured_image_id`) REFERENCES `media_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `subscribers` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `color_class` varchar(50) DEFAULT 'badge--primary' NOT NULL;
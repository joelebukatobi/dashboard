ALTER TABLE `users` ADD `totp_secret` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled` boolean DEFAULT false NOT NULL;

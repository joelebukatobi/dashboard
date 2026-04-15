CREATE TABLE `setup_tokens` (
	`id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `setup_tokens_token_hash_unique` UNIQUE(`token_hash`)
);

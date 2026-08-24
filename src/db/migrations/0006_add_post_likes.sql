CREATE TABLE `post_likes` (
	`post_id` varchar(36) NOT NULL,
	`visitor_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_likes_post_id_visitor_id_pk` PRIMARY KEY(`post_id`,`visitor_id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `like_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `post_likes` ADD CONSTRAINT `post_likes_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;

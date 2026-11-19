CREATE TABLE `kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cached_channels` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`server_id` text,
	`opened_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cached_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`author_id` text,
	`type` integer,
	`content` text,
	`json` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_cached_messages_channel` ON `cached_messages` (`channel_id`,`id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`nonce` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`channel_id` text,
	`server_id` text,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_error` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `read_states` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`last_read_message_id` text,
	`mention_count` integer
);

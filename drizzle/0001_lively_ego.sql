CREATE TABLE `meme_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(100) NOT NULL,
	`model` varchar(64) NOT NULL,
	`generatedText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`accessCount` int NOT NULL DEFAULT 1,
	`lastAccessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meme_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(100) NOT NULL,
	`model` varchar(64) NOT NULL,
	`cacheHit` int NOT NULL DEFAULT 0,
	`responseTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_logs_id` PRIMARY KEY(`id`)
);

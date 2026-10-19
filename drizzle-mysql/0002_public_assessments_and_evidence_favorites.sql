CREATE TABLE `evidence_favorites` (
	`user_id` varchar(80) NOT NULL,
	`evidence_id` varchar(80) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `idx_evidence_favorites_unique` UNIQUE(`user_id`,`evidence_id`)
);
--> statement-breakpoint
ALTER TABLE `assessment_types` ADD `is_public` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence_favorites` ADD CONSTRAINT `evidence_favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence_favorites` ADD CONSTRAINT `evidence_favorites_evidence_id_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_evidence_favorites_user` ON `evidence_favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_assessment_types_public_active` ON `assessment_types` (`is_public`,`active`);
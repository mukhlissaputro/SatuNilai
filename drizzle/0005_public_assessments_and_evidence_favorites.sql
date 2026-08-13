ALTER TABLE `assessment_types` ADD `is_public` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_assessment_types_public_active` ON `assessment_types` (`is_public`,`active`);
--> statement-breakpoint
CREATE TABLE `evidence_favorites` (
  `user_id` text NOT NULL,
  `evidence_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_favorites_unique` ON `evidence_favorites` (`user_id`,`evidence_id`);
--> statement-breakpoint
CREATE INDEX `idx_evidence_favorites_user` ON `evidence_favorites` (`user_id`,`created_at`);

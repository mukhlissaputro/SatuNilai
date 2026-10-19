CREATE TABLE `assessment_periods` (
	`id` varchar(80) NOT NULL,
	`assessment_type_id` varchar(80) NOT NULL,
	`instrument_version_id` varchar(80) NOT NULL,
	`year` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`max_score` double NOT NULL DEFAULT 5,
	`starts_at` varchar(255) NOT NULL,
	`due_at` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`finalized_at` varchar(255),
	`finalized_by` varchar(255),
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assessment_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_types` (
	`id` varchar(80) NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assessment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_assessment_types_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` varchar(80) NOT NULL,
	`period_id` varchar(80) NOT NULL,
	`indicator_id` varchar(80) NOT NULL,
	`unit_id` varchar(80) NOT NULL,
	`assigned_by` varchar(255) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_assignments_period_indicator_unit` UNIQUE(`period_id`,`indicator_id`,`unit_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(80) NOT NULL,
	`actor_id` varchar(80),
	`action` varchar(255) NOT NULL,
	`entity_type` varchar(255) NOT NULL,
	`entity_id` varchar(80) NOT NULL,
	`metadata` text NOT NULL DEFAULT ('{}'),
	`ip_hash` varchar(255),
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(80) NOT NULL,
	`user_id` varchar(80) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` varchar(255) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_auth_sessions_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(80) NOT NULL,
	`instrument_version_id` varchar(80) NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`weight_percent` double,
	`target_value` double,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_categories_version_code` UNIQUE(`instrument_version_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` varchar(80) NOT NULL,
	`unit_id` varchar(80) NOT NULL,
	`title` varchar(255) NOT NULL,
	`source_type` varchar(32) NOT NULL,
	`current_version_id` varchar(80),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`rejected_at` varchar(255),
	`created_by` varchar(255) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_links` (
	`id` varchar(80) NOT NULL,
	`evidence_id` varchar(80) NOT NULL,
	`score_id` varchar(80) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_evidence_links_evidence_score` UNIQUE(`evidence_id`,`score_id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_versions` (
	`id` varchar(80) NOT NULL,
	`evidence_id` varchar(80) NOT NULL,
	`version` int NOT NULL,
	`object_key` text,
	`external_url` text,
	`original_filename` varchar(255),
	`content_type` varchar(255),
	`size_bytes` int,
	`sha256` varchar(64),
	`reviewer_note` text NOT NULL DEFAULT (''),
	`uploaded_by` varchar(255) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_evidence_versions_evidence_version` UNIQUE(`evidence_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `indicator_scores` (
	`id` varchar(80) NOT NULL,
	`period_id` varchar(80) NOT NULL,
	`indicator_id` varchar(80) NOT NULL,
	`unit_id` varchar(80) NOT NULL,
	`target_value` double,
	`internal_value` double,
	`assessor_value` double,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`staff_note` text NOT NULL DEFAULT (''),
	`reviewer_note` text NOT NULL DEFAULT (''),
	`submitted_at` varchar(255),
	`reviewed_at` varchar(255),
	`reviewed_by` varchar(255),
	`revision` int NOT NULL DEFAULT 1,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `indicator_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_scores_period_indicator_unit` UNIQUE(`period_id`,`indicator_id`,`unit_id`)
);
--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` varchar(80) NOT NULL,
	`subcategory_id` varchar(80) NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`weight_percent` double,
	`target_value` double,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `indicators_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_indicators_subcategory_code` UNIQUE(`subcategory_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `instrument_versions` (
	`id` varchar(80) NOT NULL,
	`assessment_type_id` varchar(80) NOT NULL,
	`version` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`published_at` varchar(255),
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `instrument_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_instrument_versions_type_version` UNIQUE(`assessment_type_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`id` varchar(80) NOT NULL,
	`user_id` varchar(80) NOT NULL,
	`notification_key` varchar(500) NOT NULL,
	`read_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notification_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_notification_reads_user_key` UNIQUE(`user_id`,`notification_key`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(80) NOT NULL,
	`user_id` varchar(80) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` varchar(255) NOT NULL,
	`used_at` varchar(255),
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_password_reset_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `score_options` (
	`id` varchar(80) NOT NULL,
	`indicator_id` varchar(80) NOT NULL,
	`value` double NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `score_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_score_options_indicator_value` UNIQUE(`indicator_id`,`value`)
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` varchar(80) NOT NULL,
	`category_id` varchar(80) NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`weight_percent` double,
	`target_value` double,
	`final_value` double,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `subcategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_subcategories_category_code` UNIQUE(`category_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` varchar(80) NOT NULL,
	`code` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_units_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `user_assessment_types` (
	`user_id` varchar(80) NOT NULL,
	`assessment_type_id` varchar(80) NOT NULL,
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `idx_user_assessment_types_unique` UNIQUE(`user_id`,`assessment_type_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(80) NOT NULL,
	`email` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'staff',
	`unit_id` varchar(80),
	`active` boolean NOT NULL DEFAULT true,
	`password_hash` varchar(64),
	`password_salt` varchar(255),
	`password_changed_at` varchar(255),
	`created_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` varchar(255) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assessment_periods` ADD CONSTRAINT `assessment_periods_instrument_version_id_instrumen_438e8a16349d` FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assessment_periods` ADD CONSTRAINT `assessment_periods_finalized_by_users_id_fk` FOREIGN KEY (`finalized_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assignments` ADD CONSTRAINT `assignments_period_id_assessment_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `assessment_periods`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assignments` ADD CONSTRAINT `assignments_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assignments` ADD CONSTRAINT `assignments_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`assignments` ADD CONSTRAINT `assignments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`categories` ADD CONSTRAINT `categories_instrument_version_id_instrument_versions_id_fk` FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence` ADD CONSTRAINT `evidence_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence` ADD CONSTRAINT `evidence_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence_links` ADD CONSTRAINT `evidence_links_evidence_id_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence_links` ADD CONSTRAINT `evidence_links_score_id_indicator_scores_id_fk` FOREIGN KEY (`score_id`) REFERENCES `indicator_scores`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence_versions` ADD CONSTRAINT `evidence_versions_evidence_id_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`evidence_versions` ADD CONSTRAINT `evidence_versions_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`indicator_scores` ADD CONSTRAINT `indicator_scores_period_id_assessment_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `assessment_periods`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`indicator_scores` ADD CONSTRAINT `indicator_scores_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`indicator_scores` ADD CONSTRAINT `indicator_scores_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`indicator_scores` ADD CONSTRAINT `indicator_scores_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`indicators` ADD CONSTRAINT `indicators_subcategory_id_subcategories_id_fk` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`instrument_versions` ADD CONSTRAINT `instrument_versions_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`notification_reads` ADD CONSTRAINT `notification_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statem_0f0404d5a502`password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`score_options` ADD CONSTRAINT `score_options_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`subcategories` ADD CONSTRAINT `subcategories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`user_assessment_types` ADD CONSTRAINT `user_assessment_types_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`user_assessment_types` ADD CONSTRAINT `user_assessment_types_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON DELETE no action ON UPDATE no action;--> stat_4cf25b495ce8`users` ADD CONSTRAINT `users_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> stat_fcfa83c4e476`idx_periods_type_year` ON `assessment_periods` (`assessment_type_id`,`year`);--> statement-breakpoint
CREATE INDEX `idx_periods_status_due` ON `assessment_periods` (`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `idx_assignments_unit_period` ON `assignments` (`unit_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor_created` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_version` ON `categories` (`instrument_version_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_unit_status` ON `evidence` (`unit_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_evidence_links_score` ON `evidence_links` (`score_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_versions_hash` ON `evidence_versions` (`sha256`);--> statement-breakpoint
CREATE INDEX `idx_scores_status` ON `indicator_scores` (`status`);--> statement-breakpoint
CREATE INDEX `idx_scores_unit_period` ON `indicator_scores` (`unit_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `idx_indicators_subcategory` ON `indicators` (`subcategory_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_reads_user` ON `notification_reads` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_user` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_subcategories_category` ON `subcategories` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_user_assessment_types_type` ON `user_assessment_types` (`assessment_type_id`);--> statement-breakpoint
CREATE INDEX `idx_users_unit_id` ON `users` (`unit_id`);
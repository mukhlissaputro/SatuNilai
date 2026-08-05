CREATE TABLE `assessment_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_type_id` text NOT NULL,
	`instrument_version_id` text NOT NULL,
	`year` integer NOT NULL,
	`name` text NOT NULL,
	`starts_at` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`finalized_at` text,
	`finalized_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`finalized_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_periods_type_year` ON `assessment_periods` (`assessment_type_id`,`year`);--> statement-breakpoint
CREATE INDEX `idx_periods_status_due` ON `assessment_periods` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `assessment_types` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assessment_types_code` ON `assessment_types` (`code`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`indicator_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`assigned_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `assessment_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assignments_period_indicator_unit` ON `assignments` (`period_id`,`indicator_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_assignments_unit_period` ON `assignments` (`unit_id`,`period_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor_created` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_version_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`weight_percent` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_version_code` ON `categories` (`instrument_version_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_categories_version` ON `categories` (`instrument_version_id`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`current_version_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_unit_status` ON `evidence` (`unit_id`,`status`);--> statement-breakpoint
CREATE TABLE `evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text NOT NULL,
	`score_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`score_id`) REFERENCES `indicator_scores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_links_evidence_score` ON `evidence_links` (`evidence_id`,`score_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_links_score` ON `evidence_links` (`score_id`);--> statement-breakpoint
CREATE TABLE `evidence_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text NOT NULL,
	`version` integer NOT NULL,
	`object_key` text,
	`external_url` text,
	`original_filename` text,
	`content_type` text,
	`size_bytes` integer,
	`sha256` text,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_versions_evidence_version` ON `evidence_versions` (`evidence_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_evidence_versions_hash` ON `evidence_versions` (`sha256`);--> statement-breakpoint
CREATE TABLE `indicator_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`indicator_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`target_value` real,
	`internal_value` real,
	`assessor_value` real,
	`status` text DEFAULT 'draft' NOT NULL,
	`staff_note` text DEFAULT '' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`submitted_at` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `assessment_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_scores_period_indicator_unit` ON `indicator_scores` (`period_id`,`indicator_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_scores_status` ON `indicator_scores` (`status`);--> statement-breakpoint
CREATE INDEX `idx_scores_unit_period` ON `indicator_scores` (`unit_id`,`period_id`);--> statement-breakpoint
CREATE TABLE `indicators` (
	`id` text PRIMARY KEY NOT NULL,
	`subcategory_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`weight_percent` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_indicators_subcategory_code` ON `indicators` (`subcategory_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_indicators_subcategory` ON `indicators` (`subcategory_id`);--> statement-breakpoint
CREATE TABLE `instrument_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_type_id` text NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_instrument_versions_type_version` ON `instrument_versions` (`assessment_type_id`,`version`);--> statement-breakpoint
CREATE TABLE `score_options` (
	`id` text PRIMARY KEY NOT NULL,
	`indicator_id` text NOT NULL,
	`value` real NOT NULL,
	`label` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`indicator_id`) REFERENCES `indicators`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_score_options_indicator_value` ON `score_options` (`indicator_id`,`value`);--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`weight_percent` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subcategories_category_code` ON `subcategories` (`category_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_subcategories_category` ON `subcategories` (`category_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_units_code` ON `units` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`unit_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_unit_id` ON `users` (`unit_id`);
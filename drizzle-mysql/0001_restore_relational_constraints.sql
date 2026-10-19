ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_instrument_version_id_instrumen_438e8a16349d` FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_finalized_by_users_id_fk` FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_periods_type_year` ON `assessment_periods` (`assessment_type_id`,`year`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_periods_status_due` ON `assessment_periods` (`status`,`due_at`);
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_period_id_assessment_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `assessment_periods` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assignments_unit_period` ON `assignments` (`unit_id`,`period_id`);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_actor_created` ON `audit_logs` (`actor_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_instrument_version_id_instrument_versions_id_fk` FOREIGN KEY (`instrument_version_id`) REFERENCES `instrument_versions` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_categories_version` ON `categories` (`instrument_version_id`);
--> statement-breakpoint
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_evidence_unit_status` ON `evidence` (`unit_id`,`status`);
--> statement-breakpoint
ALTER TABLE `evidence_links` ADD CONSTRAINT `evidence_links_evidence_id_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `evidence` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `evidence_links` ADD CONSTRAINT `evidence_links_score_id_indicator_scores_id_fk` FOREIGN KEY (`score_id`) REFERENCES `indicator_scores` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_evidence_links_score` ON `evidence_links` (`score_id`);
--> statement-breakpoint
ALTER TABLE `evidence_versions` ADD CONSTRAINT `evidence_versions_evidence_id_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `evidence` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `evidence_versions` ADD CONSTRAINT `evidence_versions_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_evidence_versions_hash` ON `evidence_versions` (`sha256`);
--> statement-breakpoint
ALTER TABLE `indicator_scores` ADD CONSTRAINT `indicator_scores_period_id_assessment_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `assessment_periods` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `indicator_scores` ADD CONSTRAINT `indicator_scores_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `indicator_scores` ADD CONSTRAINT `indicator_scores_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `indicator_scores` ADD CONSTRAINT `indicator_scores_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scores_status` ON `indicator_scores` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_scores_unit_period` ON `indicator_scores` (`unit_id`,`period_id`);
--> statement-breakpoint
ALTER TABLE `indicators` ADD CONSTRAINT `indicators_subcategory_id_subcategories_id_fk` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_indicators_subcategory` ON `indicators` (`subcategory_id`);
--> statement-breakpoint
ALTER TABLE `instrument_versions` ADD CONSTRAINT `instrument_versions_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_reads_user` ON `notification_reads` (`user_id`);
--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_password_reset_user` ON `password_reset_tokens` (`user_id`);
--> statement-breakpoint
ALTER TABLE `score_options` ADD CONSTRAINT `score_options_indicator_id_indicators_id_fk` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `subcategories` ADD CONSTRAINT `subcategories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subcategories_category` ON `subcategories` (`category_id`);
--> statement-breakpoint
ALTER TABLE `user_assessment_types` ADD CONSTRAINT `user_assessment_types_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_assessment_types` ADD CONSTRAINT `user_assessment_types_assessment_type_id_assessment_types_id_fk` FOREIGN KEY (`assessment_type_id`) REFERENCES `assessment_types` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_assessment_types_type` ON `user_assessment_types` (`assessment_type_id`);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_users_unit_id` ON `users` (`unit_id`);

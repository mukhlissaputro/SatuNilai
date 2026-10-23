ALTER TABLE assessment_periods ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(32) NOT NULL DEFAULT 'weighted_average';
--> statement-breakpoint
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS max_value DOUBLE NULL;

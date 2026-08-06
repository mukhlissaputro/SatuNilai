ALTER TABLE `users` ADD `password_hash` text;
ALTER TABLE `users` ADD `password_salt` text;
ALTER TABLE `users` ADD `password_changed_at` text;
CREATE TABLE `auth_sessions` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `token_hash` text NOT NULL, `expires_at` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE);
CREATE UNIQUE INDEX `idx_auth_sessions_token` ON `auth_sessions` (`token_hash`);
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);
CREATE TABLE `password_reset_tokens` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `token_hash` text NOT NULL, `expires_at` text NOT NULL, `used_at` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE);
CREATE UNIQUE INDEX `idx_password_reset_token` ON `password_reset_tokens` (`token_hash`);
CREATE INDEX `idx_password_reset_user` ON `password_reset_tokens` (`user_id`);

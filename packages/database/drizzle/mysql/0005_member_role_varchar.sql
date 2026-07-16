-- Fix: Better Auth stores creatorRole "owner", but member.role was a MySQL ENUM
-- that rejected "owner" — org created without membership → empty sidebar.
ALTER TABLE `member` MODIFY COLUMN `role` varchar(64) NOT NULL DEFAULT 'organization_owner';

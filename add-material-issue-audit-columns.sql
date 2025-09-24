-- Add created_by and updated_by columns to material_issues table
-- This will track which user created and last updated each material issue record

ALTER TABLE `material_issues` 
ADD COLUMN `created_by` int NOT NULL AFTER `received_by_user_id`,
ADD COLUMN `updated_by` int DEFAULT NULL AFTER `created_by`;

-- Add indexes for better performance
ALTER TABLE `material_issues`
ADD KEY `idx_material_issues_created_by` (`created_by`),
ADD KEY `idx_material_issues_updated_by` (`updated_by`);

-- Add foreign key constraints
ALTER TABLE `material_issues`
ADD CONSTRAINT `fk_material_issues_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
ADD CONSTRAINT `fk_material_issues_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`);

-- Update existing records to set created_by to issued_by_user_id (assuming the issuer is the creator)
UPDATE `material_issues` SET `created_by` = `issued_by_user_id` WHERE `created_by` IS NULL;

-- Make created_by NOT NULL after updating existing records
ALTER TABLE `material_issues` MODIFY COLUMN `created_by` int NOT NULL;


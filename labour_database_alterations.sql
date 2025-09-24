-- Database Alteration Queries for Labour Management System
-- These queries enhance the existing labour and labour_attendance tables

-- 1. Add indexes for better performance on labour_attendance table
ALTER TABLE `labour_attendance` 
ADD INDEX `idx_labour_attendance_labour_date` (`labour_id`, `date`),
ADD INDEX `idx_labour_attendance_project_date` (`project_id`, `date`),
ADD INDEX `idx_labour_attendance_date_range` (`date`);

-- 2. Add indexes for better performance on labours table
ALTER TABLE `labours` 
ADD INDEX `idx_labours_skill` (`skill`),
ADD INDEX `idx_labours_contact` (`contact`),
ADD INDEX `idx_labours_wage_rate` (`wage_rate`);

-- 3. Add status field to labours table for active/inactive status
ALTER TABLE `labours` 
ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'TERMINATED') DEFAULT 'ACTIVE' AFTER `contact`,
ADD COLUMN `hire_date` DATE NULL AFTER `status`,
ADD COLUMN `termination_date` DATE NULL AFTER `hire_date`,
ADD COLUMN `notes` TEXT NULL AFTER `termination_date`;

-- 4. Add additional fields to labour_attendance for better tracking
ALTER TABLE `labour_attendance` 
ADD COLUMN `overtime_hours` DECIMAL(5,2) DEFAULT 0.00 AFTER `hours_worked`,
ADD COLUMN `break_hours` DECIMAL(5,2) DEFAULT 0.00 AFTER `overtime_hours`,
ADD COLUMN `work_type` ENUM('REGULAR', 'OVERTIME', 'HOLIDAY', 'WEEKEND') DEFAULT 'REGULAR' AFTER `break_hours`,
ADD COLUMN `recorded_by_user_id` INT NULL AFTER `work_type`,
ADD COLUMN `notes` TEXT NULL AFTER `recorded_by_user_id`;

-- 5. Add foreign key constraint for recorded_by_user_id
ALTER TABLE `labour_attendance` 
ADD CONSTRAINT `fk_labour_attendance_recorded_by` 
FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- 6. Add index for recorded_by_user_id
ALTER TABLE `labour_attendance` 
ADD INDEX `idx_labour_attendance_recorded_by` (`recorded_by_user_id`);

-- 7. Create a view for labour project associations (many-to-many relationship)
CREATE VIEW `v_labour_projects` AS
SELECT DISTINCT 
    l.labour_id,
    l.name as labour_name,
    l.skill,
    l.wage_rate,
    l.contact,
    l.status,
    p.project_id,
    p.name as project_name,
    COUNT(la.attendance_id) as total_attendance_days,
    COALESCE(SUM(la.hours_worked), 0) as total_hours,
    COALESCE(AVG(la.hours_worked), 0) as avg_hours_per_day,
    MIN(la.date) as first_attendance_date,
    MAX(la.date) as last_attendance_date
FROM `labours` l
LEFT JOIN `labour_attendance` la ON l.labour_id = la.labour_id
LEFT JOIN `projects` p ON la.project_id = p.project_id
WHERE l.status = 'ACTIVE'
GROUP BY l.labour_id, l.name, l.skill, l.wage_rate, l.contact, l.status, p.project_id, p.name
ORDER BY l.name, p.name;

-- 8. Create a view for labour statistics
CREATE VIEW `v_labour_statistics` AS
SELECT 
    l.labour_id,
    l.name as labour_name,
    l.skill,
    l.wage_rate,
    l.contact,
    l.status,
    l.hire_date,
    COUNT(DISTINCT la.project_id) as total_projects,
    COUNT(la.attendance_id) as total_attendance_days,
    COALESCE(SUM(la.hours_worked), 0) as total_hours,
    COALESCE(AVG(la.hours_worked), 0) as avg_hours_per_day,
    COALESCE(SUM(la.overtime_hours), 0) as total_overtime_hours,
    CASE 
        WHEN l.wage_rate IS NOT NULL THEN 
            COALESCE(SUM(la.hours_worked), 0) * l.wage_rate
        ELSE 0 
    END as total_earnings,
    MIN(la.date) as first_attendance_date,
    MAX(la.date) as last_attendance_date
FROM `labours` l
LEFT JOIN `labour_attendance` la ON l.labour_id = la.labour_id
GROUP BY l.labour_id, l.name, l.skill, l.wage_rate, l.contact, l.status, l.hire_date
ORDER BY l.name;

-- 9. Create a view for project labour summary
CREATE VIEW `v_project_labour_summary` AS
SELECT 
    p.project_id,
    p.name as project_name,
    COUNT(DISTINCT la.labour_id) as total_labours,
    COUNT(la.attendance_id) as total_attendance_records,
    COALESCE(SUM(la.hours_worked), 0) as total_hours,
    COALESCE(AVG(la.hours_worked), 0) as avg_hours_per_day,
    COALESCE(SUM(la.overtime_hours), 0) as total_overtime_hours,
    MIN(la.date) as first_attendance_date,
    MAX(la.date) as last_attendance_date
FROM `projects` p
LEFT JOIN `labour_attendance` la ON p.project_id = la.project_id
GROUP BY p.project_id, p.name
ORDER BY p.name;

-- 10. Add trigger to automatically update labour status based on recent activity
DELIMITER $$
CREATE TRIGGER `tr_update_labour_status` 
AFTER INSERT ON `labour_attendance`
FOR EACH ROW
BEGIN
    -- Update labour status to ACTIVE if they have recent attendance
    UPDATE `labours` 
    SET `status` = 'ACTIVE' 
    WHERE `labour_id` = NEW.labour_id 
    AND `status` != 'TERMINATED';
END$$
DELIMITER ;

-- 11. Add trigger to prevent duplicate attendance records
DELIMITER $$
CREATE TRIGGER `tr_prevent_duplicate_attendance` 
BEFORE INSERT ON `labour_attendance`
FOR EACH ROW
BEGIN
    DECLARE duplicate_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO duplicate_count
    FROM `labour_attendance`
    WHERE `labour_id` = NEW.labour_id 
    AND `project_id` = NEW.project_id 
    AND `date` = NEW.date;
    
    IF duplicate_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Attendance record already exists for this labour, project, and date';
    END IF;
END$$
DELIMITER ;

-- 12. Add constraint to ensure hours_worked is reasonable
ALTER TABLE `labour_attendance` 
ADD CONSTRAINT `chk_hours_worked_range` 
CHECK (`hours_worked` >= 0 AND `hours_worked` <= 24);

-- 13. Add constraint to ensure overtime_hours is reasonable
ALTER TABLE `labour_attendance` 
ADD CONSTRAINT `chk_overtime_hours_range` 
CHECK (`overtime_hours` >= 0 AND `overtime_hours` <= 12);

-- 14. Add constraint to ensure break_hours is reasonable
ALTER TABLE `labour_attendance` 
ADD CONSTRAINT `chk_break_hours_range` 
CHECK (`break_hours` >= 0 AND `break_hours` <= 4);

-- 15. Create stored procedure for bulk attendance recording
DELIMITER $$
CREATE PROCEDURE `sp_record_bulk_attendance`(
    IN p_project_id INT,
    IN p_date DATE,
    IN p_attendance_data JSON
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE labour_id INT;
    DECLARE hours_worked DECIMAL(5,2);
    DECLARE json_length INT;
    DECLARE i INT DEFAULT 0;
    DECLARE error_count INT DEFAULT 0;
    
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        SET error_count = error_count + 1;
    END;
    
    -- Get the length of the JSON array
    SET json_length = JSON_LENGTH(p_attendance_data);
    
    -- Loop through the JSON array
    WHILE i < json_length DO
        SET labour_id = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].labour_id')));
        SET hours_worked = JSON_UNQUOTE(JSON_EXTRACT(p_attendance_data, CONCAT('$[', i, '].hours_worked')));
        
        -- Insert attendance record
        INSERT INTO `labour_attendance` (
            `labour_id`, 
            `project_id`, 
            `date`, 
            `hours_worked`
        ) VALUES (
            labour_id, 
            p_project_id, 
            p_date, 
            hours_worked
        );
        
        SET i = i + 1;
    END WHILE;
    
    -- Return success message
    SELECT CONCAT('Bulk attendance recorded for ', json_length, ' labours') as message;
END$$
DELIMITER ;

-- 16. Create stored procedure for labour payroll calculation
DELIMITER $$
CREATE PROCEDURE `sp_calculate_labour_payroll`(
    IN p_labour_id INT,
    IN p_project_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        l.labour_id,
        l.name as labour_name,
        l.wage_rate,
        p.project_id,
        p.name as project_name,
        COUNT(la.attendance_id) as total_days,
        COALESCE(SUM(la.hours_worked), 0) as total_hours,
        COALESCE(SUM(la.overtime_hours), 0) as total_overtime_hours,
        CASE 
            WHEN l.wage_rate IS NOT NULL THEN 
                (COALESCE(SUM(la.hours_worked), 0) * l.wage_rate) + 
                (COALESCE(SUM(la.overtime_hours), 0) * l.wage_rate * 1.5)
            ELSE 0 
        END as total_earnings
    FROM `labours` l
    CROSS JOIN `projects` p
    LEFT JOIN `labour_attendance` la ON (
        l.labour_id = la.labour_id 
        AND p.project_id = la.project_id
        AND la.date BETWEEN p_start_date AND p_end_date
    )
    WHERE l.labour_id = p_labour_id 
    AND p.project_id = p_project_id
    GROUP BY l.labour_id, l.name, l.wage_rate, p.project_id, p.name;
END$$
DELIMITER ;

-- 17. Add sample data for testing (optional)
-- Insert sample labours
INSERT INTO `labours` (`name`, `skill`, `wage_rate`, `contact`, `status`, `hire_date`) VALUES
('Rajesh Kumar', 'Mason', 500.00, '+91-9876543210', 'ACTIVE', '2025-01-01'),
('Suresh Singh', 'Carpenter', 450.00, '+91-9876543211', 'ACTIVE', '2025-01-02'),
('Amit Sharma', 'Electrician', 600.00, '+91-9876543212', 'ACTIVE', '2025-01-03'),
('Vikram Patel', 'Plumber', 550.00, '+91-9876543213', 'ACTIVE', '2025-01-04'),
('Deepak Yadav', 'Helper', 300.00, '+91-9876543214', 'ACTIVE', '2025-01-05');

-- Insert sample attendance records
INSERT INTO `labour_attendance` (`labour_id`, `project_id`, `date`, `hours_worked`, `work_type`) VALUES
(1, 1, '2025-09-20', 8.0, 'REGULAR'),
(1, 1, '2025-09-21', 8.0, 'REGULAR'),
(1, 1, '2025-09-22', 8.0, 'REGULAR'),
(2, 1, '2025-09-20', 8.0, 'REGULAR'),
(2, 1, '2025-09-21', 8.0, 'REGULAR'),
(2, 1, '2025-09-22', 8.0, 'REGULAR'),
(3, 1, '2025-09-20', 8.0, 'REGULAR'),
(3, 1, '2025-09-21', 8.0, 'REGULAR'),
(3, 1, '2025-09-22', 8.0, 'REGULAR');

-- 18. Note: Views cannot have indexes created directly on them
-- Instead, we'll create indexes on the underlying tables that the views query
-- These indexes will improve the performance of the views

-- Additional indexes for view performance optimization
ALTER TABLE `labours` 
ADD INDEX `idx_labours_status` (`status`),
ADD INDEX `idx_labours_hire_date` (`hire_date`);

ALTER TABLE `labour_attendance` 
ADD INDEX `idx_labour_attendance_work_type` (`work_type`),
ADD INDEX `idx_labour_attendance_hours_worked` (`hours_worked`),
ADD INDEX `idx_labour_attendance_overtime_hours` (`overtime_hours`);

-- 19. Add comments to tables for documentation
ALTER TABLE `labours` COMMENT = 'Stores information about construction labours/workers';
ALTER TABLE `labour_attendance` COMMENT = 'Tracks daily attendance and hours worked by labours on projects';

-- 20. Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON `labours` TO 'cmsdbadmin'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON `labour_attendance` TO 'cmsdbadmin'@'%';
-- GRANT SELECT ON `v_labour_projects` TO 'cmsdbadmin'@'%';
-- GRANT SELECT ON `v_labour_statistics` TO 'cmsdbadmin'@'%';
-- GRANT SELECT ON `v_project_labour_summary` TO 'cmsdbadmin'@'%';
-- GRANT EXECUTE ON PROCEDURE `sp_record_bulk_attendance` TO 'cmsdbadmin'@'%';
-- GRANT EXECUTE ON PROCEDURE `sp_calculate_labour_payroll` TO 'cmsdbadmin'@'%';

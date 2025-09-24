-- =========================
-- PAYMENT SYSTEM SCHEMA
-- =========================

-- Master table for payment types (based on the three types shown in images)
CREATE TABLE payment_types (
    payment_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert the three payment types from the images
INSERT INTO payment_types (type_name, description) VALUES
('Advance to Vendor/Labour', 'Advance payments made to vendors or labour contractors'),
('Petty spend on site', 'Small expenses incurred on site for daily operations'),
('Transfer to a team member', 'Internal transfers made to team members');

-- Master table for payment categories (based on expense categories from images)
CREATE TABLE payment_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert payment categories from the images
INSERT INTO payment_categories (category_name, description) VALUES
('Material', 'Payments related to material purchases and supplies'),
('Subcontractor', 'Payments made to subcontractors and external service providers'),
('Attendance', 'Payments related to labour attendance and wages'),
('Petty Spend', 'Small miscellaneous expenses on site'),
('Miscellaneous', 'Other expenses that do not fit into specific categories');

-- Universal payments table to store all payment records
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_reference_id VARCHAR(50) NOT NULL UNIQUE, -- Format: PP000001, PP000002, etc.
    project_id INT NOT NULL,
    payment_type_id INT NOT NULL,
    category_id INT NOT NULL,
    
    -- Payment details
    paid_to_type ENUM('TEAM_MEMBER', 'VENDOR', 'LABOUR', 'SUBCONTRACTOR', 'OTHER') NOT NULL,
    paid_to_user_id INT NULL, -- If paid to team member, reference users table
    paid_to_name VARCHAR(255) NULL, -- If paid to external party (vendor, labour, etc.)
    paid_to_contact VARCHAR(100) NULL, -- Contact information for external parties
    
    paid_by_user_id INT NOT NULL, -- Who made the payment (from users table)
    paid_by_type ENUM('COMPANY', 'INDIVIDUAL') DEFAULT 'COMPANY',
    
    -- Financial details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Payment status and approval
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    
    -- Dates
    payment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Additional information
    description TEXT,
    notes TEXT,
    attachment_path VARCHAR(500) NULL, -- For receipts, invoices, etc.
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by_user_id INT NULL,
    
    -- Foreign key constraints
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_type_id) REFERENCES payment_types(payment_type_id),
    FOREIGN KEY (category_id) REFERENCES payment_categories(category_id),
    FOREIGN KEY (paid_to_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (paid_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (deleted_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Indexes for better performance
    INDEX idx_payments_project (project_id),
    INDEX idx_payments_type (payment_type_id),
    INDEX idx_payments_category (category_id),
    INDEX idx_payments_paid_to_user (paid_to_user_id),
    INDEX idx_payments_paid_by_user (paid_by_user_id),
    INDEX idx_payments_date (payment_date),
    INDEX idx_payments_status (status),
    INDEX idx_payments_approval_status (approval_status),
    INDEX idx_payments_reference (payment_reference_id),
    INDEX idx_payments_amount (amount),
    INDEX idx_payments_created_at (created_at),
    INDEX idx_payments_is_deleted (is_deleted)
);

-- Create a trigger to auto-generate payment reference IDs
DELIMITER //
CREATE TRIGGER tr_payments_generate_reference_id
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.payment_reference_id IS NULL OR NEW.payment_reference_id = '' THEN
        SET @next_id = (SELECT COALESCE(MAX(CAST(SUBSTRING(payment_reference_id, 3) AS UNSIGNED)), 0) + 1 FROM payments WHERE payment_reference_id LIKE 'PP%');
        SET NEW.payment_reference_id = CONCAT('PP', LPAD(@next_id, 6, '0'));
    END IF;
END//
DELIMITER ;

-- Create a view for easy payment reporting
CREATE VIEW v_payments_summary AS
SELECT 
    p.payment_id,
    p.payment_reference_id,
    pr.name AS project_name,
    pt.type_name AS payment_type,
    pc.category_name AS category,
    CASE 
        WHEN p.paid_to_type = 'TEAM_MEMBER' THEN CONCAT(u.name, ' (Team Member)')
        ELSE CONCAT(COALESCE(p.paid_to_name, 'Unknown'), ' (', p.paid_to_type, ')')
    END AS paid_to,
    CONCAT(pb.name, ' (', p.paid_by_type, ')') AS paid_by,
    p.amount,
    p.currency,
    p.payment_date,
    p.status,
    p.approval_status,
    p.description,
    p.created_at,
    p.updated_at
FROM payments p
LEFT JOIN projects pr ON p.project_id = pr.project_id
LEFT JOIN payment_types pt ON p.payment_type_id = pt.payment_type_id
LEFT JOIN payment_categories pc ON p.category_id = pc.category_id
LEFT JOIN users u ON p.paid_to_user_id = u.user_id
LEFT JOIN users pb ON p.paid_by_user_id = pb.user_id
WHERE p.is_deleted = FALSE;

-- Create a view for payment statistics by category
CREATE VIEW v_payment_category_stats AS
SELECT 
    pr.project_id,
    pr.name AS project_name,
    pc.category_name,
    COUNT(*) AS total_payments,
    SUM(p.amount) AS total_amount,
    AVG(p.amount) AS average_amount,
    MIN(p.amount) AS min_amount,
    MAX(p.amount) AS max_amount,
    COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) AS completed_payments,
    SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END) AS completed_amount
FROM payments p
JOIN projects pr ON p.project_id = pr.project_id
JOIN payment_categories pc ON p.category_id = pc.category_id
WHERE p.is_deleted = FALSE
GROUP BY pr.project_id, pr.name, pc.category_id, pc.category_name;

-- Create a view for team member payments
CREATE VIEW v_team_member_payments AS
SELECT 
    p.payment_id,
    p.payment_reference_id,
    pr.name AS project_name,
    pt.type_name AS payment_type,
    pc.category_name AS category,
    u.name AS team_member_name,
    u.email AS team_member_email,
    u.phone AS team_member_phone,
    pb.name AS paid_by_name,
    p.amount,
    p.payment_date,
    p.status,
    p.approval_status,
    p.description,
    p.created_at
FROM payments p
JOIN projects pr ON p.project_id = pr.project_id
JOIN payment_types pt ON p.payment_type_id = pt.payment_type_id
JOIN payment_categories pc ON p.category_id = pc.category_id
JOIN users u ON p.paid_to_user_id = u.user_id
JOIN users pb ON p.paid_by_user_id = pb.user_id
WHERE p.paid_to_type = 'TEAM_MEMBER' 
  AND p.is_deleted = FALSE;

-- Sample data for testing
INSERT INTO payments (
    project_id, 
    payment_type_id, 
    category_id, 
    paid_to_type, 
    paid_to_name, 
    paid_by_user_id, 
    amount, 
    payment_date, 
    description
) VALUES 
(1, 2, 4, 'OTHER', 'Site Maintenance', 1, 52000.00, '2025-09-20', 'Petty cash for site maintenance and daily operations'),
(1, 1, 1, 'VENDOR', 'ABC Materials Ltd', 1, 150000.00, '2025-09-21', 'Advance payment for cement delivery'),
(1, 3, 2, 'TEAM_MEMBER', NULL, 1, 25000.00, '2025-09-22', 'Transfer to team member for emergency expenses');

-- Update the sample payment to reference a team member
UPDATE payments 
SET paid_to_user_id = 2 
WHERE payment_id = 3 AND paid_to_type = 'TEAM_MEMBER';

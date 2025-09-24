-- Create inventory_history table
CREATE TABLE IF NOT EXISTS inventory_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    project_id INT NULL,
    transaction_type ENUM('ISSUE', 'RETURN', 'ADJUSTMENT', 'PURCHASE', 'CONSUMPTION') NOT NULL,
    transaction_id INT NULL COMMENT 'ID of the related transaction (issue_id, return_id, etc.)',
    quantity_change INT NOT NULL COMMENT 'Positive for additions, negative for subtractions',
    quantity_before INT NOT NULL COMMENT 'Stock quantity before this transaction',
    quantity_after INT NOT NULL COMMENT 'Stock quantity after this transaction',
    reference_number VARCHAR(100) NULL COMMENT 'Reference number for the transaction',
    description TEXT NULL COMMENT 'Description of the transaction',
    location VARCHAR(255) NULL COMMENT 'Location where the transaction occurred',
    performed_by_user_id INT NOT NULL,
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    -- Indexes for better performance
    INDEX idx_material_id (material_id),
    INDEX idx_project_id (project_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

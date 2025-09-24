-- Migration script to add roles and project_members tables
-- Run this script to update your existing database

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert master roles if they don't exist
INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access and control'),
('Project Manager', 'Manages projects and coordinates team activities'),
('Project On-site Team', 'On-site construction team members'),
('Collaborator Organisation', 'External collaborating organizations'),
('Organization Manager', 'Manages organization-level activities'),
('Accountant', 'Handles financial and accounting tasks')
ON DUPLICATE KEY UPDATE name = name;

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS role_id INT,
ADD COLUMN IF NOT EXISTS invitation_status ENUM('PENDING','ACCEPTED','DECLINED') DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
    project_member_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    invitation_status ENUM('PENDING','ACCEPTED','DECLINED') DEFAULT 'PENDING',
    joined_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    UNIQUE KEY unique_project_user (project_id, user_id)
);

-- Add updated_at column to projects table if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing users to have a default role (Admin)
-- You may want to adjust this based on your existing data
UPDATE users 
SET role_id = (SELECT role_id FROM roles WHERE name = 'Admin' LIMIT 1)
WHERE role_id IS NULL;

-- Make role_id NOT NULL after setting default values
ALTER TABLE users MODIFY COLUMN role_id INT NOT NULL;

-- Add foreign key constraint for role_id
ALTER TABLE users 
ADD CONSTRAINT fk_users_role_id 
FOREIGN KEY (role_id) REFERENCES roles(role_id);

-- Remove the old role enum column if it exists
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role_id ON project_members(role_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(invitation_status);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_status ON users(invitation_status);

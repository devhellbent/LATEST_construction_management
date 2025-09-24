-- =========================
-- USERS & ROLES
-- =========================

-- Master roles table
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert master roles
INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access and control'),
('Project Manager', 'Manages projects and coordinates team activities'),
('Project On-site Team', 'On-site construction team members'),
('Collaborator Organisation', 'External collaborating organizations'),
('Organization Manager', 'Manages organization-level activities'),
('Accountant', 'Handles financial and accounting tasks');

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role_id INT NOT NULL,
    contact_info VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    invitation_status ENUM('PENDING','ACCEPTED','DECLINED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- =========================
-- PROJECTS
-- =========================
CREATE TABLE projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    status ENUM('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
    owner_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
);

-- Project Members Association Table
CREATE TABLE project_members (
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

-- =========================
-- TASKS
-- =========================
CREATE TABLE tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_user_id INT,
    start_date DATE,
    end_date DATE,
    status ENUM('TODO','IN_PROGRESS','BLOCKED','DONE') DEFAULT 'TODO',
    priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    dependencies JSON NULL,
    milestone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(user_id)
);

-- =========================
-- MATERIALS
-- =========================
CREATE TABLE materials (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    unit VARCHAR(50),
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(255),
    stock_qty INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material Allocation
CREATE TABLE material_allocations (
    material_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity INT NOT NULL,
    date_allocated DATE NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (material_id) REFERENCES materials(material_id)
);

-- =========================
-- LABOUR & PAYROLL
-- =========================
CREATE TABLE labours (
    labour_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    skill VARCHAR(255),
    wage_rate DECIMAL(10,2),
    contact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labour_attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    labour_id INT NOT NULL,
    project_id INT NOT NULL,
    date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (labour_id) REFERENCES labours(labour_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE payroll (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    labour_id INT NOT NULL,
    project_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount_paid DECIMAL(15,2) NOT NULL,
    deductions DECIMAL(15,2) DEFAULT 0,
    paid_date DATE,
    FOREIGN KEY (labour_id) REFERENCES labours(labour_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- =========================
-- ISSUES
-- =========================
CREATE TABLE issues (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    task_id INT NULL,
    raised_by_user_id INT NOT NULL,
    assigned_to_user_id INT,
    description TEXT NOT NULL,
    priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
    date_raised TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_resolved TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (raised_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(user_id)
);

-- =========================
-- REPORTS
-- =========================
CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    report_type ENUM('PROGRESS','FINANCIAL','RESOURCE','ISSUE','CUSTOM'),
    generated_by_user_id INT NOT NULL,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSON,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (generated_by_user_id) REFERENCES users(user_id)
);

-- =========================
-- PETTY CASH EXPENSES
-- =========================
CREATE TABLE petty_cash_expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    approved_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
);

-- =========================
-- DOCUMENTS
-- =========================
CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    uploaded_by_user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    version INT DEFAULT 1,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
);

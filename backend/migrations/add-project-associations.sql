-- Migration script to add project associations to all relevant tables
-- This ensures all data is properly associated with specific projects

-- =========================
-- ADD PROJECT ASSOCIATIONS
-- =========================

-- Add project_id to materials table (currently missing)
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS project_id INT NOT NULL AFTER material_id;

-- Add foreign key constraint for materials.project_id
ALTER TABLE materials 
ADD CONSTRAINT fk_materials_project_id 
FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE;

-- =========================
-- VERIFY EXISTING PROJECT ASSOCIATIONS
-- =========================

-- The following tables already have project_id associations:
-- ✅ tasks (line 78 in schema.sql)
-- ✅ material_allocations (line 110 in schema.sql) 
-- ✅ labour_attendance (line 133 in schema.sql)
-- ✅ payroll (line 143 in schema.sql)
-- ✅ issues (line 158 in schema.sql)
-- ✅ reports (line 176 in schema.sql)
-- ✅ petty_cash_expenses (line 190 in schema.sql)
-- ✅ documents (line 206 in schema.sql)

-- =========================
-- ADD INDEXES FOR PERFORMANCE
-- =========================

-- Add indexes for better query performance on project associations
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_material_allocations_project_id ON material_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_labour_attendance_project_id ON labour_attendance(project_id);
CREATE INDEX IF NOT EXISTS idx_payroll_project_id ON payroll(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_project_id ON petty_cash_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- =========================
-- UPDATE EXISTING DATA (if needed)
-- =========================

-- If you have existing materials without project associations, 
-- you'll need to assign them to a default project or handle them manually
-- Example (uncomment and modify as needed):
-- UPDATE materials 
-- SET project_id = (SELECT project_id FROM projects LIMIT 1)
-- WHERE project_id IS NULL;

-- =========================
-- VERIFICATION QUERIES
-- =========================

-- Use these queries to verify the associations are working correctly:

-- Check all tables with project associations:
-- SELECT 
--     TABLE_NAME,
--     COLUMN_NAME,
--     CONSTRAINT_NAME,
--     REFERENCED_TABLE_NAME,
--     REFERENCED_COLUMN_NAME
-- FROM 
--     INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE 
--     REFERENCED_TABLE_NAME = 'projects' 
--     AND TABLE_SCHEMA = DATABASE();

-- Check materials table structure:
-- DESCRIBE materials;

-- Check foreign key constraints:
-- SHOW CREATE TABLE materials;



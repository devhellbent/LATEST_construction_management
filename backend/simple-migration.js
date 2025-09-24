const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSimpleMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'construction_management',
      multipleStatements: true
    });

    console.log('Connected to database successfully');

    // Step 1: Create roles table
    console.log('Creating roles table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Step 2: Insert roles
    console.log('Inserting roles...');
    const roles = [
      ['Admin', 'Full system access and control'],
      ['Project Manager', 'Manages projects and coordinates team activities'],
      ['Project On-site Team', 'On-site construction team members'],
      ['Collaborator Organisation', 'External collaborating organizations'],
      ['Organization Manager', 'Manages organization-level activities'],
      ['Accountant', 'Handles financial and accounting tasks']
    ];

    for (const [name, description] of roles) {
      try {
        await connection.execute(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          [name, description]
        );
        console.log(`✅ Inserted role: ${name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Role already exists: ${name}`);
        } else {
          throw error;
        }
      }
    }

    // Step 3: Add columns to users table
    console.log('Adding columns to users table...');
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
      console.log('✅ Added phone column');
    } catch (error) {
      console.log('⚠️  Phone column may already exist');
    }

    try {
      await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT');
      console.log('✅ Added role_id column');
    } catch (error) {
      console.log('⚠️  role_id column may already exist');
    }

    try {
      await connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_status ENUM('PENDING','ACCEPTED','DECLINED') DEFAULT 'PENDING'");
      console.log('✅ Added invitation_status column');
    } catch (error) {
      console.log('⚠️  invitation_status column may already exist');
    }

    try {
      await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('✅ Added updated_at column');
    } catch (error) {
      console.log('⚠️  updated_at column may already exist');
    }

    // Step 4: Update existing users with Admin role
    console.log('Updating existing users with Admin role...');
    const [adminRole] = await connection.execute('SELECT role_id FROM roles WHERE name = ?', ['Admin']);
    if (adminRole.length > 0) {
      await connection.execute('UPDATE users SET role_id = ? WHERE role_id IS NULL', [adminRole[0].role_id]);
      console.log('✅ Updated users with Admin role');
    }

    // Step 5: Create project_members table
    console.log('Creating project_members table...');
    await connection.execute(`
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
      )
    `);
    console.log('✅ Created project_members table');

    // Step 6: Add updated_at to projects table
    console.log('Adding updated_at to projects table...');
    try {
      await connection.execute('ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('✅ Added updated_at to projects table');
    } catch (error) {
      console.log('⚠️  updated_at column may already exist in projects table');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Roles table created and populated');
    console.log('✅ Users table updated with new columns');
    console.log('✅ Project members table created');
    console.log('✅ Projects table updated');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runSimpleMigration();
}

module.exports = { runSimpleMigration };

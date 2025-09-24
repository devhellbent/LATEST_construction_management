const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
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

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-roles-and-project-members.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('Running migration...');
    await connection.execute(migrationSQL);
    
    console.log('Migration completed successfully!');
    console.log('✅ Roles table created');
    console.log('✅ Project members table created');
    console.log('✅ Users table updated with new columns');
    console.log('✅ Foreign key constraints added');
    console.log('✅ Indexes created');

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
  runMigration();
}

module.exports = { runMigration };

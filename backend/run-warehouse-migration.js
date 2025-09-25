const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // Read database configuration
    const config = require('./config/config.json');
    const dbConfig = config.development;
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });

    console.log('Connected to database successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create-warehouse-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('Running warehouse system migration...');
    await connection.execute(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Warehouse table created');
    console.log('✅ warehouse_id column added to materials table');
    console.log('✅ Default warehouse inserted');
    console.log('✅ Existing materials updated with default warehouse');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();

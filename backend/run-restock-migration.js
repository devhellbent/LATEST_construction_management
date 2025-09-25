const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runRestockMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cmsdb',
      multipleStatements: true
    });

    console.log('Connected to database successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-restock-transaction-type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('Running restock migration...');
    await connection.execute(migrationSQL);
    
    console.log('Migration completed successfully!');
    console.log('✅ RESTOCK transaction type added to inventory_history');
    console.log('✅ Admin approval columns added to material_receipts');
    console.log('✅ Verification columns added to material_receipt_items');
    console.log('✅ Foreign key constraints added');

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
  runRestockMigration();
}

module.exports = { runRestockMigration };

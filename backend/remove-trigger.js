const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeTrigger() {
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

    // Remove the problematic trigger
    console.log('Removing trigger tr_update_supplier_ledger_balance...');
    await connection.execute('DROP TRIGGER IF EXISTS `tr_update_supplier_ledger_balance`');
    
    console.log('✅ Trigger removed successfully!');

  } catch (error) {
    console.error('Failed to remove trigger:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  removeTrigger();
}

module.exports = { removeTrigger };










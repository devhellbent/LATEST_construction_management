#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('Starting MRR Flow Migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'implement-mrr-flow.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await sequelize.query(statement);
        } catch (error) {
          // Skip errors for statements that might already exist
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate') ||
              error.message.includes('already defined')) {
            console.log(`Skipping statement ${i + 1} (already exists): ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✅ MRR Flow Migration completed successfully!');
    console.log('\nNew tables created:');
    console.log('- material_requirement_requests');
    console.log('- mrr_items');
    console.log('- purchase_orders');
    console.log('- purchase_order_items');
    console.log('- material_receipts');
    console.log('- material_receipt_items');
    console.log('- supplier_ledger');
    console.log('\nExisting tables updated:');
    console.log('- material_issues (added MRR flow support)');
    console.log('- material_returns (added MRR flow support)');
    console.log('- material_consumptions (added MRR flow support)');
    console.log('- inventory_history (added MRR flow support)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

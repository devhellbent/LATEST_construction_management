const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function addUpdatedAtColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'add-updated-at-columns.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--') && !stmt.trim().startsWith('USE'));
    
    console.log('🔄 Adding updated_at columns to all tables...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement.trim());
          console.log(`✅ Executed: ${statement.trim().substring(0, 50)}...`);
        } catch (error) {
          if (error.message.includes('Duplicate column name')) {
            console.log(`ℹ️  Column already exists: ${statement.trim().substring(0, 50)}...`);
          } else {
            console.error(`❌ Error executing: ${statement.trim().substring(0, 50)}...`);
            console.error(`   Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ All updated_at columns have been processed!');
    
    // Verify the changes
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'cmsdb' 
      AND COLUMN_NAME = 'updated_at'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tables with updated_at column:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Failed to add updated_at columns:', error.message);
    process.exit(1);
  }
}

addUpdatedAtColumns();

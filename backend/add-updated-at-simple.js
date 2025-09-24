const { sequelize } = require('./config/database');

async function addUpdatedAtColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    const tables = [
      'users',
      'projects', 
      'tasks',
      'materials',
      'material_allocations',
      'labours',
      'labour_attendance',
      'payroll',
      'issues',
      'reports',
      'petty_cash_expenses',
      'documents'
    ];
    
    console.log('🔄 Adding updated_at columns to all tables...');
    
    for (const table of tables) {
      try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        console.log(`✅ Added updated_at to ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️  updated_at already exists in ${table}`);
        } else {
          console.error(`❌ Error adding updated_at to ${table}:`, error.message);
        }
      }
    }
    
    // Verify the changes
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'cmsdb' 
      AND COLUMN_NAME = 'updated_at'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tables with updated_at column:');
    results.forEach(result => {
      console.log(`   - ${result.TABLE_NAME}`);
    });
    
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Failed to add updated_at columns:', error.message);
    process.exit(1);
  }
}

addUpdatedAtColumns();

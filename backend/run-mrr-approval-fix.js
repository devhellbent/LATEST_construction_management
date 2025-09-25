require('dotenv').config();
const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

const migrationFilePath = path.join(__dirname, 'migrations', 'fix-mrr-approval-columns.sql');

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');
    await sequelize.query(migrationSql);
    console.log('MRR approval columns fix migration executed successfully.');

    console.log('✅ Removed redundant approval_status column');
    console.log('✅ Updated status enum to remove UNDER_REVIEW');
    console.log('✅ Added performance indexes');
    console.log('✅ MRR approval system simplified - only Admin and Project Manager can approve');

  } catch (error) {
    console.error('Error running MRR approval fix migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();

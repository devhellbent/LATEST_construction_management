const { sequelize } = require('./config/database');
const { seedData } = require('./seeders/seedData');

async function runSeed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Check if data already exists
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      console.log('📊 Database already has data, skipping seed.');
      await sequelize.close();
      return;
    }
    
    console.log('🌱 Seeding database with initial data...');
    await seedData();
    console.log('✅ Database seeded successfully!');
    
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

runSeed();

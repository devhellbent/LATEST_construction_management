const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cmsdb',
  process.env.DB_USER || 'cmsdbadmin',
  process.env.DB_PASSWORD || 'nUUBQ6fnEUuiIoDTLXO2',
  {
    host: process.env.DB_HOST || '89.116.34.49',
    dialect: process.env.DB_DIALECT || 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // Increased from 30000 to 60000 (60 seconds)
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000 // 60 seconds connection timeout
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

module.exports = { sequelize, db: sequelize };

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cmsdb',
  process.env.DB_USER || 'cmsdbadmin',
  process.env.DB_PASSWORD || 'nUUBQ6fnEUuiIoDTLXO2',
  {
    host: process.env.DB_HOST || '89.116.34.49',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
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

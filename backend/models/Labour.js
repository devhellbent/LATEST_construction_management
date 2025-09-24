const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Labour = sequelize.define('Labour', {
  labour_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  skill: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  wage_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  contact: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'labours'
});

module.exports = Labour;

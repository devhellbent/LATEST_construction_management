const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Size = sequelize.define('Size', {
  size_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  value: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'sizes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Size;



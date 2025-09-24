const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Unit = sequelize.define('Unit', {
  unit_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  unit_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  unit_symbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  unit_type: {
    type: DataTypes.ENUM('WEIGHT', 'LENGTH', 'VOLUME', 'AREA', 'COUNT', 'TIME', 'OTHER'),
    defaultValue: 'OTHER'
  },
  conversion_factor: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 1.0000
  },
  base_unit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'units',
      key: 'unit_id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'units',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Unit;

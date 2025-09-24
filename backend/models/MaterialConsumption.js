const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialConsumption = sequelize.define('MaterialConsumption', {
  consumption_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'project_id'
    }
  },
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'materials',
      key: 'material_id'
    }
  },
  quantity_consumed: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  consumption_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  consumption_purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  recorded_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'material_consumptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialConsumption;


const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemMaster = sequelize.define('ItemMaster', {
  item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  item_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'item_categories',
      key: 'category_id'
    }
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brands',
      key: 'brand_id'
    }
  },
  unit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'units',
      key: 'unit_id'
    }
  },
  specifications: {
    type: DataTypes.JSON,
    allowNull: true
  },
  technical_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  safety_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  environmental_impact: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'item_master',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ItemMaster;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ItemSupplier = sequelize.define('ItemSupplier', {
  item_supplier_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'item_master',
      key: 'item_id'
    }
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'supplier_id'
    }
  },
  supplier_item_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  supplier_item_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cost_per_unit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  minimum_order_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_preferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'item_suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ItemSupplier;

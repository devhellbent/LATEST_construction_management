const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialReceipt = sequelize.define('MaterialReceipt', {
  receipt_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'po_id'
    }
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'project_id'
    }
  },
  received_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  received_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  supplier_delivery_note: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  driver_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  condition_status: {
    type: DataTypes.ENUM('GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED'),
    defaultValue: 'GOOD'
  },
  total_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'material_receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialReceipt;

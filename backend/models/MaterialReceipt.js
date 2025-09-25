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
    allowNull: true, // Allow null since database trigger will generate it
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
    allowNull: true,
    references: {
      model: 'projects',
      key: 'project_id'
    }
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    }
  },
  received_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  received_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  verified_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approved_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
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
  status: {
    type: DataTypes.ENUM('PENDING', 'RECEIVED', 'APPROVED', 'REJECTED', 'COMPLETED'),
    defaultValue: 'PENDING'
  },
  total_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  delivery_notes: {
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

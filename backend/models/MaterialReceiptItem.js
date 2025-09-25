const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialReceiptItem = sequelize.define('MaterialReceiptItem', {
  receipt_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receipt_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'material_receipts',
      key: 'receipt_id'
    }
  },
  po_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_order_items',
      key: 'po_item_id'
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'item_master',
      key: 'item_id'
    }
  },
  quantity_received: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
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
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  condition_status: {
    type: DataTypes.ENUM('GOOD', 'DAMAGED', 'REJECTED'),
    defaultValue: 'GOOD'
  },
  batch_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'material_receipt_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialReceiptItem;

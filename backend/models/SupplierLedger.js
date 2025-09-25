const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierLedger = sequelize.define('SupplierLedger', {
  ledger_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'supplier_id'
    }
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_orders',
      key: 'po_id'
    }
  },
  transaction_type: {
    type: DataTypes.ENUM('PURCHASE', 'PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE', 'DEBIT_NOTE'),
    allowNull: false
  },
  transaction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  debit_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  credit_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE'),
    defaultValue: 'PENDING'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'supplier_ledger',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SupplierLedger;

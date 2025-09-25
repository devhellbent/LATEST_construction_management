const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  po_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  po_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  mrr_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_requirement_requests',
      key: 'mrr_id'
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
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'supplier_id'
    }
  },
  po_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expected_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED', 'CLOSED'),
    defaultValue: 'DRAFT'
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  delivery_terms: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'purchase_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PurchaseOrder;

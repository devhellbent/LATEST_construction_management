const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SubcontractorLedger = sequelize.define('SubcontractorLedger', {
  ledger_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subcontractor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subcontractors',
      key: 'subcontractor_id'
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
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  payment_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_type: {
    type: DataTypes.ENUM('ADVANCE', 'PROGRESS', 'FINAL', 'RETENTION', 'OTHER'),
    allowNull: false,
    defaultValue: 'PROGRESS'
  },
  payment_method: {
    type: DataTypes.ENUM('CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'OTHER'),
    allowNull: false,
    defaultValue: 'NEFT'
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bill_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bill_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  bill_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'PAID', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  approved_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'subcontractor_ledger',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SubcontractorLedger;

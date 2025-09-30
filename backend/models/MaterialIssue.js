const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialIssue = sequelize.define('MaterialIssue', {
  issue_id: {
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
  quantity_issued: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  issue_purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  subcontractor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'subcontractors',
      key: 'subcontractor_id'
    }
  },
  issued_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  received_by_user_id: {
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
  status: {
    type: DataTypes.ENUM('PENDING', 'ISSUED', 'RECEIVED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  mrr_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_requirement_requests',
      key: 'mrr_id'
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
  receipt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_receipts',
      key: 'receipt_id'
    }
  },
  issue_type: {
    type: DataTypes.ENUM('STORE_ISSUE', 'PO_ISSUE'),
    defaultValue: 'STORE_ISSUE'
  },
  reference_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  component_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'project_components',
      key: 'component_id'
    }
  },
  size: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    }
  }
}, {
  tableName: 'material_issues',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialIssue;


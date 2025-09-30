const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialReturn = sequelize.define('MaterialReturn', {
  return_id: {
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  return_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  returned_by: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  condition_status: {
    type: DataTypes.ENUM('GOOD', 'DAMAGED', 'USED', 'EXPIRED'),
    defaultValue: 'GOOD'
  },
  returned_by_user_id: {
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
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
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
  issue_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_issues',
      key: 'issue_id'
    }
  },
  return_type: {
    type: DataTypes.ENUM('STORE_RETURN', 'PO_RETURN', 'DAMAGE_RETURN'),
    defaultValue: 'STORE_RETURN'
  },
  reference_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    }
  },
  component_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'project_components',
      key: 'component_id'
    }
  },
  subcontractor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'subcontractors',
      key: 'subcontractor_id'
    }
  }
}, {
  tableName: 'material_returns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialReturn;


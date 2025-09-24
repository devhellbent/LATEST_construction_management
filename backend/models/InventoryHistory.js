const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryHistory = sequelize.define('InventoryHistory', {
  history_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'materials',
      key: 'material_id'
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
  transaction_type: {
    type: DataTypes.ENUM('ISSUE', 'RETURN', 'ADJUSTMENT', 'PURCHASE', 'CONSUMPTION'),
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // References the ID of the related transaction (issue_id, return_id, etc.)
    comment: 'ID of the related transaction (issue_id, return_id, etc.)'
  },
  quantity_change: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Positive for additions, negative for subtractions'
  },
  quantity_before: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Stock quantity before this transaction'
  },
  quantity_after: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Stock quantity after this transaction'
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference number for the transaction (e.g., issue ID, return ID)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the transaction'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Location where the transaction occurred'
  },
  performed_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['material_id']
    },
    {
      fields: ['project_id']
    },
    {
      fields: ['transaction_type']
    },
    {
      fields: ['transaction_date']
    }
  ]
});

module.exports = InventoryHistory;

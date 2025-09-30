const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectComponent = sequelize.define('ProjectComponent', {
  component_id: {
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
  component_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  component_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  component_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  actual_cost: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
      isAfterStartDate(value) {
        if (value && this.start_date && value < this.start_date) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'),
    defaultValue: 'PLANNED'
  }
}, {
  tableName: 'project_components',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ProjectComponent;

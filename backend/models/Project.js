const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  project_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  budget: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  tender_cost: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  emd: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  bg: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  planned_budget: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  actual_budget: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  subwork: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PLANNED'
  },
  owner_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'projects',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Project;

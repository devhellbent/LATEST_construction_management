const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  report_id: {
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
  report_type: {
    type: DataTypes.ENUM('PROGRESS', 'FINANCIAL', 'RESOURCE', 'ISSUE', 'CUSTOM'),
    allowNull: false
  },
  generated_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  generated_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'reports',
  timestamps: false
});

module.exports = Report;

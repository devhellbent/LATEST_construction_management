const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subcontractor = sequelize.define('Subcontractor', {
  subcontractor_id: {
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
    },
    validate: {
      notNull: true
    }
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  contact_person: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\d\s\-\+\(\)]+$/i
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gst_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  work_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  contract_value: {
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
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'COMPLETED', 'TERMINATED'),
    defaultValue: 'ACTIVE'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'subcontractors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['company_name']
    },
    {
      fields: ['work_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['project_id', 'status']
    }
  ]
});

module.exports = Subcontractor;





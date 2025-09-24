const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const PaymentType = sequelize.define('PaymentType', {
  payment_type_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const PaymentCategory = sequelize.define('PaymentCategory', {
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Payment = sequelize.define('Payment', {
  payment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payment_reference_id: {
    type: DataTypes.STRING(50),
    allowNull: true, // Allow null initially, will be set by hook
    unique: true,
    defaultValue: null
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  payment_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paid_to_type: {
    type: DataTypes.ENUM('TEAM_MEMBER', 'VENDOR', 'LABOUR', 'SUBCONTRACTOR', 'OTHER'),
    allowNull: false
  },
  paid_to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  paid_to_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  paid_to_contact: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  paid_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paid_by_type: {
    type: DataTypes.ENUM('COMPANY', 'INDIVIDUAL'),
    defaultValue: 'COMPANY'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  approval_status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING'
  },
  approved_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachment_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deleted_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (payment) => {
      if (!payment.payment_reference_id) {
        // Generate payment reference ID
        const lastPayment = await Payment.findOne({
          where: { payment_reference_id: { [Op.like]: 'PP%' } },
          order: [['payment_id', 'DESC']]
        });

        let nextId = 1;
        if (lastPayment) {
          const lastId = parseInt(lastPayment.payment_reference_id.substring(2));
          nextId = lastId + 1;
        }

        payment.payment_reference_id = `PP${nextId.toString().padStart(6, '0')}`;
      }
    }
  }
});

module.exports = {
  PaymentType,
  PaymentCategory,
  Payment
};

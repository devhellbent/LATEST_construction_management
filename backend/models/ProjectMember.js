const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  project_member_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invitation_status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'DECLINED'),
    defaultValue: 'PENDING'
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'project_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['project_id', 'user_id']
    }
  ]
});

// Associations
ProjectMember.associate = (models) => {
  ProjectMember.belongsTo(models.Project, { foreignKey: 'project_id' });
  ProjectMember.belongsTo(models.User, { foreignKey: 'user_id' });
  ProjectMember.belongsTo(models.Role, { foreignKey: 'role_id' });
};

module.exports = ProjectMember;

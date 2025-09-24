const { Material, InventoryHistory, User } = require('../models');

class InventoryService {
  /**
   * Record inventory transaction and update stock
   * @param {Object} transactionData - Transaction details
   * @param {number} transactionData.material_id - Material ID
   * @param {number} transactionData.project_id - Project ID (optional)
   * @param {string} transactionData.transaction_type - Type of transaction (ISSUE, RETURN, etc.)
   * @param {number} transactionData.transaction_id - ID of the related transaction
   * @param {number} transactionData.quantity_change - Quantity change (positive for additions, negative for subtractions)
   * @param {string} transactionData.reference_number - Reference number
   * @param {string} transactionData.description - Description of the transaction
   * @param {string} transactionData.location - Location where transaction occurred
   * @param {number} transactionData.performed_by_user_id - User who performed the transaction
   * @returns {Promise<Object>} Updated material and history record
   */
  static async recordTransaction(transactionData) {
    const {
      material_id,
      project_id,
      transaction_type,
      transaction_id,
      quantity_change,
      reference_number,
      description,
      location,
      performed_by_user_id
    } = transactionData;

    // Start a transaction to ensure data consistency
    const transaction = await Material.sequelize.transaction();

    try {
      // Get current material
      const material = await Material.findByPk(material_id, { transaction });
      if (!material) {
        throw new Error(`Material with ID ${material_id} not found`);
      }

      // Calculate new stock quantity
      const quantity_before = material.stock_qty;
      const quantity_after = quantity_before + quantity_change;

      // Check if the transaction would result in negative stock
      if (quantity_after < 0) {
        throw new Error(`Insufficient stock. Available: ${quantity_before}, Requested: ${Math.abs(quantity_change)}`);
      }

      // Update material stock
      await material.update(
        { stock_qty: quantity_after },
        { transaction }
      );

      // Create inventory history record
      const historyRecord = await InventoryHistory.create({
        material_id,
        project_id,
        transaction_type,
        transaction_id,
        quantity_change,
        quantity_before,
        quantity_after,
        reference_number,
        description,
        location,
        performed_by_user_id,
        transaction_date: new Date()
      }, { transaction });

      // Commit the transaction
      await transaction.commit();

      return {
        material,
        historyRecord
      };
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get inventory history for a material
   * @param {number} material_id - Material ID
   * @param {Object} options - Query options
   * @param {number} options.project_id - Filter by project ID
   * @param {string} options.transaction_type - Filter by transaction type
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @returns {Promise<Object>} History records with pagination
   */
  static async getInventoryHistory(material_id, options = {}) {
    const {
      project_id,
      transaction_type,
      limit = 50,
      offset = 0
    } = options;

    const whereClause = { material_id };
    if (project_id) whereClause.project_id = project_id;
    if (transaction_type) whereClause.transaction_type = transaction_type;

    const { count, rows: history } = await InventoryHistory.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'unit'] },
        { model: User, as: 'performedBy', attributes: ['user_id', 'name'] }
      ],
      order: [['transaction_date', 'DESC']],
      limit,
      offset
    });

    return {
      history,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Get inventory history for a project
   * @param {number} project_id - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} History records with pagination
   */
  static async getProjectInventoryHistory(project_id, options = {}) {
    const {
      transaction_type,
      limit = 50,
      offset = 0
    } = options;

    const whereClause = { project_id };
    if (transaction_type) whereClause.transaction_type = transaction_type;

    const { count, rows: history } = await InventoryHistory.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'unit'] },
        { model: User, as: 'performedBy', attributes: ['user_id', 'name'] }
      ],
      order: [['transaction_date', 'DESC']],
      limit,
      offset
    });

    return {
      history,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Get current stock levels for all materials
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of materials with current stock
   */
  static async getCurrentStockLevels(options = {}) {
    const { project_id } = options;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

    const materials = await Material.findAll({
      where: whereClause,
      attributes: [
        'material_id',
        'name',
        'type',
        'unit',
        'stock_qty',
        'minimum_stock_level',
        'maximum_stock_level',
        'reorder_point'
      ],
      order: [['name', 'ASC']]
    });

    return materials;
  }

  /**
   * Get low stock alerts
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of materials with low stock
   */
  static async getLowStockAlerts(options = {}) {
    const { project_id } = options;

    const whereClause = {
      stock_qty: {
        [Material.sequelize.Op.lte]: Material.sequelize.col('reorder_point')
      }
    };
    if (project_id) whereClause.project_id = project_id;

    const lowStockMaterials = await Material.findAll({
      where: whereClause,
      attributes: [
        'material_id',
        'name',
        'type',
        'unit',
        'stock_qty',
        'minimum_stock_level',
        'reorder_point'
      ],
      order: [['stock_qty', 'ASC']]
    });

    return lowStockMaterials;
  }
}

module.exports = InventoryService;

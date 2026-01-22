const { Material, InventoryHistory, User, Warehouse } = require('../models');

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
      performed_by_user_id,
      warehouse_id
    } = transactionData;

    // Start a transaction to ensure data consistency
    const transaction = await Material.sequelize.transaction();

    try {
      let material;
      let quantity_before;
      let quantity_after;

      if (warehouse_id) {
        // For transactions with warehouse_id, find the material in that specific warehouse
        material = await Material.findOne({
          where: {
            material_id: material_id,
            warehouse_id: warehouse_id
          },
          transaction
        });

        if (!material) {
          // If material doesn't exist in this warehouse, find the original material and create a copy in the warehouse
          const originalMaterial = await Material.findByPk(material_id, { transaction });
          if (!originalMaterial) {
            throw new Error(`Material with ID ${material_id} not found`);
          }

          // Create a new material record in the target warehouse
          material = await Material.create({
            name: originalMaterial.name,
            item_id: originalMaterial.item_id,
            warehouse_id: warehouse_id,
            stock_qty: 0,
            unit: originalMaterial.unit,
            status: 'ACTIVE',
            category: originalMaterial.category,
            brand: originalMaterial.brand,
            size: originalMaterial.size,
            type: originalMaterial.type,
            color: originalMaterial.color,
            cost_per_unit: originalMaterial.cost_per_unit,
            supplier: originalMaterial.supplier,
            minimum_stock_level: originalMaterial.minimum_stock_level,
            maximum_stock_level: originalMaterial.maximum_stock_level,
            reorder_point: originalMaterial.reorder_point,
            location: originalMaterial.location
          }, { transaction });
        }

        // Ensure numeric values for calculation
        quantity_before = parseFloat(material.stock_qty) || 0;
        const numericQuantityChange = parseFloat(quantity_change) || 0;
        quantity_after = quantity_before + numericQuantityChange;

        // Note: Stock availability is checked at MRR time, so we allow negative stock here
        // Update material stock in specific warehouse
        await material.update(
          { stock_qty: parseFloat(quantity_after) },
          { transaction }
        );
      } else {
        // For transactions without warehouse_id, use the original logic
        material = await Material.findByPk(material_id, { transaction });
        if (!material) {
          throw new Error(`Material with ID ${material_id} not found`);
        }

        // Ensure numeric values for calculation
        quantity_before = parseFloat(material.stock_qty) || 0;
        const numericQuantityChange = parseFloat(quantity_change) || 0;
        quantity_after = quantity_before + numericQuantityChange;

        // Note: Stock availability is checked at MRR time, so we allow negative stock here
        // Update material stock
        await material.update(
          { stock_qty: parseFloat(quantity_after) },
          { transaction }
        );
      }

      // Create inventory history record
      const historyRecord = await InventoryHistory.create({
        material_id: material.material_id,
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
        { 
          model: Material, 
          as: 'material', 
          attributes: ['material_id', 'name', 'unit', 'warehouse_id'],
          include: [
            { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }
          ]
        },
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
        { 
          model: Material, 
          as: 'material', 
          attributes: ['material_id', 'name', 'unit', 'warehouse_id'],
          include: [
            { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }
          ]
        },
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

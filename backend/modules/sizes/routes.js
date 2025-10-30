const express = require('express');
const { Op } = require('sequelize');
const { query, body, validationResult } = require('express-validator');
const { Size } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// GET /api/sizes - list with search & pagination
router.get('/', authenticateToken, [
  query('q').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { q, category } = req.query;

  const where = { is_active: true };
  if (q) where.value = { [Op.like]: `%${q}%` };
  if (category) where.category = category;

  const { count, rows } = await Size.findAndCountAll({
    where,
    limit,
    offset,
    order: [['value', 'ASC']]
  });

  res.json({
    sizes: rows.map(r => ({ size_id: r.size_id, value: r.value, category: r.category })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: limit
    }
  });
});

// POST /api/sizes - create (admin only)
router.post('/', authenticateToken, authorizeRoles('Admin'), [
  body('value').isString().trim().notEmpty(),
  body('category').optional().isString().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { value, category } = req.body;
  const size = await Size.create({ value, category });
  res.status(201).json({ size });
});

// PATCH /api/sizes/:id - update value/category/active (admin only)
router.patch('/:id', authenticateToken, authorizeRoles('Admin'), [
  body('value').optional().isString().trim().notEmpty(),
  body('category').optional().isString().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const size = await Size.findByPk(req.params.id);
  if (!size) return res.status(404).json({ message: 'Size not found' });

  const { value, category, is_active } = req.body;
  if (value !== undefined) size.value = value;
  if (category !== undefined) size.category = category;
  if (is_active !== undefined) size.is_active = is_active;
  await size.save();

  res.json({ size });
});

// POST /api/sizes/bulk - bulk upsert (admin only)
router.post('/bulk', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const list = Array.isArray(req.body?.values) ? req.body.values : [];
  if (!list.length) return res.status(400).json({ message: 'values array required' });

  for (const value of list) {
    if (typeof value !== 'string' || !value.trim()) continue;
    await Size.findOrCreate({ where: { value: value.trim() }, defaults: { value: value.trim() } });
  }

  res.json({ message: 'Sizes imported' });
});

module.exports = router;



const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role_id').isInt({ min: 1 }).withMessage('Valid role ID is required'),
  body('contact_info').optional().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role_id, contact_info, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash: password, // Will be hashed by the model hook
      role_id,
      contact_info,
      phone
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ 
      where: { email },
      include: [
        {
          model: require('../../models').Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }
      ]
    });
    
    console.log('Login attempt for email:', email);
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.name, user.email, 'Active:', user.is_active);

    // Check if user is active
    if (!user.is_active) {
      console.log('User account is deactivated');
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Validate password
    console.log('Validating password...');
    const isValidPassword = await user.validatePassword(password);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user information' });
  }
});

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.user_id);

    // Validate current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password_hash = newPassword; // Will be hashed by the model hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

module.exports = router;

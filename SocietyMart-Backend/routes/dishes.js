const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/dishes
// @desc    Get all dishes (can be filtered by kitchen_id)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { kitchen_id } = req.query;

    let query = supabase.from('dishes').select('*').eq('is_available', true);

    if (kitchen_id) {
      query = query.eq('kitchen_id', kitchen_id);
    }

    const { data: dishes, error } = await query;

    if (error) throw error;

    res.status(200).json(dishes);
  } catch (err) {
    console.error('Error fetching dishes:', err);
    res.status(500).json({ error: 'Server error fetching dishes' });
  }
});

// @route   POST /api/dishes
// @desc    Add a new dish (Sellers only)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user; // Decoded Firebase user from authMiddleware
    const { name, description, price, isVeg, imageUrl, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // 1. Fetch the seller's profile from the DB using user's phone
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, role, kitchen_id')
      .eq('phone', user.phone)
      .single();

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const hasSellerRole = Array.isArray(dbUser.role)
      ? dbUser.role.includes('seller')
      : dbUser.role === 'seller';

    if (!hasSellerRole) {
      return res.status(403).json({ error: 'Forbidden: Only sellers can add dishes' });
    }

    if (!dbUser.kitchen_id) {
      return res.status(400).json({ 
        error: 'No registered kitchen found for this user profile. Please register a kitchen first.' 
      });
    }

    // 2. Insert the new dish using the active kitchen_id
    const { data: newDish, error: dishError } = await supabase
      .from('dishes')
      .insert([
        {
          kitchen_id: dbUser.kitchen_id, // Link to the new cloud_kitchens.id
          name,
          description: description || '',
          price: parseFloat(price),
          is_veg: isVeg ?? true,
          image_url: imageUrl || null,
          category: category || 'Meals',
          is_available: true
        }
      ])
      .select()
      .single();

    if (dishError) {
      console.error('Error adding dish:', dishError.message);
      return res.status(500).json({ error: 'Failed to add dish' });
    }

    res.status(201).json({ 
      message: 'Dish added successfully', 
      dish: newDish 
    });

  } catch (err) {
    console.error('Error adding dish server error:', err);
    res.status(500).json({ error: 'Server error adding dish' });
  }
});

module.exports = router;

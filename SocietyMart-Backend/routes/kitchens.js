const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/kitchens
// @desc    Register a new cloud kitchen (Sellers/Chefs only)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user; // Decoded Firebase user from authMiddleware
    const { name, description, imageUrl, societyId } = req.body;

    if (!name || !societyId) {
      return res.status(400).json({ error: 'Name and housing society ID are required' });
    }

    // 1. Fetch user from Supabase using user's phone to check role and if they already have a kitchen
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', user.phone)
      .single();

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User profile not found. Please complete registration first.' });
    }

    const hasSellerRole = Array.isArray(dbUser.role)
      ? dbUser.role.includes('seller')
      : dbUser.role === 'seller';

    if (!hasSellerRole) {
      return res.status(403).json({ error: 'Only sellers/chefs are authorized to register cloud kitchens' });
    }

    if (dbUser.kitchen_id) {
      return res.status(400).json({ error: 'User already owns a registered cloud kitchen' });
    }

    // 2. Create the Cloud Kitchen entry
    const { data: newKitchen, error: kitchenError } = await supabase
      .from('cloud_kitchens')
      .insert([
        {
          society_id: societyId,
          name,
          description: description || '',
          image_url: imageUrl || '',
          is_active: true
        }
      ])
      .select()
      .single();

    if (kitchenError) {
      console.error('Error creating cloud kitchen:', kitchenError.message);
      return res.status(500).json({ error: 'Failed to register cloud kitchen' });
    }

    // 3. Update the owner user profile with the new kitchen_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ kitchen_id: newKitchen.id })
      .eq('id', dbUser.id);

    if (updateError) {
      console.error('Error linking kitchen to user profile:', updateError.message);
      // Attempt clean up of dangling kitchen to prevent ghost records
      await supabase.from('cloud_kitchens').delete().eq('id', newKitchen.id);
      return res.status(500).json({ error: 'Failed to link kitchen to owner profile' });
    }

    res.status(201).json({
      message: 'Cloud kitchen registered successfully',
      kitchen: newKitchen
    });

  } catch (err) {
    console.error('Register Cloud Kitchen Server Error:', err);
    res.status(500).json({ error: 'Internal server error during kitchen registration' });
  }
});

// @route   GET /api/kitchens
// @desc    Get all active cloud kitchens, including nested society details and dishes lists
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: kitchens, error } = await supabase
      .from('cloud_kitchens')
      .select(`
        *,
        society:societies(*),
        dishes:dishes(*)
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching cloud kitchens:', error.message);
      return res.status(500).json({ error: 'Failed to fetch cloud kitchens list' });
    }

    res.status(200).json(kitchens);

  } catch (err) {
    console.error('Fetch Kitchens Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching cloud kitchens list' });
  }
});

// @route   GET /api/kitchens/:id
// @desc    Get a specific cloud kitchen detail with nested society data and its active dishes list
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const kitchenId = req.params.id;

    // Fetch the cloud kitchen with nested society and its active dishes list
    const { data: kitchen, error } = await supabase
      .from('cloud_kitchens')
      .select(`
        *,
        society:societies(*),
        dishes:dishes(*)
      `)
      .eq('id', kitchenId)
      .single();

    if (error || !kitchen) {
      return res.status(404).json({ error: 'Cloud kitchen not found' });
    }

    // Filter active dishes
    const activeDishes = (kitchen.dishes || []).filter(dish => dish.is_available);

    res.status(200).json({
      kitchen: {
        ...kitchen,
        dishes: undefined // clean response payload redundancy
      },
      dishes: activeDishes
    });

  } catch (err) {
    console.error('Fetch Kitchen Details Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching kitchen details' });
  }
});

module.exports = router;

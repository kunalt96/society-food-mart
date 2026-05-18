const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/societies
// @desc    Register a new housing society
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const { data: newSociety, error } = await supabase
      .from('societies')
      .insert([
        {
          name,
          address,
          latitude: latitude || null,
          longitude: longitude || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting society:', error.message);
      return res.status(500).json({ error: 'Failed to create housing society' });
    }

    res.status(201).json({
      message: 'Society registered successfully',
      society: newSociety
    });

  } catch (err) {
    console.error('Society Registration Server Error:', err);
    res.status(500).json({ error: 'Internal server error during society registration' });
  }
});

// @route   GET /api/societies
// @desc    Get a flat list of all housing societies
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: societies, error } = await supabase
      .from('societies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching societies:', error.message);
      return res.status(500).json({ error: 'Failed to fetch societies' });
    }

    res.status(200).json(societies);

  } catch (err) {
    console.error('Fetch Societies Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching societies' });
  }
});

// @route   GET /api/societies/with-kitchens
// @desc    Get housing societies along with nested cloud kitchens and their active dishes
// @access  Private
router.get('/with-kitchens', authMiddleware, async (req, res) => {
  try {
    const { data: societiesWithMenus, error } = await supabase
      .from('societies')
      .select(`
        *,
        kitchens:cloud_kitchens(
          *,
          dishes:dishes(*)
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching nested societies with menus:', error.message);
      return res.status(500).json({ error: 'Failed to fetch societies with kitchen listings' });
    }

    // Filter out inactive kitchens if needed, or map active state
    const processedSocieties = societiesWithMenus.map(society => ({
      ...society,
      kitchens: (society.kitchens || []).filter(k => k.is_active)
    }));

    res.status(200).json(processedSocieties);

  } catch (err) {
    console.error('Fetch Societies with Menus Server Error:', err);
    res.status(500).json({ error: 'Internal server error fetching societies with kitchen listings' });
  }
});

module.exports = router;

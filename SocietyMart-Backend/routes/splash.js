const express = require('express');
const router = express.Router();

// @route   GET /api/splash
// @desc    Get dynamic text for the splash screen
// @access  Public
router.get('/', (req, res) => {
  try {
    const splashData = {
      topText: "Welcome to",
      greetingTexts: [
        "Your premium cloud kitchen experience.",
        "Order fresh, chef-crafted meals directly to your door.",
        "Support local home chefs in your society!"
      ]
    };
    
    res.status(200).json(splashData);
  } catch (err) {
    console.error('Splash Route Error:', err);
    res.status(500).json({ error: 'Server error fetching splash text' });
  }
});

module.exports = router;

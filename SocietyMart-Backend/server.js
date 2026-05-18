const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const kitchenRoutes = require('./routes/kitchens');
const societyRoutes = require('./routes/societies');
const splashRoutes = require('./routes/splash');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/kitchens', kitchenRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/splash', splashRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 SocietyMart Backend is running on port ${PORT}`);
  console.log(`📦 Supabase URL: ${process.env.SUPABASE_URL || '❌ NOT SET'}`);
});

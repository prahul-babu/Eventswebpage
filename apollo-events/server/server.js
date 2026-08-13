const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedData = require('./seeders/seed');

dotenv.config();

const app = express();

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static asset folders
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Apollo Events Server is running smoothly', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 5001;

// Connect Database & Start Server
connectDB().then(async () => {
  try {
    // Seed initial data if database has no events
    const Event = require('./models/Event');
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      await seedData();
    }
  } catch (err) {
    console.log('Seed check note:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Apollo Events Backend running on port ${PORT}`);
  });
}).catch(err => {
  console.log('Server start error:', err);
  app.listen(PORT, () => {
    console.log(`Apollo Events Backend running in fallback mode on port ${PORT}`);
  });
});

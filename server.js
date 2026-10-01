require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed initial administrator & demo rooms if collection is empty
const seedInitialData = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hostel.com').toLowerCase();
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      await User.create({
        name: process.env.ADMIN_NAME || 'Hostel Administrator',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin123',
        phone: '9876543210',
        department: 'Administration',
        year: 'Staff',
        gender: 'Male',
        role: 'admin'
      });
      console.log(`[Seed] Initial admin created: ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    }

    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany([
        { roomNumber: '101', block: 'A Block', floor: 1, capacity: 2, occupiedBeds: 0, status: 'Available' },
        { roomNumber: '102', block: 'A Block', floor: 1, capacity: 2, occupiedBeds: 0, status: 'Available' },
        { roomNumber: '201', block: 'B Block', floor: 2, capacity: 3, occupiedBeds: 0, status: 'Available' },
        { roomNumber: '202', block: 'B Block', floor: 2, capacity: 3, occupiedBeds: 0, status: 'Available' }
      ]);
      console.log('[Seed] Sample hostel rooms created successfully.');
    }
  } catch (err) {
    console.error('[Seed Error]', err.message);
  }
};

// Run seed after a short delay to ensure DB connection is ready
setTimeout(seedInitialData, 1000);

// API Health Check
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hostel Management System API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/complaints', complaintRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server] Hostel Management Server running on port ${PORT}`);
});

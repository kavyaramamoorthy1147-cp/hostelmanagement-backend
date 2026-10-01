const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getDashboardStats
} = require('../controllers/roomController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Get dashboard stats (admin only) - place before /:id route
router.get('/dashboard/stats', protect, adminOnly, getDashboardStats);

// Get all rooms (both student and admin can view room list)
router.get('/', protect, getRooms);

// Admin only: create room
router.post('/', protect, adminOnly, createRoom);

// Get single room details
router.get('/:id', protect, getRoomById);

// Admin only: update room
router.put('/:id', protect, adminOnly, updateRoom);

// Admin only: delete room
router.delete('/:id', protect, adminOnly, deleteRoom);

module.exports = router;

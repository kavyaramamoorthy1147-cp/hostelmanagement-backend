const Room = require('../models/Room');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

// @desc    Get all rooms (optionally calculate current occupants)
// @route   GET /api/rooms
// @access  Private (Admin & Student)
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ block: 1, floor: 1, roomNumber: 1 });

    // Ensure occupiedBeds count is accurately synchronized
    const updatedRooms = await Promise.all(
      rooms.map(async (room) => {
        const count = await User.countDocuments({ room: room._id, role: 'student' });
        if (room.occupiedBeds !== count) {
          room.occupiedBeds = count;
          room.status = count >= room.capacity ? 'Full' : 'Available';
          await room.save();
        }
        return room;
      })
    );

    res.json(updatedRooms);
  } catch (error) {
    console.error('[GetRooms Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch rooms' });
  }
};

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Fetch assigned students for this room
    const occupants = await User.find({ room: room._id, role: 'student' }).select('name email phone department year gender');

    res.json({
      room,
      occupants
    });
  } catch (error) {
    console.error('[GetRoomById Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch room' });
  }
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = async (req, res) => {
  try {
    const { roomNumber, block, floor, capacity } = req.body;

    if (!roomNumber || !block || capacity === undefined) {
      return res.status(400).json({ message: 'Room number, block, and capacity are required' });
    }

    const existing = await Room.findOne({ roomNumber: roomNumber.trim() });
    if (existing) {
      return res.status(400).json({ message: `Room number ${roomNumber} already exists` });
    }

    const room = await Room.create({
      roomNumber: roomNumber.trim(),
      block: block.trim(),
      floor: Number(floor) || 1,
      capacity: Number(capacity),
      occupiedBeds: 0,
      status: 'Available'
    });

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('[CreateRoom Error]', error);
    res.status(500).json({ message: error.message || 'Failed to create room' });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { roomNumber, block, floor, capacity } = req.body;

    if (roomNumber && roomNumber.trim() !== room.roomNumber) {
      const duplicate = await Room.findOne({ roomNumber: roomNumber.trim() });
      if (duplicate) {
        return res.status(400).json({ message: `Room number ${roomNumber} is already in use` });
      }
      room.roomNumber = roomNumber.trim();
    }

    if (block) room.block = block.trim();
    if (floor !== undefined) room.floor = Number(floor);
    if (capacity !== undefined) {
      const newCapacity = Number(capacity);
      if (newCapacity < room.occupiedBeds) {
        return res.status(400).json({
          message: `Cannot reduce capacity below current occupied beds (${room.occupiedBeds})`
        });
      }
      room.capacity = newCapacity;
    }

    // Refresh status
    room.status = room.occupiedBeds >= room.capacity ? 'Full' : 'Available';

    await room.save();

    res.json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    console.error('[UpdateRoom Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update room' });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Unassign all students currently assigned to this room
    await User.updateMany({ room: room._id }, { $set: { room: null } });

    await Room.findByIdAndDelete(room._id);

    res.json({ message: 'Room deleted successfully and occupants unassigned' });
  } catch (error) {
    console.error('[DeleteRoom Error]', error);
    res.status(500).json({ message: error.message || 'Failed to delete room' });
  }
};

// @desc    Get dashboard summary statistics
// @route   GET /api/rooms/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'Available' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });

    res.json({
      totalStudents,
      totalRooms,
      availableRooms,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints
    });
  } catch (error) {
    console.error('[DashboardStats Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getDashboardStats
};

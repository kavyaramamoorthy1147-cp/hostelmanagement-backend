const User = require('../models/User');
const Room = require('../models/Room');
const Complaint = require('../models/Complaint');

// Helper to recalculate room occupancy
const syncRoomOccupancy = async (roomId) => {
  if (!roomId) return;
  const count = await User.countDocuments({ room: roomId, role: 'student' });
  const room = await Room.findById(roomId);
  if (room) {
    room.occupiedBeds = count;
    room.status = count >= room.capacity ? 'Full' : 'Available';
    await room.save();
  }
};

// @desc    Get all students (with optional search query)
// @route   GET /api/students
// @access  Private/Admin
const getStudents = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'student' };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { department: regex },
        { phone: regex }
      ];
    }

    const students = await User.find(query)
      .populate('room')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    console.error('[GetStudents Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch students' });
  }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
// @access  Private/Admin
const getStudentById = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
      .populate('room')
      .select('-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('[GetStudentById Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch student' });
  }
};

// @desc    Create a new student (Admin)
// @route   POST /api/students
// @access  Private/Admin
const createStudent = async (req, res) => {
  try {
    const { name, email, password, phone, department, year, gender, room } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }

    let targetRoomId = null;
    if (room && room !== '') {
      const foundRoom = await Room.findById(room);
      if (!foundRoom) {
        return res.status(404).json({ message: 'Selected room not found' });
      }
      if (foundRoom.occupiedBeds >= foundRoom.capacity) {
        return res.status(400).json({ message: 'Selected room is already full' });
      }
      targetRoomId = foundRoom._id;
    }

    const student = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      department: department || '',
      year: year || '',
      gender: gender || '',
      room: targetRoomId,
      role: 'student'
    });

    if (targetRoomId) {
      await syncRoomOccupancy(targetRoomId);
    }

    const createdStudent = await User.findById(student._id)
      .populate('room')
      .select('-password');

    res.status(201).json({
      message: 'Student added successfully',
      student: createdStudent
    });
  } catch (error) {
    console.error('[CreateStudent Error]', error);
    res.status(500).json({ message: error.message || 'Failed to add student' });
  }
};

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { name, email, phone, department, year, gender, room, password } = req.body;

    if (email && email.toLowerCase() !== student.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
      student.email = email.toLowerCase();
    }

    if (name) student.name = name;
    if (phone !== undefined) student.phone = phone;
    if (department !== undefined) student.department = department;
    if (year !== undefined) student.year = year;
    if (gender !== undefined) student.gender = gender;
    if (password && password.trim() !== '') {
      student.password = password;
    }

    const oldRoomId = student.room ? student.room.toString() : null;
    let newRoomId = room === '' || room === null ? null : room;

    if (newRoomId && newRoomId !== oldRoomId) {
      const targetRoom = await Room.findById(newRoomId);
      if (!targetRoom) {
        return res.status(404).json({ message: 'Selected room not found' });
      }
      if (targetRoom.occupiedBeds >= targetRoom.capacity) {
        return res.status(400).json({ message: 'Selected room is full and cannot accommodate more students' });
      }
      student.room = targetRoom._id;
    } else if (newRoomId === null) {
      student.room = null;
    }

    await student.save();

    // Synchronize occupancy for affected rooms
    if (oldRoomId && oldRoomId !== newRoomId) {
      await syncRoomOccupancy(oldRoomId);
    }
    if (newRoomId && newRoomId !== oldRoomId) {
      await syncRoomOccupancy(newRoomId);
    }

    const updatedStudent = await User.findById(student._id)
      .populate('room')
      .select('-password');

    res.json({
      message: 'Student updated successfully',
      student: updatedStudent
    });
  } catch (error) {
    console.error('[UpdateStudent Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update student' });
  }
};

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const roomId = student.room;

    // Delete associated complaints
    await Complaint.deleteMany({ student: student._id });

    // Delete student
    await User.findByIdAndDelete(student._id);

    // Update room occupancy if was assigned
    if (roomId) {
      await syncRoomOccupancy(roomId);
    }

    res.json({ message: 'Student and related records deleted successfully' });
  } catch (error) {
    console.error('[DeleteStudent Error]', error);
    res.status(500).json({ message: error.message || 'Failed to delete student' });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};

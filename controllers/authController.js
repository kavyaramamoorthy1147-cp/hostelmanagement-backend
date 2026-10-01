const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, phone, department, year, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create student account
    const student = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      department: department || '',
      year: year || '',
      gender: gender || '',
      role: 'student'
    });

    if (student) {
      return res.status(201).json({
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        phone: student.phone,
        department: student.department,
        year: student.year,
        gender: student.gender,
        room: student.room,
        token: generateToken(student._id, student.role),
        message: 'Student registered successfully'
      });
    } else {
      return res.status(400).json({ message: 'Invalid student data provided' });
    }
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    // Find user by email and populate room details
    const user = await User.findOne({ email: email.toLowerCase() }).populate('room');

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        year: user.year,
        gender: user.gender,
        room: user.room,
        token: generateToken(user._id, user.role),
        message: 'Login successful'
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('room').select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('[GetMe Error]', error);
    return res.status(500).json({ message: error.message || 'Server error fetching profile' });
  }
};

module.exports = {
  registerStudent,
  loginUser,
  getMe
};

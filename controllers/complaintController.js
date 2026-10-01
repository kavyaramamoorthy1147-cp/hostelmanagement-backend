const Complaint = require('../models/Complaint');

// @desc    Get complaints (students get their own, admin gets all)
// @route   GET /api/complaints
// @access  Private
const getComplaints = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const complaints = await Complaint.find(query)
      .populate({
        path: 'student',
        select: 'name email phone department room',
        populate: {
          path: 'room',
          select: 'roomNumber block floor'
        }
      })
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    console.error('[GetComplaints Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch complaints' });
  }
};

// @desc    Get single complaint by ID
// @route   GET /api/complaints/:id
// @access  Private
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate({
      path: 'student',
      select: 'name email phone department room',
      populate: {
        path: 'room',
        select: 'roomNumber block floor'
      }
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Ensure student only views their own complaint
    if (
      req.user.role === 'student' &&
      complaint.student._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied: not authorized to view this complaint' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('[GetComplaintById Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch complaint' });
  }
};

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Private (Student)
const createComplaint = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const complaint = await Complaint.create({
      student: req.user._id,
      title: title.trim(),
      description: description.trim(),
      status: 'Pending'
    });

    const populatedComplaint = await Complaint.findById(complaint._id).populate({
      path: 'student',
      select: 'name email phone department room',
      populate: {
        path: 'room',
        select: 'roomNumber block'
      }
    });

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: populatedComplaint
    });
  } catch (error) {
    console.error('[CreateComplaint Error]', error);
    res.status(500).json({ message: error.message || 'Failed to submit complaint' });
  }
};

// @desc    Update complaint (Admin updates status; student can edit if pending)
// @route   PUT /api/complaints/:id
// @access  Private
const updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (req.user.role === 'admin') {
      const { status, title, description } = req.body;
      if (status) {
        if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status value' });
        }
        complaint.status = status;
      }
      if (title) complaint.title = title.trim();
      if (description) complaint.description = description.trim();
    } else {
      // Student can only update their own complaint
      if (complaint.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to edit this complaint' });
      }
      const { title, description } = req.body;
      if (title) complaint.title = title.trim();
      if (description) complaint.description = description.trim();
    }

    await complaint.save();

    const updated = await Complaint.findById(complaint._id).populate({
      path: 'student',
      select: 'name email phone department room',
      populate: {
        path: 'room',
        select: 'roomNumber block'
      }
    });

    res.json({
      message: 'Complaint updated successfully',
      complaint: updated
    });
  } catch (error) {
    console.error('[UpdateComplaint Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update complaint' });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private (Admin or Student owner)
const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (
      req.user.role !== 'admin' &&
      complaint.student.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this complaint' });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('[DeleteComplaint Error]', error);
    res.status(500).json({ message: error.message || 'Failed to delete complaint' });
  }
};

module.exports = {
  getComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint
};

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true
    },
    block: {
      type: String,
      required: [true, 'Block name/number is required'],
      trim: true
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
      default: 1
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    occupiedBeds: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['Available', 'Full'],
      default: 'Available'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure status matches capacity and occupiedBeds
roomSchema.pre('save', function (next) {
  if (this.occupiedBeds >= this.capacity) {
    this.status = 'Full';
  } else {
    this.status = 'Available';
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);

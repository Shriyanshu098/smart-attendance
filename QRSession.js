const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminLat: {
    type: Number,
    required: true
  },
  adminLng: {
    type: Number,
    required: true
  },
  adminAccuracy: {
    type: Number,
    default: 0
  },
  allowedRadius: {
    type: Number,
    default: 40 // Strict 40m anti-cheat radius
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QRSession', qrSessionSchema);

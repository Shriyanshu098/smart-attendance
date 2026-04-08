const express = require('express');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const QRSession = require('../models/QRSession');
const Attendance = require('../models/Attendance');

const router = express.Router();

// GET /api/teacher/qr/status/:token (Public - Needed by the attend page before login)
router.get('/qr/status/:token', async (req, res) => {
  try {
    const session = await QRSession.findOne({ token: req.params.token }).populate('subjectId', 'subjectName subjectCode');
    if (!session) {
      return res.status(404).json({ message: 'Invalid or non-existent token' });
    }
    if (session.isUsed) {
      return res.status(400).json({ message: 'This QR link has already been used' });
    }
    if (new Date() > session.expiresAt) {
      return res.status(400).json({ message: 'This QR has expired' });
    }
    res.json({ valid: true, subject: session.subjectId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// All following routes require authentication and teacher/admin role
router.use(auth);
router.use(roleCheck(['teacher', 'admin']));

// POST /api/teacher/qr/generate
router.post('/qr/generate', async (req, res) => {
  try {
    const { subjectId, durationMinutes, lat, lng } = req.body;
    
    if (!subjectId || !durationMinutes || !lat || !lng) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);

    const session = new QRSession({
      token,
      subjectId,
      teacherId: req.user.id,
      adminLat: lat,
      adminLng: lng,
      expiresAt
    });

    await session.save();

    const attendanceUrl = `${process.env.FRONTEND_URL}/attend.html?token=${token}`;
    const qrImageBase64 = await qrcode.toDataURL(attendanceUrl);

    res.json({
      token,
      qrImageBase64,
      expiresAt,
      url: attendanceUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/teacher/attendance/:subjectId
router.get('/attendance/:subjectId', async (req, res) => {
  try {
    const records = await Attendance.find({ subjectId: req.params.subjectId })
      .populate('studentId', 'name rollNumber email')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

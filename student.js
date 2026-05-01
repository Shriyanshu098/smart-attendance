const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const QRSession = require('../models/QRSession');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const User = require('../models/User');
const haversineDistance = require('../utils/haversine');

const router = express.Router();

router.use(auth);
router.use(roleCheck(['student', 'admin']));

// POST /api/student/attendance/mark
router.post('/attendance/mark', async (req, res) => {
  try {
    const { token, lat, lng, accuracy } = req.body;
    const studentId = req.user.id;

    // 1. Find QR session
    const session = await QRSession.findOne({ token });
    if (!session) return res.status(404).json({ message: 'Invalid token' });

    // 2. Check token not expired
    if (new Date() > session.expiresAt) {
      return res.status(400).json({ message: 'This QR has expired' });
    }

    // 3. Check token not already used
    if (session.isUsed) {
      return res.status(400).json({ message: 'This link has already been used' });
    }

    // 4. Check student is enrolled in that subject
    const subject = await Subject.findById(session.subjectId);
    if (!subject.enrolledStudents.includes(studentId)) {
      return res.status(403).json({ message: 'You are not enrolled in this subject' });
    }

    // 5. Check student not already marked today for this subject
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      studentId,
      subjectId: session.subjectId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'You have already marked attendance for this subject today.' });
    }

    // 6. Calculate Haversine distance
    const distance = haversineDistance(lat, lng, session.adminLat, session.adminLng);

    // 7. Limit to allowed radius + GPS accuracy margin
    const allowed = session.allowedRadius + (session.adminAccuracy || 0) + (accuracy || 0);
    if (distance > allowed) {
      return res.status(400).json({ 
        message: `You are too far from the classroom. (${Math.round(distance)}m away, max allowed is ${Math.round(allowed)}m)` 
      });
    }

    // 8. Mark present, set token as used
    const newAttendance = new Attendance({
      studentId,
      subjectId: session.subjectId,
      sessionId: session._id,
      date: new Date(),
      status: 'present',
      studentLat: lat,
      studentLng: lng,
      distanceFromTeacher: distance
    });

    await newAttendance.save();
    
    session.isUsed = true;
    await session.save();

    res.json({ message: 'Attendance Marked Successfully! ✅', distance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/attendance/me
router.get('/attendance/me', async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.user.id })
      .populate('subjectId', 'subjectName subjectCode')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/subjects/me
router.get('/subjects/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'subjects',
      populate: { path: 'teacherId', select: 'name' }
    });
    res.json(user.subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

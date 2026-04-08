const express = require('express');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.use(auth);
router.use(roleCheck(['admin']));

// User Management
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      rollNumber: role === 'student' ? rollNumber : undefined
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  console.log(`[BACKEND] DELETE USER REQUEST: ID=${req.params.id}`);
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/password', async (req, res) => {
  console.log(`[BACKEND] PW UPDATE REQUEST: ID=${req.params.id}`);
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Subject Management
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find().populate('teacherId', 'name email').populate('enrolledStudents', 'name email rollNumber');
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const { subjectCode, subjectName, teacherId } = req.body;
    const subject = new Subject({ subjectCode, subjectName, teacherId });
    await subject.save();

    // Also add this subject to the teacher's subjects array
    if (teacherId) {
      await User.findByIdAndUpdate(teacherId, { $push: { subjects: subject._id } });
    }

    res.status(201).json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    const { teacherId, enrolledStudents } = req.body;
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (teacherId) {
      // Remove from old teacher
      if (subject.teacherId) {
         await User.findByIdAndUpdate(subject.teacherId, { $pull: { subjects: subject._id } });
      }
      subject.teacherId = teacherId;
      await User.findByIdAndUpdate(teacherId, { $addToSet: { subjects: subject._id } });
    }

    if (enrolledStudents) {
      subject.enrolledStudents = enrolledStudents;
      // Also update all students
      for (const studentId of enrolledStudents) {
        await User.findByIdAndUpdate(studentId, { $addToSet: { subjects: subject._id } });
      }
      // Note: we should also remove the subject from students who were removed, but keeping it simple for now.
    }

    await subject.save();
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Attendance Management
router.get('/attendance/all', async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('studentId', 'name rollNumber')
      .populate('subjectId', 'subjectName subjectCode');
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/attendance/report', async (req, res) => {
  try {
    const { subjectId, studentId, dateStart, dateEnd } = req.query;
    let query = {};
    if (subjectId) query.subjectId = subjectId;
    if (studentId) query.studentId = studentId;
    if (dateStart && dateEnd) {
      query.date = { $gte: new Date(dateStart), $lte: new Date(dateEnd) };
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name rollNumber')
      .populate('subjectId', 'subjectName subjectCode');
    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

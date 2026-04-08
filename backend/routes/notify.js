const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Subject = require('../models/Subject');
const User = require('../models/User');
const mailer = require('../utils/mailer');
const qrcode = require('qrcode');

const router = express.Router();

router.use(auth);
router.use(roleCheck(['teacher', 'admin']));

// POST /api/notify/send-qr
router.post('/send-qr', async (req, res) => {
  try {
    const { sessionToken, subjectId } = req.body;
    
    if (!sessionToken || !subjectId) {
      return res.status(400).json({ message: 'Missing sessionToken or subjectId' });
    }

    const subject = await Subject.findById(subjectId).populate('enrolledStudents');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (subject.enrolledStudents.length === 0) {
      return res.status(400).json({ message: 'No students enrolled in this subject' });
    }

    const attendanceUrl = `${process.env.FRONTEND_URL}/attend.html?token=${sessionToken}`;
    const qrImageBase64 = await qrcode.toDataURL(attendanceUrl);

    const studentEmails = subject.enrolledStudents.map(student => student.email);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmails.join(', '), // Send to all students
      subject: `Attendance QR Code for ${subject.subjectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h2>Mark your attendance for ${subject.subjectName}</h2>
          <p>Please scan the QR code below or click the link to mark your attendance.</p>
          <img src="${qrImageBase64}" alt="QR Code" style="width: 250px; height: 250px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;" />
          <br><br>
          <a href="${attendanceUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Click here to mark Attendance</a>
          <br><br>
          <p style="font-size: 12px; color: #777;">Note: This link will expire soon and can only be used once.</p>
        </div>
      `
    };

    await mailer.sendMail(mailOptions);

    res.json({ message: 'Emails sent successfully to all enrolled students' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error or Mailer error' });
  }
});

module.exports = router;

let countdownInterval;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'teacher') {
    window.location.href = '/index.html';
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // Tab Setup
  const tabs = document.querySelectorAll('.sidebar-menu a');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('d-none'));
      
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('d-none');
    });
  });

  // Load My Profile and Subjects
  await loadTeacherSubjects();

  // Get Location Logic
  document.getElementById('btnGetLocation').addEventListener('click', () => {
    const status = document.getElementById('locationStatus');
    status.innerText = 'Locating...';
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('lat').value = position.coords.latitude;
          document.getElementById('lng').value = position.coords.longitude;
          document.getElementById('accuracy').value = position.coords.accuracy;
          status.innerText = `Location Acquired: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)} (Acc: ${Math.round(position.coords.accuracy)}m)`;
          showToast('Classroom location locked', 'success');
        },
        (error) => {
          status.innerText = 'Error getting location: ' + error.message;
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      status.innerText = "Geolocation is not supported by this browser.";
    }
  });

  // Generate QR
  document.getElementById('qrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const accuracy = document.getElementById('accuracy').value;
    
    if (!lat || !lng) {
      showToast('Please get your location first', 'error');
      return;
    }

    const payload = {
      subjectId: document.getElementById('qrSubject').value,
      durationMinutes: parseInt(document.getElementById('qrDuration').value),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: parseFloat(accuracy) || 0
    };

    try {
      const res = await fetch('/api/teacher/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        document.getElementById('qrOutputCard').style.display = 'block';
        document.getElementById('qrImage').src = data.qrImageBase64;
        document.getElementById('qrImage').style.opacity = '1';
        document.getElementById('qrUrl').value = data.url;
        document.getElementById('currentSessionToken').value = data.token;
        document.getElementById('qrSubjectName').innerText = Array.from(document.getElementById('qrSubject').options).find(o => o.value === payload.subjectId).innerText;
        
        startCountdown(new Date(data.expiresAt).getTime());
        showToast('QR Code Generated', 'success');
      } else {
        showToast(data.message, 'error');
      }
    } catch(err) {
      showToast('Error generating QR', 'error');
    }
  });

  // Email QR
  document.getElementById('btnEmailQR').addEventListener('click', async () => {
    const sessionToken = document.getElementById('currentSessionToken').value;
    const subjectId = document.getElementById('qrSubject').value;

    if (!sessionToken) return;

    try {
      showToast('Sending emails... this might take a moment', 'success');
      const res = await fetch('/api/notify/send-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessionToken, subjectId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Emails sent successfully', 'success');
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      showToast('Mailer error', 'error');
    }
  });

  // Expire QR Button
  document.getElementById('btnExpireQR').addEventListener('click', async () => {
    const sessionToken = document.getElementById('currentSessionToken').value;
    if (!sessionToken) return;

    try {
      const res = await fetch(`/api/teacher/qr/expire/${sessionToken}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        startCountdown(new Date().getTime() - 1000); // Trigger instant expire on UI
        showToast('QR Code forcefully expired', 'success');
      }
    } catch (err) {
      showToast('Error expiring QR', 'error');
    }
  });

});

async function loadTeacherSubjects() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (res.ok) {
    const user = await res.json();
    const qrSub = document.getElementById('qrSubject');
    const viewSub = document.getElementById('viewSubject');
    
    qrSub.innerHTML = '';
    viewSub.innerHTML = '<option value="">Select subject...</option>';

    user.subjects.forEach(sub => {
      const opt1 = document.createElement('option');
      opt1.value = sub._id;
      opt1.textContent = `${sub.subjectCode} - ${sub.subjectName}`;
      qrSub.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = sub._id;
      opt2.textContent = `${sub.subjectCode} - ${sub.subjectName}`;
      viewSub.appendChild(opt2);
    });
  }
}

function startCountdown(endTime) {
  clearInterval(countdownInterval);
  const timerEl = document.getElementById('qrTimer');
  
  countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const distance = endTime - now;

    if (distance < 0) {
      clearInterval(countdownInterval);
      timerEl.innerText = "EXPIRED";
      document.getElementById('qrImage').style.opacity = '0.3';
      return;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    timerEl.innerText = `Expires in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, 1000);
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function loadSubjectAttendance() {
  const token = localStorage.getItem('token');
  const subjectId = document.getElementById('viewSubject').value;
  if(!subjectId) return;

  const res = await fetch(`/api/teacher/attendance/${subjectId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    const records = await res.json();
    const tbody = document.getElementById('teacherAttendanceTableBody');
    tbody.innerHTML = '';
    records.forEach(rec => {
      const tr = document.createElement('tr');
      const d = new Date(rec.date);
      tr.innerHTML = `
        <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
        <td>${rec.studentId ? rec.studentId.name : 'Unknown User'}</td>
        <td>${rec.studentId ? rec.studentId.rollNumber : '-'}</td>
        <td><span class="badge badge-success">Present</span></td>
        <td>${Math.round(rec.distanceFromTeacher)}m away</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'student') {
    window.location.href = '/index.html';
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  await loadStudentData();
});

async function loadStudentData() {
  const token = localStorage.getItem('token');

  try {
    // Get user details
    const userRes = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const user = await userRes.json();
    document.getElementById('userName').innerText = `${user.name} (${user.rollNumber})`;

    // Get attendance records
    const attendanceRes = await fetch('/api/student/attendance/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const attendanceRecords = await attendanceRes.json();

    // Map subjects
    const subjectsContainer = document.getElementById('subjectsContainer');
    subjectsContainer.innerHTML = '';
    
    // Group attendance by subject
    const subjectStats = {};
    
    user.subjects.forEach(sub => {
      subjectStats[sub._id] = {
        name: sub.subjectName,
        code: sub.subjectCode,
        teacher: sub.teacherId ? sub.teacherId.name : 'Unknown',
        present: 0,
        absent: 0
      };
    });

    // Populate data in Table and calculate stats
    const tbody = document.getElementById('recentActivityBody');
    tbody.innerHTML = '';
    
    attendanceRecords.forEach((rec, idx) => {
      // Calculate Stats
      if (rec.subjectId && subjectStats[rec.subjectId._id]) {
        if (rec.status === 'present') subjectStats[rec.subjectId._id].present++;
        else subjectStats[rec.subjectId._id].absent++;
      }

      // Latest 5 activity log
      if (idx < 5) {
        const tr = document.createElement('tr');
        const d = new Date(rec.date);
        tr.innerHTML = `
          <td>${d.toLocaleDateString()}</td>
          <td>${rec.subjectId ? rec.subjectId.subjectName : '-'}</td>
          <td><span class="badge ${rec.status === 'present' ? 'badge-success' : 'badge-danger'}">${rec.status}</span></td>
        `;
        tbody.appendChild(tr);
      }
    });

    // Render subjective cards
    user.subjects.forEach(sub => {
      const stats = subjectStats[sub._id];
      const total = stats.present + stats.absent;
      const percentage = total === 0 ? 0 : Math.round((stats.present / total) * 100);
      
      const isDeficient = total > 0 && percentage < 75;
      const color = isDeficient ? 'var(--danger)' : 'var(--success)';

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3 style="margin-bottom:0.25rem;">${stats.code}</h3>
            <p style="font-size:0.9rem;">${stats.name}</p>
          </div>
          <div style="text-align:right;">
            <p style="font-size:1.5rem; font-weight:bold; color:${color};">${percentage}%</p>
          </div>
        </div>
        <div style="margin-top:1.5rem;">
           <div style="display:flex; justify-content:space-between; font-size:0.8rem;" class="text-muted">
             <span>Classes: ${total}</span>
             <span>P: <span class="text-success">${stats.present}</span> / A: <span class="text-danger">${stats.absent}</span></span>
           </div>
           <div class="progress-bar-container">
             <div class="progress-bar" style="width:${percentage}%; background-color:${color};"></div>
           </div>
        </div>
      `;
      subjectsContainer.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading data', err);
  }
}

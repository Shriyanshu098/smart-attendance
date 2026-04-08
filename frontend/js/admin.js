document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    window.location.href = '/index.html';
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/index.html';
  });

  // Tab Switching
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

  // Initial load
  loadUsers();
  loadSubjects();
  loadAttendance();

  // Add User Form
  const roleSelect = document.getElementById('addUserRole');
  const rollGroup = document.getElementById('rollNumberGroup');
  
  roleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'student') {
      rollGroup.classList.remove('d-none');
    } else {
      rollGroup.classList.add('d-none');
    }
  });

  document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('addUserName').value;
    const email = document.getElementById('addUserEmail').value;
    const password = document.getElementById('addUserPassword').value;
    const role = document.getElementById('addUserRole').value;
    const rollNumber = document.getElementById('addUserRoll').value;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, email, password, role, rollNumber })
      });
      if (res.ok) {
        showToast('User created successfully', 'success');
        document.getElementById('userModal').classList.add('d-none');
        document.getElementById('addUserForm').reset();
        loadUsers();
      } else {
        const err = await res.json();
        showToast(err.message, 'error');
      }
    } catch(err) {
      showToast('Error creating user', 'error');
    }
  });

  // Manage Subject Form
  document.getElementById('manageSubjectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editSubjectId').value;
    const subjectCode = document.getElementById('subjectCode').value;
    const subjectName = document.getElementById('subjectName').value;
    const teacherId = document.getElementById('teacherSelect').value || null;
    const studentNodes = document.querySelectorAll('input[name="enrolledStudents"]:checked');
    const enrolledStudents = Array.from(studentNodes).map(node => node.value);
    
    try {
      const payload = { subjectCode, subjectName, teacherId, enrolledStudents };
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/subjects/${id}` : '/api/admin/subjects';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast('Subject saved successfully!', 'success');
        document.getElementById('subjectModal').classList.add('d-none');
        loadSubjects();
      } else {
        const err = await res.json();
        showToast(err.message, 'error');
      }
    } catch(err) {
      showToast('Failed to save subject', 'error');
    }
  });

  // Change Password Form
  document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('changePasswordUserId').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    
    try {
      showToast('Updating password...', 'info');
      const res = await fetch(`/api/admin/users/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Password updated successfully!', 'success');
        document.getElementById('passwordModal').classList.add('d-none');
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch(err) {
      console.error('Password update error:', err);
      showToast('Error updating password. Check console.', 'error');
    }
  });
});

async function loadUsers() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    const users = await res.json();
    globalUsers = users;
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.name} <br><small class="text-muted">${user.rollNumber || ''}</small></td>
        <td>${user.email}</td>
        <td><span class="badge ${getRoleBadge(user.role)}">${user.role}</span></td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="showChangePasswordModal('${user._id}')">Change Password</button>
          <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteUser('${user._id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

async function loadSubjects() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/subjects', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok) {
    const subjects = await res.json();
    const tbody = document.getElementById('subjectsTableBody');
    const filterSubject = document.getElementById('filterSubject');
    
    tbody.innerHTML = '';
    filterSubject.innerHTML = '<option value="">All Subjects</option>';

    subjects.forEach(sub => {
      // Add to filter
      const opt = document.createElement('option');
      opt.value = sub._id;
      opt.textContent = `${sub.subjectCode} - ${sub.subjectName}`;
      filterSubject.appendChild(opt);

      // Add to table
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${sub.subjectCode}</strong></td>
        <td>${sub.subjectName}</td>
        <td>${sub.teacherId ? sub.teacherId.name : '<em class="text-muted">Unassigned</em>'}</td>
        <td>${sub.enrolledStudents.length}</td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="editSubject('${sub._id}')">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

async function loadAttendance() {
  const token = localStorage.getItem('token');
  const subjectId = document.getElementById('filterSubject').value;
  const startDate = document.getElementById('filterStart').value;
  const endDate = document.getElementById('filterEnd').value;
  
  let url = '/api/admin/attendance/report?';
  if (subjectId) url += `subjectId=${subjectId}&`;
  if (startDate && endDate) url += `dateStart=${startDate}&dateEnd=${endDate}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    const records = await res.json();
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    records.forEach(rec => {
      const tr = document.createElement('tr');
      const d = new Date(rec.date);
      tr.innerHTML = `
        <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
        <td>${rec.studentId ? rec.studentId.name : 'Unknown User'}</td>
        <td>${rec.studentId ? rec.studentId.rollNumber : '-'}</td>
        <td>${rec.subjectId ? rec.subjectId.subjectCode : 'Unknown Subject'}</td>
        <td><span class="badge ${rec.status === 'present' ? 'badge-success' : 'badge-danger'}">${rec.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

async function deleteUser(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showToast('User deleted', 'success');
      loadUsers();
    } else {
      const err = await res.json();
      showToast(err.message || 'Delete failed', 'error');
    }
  } catch(err) {
    showToast('Network error during delete', 'error');
  }
}

let globalUsers = [];

function showChangePasswordModal(userId) {
  document.getElementById('changePasswordUserId').value = userId;
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('passwordModal').classList.remove('d-none');
}

// Removed previous separate listeners which are now in DOMContentLoaded block

function showUserModal() {
  document.getElementById('userModal').classList.remove('d-none');
}

function showSubjectModal() {
  document.getElementById('subjectModalTitle').innerText = 'Add New Subject';
  document.getElementById('manageSubjectForm').reset();
  document.getElementById('editSubjectId').value = '';
  document.getElementById('subjectCode').disabled = false;
  populateSubjectModalOptions();
  document.getElementById('subjectModal').classList.remove('d-none');
}

function populateSubjectModalOptions(selectedTeacher = '', selectedStudents = []) {
  const teacherSelect = document.getElementById('teacherSelect');
  const studentCheckboxes = document.getElementById('studentCheckboxes');
  
  teacherSelect.innerHTML = '<option value="">-- No Teacher Assigned --</option>';
  studentCheckboxes.innerHTML = '';
  
  globalUsers.forEach(user => {
    if (user.role === 'teacher') {
      const opt = document.createElement('option');
      opt.value = user._id;
      opt.textContent = `${user.name} (${user.email})`;
      if (selectedTeacher === user._id) opt.selected = true;
      teacherSelect.appendChild(opt);
    } else if (user.role === 'student') {
      const div = document.createElement('div');
      div.style.marginBottom = '0.5rem';
      
      const isChecked = selectedStudents.includes(user._id) ? 'checked' : '';
      div.innerHTML = `
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem; cursor:pointer;">
          <input type="checkbox" name="enrolledStudents" value="${user._id}" ${isChecked}>
          ${user.name} (${user.rollNumber || user.email})
        </label>
      `;
      studentCheckboxes.appendChild(div);
    }
  });
}

// Removed separate manageSubjectForm listener which is now in DOMContentLoaded block

async function editSubject(id) {
  // Find subject details from the UI via API to prefill
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/subjects', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (res.ok) {
    const subjects = await res.json();
    const subject = subjects.find(s => s._id === id);
    if (!subject) return;
    
    document.getElementById('subjectModalTitle').innerText = 'Edit Subject';
    document.getElementById('editSubjectId').value = subject._id;
    document.getElementById('subjectCode').value = subject.subjectCode;
    // Don't disable subjectCode entirely unless it breaks logic, let's allow it but UI makes it feel editable (though backend might throw if it's dup)
    
    document.getElementById('subjectName').value = subject.subjectName;
    
    const teacherId = subject.teacherId ? subject.teacherId._id : '';
    const studentIds = subject.enrolledStudents.map(s => typeof s === 'string' ? s : s._id);
    
    populateSubjectModalOptions(teacherId, studentIds);
    document.getElementById('subjectModal').classList.remove('d-none');
  }
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

function getRoleBadge(role) {
  switch(role) {
    case 'admin': return 'badge-primary';
    case 'teacher': return 'badge-warning';
    case 'student': return 'badge-success';
    default: return 'badge-secondary';
  }
}

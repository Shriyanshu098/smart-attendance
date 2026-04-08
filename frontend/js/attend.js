document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userToken = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  const loadingScreen = document.getElementById('loadingScreen');
  const errorScreen = document.getElementById('errorScreen');
  const formScreen = document.getElementById('formScreen');
  const successScreen = document.getElementById('successScreen');
  
  // Enforce Login for Students Attempting to Attend
  if (!userToken || userRole !== 'student') {
    // Save intended destination
    localStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = '/index.html';
    return;
  } else {
    localStorage.removeItem('redirect_after_login');
  }

  if (!token) {
    showError('Invalid Link', 'No session token found in the URL.');
    return;
  }

  // 1. Check if token is valid
  try {
    const res = await fetch(`/api/teacher/qr/status/${token}`);
    const data = await res.json();
    
    if (!res.ok) {
      showError('Session Invalid', data.message);
      return;
    }

    // 2. Token is valid, show form
    loadingScreen.classList.add('d-none');
    formScreen.classList.remove('d-none');
    
    document.getElementById('subjectNameDisplay').innerText = `${data.subject.subjectCode} - ${data.subject.subjectName}`;
    
    // Fetch and show user info
    const meRes = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${userToken}` }});
    const userData = await meRes.json();
    document.getElementById('userInfo').innerText = `${userData.name} (${userData.rollNumber})`;
    document.getElementById('timeInfo').innerText = new Date().toLocaleString();

  } catch (err) {
    showError('Connection Error', 'Could not verify the QR session.');
  }

  // Handle Location Check
  const btnLocation = document.getElementById('btnGetLocation');
  const btnSubmit = document.getElementById('btnSubmit');
  const locStatus = document.getElementById('locStatus');

  btnLocation.addEventListener('click', () => {
    locStatus.innerText = 'Locating...';
    btnLocation.disabled = true;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('lat').value = position.coords.latitude;
          document.getElementById('lng').value = position.coords.longitude;
          locStatus.innerText = 'Location Acquired ✅';
          locStatus.style.color = 'var(--success)';
          btnSubmit.disabled = false; // Enable submit here
          btnLocation.innerText = 'Location Locked';
        },
        (error) => {
          locStatus.innerText = 'Error getting location: ' + error.message;
          btnLocation.disabled = false;
        },
        { enableHighAccuracy: true }
      );
    } else {
      locStatus.innerText = "Geolocation is not supported by this browser.";
      btnLocation.disabled = false;
    }
  });

  // Handle Submit
  document.getElementById('attendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner"></span> Processing...';

    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;

    try {
      const res = await fetch('/api/student/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          token,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Success
        formScreen.classList.add('d-none');
        successScreen.classList.remove('d-none');
        document.getElementById('distValue').innerText = Math.round(data.distance);
      } else {
        showToast(data.message, 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Submit Attendance';
      }

    } catch (err) {
      showToast('Error marking attendance', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Submit Attendance';
    }
  });

  function showError(title, desc) {
    loadingScreen.classList.add('d-none');
    formScreen.classList.add('d-none');
    errorScreen.classList.remove('d-none');
    document.getElementById('errorTitle').innerText = title;
    document.getElementById('errorDesc').innerText = desc;
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
});

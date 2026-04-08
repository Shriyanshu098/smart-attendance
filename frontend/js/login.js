document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to respective dashboard
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role) {
    window.location.href = `/${role}-dashboard.html`;
  }

  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const loginBtn = document.getElementById('loginBtn');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('d-none');
    errorMsg.textContent = '';
    
    // UI Loading state
    const originalBtnHTML = loginBtn.innerHTML;
    loginBtn.innerHTML = `<span class="spinner"></span> Signing in...`;
    loginBtn.disabled = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Success
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      
      const redirectUrl = localStorage.getItem('redirect_after_login');
      if (redirectUrl) {
         localStorage.removeItem('redirect_after_login');
         window.location.href = redirectUrl;
      } else {
         // Redirect based on role
         window.location.href = `/${data.role}-dashboard.html`;
      }

    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('d-none');
    } finally {
      loginBtn.innerHTML = originalBtnHTML;
      loginBtn.disabled = false;
    }
  });
});

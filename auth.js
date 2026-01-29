// auth.js — shared between login/signup/verify

const USERS_KEY = 'elxora_users';

function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function setCurrentUser(user) { localStorage.setItem('elxora_current_user', JSON.stringify(user)); }

// Login handler (add to login.html)
document.getElementById('login-btn')?.addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;

  const users = getUsers();
  const user = users.find(u => u.email === email && u.pass === pass);

  if (!user) {
    document.getElementById('login-general-error').textContent = 'Wrong email or password';
    return;
  }

  setCurrentUser({ email: user.email, username: user.username });
  window.location.href = 'index.html';  // redirect to main app
});

// Signup handler (similar — save to users array, temp storage for verify, redirect to verify.html or handle)

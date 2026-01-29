// script.js ──────────────────────────────────────────────── ElXora Chat App (fixed auth + multi-user)

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL    = "gemini-1.5-flash";  // can be changed in settings later
const API_KEY_NAME    = "AIzaSyBDnsH0DDfrulYKruh1YOkY1cy-Liogt6o";
const USERS_KEY       = "elxora_users";

const SYSTEM_PROMPT = `You are a highly skilled, friendly senior developer who masters Luau (Roblox), Python, JavaScript/TypeScript, HTML, CSS.
You love using emojis 😄🚀 to make answers more engaging and fun when it feels natural.
Always write clean, modern, well-commented code.
When showing code:
- Wrap in triple backticks with correct language tag (```python, ```luau, ```js, ```html, ```css, ```ts etc.)
- Never send broken or incomplete code unless debugging
- After longer code (>10 lines) add a short explanation
- Use best practices, modern syntax, avoid deprecated features
Feel free to use emojis in your normal text responses to make them more lively and human 😊👍`;

const WELCOME_MESSAGE = `Hey Kevin 👋  
What can I help you with today? 🚀`;

// ─── DOM Elements ───────────────────────────────────────────
const 
  authContainer      = document.getElementById('auth-container'),
  appContainer       = document.getElementById('app-container'),
  loginForm          = document.getElementById('login-form'),
  signupForm         = document.getElementById('signup-form'),
  verifyForm         = document.getElementById('verification-form'),
  chatMessages       = document.getElementById('chat-messages'),
  messageInput       = document.getElementById('message-input'),
  sendBtn            = document.getElementById('send-btn'),
  attachBtn          = document.getElementById('attach-btn'),
  fileInput          = document.getElementById('file-input'),
  typingIndicator    = document.getElementById('typing-indicator'),
  chatTitle          = document.getElementById('chat-title'),
  settingsModal      = document.getElementById('settings-modal'),
  apiKeyInput        = document.getElementById('api-key'),
  saveApiKeyBtn      = document.getElementById('save-api-key'),
  closeSettingsBtn   = document.getElementById('close-settings'),
  toastEl            = document.getElementById('toast');

// ─── State ──────────────────────────────────────────────────
let currentUser = null;

// ─── Utilities ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3800);
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + "px";
}

function renderMessage(sender, content) {
  const div = document.createElement('div');
  div.className = `message ${sender}-message`;
  div.innerHTML = `<div class="message-content">${marked.parse(content)}</div>`;
  chatMessages.appendChild(div);
  scrollToBottom();

  // Code highlighting + copy button
  if (sender === 'ai') {
    setTimeout(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        if (!block.dataset.processed) {
          Prism.highlightElement(block);
          const pre = block.parentElement;
          const copyBtn = document.createElement('button');
          copyBtn.className = 'copy-btn';
          copyBtn.textContent = 'Copy';
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(block.textContent);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
          };
          pre.appendChild(copyBtn);
          block.dataset.processed = 'true';
        }
      });
    }, 100);
  }
}

// ─── Auth Storage Helpers ───────────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('elxora_current_user') || 'null');
}

function setCurrentUser(user) {
  localStorage.setItem('elxora_current_user', JSON.stringify(user));
  currentUser = user;
  document.getElementById('username-display').textContent = user.username;
  document.getElementById('email-display').textContent   = user.email;
  document.getElementById('avatar').textContent          = user.username.charAt(0).toUpperCase();
}

function clearCurrentUser() {
  localStorage.removeItem('elxora_current_user');
  currentUser = null;
}

// ─── Auth UI Helpers ────────────────────────────────────────
function showLogin()  { 
  loginForm.classList.remove('hidden');  
  signupForm.classList.add('hidden'); 
  verifyForm.classList.add('hidden'); 
}
function showSignup() { 
  signupForm.classList.remove('hidden'); 
  loginForm.classList.add('hidden');  
  verifyForm.classList.add('hidden'); 
}
function showVerify() { 
  verifyForm.classList.remove('hidden'); 
  loginForm.classList.add('hidden');  
  signupForm.classList.add('hidden'); 
}

function enterApp() {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');
  chatMessages.innerHTML = '';
  renderMessage('ai', WELCOME_MESSAGE);
  messageInput.focus();
}

// ─── SIGN UP ────────────────────────────────────────────────
document.getElementById('signup-btn').addEventListener('click', () => {
  const email    = document.getElementById('signup-email').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const pass     = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm-password').value;

  let error = false;
  document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
  document.querySelectorAll('input').forEach(inp => inp.classList.remove('error'));

  if (!email.includes('@') || !email.includes('.')) { 
    document.getElementById('signup-email-error').textContent = 'Valid email required'; 
    error = true; 
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { 
    document.getElementById('signup-username-error').textContent = '3-20 chars: letters, numbers, _'; 
    error = true; 
  }
  if (pass.length < 6) { 
    document.getElementById('signup-password-error').textContent = '≥ 6 characters'; 
    error = true; 
  }
  if (pass !== confirm) { 
    document.getElementById('signup-confirm-error').textContent = 'Passwords do not match'; 
    error = true; 
  }

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    document.getElementById('signup-general-error').textContent = 'Email already registered';
    error = true;
  }
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    document.getElementById('signup-general-error').textContent = 'Username taken';
    error = true;
  }

  if (error) return;

  localStorage.setItem('temp_signup', JSON.stringify({email, username, pass}));
  showVerify();
  showToast('Enter code: 123456 (prototype mode)', 'info');
});

// ─── VERIFY ─────────────────────────────────────────────────
document.getElementById('verify-btn').addEventListener('click', () => {
  const code = [...document.querySelectorAll('.verification-inputs input')].map(i => i.value.trim()).join('');
  if (code !== '123456') {
    document.getElementById('verify-error').textContent = 'Wrong code — try 123456';
    return;
  }

  const temp = JSON.parse(localStorage.getItem('temp_signup') || '{}');
  if (!temp.email) {
    showToast('Session expired — sign up again', 'error');
    showSignup();
    return;
  }

  const users = getUsers();
  users.push({ 
    email: temp.email, 
    username: temp.username, 
    pass: temp.pass   // plaintext – only for local prototype!
  });
  saveUsers(users);

  setCurrentUser({ email: temp.email, username: temp.username });
  localStorage.removeItem('temp_signup');

  showToast(`Account created! Welcome ${temp.username} 🎉`, 'success');
  enterApp();
});

// ─── LOGIN ──────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;

  document.querySelectorAll('.error-text').forEach(el => el.textContent = '');

  const users = getUsers();
  const user = users.find(u => u.email === email && u.pass === pass);

  if (!user) {
    document.getElementById('login-general-error').textContent = 'Wrong email or password';
    return;
  }

  setCurrentUser({ email: user.email, username: user.username });
  showToast(`Welcome back ${user.username}! 🚀`, 'success');
  enterApp();
});

// ─── Navigation Links ───────────────────────────────────────
document.getElementById('signup-link')?.addEventListener('click', e => { 
  e.preventDefault(); 
  showSignup(); 
});
document.getElementById('login-link')?.addEventListener('click', e => { 
  e.preventDefault(); 
  showLogin(); 
});

// ─── LOGOUT (add <button id="logout-btn">Log Out</button> in sidebar) ───
document.getElementById('logout-btn')?.addEventListener('click', () => {
  if (confirm('Log out?')) {
    clearCurrentUser();
    chatMessages.innerHTML = '';
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    showLogin();
    showToast('Logged out successfully', 'info');
  }
});

// ─── Gemini API Call ────────────────────────────────────────
async function callGemini(userMessage) {
  const apiKey = localStorage.getItem(API_KEY_NAME);
  if (!apiKey) {
    showToast('Please set your Gemini API key in Settings (gear icon) ⚙', 'error');
    return null;
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response received';
  } catch (err) {
    console.error(err);
    showToast('Gemini API error: ' + err.message, 'error');
    return null;
  }
}

// ─── Send Message ───────────────────────────────────────────
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  renderMessage('user', text);
  messageInput.value = '';
  autoGrow(messageInput);
  sendBtn.disabled = true;
  typingIndicator.classList.remove('hidden');
  scrollToBottom();

  const reply = await callGemini(text);

  typingIndicator.classList.add('hidden');
  if (reply) {
    renderMessage('ai', reply);
  } else {
    renderMessage('ai', "Sorry, something went wrong with the AI response 😕");
  }
}

messageInput.addEventListener('input', () => {
  autoGrow(messageInput);
  sendBtn.disabled = !messageInput.value.trim();
});

messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ─── Settings Modal ─────────────────────────────────────────
document.getElementById('settings-btn')?.addEventListener('click', () => {
  apiKeyInput.value = localStorage.getItem(API_KEY_NAME) || '';
  settingsModal.classList.remove('hidden');
});

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key.startsWith('AIzaSy') && key.length > 30) {
    localStorage.setItem(API_KEY_NAME, key);
    showToast('Gemini API key saved successfully!', 'success');
    settingsModal.classList.add('hidden');
  } else {
    showToast('Please enter a valid Gemini API key (starts with AIzaSy...)', 'error');
  }
});

closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

// ─── Init ───────────────────────────────────────────────────
window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  if (currentUser) {
    enterApp();
  } else {
    showLogin();
  }

  // Verification code auto-focus next field
  const verifyInputs = document.querySelectorAll('.verification-inputs input');
  verifyInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      if (input.value.length === 1 && index < 5) {
        verifyInputs[index + 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      if (/^\d{6}$/.test(pasted)) {
        pasted.split('').forEach((char, i) => {
          if (index + i < 6) verifyInputs[index + i].value = char;
        });
      }
    });
  });
});

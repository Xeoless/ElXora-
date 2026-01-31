// script.js ──────────────────────────────────────────────── ElXora Chat App (real OTP + no hardcoded key)

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL    = "gemini-2.0-flash"; // or gemini-2.0-flash-latest
const OTP_SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbxKdjN5rmMG_Diaw-AbLeG1G5Jn38BFc4o5y95MHNDGaJnAroY9PrHFMCjw2VaJ5bkp/exec";

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
document.getElementById('signup-btn').addEventListener('click', async () => {
  const email    = document.getElementById('signup-email').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const pass     = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm-password').value;

  let hasError = false;
  document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
  document.querySelectorAll('input').forEach(inp => inp.classList.remove('error'));

  if (!email.includes('@') || !email.includes('.')) { 
    document.getElementById('signup-email-error').textContent = 'Valid email required'; 
    hasError = true; 
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { 
    document.getElementById('signup-username-error').textContent = '3-20 chars: letters, numbers, _'; 
    hasError = true; 
  }
  if (pass.length < 6) { 
    document.getElementById('signup-password-error').textContent = '≥ 6 characters'; 
    hasError = true; 
  }
  if (pass !== confirm) { 
    document.getElementById('signup-confirm-error').textContent = 'Passwords do not match'; 
    hasError = true; 
  }

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    document.getElementById('signup-general-error').textContent = 'Email already registered';
    hasError = true;
  }
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    document.getElementById('signup-general-error').textContent = 'Username taken';
    hasError = true;
  }

  if (hasError) return;

  // Generate real OTP
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    console.log("Sending OTP to", email);
    await fetch(OTP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        code: generatedCode
      })
    });

    // Store temp data
    localStorage.setItem('temp_signup', JSON.stringify({
      email,
      username,
      pass,
      code: generatedCode,
      timestamp: Date.now()
    }));

    showVerify();
    showToast(`Code sent to ${email}! Check inbox/spam`, 'success');
  } catch (err) {
    console.error("OTP send failed:", err);
    showToast('Failed to send code – check console', 'error');
  }
});

// ─── VERIFY ─────────────────────────────────────────────────
document.getElementById('verify-btn').addEventListener('click', () => {
  const enteredCode = Array.from(document.querySelectorAll('.verification-inputs input'))
    .map(i => i.value.trim()).join('');

  const temp = JSON.parse(localStorage.getItem('temp_signup') || '{}');

  if (!temp.email || !temp.code) {
    showToast('Session expired — sign up again', 'error');
    showSignup();
    return;
  }

  if (Date.now() - temp.timestamp > 600000) { // 10 min
    showToast('Code expired — sign up again', 'error');
    localStorage.removeItem('temp_signup');
    showSignup();
    return;
  }

  if (enteredCode !== temp.code) {
    document.getElementById('verify-error').textContent = 'Incorrect code';
    return;
  }

  // Success
  const users = getUsers();
  users.push({ 
    email: temp.email, 
    username: temp.username, 
    pass: temp.pass 
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

// ─── LOGOUT ─────────────────────────────────────────────────
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
  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
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

// ─── Init ───────────────────────────────────────────────────
window.addEventListener('load', () => {
  currentUser = getCurrentUser();
  if (currentUser) {
    enterApp();
  } else {
    showLogin();
  }

  // Verification code auto-focus + paste support
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

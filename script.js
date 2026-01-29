// script.js ──────────────────────────────────────────────── ElXora Chat App

const APP_NAME = "ElXora";
const DB_NAME = "elxoraDB";
const DB_VERSION = 1;
const USER_KEY = "elxora_user";
const API_KEY_STORAGE = "AIzaSyBDnsH0DDfrulYKruh1YOkY1cy-Liogt6o";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-1.5-flash";

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

// ──────────────────────────────────────────────── DOM Elements
const 
  authContainer      = document.getElementById('auth-container'),
  loginForm          = document.getElementById('login-form'),
  signupForm         = document.getElementById('signup-form'),
  verifyForm         = document.getElementById('verification-form'),
  appContainer       = document.getElementById('app-container'),
  chatMessages       = document.getElementById('chat-messages'),
  messageInput       = document.getElementById('message-input'),
  sendBtn            = document.getElementById('send-btn'),
  attachBtn          = document.getElementById('attach-btn'),
  fileInput          = document.getElementById('file-input'),
  typingIndicator    = document.getElementById('typing-indicator'),
  chatListEl         = document.getElementById('chat-list'),
  chatTitleEl        = document.getElementById('chat-title'),
  newChatBtn         = document.getElementById('new-chat-btn'),
  settingsBtn        = document.getElementById('settings-btn'),
  settingsModal      = document.getElementById('settings-modal'),
  apiKeyInput        = document.getElementById('api-key'),
  saveApiKeyBtn      = document.getElementById('save-api-key'),
  closeSettingsBtn   = document.getElementById('close-settings'),
  toastEl            = document.getElementById('toast'),
  sidebar            = document.getElementById('sidebar'),
  mobileToggle       = document.getElementById('mobile-sidebar-toggle'),
  sidebarToggle      = document.getElementById('sidebar-toggle');

// ──────────────────────────────────────────────── State
let db = null;
let currentUser = null;
let currentChatId = null;
let chats = [];

// ──────────────────────────────────────────────── IndexedDB Setup
function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function loadChats() {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chats', 'readonly');
    const store = tx.objectStore('chats');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveChat(chat) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    const req = store.put(chat);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteChat(id) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    const req = store.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

// ──────────────────────────────────────────────── Utilities
function showToast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 4000);
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function renderMarkdown(text) {
  return marked.parse(text, { breaks: true, gfm: true });
}

function renderMessage(sender, content) {
  const div = document.createElement('div');
  div.className = `message ${sender}-message fade-in`;

  let html = `<div class="message-content">${renderMarkdown(content)}</div>`;

  if (sender === 'ai') {
    // Add copy buttons to code blocks
    setTimeout(() => {
      document.querySelectorAll('pre code').forEach(block => {
        if (!block.dataset.highlighted) {
          Prism.highlightElement(block);
          const pre = block.parentElement;
          const btn = document.createElement('button');
          btn.className = 'copy-btn';
          btn.textContent = 'Copy';
          btn.onclick = () => {
            navigator.clipboard.writeText(block.textContent);
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
          };
          pre.appendChild(btn);
          block.dataset.highlighted = 'true';
        }
      });
    }, 100);
  }

  div.innerHTML = html;
  chatMessages.appendChild(div);
  scrollToBottom();
}

// ──────────────────────────────────────────────── Auth
function getCurrentUser() {
  return JSON.parse(localStorage.getItem(USER_KEY));
}

function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function showLogin() {
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

// Simulated signup → store temp user → verify
document.getElementById('signup-btn').addEventListener('click', () => {
  const email = document.getElementById('signup-email').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const pass = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm-password').value;

  if (!email || !username || !pass) return showToast("Fill all fields", "error");
  if (pass !== confirm) return showToast("Passwords don't match", "error");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return showToast("Invalid username", "error");

  // Simulate sending code
  localStorage.setItem('temp_signup', JSON.stringify({email, username, pass}));
  showVerify();
  showToast("Use code: 123456", "info");
});

document.getElementById('verify-btn').addEventListener('click', () => {
  const inputs = [...verifyForm.querySelectorAll('input')];
  const code = inputs.map(i => i.value).join('');

  if (code !== '123456') return showToast("Wrong code", "error");

  const temp = JSON.parse(localStorage.getItem('temp_signup') || '{}');
  if (!temp.email) return showToast("Session expired", "error");

  const user = { email: temp.email, username: temp.username };
  setCurrentUser(user);
  localStorage.removeItem('temp_signup');

  showToast("Welcome to ElXora! 🎉", "success");
  enterApp();
});

document.getElementById('login-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;

  const user = getCurrentUser();
  if (user && user.email === email) {
    setCurrentUser(user);
    enterApp();
  } else {
    showToast("Invalid credentials (prototype: use signup first)", "error");
  }
});

document.getElementById('signup-link').addEventListener('click', e => { e.preventDefault(); showSignup(); });
document.getElementById('login-link').addEventListener('click', e => { e.preventDefault(); showLogin(); });

// ──────────────────────────────────────────────── Gemini API
async function callGemini(prompt, history = []) {
  const key = localStorage.getItem(API_KEY_STORAGE);
  if (!key) {
    showToast("No API key. Set it in Settings ⚙", "error");
    return null;
  }

  const contents = history.map(m => ({ role: m.role, parts: [{text: m.content}] }));
  contents.push({ role: "user", parts: [{text: prompt}] });

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{text: SYSTEM_PROMPT}] },
          generationConfig: { temperature: 0.75, maxOutputTokens: 2048 }
        })
      }
    );

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No response";
  } catch (err) {
    console.error(err);
    showToast("Gemini error: " + err.message.slice(0, 80), "error");
    return null;
  }
}

// ──────────────────────────────────────────────── Chat Logic
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  renderMessage('user', text);
  messageInput.value = '';
  autoGrow(messageInput);
  sendBtn.disabled = true;

  typingIndicator.classList.remove('hidden');
  scrollToBottom();

  const reply = await callGemini(text, []); // todo: pass real history later

  typingIndicator.classList.add('hidden');

  if (reply) {
    renderMessage('ai', reply);
    scrollToBottom();
  }
}

function startNewChat() {
  currentChatId = null;
  chatMessages.innerHTML = '';
  renderMessage('ai', WELCOME_MESSAGE);
  chatTitleEl.textContent = "New Chat";
  messageInput.focus();
}

newChatBtn.addEventListener('click', startNewChat);

// ──────────────────────────────────────────────── Input handlers
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

attachBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) showToast(`Attached: ${f.name} (not sent yet)`, "info");
});

// ──────────────────────────────────────────────── Settings
settingsBtn.addEventListener('click', () => {
  apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE) || '';
  settingsModal.classList.remove('hidden');
});

saveApiKeyBtn.addEventListener('click', () => {
  const k = apiKeyInput.value.trim();
  if (k) {
    localStorage.setItem(API_KEY_STORAGE, k);
    showToast("API key saved ✓", "success");
    settingsModal.classList.add('hidden');
  } else {
    showToast("Enter a key", "error");
  }
});

closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

// Mobile sidebar
mobileToggle.addEventListener('click', () => sidebar.classList.add('open'));
sidebarToggle.addEventListener('click', () => sidebar.classList.remove('open'));

// ──────────────────────────────────────────────── Init
async function enterApp() {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');

  document.getElementById('username-display').textContent = currentUser.username;
  document.getElementById('email-display').textContent = currentUser.email;
  document.getElementById('avatar').textContent = currentUser.username[0].toUpperCase();

  startNewChat();
}

async function init() {
  currentUser = getCurrentUser();
  if (currentUser) {
    enterApp();
  } else {
    showLogin();
  }

  // Auto-focus verification inputs
  const verifyInputs = verifyForm.querySelectorAll('input');
  verifyInputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      if (input.value && i < 5) verifyInputs[i+1].focus();
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      if (/^\d{6}$/.test(paste)) {
        paste.split('').forEach((d, j) => { if (verifyInputs[j]) verifyInputs[j].value = d; });
        document.getElementById('verify-btn').focus();
      }
    });
  });
}

window.addEventListener('load', init);

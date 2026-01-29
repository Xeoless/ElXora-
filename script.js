// script.js — ElXora AI Chat (all JavaScript in one file)

// ────────────────────────────────────────────────
// 1. Constants & Config
// ────────────────────────────────────────────────
const APP_NAME = "ElXora";
const DB_NAME = "elxora_db";
const DB_VERSION = 1;
const STORE_NAME = "chats";
const USER_KEY = "elxora_user";

const WELCOME_MESSAGE = `
Hey Kevin 👋  
What can I help you with today? 🚀
`;

const GEMINI_SYSTEM_PROMPT = `You are a highly skilled, friendly senior developer who masters Luau (Roblox), Python, JavaScript/TypeScript, HTML, CSS.
You love using emojis 😄🚀 to make answers more engaging and fun when it feels natural.
Always write clean, modern, well-commented code.
... (paste the full prompt you were given)`;

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// ────────────────────────────────────────────────
// 2. IndexedDB Helpers
// ────────────────────────────────────────────────
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        // onupgradeneeded, onsuccess, onerror...
        // (implement table creation for chats: id, title, messages[], updatedAt, etc.)
    });
}

// More DB functions: getAllChats, saveChat, deleteChat, etc.

// ────────────────────────────────────────────────
// 3. User / Auth Logic
// ────────────────────────────────────────────────
function getCurrentUser() {
    return JSON.parse(localStorage.getItem(USER_KEY));
}

function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// login, signup, verify simulation, logout, etc.

// ────────────────────────────────────────────────
// 4. DOM Elements
// ────────────────────────────────────────────────
const 
    authContainer     = document.getElementById('auth-container'),
    appContainer      = document.getElementById('app-container'),
    messageInput      = document.getElementById('message-input'),
    sendBtn           = document.getElementById('send-btn'),
    attachBtn         = document.getElementById('attach-btn'),
    fileInput         = document.getElementById('file-input'),
    chatMessages      = document.getElementById('chat-messages'),
    typingIndicator   = document.getElementById('typing-indicator'),
    chatList          = document.getElementById('chat-list'),
    chatTitle         = document.getElementById('chat-title'),
    // ... add all other elements you use

// ────────────────────────────────────────────────
// 5. Utility Functions
// ────────────────────────────────────────────────
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function autoGrow(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

function showToast(message, type = 'info') {
    // implement toast (success/error/info)
}

function renderMessage(sender, content, isCode = false) {
    // create div.message.user-message or .ai-message
    // use marked.parse for AI messages
    // Prism.highlightElement for code blocks
    // add copy button logic
}

// ────────────────────────────────────────────────
// 6. Event Listeners
// ────────────────────────────────────────────────
messageInput.addEventListener('input', () => {
    autoGrow(messageInput);
    sendBtn.disabled = !messageInput.value.trim();
});

messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim()) sendMessage();
    }
});

sendBtn.addEventListener('click', () => {
    if (messageInput.value.trim()) sendMessage();
});

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        console.log('Attached:', file.name);
        showToast(`Attached: ${file.name}`, 'success');
        // → later: handle image/PDF upload to Gemini
    }
});

// New chat, sidebar toggle, settings modal, rename/delete, etc.

// ────────────────────────────────────────────────
// 7. Core Chat Logic
// ────────────────────────────────────────────────
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Add user message to UI
    renderMessage('user', text);
    messageInput.value = '';
    autoGrow(messageInput);
    sendBtn.disabled = true;
    scrollToBottom();

    // Show typing
    typingIndicator.classList.remove('hidden');

    try {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) throw new Error("No API key set");

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text }] }
                ],
                systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] }
            })
        });

        const data = await response.json();
        // extract AI text from data.candidates[0].content.parts[0].text

        typingIndicator.classList.add('hidden');
        renderMessage('ai', aiText);
        scrollToBottom();

        // Save chat to IndexedDB
        // Auto-title if first message, etc.

    } catch (err) {
        showToast("Error: " + err.message, 'error');
        typingIndicator.classList.add('hidden');
    }
}

// ────────────────────────────────────────────────
// 8. Initialization
// ────────────────────────────────────────────────
async function init() {
    const user = getCurrentUser();
    if (!user) {
        authContainer.classList.remove('hidden');
        // show login form by default
    } else {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        // load chats, show last chat or new chat, render welcome if empty
        document.getElementById('username-display').textContent = user.username;
        // etc.
    }
}

window.addEventListener('load', init);

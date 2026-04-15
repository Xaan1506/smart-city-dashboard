// ==========================================
//  Chatbot Module — AI Assistant
// ==========================================

// Read API key from Vite env variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';

// DOM references
let chatWindow, chatFab, chatClose, chatMessages, chatInput, chatSend;

// ===== BUILD LIVE CONTEXT =====
function buildLiveContext() {
  const wd = window.weatherData;
  const cd = window.currencyData;
  const cz = window.citizenData;
  const fd = window.factData;

  const liveContext = `
You are a smart city assistant.
Answer directly and briefly using only the dashboard data.
Do not add extra details, explanations, or suggestions.
If the question is unrelated, say: "I only have access to the dashboard data."

WEATHER:
Temperature: ${wd ? wd.temperature + '°C' : 'Not loaded'}
Wind Speed: ${wd ? wd.windspeed + ' km/h' : 'Not loaded'}
Weather Code: ${wd ? wd.weathercode : 'Not loaded'}

CURRENCY:
1 USD = ${cd ? cd.USD : 'N/A'} INR
1 EUR = ${cd ? cd.EUR : 'N/A'} INR
1 GBP = ${cd ? cd.GBP : 'N/A'} INR

CITIZEN:
Name: ${cz ? cz.name : 'Not loaded'}
City: ${cz ? cz.city : 'Not loaded'}
Email: ${cz ? cz.email : 'Not loaded'}

FACT:
${fd ? fd.text : 'Not loaded'}
`;

  return liveContext;
}

function containsAny(text, keywords) {
  const normalized = text.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isGreeting(text) {
  const normalized = text.trim().toLowerCase();
  return /\b(hi+|hello|hey|hiya|hey there|hello there|good morning|good afternoon|good evening)\b/.test(normalized);
}

// ===== SEND TO LLM (OpenRouter or Hugging Face) =====
async function sendToLLM(userQuestion) {
  const liveContext = buildLiveContext();

  if (isGreeting(userQuestion)) {
    const name = window.citizenData && window.citizenData.name ? window.citizenData.name : null;
    const hello = name ? `Hello ${name}.` : 'Hello.';
    return `${hello} Ask about weather, currency, citizen profile, or fact.`;
  }

  const localAnswer = generateLocalResponse(userQuestion);
  if (localAnswer !== "🤔 I only have access to the dashboard data. Try asking about the **weather**, **currency**, **citizen profile**, or **city fact**!") {
    return localAnswer;
  }

  const messages = [
    { role: 'system', content: liveContext },
    { role: 'user', content: userQuestion },
  ];

  // Prefer Hugging Face if the token is available
  if (HF_TOKEN) {
    return await callHuggingFace(messages);
  }

  // Fallback to OpenRouter if no Hugging Face token
  if (OPENROUTER_API_KEY) {
    return await callOpenRouter(messages);
  }

  // No API key — use local fallback answer
  return localAnswer;
}

// ===== OPENROUTER API CALL =====
async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Smart City Dashboard',
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ===== HUGGING FACE API CALL =====
async function callHuggingFace(messages) {
  const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b:fastest',
      messages: messages,
      max_tokens: 300,
      temperature: 0.0,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.detail || `HuggingFace API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ===== LOCAL FALLBACK (No API Key) =====
function generateLocalResponse(question) {
  const q = question.toLowerCase();
  const wd = window.weatherData;
  const cd = window.currencyData;
  const cz = window.citizenData;
  const fd = window.factData;

  const weatherKeywords = ['weather', 'temperature', 'temp', 'hot', 'cold', 'wind', 'rain', 'sunny', 'cloud'];
  const currencyKeywords = ['currency', 'rate', 'exchange', 'usd', 'eur', 'gbp', 'inr', 'dollar', 'euro', 'pound', 'rupee', 'money'];
  const citizenKeywords = ['citizen', 'profile', 'person', 'name', 'email', 'user'];
  const factKeywords = ['fact', 'trivia', 'random', 'interesting', 'did you know', 'fun'];
  const helpKeywords = ['help', 'what can you do', 'what do you know'];
  const dashboardKeywords = ['dashboard', 'data', 'info', 'summary', 'all', 'everything', 'overview'];

  const hasWeather = containsAny(q, weatherKeywords);
  const hasCurrency = containsAny(q, currencyKeywords);
  const hasCitizen = containsAny(q, citizenKeywords);
  const hasFact = containsAny(q, factKeywords);
  const hasHelp = containsAny(q, helpKeywords);
  const hasDashboard = containsAny(q, dashboardKeywords);

  const extractCurrency = (text) => {
    if (/\b(eur|euro)\b/.test(text)) return 'EUR';
    if (/\b(gbp|pound|pounds)\b/.test(text)) return 'GBP';
    if (/\b(usd|dollar|dollars)\b/.test(text)) return 'USD';
    if (/\b(inr|rupee|rupees)\b/.test(text)) return 'INR';
    return null;
  };

  const formatCurrency = (code) => {
    if (!cd) return "Currency data hasn't loaded yet.";
    if (code === 'USD') return `1 USD = ₹${cd.USD}.`;
    if (code === 'EUR') return `1 EUR = ₹${cd.EUR}.`;
    if (code === 'GBP') return `1 GBP = ₹${cd.GBP}.`;
    if (code === 'INR') return `1 USD = ₹${cd.USD}. 1 EUR = ₹${cd.EUR}. 1 GBP = ₹${cd.GBP}.`;
    return `1 USD = ₹${cd.USD}. 1 EUR = ₹${cd.EUR}. 1 GBP = ₹${cd.GBP}.`;
  };

  if (hasWeather) {
    if (!wd) return "Weather data hasn't loaded yet.";
    return `Temperature: ${wd.temperature}°C. Wind: ${wd.windspeed} km/h. Weather code: ${wd.weathercode}.`;
  }

  if (hasCurrency) {
    const requested = extractCurrency(q);
    if (!cd) return "Currency data hasn't loaded yet.";
    if (requested && requested !== 'INR') {
      return formatCurrency(requested);
    }
    return formatCurrency('INR');
  }

  if (hasCitizen) {
    if (!cz) return "Citizen data hasn't loaded yet.";
    return `Name: ${cz.name}. City: ${cz.city}. Email: ${cz.email}.`;
  }

  if (hasFact) {
    if (!fd) return "Fact data hasn't loaded yet.";
    return `Fact: ${fd.text}`;
  }

  if (hasHelp) {
    return "I can answer questions about weather, currency, citizen profile, and the city fact of the day.";
  }

  if (hasDashboard) {
    let summary = '';
    if (wd) summary += `Weather: ${wd.temperature}°C, Wind: ${wd.windspeed} km/h. `;
    if (cd) summary += `1 USD = ₹${cd.USD}. 1 EUR = ₹${cd.EUR}. 1 GBP = ₹${cd.GBP}. `;
    if (cz) summary += `Citizen: ${cz.name} from ${cz.city}. `;
    if (fd) summary += `Fact: ${fd.text}`;
    return summary || "Data is still loading.";
  }

  if (isGreeting(question)) {
    const name = cz && cz.name ? cz.name : null;
    const hello = name ? `Hello ${name}.` : 'Hello.';
    return `${hello} Ask about weather, currency, citizen profile, or fact.`;
  }

  return "🤔 I only have access to the dashboard data. Try asking about the **weather**, **currency**, **citizen profile**, or **city fact**!";
}

// ===== FORMAT BOT RESPONSE =====
function formatBotMessage(text) {
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert newlines to <br>
  text = text.replace(/\n/g, '<br>');
  return text;
}

// ===== ADD MESSAGE TO CHAT =====
function addMessage(text, isUser = false) {
  const div = document.createElement('div');
  div.className = `chat-msg ${isUser ? 'user-msg' : 'bot-msg'}`;
  div.innerHTML = `<div class="msg-bubble">${isUser ? text : formatBotMessage(text)}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== SHOW TYPING INDICATOR =====
function showTyping() {
  const div = document.createElement('div');
  div.className = 'chat-msg bot-msg';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ===== HANDLE SEND =====
async function handleSend() {
  const message = chatInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  chatInput.value = '';
  chatSend.disabled = true;

  showTyping();

  try {
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 600));
    const response = await sendToLLM(message);
    removeTyping();
    addMessage(response);
  } catch (err) {
    removeTyping();
    addMessage(`⚠️ Error: ${err.message}. Using local mode instead.`);
    const fallback = generateLocalResponse(message);
    addMessage(fallback);
  }

  chatSend.disabled = false;
  chatInput.focus();
}

// ===== TOGGLE CHAT WINDOW =====
function openChat() {
  chatWindow.classList.add('open');
  chatFab.classList.add('hidden');
  chatInput.focus();
}

function closeChat() {
  chatWindow.classList.remove('open');
  chatFab.classList.remove('hidden');
}

// ===== INIT CHATBOT =====
export function initChatbot() {
  chatWindow = document.getElementById('chatbot-window');
  chatFab = document.getElementById('chatbot-fab');
  chatClose = document.getElementById('chat-close');
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  chatSend = document.getElementById('chat-send');

  // Open / Close
  chatFab.addEventListener('click', openChat);
  chatClose.addEventListener('click', closeChat);

  // Send on button click
  chatSend.addEventListener('click', handleSend);

  // Send on Enter
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatWindow.classList.contains('open')) {
      closeChat();
    }
  });
}

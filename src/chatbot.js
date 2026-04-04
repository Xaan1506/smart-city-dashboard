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
You are a helpful Smart City assistant.

Answer ONLY using the data below.

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

If the question is unrelated, say:
"I only have access to the dashboard data."
`;

  return liveContext;
}

// ===== SEND TO LLM (OpenRouter or Hugging Face) =====
async function sendToLLM(userQuestion) {
  const liveContext = buildLiveContext();

  const messages = [
    { role: 'system', content: liveContext },
    { role: 'user', content: userQuestion },
  ];

  // Try OpenRouter first
  if (OPENROUTER_API_KEY) {
    return await callOpenRouter(messages);
  }

  // Fallback to Hugging Face
  if (HF_TOKEN) {
    return await callHuggingFace(messages);
  }

  // No API key — use smart local fallback
  return generateLocalResponse(userQuestion);
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
  const res = await fetch('https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HuggingFace API error: ${res.status}`);
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

  // Weather queries
  if (q.includes('weather') || q.includes('temperature') || q.includes('temp') || q.includes('hot') || q.includes('cold') || q.includes('wind')) {
    if (!wd) return "Weather data hasn't loaded yet. Please wait or refresh the weather card.";
    let response = `🌡️ The current temperature is **${wd.temperature}°C** with wind speeds of **${wd.windspeed} km/h** (weather code: ${wd.weathercode}).`;
    if (wd.temperature > 35) response += ' It\'s quite hot outside!';
    else if (wd.temperature > 25) response += ' It\'s warm and pleasant.';
    else if (wd.temperature > 15) response += ' The weather is mild and comfortable.';
    else response += ' It\'s quite cool outside, consider wearing a jacket.';
    return response;
  }

  // Currency queries
  if (q.includes('currency') || q.includes('rate') || q.includes('exchange') || q.includes('usd') || q.includes('eur') || q.includes('gbp') || q.includes('inr') || q.includes('dollar') || q.includes('euro') || q.includes('pound') || q.includes('rupee') || q.includes('money')) {
    if (!cd) return "Currency data hasn't loaded yet. Please wait or refresh the currency card.";
    return `💱 Current exchange rates:\n• 1 USD = **₹${cd.USD}** 🇺🇸\n• 1 EUR = **₹${cd.EUR}** 🇪🇺\n• 1 GBP = **₹${cd.GBP}** 🇬🇧`;
  }

  // Citizen queries
  if (q.includes('citizen') || q.includes('profile') || q.includes('person') || q.includes('name') || q.includes('who') || q.includes('email') || q.includes('user')) {
    if (!cz) return "Citizen data hasn't loaded yet. Please wait or refresh the citizen card.";
    return `👤 Current citizen profile:\n• **Name:** ${cz.name}\n• **City:** ${cz.city}\n• **Email:** ${cz.email}`;
  }

  // Fact queries
  if (q.includes('fact') || q.includes('trivia') || q.includes('random') || q.includes('interesting') || q.includes('did you know') || q.includes('fun')) {
    if (!fd) return "Fact data hasn't loaded yet. Please wait or refresh the fact card.";
    return `📜 Here's today's fact:\n\n"${fd.text}"`;
  }

  // General dashboard queries
  if (q.includes('dashboard') || q.includes('data') || q.includes('info') || q.includes('summary') || q.includes('all') || q.includes('everything') || q.includes('overview')) {
    let summary = '📊 **Dashboard Summary:**\n\n';
    if (wd) summary += `🌡️ Weather: ${wd.temperature}°C, Wind: ${wd.windspeed} km/h\n`;
    if (cd) summary += `💱 1 USD = ₹${cd.USD} | 1 EUR = ₹${cd.EUR} | 1 GBP = ₹${cd.GBP}\n`;
    if (cz) summary += `👤 Citizen: ${cz.name} from ${cz.city}\n`;
    if (fd) summary += `📜 Fact: "${fd.text.substring(0, 80)}..."`;
    return summary || "Data is still loading. Please wait a moment.";
  }

  // Greeting
  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('sup') || q.includes('good')) {
    return "👋 Hello! I'm your Smart City assistant. Ask me about the **weather**, **currency rates**, **citizen profile**, or today's **fun fact**!";
  }

  // Help
  if (q.includes('help') || q.includes('what can you do') || q.includes('what do you know')) {
    return "🤖 I can answer questions about the live dashboard data:\n\n• 🌡️ **Weather** — temperature, wind, conditions\n• 💱 **Currency** — INR exchange rates\n• 👤 **Citizen** — current profile info\n• 📜 **Facts** — city fact of the day\n\nJust ask away!";
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
    console.error(`LLM Error: ${err.message}. Smoothly falling back to local mode.`);
    // Fallback to local
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

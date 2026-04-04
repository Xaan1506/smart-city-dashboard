// ==========================================
//  Smart City Citizen Dashboard — Main JS
// ==========================================
import './style.css';
import { initChatbot } from './chatbot.js';

// ===== GLOBAL DATA VARIABLES =====
window.weatherData = null;
window.currencyData = null;
window.citizenData = null;
window.factData = null;

// ===== WEATHER CODE MAPPING =====
const weatherDescriptions = {
  0: { text: 'Clear Sky', emoji: '☀️' },
  1: { text: 'Mainly Clear', emoji: '🌤️' },
  2: { text: 'Partly Cloudy', emoji: '⛅' },
  3: { text: 'Overcast', emoji: '☁️' },
  45: { text: 'Foggy', emoji: '🌫️' },
  48: { text: 'Rime Fog', emoji: '🌫️' },
  51: { text: 'Light Drizzle', emoji: '🌦️' },
  53: { text: 'Moderate Drizzle', emoji: '🌦️' },
  55: { text: 'Dense Drizzle', emoji: '🌧️' },
  61: { text: 'Slight Rain', emoji: '🌧️' },
  63: { text: 'Moderate Rain', emoji: '🌧️' },
  65: { text: 'Heavy Rain', emoji: '🌧️' },
  71: { text: 'Slight Snow', emoji: '🌨️' },
  73: { text: 'Moderate Snow', emoji: '❄️' },
  75: { text: 'Heavy Snow', emoji: '❄️' },
  80: { text: 'Rain Showers', emoji: '🌦️' },
  81: { text: 'Moderate Showers', emoji: '🌧️' },
  82: { text: 'Violent Showers', emoji: '⛈️' },
  95: { text: 'Thunderstorm', emoji: '⛈️' },
  96: { text: 'Thunderstorm + Hail', emoji: '⛈️' },
  99: { text: 'Severe Thunderstorm', emoji: '⛈️' },
};

function getWeatherInfo(code) {
  return weatherDescriptions[code] || { text: `Code ${code}`, emoji: '🌡️' };
}

// ===== DOM REFERENCES =====
const weatherBody = document.getElementById('weather-body');
const currencyBody = document.getElementById('currency-body');
const citizenBody = document.getElementById('citizen-body');
const factBody = document.getElementById('fact-body');

const refreshWeatherBtn = document.getElementById('refresh-weather');
const refreshCurrencyBtn = document.getElementById('refresh-currency');
const refreshCitizenBtn = document.getElementById('refresh-citizen');
const refreshFactBtn = document.getElementById('refresh-fact');

// ===== UTILITY: LOADING HTML =====
function showLoading(container, message = 'Loading…') {
  container.innerHTML = `
    <div class="card-loading">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

// ===== UTILITY: ERROR HTML =====
function showError(container, message = 'Failed to load data') {
  container.innerHTML = `
    <div class="card-error">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>${message}</span>
    </div>
  `;
}

// ===== FETCH: WEATHER =====
async function fetchWeather() {
  showLoading(weatherBody, 'Fetching weather…');
  spinButton(refreshWeatherBtn);

  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=18.52&longitude=73.86&current_weather=true');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cw = data.current_weather;

    window.weatherData = {
      temperature: cw.temperature,
      windspeed: cw.windspeed,
      weathercode: cw.weathercode,
    };

    const info = getWeatherInfo(cw.weathercode);

    const weatherCard = document.getElementById('card-weather');
    weatherCard.classList.remove('theme-sunny', 'theme-cloudy', 'theme-rainy');
    if ([0, 1].includes(cw.weathercode)) {
      weatherCard.classList.add('theme-sunny');
    } else if ([2, 3, 45, 48].includes(cw.weathercode)) {
      weatherCard.classList.add('theme-cloudy');
    } else {
      weatherCard.classList.add('theme-rainy');
    }

    weatherBody.innerHTML = `
      <div class="weather-display">
        <div class="weather-temp-group">
          <div class="weather-emoji">${info.emoji}</div>
          <div class="weather-temp">${cw.temperature}<span>°C</span></div>
          <div class="weather-condition">${info.text}</div>
        </div>
        <div class="weather-details">
          <div class="weather-detail-item">
            <span class="detail-label">Wind Speed</span>
            <span class="detail-value">${cw.windspeed} km/h</span>
          </div>
          <div class="weather-detail-item">
            <span class="detail-label">Code</span>
            <span class="detail-value">${cw.weathercode}</span>
          </div>
          <div class="weather-detail-item">
            <span class="detail-label">Location</span>
            <span class="detail-value">Pune, IN</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    showError(weatherBody, `Weather: ${err.message}`);
  } finally {
    stopButton(refreshWeatherBtn);
  }
}

// ===== FETCH: CURRENCY =====
async function fetchCurrency() {
  showLoading(currencyBody, 'Fetching rates…');
  spinButton(refreshCurrencyBtn);

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = data.rates;

    // Calculate how many INR a foreign currency is worth
    const usdToInr = (rates.INR).toFixed(2);
    const eurToInr = (rates.INR / rates.EUR).toFixed(2);
    const gbpToInr = (rates.INR / rates.GBP).toFixed(2);

    window.currencyData = {
      USD: usdToInr,
      EUR: eurToInr,
      GBP: gbpToInr,
    };

    currencyBody.innerHTML = `
      <div class="currency-display">
        <div class="currency-row">
          <div class="currency-pair">
            <span class="currency-flag">🇺🇸</span>
            <span class="currency-label">1 USD → INR</span>
          </div>
          <span class="currency-value">₹${usdToInr}</span>
        </div>
        <div class="currency-row">
          <div class="currency-pair">
            <span class="currency-flag">🇪🇺</span>
            <span class="currency-label">1 EUR → INR</span>
          </div>
          <span class="currency-value">₹${eurToInr}</span>
        </div>
        <div class="currency-row">
          <div class="currency-pair">
            <span class="currency-flag">🇬🇧</span>
            <span class="currency-label">1 GBP → INR</span>
          </div>
          <span class="currency-value">₹${gbpToInr}</span>
        </div>
        <div class="currency-base-note">Showing value in Indian Rupees • Source: open.er-api.com</div>
      </div>
    `;
  } catch (err) {
    showError(currencyBody, `Currency: ${err.message}`);
  } finally {
    stopButton(refreshCurrencyBtn);
  }
}

// ===== FETCH: CITIZEN =====
async function fetchCitizen() {
  showLoading(citizenBody, 'Loading profile…');
  spinButton(refreshCitizenBtn);

  try {
    const res = await fetch('https://randomuser.me/api/');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const user = data.results[0];

    const fullName = `${user.name.first} ${user.name.last}`;
    const city = user.location.city;
    const email = user.email;
    const picture = user.picture.large;

    window.citizenData = {
      name: fullName,
      city: city,
      email: email,
      picture: picture,
    };

    citizenBody.innerHTML = `
      <div class="citizen-display">
        <img class="citizen-avatar" src="${picture}" alt="${fullName}" />
        <div class="citizen-info">
          <div class="citizen-name">${fullName}</div>
          <div class="citizen-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${city}</span>
          </div>
          <div class="citizen-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>${email}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    showError(citizenBody, `Citizen: ${err.message}`);
  } finally {
    stopButton(refreshCitizenBtn);
  }
}

// ===== FETCH: FACT =====
async function fetchFact() {
  showLoading(factBody, 'Loading fact…');
  spinButton(refreshFactBtn);

  try {
    const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    window.factData = {
      text: data.text,
      source: data.source || 'Unknown',
    };

    factBody.innerHTML = `
      <div class="fact-display">
        <div class="fact-quote">
          <p class="fact-text">${data.text}</p>
          <p class="fact-source">Source: ${data.source || 'Unknown'}</p>
        </div>
      </div>
    `;
  } catch (err) {
    showError(factBody, `Fact: ${err.message}`);
  } finally {
    stopButton(refreshFactBtn);
  }
}

// ===== BUTTON SPIN HELPERS =====
function spinButton(btn) {
  btn.classList.add('spinning');
  btn.disabled = true;
}

function stopButton(btn) {
  btn.classList.remove('spinning');
  btn.disabled = false;
}

// ===== HEADER CLOCK =====
function updateClock() {
  const now = new Date();
  const options = {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  document.getElementById('header-clock').textContent = now.toLocaleTimeString('en-US', options);
}

// ===== INIT =====
function init() {
  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Fetch all data on load
  fetchWeather();
  fetchCurrency();
  fetchCitizen();
  fetchFact();

  // Refresh button listeners
  refreshWeatherBtn.addEventListener('click', fetchWeather);
  refreshCurrencyBtn.addEventListener('click', fetchCurrency);
  refreshCitizenBtn.addEventListener('click', fetchCitizen);
  refreshFactBtn.addEventListener('click', fetchFact);

  // Init chatbot
  initChatbot();
}

init();

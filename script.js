// ============================================================
// УСЛОВНАЯ МОДЕЛЬ ЦЕН ДЛЯ ДЕМО-ФАНТИКОВ
// ============================================================

const RARITY_BASE = {
  'Consumer Grade': 2,
  'Industrial Grade': 8,
  'Mil-Spec Grade': 40,
  'Restricted': 250,
  'Classified': 1500,
  'Covert': 8000,
  'Contraband': 80000,
};

const WEAR_MULT = {
  'Factory New': 2.4,
  'Minimal Wear': 1.7,
  'Field-Tested': 1.0,
  'Well-Worn': 0.75,
  'Battle-Scarred': 0.55,
};

const WEAPON_MULT = {
  'AWP': 2.8,
  'AK-47': 2.3,
  'M4A4': 1.8,
  'M4A1-S': 1.8,
  'Desert Eagle': 2.0,
  'USP-S': 1.5,
  'Glock-18': 1.4,
  'SSG 08': 1.3,
  'SG 553': 1.2,
  'Galil AR': 1.0,
  'FAMAS': 1.0,
  'P90': 0.9,
  'MP9': 0.85,
  'MP7': 0.85,
  'UMP-45': 0.9,
  'MAC-10': 0.85,
  'Tec-9': 0.9,
  'Five-SeveN': 0.9,
  'P250': 0.7,
  'Dual Berettas': 0.6,
  'PP-Bizon': 0.6,
  'XM1014': 0.6,
  'Nova': 0.5,
  'Sawed-Off': 0.55,
  'MAG-7': 0.6,
  'Negev': 0.7,
  'M249': 0.6,
};

const PATTERN_MULT = {
  'Dragon Lore': 12.0,
  'Fire Serpent': 7.0,
  'Case Hardened': 5.0,
  'Doppler': 4.5,
  'Fade': 4.2,
  'Crimson Web': 4.0,
  'Howl': 10.0,
  'Hyper Beast': 2.5,
  'Printstream': 3.0,
  'Asiimov': 2.2,
  'Neo-Noir': 2.4,
  'Vulcan': 2.6,
  'Blood in the Water': 3.2,
  'Blaze': 4.5,
  'Kill Confirmed': 2.3,
  'Medusa': 6.0,
  'Wild Lotus': 8.0,
  'Gungnir': 9.0,
  'Containment Breach': 2.0,
  'Redline': 1.6,
  'Slate': 1.1,
  'Poly Mag': 0.9,
  'Sand Dune': 0.5,
  'Urban DDPAT': 0.5,
  'Forest DDPAT': 0.5,
  'Safari Mesh': 0.5,
  'Boreal Forest': 0.5,
  'Scorched': 0.5,
  'Blue Steel': 0.8,
  'Stained': 0.8,
};

const KNIFE_BASE = {
  'Karambit': 180000,
  'Butterfly Knife': 220000,
  'M9 Bayonet': 140000,
  'Talon Knife': 160000,
  'Skeleton Knife': 130000,
  'Bayonet': 80000,
  'Flip Knife': 55000,
  'Huntsman Knife': 50000,
  'Bowie Knife': 45000,
  'Falchion Knife': 38000,
  'Shadow Daggers': 42000,
  'Stiletto Knife': 85000,
  'Ursus Knife': 60000,
  'Navaja Knife': 32000,
  'Nomad Knife': 95000,
  'Paracord Knife': 55000,
  'Survival Knife': 48000,
  'Classic Knife': 65000,
  'Gut Knife': 28000,
  'Kukri Knife': 35000,
};

const GLOVE_BASE = {
  'Sport Gloves': 110000,
  'Specialist Gloves': 90000,
  'Driver Gloves': 75000,
  'Moto Gloves': 65000,
  'Hand Wraps': 85000,
  'Hydra Gloves': 45000,
  'Bloodhound Gloves': 60000,
  'Broken Fang Gloves': 70000,
};

// ============================================================
// РАСЧЁТ ЦЕНЫ
// ============================================================
function calcPrice(item) {
  const rarityName = item.rarity?.name || 'Mil-Spec Grade';
  const wearName = item.wear?.name || 'Field-Tested';
  const wearMult = WEAR_MULT[wearName] || 1.0;

  const weaponName = item.weapon?.name || '';
  const skinName = item.pattern?.name || item.name || '';
  const categoryName = item.category?.name || '';

  // ---- НОЖИ ----
  if (categoryName === 'Knives') {
    let base = 40000;
    for (const [knife, price] of Object.entries(KNIFE_BASE)) {
      if (item.name.includes(knife)) { base = price; break; }
    }
    let patternMult = 1;
    for (const [pat, mult] of Object.entries(PATTERN_MULT)) {
      if (skinName.includes(pat) || item.name.includes(pat)) { patternMult = mult; break; }
    }
    const knifeWear = {
      'Factory New': 2.0,
      'Minimal Wear': 1.5,
      'Field-Tested': 1.0,
      'Well-Worn': 0.85,
      'Battle-Scarred': 0.7,
    }[wearName] || 1;

    let price = base * knifeWear * patternMult;
    if (item.stattrak) price *= 1.5;
    price *= 0.85 + Math.random() * 0.3;
    return Math.round(price);
  }

  // ---- ПЕРЧАТКИ ----
  if (categoryName === 'Gloves') {
    let base = 50000;
    for (const [glove, price] of Object.entries(GLOVE_BASE)) {
      if (item.name.includes(glove)) { base = price; break; }
    }
    let patternMult = 1;
    for (const [pat, mult] of Object.entries(PATTERN_MULT)) {
      if (skinName.includes(pat) || item.name.includes(pat)) { patternMult = mult; break; }
    }
    let price = base * wearMult * patternMult;
    if (item.stattrak) price *= 1.4;
    price *= 0.85 + Math.random() * 0.3;
    return Math.round(price);
  }

  // ---- ОБЫЧНОЕ ОРУЖИЕ ----
  let base = RARITY_BASE[rarityName] || 40;

  let wMult = 1;
  for (const [weap, mult] of Object.entries(WEAPON_MULT)) {
    if (weaponName === weap || item.name.startsWith(weap)) { wMult = mult; break; }
  }
  base *= wMult;

  let pMult = 1;
  for (const [pat, mult] of Object.entries(PATTERN_MULT)) {
    if (skinName.includes(pat) || item.name.includes(pat)) { pMult = mult; break; }
  }
  base *= pMult;

  let price = base * wearMult;
  if (item.stattrak) price *= 1.4;

  if (Math.random() < 0.05 && rarityName === 'Covert') {
    price *= 2 + Math.random() * 3;
  }

  price *= 0.8 + Math.random() * 0.4;
  return Math.max(1, Math.round(price));
}

const SELL_COMMISSION = 0.10;

// ============================================================
// КЛЮЧИ ХРАНИЛИЩА
// ============================================================
const USERS_KEY = 'cs2up_users';
const SESSION_KEY = 'cs2up_session';
const VOLUME_KEY = 'cs2up_volume';
const TELEGRAM_URL = 'https://t.me/perkasanya';
const PROMO_CODE = 'SGRADER';
const PROMO_BONUS_RATE = 0.10;

function stateKey(username) {
  return 'cs2up_state_' + username.toLowerCase();
}

// ============================================================
// ЭЛЕМЕНТЫ — АВТОРИЗАЦИЯ
// ============================================================
const authScreen = document.getElementById('authScreen');
const appEl = document.getElementById('app');
const authTitle = document.getElementById('authTitle');
const authTabs = document.querySelectorAll('.auth-tab');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const authPasswordConfirm = document.getElementById('authPasswordConfirm');
const authPromoWrap = document.getElementById('authPromoWrap');
const authPromo = document.getElementById('authPromo');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const playerIdEl = document.getElementById('playerId');
const adminNav = document.getElementById('adminNav');
const adminUsersEl = document.getElementById('adminUsers');
const adminFeedback = document.getElementById('adminFeedback');
const telegramLink = document.getElementById('telegramLink');
const promoStatus = document.getElementById('promoStatus');

// ============================================================
// ЭЛЕМЕНТЫ — ОСНОВНЫЕ
// ============================================================
const $ = id => document.getElementById(id);
const balanceEl = $('balance');
const inventoryGrid = $('inventoryGrid');
const invSearch = $('invSearch');
const invPriceFrom = $('invPriceFrom');
const invPriceTo = $('invPriceTo');
const invSort = $('invSort');
const invCount = $('invCount');
const invLoading = $('invLoading');
const targetGrid = $('targetGrid');
const targetSearch = $('targetSearch');
const targetPriceFrom = $('targetPriceFrom');
const targetPriceTo = $('targetPriceTo');
const targetSort = $('targetSort');
const targetCount = $('targetCount');
const targetLoading = $('targetLoading');
const chanceValue = $('chanceValue');
const multiplierEl = $('multiplier');
const upgradeBtn = $('upgradeBtn');
const resultEl = $('result');
const warningEl = $('warning');
const canvas = $('wheelCanvas');
const ctx = canvas.getContext('2d');
const rotor = $('pointerRotor');
const myInventory = $('myInventory');
const myInvCount = $('myInvCount');
const betSlot = $('betSlot');
const targetSlot = $('targetSlot');

const profBalance = $('profBalance');
const profCount = $('profCount');
const profInvValue = $('profInvValue');
const profBestDrop = $('profBestDrop');
const profileInventory = $('profileInventory');
const sellAllBtn = $('sellAllBtn');
const resetBtn = $('resetBtn');

const buyModal = $('buyModal');
const modalItem = $('modalItem');
const modalPrice = $('modalPrice');
const modalCancel = $('modalCancel');
const modalConfirm = $('modalConfirm');

const sellModal = $('sellModal');
const sellModalItem = $('sellModalItem');
const sellBasePrice = $('sellBasePrice');
const sellFeeLabel = $('sellFeeLabel');
const sellFee = $('sellFee');
const sellReceive = $('sellReceive');
const sellCancel = $('sellCancel');
const sellConfirm = $('sellConfirm');

const confirmModal = $('confirmModal');
const confirmTitle = $('confirmTitle');
const confirmText = $('confirmText');
const confirmCancel = $('confirmCancel');
const confirmOk = $('confirmOk');

const winSound = $('winSound');
const volumeSlider = $('volumeSlider');
const volumeValue = $('volumeValue');
const volumeIcon = $('volumeIcon');

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let currentUser = null;
let state = {
  balance: 0,
  inventory: [],
  betId: null,
  targetName: null,
  bestDrop: null
};

let SKINS_CATALOG = [];
let betData = null;
let targetData = null;
let currentChance = 0;
let spinning = false;
let rotorAngle = 0;
let pendingBuy = null;
let pendingSell = null;
let pendingConfirm = null;
let winVolume = 0.7;
let invQuickFilter = 'all';
let targetQuickFilter = 'all';

const SECTOR_COUNT = 40;
const MAX_RENDER = 500;

// ============================================================
// УТИЛИТЫ
// ============================================================
async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  let users;
  try { users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  catch (e) { users = {}; }

  let changed = false;
  const ids = new Set(Object.values(users).map(user => user.playerId ? String(user.playerId) : null).filter(Boolean));
  for (const [key, user] of Object.entries(users)) {
    if (!user.playerId) {
      user.playerId = createPlayerId(ids);
      ids.add(user.playerId);
      changed = true;
    } else if (typeof user.playerId !== 'string') {
      user.playerId = String(user.playerId);
      changed = true;
    }
    if (!user.role) { user.role = 'user'; changed = true; }
  }
  if (Object.keys(users).length && !Object.values(users).some(user => user.role === 'admin')) {
    const owner = Object.entries(users).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0))[0];
    owner[1].role = 'admin';
    changed = true;
  }
  if (changed) saveUsers(users);
  return users;
}
function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
}

function createPlayerId(existing = new Set()) {
  let id;
  do { id = String(Math.floor(100000 + Math.random() * 900000)); }
  while (existing.has(id));
  return id;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function fmt(n) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' фант.';
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  authTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  authTitle.textContent = mode === 'login' ? 'Вход' : 'Регистрация';
  authSubmit.textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
  authPasswordConfirm.style.display = mode === 'register' ? 'block' : 'none';
  authPromoWrap.style.display = mode === 'register' ? 'block' : 'none';
  authPasswordConfirm.value = '';
  if (mode !== 'register') authPromo.value = '';
  authError.textContent = '';
  authError.classList.remove('show');
  authPassword.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}

authTabs.forEach(tab => {
  tab.addEventListener('click', () => setAuthMode(tab.dataset.mode));
});
setAuthMode('login');

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('show');
  void authError.offsetWidth;
  authError.classList.add('show');
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authError.classList.remove('show');

  const username = authUsername.value.trim();
  const password = authPassword.value;
  const enteredPromo = authPromo.value.trim().toUpperCase();

  if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]{3,16}$/.test(username)) {
    showAuthError('Ник: 3–16 символов, буквы/цифры/_');
    return;
  }
  if (password.length < 4) {
    showAuthError('Пароль: минимум 4 символа');
    return;
  }

  const users = getUsers();
  const key = username.toLowerCase();

  if (authMode === 'register') {
    if (authPasswordConfirm.value !== password) {
      showAuthError('Пароли не совпадают');
      return;
    }
    if (users[key]) {
      showAuthError('Такой ник уже занят');
      return;
    }
    if (enteredPromo && enteredPromo !== PROMO_CODE) {
      showAuthError('Промокод не найден');
      return;
    }

    authSubmit.disabled = true;
    const hash = await sha256(password);
    const existingIds = new Set(Object.values(users).map(user => user.playerId).filter(Boolean));
    users[key] = {
      username,
      passwordHash: hash,
      playerId: createPlayerId(existingIds),
      role: Object.keys(users).length === 0 ? 'admin' : 'user',
      promoCode: enteredPromo || null,
      createdAt: Date.now()
    };
    saveUsers(users);
    loginAs(username, hash);
    authSubmit.disabled = false;
  } else {
    if (!users[key]) {
      showAuthError('Пользователь не найден');
      return;
    }

    authSubmit.disabled = true;
    const hash = await sha256(password);
    if (users[key].passwordHash !== hash) {
      showAuthError('Неверный пароль');
      authSubmit.disabled = false;
      return;
    }

    loginAs(users[key].username, hash);
    authSubmit.disabled = false;
  }
});

function loginAs(username, passwordHash) {
  const users = getUsers();
  const account = users[username.toLowerCase()];
  if (!account) return;
  currentUser = { username: account.username, passwordHash, playerId: account.playerId, role: account.role, promoCode: account.promoCode || null };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch (e) {}

  authScreen.classList.add('hide');
  appEl.style.display = 'block';
  userNameEl.textContent = account.username;
  playerIdEl.textContent = `ID игрока: ${account.playerId}`;
  adminNav.style.display = account.role === 'admin' ? '' : 'none';
  telegramLink.href = TELEGRAM_URL;
  promoStatus.textContent = account.promoCode === PROMO_CODE
    ? `Промокод ${PROMO_CODE} активен: +10% к виртуальным фантикам, начисленным администратором.`
    : 'При регистрации можно было указать промокод SGRADER; повторно применить его нельзя.';

  loadUserState();
  updateBalanceUI();
  renderInventory();
  renderTargets();
  renderMyInventory();
  restoreSlotsFromState();
  renderProfile();
  if (account.role === 'admin') renderAdminUsers();
}

logoutBtn.addEventListener('click', () => {
  currentUser = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}

  state = { balance: 0, inventory: [], betId: null, targetName: null, bestDrop: null };
  betData = null;
  targetData = null;

  appEl.style.display = 'none';
  authScreen.classList.remove('hide');
  authPassword.value = '';
  authPasswordConfirm.value = '';
  authError.textContent = '';
  setAuthMode('login');
});

// ============================================================
// СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
function loadUserState() {
  state = { balance: 0, inventory: [], betId: null, targetName: null, bestDrop: null };
  if (!currentUser) return;
  try {
    const raw = localStorage.getItem(stateKey(currentUser.username));
    if (raw) {
      state = { ...state, ...JSON.parse(raw) };
      // Сброс старого стартового бонуса из прежней версии демо.
      if (state.balance === 1000) state.balance = 0;
      saveState();
    }
  } catch (e) { console.warn('load error', e); }
}

function saveState() {
  if (!currentUser) return;
  try { localStorage.setItem(stateKey(currentUser.username), JSON.stringify(state)); }
  catch (e) {}
}

// ============================================================
// ГРОМКОСТЬ
// ============================================================
function updateVolumeIcon(v) {
  if (v === 0) volumeIcon.textContent = '🔇';
  else if (v < 0.35) volumeIcon.textContent = '🔈';
  else if (v < 0.7) volumeIcon.textContent = '🔉';
  else volumeIcon.textContent = '🔊';
}

function applyVolume(percent) {
  winVolume = Math.max(0, Math.min(1, percent / 100));
  volumeValue.textContent = Math.round(percent) + '%';
  updateVolumeIcon(winVolume);
  volumeSlider.style.background =
    `linear-gradient(90deg, #fff 0%, #fff ${percent}%, #444 ${percent}%, #444 100%)`;
  if (winSound) winSound.volume = winVolume;
  try { localStorage.setItem(VOLUME_KEY, String(percent)); } catch (e) {}
}

function loadVolume() {
  let saved = null;
  try { saved = localStorage.getItem(VOLUME_KEY); } catch (e) {}
  const percent = saved !== null ? parseFloat(saved) : 70;
  volumeSlider.value = percent;
  applyVolume(percent);
}
volumeSlider.addEventListener('input', (e) => applyVolume(parseFloat(e.target.value)));
loadVolume();

// ============================================================
// ЗВУК
// ============================================================
function playWinSound() {
  if (!winSound || winVolume === 0) return;
  try {
    winSound.currentTime = 0;
    winSound.volume = winVolume;
    const p = winSound.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
}

document.addEventListener('click', () => {
  if (!winSound) return;
  const prev = winSound.volume;
  winSound.volume = 0;
  const p = winSound.play();
  if (p && p.then) {
    p.then(() => { winSound.pause(); winSound.currentTime = 0; winSound.volume = prev; }).catch(() => {});
  }
}, { once: true });

// ============================================================
// НАВИГАЦИЯ
// ============================================================
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const page = tab.dataset.tab;
    $('page-' + page).classList.add('active');
    if (page === 'profile') renderProfile();
    if (page === 'admin') renderAdminUsers();
  });
});

// ============================================================
// БАЛАНС
// ============================================================
function updateBalanceUI(flash = false) {
  balanceEl.textContent = fmt(state.balance);
  if (flash) {
    balanceEl.classList.add('flash');
    setTimeout(() => balanceEl.classList.remove('flash'), 600);
  }
}

function addBalance(amount) {
  state.balance = Math.round((state.balance + amount) * 100) / 100;
  saveState();
  updateBalanceUI(true);
}

function spendBalance(amount) {
  if (state.balance < amount) return false;
  state.balance = Math.round((state.balance - amount) * 100) / 100;
  saveState();
  updateBalanceUI();
  return true;
}

function renderAdminUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  const users = getUsers();
  adminUsersEl.innerHTML = Object.entries(users).map(([key, user]) => {
    const userState = loadStateForUsername(user.username);
    const promo = user.promoCode === PROMO_CODE ? `${PROMO_CODE} (+${Math.round(PROMO_BONUS_RATE * 100)}%)` : '—';
    return `<tr>
      <td>${escapeHtml(user.playerId || '—')}</td>
      <td>${escapeHtml(user.username)}${user.role === 'admin' ? ' <span class="admin-tag">админ</span>' : ''}</td>
      <td>${escapeHtml(promo)}</td>
      <td>${fmt(userState.balance)}</td>
      <td><form class="admin-grant-form" data-user-key="${escapeHtml(key)}">
        <input class="admin-amount" type="number" min="0.01" max="100000000" step="0.01" placeholder="Сумма" aria-label="Количество фантиков">
        <button class="btn-small" type="submit">Начислить</button>
      </form></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5">Пользователей пока нет.</td></tr>';
}

function loadStateForUsername(username) {
  const empty = { balance: 0, inventory: [], betId: null, targetName: null, bestDrop: null };
  try {
    const raw = localStorage.getItem(stateKey(username));
    const saved = raw ? { ...empty, ...JSON.parse(raw) } : empty;
    if (saved.balance === 1000) {
      saved.balance = 0;
      localStorage.setItem(stateKey(username), JSON.stringify(saved));
    }
    return saved;
  } catch (e) { return empty; }
}

adminUsersEl.addEventListener('submit', event => {
  const form = event.target.closest('.admin-grant-form');
  if (!form) return;
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') return;
  const amountInput = form.querySelector('.admin-amount');
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    adminFeedback.textContent = 'Укажите сумму от 0,01 до 100 000 000 фантиков.';
    adminFeedback.classList.add('show');
    return;
  }
  const key = form.dataset.userKey;
  const users = getUsers();
  const account = users[key];
  if (!account) return;
  const bonus = account.promoCode === PROMO_CODE ? Math.round(amount * PROMO_BONUS_RATE * 100) / 100 : 0;
  const targetState = loadStateForUsername(account.username);
  targetState.balance = Math.round((targetState.balance + amount + bonus) * 100) / 100;
  try { localStorage.setItem(stateKey(account.username), JSON.stringify(targetState)); } catch (e) {}
  adminFeedback.textContent = `Начислено ${fmt(amount)}${bonus ? ` + бонус ${fmt(bonus)} по ${PROMO_CODE}` : ''} игроку ${account.username} (ID ${account.playerId}).`;
  adminFeedback.classList.add('show');
  amountInput.value = '';
  renderAdminUsers();
  if (currentUser.username.toLowerCase() === key) {
    loadUserState();
    updateBalanceUI(true);
    renderProfile();
  }
});

// ============================================================
// ШАНС
// ============================================================
function calculateChance(betPrice, targetPrice) {
  if (!betPrice || !targetPrice || targetPrice <= 0) return 0;
  const raw = (betPrice / targetPrice) * 100;
  return Math.min(90, Math.max(1, Math.round(raw)));
}

// ============================================================
// КОЛЕСО
// ============================================================
function drawWheel(chancePercent) {
  const size = canvas.width;
  const r = size / 2;
  const cx = r, cy = r;
  const arc = (Math.PI * 2) / SECTOR_COUNT;
  const winSectors = Math.max(1, Math.round((chancePercent / 100) * SECTOR_COUNT));

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < SECTOR_COUNT; i++) {
    const start = i * arc - Math.PI / 2;
    const end = start + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 4, start, end);
    ctx.closePath();
    const isWin = i < winSectors;
    ctx.fillStyle = isWin ? '#ffffff' : (i % 2 === 0 ? '#1a1a1a' : '#111111');
    ctx.fill();
    ctx.strokeStyle = '#080808';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
drawWheel(0);

// ============================================================
// ЗАГРУЗКА КАТАЛОГА
// ============================================================
async function loadSkins() {
  try {
    const res = await fetch('skins.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();

    SKINS_CATALOG = raw.map((item, idx) => {
      const price = calcPrice(item);

      return {
        id: 'c_' + idx,
        name: item.name,
        price,
        img: item.image,
        rarity: item.rarity,
        category: item.category?.name,
        weapon: item.weapon?.name,
        wear: item.wear?.name,
        stattrak: item.stattrak,
        marketHashName: item.market_hash_name,
      };
    });

    SKINS_CATALOG.sort((a, b) => a.price - b.price);

    invLoading.classList.add('hide');
    targetLoading.classList.add('hide');

    if (currentUser) {
      renderInventory();
      renderTargets();
      renderMyInventory();
      restoreSlotsFromState();
    }
  } catch (err) {
    invLoading.textContent = 'Ошибка загрузки skins.json';
    targetLoading.textContent = 'Ошибка загрузки skins.json';
    console.error(err);
  }
}

// ============================================================
// УМНЫЙ ПОИСК
// ============================================================
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/stattrak™?/g, '')
    .replace(/souvenir/g, '')
    .replace(/★/g, '')
    .replace(/[|()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WEAR_ALIASES = {
  'fn': 'factory new',
  'mw': 'minimal wear',
  'ft': 'field-tested',
  'ww': 'well-worn',
  'bs': 'battle-scarred',
  'factory': 'factory new',
  'minimal': 'minimal wear',
  'field': 'field-tested',
  'well': 'well-worn',
  'battle': 'battle-scarred',
};

function tokenizeSearch(query) {
  const q = normalize(query);
  if (!q) return [];
  return q.split(' ').filter(Boolean).map(tok => WEAR_ALIASES[tok] || tok);
}

function matchesSearch(nameNorm, tokens) {
  for (const tok of tokens) {
    if (!nameNorm.includes(tok)) return false;
  }
  return true;
}

function filterItems({ search = '', priceFrom = null, priceTo = null, sort = 'price-asc', quickFilter = 'all' }) {
  const tokens = tokenizeSearch(search);

  let from = null, to = null;
  if (priceFrom !== null && priceFrom !== undefined && priceFrom !== '') {
    const n = parseFloat(priceFrom);
    if (!isNaN(n) && n >= 0) from = n;
  }
  if (priceTo !== null && priceTo !== undefined && priceTo !== '') {
    const n = parseFloat(priceTo);
    if (!isNaN(n) && n >= 0) to = n;
  }
  if (from !== null && to !== null && from > to) {
    [from, to] = [to, from];
  }

  const result = [];
  for (const s of SKINS_CATALOG) {
    if (from !== null && s.price < from) continue;
    if (to !== null && s.price > to) continue;

    if (tokens.length) {
      if (!s._searchNorm) s._searchNorm = normalize(s.name);
      if (!matchesSearch(s._searchNorm, tokens)) continue;
    }

    result.push(s);
  }

  result.sort((a, b) => {
    if (sort === 'price-asc')  return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'name-asc')   return a.name.localeCompare(b.name);
    if (sort === 'name-desc')  return b.name.localeCompare(a.name);
    return 0;
  });

  if (quickFilter === 'knives') {
    return result.filter(s => s.category === 'Knives');
  }
  if (quickFilter === 'gloves') {
    return result.filter(s => s.category === 'Gloves');
  }
  if (quickFilter === 'top') {
    return [...result].sort((a, b) => b.price - a.price).slice(0, 50);
  }
  return result;
}

function isInMyInventory(itemId) {
  return state.inventory.some(i => i.catalogId === itemId);
}

// ============================================================
// ШАНС UI
// ============================================================
function updateChance() {
  if (!betData || !targetData) {
    currentChance = 0;
    chanceValue.textContent = '—';
    multiplierEl.textContent = '—';
    upgradeBtn.disabled = true;
    warningEl.classList.remove('show');
    warningEl.textContent = '';
    drawWheel(0);
    return;
  }

  if (betData.price > targetData.price) {
    currentChance = 0;
    chanceValue.textContent = '—';
    multiplierEl.textContent = '—';
    upgradeBtn.disabled = true;
    warningEl.textContent = '⚠ Ставка дороже цели — выберите другой скин';
    warningEl.classList.add('show');
    drawWheel(0);
    return;
  }

  warningEl.classList.remove('show');
  warningEl.textContent = '';

  currentChance = calculateChance(betData.price, targetData.price);
  chanceValue.textContent = currentChance + '%';
  multiplierEl.textContent = 'x' + (targetData.price / betData.price).toFixed(2);
  upgradeBtn.disabled = false;
  drawWheel(currentChance);
}

// ============================================================
// СЛОТЫ
// ============================================================
function renderSlot(slotEl, item) {
  if (!item) {
    slotEl.classList.remove('has-item');
    slotEl.innerHTML = '<div class="slot-empty">—</div>';
    return;
  }
  slotEl.classList.add('has-item');
  slotEl.innerHTML = `
    <img src="${item.img}" alt="">
    <div class="item-name">${item.name}</div>
    <div class="item-price">${fmt(item.price)}</div>
  `;
}

function restoreSlotsFromState() {
  if (!SKINS_CATALOG.length) return;

  if (state.betId) {
    const invItem = state.inventory.find(i => i.catalogId === state.betId);
    if (invItem) {
      betData = SKINS_CATALOG.find(s => s.id === invItem.catalogId) || invItem;
      renderSlot(betSlot, betData);
    }
  } else {
    renderSlot(betSlot, null);
  }

  if (state.targetName) {
    targetData = SKINS_CATALOG.find(s => s.name === state.targetName) || null;
    renderSlot(targetSlot, targetData);
  } else {
    renderSlot(targetSlot, null);
  }

  updateChance();
}

// ============================================================
// КАРТОЧКА
// ============================================================
function buildCatalogCard(item, { disabled, source, onClick }) {
  const card = document.createElement('div');
  card.className = 'inv-card' + (disabled ? ' disabled' : '');
  const owned = source === 'catalog' && isInMyInventory(item.id);

  card.innerHTML = `
    ${owned ? '<div class="card-badge owned">✓</div>' : (source === 'catalog' ? '<div class="card-badge buy">Ф</div>' : '')}
    <div class="item-img"><img src="${item.img}" alt="" loading="lazy"></div>
    <div class="item-name" title="${item.name}">${item.name}</div>
    <div class="item-price">${fmt(item.price)}</div>
  `;

  if (!disabled) card.addEventListener('click', onClick);
  return card;
}

// ============================================================
// ЛЕВЫЙ КАТАЛОГ
// ============================================================
function renderInventory() {
  if (!currentUser || !SKINS_CATALOG.length) return;

  const items = filterItems({
    search: invSearch.value,
    priceFrom: invPriceFrom.value,
    priceTo: invPriceTo.value,
    sort: invSort.value,
    quickFilter: invQuickFilter,
  });

  invCount.textContent = items.length > MAX_RENDER
    ? `${MAX_RENDER}/${items.length}`
    : `${items.length}`;

  inventoryGrid.innerHTML = '';
  if (items.length === 0) {
    inventoryGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Ничего не найдено</div>';
    return;
  }

  const shown = items.slice(0, MAX_RENDER);

  shown.forEach((item, i) => {
    const owned = isInMyInventory(item.id);
    const disabled = targetData && item.price > targetData.price;

    const card = buildCatalogCard(item, {
      disabled, source: 'catalog',
      onClick: () => {
        if (owned) selectBet(item);
        else openBuyModal(item);
      }
    });
    card.style.animationDelay = (i * 0.005) + 's';
    inventoryGrid.appendChild(card);
  });

  if (items.length > MAX_RENDER) {
    const more = document.createElement('div');
    more.style.cssText = 'grid-column:1/-1;text-align:center;color:#666;font-size:10px;padding:8px';
    more.textContent = `Показано ${MAX_RENDER} из ${items.length}. Уточните поиск.`;
    inventoryGrid.appendChild(more);
  }
}

// ============================================================
// ПРАВЫЙ КАТАЛОГ
// ============================================================
function renderTargets() {
  if (!currentUser || !SKINS_CATALOG.length) return;

  const items = filterItems({
    search: targetSearch.value,
    priceFrom: targetPriceFrom.value,
    priceTo: targetPriceTo.value,
    sort: targetSort.value,
    quickFilter: targetQuickFilter,
  });

  targetCount.textContent = items.length > MAX_RENDER
    ? `${MAX_RENDER}/${items.length}`
    : `${items.length}`;

  targetGrid.innerHTML = '';
  if (items.length === 0) {
    targetGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Ничего не найдено</div>';
    return;
  }

  const shown = items.slice(0, MAX_RENDER);

  shown.forEach((item, i) => {
    const disabled = betData && item.price < betData.price;
    const card = buildCatalogCard(item, {
      disabled, source: 'target',
      onClick: () => selectTarget(item)
    });
    card.style.animationDelay = (i * 0.005) + 's';
    targetGrid.appendChild(card);
  });

  if (items.length > MAX_RENDER) {
    const more = document.createElement('div');
    more.style.cssText = 'grid-column:1/-1;text-align:center;color:#666;font-size:10px;padding:8px';
    more.textContent = `Показано ${MAX_RENDER} из ${items.length}. Уточните поиск.`;
    targetGrid.appendChild(more);
  }
}

// ============================================================
// МОЙ ИНВЕНТАРЬ
// ============================================================
function renderMyInventory() {
  if (!currentUser) return;
  myInvCount.textContent = state.inventory.length;
  myInventory.innerHTML = '';

  if (state.inventory.length === 0) {
    myInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Пусто. Купи скин в каталоге слева.</div>';
    return;
  }

  state.inventory.forEach((inv, i) => {
    const card = document.createElement('div');
    card.className = 'inv-card';
    card.innerHTML = `
      <div class="item-img"><img src="${inv.img}" alt=""></div>
      <div class="item-name" title="${inv.name}">${inv.name}</div>
      <div class="item-price">${fmt(inv.price)}</div>
    `;
    card.addEventListener('click', () => selectBet(inv));
    card.style.animationDelay = (i * 0.01) + 's';
    myInventory.appendChild(card);
  });
}

// ============================================================
// ВЫБОР
// ============================================================
function selectBet(item) {
  const catalogItem = SKINS_CATALOG.find(s => s.id === (item.id || item.catalogId)) || item;
  betData = catalogItem;
  state.betId = catalogItem.id;
  saveState();
  renderSlot(betSlot, betData);
  updateChance();
  renderMyInventory();
  renderTargets();
  renderInventory();
}

function selectTarget(item) {
  targetData = item;
  state.targetName = item.name;
  saveState();
  renderSlot(targetSlot, targetData);
  updateChance();
  renderInventory();
  renderTargets();
}

// ============================================================
// МОДАЛКА ПОКУПКИ
// ============================================================
function openBuyModal(item) {
  pendingBuy = { item };
  modalItem.innerHTML = `<img src="${item.img}" alt=""><div class="item-name">${item.name}</div>`;
  modalPrice.textContent = fmt(item.price);
  buyModal.classList.add('show');
}

function closeBuyModal() {
  buyModal.classList.remove('show');
  pendingBuy = null;
}

modalCancel.addEventListener('click', closeBuyModal);
buyModal.addEventListener('click', (e) => {
  if (e.target === buyModal) closeBuyModal();
});

modalConfirm.addEventListener('click', () => {
  if (!pendingBuy) return;
  const { item } = pendingBuy;

  if (!spendBalance(item.price)) {
    warningEl.textContent = '⚠ Недостаточно средств';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    closeBuyModal();
    return;
  }

  state.inventory.push({
    catalogId: item.id,
    name: item.name,
    price: item.price,
    img: item.img,
    rarity: item.rarity
  });
  saveState();
  renderMyInventory();
  renderInventory();
  closeBuyModal();
  if ($('page-profile').classList.contains('active')) renderProfile();
});

// ============================================================
// МОДАЛКА ПРОДАЖИ
// ============================================================
function openSellModal(invIndex) {
  const item = state.inventory[invIndex];
  if (!item) return;
  pendingSell = { invIndex };

  const basePrice = item.price;
  const fee = Math.round(basePrice * SELL_COMMISSION * 100) / 100;
  const receive = Math.round((basePrice - fee) * 100) / 100;

  sellModalItem.innerHTML = `<img src="${item.img}" alt=""><div class="item-name">${item.name}</div>`;
  sellFeeLabel.textContent = `Комиссия (${Math.round(SELL_COMMISSION * 100)}%):`;
  sellBasePrice.textContent = fmt(basePrice);
  sellFee.textContent = '−' + fmt(fee);
  sellReceive.textContent = fmt(receive);

  sellModal.classList.add('show');
}

function closeSellModal() {
  sellModal.classList.remove('show');
  pendingSell = null;
}

sellCancel.addEventListener('click', closeSellModal);
sellModal.addEventListener('click', (e) => {
  if (e.target === sellModal) closeSellModal();
});

sellConfirm.addEventListener('click', () => {
  if (!pendingSell) return;
  const { invIndex } = pendingSell;
  const item = state.inventory[invIndex];
  if (!item) { closeSellModal(); return; }

  const receive = Math.round(item.price * (1 - SELL_COMMISSION) * 100) / 100;

  state.inventory.splice(invIndex, 1);

  if (state.betId === item.catalogId) {
    state.betId = null;
    betData = null;
    renderSlot(betSlot, null);
  }

  addBalance(receive);
  saveState();

  renderProfile();
  renderMyInventory();
  renderInventory();
  updateChance();
  closeSellModal();
});

// ============================================================
// ПОДТВЕРЖДЕНИЕ
// ============================================================
function openConfirm(title, text, onOk) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  pendingConfirm = onOk;
  confirmModal.classList.add('show');
}

function closeConfirm() {
  confirmModal.classList.remove('show');
  pendingConfirm = null;
}

confirmCancel.addEventListener('click', closeConfirm);
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirm();
});
confirmOk.addEventListener('click', () => {
  if (pendingConfirm) pendingConfirm();
  closeConfirm();
});

// ============================================================
// ПРОДАЖА ВСЕГО / СБРОС
// ============================================================
sellAllBtn.addEventListener('click', () => {
  if (state.inventory.length === 0) return;
  let total = 0;
  state.inventory.forEach(i => { total += i.price * (1 - SELL_COMMISSION); });
  total = Math.round(total * 100) / 100;

  openConfirm(
    'Обменять всё на фантики?',
    `Вы обменяете ${state.inventory.length} скин(ов) на ${fmt(total)} (комиссия ${Math.round(SELL_COMMISSION*100)}% уже учтена).`,
    () => {
      addBalance(total);
      state.inventory = [];
      state.betId = null;
      betData = null;
      renderSlot(betSlot, null);
      saveState();
      renderProfile();
      renderMyInventory();
      renderInventory();
      updateChance();
    }
  );
});

resetBtn.addEventListener('click', () => {
  openConfirm(
    'Сбросить прогресс?',
    'Баланс, инвентарь и лучший дроп будут удалены. Аккаунт и пароль останутся.',
    () => {
      state = { balance: 0, inventory: [], betId: null, targetName: null, bestDrop: null };
      betData = null;
      targetData = null;
      saveState();
      updateBalanceUI();
      renderSlot(betSlot, null);
      renderSlot(targetSlot, null);
      updateChance();
      renderProfile();
      renderMyInventory();
      renderInventory();
      renderTargets();
    }
  );
});

// ============================================================
// ПРОФИЛЬ
// ============================================================
function renderProfile() {
  if (!currentUser) return;
  profBalance.textContent = fmt(state.balance);
  profCount.textContent = state.inventory.length;

  const totalValue = state.inventory.reduce((sum, i) => sum + i.price, 0);
  profInvValue.textContent = fmt(totalValue);

  if (state.bestDrop) {
    profBestDrop.innerHTML = `
      <img src="${state.bestDrop.img}" alt="">
      <div>
        <div class="best-drop-name">${state.bestDrop.name}</div>
        <div class="best-drop-price">${fmt(state.bestDrop.price)}</div>
      </div>
    `;
  } else {
    profBestDrop.innerHTML = '<div class="best-drop-empty">Пока нет</div>';
  }

  profileInventory.innerHTML = '';
  if (state.inventory.length === 0) {
    profileInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:12px;padding:30px">Инвентарь пуст</div>';
    return;
  }

  state.inventory.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'sell-card';
    const receive = Math.round(item.price * (1 - SELL_COMMISSION) * 100) / 100;
    card.innerHTML = `
      <div class="item-img"><img src="${item.img}" alt=""></div>
      <div class="item-name" title="${item.name}">${item.name}</div>
      <div class="item-price">${fmt(item.price)}</div>
      <button class="btn-sell">Обменять за ${fmt(receive)}</button>
    `;
    card.querySelector('.btn-sell').addEventListener('click', () => openSellModal(idx));
    card.style.animationDelay = (idx * 0.02) + 's';
    profileInventory.appendChild(card);
  });
}

// ============================================================
// ФИЛЬТРЫ
// ============================================================
let invTimer, targetTimer;

function scheduleInvRender() {
  clearTimeout(invTimer);
  invTimer = setTimeout(renderInventory, 180);
}
function scheduleTargetRender() {
  clearTimeout(targetTimer);
  targetTimer = setTimeout(renderTargets, 180);
}

invSearch.addEventListener('input', scheduleInvRender);
invPriceFrom.addEventListener('input', scheduleInvRender);
invPriceTo.addEventListener('input', scheduleInvRender);
invSort.addEventListener('change', renderInventory);

targetSearch.addEventListener('input', scheduleTargetRender);
targetPriceFrom.addEventListener('input', scheduleTargetRender);
targetPriceTo.addEventListener('input', scheduleTargetRender);
targetSort.addEventListener('change', renderTargets);

// ============================================================
// БЫСТРЫЕ ФИЛЬТРЫ
// ============================================================
document.querySelectorAll('.quick-filters .qf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const isLeft = btn.hasAttribute('data-qf');
    const val = isLeft ? btn.dataset.qf : btn.dataset.tqf;
    const group = isLeft ? 'data-qf' : 'data-tqf';

    document.querySelectorAll(`[${group}]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (isLeft) {
      invQuickFilter = val;
      renderInventory();
    } else {
      targetQuickFilter = val;
      renderTargets();
    }
  });
});

// ============================================================
// КРУЧЕНИЕ
// ============================================================
upgradeBtn.addEventListener('click', () => {
  if (spinning || !betData || !targetData || currentChance === 0) return;

  if (!isInMyInventory(betData.id)) {
    warningEl.textContent = '⚠ Этой ставки нет в инвентаре';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    return;
  }

  spinning = true;
  upgradeBtn.disabled = true;
  resultEl.classList.remove('show', 'win', 'lose');
  resultEl.textContent = '';

  const win = Math.random() * 100 < currentChance;

  const arcDeg = 360 / SECTOR_COUNT;
  const winSectors = Math.max(1, Math.round((currentChance / 100) * SECTOR_COUNT));

  let targetSector;
  if (win) {
    targetSector = Math.floor(Math.random() * winSectors);
  } else {
    const loseStart = winSectors;
    targetSector = loseStart + Math.floor(Math.random() * (SECTOR_COUNT - loseStart));
  }

  const sectorCenterDeg = targetSector * arcDeg + arcDeg / 2;
  const jitter = (Math.random() - 0.5) * (arcDeg * 0.6);
  const finalAngle = sectorCenterDeg + jitter;

  const fullSpins = 5 + Math.floor(Math.random() * 3);
  const startAngle = rotorAngle % 360;
  const delta = ((finalAngle - startAngle + 360) % 360) + fullSpins * 360;
  const newAngle = rotorAngle + delta;

  rotor.style.transition = 'transform 4.2s cubic-bezier(0.15, 0.65, 0.15, 1)';
  rotor.style.transform = `rotate(${newAngle}deg)`;
  rotorAngle = newAngle;

  setTimeout(() => {
    spinning = false;
    upgradeBtn.disabled = false;

    state.inventory = state.inventory.filter(i => i.catalogId !== betData.id);

    if (win) {
      state.inventory.push({
        catalogId: targetData.id,
        name: targetData.name,
        price: targetData.price,
        img: targetData.img,
        rarity: targetData.rarity
      });

      if (!state.bestDrop || targetData.price > state.bestDrop.price) {
        state.bestDrop = {
          name: targetData.name,
          price: targetData.price,
          img: targetData.img
        };
      }

      resultEl.textContent = `🎉 ПОБЕДА! ${targetData.name}`;
      resultEl.classList.add('show', 'win');
      playWinSound();
    } else {
      resultEl.textContent = `💀 Проигрыш. ${betData.name} потерян`;
      resultEl.classList.add('show', 'lose');
    }

    betData = null;
    targetData = null;
    state.betId = null;
    state.targetName = null;
    saveState();

    renderSlot(betSlot, null);
    renderSlot(targetSlot, null);
    updateChance();
    renderMyInventory();
    renderInventory();
    renderTargets();
    if ($('page-profile').classList.contains('active')) renderProfile();
  }, 4300);
});

// ============================================================
// НЕОН ЦЕЛИ
// ============================================================
setInterval(() => {
  if (targetSlot.classList.contains('has-item')) {
    targetSlot.style.boxShadow = `0 0 ${18 + Math.random() * 10}px rgba(255,255,255,${0.1 + Math.random() * 0.08})`;
  } else {
    targetSlot.style.boxShadow = '';
  }
}, 1200);

// ============================================================
// СТАРТ
// ============================================================
(function initSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const sess = JSON.parse(raw);
      const users = getUsers();
      const key = sess.username.toLowerCase();
      if (users[key] && users[key].passwordHash === sess.passwordHash) {
        loginAs(users[key].username, sess.passwordHash);
        return;
      }
    }
  } catch (e) {}

  authScreen.classList.remove('hide');
  appEl.style.display = 'none';
})();

loadSkins();

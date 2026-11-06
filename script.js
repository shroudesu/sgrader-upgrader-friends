// ============================================================
// УСЛОВНАЯ МОДЕЛЬ ЦЕН ДЛЯ ДЕМО-РУБЛЕЙ
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
const VOLUME_KEY = 'cs2up_volume';
const SPIN_STRENGTH_KEY = 'cs2up_spin_strength';
const SPIN_MODE_KEY = 'cs2up_spin_mode';
const TELEGRAM_URL = 'https://t.me/perkasanya';
const PROMO_CODE = 'SGRADER';
const PROMO_BONUS_RATE = 0.10;
const supabaseUrl = String(window.SUPABASE_URL || '');
const supabaseKey = String(window.SUPABASE_PUBLISHABLE_KEY || '');
const supabaseConfigured = supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('YOUR_') && supabaseKey.length > 20 && !supabaseKey.includes('YOUR_');
const supabaseClient = window.supabase?.createClient && supabaseConfigured
  ? window.supabase.createClient(supabaseUrl, supabaseKey)
  : null;

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
const backendSetupHint = document.getElementById('backendSetupHint');
const authSubmit = document.getElementById('authSubmit');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const playerIdEl = document.getElementById('playerId');
const adminNav = document.getElementById('adminNav');
const adminUsersEl = document.getElementById('adminUsers');
const adminFeedback = document.getElementById('adminFeedback');
const telegramLink = document.getElementById('telegramLink');
const promoStatus = document.getElementById('promoStatus');
const topupRequestForm = document.getElementById('topupRequestForm');
const topupAmountInput = document.getElementById('topupAmount');
const topupMethodSelect = document.getElementById('topupMethod');
const topupFeedback = document.getElementById('topupFeedback');
const multiBetToggle = document.getElementById('multiBetToggle');
const betSelectionStatus = document.getElementById('betSelectionStatus');
const spinStrengthSlider = document.getElementById('spinStrength');
const spinStrengthValue = document.getElementById('spinStrengthValue');
const spinModeButtons = document.querySelectorAll('.spin-mode');
const battleSkinSelect = document.getElementById('battleSkinSelect');
const createBattleBtn = document.getElementById('createBattleBtn');
const battleFeedback = document.getElementById('battleFeedback');
const battleList = document.getElementById('battleList');
const refreshBattlesBtn = document.getElementById('refreshBattlesBtn');
const battleResult = document.getElementById('battleResult');
const battleWheelCanvas = document.getElementById('battleWheelCanvas');
const battleWheelCtx = battleWheelCanvas.getContext('2d');
const battleWheel = document.getElementById('battleWheel');

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
let stateSaveQueue = Promise.resolve();
let state = {
  balance: 0,
  inventory: [],
  betId: null,
  betItemIds: [],
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
let multiSelectMode = false;
let spinStrength = 5;
let spinMode = 'fast';
let battleWheelAngle = 0;
let lastBattleResults = new Set();
let battlePollInFlight = false;
let invQuickFilter = 'all';
let targetQuickFilter = 'all';

const SECTOR_COUNT = 40;
const MAX_RENDER = 500;

// ============================================================
// УТИЛИТЫ
// ============================================================
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function fmt(n) {
  return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

function makeInstanceId() {
  return window.crypto?.randomUUID?.() || `skin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

function usernameAuthEmail(username) {
  const bytes = new TextEncoder().encode(username.trim().toLowerCase());
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  const alias = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `u-${alias}@players.sgrader.invalid`;
}

function showAuthScreen() {
  appEl.style.display = 'none';
  authScreen.classList.remove('hide');
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authError.classList.remove('show');

  if (!supabaseClient) {
    showAuthError('Общая база не настроена. Владелец сайта должен заполнить supabase-config.js и установить schema.sql.');
    return;
  }

  const username = authUsername.value.trim();
  const password = authPassword.value;
  const enteredPromo = authPromo.value.trim().toUpperCase();
  if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]{3,16}$/.test(username)) {
    showAuthError('Ник: 3–16 символов, буквы/цифры/_');
    return;
  }
  if (password.length < 6) {
    showAuthError('Пароль: минимум 6 символов');
    return;
  }

  if (authMode === 'register') {
    if (authPasswordConfirm.value !== password) {
      showAuthError('Пароли не совпадают');
      return;
    }
    if (enteredPromo && enteredPromo !== PROMO_CODE) {
      showAuthError('Промокод не найден');
      return;
    }
  }

  authSubmit.disabled = true;
  try {
    const email = usernameAuthEmail(username);
    if (authMode === 'register') {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      if (error) throw error;
      if (!data.session || !data.user) {
        showAuthError('Регистрация создана, но вход ожидает подтверждения. Владелец должен выключить Confirm email в Supabase.');
        return;
      }

      if (enteredPromo) {
        const { error: promoError } = await supabaseClient.rpc('apply_registration_promo', { p_code: enteredPromo });
        if (promoError) {
          await loginAs(data.user);
          promoStatus.textContent = 'Аккаунт создан, но промокод не применился. Обратитесь к администратору.';
          return;
        }
      }
      await loginAs(data.user);
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loginAs(data.user);
    }
  } catch (error) {
    console.error('Account request failed:', error);
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('invalid login credentials')) {
      showAuthError('Неверный ник или пароль');
    } else if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('duplicate')) {
      showAuthError('Такой ник уже занят');
    } else {
      showAuthError('Не удалось связаться с общей базой. Проверьте настройки Supabase и попробуйте ещё раз.');
    }
  } finally {
    authSubmit.disabled = false;
  }
});

async function loginAs(authUser) {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('user_id, player_id, username, role, promo_code')
    .eq('user_id', authUser.id)
    .single();
  if (profileError) throw profileError;

  currentUser = {
    id: authUser.id,
    username: profile.username,
    playerId: profile.player_id,
    role: profile.role,
    promoCode: profile.promo_code
  };
  await loadUserState();

  authScreen.classList.add('hide');
  appEl.style.display = 'block';
  userNameEl.textContent = currentUser.username;
  playerIdEl.textContent = `ID игрока: ${currentUser.playerId}`;
  adminNav.style.display = currentUser.role === 'admin' ? '' : 'none';
  telegramLink.href = TELEGRAM_URL;
  topupFeedback.textContent = '';
  promoStatus.textContent = currentUser.promoCode === PROMO_CODE
    ? `Промокод ${PROMO_CODE} активен: +10% к каждому виртуальному начислению администратора.`
    : 'Промокод SGRADER можно применить только при регистрации.';

  updateBalanceUI();
  renderInventory();
  renderTargets();
  renderMyInventory();
  restoreSlotsFromState();
  renderProfile();
  if (currentUser.role === 'admin') await renderAdminUsers();
}

topupRequestForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!currentUser) return;

  const amount = Number(topupAmountInput.value);
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000000) {
    topupFeedback.textContent = 'Укажи сумму от 1 до 100 000 000 демо-рублей.';
    return;
  }

  const method = topupMethodSelect.value;
  const promoText = currentUser.promoCode === PROMO_CODE ? ` Промокод: ${PROMO_CODE} (+10%).` : '';
  const message = [
    'Демо-заявка на внутриигровые рубли (оплата не проводилась).',
    `Игрок: ${currentUser.username}`,
    `ID игрока: ${currentUser.playerId}`,
    `Запрошено: ${amount} демо-рублей`,
    `Условный способ: ${method}.${promoText}`
  ].join('\n');
  const url = `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  topupFeedback.textContent = 'Открылся Telegram с подготовленным текстом. Проверь его и нажми «Отправить».';
});

logoutBtn.addEventListener('click', async () => {
  await stateSaveQueue;
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  state = { balance: 0, inventory: [], betId: null, betItemIds: [], targetName: null, bestDrop: null };
  betData = null;
  targetData = null;
  authPassword.value = '';
  authPasswordConfirm.value = '';
  authPromo.value = '';
  authError.textContent = '';
  setAuthMode('login');
  showAuthScreen();
});

// ============================================================
// ОБЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function loadUserState() {
  const empty = { balance: 0, inventory: [], betId: null, betItemIds: [], targetName: null, bestDrop: null };
  const [walletResult, gameStateResult] = await Promise.all([
    supabaseClient.from('wallets').select('balance').eq('user_id', currentUser.id).single(),
    supabaseClient.from('game_states').select('state').eq('user_id', currentUser.id).single()
  ]);
  if (walletResult.error) throw walletResult.error;
  if (gameStateResult.error) throw gameStateResult.error;
  state = { ...empty, ...gameStateResult.data.state, balance: Number(walletResult.data.balance) };
  const seenInstanceIds = new Set();
  let assignedInstanceId = false;
  state.inventory = state.inventory.map(item => {
    let instanceId = item.instanceId;
    if (!instanceId || seenInstanceIds.has(instanceId)) {
      instanceId = makeInstanceId();
      assignedInstanceId = true;
    }
    seenInstanceIds.add(instanceId);
    return { ...item, instanceId };
  });
  state.betItemIds = Array.isArray(state.betItemIds) ? state.betItemIds : [];
  if (!state.betItemIds.length && state.betId) {
    const legacyBet = state.inventory.find(item => item.catalogId === state.betId);
    if (legacyBet) state.betItemIds = [legacyBet.instanceId];
  }
  if (assignedInstanceId || !Array.isArray(gameStateResult.data.state.betItemIds)) await saveState();
}

function saveState() {
  if (!currentUser || !supabaseClient) return Promise.resolve();
  const savedState = { ...state };
  delete savedState.balance;
  const userId = currentUser.id;
  stateSaveQueue = stateSaveQueue.then(async () => {
    const { error } = await supabaseClient
      .from('game_states')
      .upsert({ user_id: userId, state: savedState }, { onConflict: 'user_id' });
    if (error) throw error;
  }).catch(error => {
    console.error('Could not save game state:', error);
    warningEl.textContent = '⚠ Не удалось сохранить состояние игры. Проверьте соединение.';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 3000);
  });
  return stateSaveQueue;
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

function applySpinMode(mode) {
  spinMode = mode === 'slow' ? 'slow' : 'fast';
  spinModeButtons.forEach(button => button.classList.toggle('active', button.dataset.spinMode === spinMode));
  try { localStorage.setItem(SPIN_MODE_KEY, spinMode); } catch (e) {}
}

function loadSpinSettings() {
  let savedStrength = 5;
  let savedMode = 'fast';
  try {
    savedStrength = Number(localStorage.getItem(SPIN_STRENGTH_KEY) || 5);
    savedMode = localStorage.getItem(SPIN_MODE_KEY) || 'fast';
  } catch (e) {}
  spinStrength = Math.max(1, Math.min(10, Number.isFinite(savedStrength) ? savedStrength : 5));
  spinStrengthSlider.value = String(spinStrength);
  spinStrengthValue.textContent = String(spinStrength);
  applySpinMode(savedMode);
}

spinStrengthSlider.addEventListener('input', event => {
  spinStrength = Number(event.target.value);
  spinStrengthValue.textContent = String(spinStrength);
  try { localStorage.setItem(SPIN_STRENGTH_KEY, String(spinStrength)); } catch (e) {}
});
spinModeButtons.forEach(button => button.addEventListener('click', () => applySpinMode(button.dataset.spinMode)));
loadSpinSettings();

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
    if (page === 'battles') {
      renderBattleStakeOptions();
      drawBattleWheel();
      void loadBattles();
    }
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

async function addBalance(amount) {
  if (!currentUser || !supabaseClient) return false;
  const { data, error } = await supabaseClient.rpc('credit_game_balance', { p_amount: amount });
  if (error) {
    console.error('Could not credit game balance:', error);
    return false;
  }
  state.balance = Number(data);
  updateBalanceUI(true);
  return true;
}

async function spendBalance(amount) {
  if (!currentUser || !supabaseClient) return false;
  const { data, error } = await supabaseClient.rpc('spend_game_balance', { p_amount: amount });
  if (error) {
    console.error('Could not spend game balance:', error);
    return false;
  }
  if (data === null) return false;
  state.balance = Number(data);
  updateBalanceUI();
  return true;
}

async function refreshWallet() {
  if (!currentUser || !supabaseClient) return;
  const userId = currentUser.id;
  const { data, error } = await supabaseClient.from('wallets').select('balance').eq('user_id', userId).single();
  if (error) {
    console.warn('Could not refresh wallet:', error);
    return;
  }
  if (currentUser?.id !== userId) return;
  const nextBalance = Number(data.balance);
  if (nextBalance !== state.balance) {
    state.balance = nextBalance;
    updateBalanceUI(true);
    if ($('page-profile').classList.contains('active')) renderProfile();
  }
}

async function renderAdminUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  const { data, error } = await supabaseClient.rpc('admin_list_players');
  if (error) {
    adminUsersEl.innerHTML = '<tr><td colspan="5">Не удалось загрузить список игроков.</td></tr>';
    console.error('Could not load admin player list:', error);
    return;
  }
  adminUsersEl.innerHTML = (data || []).map(user => {
    const promo = user.promo_code === PROMO_CODE ? `${PROMO_CODE} (+${Math.round(PROMO_BONUS_RATE * 100)}%)` : '—';
    return `<tr>
      <td>${escapeHtml(user.player_id)}</td>
      <td>${escapeHtml(user.username)}${user.role === 'admin' ? ' <span class="admin-tag">админ</span>' : ''}</td>
      <td>${escapeHtml(promo)}</td>
      <td>${fmt(Number(user.balance))}</td>
      <td><form class="admin-grant-form" data-player-id="${escapeHtml(user.player_id)}">
        <input class="admin-amount" type="number" min="0.01" max="100000000" step="0.01" placeholder="Демо-рубли" aria-label="Количество демо-рублей">
        <button class="btn-small" type="submit">Начислить</button>
      </form></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5">Пользователей пока нет.</td></tr>';
}

adminUsersEl.addEventListener('submit', async event => {
  const form = event.target.closest('.admin-grant-form');
  if (!form) return;
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') return;
  const amountInput = form.querySelector('.admin-amount');
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    adminFeedback.textContent = 'Укажите сумму от 0,01 до 100 000 000 демо-рублей.';
    adminFeedback.classList.add('show');
    return;
  }
  const playerId = Number(form.dataset.playerId);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const { data, error } = await supabaseClient.rpc('admin_grant_demo_credits', {
    p_player_id: playerId,
    p_amount: amount
  });
  button.disabled = false;
  if (error) {
    adminFeedback.textContent = 'Не удалось начислить демо-рубли. Проверьте права администратора и соединение.';
    adminFeedback.classList.add('show');
    console.error('Admin grant failed:', error);
    return;
  }
  adminFeedback.textContent = `Начислено ${fmt(Number(data.amount))}${Number(data.bonus) ? ` + бонус ${fmt(Number(data.bonus))} по ${PROMO_CODE}` : ''} игроку ${data.username} (ID ${data.player_id}).`;
  adminFeedback.classList.add('show');
  amountInput.value = '';
  await renderAdminUsers();
  if (String(currentUser.playerId) === String(data.player_id)) {
    await refreshWallet();
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

function getSelectedBetItems() {
  const ids = Array.isArray(state.betItemIds) ? state.betItemIds : [];
  return ids.map(id => state.inventory.find(item => item.instanceId === id)).filter(Boolean);
}

function makeBetData(items) {
  if (!items.length) return null;
  const first = items[0];
  return {
    id: first.catalogId,
    catalogId: first.catalogId,
    instanceIds: items.map(item => item.instanceId),
    items,
    name: items.length === 1 ? first.name : `${items.length} скина`,
    price: Math.round(items.reduce((sum, item) => sum + Number(item.price || 0), 0) * 100) / 100,
    img: first.img,
    rarity: first.rarity
  };
}

function updateBetSelection({ persist = true } = {}) {
  const selected = getSelectedBetItems();
  state.betItemIds = selected.map(item => item.instanceId);
  state.betId = selected[0]?.catalogId || null;
  betData = makeBetData(selected);
  betSelectionStatus.textContent = selected.length
    ? `Ставка: ${selected.length} ${selected.length === 1 ? 'скин' : 'скина'} · ${fmt(betData.price)}`
    : 'Выбери скин в инвентаре';
  renderSlot(betSlot, betData);
  updateChance();
  renderMyInventory();
  renderTargets();
  renderInventory();
  if (persist) void saveState();
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
  const title = item.items?.length > 1
    ? `${item.items.length} скина: ${item.items.slice(0, 2).map(skin => escapeHtml(skin.name)).join(' + ')}${item.items.length > 2 ? ' …' : ''}`
    : escapeHtml(item.name);
  slotEl.innerHTML = `
    <img src="${item.img}" alt="">
    <div class="item-name">${title}</div>
    <div class="item-price">${fmt(item.price)}</div>
  `;
}

function restoreSlotsFromState() {
  if (!SKINS_CATALOG.length) return;

  state.betItemIds = (state.betItemIds || []).filter(id => state.inventory.some(item => item.instanceId === id));
  if (!state.betItemIds.length && state.betId) {
    const legacyBet = state.inventory.find(item => item.catalogId === state.betId);
    if (legacyBet) state.betItemIds = [legacyBet.instanceId];
  }
  state.betId = state.betItemIds.length
    ? state.inventory.find(item => item.instanceId === state.betItemIds[0])?.catalogId || null
    : null;
  betData = makeBetData(getSelectedBetItems());
  betSelectionStatus.textContent = betData
    ? `Ставка: ${betData.items.length} ${betData.items.length === 1 ? 'скин' : 'скина'} · ${fmt(betData.price)}`
    : 'Выбери скин в инвентаре';
  renderSlot(betSlot, betData);

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
  const selected = source === 'catalog' && state.inventory.some(inv => inv.catalogId === item.id && state.betItemIds.includes(inv.instanceId));
  if (selected) card.classList.add('active');

  card.innerHTML = `
    ${owned ? '<div class="card-badge owned">✓</div>' : (source === 'catalog' ? '<div class="card-badge buy">₽</div>' : '')}
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
        if (owned) selectBet(state.inventory.find(inv => inv.catalogId === item.id));
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
  renderBattleStakeOptions();

  if (state.inventory.length === 0) {
    myInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Пусто. Купи скин в каталоге слева.</div>';
    return;
  }

  state.inventory.forEach((inv, i) => {
    const card = document.createElement('div');
    const selected = state.betItemIds.includes(inv.instanceId);
    card.className = 'inv-card' + (selected ? ' active selected-bet' : '');
    card.innerHTML = `
      ${selected ? '<div class="card-badge owned">Ставка</div>' : (multiSelectMode ? '<div class="card-badge buy">+</div>' : '')}
      <div class="item-img"><img src="${inv.img}" alt=""></div>
      <div class="item-name" title="${inv.name}">${inv.name}</div>
      <div class="item-price">${fmt(inv.price)}</div>
    `;
    card.addEventListener('click', () => selectBet(inv));
    card.style.animationDelay = (i * 0.01) + 's';
    myInventory.appendChild(card);
  });
}

function renderBattleStakeOptions() {
  if (!battleSkinSelect || !createBattleBtn) return;
  const oldValue = battleSkinSelect.value;
  battleSkinSelect.innerHTML = '<option value="">Выбери скин для ставки</option>' + state.inventory.map(item =>
    `<option value="${escapeHtml(item.instanceId)}">${escapeHtml(item.name)} — ${fmt(item.price)}</option>`
  ).join('');
  if (state.inventory.some(item => item.instanceId === oldValue)) battleSkinSelect.value = oldValue;
  createBattleBtn.disabled = !state.inventory.length;
}

function drawBattleWheel() {
  if (!battleWheelCtx) return;
  const size = battleWheelCanvas.width;
  const radius = size / 2;
  const cx = radius, cy = radius;
  battleWheelCtx.clearRect(0, 0, size, size);
  battleWheelCtx.beginPath();
  battleWheelCtx.moveTo(cx, cy);
  battleWheelCtx.arc(cx, cy, radius - 4, Math.PI / 2, Math.PI * 1.5);
  battleWheelCtx.closePath();
  battleWheelCtx.fillStyle = '#4ade80';
  battleWheelCtx.fill();
  battleWheelCtx.beginPath();
  battleWheelCtx.moveTo(cx, cy);
  battleWheelCtx.arc(cx, cy, radius - 4, -Math.PI / 2, Math.PI / 2);
  battleWheelCtx.closePath();
  battleWheelCtx.fillStyle = '#f5f5f5';
  battleWheelCtx.fill();
  battleWheelCtx.strokeStyle = '#080808';
  battleWheelCtx.lineWidth = 3;
  battleWheelCtx.beginPath();
  battleWheelCtx.moveTo(cx, 4);
  battleWheelCtx.lineTo(cx, size - 4);
  battleWheelCtx.stroke();
  battleWheelCtx.beginPath();
  battleWheelCtx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
  battleWheelCtx.stroke();
}

function showBattleOutcome(battle, animate = true) {
  if (!battle?.id || lastBattleResults.has(battle.id)) return;
  lastBattleResults.add(battle.id);
  const targetAngle = battle.winner_side === 'creator' ? 90 : 270;
  if (animate) {
    const startAngle = battleWheelAngle % 360;
    const delta = ((targetAngle - startAngle + 360) % 360) + 5 * 360;
    battleWheelAngle += delta;
    battleWheel.style.transition = 'transform 5.2s cubic-bezier(0.08, 0.72, 0.12, 1)';
    battleWheel.style.transform = `rotate(${battleWheelAngle}deg)`;
  } else {
    battleWheel.style.transition = 'none';
    battleWheelAngle = targetAngle;
    battleWheel.style.transform = `rotate(${targetAngle}deg)`;
  }
  battleResult.textContent = `🏆 ${battle.winner_name || 'Игрок'} забирает оба скина из банка (${fmt(Number(battle.bank_value || 0))})`;
  battleResult.classList.add('is-winner');
}

function renderBattleCard(battle) {
  const creatorSkin = battle.creator_skin || {};
  const guestSkin = battle.guest_skin || {};
  const waiting = battle.status === 'waiting';
  const ownBattle = battle.creator_user_id === currentUser.id;
  const skins = [creatorSkin, guestSkin].filter(Boolean);
  const bankValue = skins.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const guestName = battle.guest_name || 'Ждёт соперника';
  const creatorMarkup = `
    <div class="battle-side creator-side">
      <span class="battle-side-label">Создатель · зелёная</span>
      <strong>${escapeHtml(battle.creator_name)}</strong>
      <img src="${escapeHtml(creatorSkin.img || '')}" alt="">
      <span>${escapeHtml(creatorSkin.name || 'Скин')}</span>
      <small>${fmt(Number(creatorSkin.price || 0))}</small>
    </div>`;
  const guestMarkup = waiting
    ? `<div class="battle-side guest-side waiting-side"><span class="battle-side-label">Гость · белая</span><strong>${escapeHtml(guestName)}</strong><span>Открыто для входа</span></div>`
    : `<div class="battle-side guest-side">
      <span class="battle-side-label">Гость · белая</span>
      <strong>${escapeHtml(guestName)}</strong>
      <img src="${escapeHtml(guestSkin.img || '')}" alt="">
      <span>${escapeHtml(guestSkin.name || 'Скин')}</span>
      <small>${fmt(Number(guestSkin.price || 0))}</small>
    </div>`;
  let action = '';
  if (waiting && !ownBattle) {
    action = `<button type="button" class="btn-small battle-join-btn" data-battle-id="${escapeHtml(battle.id)}" ${state.inventory.length ? '' : 'disabled'}>Вступить на выбранный скин</button>`;
  } else if (waiting) {
    action = `<button type="button" class="btn-small danger battle-cancel-btn" data-battle-id="${escapeHtml(battle.id)}">Отменить и вернуть скин</button>`;
  } else {
    action = `<div class="battle-winner-line">${battle.status === 'completed' ? `Победитель: ${escapeHtml(battle.winner_name || '—')}` : 'Батл отменён'}</div>`;
  }
  const stateLabel = waiting ? 'Открыт' : (battle.status === 'completed' ? 'Завершён' : 'Отменён');
  return `<article class="battle-card ${waiting ? 'battle-open' : 'battle-finished'}">
    <div class="battle-card-head"><span>Батл ${escapeHtml(String(battle.id).slice(0, 8))}</span><span>${stateLabel}</span></div>
    <div class="battle-matchup">${creatorMarkup}<div class="battle-vs"><strong>VS</strong><span>Банк<br>${fmt(bankValue)}</span></div>${guestMarkup}</div>
    <div class="battle-card-actions">${action}</div>
  </article>`;
}

let battleStatuses = new Map();

async function loadBattles() {
  if (!currentUser || !supabaseClient || battlePollInFlight) return;
  battlePollInFlight = true;
  try {
    const { data, error } = await supabaseClient.from('skin_battles')
      .select('id, creator_user_id, creator_name, creator_skin, guest_user_id, guest_name, guest_skin, status, winner_user_id, winner_name, winner_side, bank_value, created_at')
      .order('created_at', { ascending: false }).limit(40);
    if (error) throw error;
    const battles = data || [];
    if (!battles.length) battleList.innerHTML = '<div class="battle-empty">Открытых батлов пока нет. Создай первый!</div>';
    else battleList.innerHTML = battles.map(renderBattleCard).join('');

    let currentUserWon = false;
    battles.forEach(battle => {
      const previous = battleStatuses.get(battle.id);
      if (battle.status === 'completed' && previous === 'waiting') {
        showBattleOutcome({ ...battle, bank_value: Number(battle.bank_value || 0) });
        currentUserWon ||= battle.winner_user_id === currentUser.id;
      }
      if (battle.status === 'completed') lastBattleResults.add(battle.id);
      battleStatuses.set(battle.id, battle.status);
    });
    if (currentUserWon) {
      await loadUserState();
      renderMyInventory();
      renderProfile();
      restoreSlotsFromState();
    }
  } catch (error) {
    console.error('Could not load battles:', error);
    battleList.innerHTML = '<div class="battle-empty">Батлы пока не подключены к базе. Примените файл supabase/skin-battles.sql.</div>';
  } finally {
    battlePollInFlight = false;
  }
}

createBattleBtn.addEventListener('click', async () => {
  const inventoryItemId = battleSkinSelect.value;
  if (!inventoryItemId) {
    battleFeedback.textContent = 'Сначала выбери скин из инвентаря.';
    return;
  }
  createBattleBtn.disabled = true;
  battleFeedback.textContent = 'Создаю батл…';
  const { data, error } = await supabaseClient.rpc('create_skin_battle', { p_inventory_item_id: inventoryItemId });
  if (error) {
    battleFeedback.textContent = error.message.includes('Could not find the function')
      ? 'Батлы ещё не включены в базе. Примените SQL-файл из папки supabase.'
      : 'Не удалось создать батл. Возможно, выбранный скин уже использован.';
    createBattleBtn.disabled = !state.inventory.length;
    return;
  }
  await loadUserState();
  renderMyInventory();
  renderProfile();
  restoreSlotsFromState();
  battleFeedback.textContent = 'Батл открыт для соперника.';
  await loadBattles();
});

refreshBattlesBtn.addEventListener('click', () => void loadBattles());
battleList.addEventListener('click', async event => {
  const joinButton = event.target.closest('.battle-join-btn');
  const cancelButton = event.target.closest('.battle-cancel-btn');
  if (!joinButton && !cancelButton) return;
  const button = joinButton || cancelButton;
  if (button.disabled) return;
  const battleId = button.dataset.battleId;
  button.disabled = true;
  if (joinButton) {
    if (!battleSkinSelect.value) {
      battleFeedback.textContent = 'Выбери скин для ставки в форме выше.';
      button.disabled = false;
      return;
    }
    const { data, error } = await supabaseClient.rpc('join_skin_battle', {
      p_battle_id: battleId,
      p_inventory_item_id: battleSkinSelect.value
    });
    if (error) {
      battleFeedback.textContent = error.message.includes('already started')
        ? 'Этот батл уже начался. Обнови список.'
        : 'Не удалось вступить. Возможно, батл уже закрыт.';
    } else {
      await loadUserState();
      renderMyInventory();
      renderProfile();
      restoreSlotsFromState();
      showBattleOutcome(data);
      battleFeedback.textContent = 'Результат батла рассчитан сервером с шансом 50/50.';
    }
  } else {
    const { error } = await supabaseClient.rpc('cancel_skin_battle', { p_battle_id: battleId });
    battleFeedback.textContent = error ? 'Не удалось отменить батл.' : 'Батл отменён, скин возвращён.';
    if (error) console.error('Could not cancel battle:', error);
    if (!error) {
      await loadUserState();
      renderMyInventory();
      renderProfile();
      restoreSlotsFromState();
    }
  }
  button.disabled = false;
  await loadBattles();
});

setInterval(() => {
  if ($('page-battles').classList.contains('active')) void loadBattles();
}, 5000);

// ============================================================
// ВЫБОР
// ============================================================
function selectBet(item) {
  if (spinning || !item) return;
  const inventoryItem = item.instanceId
    ? item
    : state.inventory.find(inv => inv.catalogId === (item.id || item.catalogId));
  if (!inventoryItem) return;

  const selected = new Set(state.betItemIds || []);
  if (multiSelectMode) {
    if (selected.has(inventoryItem.instanceId)) selected.delete(inventoryItem.instanceId);
    else selected.add(inventoryItem.instanceId);
    state.betItemIds = [...selected];
  } else {
    state.betItemIds = [inventoryItem.instanceId];
  }
  updateBetSelection();
}

multiBetToggle.addEventListener('click', () => {
  multiSelectMode = !multiSelectMode;
  multiBetToggle.classList.toggle('active', multiSelectMode);
  multiBetToggle.setAttribute('aria-pressed', String(multiSelectMode));
  multiBetToggle.textContent = multiSelectMode ? 'Готово с выбором' : 'Выбрать несколько';
  betSelectionStatus.textContent = multiSelectMode
    ? `Выбери скины в инвентаре${state.betItemIds.length ? ` · отмечено: ${state.betItemIds.length}` : ''}`
    : (betData ? `Ставка: ${betData.items.length} ${betData.items.length === 1 ? 'скин' : 'скина'} · ${fmt(betData.price)}` : 'Выбери скин в инвентаре');
  renderMyInventory();
});

function selectTarget(item) {
  if (spinning) return;
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

modalConfirm.addEventListener('click', async () => {
  if (!pendingBuy) return;
  const { item } = pendingBuy;

  if (!await spendBalance(item.price)) {
    warningEl.textContent = '⚠ Недостаточно демо-рублей или нет связи с базой';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    closeBuyModal();
    return;
  }

  state.inventory.push({
    instanceId: makeInstanceId(),
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

sellConfirm.addEventListener('click', async () => {
  if (!pendingSell) return;
  const { invIndex } = pendingSell;
  const item = state.inventory[invIndex];
  if (!item) { closeSellModal(); return; }

  const receive = Math.round(item.price * (1 - SELL_COMMISSION) * 100) / 100;

  if (!await addBalance(receive)) {
    warningEl.textContent = '⚠ Не удалось зачислить демо-рубли. Проверьте соединение.';
    warningEl.classList.add('show');
    closeSellModal();
    return;
  }

  state.inventory.splice(invIndex, 1);

  if ((state.betItemIds || []).includes(item.instanceId)) {
    state.betItemIds = state.betItemIds.filter(id => id !== item.instanceId);
    betData = makeBetData(getSelectedBetItems());
    state.betId = state.betItemIds.length ? state.inventory.find(inv => inv.instanceId === state.betItemIds[0])?.catalogId || null : null;
    renderSlot(betSlot, betData);
    betSelectionStatus.textContent = betData
      ? `Ставка: ${betData.items.length} ${betData.items.length === 1 ? 'скин' : 'скина'} · ${fmt(betData.price)}`
      : 'Выбери скин в инвентаре';
  }

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
    'Обменять всё на демо-рубли?',
    `Вы обменяете ${state.inventory.length} скин(ов) на ${fmt(total)} (комиссия ${Math.round(SELL_COMMISSION*100)}% уже учтена).`,
    async () => {
      if (!await addBalance(total)) {
        warningEl.textContent = '⚠ Не удалось зачислить демо-рубли. Инвентарь сохранён.';
        warningEl.classList.add('show');
        return;
      }
      state.inventory = [];
      state.betId = null;
      state.betItemIds = [];
      betData = null;
      betSelectionStatus.textContent = 'Выбери скин в инвентаре';
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
    'Инвентарь и лучший дроп будут удалены. Баланс и аккаунт сохранятся.',
    () => {
      state = { ...state, inventory: [], betId: null, betItemIds: [], targetName: null, bestDrop: null };
      betData = null;
      targetData = null;
      betSelectionStatus.textContent = 'Выбери скин в инвентаре';
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

  const wagerItems = getSelectedBetItems();
  if (!wagerItems.length || wagerItems.length !== betData.items.length) {
    warningEl.textContent = '⚠ Проверь выбранные скины в инвентаре';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    return;
  }
  const wagerData = betData;
  const prizeData = targetData;

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

  const fullSpins = 2 + Number(spinStrength) + Math.floor(Math.random() * 3);
  const startAngle = rotorAngle % 360;
  const delta = ((finalAngle - startAngle + 360) % 360) + fullSpins * 360;
  const newAngle = rotorAngle + delta;
  const duration = spinMode === 'slow' ? 9000 : 4200;

  rotor.style.transition = spinMode === 'slow'
    ? `transform ${duration}ms cubic-bezier(0.08, 0.72, 0.12, 1)`
    : `transform ${duration}ms cubic-bezier(0.15, 0.65, 0.15, 1)`;
  rotor.style.transform = `rotate(${newAngle}deg)`;
  rotorAngle = newAngle;

  setTimeout(() => {
    spinning = false;
    upgradeBtn.disabled = false;

    const wagerIds = new Set(wagerItems.map(item => item.instanceId));
    state.inventory = state.inventory.filter(item => !wagerIds.has(item.instanceId));

    if (win) {
      state.inventory.push({
        instanceId: makeInstanceId(),
        catalogId: prizeData.id,
        name: prizeData.name,
        price: prizeData.price,
        img: prizeData.img,
        rarity: prizeData.rarity
      });

      if (!state.bestDrop || prizeData.price > state.bestDrop.price) {
        state.bestDrop = {
          name: prizeData.name,
          price: prizeData.price,
          img: prizeData.img
        };
      }

      resultEl.textContent = `🎉 ПОБЕДА! ${prizeData.name}`;
      resultEl.classList.add('show', 'win');
      playWinSound();
    } else {
      resultEl.textContent = `💀 Проигрыш. ${wagerItems.length} ${wagerItems.length === 1 ? 'скин потерян' : 'скина потеряны'}`;
      resultEl.classList.add('show', 'lose');
    }

    betData = null;
    targetData = null;
    state.betId = null;
    state.betItemIds = [];
    state.targetName = null;
    betSelectionStatus.textContent = 'Выбери скин в инвентаре';
    saveState();

    renderSlot(betSlot, null);
    renderSlot(targetSlot, null);
    updateChance();
    renderMyInventory();
    renderInventory();
    renderTargets();
    if ($('page-profile').classList.contains('active')) renderProfile();
  }, duration + 100);
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
async function initSession() {
  if (!supabaseClient) {
    backendSetupHint.textContent = 'Общая база ещё не подключена. Владелец сайта должен настроить Supabase по инструкции в папке supabase.';
    authSubmit.disabled = true;
    showAuthScreen();
    return;
  }
  backendSetupHint.textContent = '';
  authSubmit.disabled = false;
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) {
      await loginAs(data.session.user);
    } else {
      showAuthScreen();
    }
  } catch (error) {
    console.error('Could not restore Supabase session:', error);
    showAuthScreen();
    showAuthError('Не удалось подключиться к общей базе. Проверьте настройки Supabase.');
  }
}
void initSession();

setInterval(() => { void refreshWallet(); }, 10000);

loadSkins();

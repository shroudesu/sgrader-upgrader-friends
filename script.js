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
function calcPrice(item, catalogType = 'skin') {
  const rarityName = item.rarity?.name || 'Mil-Spec Grade';
  const demoItemBasePrices = {
    agents: { Distinguished: 2500, Exceptional: 5000, Superior: 10000, Master: 20000 },
    graffiti: { 'Base Grade': 5, 'High Grade': 40, Remarkable: 250, Exotic: 1500 },
    music_kits: { 'High Grade': 300 },
    stickers: { Default: 10, 'High Grade': 40, Remarkable: 250, Exotic: 1500, Extraordinary: 8000, Contraband: 80000 },
  };
  let price;
  if (catalogType !== 'skin') {
    price = demoItemBasePrices[catalogType]?.[rarityName] || 40;
    if (catalogType === 'stickers') {
      const stickerName = String(item.name || '');
      const effect = String(item.effect || '');
      if (/katowice\s*2014/i.test(stickerName)) price *= /holo/i.test(effect + stickerName) ? 1200 : 40;
      else if (/cologne\s*2014|katowice\s*2015/i.test(stickerName)) price *= /holo/i.test(effect + stickerName) ? 80 : 10;
      else if (/holo|gold/i.test(effect + stickerName)) price *= 2.5;
      else if (/foil/i.test(effect + stickerName)) price *= 1.5;
    }
    return Math.round(price * stableCatalogFactor(item.id || item.name));
  }

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

    price = base * knifeWear * patternMult;
    if (item.stattrak) price *= 1.45;
    if (item.souvenir) price *= 1.2;
    return Math.round(price * stableCatalogFactor(item.id || item.name));
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
    price = base * wearMult * patternMult;
    if (item.stattrak) price *= 1.35;
    return Math.round(price * stableCatalogFactor(item.id || item.name));
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

  price = base * wearMult;
  if (item.stattrak) price *= 1.4;
  if (item.souvenir) price *= 1.25;
  return Math.max(1, Math.round(price * stableCatalogFactor(item.id || item.name)));
}

function stableCatalogFactor(value) {
  const text = String(value || 'cs2-item');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 0.94 + ((hash >>> 0) % 1201) / 10000;
}

const SELL_COMMISSION = 0.10;

// ============================================================
// КЛЮЧИ ХРАНИЛИЩА
// ============================================================
const VOLUME_KEY = 'cs2up_volume';
const SPIN_STRENGTH_KEY = 'cs2up_spin_strength';
const SPIN_MODE_KEY = 'cs2up_spin_mode';
const CURRENCY_KEY = 'cs2up_currency';
const TELEGRAM_URL = 'https://t.me/perkasanya';
const RUB_PER_USD = 90;
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
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');
const currencySelect = document.getElementById('currencySelect');
const passwordChangeForm = document.getElementById('passwordChangeForm');
const settingsFeedback = document.getElementById('settingsFeedback');
const avatarFile = document.getElementById('avatarFile');
const headerAvatarImage = document.getElementById('headerAvatarImage');
const headerAvatarFallback = document.getElementById('headerAvatarFallback');
const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
const catalogToggle = document.getElementById('catalogToggle');
const catalogTools = document.getElementById('catalogTools');
const upgradeInventoryPanel = document.getElementById('upgradeInventoryPanel');
const upgradeInventoryTitle = document.getElementById('upgradeInventoryTitle');
const adminNav = document.getElementById('adminNav');
const adminUsersEl = document.getElementById('adminUsers');
const adminFeedback = document.getElementById('adminFeedback');
const telegramLink = document.getElementById('telegramLink');
const promoStatus = document.getElementById('promoStatus');
const topupRequestForm = document.getElementById('topupRequestForm');
const topupAmountInput = document.getElementById('topupAmount');
const topupMethodSelect = document.getElementById('topupMethod');
const topupFeedback = document.getElementById('topupFeedback');
const betSelectionStatus = document.getElementById('betSelectionStatus');
const buySelectedBtn = document.getElementById('buySelectedBtn');
const refreshUpgradeFeedBtn = document.getElementById('refreshUpgradeFeedBtn');
const upgradeFeed = document.getElementById('upgradeFeed');
const spinStrengthSlider = document.getElementById('spinStrength');
const spinStrengthValue = document.getElementById('spinStrengthValue');
const spinModeButtons = document.querySelectorAll('.spin-mode');
const targetShortcutButtons = document.querySelectorAll('.target-shortcut');
const openCreateBattleBtn = document.getElementById('openCreateBattleBtn');
const battlePickerModal = document.getElementById('battlePickerModal');
const battlePickerTitle = document.getElementById('battlePickerTitle');
const battlePickerHelp = document.getElementById('battlePickerHelp');
const battlePickerGrid = document.getElementById('battlePickerGrid');
const battlePickerStatus = document.getElementById('battlePickerStatus');
const battlePickerFeedback = document.getElementById('battlePickerFeedback');
const battlePickerCancel = document.getElementById('battlePickerCancel');
const battlePickerConfirm = document.getElementById('battlePickerConfirm');
const battleRoomModal = document.getElementById('battleRoomModal');
const battleRoomMinimize = document.getElementById('battleRoomMinimize');
const battleRoomStatus = document.getElementById('battleRoomStatus');
const battleRoomBank = document.getElementById('battleRoomBank');
const battleRoomCancel = document.getElementById('battleRoomCancel');
const battleFeedback = document.getElementById('battleFeedback');
const battleList = document.getElementById('battleList');
const myBattleArchive = document.getElementById('myBattleArchive');
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
const inventoryBalanceEl = $('inventoryBalance');
const inventoryGrid = $('inventoryGrid');
const invSearch = $('invSearch');
const invPriceFrom = $('invPriceFrom');
const invPriceTo = $('invPriceTo');
const invSort = $('invSort');
const invCount = $('invCount');
const invLoading = $('invLoading');
const catalogSourceNote = $('catalogSourceNote');
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
const publicProfileModal = $('publicProfileModal');
const publicProfileName = $('publicProfileName');
const publicProfileAvatar = $('publicProfileAvatar');
const publicProfilePlayerId = $('publicProfilePlayerId');
const publicProfileStats = $('publicProfileStats');
const publicProfileBestDrop = $('publicProfileBestDrop');
const publicProfileInventory = $('publicProfileInventory');
const publicProfileFeedback = $('publicProfileFeedback');

const buyModal = $('buyModal');
const modalTitle = $('modalTitle');
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
let displayCurrency = (() => {
  try { return localStorage.getItem(CURRENCY_KEY) === 'USD' ? 'USD' : 'RUB'; } catch (e) { return 'RUB'; }
})();
let catalogMode = false;
const marketSelection = new Set();
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
let catalogLoaded = false;
let catalogReleaseYear = String(new Date().getFullYear());
let betData = null;
let targetData = null;
let currentChance = 0;
let spinning = false;
let rotorAngle = 0;
let pendingBuy = null;
let pendingSell = null;
let pendingConfirm = null;
let winVolume = 0.7;
let spinStrength = 5;
let spinMode = 'fast';
let battleWheelAngle = 0;
let lastBattleResults = new Set();
let queuedBattleResults = new Set();
let deferredBattleResults = new Set();
let battleOutcomeQueue = [];
let battleAnimationInProgress = false;
let latestBattles = [];
let selectedBattleSkinId = null;
let battlePickerMode = 'create';
let battlePickerBattleId = null;
let activeBattleRoom = null;
let battleCountdownInterval = null;
let battleRoomCloseTimer = null;
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
  const rubles = Number(n || 0);
  if (displayCurrency === 'USD') return '$' + (rubles / RUB_PER_USD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return rubles.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

function amountToRub(amount) {
  const numeric = Number(amount || 0);
  return Math.round((displayCurrency === 'USD' ? numeric * RUB_PER_USD : numeric) * 100) / 100;
}

function renderCurrencyLabels() {
  const symbol = displayCurrency === 'USD' ? '$' : '₽';
  document.querySelectorAll('[data-currency-symbol]').forEach(element => { element.textContent = symbol; });
  document.querySelectorAll('[data-price-placeholder]').forEach(element => {
    element.placeholder = `${element.dataset.pricePlaceholder} ${symbol}`;
  });
}

function formatChance(percent) {
  if (percent < 0.1) return `${percent.toFixed(2).padStart(5, '0')}%`;
  const formatted = percent.toFixed(1);
  return `${percent < 10 ? formatted.padStart(4, '0') : formatted}%`;
}

function catalogEffect(item) {
  const directEffect = typeof item.effect === 'string' ? item.effect : item.effect?.name;
  if (directEffect) return directEffect;
  return String(item.name || '').match(/\((Holo|Foil|Gold|Glitter|Lenticular|Embroidered|Patch|Paper)\)/i)?.[1] || null;
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
  marketSelection.clear();
  if (migrateCatalogIdsInInventory()) await saveState();

  authScreen.classList.add('hide');
  appEl.style.display = 'block';
  userNameEl.textContent = currentUser.username;
  playerIdEl.textContent = `ID игрока: ${currentUser.playerId}`;
  renderHeaderAvatar();
  currencySelect.value = displayCurrency;
  renderCurrencyLabels();
  adminNav.style.display = currentUser.role === 'admin' ? '' : 'none';
  telegramLink.href = TELEGRAM_URL;
  topupFeedback.textContent = '';
  promoStatus.textContent = currentUser.promoCode === PROMO_CODE
    ? `Промокод ${PROMO_CODE} активен: +10% к начислению.`
    : 'Промокод SGRADER можно применить только при регистрации.';

  updateBalanceUI();
  renderInventory();
  renderTargets();
  renderMyInventory();
  restoreSlotsFromState();
  renderProfile();
  void loadUpgradeFeed();
  if (currentUser.role === 'admin') await renderAdminUsers();
}

topupRequestForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!currentUser) return;

  const enteredAmount = Number(topupAmountInput.value);
  const amount = amountToRub(enteredAmount);
  if (!Number.isFinite(enteredAmount) || enteredAmount <= 0 || amount > 100000000) {
    topupFeedback.textContent = 'Укажи допустимую сумму.';
    return;
  }

  const method = topupMethodSelect.value;
  const promoText = currentUser.promoCode === PROMO_CODE ? ` Промокод: ${PROMO_CODE} (+10%).` : '';
  const message = [
    'Заявка на пополнение игрового баланса. Платёж не проводится.',
    `Игрок: ${currentUser.username}`,
    `ID игрока: ${currentUser.playerId}`,
    `Запрошено: ${fmt(amount)}`,
    `Способ: ${method}.${promoText}`
  ].join('\n');
  const url = `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  topupFeedback.textContent = 'Открылся Telegram с подготовленным текстом. Проверь его и нажми «Отправить».';
});

logoutBtn.addEventListener('click', async () => {
  await stateSaveQueue;
  if (supabaseClient) await supabaseClient.auth.signOut();
  closeSettings();
  currentUser = null;
  marketSelection.clear();
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

function renderHeaderAvatar() {
  const avatar = state.avatar || '';
  headerAvatarImage.src = avatar;
  headerAvatarImage.hidden = !avatar;
  headerAvatarFallback.hidden = !!avatar;
  settingsAvatarPreview.src = avatar || '';
  settingsAvatarPreview.classList.toggle('has-avatar', !!avatar);
}

function openSettings() {
  if (!currentUser) return;
  settingsFeedback.textContent = '';
  currencySelect.value = displayCurrency;
  renderHeaderAvatar();
  settingsModal.classList.add('show');
  settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsModal.classList.remove('show');
  settingsModal.setAttribute('aria-hidden', 'true');
  settingsFeedback.textContent = '';
  passwordChangeForm.reset();
}

settingsBtn.addEventListener('click', openSettings);
document.getElementById('headerAvatarButton').addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', event => { if (event.target === settingsModal) closeSettings(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && settingsModal.classList.contains('show')) closeSettings(); });

currencySelect.addEventListener('change', () => {
  displayCurrency = currencySelect.value === 'USD' ? 'USD' : 'RUB';
  try { localStorage.setItem(CURRENCY_KEY, displayCurrency); } catch (e) {}
  renderCurrencyLabels();
  updateBalanceUI();
  if ($('page-profile').classList.contains('active')) renderProfile();
  if ($('page-admin').classList.contains('active')) void renderAdminUsers();
  renderInventory(); renderTargets(); renderMyInventory();
  updateChance();
});

async function resizeAvatarFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Выбери PNG, JPEG или WebP изображение.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Размер изображения должен быть не больше 5 МБ.');
  const source = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const size = 192;
  const scale = Math.min(1, size / Math.max(source.width, source.height));
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}

avatarFile.addEventListener('change', async () => {
  const file = avatarFile.files?.[0];
  if (!file || !currentUser) return;
  settingsFeedback.textContent = 'Обрабатываю изображение…';
  try {
    state.avatar = await resizeAvatarFile(file);
    await saveState();
    renderHeaderAvatar();
    settingsFeedback.textContent = 'Аватар обновлён.';
  } catch (error) {
    settingsFeedback.textContent = error.message || 'Не удалось загрузить изображение.';
  } finally {
    avatarFile.value = '';
  }
});

passwordChangeForm.addEventListener('submit', async event => {
  event.preventDefault();
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmation = document.getElementById('newPasswordConfirm').value;
  if (!currentUser || !supabaseClient) return;
  if (newPassword.length < 6) { settingsFeedback.textContent = 'Новый пароль должен содержать не меньше 6 символов.'; return; }
  if (newPassword !== confirmation) { settingsFeedback.textContent = 'Новые пароли не совпадают.'; return; }
  const submit = passwordChangeForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  settingsFeedback.textContent = 'Проверяю старый пароль…';
  try {
    const email = usernameAuthEmail(currentUser.username);
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({ email, password: oldPassword });
    if (verifyError) throw new Error('Старый пароль неверный.');
    const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
    settingsFeedback.textContent = 'Пароль изменён.';
    passwordChangeForm.reset();
  } catch (error) {
    settingsFeedback.textContent = error.message || 'Не удалось изменить пароль.';
  } finally {
    submit.disabled = false;
  }
});

userNameEl.addEventListener('click', () => activateTab('profile'));

catalogToggle.addEventListener('click', () => {
  catalogMode = !catalogMode;
  upgradeInventoryPanel.classList.toggle('catalog-mode', catalogMode);
  catalogTools.hidden = !catalogMode;
  inventoryGrid.hidden = !catalogMode;
  myInventory.hidden = catalogMode;
  upgradeInventoryTitle.textContent = catalogMode ? 'Каталог предметов' : 'Мой инвентарь';
  catalogToggle.setAttribute('aria-label', catalogMode ? 'Вернуться в инвентарь' : 'Открыть каталог');
  catalogToggle.title = catalogMode ? 'Вернуться в инвентарь' : 'Открыть каталог';
  catalogToggle.querySelector('iconify-icon').setAttribute('icon', catalogMode ? 'mdi:package-variant-closed' : 'mdi:cart-outline');
  updateBuySelectedButton();
  renderInventory(); renderMyInventory();
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
  if (state.betItemIds.length > 1) {
    state.betItemIds = state.betItemIds.slice(0, 1);
    assignedInstanceId = true;
  }
  if (!state.betItemIds.length && state.betId) {
    const legacyBet = state.inventory.find(item => item.catalogId === state.betId);
    if (legacyBet) state.betItemIds = [legacyBet.instanceId];
  }
  if (assignedInstanceId || !Array.isArray(gameStateResult.data.state.betItemIds)) await saveState();
}

function catalogNameKey(value) {
  return normalize(String(value || '').replace(/[’']/g, ''));
}

function migrateCatalogIdsInInventory() {
  if (!catalogLoaded || !state.inventory?.length) return false;

  const currentIds = new Set(SKINS_CATALOG.map(item => String(item.id)));
  const exactIdsByName = new Map();
  const idsByPrefix = new Map();
  for (const item of SKINS_CATALOG) {
    const key = catalogNameKey(item.name);
    if (key && !exactIdsByName.has(key)) exactIdsByName.set(key, item.id);
    const prefix = catalogNameKey(String(item.name || '').split('|')[0]);
    if (prefix) {
      if (!idsByPrefix.has(prefix)) idsByPrefix.set(prefix, new Set());
      idsByPrefix.get(prefix).add(item.id);
    }
  }

  let changed = false;
  for (const item of state.inventory) {
    if (currentIds.has(String(item.catalogId))) continue;
    const key = catalogNameKey(item.name);
    let replacementId = exactIdsByName.get(key);
    if (!replacementId && key) {
      const candidates = SKINS_CATALOG.filter(candidate => {
        if (candidate.catalogType !== 'skin' || candidate.stattrak || candidate.souvenir) return false;
        const candidateKey = catalogNameKey(candidate.name);
        return candidateKey === `${key} field tested` || candidateKey === `${key} minimal wear` || candidateKey === key;
      });
      const fieldTested = candidates.find(candidate => candidate.wear === 'Field-Tested');
      replacementId = fieldTested?.id || candidates[0]?.id;
    }
    if (!replacementId && key && !String(item.name || '').includes('|')) {
      const candidates = idsByPrefix.get(key);
      if (candidates?.size === 1) replacementId = [...candidates][0];
    }
    if (replacementId) {
      item.catalogId = replacementId;
      changed = true;
    }
  }

  if (changed && state.betItemIds?.length) {
    state.betId = state.inventory.find(item => item.instanceId === state.betItemIds[0])?.catalogId || null;
  }
  return changed;
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
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});

function activateTab(page) {
  const tab = document.querySelector(`.nav-tab[data-tab="${page}"]`);
  const panel = $(`page-${page}`);
  if (!tab || !panel) return;
  document.querySelectorAll('.nav-tab').forEach(element => element.classList.remove('active'));
  document.querySelectorAll('.tab-page').forEach(element => element.classList.remove('active'));
  tab.classList.add('active');
  panel.classList.add('active');
  if (page === 'profile') renderProfile();
  if (page === 'admin') void renderAdminUsers();
  if (page === 'battles') { drawBattleWheel(); void loadBattles(); renderBattleList(); renderBattleArchive(); }
}

// ============================================================
// БАЛАНС
// ============================================================
function updateBalanceUI(flash = false) {
  balanceEl.textContent = fmt(state.balance);
  const inventoryValue = state.inventory.reduce((sum, item) => sum + Number(item.price || 0), 0);
  inventoryBalanceEl.textContent = fmt(inventoryValue);
  profInvValue.textContent = fmt(inventoryValue);
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
    adminUsersEl.innerHTML = '<tr><td colspan="6">Не удалось загрузить список игроков.</td></tr>';
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
        <input class="admin-amount" type="number" min="0.01" max="100000000" step="0.01" placeholder="Сумма" aria-label="Сумма начисления">
        <button class="btn-small" type="submit">Начислить</button>
      </form></td>
      <td><form class="admin-debit-form" data-player-id="${escapeHtml(user.player_id)}">
        <input class="admin-amount" type="number" min="0.01" max="100000000" step="0.01" placeholder="Сумма" aria-label="Сумма списания">
        <button class="btn-small danger" type="submit">Снять</button>
      </form></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6">Пользователей пока нет.</td></tr>';
}

adminUsersEl.addEventListener('submit', async event => {
  const form = event.target.closest('.admin-grant-form, .admin-debit-form');
  if (!form) return;
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin') return;
  const debit = form.matches('.admin-debit-form');
  const amountInput = form.querySelector('.admin-amount');
  const amount = amountToRub(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    adminFeedback.textContent = `Укажите допустимую сумму для ${debit ? 'списания' : 'начисления'}.`;
    adminFeedback.classList.add('show');
    return;
  }
  const playerId = Number(form.dataset.playerId);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const { data, error } = await supabaseClient.rpc(debit ? 'admin_debit_demo_credits' : 'admin_grant_demo_credits', {
    p_player_id: playerId,
    p_amount: amount
  });
  button.disabled = false;
  if (error) {
    const isInsufficient = String(error.message || '').toLowerCase().includes('insufficient balance');
    adminFeedback.textContent = isInsufficient
      ? 'Нельзя снять больше, чем есть на балансе игрока.'
      : `Не удалось ${debit ? 'снять' : 'начислить'} баланс. Проверьте права администратора и соединение.`;
    adminFeedback.classList.add('show');
    console.error('Admin grant failed:', error);
    return;
  }
  adminFeedback.textContent = debit
    ? `Снято ${fmt(Number(data.amount))} с баланса игрока ${data.username} (ID ${data.player_id}). Остаток: ${fmt(Number(data.balance))}.`
    : `Начислено ${fmt(Number(data.amount))}${Number(data.bonus) ? ` + бонус ${fmt(Number(data.bonus))} по ${PROMO_CODE}` : ''} игроку ${data.username} (ID ${data.player_id}).`;
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
  return Math.min(100, (betPrice / targetPrice) * 100);
}

// ============================================================
// КОЛЕСО
// ============================================================
function drawWheel(chancePercent) {
  const size = canvas.width;
  const r = size / 2;
  const cx = r, cy = r;
  ctx.clearRect(0, 0, size, size);
  const start = -Math.PI / 2;
  const winAngle = Math.PI * 2 * Math.max(0, Math.min(100, chancePercent)) / 100;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 4, start, start + winAngle); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 4, start + winAngle, start + Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#171717'; ctx.fill();
  ctx.strokeStyle = '#080808'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 9, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
}
drawWheel(0);

// ============================================================
// ЗАГРУЗКА КАТАЛОГА
// ============================================================
async function loadSkins() {
  try {
    const catalogFiles = [
      { file: 'skins_variants.json', type: 'skin', category: null },
      { file: 'stickers.json', type: 'stickers', category: 'Stickers' },
      { file: 'agents.json', type: 'agents', category: 'Agents' },
      { file: 'graffiti.json', type: 'graffiti', category: 'Graffiti' },
      { file: 'music_kits.json', type: 'music_kits', category: 'Music Kits' },
    ];
    const [responses, metadataResponse] = await Promise.all([
      Promise.all(catalogFiles.map(entry => fetch(entry.file))),
      fetch('catalog-source.json').catch(() => null),
    ]);
    const failedResponse = responses.find(response => !response.ok);
    if (failedResponse) throw new Error(`Catalog file failed: ${failedResponse.url} (${failedResponse.status})`);
    const datasets = await Promise.all(responses.map(response => response.json()));

    SKINS_CATALOG = catalogFiles.flatMap((entry, dataIndex) => datasets[dataIndex].map((item, idx) => ({
      id: `${entry.type}_${item.id || idx}`,
      name: item.name,
      price: calcPrice(item, entry.type),
      img: item.image || item.image_inventory || item.image_url,
      rarity: item.rarity,
      category: item.category?.name || entry.category,
      catalogType: entry.type,
      weapon: item.weapon?.name,
      wear: item.wear?.name,
      floatMin: item.float_min == null ? null : Number(item.float_min),
      floatMax: item.float_max == null ? null : Number(item.float_max),
      stattrak: item.stattrak,
      marketHashName: item.market_hash_name || item.marketHashName,
      sourceItemId: item.id || String(idx),
      baseSkinId: item.skin_id || null,
      pattern: item.pattern || null,
      souvenir: item.souvenir === true,
      effect: catalogEffect(item),
      releaseDate: item.release_date || null,
      releaseYear: item.release_year ? String(item.release_year) : null,
      collectionNames: Array.isArray(item.collection_names) ? item.collection_names : [],
    })));

    SKINS_CATALOG.sort((a, b) => a.price - b.price);
    catalogLoaded = true;
    if (migrateCatalogIdsInInventory()) await saveState();

    if (catalogSourceNote && metadataResponse?.ok) {
      const metadata = await metadataResponse.json().catch(() => null);
      if (metadata) {
        const fetchedDate = metadata.fetchedAtUtc
          ? new Date(metadata.fetchedAtUtc).toLocaleDateString('ru-RU')
          : '';
        const itemCounts = metadata.counts || {};
        const totalItems = Object.values(itemCounts).reduce((sum, count) => sum + Number(count || 0), 0);
        const baseDesigns = Number(metadata.skinDesigns || 0);
        catalogReleaseYear = String(metadata.currentYear || new Date().getFullYear());
        document.querySelectorAll('[data-qf="new"], [data-tqf="new"]').forEach(button => {
          button.textContent = `Новинки ${catalogReleaseYear}`;
        });
        const currentYearItems = Number(metadata.releaseYearCounts?.[catalogReleaseYear] || 0);
        catalogSourceNote.textContent = `CS2 · ${totalItems.toLocaleString('ru-RU')} вариантов · ${baseDesigns.toLocaleString('ru-RU')} моделей · ${catalogReleaseYear}: ${currentYearItems.toLocaleString('ru-RU')} · ${fetchedDate}`;
        catalogSourceNote.title = `Источник: ${metadata.source || 'CS2 item catalog'} · данные из файлов игры · лицензия ${metadata.license || 'см. источник'}`;
      }
    }

    invLoading.classList.add('hide');
    targetLoading.classList.add('hide');

    if (currentUser) {
      renderInventory();
      renderTargets();
      renderMyInventory();
      restoreSlotsFromState();
    }
  } catch (err) {
    invLoading.textContent = 'Ошибка загрузки каталога';
    targetLoading.textContent = 'Ошибка загрузки каталога';
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
    const n = amountToRub(parseFloat(priceFrom));
    if (!isNaN(n) && n >= 0) from = n;
  }
  if (priceTo !== null && priceTo !== undefined && priceTo !== '') {
    const n = amountToRub(parseFloat(priceTo));
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

  const categoryFilters = {
    weapons: item => item.catalogType === 'skin' && item.category !== 'Knives' && item.category !== 'Gloves',
    knives: item => item.catalogType === 'skin' && item.category === 'Knives',
    gloves: item => item.catalogType === 'skin' && item.category === 'Gloves',
    stickers: item => item.catalogType === 'stickers',
    agents: item => item.catalogType === 'agents',
    graffiti: item => item.catalogType === 'graffiti',
    music: item => item.catalogType === 'music_kits',
  };
  if (quickFilter === 'new') return result.filter(item => item.releaseYear === catalogReleaseYear);
  if (categoryFilters[quickFilter]) return result.filter(categoryFilters[quickFilter]);
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

function isSkinAlreadyStaked(item) {
  const catalogId = item?.catalogId ?? item?.id;
  return catalogId != null && getSelectedBetItems().some(staked => String(staked.catalogId) === String(catalogId));
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
    updateTargetShortcuts();
    drawWheel(0);
    return;
  }

  if (isSkinAlreadyStaked(targetData)) {
    currentChance = 0;
    chanceValue.textContent = '—';
    multiplierEl.textContent = '—';
    upgradeBtn.disabled = true;
    warningEl.textContent = '⚠ Нельзя выбрать тот же скин и для ставки, и для цели';
    warningEl.classList.add('show');
    updateTargetShortcuts();
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
    updateTargetShortcuts();
    drawWheel(0);
    return;
  }

  warningEl.classList.remove('show');
  warningEl.textContent = '';

  currentChance = calculateChance(betData.price, targetData.price);
  if (currentChance < 0.01) {
    currentChance = 0;
    chanceValue.textContent = '00.00%';
    multiplierEl.textContent = `x${(targetData.price / betData.price).toFixed(2)}`;
    upgradeBtn.disabled = true;
    warningEl.textContent = 'Шанс ниже минимального значения 0.01%.';
    warningEl.classList.add('show');
    updateTargetShortcuts();
    drawWheel(0);
    return;
  }
  chanceValue.textContent = formatChance(currentChance);
  multiplierEl.textContent = 'x' + (targetData.price / betData.price).toFixed(2);
  upgradeBtn.disabled = false;
  updateTargetShortcuts();
  drawWheel(currentChance);
}

function updateTargetShortcuts() {
  targetShortcutButtons.forEach(button => { button.disabled = !betData || spinning; });
}

function chooseRandomTarget(desiredChance) {
  if (!betData || spinning) return;
  const desiredPrice = betData.price / (Number(desiredChance) / 100);
  const candidates = SKINS_CATALOG.filter(item => {
    if (item.price < betData.price || isSkinAlreadyStaked(item)) return false;
    return calculateChance(betData.price, item.price) >= 0.01;
  });
  if (!candidates.length) {
    warningEl.textContent = 'Для этой цели пока нет подходящего предмета.';
    warningEl.classList.add('show');
    return;
  }
  const distance = item => Math.abs(Math.log(item.price / desiredPrice));
  const closest = Math.min(...candidates.map(distance));
  const tolerance = Math.max(closest + 0.025, 0.08);
  const near = candidates.filter(item => distance(item) <= tolerance);
  const chosen = near[Math.floor(Math.random() * near.length)];
  selectTarget(chosen);
}

targetShortcutButtons.forEach(button => {
  button.addEventListener('click', () => chooseRandomTarget(Number(button.dataset.targetChance)));
});

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
  const rarityColor = /^#[0-9a-f]{6}$/i.test(item.rarity?.color || '') ? item.rarity.color : '';
  if (rarityColor) card.style.setProperty('--item-rarity-color', rarityColor);
  const owned = source === 'catalog' && isInMyInventory(item.id);
  const isCurrentYearItem = item.releaseYear === catalogReleaseYear;
  const selected = source === 'catalog' && state.inventory.some(inv => inv.catalogId === item.id && state.betItemIds.includes(inv.instanceId));
  const selectedForPurchase = source === 'catalog' && marketSelection.has(String(item.id));
  if (selected || selectedForPurchase) card.classList.add('active');
  if (selectedForPurchase) card.classList.add('market-selected');
  const qualityParts = [item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : '', item.effect].filter(Boolean);
  if (item.floatMin != null && item.floatMax != null && item.floatMax > item.floatMin) {
    qualityParts.push(`${Number(item.floatMin).toFixed(2)}–${Number(item.floatMax).toFixed(2)}`);
  }
  if (item.pattern && item.pattern !== item.name) qualityParts.push(item.pattern);

  card.innerHTML = `
    ${owned ? '<div class="card-badge owned">✓</div>' : (selectedForPurchase ? '<div class="card-badge owned">✓</div>' : (source === 'catalog' ? `<div class="card-badge buy">${displayCurrency === 'USD' ? '$' : '₽'}</div>` : ''))}
    ${isCurrentYearItem ? `<div class="card-badge new">${escapeHtml(catalogReleaseYear)}</div>` : ''}
    <div class="item-img"><img src="${escapeHtml(item.img || '')}" alt="" loading="lazy"></div>
    <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
    <div class="item-price">${fmt(item.price)}</div>
    ${qualityParts.length ? `<div class="item-quality">${qualityParts.map(part => escapeHtml(part)).join(' · ')}</div>` : ''}
    <div class="item-rarity">${escapeHtml(item.rarity?.name || item.category || 'Предмет')}</div>
  `;

  if (!disabled) card.addEventListener('click', onClick);
  return card;
}

function getMarketSelectionItems() {
  return [...marketSelection]
    .map(id => SKINS_CATALOG.find(item => String(item.id) === id))
    .filter(Boolean);
}

function marketSelectionTotal() {
  return getMarketSelectionItems().reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function updateBuySelectedButton() {
  const items = getMarketSelectionItems();
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  buySelectedBtn.hidden = !catalogMode || !items.length;
  buySelectedBtn.disabled = items.length === 0 || total > Number(state.balance || 0) + 1e-8;
  buySelectedBtn.textContent = `Купить ${items.length} · ${fmt(total)}`;
}

function toggleMarketSelection(item) {
  const id = String(item.id);
  if (marketSelection.has(id)) {
    marketSelection.delete(id);
  } else {
    const nextTotal = marketSelectionTotal() + Number(item.price || 0);
    if (nextTotal > Number(state.balance || 0) + 1e-8) {
      warningEl.textContent = `Не хватает баланса на этот выбор. Доступно ${fmt(state.balance)}.`;
      warningEl.classList.add('show');
      return;
    }
    marketSelection.add(id);
  }
  warningEl.classList.remove('show');
  renderInventory();
}

// ============================================================
// ЛЕВЫЙ КАТАЛОГ
// ============================================================
function renderInventory() {
  if (!currentUser || !SKINS_CATALOG.length) return;
  updateBuySelectedButton();

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
    const disabled = owned && ((targetData && item.price > targetData.price) || (targetData && isSkinAlreadyStaked(item)));

    const card = buildCatalogCard(item, {
      disabled, source: 'catalog',
      onClick: () => {
        if (owned) selectBet(state.inventory.find(inv => inv.catalogId === item.id));
        else toggleMarketSelection(item);
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
    const disabled = (betData && (item.price < betData.price || calculateChance(betData.price, item.price) < 0.01)) || isSkinAlreadyStaked(item);
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
  updateBalanceUI();
  myInvCount.textContent = state.inventory.length;
  myInventory.innerHTML = '';

  if (state.inventory.length === 0) {
    myInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Пусто. Добавь предмет из каталога слева.</div>';
    return;
  }

  state.inventory.forEach((inv, i) => {
    const card = document.createElement('div');
    const selected = state.betItemIds.includes(inv.instanceId);
    card.className = 'inv-card' + (selected ? ' active selected-bet' : '');
    const qualities = [inv.wear, inv.stattrak ? 'StatTrak™' : '', inv.souvenir ? 'Souvenir' : '', inv.effect].filter(Boolean);
    card.innerHTML = `
      ${selected ? '<div class="card-badge owned">Ставка</div>' : ''}
      <div class="item-img"><img src="${inv.img}" alt=""></div>
      <div class="item-name" title="${inv.name}">${inv.name}</div>
      <div class="item-price">${fmt(inv.price)}</div>
      ${qualities.length ? `<div class="item-quality">${qualities.map(value => escapeHtml(value)).join(' · ')}</div>` : ''}
    `;
    card.addEventListener('click', () => selectBet(inv));
    card.style.animationDelay = (i * 0.01) + 's';
    myInventory.appendChild(card);
  });
}

function openBattlePicker(mode, battleId = null) {
  battlePickerMode = mode === 'join' ? 'join' : 'create';
  battlePickerBattleId = battlePickerMode === 'join' ? battleId : null;
  selectedBattleSkinId = null;
  battlePickerTitle.textContent = battlePickerMode === 'join' ? 'Выбери скин для входа' : 'Создать батл';
  const battle = latestBattles.find(item => item.id === battlePickerBattleId);
  battlePickerHelp.textContent = battlePickerMode === 'join'
    ? `Нужен предмет стоимостью не меньше ${fmt(minimumGuestStake(battle?.creator_skin?.price))}. Скин спишется из инвентаря до результата.`
    : 'Выбери один скин. После создания он будет заблокирован до отмены или завершения батла.';
  battlePickerFeedback.textContent = '';
  battlePickerStatus.textContent = 'Выбери предмет';
  battlePickerConfirm.textContent = battlePickerMode === 'join' ? 'Вступить в батл' : 'Создать батл';
  battlePickerModal.classList.add('show');
  battlePickerModal.setAttribute('aria-hidden', 'false');
  renderBattlePicker();
}

function closeBattlePicker() {
  battlePickerModal.classList.remove('show');
  battlePickerModal.setAttribute('aria-hidden', 'true');
  selectedBattleSkinId = null;
}

function renderBattlePicker() {
  const battle = latestBattles.find(item => item.id === battlePickerBattleId);
  const requiredPrice = battlePickerMode === 'join' ? minimumGuestStake(battle?.creator_skin?.price) : 0;
  const available = state.inventory.filter(item => Number(item.price || 0) >= requiredPrice);
  if (!available.some(item => item.instanceId === selectedBattleSkinId)) selectedBattleSkinId = null;
  battlePickerGrid.innerHTML = '';
  if (!available.length) {
    battlePickerGrid.innerHTML = `<div class="battle-empty">${battlePickerMode === 'join' ? 'В инвентаре нет скина нужной стоимости.' : 'Инвентарь пуст. Сначала добавь скин из каталога.'}</div>`;
  } else {
    available.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `battle-inventory-item${item.instanceId === selectedBattleSkinId ? ' selected' : ''}`;
      card.setAttribute('aria-pressed', String(item.instanceId === selectedBattleSkinId));
      card.innerHTML = `<img src="${escapeHtml(item.img || '')}" alt=""><span class="battle-inventory-name">${escapeHtml(item.name)}</span><span class="battle-inventory-price">${fmt(Number(item.price || 0))}</span>`;
      card.addEventListener('click', () => {
        selectedBattleSkinId = item.instanceId;
        renderBattlePicker();
      });
      battlePickerGrid.appendChild(card);
    });
  }
  const selected = state.inventory.find(item => item.instanceId === selectedBattleSkinId);
  battlePickerStatus.textContent = selected ? `Выбран: ${selected.name} · ${fmt(Number(selected.price || 0))}` : 'Выбери предмет';
  battlePickerConfirm.disabled = !selected;
}

openCreateBattleBtn.addEventListener('click', () => openBattlePicker('create'));
battlePickerCancel.addEventListener('click', closeBattlePicker);
battlePickerModal.addEventListener('click', event => { if (event.target === battlePickerModal) closeBattlePicker(); });

function minimumGuestStake(creatorPrice) {
  return Math.ceil(Number(creatorPrice || 0) * 95 - 1e-7) / 100;
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

const battleProfileCache = new Map();
let battleStatuses = new Map();

async function getBattleParticipantProfile(userId) {
  if (!userId) return null;
  if (userId === currentUser?.id) return { username: currentUser.username, avatar: state.avatar || '' };
  if (battleProfileCache.has(userId)) return battleProfileCache.get(userId);
  const { data, error } = await supabaseClient.rpc('get_public_player_profile', { p_user_id: userId });
  if (error) throw error;
  battleProfileCache.set(userId, data);
  return data;
}

function setBattleAvatar(imageId, fallbackId, avatarUrl) {
  const image = $(imageId);
  const fallback = $(fallbackId);
  const avatar = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  image.hidden = !avatar;
  fallback.hidden = !!avatar;
  if (avatar) image.src = avatar;
  else image.removeAttribute('src');
}

async function renderBattleRoom(battle) {
  if (!battle) return;
  activeBattleRoom = battle;
  battleRoomBank.textContent = fmt(Number(battle.bank_value || battle.creator_skin?.price || 0));
  const creatorProfile = await getBattleParticipantProfile(battle.creator_user_id).catch(() => null);
  const guestProfile = battle.guest_user_id ? await getBattleParticipantProfile(battle.guest_user_id).catch(() => null) : null;
  $('battleCreatorName').textContent = creatorProfile?.username || battle.creator_name || 'Создатель';
  setBattleAvatar('battleCreatorAvatar', 'battleCreatorAvatarFallback', creatorProfile?.avatar);
  $('battleCreatorSkinImage').src = battle.creator_skin?.img || '';
  $('battleCreatorSkinName').textContent = battle.creator_skin?.name || 'Скин';
  $('battleCreatorSkinPrice').textContent = fmt(Number(battle.creator_skin?.price || 0));
  $('battleGuestName').textContent = guestProfile?.username || battle.guest_name || 'Ждём гостя';
  setBattleAvatar('battleGuestAvatar', 'battleGuestAvatarFallback', guestProfile?.avatar);
  $('battleGuestSkinImage').src = battle.guest_skin?.img || '';
  $('battleGuestSkinName').textContent = battle.guest_skin?.name || 'Ожидает входа';
  $('battleGuestSkinPrice').textContent = battle.guest_skin ? fmt(Number(battle.guest_skin.price || 0)) : '—';
  battleRoomCancel.hidden = battle.status !== 'waiting' || battle.creator_user_id !== currentUser?.id;
  if (battle.status === 'waiting') {
    battleRoomStatus.textContent = 'Ожидание соперника';
    battleResult.textContent = 'Ты создатель батла. Ждём гостя…';
    battleResult.classList.remove('is-winner');
  }
}

function openBattleRoom(battle) {
  if (!battle) return;
  activeBattleRoom = battle;
  battleRoomCancel.disabled = false;
  battleRoomCancel.hidden = battle.status !== 'waiting' || battle.creator_user_id !== currentUser?.id;
  battleRoomModal.classList.add('show');
  battleRoomModal.setAttribute('aria-hidden', 'false');
  drawBattleWheel();
  void renderBattleRoom(battle);
}

function minimizeBattleRoom() {
  battleRoomModal.classList.remove('show');
  battleRoomModal.setAttribute('aria-hidden', 'true');
}

function closeBattleRoom() {
  clearInterval(battleCountdownInterval);
  clearTimeout(battleRoomCloseTimer);
  battleCountdownInterval = null;
  battleRoomCloseTimer = null;
  battleRoomModal.classList.remove('show');
  battleRoomModal.setAttribute('aria-hidden', 'true');
  activeBattleRoom = null;
}

function spinBattleWheel(battle) {
  battleRoomStatus.textContent = 'Колесо крутится';
  battleResult.textContent = 'Колесо прокручивается…';
  const targetAngle = battle.winner_side === 'creator' ? 90 : 270;
  const startAngle = battleWheelAngle % 360;
  const delta = ((targetAngle - startAngle + 360) % 360) + 5 * 360;
  battleWheelAngle += delta;
  battleWheel.style.transition = 'transform 5.2s cubic-bezier(0.08, 0.72, 0.12, 1)';
  let completed = false;
  const finish = async () => {
    if (completed) return;
    completed = true;
    clearTimeout(fallbackTimer);
    battleWheel.removeEventListener('transitionend', onTransitionEnd);
    if ([battle.creator_user_id, battle.guest_user_id].includes(currentUser?.id)) {
      try {
        await loadUserState();
        renderMyInventory();
        renderProfile();
        restoreSlotsFromState();
      } catch (error) {
        console.error('Could not refresh player inventory after battle:', error);
      }
    }
    lastBattleResults.add(battle.id);
    queuedBattleResults.delete(battle.id);
    battleResult.textContent = `🏆 ${battle.winner_name || 'Игрок'} забирает банк ${fmt(Number(battle.bank_value || 0))}`;
    battleResult.classList.add('is-winner');
    battleRoomStatus.textContent = 'Батл завершён';
    deferredBattleResults.delete(battle.id);
    renderBattleList();
    renderBattleArchive();
    battleRoomCloseTimer = window.setTimeout(() => {
      closeBattleRoom();
      battleAnimationInProgress = false;
      startNextBattleOutcome();
    }, 2400);
  };
  const onTransitionEnd = event => {
    if (event.target === battleWheel && event.propertyName === 'transform') void finish();
  };
  battleWheel.addEventListener('transitionend', onTransitionEnd);
  const fallbackTimer = window.setTimeout(() => void finish(), 5600);
  battleWheel.style.transform = `rotate(${battleWheelAngle}deg)`;
}

function startNextBattleOutcome() {
  if (battleAnimationInProgress || !battleOutcomeQueue.length) return;
  const battle = battleOutcomeQueue.shift();
  battleAnimationInProgress = true;
  openBattleRoom(battle);
  battleRoomCancel.hidden = true;
  battleRoomStatus.textContent = 'Розыгрыш через 5 секунд';
  battleResult.classList.remove('is-winner');
  let remaining = 5;
  battleResult.textContent = `До розыгрыша ${remaining}…`;
  battleCountdownInterval = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(battleCountdownInterval);
      battleCountdownInterval = null;
      spinBattleWheel(battle);
    } else {
      battleRoomStatus.textContent = `Розыгрыш через ${remaining} секунд`;
      battleResult.textContent = `До розыгрыша ${remaining}…`;
    }
  }, 1000);
}

function queueBattleOutcome(battle) {
  if (!battle?.id || lastBattleResults.has(battle.id) || queuedBattleResults.has(battle.id)) return;
  queuedBattleResults.add(battle.id);
  deferredBattleResults.add(battle.id);
  battleOutcomeQueue.push(battle);
  startNextBattleOutcome();
}

function showBattleOutcome(battle) {
  if (battle?.id) {
    battleStatuses.set(battle.id, 'completed');
    const found = latestBattles.some(item => item.id === battle.id);
    latestBattles = found
      ? latestBattles.map(item => item.id === battle.id ? { ...item, ...battle, status: 'completed' } : item)
      : [{ ...battle, status: 'completed' }, ...latestBattles];
  }
  queueBattleOutcome(battle);
  renderBattleList();
  renderBattleArchive();
}

function renderBattleCard(battle, archived = false) {
  const creatorSkin = battle.creator_skin || {};
  const guestSkin = battle.guest_skin || {};
  const waiting = battle.status === 'waiting';
  const ownBattle = battle.creator_user_id === currentUser.id;
  const outcomeDeferred = battle.status === 'completed' && deferredBattleResults.has(battle.id);
  const bankValue = Number(battle.bank_value || Number(creatorSkin.price || 0) + Number(guestSkin.price || 0));
  let action = '';
  if (waiting && ownBattle) {
    action = `<button type="button" class="btn-small" data-battle-action="view" data-battle-id="${escapeHtml(battle.id)}">Открыть свою комнату</button>`;
  } else if (waiting) {
    action = `<button type="button" class="btn-small battle-join-btn" data-battle-id="${escapeHtml(battle.id)}">Присоединиться</button>`;
  } else if (battle.status === 'completed') {
    action = `<div class="battle-winner-line">${outcomeDeferred ? 'Ждём полной остановки колеса…' : `Победитель: ${escapeHtml(battle.winner_name || '—')}`}</div>`;
  } else {
    action = '<div class="battle-winner-line">Батл отменён</div>';
  }
  const guestContent = guestSkin.name
    ? `<img src="${escapeHtml(guestSkin.img || '')}" alt=""><span>${escapeHtml(guestSkin.name)}</span><small>${fmt(Number(guestSkin.price || 0))}</small>`
    : '<span>Ожидает гостя</span>';
  const stateLabel = waiting ? (ownBattle ? 'Ожидание' : 'Открыт') : (outcomeDeferred ? 'Колесо крутится…' : battle.status === 'completed' ? 'Завершён' : 'Отменён');
  return `<article class="battle-card ${waiting ? 'battle-open' : 'battle-finished'} ${archived ? 'archive-card' : ''}">
    <div class="battle-card-head"><span>Батл ${escapeHtml(String(battle.id).slice(0, 8))}</span><span>${stateLabel}</span></div>
    <div class="battle-matchup">
      <div class="battle-side creator-side"><span class="battle-side-label">Создатель · зелёная</span><strong>${escapeHtml(battle.creator_name || 'Игрок')}</strong><img src="${escapeHtml(creatorSkin.img || '')}" alt=""><span>${escapeHtml(creatorSkin.name || 'Скин')}</span><small>${fmt(Number(creatorSkin.price || 0))}</small></div>
      <div class="battle-vs"><strong>VS</strong><span>Банк<br>${fmt(bankValue)}</span></div>
      <div class="battle-side guest-side ${guestSkin.name ? '' : 'waiting-side'}"><span class="battle-side-label">Гость · белая</span><strong>${escapeHtml(battle.guest_name || 'Гость')}</strong>${guestContent}</div>
    </div>
    <div class="battle-card-actions">${action}</div>
  </article>`;
}

function renderBattleList() {
  const open = latestBattles.filter(battle => battle.status === 'waiting');
  battleList.innerHTML = open.length
    ? open.map(battle => renderBattleCard(battle)).join('')
    : '<div class="battle-empty">Открытых батлов пока нет. Создай первый!</div>';
}

function renderBattleArchive() {
  if (!currentUser) return;
  const mine = latestBattles.filter(battle =>
    (battle.creator_user_id === currentUser.id || battle.guest_user_id === currentUser.id) && battle.status !== 'waiting'
  );
  myBattleArchive.innerHTML = mine.length
    ? mine.map(battle => renderBattleCard(battle, true)).join('')
    : '<div class="battle-empty">Завершённые батлы появятся здесь.</div>';
}

async function loadBattles() {
  if (!currentUser || !supabaseClient || battlePollInFlight) return;
  battlePollInFlight = true;
  try {
    const { data, error } = await supabaseClient.from('skin_battles')
      .select('id, creator_user_id, creator_name, creator_skin, guest_user_id, guest_name, guest_skin, status, winner_user_id, winner_name, winner_side, bank_value, created_at')
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    latestBattles = data || [];
    latestBattles.forEach(battle => {
      const previous = battleStatuses.get(battle.id);
      const isParticipant = battle.creator_user_id === currentUser.id || battle.guest_user_id === currentUser.id;
      if (battle.status === 'completed' && previous === 'waiting' && isParticipant) {
        queueBattleOutcome({ ...battle, bank_value: Number(battle.bank_value || 0) });
      } else if (battle.status === 'completed' && previous === undefined && !queuedBattleResults.has(battle.id)) {
        lastBattleResults.add(battle.id);
      }
      battleStatuses.set(battle.id, battle.status);
    });
    renderBattleList();
    renderBattleArchive();
    startNextBattleOutcome();
  } catch (error) {
    console.error('Could not load battles:', error);
    battleList.innerHTML = '<div class="battle-empty">Батлы пока не подключены к базе. Примените файл supabase/skin-battles.sql.</div>';
  } finally {
    battlePollInFlight = false;
  }
}

async function recoverBattleAfterCancelFailure(room) {
  const { data: freshBattle, error } = await supabaseClient.from('skin_battles')
    .select('id, creator_user_id, creator_name, creator_skin, guest_user_id, guest_name, guest_skin, status, winner_user_id, winner_name, winner_side, bank_value, created_at')
    .eq('id', room.id).single();
  if (error) throw error;
  latestBattles = [freshBattle, ...latestBattles.filter(item => item.id !== freshBattle.id)];
  battleStatuses.set(freshBattle.id, freshBattle.status);

  if (freshBattle.status === 'waiting') {
    activeBattleRoom = freshBattle;
    await renderBattleRoom(freshBattle);
    renderBattleList();
    renderBattleArchive();
    battleRoomStatus.textContent = 'Батл всё ещё открыт. Попробуй отменить ещё раз.';
    return;
  }
  if (freshBattle.status === 'completed') {
    showBattleOutcome(freshBattle);
    return;
  }

  closeBattleRoom();
  await loadUserState();
  renderMyInventory();
  renderProfile();
  restoreSlotsFromState();
  renderBattleList();
  renderBattleArchive();
  battleFeedback.textContent = 'Батл уже отменён, скин возвращён в инвентарь.';
}

battlePickerConfirm.addEventListener('click', async () => {
  const selectedStake = state.inventory.find(item => item.instanceId === selectedBattleSkinId);
  if (!selectedStake) return;
  battlePickerConfirm.disabled = true;
  battlePickerFeedback.textContent = battlePickerMode === 'join' ? 'Вступаю в батл…' : 'Создаю батл…';
  if (battlePickerMode === 'create') {
    const creatorSkin = { ...selectedStake };
    const { data: battleId, error } = await supabaseClient.rpc('create_skin_battle', { p_inventory_item_id: selectedStake.instanceId });
    if (error) {
      battlePickerFeedback.textContent = String(error.message || '').includes('Could not find the function')
        ? 'Выполни SQL из папки supabase, чтобы включить батлы.'
        : 'Не удалось создать батл. Возможно, скин уже использован.';
      battlePickerConfirm.disabled = false;
      return;
    }
    closeBattlePicker();
    await loadUserState();
    renderMyInventory();
    renderProfile();
    restoreSlotsFromState();
    await loadBattles();
    const battle = latestBattles.find(item => String(item.id) === String(battleId)) || {
      id: battleId, creator_user_id: currentUser.id, creator_name: currentUser.username,
      creator_skin: creatorSkin, bank_value: Number(creatorSkin.price || 0), status: 'waiting'
    };
    openBattleRoom(battle);
  } else {
    const battle = latestBattles.find(item => item.id === battlePickerBattleId);
    if (!battle || Number(selectedStake.price || 0) + 1e-8 < minimumGuestStake(battle.creator_skin?.price)) {
      battlePickerFeedback.textContent = 'Выбранный скин не подходит по минимальной цене.';
      battlePickerConfirm.disabled = false;
      return;
    }
    const { data, error } = await supabaseClient.rpc('join_skin_battle', {
      p_battle_id: battlePickerBattleId,
      p_inventory_item_id: selectedStake.instanceId
    });
    if (error) {
      const message = String(error.message || '').toLowerCase();
      battlePickerFeedback.textContent = message.includes('95%')
        ? 'Скин гостя должен стоить не меньше 95% ставки создателя.'
        : 'Не удалось вступить: батл мог уже закрыться.';
      battlePickerConfirm.disabled = false;
      return;
    }
    closeBattlePicker();
    showBattleOutcome(data);
    openBattleRoom(data);
    await loadBattles();
  }
});

battleRoomCancel.addEventListener('click', async () => {
  if (!activeBattleRoom || activeBattleRoom.status !== 'waiting') return;
  const room = activeBattleRoom;
  battleRoomCancel.disabled = true;
  battleRoomStatus.textContent = 'Отменяю батл и возвращаю скин…';
  battleFeedback.textContent = '';
  try {
    const { data, error } = await supabaseClient.rpc('cancel_skin_battle', { p_battle_id: room.id });
    if (error || data !== true) {
      await recoverBattleAfterCancelFailure(room);
      return;
    }

    const cancelledBattle = { ...room, status: 'cancelled' };
    latestBattles = latestBattles.some(item => item.id === room.id)
      ? latestBattles.map(item => item.id === room.id ? cancelledBattle : item)
      : [cancelledBattle, ...latestBattles];
    battleStatuses.set(room.id, 'cancelled');
    closeBattleRoom();
    renderBattleList();
    renderBattleArchive();
    try {
      await loadUserState();
      renderMyInventory();
      renderProfile();
      restoreSlotsFromState();
      battleFeedback.textContent = 'Батл отменён, скин возвращён.';
    } catch (refreshError) {
      battleFeedback.textContent = 'Батл отменён. Обнови страницу, чтобы перечитать инвентарь.';
      console.error('Battle was cancelled, but player state could not be refreshed:', refreshError);
    }
    void loadBattles();
  } catch (error) {
    console.error('Could not cancel battle:', error);
    try {
      await recoverBattleAfterCancelFailure(room);
    } catch (refreshError) {
      battleRoomStatus.textContent = 'Не удалось проверить отмену. Список обновится автоматически; попробуй ещё раз.';
      console.error('Could not refresh battle after cancel attempt:', refreshError);
    }
  } finally {
    battleRoomCancel.disabled = false;
  }
});

battleRoomMinimize.addEventListener('click', minimizeBattleRoom);

refreshBattlesBtn.addEventListener('click', () => void loadBattles());
battleList.addEventListener('click', event => {
  const joinButton = event.target.closest('.battle-join-btn');
  const viewButton = event.target.closest('[data-battle-action="view"]');
  const battleId = (joinButton || viewButton)?.dataset.battleId;
  if (!battleId) return;
  const battle = latestBattles.find(item => item.id === battleId);
  if (!battle) return;
  if (joinButton) openBattlePicker('join', battleId);
  else openBattleRoom(battle);
});

setInterval(() => {
  if ($('page-battles').classList.contains('active')) void loadBattles();
}, 4000);

setInterval(() => {
  if (currentUser && $('page-upgrade').classList.contains('active')) void loadUpgradeFeed();
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

  if (targetData && String(targetData.id) === String(inventoryItem.catalogId)) {
    warningEl.textContent = '⚠ Этот скин уже выбран как цель. Сначала выбери другую цель.';
    warningEl.classList.add('show');
    return;
  }

  state.betItemIds = [inventoryItem.instanceId];
  updateBetSelection();
}

function selectTarget(item) {
  if (spinning) return;
  if (isSkinAlreadyStaked(item)) {
    warningEl.textContent = '⚠ Нельзя выбрать тот же скин и для ставки, и для цели';
    warningEl.classList.add('show');
    return;
  }
  if (betData && calculateChance(betData.price, item.price) < 0.01) {
    warningEl.textContent = 'Шанс на выбранный предмет ниже минимального значения 0.01%.';
    warningEl.classList.add('show');
    return;
  }
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
function openBuyModal(items) {
  const selectedItems = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (!selectedItems.length) return;
  const total = selectedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  if (total > Number(state.balance || 0) + 1e-8) {
    warningEl.textContent = 'Выбранные предметы дороже денежного баланса.';
    warningEl.classList.add('show');
    return;
  }
  pendingBuy = { items: selectedItems };
  modalTitle.textContent = selectedItems.length === 1 ? 'Добавить предмет?' : `Купить предметы (${selectedItems.length})?`;
  modalItem.innerHTML = selectedItems.length === 1
    ? `<img src="${escapeHtml(selectedItems[0].img || '')}" alt=""><div class="item-name">${escapeHtml(selectedItems[0].name)}</div>`
    : `<div class="purchase-batch-list">${selectedItems.map(item => `<div class="purchase-batch-item"><img src="${escapeHtml(item.img || '')}" alt=""><span>${escapeHtml(item.name)}</span><strong>${fmt(item.price)}</strong></div>`).join('')}</div>`;
  modalPrice.textContent = fmt(total);
  modalConfirm.textContent = `Купить за ${fmt(total)}`;
  buyModal.classList.add('show');
}

function closeBuyModal() {
  buyModal.classList.remove('show');
  pendingBuy = null;
}

modalCancel.addEventListener('click', closeBuyModal);
buySelectedBtn.addEventListener('click', () => openBuyModal(getMarketSelectionItems()));
buyModal.addEventListener('click', (e) => {
  if (e.target === buyModal) closeBuyModal();
});

modalConfirm.addEventListener('click', async () => {
  if (!pendingBuy) return;
  const { items } = pendingBuy;
  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  if (!await spendBalance(total)) {
    warningEl.textContent = '⚠ Недостаточно средств или нет связи с базой';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    closeBuyModal();
    return;
  }

  state.inventory.push(...items.map(item => ({
    instanceId: makeInstanceId(),
    catalogId: item.id,
    name: item.name,
    price: item.price,
    img: item.img,
    rarity: item.rarity,
    catalogType: item.catalogType,
    wear: item.wear,
    floatMin: item.floatMin,
    floatMax: item.floatMax,
    stattrak: item.stattrak,
    souvenir: item.souvenir,
    effect: item.effect,
    pattern: item.pattern
  })));
  await saveState();
  marketSelection.clear();
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
    warningEl.textContent = '⚠ Не удалось зачислить сумму. Проверьте соединение.';
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
    'Обменять всё на баланс?',
    `Вы обменяете ${state.inventory.length} скин(ов) на ${fmt(total)} (комиссия ${Math.round(SELL_COMMISSION*100)}% уже учтена).`,
    async () => {
      if (!await addBalance(total)) {
        warningEl.textContent = '⚠ Не удалось зачислить сумму. Инвентарь сохранён.';
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

  const totalValue = state.inventory.reduce((sum, i) => sum + Number(i.price || 0), 0);
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
      <div class="item-quality">${[item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : '', item.effect, item.pattern].filter(Boolean).map(escapeHtml).join(' · ')}</div>
      <div class="item-price">${fmt(item.price)}</div>
      <button class="btn-sell">Обменять за ${fmt(receive)}</button>
    `;
    card.querySelector('.btn-sell').addEventListener('click', () => openSellModal(idx));
    card.style.animationDelay = (idx * 0.02) + 's';
    profileInventory.appendChild(card);
  });
}

async function publishUpgradeWin(instanceId) {
  if (!currentUser || !supabaseClient || !instanceId) return;
  const { error } = await supabaseClient.rpc('publish_upgrade_win', { p_instance_id: instanceId });
  if (error) console.error('Could not publish upgrade win:', error);
  else void loadUpgradeFeed();
}

function renderUpgradeFeed(items) {
  if (!items.length) {
    upgradeFeed.innerHTML = '<div class="feed-empty">Выигранные предметы появятся здесь.</div>';
    return;
  }
  upgradeFeed.innerHTML = items.map(entry => {
    const item = entry.item || {};
    const date = entry.created_at ? new Date(entry.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    return `<button type="button" class="upgrade-feed-card" data-user-id="${escapeHtml(entry.user_id)}">
      <span class="feed-user"><img src="${escapeHtml(entry.avatar || '')}" alt=""><strong>${escapeHtml(entry.username || 'Игрок')}</strong></span>
      <img class="feed-item-image" src="${escapeHtml(item.img || '')}" alt="">
      <span class="feed-item-name">${escapeHtml(item.name || 'Скин')}</span>
      <span class="feed-item-price">${fmt(Number(item.price || 0))}</span>
      <small>${date}</small>
    </button>`;
  }).join('');
}

async function loadUpgradeFeed() {
  if (!currentUser || !supabaseClient) return;
  const { data, error } = await supabaseClient.from('upgrade_wins')
    .select('id, user_id, player_id, username, avatar, item, created_at')
    .order('created_at', { ascending: false }).limit(24);
  if (error) {
    upgradeFeed.innerHTML = '<div class="feed-empty">Примени supabase/community-features.sql, чтобы включить общую ленту.</div>';
    console.error('Could not load upgrade feed:', error);
    return;
  }
  renderUpgradeFeed(data || []);
}

function closePublicProfile() {
  publicProfileModal.classList.remove('show');
  publicProfileModal.setAttribute('aria-hidden', 'true');
}

async function viewPublicProfile(userId) {
  if (!userId || !supabaseClient) return;
  publicProfileName.textContent = 'Профиль игрока';
  publicProfilePlayerId.textContent = '';
  publicProfileStats.innerHTML = '';
  publicProfileBestDrop.innerHTML = '';
  publicProfileInventory.innerHTML = '<div class="feed-empty">Загружаю профиль…</div>';
  publicProfileFeedback.textContent = '';
  publicProfileModal.classList.add('show');
  publicProfileModal.setAttribute('aria-hidden', 'false');
  const { data, error } = await supabaseClient.rpc('get_public_player_profile', { p_user_id: userId });
  if (error || !data) {
    publicProfileFeedback.textContent = 'Не удалось загрузить открытый профиль.';
    publicProfileInventory.innerHTML = '';
    console.error('Could not load public player profile:', error);
    return;
  }
  publicProfileName.textContent = data.username || 'Игрок';
  publicProfileAvatar.src = data.avatar || '';
  publicProfilePlayerId.textContent = `ID игрока: ${data.player_id ?? '—'}`;
  publicProfileStats.innerHTML = `
    <div><span>Баланс</span><strong>${fmt(Number(data.balance || 0))}</strong></div>
    <div><span>Скинов</span><strong>${Number(data.inventory_count || 0)}</strong></div>
    <div><span>Баланс инвентаря</span><strong>${fmt(Number(data.inventory_value || 0))}</strong></div>`;
  const best = data.best_drop;
  publicProfileBestDrop.innerHTML = best?.name
    ? `<div class="public-best-label">Лучший дроп</div><div class="public-best-item"><img src="${escapeHtml(best.img || '')}" alt=""><span>${escapeHtml(best.name)}</span><strong>${fmt(Number(best.price || 0))}</strong></div>`
    : '<div class="public-best-label">Лучший дроп · пока нет</div>';
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  publicProfileInventory.innerHTML = inventory.length
    ? inventory.map(item => `<article class="public-inventory-card"><img src="${escapeHtml(item.img || '')}" alt=""><strong>${escapeHtml(item.name || 'Предмет')}</strong><span>${fmt(Number(item.price || 0))}</span><small>${escapeHtml([item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : ''].filter(Boolean).join(' · '))}</small></article>`).join('')
    : '<div class="feed-empty">Инвентарь пуст.</div>';
}

upgradeFeed.addEventListener('click', event => {
  const card = event.target.closest('.upgrade-feed-card');
  if (card) void viewPublicProfile(card.dataset.userId);
});
refreshUpgradeFeedBtn.addEventListener('click', () => void loadUpgradeFeed());
$('publicProfileClose').addEventListener('click', closePublicProfile);
publicProfileModal.addEventListener('click', event => { if (event.target === publicProfileModal) closePublicProfile(); });

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
  updateTargetShortcuts();
  resultEl.classList.remove('show', 'win', 'lose');
  resultEl.textContent = '';

  const win = Math.random() * 100 < currentChance;
  const winArcDeg = currentChance * 3.6;
  const edgePadding = Math.min(0.0001, winArcDeg / 4, (360 - winArcDeg) / 4);
  const finalAngle = win
    ? edgePadding + Math.random() * Math.max(0, winArcDeg - edgePadding * 2)
    : winArcDeg + edgePadding + Math.random() * Math.max(0, 360 - winArcDeg - edgePadding * 2);

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

    const wagerIds = new Set(wagerItems.map(item => item.instanceId));
    state.inventory = state.inventory.filter(item => !wagerIds.has(item.instanceId));

    let wonInstanceId = null;
    if (win) {
      wonInstanceId = makeInstanceId();
      state.inventory.push({
        instanceId: wonInstanceId,
        catalogId: prizeData.id,
        name: prizeData.name,
        price: prizeData.price,
        img: prizeData.img,
        rarity: prizeData.rarity,
        catalogType: prizeData.catalogType,
        wear: prizeData.wear,
        floatMin: prizeData.floatMin,
        floatMax: prizeData.floatMax,
        stattrak: prizeData.stattrak,
        souvenir: prizeData.souvenir,
        effect: prizeData.effect,
        pattern: prizeData.pattern
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
    const savedState = saveState();

    renderSlot(betSlot, null);
    renderSlot(targetSlot, null);
    updateChance();
    renderMyInventory();
    renderInventory();
    renderTargets();
    if ($('page-profile').classList.contains('active')) renderProfile();
    if (wonInstanceId) void savedState.then(() => publishUpgradeWin(wonInstanceId));
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

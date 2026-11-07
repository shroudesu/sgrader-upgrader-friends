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
const MUSIC_ENABLED_KEY = 'cs2up_music_enabled';
const MUSIC_VOLUME_KEY = 'cs2up_music_volume';
const SPIN_STRENGTH_KEY = 'cs2up_spin_strength';
const SPIN_MODE_KEY = 'cs2up_spin_mode';
const CURRENCY_KEY = 'cs2up_currency';
const TELEGRAM_URL = 'https://t.me/perkasanya';
const RUB_PER_USD = 90;
const MUSIC_TRACKS = ['sounds/1.mp3', 'sounds/2.mp3', 'sounds/3.mp3', 'sounds/4.mp3', 'sounds/5.mp3'];
const PROFILE_INVENTORY_PAGE_SIZE = 150;
const CASE_IMAGE_BUCKET = 'case-designs';
const CASE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CASE_SKIP_ANIMATION_KEY = 'cs2up_case_skip_animation_v2';
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
const caseListView = document.getElementById('caseListView');
const caseDetailView = document.getElementById('caseDetailView');
const caseBackButton = document.getElementById('caseBackButton');
const casesGrid = document.getElementById('casesGrid');
const caseFeedback = document.getElementById('caseFeedback');
const caseOpenResults = document.getElementById('caseOpenResults');
const caseOpenQuantityInput = document.getElementById('caseOpenQuantity');
const caseOpenButton = document.getElementById('caseOpenButton');
const caseOpenContents = document.getElementById('caseOpenContents');
const caseOpenContentsCount = document.getElementById('caseOpenContentsCount');
const adminCaseList = document.getElementById('adminCaseList');
const adminCaseNewBtn = document.getElementById('adminCaseNewBtn');
const adminCaseForm = document.getElementById('adminCaseForm');
const adminCaseFormTitle = document.getElementById('adminCaseFormTitle');
const adminCaseCancel = document.getElementById('adminCaseCancel');
const adminCaseName = document.getElementById('adminCaseName');
const adminCasePrice = document.getElementById('adminCasePrice');
const adminCaseImageFile = document.getElementById('adminCaseImageFile');
const adminCaseImagePreview = document.getElementById('adminCaseImagePreview');
const adminCaseImageStatus = document.getElementById('adminCaseImageStatus');
const adminCaseSkinSearch = document.getElementById('adminCaseSkinSearch');
const adminCaseSkinResults = document.getElementById('adminCaseSkinResults');
const adminCaseContents = document.getElementById('adminCaseContents');
const adminCaseChanceTotal = document.getElementById('adminCaseChanceTotal');
const adminCaseFeedback = document.getElementById('adminCaseFeedback');
const adminCaseSaveBtn = document.getElementById('adminCaseSaveBtn');
const adminCaseDeleteBtn = document.getElementById('adminCaseDeleteBtn');
const caseSkipAnimationToggle = document.getElementById('caseSkipAnimation');
const pendingCaseRewardsPanel = document.getElementById('pendingCaseRewards');
const pendingCaseRewardsCount = document.getElementById('pendingCaseRewardsCount');
const pendingCaseRewardsList = document.getElementById('pendingCaseRewardsList');
const caseResultCaseImage = document.getElementById('caseResultCaseImage');
const caseResultCaseName = document.getElementById('caseResultCaseName');
const caseDetailPrice = document.getElementById('caseDetailPrice');
const caseResultStatus = document.getElementById('caseResultStatus');
const caseRewardList = document.getElementById('caseRewardList');
const caseClaimAllBtn = document.getElementById('caseClaimAllBtn');
const caseSellAllBtn = document.getElementById('caseSellAllBtn');
const onlineUsersCount = document.getElementById('onlineUsersCount');
const adminUsersEl = document.getElementById('adminUsers');
const adminFeedback = document.getElementById('adminFeedback');
const adminInventoryModal = document.getElementById('adminInventoryModal');
const adminInventoryTitle = document.getElementById('adminInventoryTitle');
const adminInventorySummary = document.getElementById('adminInventorySummary');
const adminInventoryFeedback = document.getElementById('adminInventoryFeedback');
const adminInventoryGrid = document.getElementById('adminInventoryGrid');
const adminInventoryClose = document.getElementById('adminInventoryClose');
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
const invCategory = $('invCategory');
const invCount = $('invCount');
const invLoading = $('invLoading');
const catalogSourceNote = $('catalogSourceNote');
const targetGrid = $('targetGrid');
const targetSearch = $('targetSearch');
const targetPriceFrom = $('targetPriceFrom');
const targetPriceTo = $('targetPriceTo');
const targetSort = $('targetSort');
const targetCategory = $('targetCategory');
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
const musicEnabledToggle = $('musicEnabled');
const musicVolumeSlider = $('musicVolumeSlider');
const musicVolumeValue = $('musicVolumeValue');
const profileInventoryStatus = $('profileInventoryStatus');

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let currentUser = null;
let displayCurrency = (() => {
  try { return localStorage.getItem(CURRENCY_KEY) === 'USD' ? 'USD' : 'RUB'; } catch (e) { return 'RUB'; }
})();
let catalogMode = false;
const marketSelection = new Map();
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
let activeAdminInventoryPlayerId = null;
let adminInventoryOperationInFlight = false;
let gameCases = [];
let caseDraftContents = [];
let caseEditorId = null;
let caseImageUrl = '';
let caseImagePreviewObjectUrl = null;
let caseImageUploadInProgress = false;
let caseOpeningInProgress = false;
let caseSkipAnimation = false;
let caseAnimationInProgress = false;
let caseAnimationSequence = 0;
let cancelCaseAnimation = null;
let caseSettlementInProgress = false;
let pendingCaseRewards = [];
let activeCaseOpening = null;
let selectedGameCase = null;
let upgradeFeedChannel = null;
let onlinePresenceChannel = null;
let onlinePresenceReady = false;
let onlinePresenceSessionId = '';
let winVolume = 0.7;
let musicVolume = 0.3;
let musicEnabled = false;
let musicTrackIndex = 0;
let musicPlayer = null;
let preloadedMusicPlayer = null;
let preloadedMusicTrackIndex = -1;
let spinStrength = 5;
let spinMode = 'fast';
let battleWheelAngle = 0;
let lastBattleResults = new Set();
let queuedBattleResults = new Set();
let deferredBattleResults = new Set();
let battleOutcomeQueue = [];
let battleAnimationInProgress = false;
let latestBattles = [];
let selectedBattleSkinIds = new Set();
let battlePickerMode = 'create';
let battlePickerBattleId = null;
let activeBattleRoom = null;
let battleCountdownInterval = null;
let battleRoomCloseTimer = null;
let battlePollInFlight = false;
let invQuickFilter = 'all';
let targetQuickFilter = 'all';
const customSelectInstances = new WeakMap();
const customSelects = new Set();

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
  void updateOnlinePresenceIdentity();
  await loadUserState();
  marketSelection.clear();
  if (migrateCatalogIdsInInventory()) await saveState();

  authScreen.classList.add('hide');
  appEl.style.display = 'block';
  userNameEl.textContent = currentUser.username;
  playerIdEl.textContent = `ID игрока: ${currentUser.playerId}`;
  renderHeaderAvatar();
  currencySelect.value = displayCurrency;
  syncCustomSelect(currencySelect);
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
  startUpgradeFeedRealtime();
  void loadPendingCaseRewards();
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
  if (upgradeFeedChannel && supabaseClient) {
    void supabaseClient.removeChannel(upgradeFeedChannel);
    upgradeFeedChannel = null;
  }
  closeSettings();
  currentUser = null;
  void updateOnlinePresenceIdentity();
  pendingCaseRewards = [];
  renderPendingCaseRewards();
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
  syncCustomSelect(currencySelect);
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
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (settingsModal.classList.contains('show')) closeSettings();
  if (!caseDetailView.hidden && !caseSettlementInProgress) caseBackButton.click();
});

currencySelect.addEventListener('change', () => {
  const previousCurrency = displayCurrency;
  const casePriceValue = Number(adminCasePrice.value);
  displayCurrency = currencySelect.value === 'USD' ? 'USD' : 'RUB';
  if (!adminCaseForm.hidden && Number.isFinite(casePriceValue) && casePriceValue > 0) {
    const rubPrice = previousCurrency === 'USD' ? casePriceValue * RUB_PER_USD : casePriceValue;
    adminCasePrice.value = displayCurrency === 'USD' ? (rubPrice / RUB_PER_USD).toFixed(2) : rubPrice.toFixed(2);
  }
  try { localStorage.setItem(CURRENCY_KEY, displayCurrency); } catch (e) {}
  renderCurrencyLabels();
  updateBalanceUI();
  if ($('page-profile').classList.contains('active')) renderProfile();
  if ($('page-admin').classList.contains('active')) void renderAdminUsers();
  renderCaseCards();
  renderAdminCaseList();
  if (selectedGameCase) {
    caseDetailPrice.textContent = `${fmt(Number(selectedGameCase.price))} за кейс`;
    updateCaseOpenButton();
  }
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

function updateRangeProgress(slider, value, min = 0, max = 100) {
  const progress = max > min ? Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100)) : 0;
  slider.style.setProperty('--range-progress', progress + '%');
}

function applyVolume(percent) {
  winVolume = Math.max(0, Math.min(1, percent / 100));
  volumeValue.textContent = Math.round(percent) + '%';
  updateVolumeIcon(winVolume);
  updateRangeProgress(volumeSlider, percent);
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

function applyMusicVolume(percent) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  musicVolume = safePercent / 100;
  musicVolumeSlider.value = String(safePercent);
  musicVolumeValue.textContent = Math.round(safePercent) + '%';
  updateRangeProgress(musicVolumeSlider, safePercent);
  if (musicPlayer) musicPlayer.volume = musicVolume;
  if (preloadedMusicPlayer) preloadedMusicPlayer.volume = musicVolume;
  try { localStorage.setItem(MUSIC_VOLUME_KEY, String(safePercent)); } catch (e) {}
}

function preloadNextMusicTrack() {
  if (!musicEnabled || !MUSIC_TRACKS.length) return;
  const nextIndex = (musicTrackIndex + 1) % MUSIC_TRACKS.length;
  if (preloadedMusicPlayer && preloadedMusicTrackIndex === nextIndex) return;
  if (preloadedMusicPlayer) preloadedMusicPlayer.pause();
  preloadedMusicTrackIndex = nextIndex;
  preloadedMusicPlayer = new Audio(MUSIC_TRACKS[nextIndex]);
  preloadedMusicPlayer.preload = 'auto';
  preloadedMusicPlayer.volume = musicVolume;
  preloadedMusicPlayer.load();
}

function startMusicTrack(index, player = null) {
  if (!musicEnabled || !MUSIC_TRACKS.length) return;
  musicTrackIndex = index % MUSIC_TRACKS.length;
  musicPlayer = player || new Audio(MUSIC_TRACKS[musicTrackIndex]);
  musicPlayer.preload = 'auto';
  musicPlayer.volume = musicVolume;
  musicPlayer.addEventListener('ended', advanceMusicTrack, { once: true });
  const playback = musicPlayer.play();
  if (playback && playback.catch) playback.catch(error => console.warn('Background music could not start:', error));
  preloadNextMusicTrack();
}

function advanceMusicTrack() {
  if (!musicEnabled) return;
  const nextIndex = (musicTrackIndex + 1) % MUSIC_TRACKS.length;
  const nextPlayer = preloadedMusicTrackIndex === nextIndex ? preloadedMusicPlayer : null;
  preloadedMusicPlayer = null;
  preloadedMusicTrackIndex = -1;
  startMusicTrack(nextIndex, nextPlayer);
}

function setBackgroundMusicEnabled(enabled) {
  musicEnabled = Boolean(enabled);
  musicEnabledToggle.checked = musicEnabled;
  try { localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled)); } catch (e) {}
  if (musicEnabled) {
    if (!musicPlayer) startMusicTrack(musicTrackIndex);
    return;
  }
  if (musicPlayer) musicPlayer.pause();
  if (preloadedMusicPlayer) preloadedMusicPlayer.pause();
  musicPlayer = null;
  preloadedMusicPlayer = null;
  preloadedMusicTrackIndex = -1;
  musicTrackIndex = 0;
}

function loadMusicSettings() {
  let enabled = false;
  let savedVolume = 30;
  try {
    enabled = localStorage.getItem(MUSIC_ENABLED_KEY) === 'true';
    const storedVolume = localStorage.getItem(MUSIC_VOLUME_KEY);
    if (storedVolume !== null) savedVolume = Number(storedVolume);
  } catch (e) {}
  applyMusicVolume(Number.isFinite(savedVolume) ? savedVolume : 30);
  musicEnabled = enabled;
  musicEnabledToggle.checked = enabled;
  if (enabled) {
    const startAfterGesture = () => {
      if (musicEnabled && !musicPlayer) startMusicTrack(musicTrackIndex);
    };
    document.addEventListener('pointerdown', startAfterGesture, { once: true });
    document.addEventListener('keydown', startAfterGesture, { once: true });
  }
}

musicVolumeSlider.addEventListener('input', event => applyMusicVolume(parseFloat(event.target.value)));
musicEnabledToggle.addEventListener('change', () => setBackgroundMusicEnabled(musicEnabledToggle.checked));
loadMusicSettings();

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
  updateRangeProgress(spinStrengthSlider, spinStrength, 1, 10);
  spinStrengthValue.textContent = String(spinStrength);
  applySpinMode(savedMode);
}

spinStrengthSlider.addEventListener('input', event => {
  spinStrength = Number(event.target.value);
  spinStrengthValue.textContent = String(spinStrength);
  updateRangeProgress(spinStrengthSlider, spinStrength, 1, 10);
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
  if (page === 'cases' || page === 'admin') void loadCases();
  if (page === 'cases') void loadPendingCaseRewards();
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
    adminUsersEl.innerHTML = '<tr><td colspan="7">Не удалось загрузить список игроков.</td></tr>';
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
      <td><button class="btn-small admin-inventory-open" type="button" data-player-id="${escapeHtml(user.player_id)}" data-username="${escapeHtml(user.username)}">Открыть</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7">Пользователей пока нет.</td></tr>';
}

function caseSkinSnapshot(item) {
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price || 0),
    img: item.img || '',
    rarity: item.rarity || null,
    catalogType: item.catalogType || 'skin',
    category: item.category || '',
    wear: item.wear || null,
    floatMin: item.floatMin ?? null,
    floatMax: item.floatMax ?? null,
    stattrak: Boolean(item.stattrak),
    souvenir: Boolean(item.souvenir),
    effect: catalogEffect(item) || null,
    pattern: item.pattern || null
  };
}

function renderCaseCards() {
  if (!gameCases.length) {
    casesGrid.innerHTML = '<div class="case-empty">Кейсов пока нет.</div>';
    return;
  }
  casesGrid.innerHTML = gameCases.map(gameCase => {
    const art = gameCase.image_url
      ? `<img src="${escapeHtml(gameCase.image_url)}" alt="${escapeHtml(gameCase.name)}">`
      : '<iconify-icon icon="mdi:package-variant-closed"></iconify-icon>';
    return `<article class="case-card" data-case-id="${escapeHtml(gameCase.id)}">
      <div class="case-card-art">${art}</div>
      <div class="case-card-body"><h2 title="${escapeHtml(gameCase.name)}">${escapeHtml(gameCase.name)}</h2>
        <div class="case-card-meta"><span>Цена</span><strong>${fmt(Number(gameCase.price))}</strong></div>
        <button type="button" class="case-open-btn" data-case-open="${escapeHtml(gameCase.id)}">Открыть</button>
      </div>
    </article>`;
  }).join('');
}

function renderCaseDetails(gameCase) {
  const contents = Array.isArray(gameCase.contents)
    ? [...gameCase.contents].sort((a, b) => Number(a.chance || 0) - Number(b.chance || 0))
    : [];
  caseResultCaseName.textContent = gameCase.name;
  caseResultCaseImage.src = gameCase.image_url || '';
  caseResultCaseImage.hidden = !gameCase.image_url;
  caseDetailPrice.textContent = `${fmt(Number(gameCase.price))} за кейс`;
  caseOpenContentsCount.textContent = `${contents.length} предметов`;
  caseOpenContents.innerHTML = contents.map(entry => {
    const item = entry.item || {};
    const qualifiers = [item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : ''].filter(Boolean).join(' · ');
    const rarityColor = /^#[0-9a-f]{6}$/i.test(item.rarity?.color || '') ? item.rarity.color : '';
    const rarityName = typeof item.rarity === 'object' ? item.rarity?.name : item.rarity;
    return `<article class="case-detail-item"${rarityColor ? ` style="--item-rarity-color:${escapeHtml(rarityColor)}"` : ''}>
      <div class="case-detail-image">${item.img ? `<img src="${escapeHtml(item.img)}" alt="" loading="lazy">` : '<iconify-icon icon="mdi:package-variant-closed"></iconify-icon>'}</div>
      <div class="case-detail-name"><strong title="${escapeHtml(item.name || 'Предмет')}">${escapeHtml(item.name || 'Предмет')}</strong>${qualifiers ? `<small>${escapeHtml(qualifiers)}</small>` : ''}${rarityName ? `<small class="case-detail-rarity">${escapeHtml(rarityName)}</small>` : ''}</div>
      <div class="case-detail-stats"><span>Цена</span><strong>${fmt(Number(item.price || 0))}</strong><span>Шанс</span><strong class="case-detail-chance">${Number(entry.chance || 0).toFixed(1)}%</strong></div>
    </article>`;
  }).join('') || '<div class="case-empty">В кейсе пока нет предметов.</div>';
  caseOpenQuantityInput.value = '1';
  syncCustomSelect(caseOpenQuantityInput);
  caseSkipAnimationToggle.checked = caseSkipAnimation;
  caseFeedback.textContent = '';
  caseOpenResults.hidden = true;
  caseBackButton.disabled = false;
  updateCaseOpenButton();
}

function updateCaseOpenButton() {
  if (!selectedGameCase) return;
  const quantity = Math.max(1, Math.min(10, Math.trunc(Number(caseOpenQuantityInput.value) || 1)));
  const total = Number(selectedGameCase.price) * quantity;
  caseOpenButton.textContent = `Открыть × ${quantity} · ${fmt(total)}`;
}

function openCaseDetails(caseId) {
  selectedGameCase = gameCases.find(item => String(item.id) === String(caseId)) || null;
  if (!selectedGameCase) return;
  activeCaseOpening = null;
  renderCaseDetails(selectedGameCase);
  renderPendingCaseRewards();
  caseListView.hidden = true;
  caseDetailView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  void loadPendingCaseRewards();
}

function renderAdminCaseList() {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!gameCases.length) {
    adminCaseList.innerHTML = '<div class="case-empty">Созданных кейсов пока нет.</div>';
    return;
  }
  adminCaseList.innerHTML = gameCases.map(gameCase => `<article class="case-admin-row">
    ${gameCase.image_url ? `<img src="${escapeHtml(gameCase.image_url)}" alt="">` : '<iconify-icon icon="mdi:package-variant-closed"></iconify-icon>'}
    <div class="case-admin-info"><strong title="${escapeHtml(gameCase.name)}">${escapeHtml(gameCase.name)}</strong><span>${fmt(Number(gameCase.price))} · ${(gameCase.contents || []).length} скинов</span></div>
    <button type="button" class="btn-small" data-case-edit="${escapeHtml(gameCase.id)}">Изменить</button>
  </article>`).join('');
}

async function loadCases() {
  if (!supabaseClient) {
    casesGrid.innerHTML = '<div class="case-empty">Сначала подключи Supabase.</div>';
    return;
  }
  const { data, error } = await supabaseClient.from('game_cases')
    .select('id,name,price,image_url,contents,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (error) {
    casesGrid.innerHTML = '<div class="case-empty">Кейсы ещё не подключены. Выполни supabase/cases.sql в SQL Editor.</div>';
    if (currentUser?.role === 'admin') adminCaseList.innerHTML = '<div class="case-empty">Выполни supabase/cases.sql, чтобы настроить кейсы.</div>';
    console.error('Could not load cases:', error);
    return;
  }
  gameCases = Array.isArray(data) ? data : [];
  renderCaseCards();
  renderAdminCaseList();
}

function renderCaseChanceTotal() {
  const total = caseDraftContents.reduce((sum, entry) => sum + Number(entry.chance || 0), 0);
  adminCaseChanceTotal.textContent = 'Шансы: ' + total.toFixed(1) + '%';
  adminCaseChanceTotal.classList.toggle('invalid', Math.abs(total - 100) > 0.001);
}

function renderCaseDraftContents() {
  if (!caseDraftContents.length) {
    adminCaseContents.innerHTML = '<div class="case-empty">Добавь скины в кейс.</div>';
    renderCaseChanceTotal();
    return;
  }
  adminCaseContents.innerHTML = caseDraftContents.map((entry, index) => `<div class="case-content-row" data-index="${index}">
    <img src="${escapeHtml(entry.item.img || '')}" alt="">
    <span title="${escapeHtml(entry.item.name)}">${escapeHtml(entry.item.name)}</span>
    <label>Шанс <input type="number" min="0.1" max="100" step="0.1" value="${Number(entry.chance).toFixed(1)}" data-case-chance="${index}" aria-label="Шанс для ${escapeHtml(entry.item.name)}">%</label>
    <button type="button" data-case-remove="${index}" aria-label="Убрать скин из кейса" title="Убрать"><iconify-icon icon="mdi:trash-can-outline"></iconify-icon></button>
  </div>`).join('');
  renderCaseChanceTotal();
}

function renderCaseSkinResults() {
  const query = adminCaseSkinSearch.value.trim().toLocaleLowerCase('ru-RU');
  if (!query) {
    adminCaseSkinResults.innerHTML = '<div class="case-empty">Введи название, чтобы найти скин в каталоге.</div>';
    return;
  }
  const matches = SKINS_CATALOG.filter(item => item.catalogType === 'skin' && String(item.name || '').toLocaleLowerCase('ru-RU').includes(query)).slice(0, 16);
  if (!matches.length) {
    adminCaseSkinResults.innerHTML = '<div class="case-empty">Скины не найдены.</div>';
    return;
  }
  adminCaseSkinResults.innerHTML = matches.map(item => {
    const id = String(item.id);
    const alreadyAdded = caseDraftContents.some(entry => String(entry.item.id) === id);
    return `<button type="button" class="case-skin-result" data-case-add="${escapeHtml(id)}" ${alreadyAdded ? 'disabled' : ''}>
      <img src="${escapeHtml(item.img || '')}" alt=""><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><strong>${alreadyAdded ? 'Добавлен' : fmt(Number(item.price || 0))}</strong>
    </button>`;
  }).join('');
}

function addCaseSkin(item) {
  const id = String(item.id);
  if (caseDraftContents.some(entry => String(entry.item.id) === id)) return;
  if (caseDraftContents.length >= 200) {
    adminCaseFeedback.textContent = 'В кейс можно добавить не больше 200 скинов.';
    return;
  }
  const nextCount = caseDraftContents.length + 1;
  const newChance = caseDraftContents.length ? Math.round((100 / nextCount) * 10) / 10 : 100;
  const existingTotal = caseDraftContents.reduce((sum, entry) => sum + Math.max(0, Number(entry.chance) || 0), 0);
  const remainingChance = 100 - newChance;
  let assignedChance = 0;
  const redistributed = caseDraftContents.map((entry, index) => {
    const chance = index === caseDraftContents.length - 1
      ? Math.round((remainingChance - assignedChance) * 10) / 10
      : Math.round(((existingTotal > 0 ? Math.max(0, Number(entry.chance) || 0) / existingTotal : 1 / caseDraftContents.length) * remainingChance) * 10) / 10;
    assignedChance += chance;
    return { ...entry, chance };
  });
  caseDraftContents = [...redistributed, { item: caseSkinSnapshot(item), chance: newChance }];
  renderCaseDraftContents();
  renderCaseSkinResults();
}

function setCaseImagePreview(url) {
  if (caseImagePreviewObjectUrl) URL.revokeObjectURL(caseImagePreviewObjectUrl);
  caseImagePreviewObjectUrl = String(url || '').startsWith('blob:') ? url : null;
  if (!url) {
    adminCaseImagePreview.removeAttribute('src');
    adminCaseImagePreview.hidden = true;
    return;
  }
  adminCaseImagePreview.src = url;
  adminCaseImagePreview.hidden = false;
}

function resetCaseEditor() {
  if (caseImagePreviewObjectUrl) URL.revokeObjectURL(caseImagePreviewObjectUrl);
  caseImagePreviewObjectUrl = null;
  caseEditorId = null;
  caseImageUrl = '';
  caseDraftContents = [];
  adminCaseForm.reset();
  adminCaseForm.hidden = true;
  adminCaseImagePreview.removeAttribute('src');
  adminCaseImagePreview.hidden = true;
  adminCaseImageStatus.textContent = 'PNG до 5 МБ';
  adminCaseFeedback.textContent = '';
  adminCaseDeleteBtn.hidden = true;
  adminCaseDeleteBtn.disabled = false;
  adminCaseSaveBtn.disabled = false;
  adminCaseCancel.disabled = false;
  adminCaseSkinSearch.value = '';
  adminCaseSkinResults.innerHTML = '';
  renderCaseDraftContents();
}

function openNewCaseEditor() {
  if (currentUser?.role !== 'admin' || caseImageUploadInProgress) return;
  resetCaseEditor();
  adminCaseFormTitle.textContent = 'Новый кейс';
  adminCaseSaveBtn.textContent = 'Создать кейс';
  adminCaseForm.hidden = false;
  renderCaseSkinResults();
  adminCaseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openCaseEditor(gameCase) {
  if (currentUser?.role !== 'admin') return;
  resetCaseEditor();
  caseEditorId = gameCase.id;
  caseImageUrl = gameCase.image_url || '';
  caseDraftContents = (gameCase.contents || []).map(entry => ({ item: entry.item, chance: Number(entry.chance) }));
  adminCaseName.value = gameCase.name || '';
  adminCasePrice.value = displayCurrency === 'USD'
    ? (Number(gameCase.price || 0) / RUB_PER_USD).toFixed(2)
    : String(gameCase.price || '');
  adminCaseFormTitle.textContent = 'Изменить кейс';
  adminCaseSaveBtn.textContent = 'Сохранить изменения';
  adminCaseDeleteBtn.hidden = false;
  adminCaseImageStatus.textContent = caseImageUrl ? 'PNG уже загружен' : 'PNG до 5 МБ';
  setCaseImagePreview(caseImageUrl);
  adminCaseForm.hidden = false;
  renderCaseDraftContents();
  renderCaseSkinResults();
  adminCaseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function uploadCaseImage(file) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!file || file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png')) {
    adminCaseImageStatus.textContent = 'Выбери файл PNG.';
    adminCaseImageFile.value = '';
    return;
  }
  if (file.size > CASE_IMAGE_MAX_BYTES) {
    adminCaseImageStatus.textContent = 'Файл больше 5 МБ.';
    adminCaseImageFile.value = '';
    return;
  }
  caseImageUploadInProgress = true;
  adminCaseImageFile.disabled = true;
  adminCaseSaveBtn.disabled = true;
  adminCaseCancel.disabled = true;
  adminCaseNewBtn.disabled = true;
  adminCaseImageStatus.textContent = 'Загружаю PNG…';
  setCaseImagePreview(URL.createObjectURL(file));
  try {
    const filePath = `${currentUser.id}/${Date.now()}-${makeInstanceId()}.png`;
    const { data, error } = await supabaseClient.storage.from(CASE_IMAGE_BUCKET).upload(filePath, file, {
      contentType: 'image/png', cacheControl: '3600', upsert: false
    });
    if (error) throw error;
    caseImageUrl = supabaseClient.storage.from(CASE_IMAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
    setCaseImagePreview(caseImageUrl);
    adminCaseImageStatus.textContent = 'PNG загружен.';
  } catch (error) {
    setCaseImagePreview(caseImageUrl);
    adminCaseImageStatus.textContent = 'Не удалось загрузить PNG. Проверь миграцию supabase/cases.sql и права Storage.';
    console.error('Could not upload case image:', error);
  } finally {
    caseImageUploadInProgress = false;
    adminCaseImageFile.disabled = false;
    adminCaseSaveBtn.disabled = false;
    adminCaseCancel.disabled = false;
    adminCaseNewBtn.disabled = false;
  }
}

function caseSellValue(item) {
  return Math.round(Number(item?.price || 0) * (1 - SELL_COMMISSION) * 100) / 100;
}

function renderPendingCaseRewards() {
  const groups = new Map();
  pendingCaseRewards.forEach(reward => {
    const openingId = String(reward.opening_id);
    if (!groups.has(openingId)) groups.set(openingId, { opening_id: openingId, case_name: reward.case_name, case_image_url: reward.case_image_url, created_at: reward.created_at, rewards: [] });
    groups.get(openingId).rewards.push(reward);
  });
  const pendingCount = pendingCaseRewards.length;
  pendingCaseRewardsPanel.hidden = pendingCount === 0;
  pendingCaseRewardsCount.textContent = `${pendingCount} ${pendingCount === 1 ? 'предмет' : 'предметов'}`;
  pendingCaseRewardsList.innerHTML = [...groups.values()].map(opening => `<article class="pending-case-card">
    ${opening.case_image_url ? `<img src="${escapeHtml(opening.case_image_url)}" alt="">` : '<iconify-icon icon="mdi:package-variant-closed"></iconify-icon>'}
    <div><strong>${escapeHtml(opening.case_name || 'Кейс')}</strong><span>${opening.rewards.length} незабранных скинов</span></div>
    <button type="button" class="btn-small" data-pending-opening="${escapeHtml(opening.opening_id)}">Посмотреть</button>
  </article>`).join('');
}

async function loadPendingCaseRewards() {
  if (!currentUser || !supabaseClient) return;
  const requestedUserId = currentUser.id;
  const { data, error } = await supabaseClient.rpc('get_pending_case_rewards');
  if (currentUser?.id !== requestedUserId) return;
  if (error) {
    console.warn('Could not load pending case rewards:', error);
    return;
  }
  pendingCaseRewards = Array.isArray(data) ? data : [];
  renderPendingCaseRewards();
}

function pickCaseContentsItem(contents, fallbackItem) {
  const entries = (Array.isArray(contents) ? contents : []).filter(entry => entry?.item && Number(entry.chance) > 0);
  const total = entries.reduce((sum, entry) => sum + Number(entry.chance || 0), 0);
  if (!entries.length || total <= 0) return fallbackItem;
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= Number(entry.chance || 0);
    if (roll < 0) return entry.item;
  }
  return entries[entries.length - 1].item;
}

function makeCaseReelMarkup(item, caseContents, rewardIndex) {
  const winnerIndex = 16;
  const reel = Array.from({ length: 20 }, (_, index) => {
    const isWinner = index === winnerIndex;
    const shownItem = isWinner
      ? item
      : pickCaseContentsItem(caseContents, item);
    return `<div class="case-reel-item${isWinner ? ' case-reel-winner' : ''}" ${isWinner ? 'data-reel-winner="true"' : ''}>
      <img src="${escapeHtml(shownItem.img || '')}" alt=""><span>${escapeHtml(shownItem.name || 'Предмет')}</span>
    </div>`;
  }).join('');
  return `<div class="case-reel-viewport"><div class="case-reel-track" data-winner-index="${winnerIndex}" data-reward-index="${rewardIndex}">${reel}</div><span class="case-reel-marker"></span></div>`;
}

function renderCaseOpeningView(animate = false) {
  if (!activeCaseOpening) return;
  const rewards = activeCaseOpening.rewards || [];
  const pending = rewards.filter(reward => reward.status === 'pending');
  const sellTotal = pending.reduce((sum, reward) => sum + caseSellValue(reward.item), 0);
  caseResultCaseName.textContent = activeCaseOpening.case_name || 'Кейс';
  const caseImage = activeCaseOpening.case_image_url || '';
  if (caseImage) caseResultCaseImage.src = caseImage;
  else caseResultCaseImage.removeAttribute('src');
  caseResultCaseImage.hidden = !caseImage;
  caseResultStatus.textContent = caseAnimationInProgress
    ? 'Крутим кейсы…'
    : pending.length
      ? `Выбери действие для каждого скина. Продать все можно за ${fmt(sellTotal)}.`
      : 'Все награды уже обработаны.';

  const caseContents = selectedGameCase && selectedGameCase.name === activeCaseOpening.case_name
    ? selectedGameCase.contents || []
    : [];
  caseRewardList.innerHTML = pending.map((reward, index) => {
    const item = reward.item || {};
    const reel = animate ? makeCaseReelMarkup(item, caseContents, index)
      : `<div class="case-reel-static"><img src="${escapeHtml(item.img || '')}" alt=""><span>${escapeHtml(item.name || 'Предмет')}</span></div>`;
    const status = reward.status === 'claimed' ? '<span class="case-reward-status claimed">В инвентаре</span>'
      : reward.status === 'sold' ? '<span class="case-reward-status sold">Продан</span>' : '';
    const actions = reward.status === 'pending'
      ? `<div class="case-reward-actions"><button type="button" class="btn-small case-reward-action" data-reward-action="claim" data-reward-id="${escapeHtml(reward.id)}" ${caseAnimationInProgress || caseSettlementInProgress ? 'disabled' : ''}>Забрать</button><button type="button" class="btn-small danger case-reward-action" data-reward-action="sell" data-reward-id="${escapeHtml(reward.id)}" ${caseAnimationInProgress || caseSettlementInProgress ? 'disabled' : ''}>Продать · ${fmt(caseSellValue(item))}</button></div>`
      : status;
    return `<article class="case-reward-row" data-reward-id="${escapeHtml(reward.id)}">
      <div class="case-reward-number">#${index + 1}</div>${reel}
      <div class="case-reward-details"><strong title="${escapeHtml(item.name || 'Предмет')}">${escapeHtml(item.name || 'Предмет')}</strong><span>Цена предмета · ${fmt(Number(item.price || 0))}</span></div>
      ${actions}
    </article>`;
  }).join('') || '<div class="case-empty">В этом открытии нет ожидающих наград.</div>';
  caseClaimAllBtn.textContent = `Забрать все (${pending.length})`;
  caseSellAllBtn.textContent = `Продать все · ${fmt(sellTotal)}`;
  caseClaimAllBtn.disabled = !pending.length || caseAnimationInProgress || caseSettlementInProgress;
  caseSellAllBtn.disabled = !pending.length || caseAnimationInProgress || caseSettlementInProgress;
  caseBackButton.disabled = caseSettlementInProgress;
}

async function playCaseReels() {
  const animationId = ++caseAnimationSequence;
  const tracks = [...caseRewardList.querySelectorAll('.case-reel-track')];
  await new Promise(resolve => requestAnimationFrame(resolve));
  if (animationId !== caseAnimationSequence) return;

  const finishTracks = [];
  const trackAnimations = tracks.map(track => new Promise(resolve => {
    const viewport = track.parentElement;
    const winner = track.querySelector('[data-reel-winner="true"]');
    if (!viewport || !winner) { resolve(); return; }

    let finished = false;
    let fallbackTimer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
      track.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    const onTransitionEnd = event => {
      if (event.target === track && event.propertyName === 'transform') {
        if (animationId === caseAnimationSequence) winner.classList.add('landed');
        finish();
      }
    };
    finishTracks.push(finish);
    track.style.transition = 'none';
    track.style.transform = 'translate3d(0,0,0)';
    const trackRect = track.getBoundingClientRect();
    const winnerRect = winner.getBoundingClientRect();
    const winnerCenter = winnerRect.left - trackRect.left + winnerRect.width / 2;
    const targetX = viewport.clientWidth / 2 - winnerCenter;
    const duration = 6000;
    track.addEventListener('transitionend', onTransitionEnd);
    fallbackTimer = setTimeout(() => {
      if (animationId === caseAnimationSequence) winner.classList.add('landed');
      finish();
    }, duration + 150);
    track.style.transition = `transform ${duration}ms cubic-bezier(.10,.75,.08,1)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (animationId !== caseAnimationSequence) { finish(); return; }
      track.style.transform = `translate3d(${targetX}px,0,0)`;
    }));
  }));

  const cancel = () => {
    if (animationId !== caseAnimationSequence) return;
    caseAnimationSequence++;
    tracks.forEach(track => {
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,0,0)';
    });
    finishTracks.forEach(finish => finish());
  };
  cancelCaseAnimation = cancel;
  await Promise.all(trackAnimations);
  if (cancelCaseAnimation === cancel) cancelCaseAnimation = null;
}

async function showCaseOpeningReview(opening, animate = false) {
  activeCaseOpening = opening;
  caseOpenResults.hidden = false;
  caseAnimationInProgress = Boolean(animate && opening.rewards?.some(reward => reward.status === 'pending'));
  renderCaseOpeningView(caseAnimationInProgress);
  caseOpenResults.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (caseAnimationInProgress) {
    await playCaseReels();
    caseAnimationInProgress = false;
    renderCaseOpeningView(false);
    caseResultStatus.textContent = 'Прокрутка завершена. Выбери, что сделать со скинами.';
  }
}

function openPendingCaseOpening(openingId) {
  const rewards = pendingCaseRewards.filter(reward => String(reward.opening_id) === String(openingId));
  if (!rewards.length) return;
  showCaseOpeningReview({
    opening_id: openingId,
    case_name: rewards[0].case_name,
    case_image_url: rewards[0].case_image_url,
    rewards
  }, false);
}

function addCaseClaimsToInventory(items, bestDrop) {
  if (!Array.isArray(items) || !items.length) return;
  const oldCount = state.inventory.length;
  state.inventory.push(...items);
  if (bestDrop) state.bestDrop = bestDrop;
  myInvCount.textContent = state.inventory.length;
  if (oldCount === 0) renderMyInventory();
  else if (Number(myInventory.dataset.visibleCount || 0) >= oldCount) appendMyInventoryPage();
  else updateMyInventoryLoadMoreButton();
  updateBalanceUI();
  if ($('page-profile').classList.contains('active')) renderProfile();
}

function updateCaseRewardLocally(rewardId, status) {
  pendingCaseRewards = pendingCaseRewards.filter(reward => String(reward.id) !== String(rewardId));
  if (activeCaseOpening) {
    activeCaseOpening.rewards = activeCaseOpening.rewards.map(reward => String(reward.id) === String(rewardId) ? { ...reward, status } : reward);
  }
  renderPendingCaseRewards();
  if (!closeSettledCaseResultsIfEmpty()) renderCaseOpeningView(false);
}

function closeSettledCaseResultsIfEmpty() {
  if (!activeCaseOpening || activeCaseOpening.rewards?.some(reward => reward.status === 'pending')) return false;
  caseOpenResults.hidden = true;
  activeCaseOpening = null;
  caseBackButton.disabled = false;
  return true;
}

async function settleOneCaseReward(rewardId, action) {
  if (!activeCaseOpening || caseSettlementInProgress || caseAnimationInProgress) return;
  caseSettlementInProgress = true;
  renderCaseOpeningView(false);
  caseResultStatus.textContent = action === 'claim' ? 'Добавляю скин в инвентарь…' : 'Продаю скин…';
  try {
    await stateSaveQueue;
    const { data, error } = await supabaseClient.rpc('settle_case_reward', { p_reward_id: rewardId, p_action: action });
    if (error) throw error;
    state.balance = Number(data.balance);
    if (action === 'claim') addCaseClaimsToInventory([data.item], data.best_drop);
    else updateBalanceUI(true);
    updateCaseRewardLocally(rewardId, action === 'claim' ? 'claimed' : 'sold');
    caseFeedback.textContent = action === 'claim'
      ? `Скин «${data.item?.name || 'Предмет'}» добавлен в инвентарь.`
      : `Скин продан за ${fmt(Number(data.amount || 0))}.`;
    await loadPendingCaseRewards();
  } catch (error) {
    caseResultStatus.textContent = 'Не удалось обработать скин. Награда осталась доступна.';
    console.error('Could not settle case reward:', error);
  } finally {
    caseSettlementInProgress = false;
    caseBackButton.disabled = false;
    renderCaseOpeningView(false);
  }
}

async function settleAllCaseRewards(action) {
  if (!activeCaseOpening || caseSettlementInProgress || caseAnimationInProgress) return;
  const openingId = activeCaseOpening.opening_id;
  caseSettlementInProgress = true;
  renderCaseOpeningView(false);
  caseResultStatus.textContent = action === 'claim' ? 'Добавляю все скины в инвентарь…' : 'Продаю все скины…';
  try {
    await stateSaveQueue;
    const { data, error } = await supabaseClient.rpc('settle_case_opening_rewards', {
      p_opening_id: openingId,
      p_action: action
    });
    if (error) throw error;
    state.balance = Number(data.balance);
    if (action === 'claim') addCaseClaimsToInventory(data.items || [], data.best_drop);
    else updateBalanceUI(true);
    const settledStatus = action === 'claim' ? 'claimed' : 'sold';
    activeCaseOpening.rewards = activeCaseOpening.rewards.map(reward => reward.status === 'pending' ? { ...reward, status: settledStatus } : reward);
    pendingCaseRewards = pendingCaseRewards.filter(reward => String(reward.opening_id) !== String(openingId));
    renderPendingCaseRewards();
    closeSettledCaseResultsIfEmpty();
    caseFeedback.textContent = action === 'claim'
      ? `В инвентарь добавлено ${Number(data.settled_count || 0)} скинов.`
      : `Продано ${Number(data.settled_count || 0)} скинов за ${fmt(Number(data.amount || 0))}.`;
    await loadPendingCaseRewards();
  } catch (error) {
    caseResultStatus.textContent = 'Не удалось обработать награды. Они остались доступными.';
    console.error('Could not settle all case rewards:', error);
  } finally {
    caseSettlementInProgress = false;
    caseBackButton.disabled = false;
    renderCaseOpeningView(false);
  }
}

async function openGameCase(caseId, quantity) {
  if (!currentUser || !supabaseClient || caseOpeningInProgress) return;
  const gameCase = gameCases.find(item => String(item.id) === String(caseId));
  if (!gameCase) return;
  caseOpeningInProgress = true;
  caseBackButton.disabled = true;
  caseOpenButton.disabled = true;
  caseOpenQuantityInput.disabled = true;
  const caseQuantitySelect = customSelectInstances.get(caseOpenQuantityInput);
  if (caseQuantitySelect) caseQuantitySelect.trigger.disabled = true;
  caseSkipAnimationToggle.disabled = true;
  caseFeedback.textContent = `Открываю ${quantity} ${quantity === 1 ? 'кейс' : 'кейса'}…`;
  try {
    await stateSaveQueue;
    const { data, error } = await supabaseClient.rpc('open_game_cases', {
      p_case_id: gameCase.id,
      p_quantity: quantity
    });
    if (error) throw error;
    state.balance = Number(data.balance);
    updateBalanceUI(true);
    const rewards = (data.rewards || []).map(reward => ({
      ...reward,
      opening_id: data.opening_id,
      case_name: data.case_name || gameCase.name,
      case_image_url: data.case_image_url || gameCase.image_url || '',
      created_at: data.created_at || new Date().toISOString()
    }));
    pendingCaseRewards = [...new Map([...pendingCaseRewards, ...rewards].map(reward => [String(reward.id), reward])).values()];
    renderPendingCaseRewards();
    caseFeedback.textContent = `${quantity} ${quantity === 1 ? 'кейс открыт' : 'кейса открыто'}. Выбери, забрать или продать выпавшие скины.`;
    await showCaseOpeningReview({
      opening_id: data.opening_id,
      case_name: data.case_name || gameCase.name,
      case_image_url: data.case_image_url || gameCase.image_url || '',
      rewards
    }, !caseSkipAnimation);
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    caseFeedback.textContent = message.includes('insufficient balance')
      ? 'Не хватает баланса на открытие выбранного количества кейсов.'
      : message.includes('open_game_cases') || message.includes('function')
        ? 'Сначала выполни обновлённый supabase/cases.sql в SQL Editor.'
        : 'Кейсы не открылись. Повтори попытку.';
    console.error('Could not open game cases:', error);
  } finally {
    caseOpeningInProgress = false;
    caseBackButton.disabled = caseSettlementInProgress;
    caseOpenButton.disabled = false;
    caseOpenQuantityInput.disabled = false;
    if (caseQuantitySelect) caseQuantitySelect.trigger.disabled = false;
    caseSkipAnimationToggle.disabled = false;
  }
}

adminCaseNewBtn.addEventListener('click', openNewCaseEditor);
adminCaseCancel.addEventListener('click', resetCaseEditor);
adminCaseSkinSearch.addEventListener('input', renderCaseSkinResults);
adminCaseImageFile.addEventListener('change', () => void uploadCaseImage(adminCaseImageFile.files?.[0]));
adminCaseSkinResults.addEventListener('click', event => {
  const button = event.target.closest('[data-case-add]');
  if (!button || button.disabled) return;
  const item = SKINS_CATALOG.find(entry => String(entry.id) === button.dataset.caseAdd);
  if (item) addCaseSkin(item);
});
adminCaseContents.addEventListener('input', event => {
  const input = event.target.closest('[data-case-chance]');
  if (!input) return;
  const index = Number(input.dataset.caseChance);
  if (!caseDraftContents[index]) return;
  caseDraftContents[index].chance = Number(input.value);
  renderCaseChanceTotal();
});
adminCaseContents.addEventListener('click', event => {
  const button = event.target.closest('[data-case-remove]');
  if (!button) return;
  caseDraftContents.splice(Number(button.dataset.caseRemove), 1);
  renderCaseDraftContents();
  renderCaseSkinResults();
});
adminCaseList.addEventListener('click', event => {
  const button = event.target.closest('[data-case-edit]');
  if (!button || currentUser?.role !== 'admin') return;
  const gameCase = gameCases.find(item => String(item.id) === button.dataset.caseEdit);
  if (gameCase) openCaseEditor(gameCase);
});
adminCaseForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'admin' || caseImageUploadInProgress) return;
  const name = adminCaseName.value.trim();
  const price = amountToRub(Number(adminCasePrice.value));
  const chanceTotal = caseDraftContents.reduce((sum, entry) => sum + Number(entry.chance || 0), 0);
  if (name.length < 2 || name.length > 40 || !(price > 0) || price > 100000000) {
    adminCaseFeedback.textContent = 'Проверь название и цену кейса.';
    return;
  }
  if (!caseDraftContents.length) {
    adminCaseFeedback.textContent = 'Добавь хотя бы один скин.';
    return;
  }
  if (caseDraftContents.some(entry => !Number.isFinite(Number(entry.chance)) || Number(entry.chance) < 0.1 || Number(entry.chance) > 100) || Math.abs(chanceTotal - 100) > 0.001) {
    adminCaseFeedback.textContent = 'Укажи шанс от 0.1% для каждого скина; сумма должна быть ровно 100.0%.';
    return;
  }
  adminCaseSaveBtn.disabled = true;
  adminCaseFeedback.textContent = 'Сохраняю кейс…';
  try {
    const { data, error } = await supabaseClient.rpc('admin_save_game_case', {
      p_case_id: caseEditorId,
      p_name: name,
      p_price: price,
      p_image_url: caseImageUrl || null,
      p_contents: caseDraftContents.map(entry => ({ item: entry.item, chance: Number(entry.chance) }))
    });
    if (error) throw error;
    caseEditorId = data.id;
    adminCaseFormTitle.textContent = 'Изменить кейс';
    adminCaseSaveBtn.textContent = 'Сохранить изменения';
    adminCaseFeedback.textContent = 'Кейс сохранён.';
    await loadCases();
    adminCaseDeleteBtn.hidden = false;
  } catch (error) {
    adminCaseFeedback.textContent = String(error.message || '').toLowerCase().includes('admin_save_game_case')
      ? 'Выполни supabase/cases.sql в SQL Editor.'
      : 'Не удалось сохранить кейс. Проверь данные и подключение.';
    console.error('Could not save game case:', error);
  } finally {
    adminCaseSaveBtn.disabled = false;
  }
});
adminCaseDeleteBtn.addEventListener('click', () => {
  if (!caseEditorId) return;
  openConfirm('Удалить кейс?', `Кейс «${adminCaseName.value}» будет удалён из списка.`, async () => {
    adminCaseDeleteBtn.disabled = true;
    const { error } = await supabaseClient.rpc('admin_delete_game_case', { p_case_id: caseEditorId });
    if (error) {
      adminCaseFeedback.textContent = 'Не удалось удалить кейс.';
      console.error('Could not delete game case:', error);
      adminCaseDeleteBtn.disabled = false;
      return;
    }
    resetCaseEditor();
    await loadCases();
  });
});
casesGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-case-open]');
  if (!button || caseOpeningInProgress) return;
  openCaseDetails(button.dataset.caseOpen);
});
caseOpenQuantityInput.addEventListener('change', () => {
  updateCaseOpenButton();
});
caseOpenButton.addEventListener('click', () => {
  if (!selectedGameCase || caseOpeningInProgress) return;
  const quantity = Number(caseOpenQuantityInput.value || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    caseFeedback.textContent = 'Можно открыть от 1 до 10 кейсов за раз.';
    return;
  }
  caseOpenQuantityInput.value = String(quantity);
  updateCaseOpenButton();
  void openGameCase(selectedGameCase.id, quantity);
});
pendingCaseRewardsList.addEventListener('click', event => {
  const button = event.target.closest('[data-pending-opening]');
  if (button) openPendingCaseOpening(button.dataset.pendingOpening);
});
caseRewardList.addEventListener('click', event => {
  const button = event.target.closest('[data-reward-action]');
  if (!button || caseSettlementInProgress || caseAnimationInProgress) return;
  void settleOneCaseReward(button.dataset.rewardId, button.dataset.rewardAction);
});
caseClaimAllBtn.addEventListener('click', () => void settleAllCaseRewards('claim'));
caseSellAllBtn.addEventListener('click', () => void settleAllCaseRewards('sell'));
caseSkipAnimationToggle.addEventListener('change', () => {
  caseSkipAnimation = caseSkipAnimationToggle.checked;
  try { localStorage.setItem(CASE_SKIP_ANIMATION_KEY, String(caseSkipAnimation)); } catch (e) {}
});
try {
  caseSkipAnimation = localStorage.getItem(CASE_SKIP_ANIMATION_KEY) === 'true';
} catch (e) { caseSkipAnimation = false; }
caseSkipAnimationToggle.checked = caseSkipAnimation;
caseBackButton.addEventListener('click', () => {
  if ((caseOpeningInProgress && !caseAnimationInProgress) || caseSettlementInProgress) return;
  if (cancelCaseAnimation) cancelCaseAnimation();
  else caseAnimationSequence++;
  caseAnimationInProgress = false;
  selectedGameCase = null;
  activeCaseOpening = null;
  caseOpenResults.hidden = true;
  caseBackButton.disabled = false;
  caseDetailView.hidden = true;
  caseListView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function closeAdminInventoryModal() {
  adminInventoryModal.classList.remove('show');
  adminInventoryModal.setAttribute('aria-hidden', 'true');
  activeAdminInventoryPlayerId = null;
}

async function loadAdminPlayerInventory(playerId, username = '') {
  if (!currentUser || currentUser.role !== 'admin') return;
  const requestedPlayerId = Number(playerId);
  activeAdminInventoryPlayerId = requestedPlayerId;
  adminInventoryTitle.textContent = username ? 'Инвентарь · ' + username + ' (#' + playerId + ')' : 'Инвентарь игрока #' + playerId;
  adminInventorySummary.textContent = '';
  adminInventoryFeedback.textContent = '';
  adminInventoryGrid.innerHTML = '<div class="admin-inventory-empty">Загружаю инвентарь…</div>';
  adminInventoryModal.classList.add('show');
  adminInventoryModal.setAttribute('aria-hidden', 'false');

  const { data, error } = await supabaseClient.rpc('admin_get_player_inventory', { p_player_id: requestedPlayerId });
  if (activeAdminInventoryPlayerId !== requestedPlayerId) return;
  if (error) {
    adminInventoryGrid.innerHTML = '<div class="admin-inventory-empty">Не удалось загрузить инвентарь. Примените SQL-миграцию админ-инвентаря.</div>';
    console.error('Could not load admin player inventory:', error);
    return;
  }

  activeAdminInventoryPlayerId = Number(data.player_id);
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  const totalValue = inventory.reduce((sum, item) => sum + Number(item.price || 0), 0);
  adminInventoryTitle.textContent = 'Инвентарь · ' + data.username + ' (#' + data.player_id + ')';
  adminInventorySummary.textContent = inventory.length + ' предметов · стоимость ' + fmt(totalValue) + ' · продажа с комиссией ' + Math.round(SELL_COMMISSION * 100) + '%';
  adminInventoryGrid.innerHTML = inventory.length
    ? inventory.map(item => {
      const saleValue = Math.round(Number(item.price || 0) * (1 - SELL_COMMISSION) * 100) / 100;
      return '<article class="admin-inventory-card">' +
        '<img src="' + escapeHtml(item.img || '') + '" alt="">' +
        '<div class="admin-inventory-item-info"><strong title="' + escapeHtml(item.name || 'Предмет') + '">' + escapeHtml(item.name || 'Предмет') + '</strong><span>' + fmt(Number(item.price || 0)) + '</span></div>' +
        '<div class="admin-inventory-actions">' +
        '<button type="button" class="btn-small admin-inventory-action" data-action="sell" data-item-id="' + escapeHtml(item.instanceId || '') + '" data-item-name="' + escapeHtml(item.name || 'Предмет') + '" data-sale-value="' + saleValue + '">Продать · ' + fmt(saleValue) + '</button>' +
        '<button type="button" class="btn-small danger admin-inventory-action" data-action="delete" data-item-id="' + escapeHtml(item.instanceId || '') + '" data-item-name="' + escapeHtml(item.name || 'Предмет') + '">Удалить</button>' +
        '</div></article>';
    }).join('')
    : '<div class="admin-inventory-empty">Инвентарь пуст.</div>';
}

async function performAdminInventoryAction(action, itemId) {
  if (!currentUser || currentUser.role !== 'admin' || !activeAdminInventoryPlayerId || adminInventoryOperationInFlight) return;
  const playerId = activeAdminInventoryPlayerId;
  adminInventoryOperationInFlight = true;
  adminInventoryGrid.querySelectorAll('.admin-inventory-action').forEach(button => { button.disabled = true; });
  adminInventoryFeedback.textContent = action === 'sell' ? 'Продаю предмет…' : 'Удаляю предмет…';

  const { data, error } = await supabaseClient.rpc('admin_manage_player_inventory', {
    p_player_id: playerId,
    p_inventory_item_id: itemId,
    p_action: action
  });
  if (error) {
    adminInventoryFeedback.textContent = String(error.message || '').toLowerCase().includes('item not found')
      ? 'Предмет уже отсутствует в инвентаре.'
      : 'Операция не выполнена. Проверьте права администратора и соединение.';
    console.error('Could not manage admin player inventory:', error);
    adminInventoryOperationInFlight = false;
    adminInventoryGrid.querySelectorAll('.admin-inventory-action').forEach(button => { button.disabled = false; });
    return;
  }

  const notice = action === 'sell'
    ? 'Предмет продан за ' + fmt(Number(data.amount || 0)) + '; баланс игрока: ' + fmt(Number(data.balance || 0)) + '.'
    : 'Предмет «' + (data.item_name || 'Предмет') + '» удалён.';
  const refreshOpenInventory = adminInventoryModal.classList.contains('show') && activeAdminInventoryPlayerId === playerId;
  if (refreshOpenInventory) {
    await loadAdminPlayerInventory(playerId, data.username);
    adminInventoryFeedback.textContent = notice;
  }
  adminInventoryOperationInFlight = false;
  await renderAdminUsers();

  if (String(currentUser.playerId) === String(playerId)) {
    await loadUserState();
    updateBalanceUI();
    renderMyInventory();
    renderInventory();
    renderProfile();
    restoreSlotsFromState();
  }
}

adminUsersEl.addEventListener('click', event => {
  const button = event.target.closest('.admin-inventory-open');
  if (button) void loadAdminPlayerInventory(button.dataset.playerId, button.dataset.username);
});

adminInventoryClose.addEventListener('click', closeAdminInventoryModal);
adminInventoryModal.addEventListener('click', event => {
  if (event.target === adminInventoryModal) closeAdminInventoryModal();
});

adminInventoryGrid.addEventListener('click', event => {
  const button = event.target.closest('.admin-inventory-action');
  if (!button || adminInventoryOperationInFlight) return;
  const action = button.dataset.action;
  const itemId = button.dataset.itemId;
  const itemName = button.dataset.itemName || 'Предмет';
  const text = action === 'sell'
    ? 'Продать «' + itemName + '» и зачислить игроку ' + fmt(Number(button.dataset.saleValue || 0)) + '?'
    : 'Удалить «' + itemName + '» из инвентаря без начисления баланса?';
  openConfirm(action === 'sell' ? 'Продать предмет игрока?' : 'Удалить предмет игрока?', text, () => {
    void performAdminInventoryAction(action, itemId);
  });
});

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
async function fetchCatalogJson(file) {
  // GitHub Pages serves .gz files as ordinary downloads rather than applying
  // HTTP content-encoding. Fetching them directly cuts the catalog transfer
  // from tens of megabytes to well under one megabyte.
  if (typeof DecompressionStream === 'function') {
    try {
      const compressedResponse = await fetch(`${file}.gz`);
      if (compressedResponse.ok && compressedResponse.body) {
        const decompressed = compressedResponse.body.pipeThrough(new DecompressionStream('gzip'));
        return await new Response(decompressed).json();
      }
    } catch (error) {
      console.warn(`Compressed catalog ${file}.gz could not be read; trying JSON fallback:`, error);
    }
  }

  const response = await fetch(file);
  if (!response.ok) throw new Error(`Catalog file failed: ${response.url} (${response.status})`);
  return response.json();
}

async function loadSkins() {
  try {
    const catalogFiles = [
      { file: 'skins_variants.json', type: 'skin', category: null },
      { file: 'stickers.json', type: 'stickers', category: 'Stickers' },
      { file: 'agents.json', type: 'agents', category: 'Agents' },
      { file: 'graffiti.json', type: 'graffiti', category: 'Graffiti' },
      { file: 'music_kits.json', type: 'music_kits', category: 'Music Kits' },
    ];
    const [datasets, metadataResponse] = await Promise.all([
      Promise.all(catalogFiles.map(entry => fetchCatalogJson(entry.file))),
      fetch('catalog-source.json').catch(() => null),
    ]);

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
        document.querySelectorAll('[data-new-items-option]').forEach(option => {
          option.textContent = `Новинки ${catalogReleaseYear}`;
        });
        syncCustomSelect(invCategory);
        syncCustomSelect(targetCategory);
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
      if (currentUser.role === 'admin' && !adminCaseForm.hidden) renderCaseSkinResults();
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
  updateUpgradeSelectionCards();
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
  updateUpgradeSelectionCards();
}

// ============================================================
// КАРТОЧКА
// ============================================================
function buildCatalogCard(item, { disabled, source, onClick }) {
  const card = document.createElement('div');
  card.className = 'inv-card' + (disabled ? ' disabled' : '');
  card.setAttribute('aria-disabled', String(Boolean(disabled)));
  if (item.id != null) card.dataset.catalogId = String(item.id);
  card.dataset.cardSource = source;
  card.dataset.price = String(Number(item.price || 0));
  const rarityColor = /^#[0-9a-f]{6}$/i.test(item.rarity?.color || '') ? item.rarity.color : '';
  if (rarityColor) card.style.setProperty('--item-rarity-color', rarityColor);
  const isCurrentYearItem = item.releaseYear === catalogReleaseYear;
  const selected = source === 'catalog' && state.inventory.some(inv => inv.catalogId === item.id && state.betItemIds.includes(inv.instanceId));
  const marketQuantity = source === 'catalog' ? Number(marketSelection.get(String(item.id)) || 0) : 0;
  const selectedForPurchase = marketQuantity > 0;
  if (selected) card.classList.add('active');
  const qualityParts = [item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : '', item.effect].filter(Boolean);
  if (item.floatMin != null && item.floatMax != null && item.floatMax > item.floatMin) {
    qualityParts.push(`${Number(item.floatMin).toFixed(2)}–${Number(item.floatMax).toFixed(2)}`);
  }
  if (item.pattern && item.pattern !== item.name) qualityParts.push(item.pattern);

  card.innerHTML = `
    ${source === 'catalog' ? '<div class="card-badge buy">$</div>' : ''}
    ${isCurrentYearItem ? `<div class="card-badge new">${escapeHtml(catalogReleaseYear)}</div>` : ''}
    <div class="item-img"><img src="${escapeHtml(item.img || '')}" alt="" loading="lazy">${selectedForPurchase ? `<span class="market-quantity-badge">×${marketQuantity}</span>` : ''}</div>
    <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
    <div class="item-price">${fmt(item.price)}</div>
    ${qualityParts.length ? `<div class="item-quality">${qualityParts.map(part => escapeHtml(part)).join(' · ')}</div>` : ''}
    <div class="item-rarity">${escapeHtml(item.rarity?.name || item.category || 'Предмет')}</div>
  `;

  const marketCancelBadge = card.querySelector('.market-quantity-badge');
  if (marketCancelBadge) {
    marketCancelBadge.setAttribute('role', 'button');
    marketCancelBadge.setAttribute('tabindex', '0');
    marketCancelBadge.setAttribute('aria-label', 'Отменить выбор всех копий этого скина');
    marketCancelBadge.title = 'Нажми, чтобы отменить выбор этого скина';
    marketCancelBadge.addEventListener('click', event => {
      event.stopPropagation();
      cancelMarketSelection(item.id);
    });
    marketCancelBadge.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      cancelMarketSelection(item.id);
    });
  }
  if (onClick) card.addEventListener('click', onClick);
  return card;
}

function getMarketSelectionEntries() {
  return [...marketSelection]
    .map(([id, quantity]) => ({ item: SKINS_CATALOG.find(item => String(item.id) === id), quantity: Number(quantity) }))
    .filter(entry => entry.item && entry.quantity > 0);
}

function marketSelectionTotal() {
  return getMarketSelectionEntries().reduce((sum, entry) => sum + Number(entry.item.price || 0) * entry.quantity, 0);
}

function updateMarketCard(itemId) {
  const card = [...inventoryGrid.querySelectorAll('.inv-card')].find(element => element.dataset.catalogId === String(itemId));
  if (!card) return;
  const quantity = Number(marketSelection.get(String(itemId)) || 0);
  const image = card.querySelector('.item-img');
  let badge = image.querySelector('.market-quantity-badge');
  if (!quantity) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'market-quantity-badge';
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('aria-label', 'Отменить выбор всех копий этого скина');
    badge.title = 'Нажми, чтобы отменить выбор этого скина';
    badge.addEventListener('click', event => {
      event.stopPropagation();
      cancelMarketSelection(itemId);
    });
    badge.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      cancelMarketSelection(itemId);
    });
    image.appendChild(badge);
  }
  badge.textContent = '×' + quantity;
}

function cancelMarketSelection(itemId) {
  marketSelection.delete(String(itemId));
  warningEl.classList.remove('show');
  updateMarketCard(itemId);
  updateBuySelectedButton();
}

function updateBuySelectedButton() {
  const entries = getMarketSelectionEntries();
  const quantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + Number(entry.item.price || 0) * entry.quantity, 0);
  buySelectedBtn.hidden = !catalogMode || quantity === 0;
  buySelectedBtn.disabled = quantity === 0 || total > Number(state.balance || 0) + 1e-8;
  buySelectedBtn.textContent = `Купить ${quantity} · ${fmt(total)}`;
}

function toggleMarketSelection(item) {
  const id = String(item.id);
  const price = Number(item.price || 0);
  const nextTotal = marketSelectionTotal() + price;
  if (!(price > 0) || nextTotal > Number(state.balance || 0) + 1e-8) {
    warningEl.textContent = `Не хватает баланса на этот выбор. Доступно ${fmt(state.balance)}.`;
    warningEl.classList.add('show');
    return;
  }
  marketSelection.set(id, Number(marketSelection.get(id) || 0) + 1);
  warningEl.classList.remove('show');
  updateMarketCard(id);
  updateBuySelectedButton();
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

  shown.forEach(item => {
    const card = buildCatalogCard(item, {
      disabled: false, source: 'catalog',
      onClick: () => toggleMarketSelection(item)
    });
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
    targetGrid.appendChild(card);
  });

  if (items.length > MAX_RENDER) {
    const more = document.createElement('div');
    more.style.cssText = 'grid-column:1/-1;text-align:center;color:#666;font-size:10px;padding:8px';
    more.textContent = `Показано ${MAX_RENDER} из ${items.length}. Уточните поиск.`;
    targetGrid.appendChild(more);
  }
}

function updateUpgradeSelectionCards() {
  const selectedItems = getSelectedBetItems();
  const selectedInstanceIds = new Set(selectedItems.map(item => String(item.instanceId)));
  const selectedCatalogIds = new Set(selectedItems.map(item => String(item.catalogId)));

  myInventory.querySelectorAll('.inv-card[data-instance-id]').forEach(card => {
    const selected = selectedInstanceIds.has(card.dataset.instanceId);
    card.classList.toggle('active', selected);
    card.classList.toggle('selected-bet', selected);
    let badge = card.querySelector('.card-badge.owned');
    if (selected && !badge) {
      badge = document.createElement('div');
      badge.className = 'card-badge owned';
      badge.textContent = 'Ставка';
      card.prepend(badge);
    } else if (!selected && badge) {
      badge.remove();
    }
  });

  inventoryGrid.querySelectorAll('.inv-card[data-catalog-id]').forEach(card => {
    card.classList.toggle('active', selectedCatalogIds.has(card.dataset.catalogId));
  });

  targetGrid.querySelectorAll('.inv-card[data-catalog-id]').forEach(card => {
    const price = Number(card.dataset.price || 0);
    const disabled = (betData && (price < betData.price || calculateChance(betData.price, price) < 0.01))
      || selectedCatalogIds.has(card.dataset.catalogId);
    card.classList.toggle('disabled', Boolean(disabled));
    card.setAttribute('aria-disabled', String(Boolean(disabled)));
    card.classList.toggle('active', String(targetData?.id) === card.dataset.catalogId);
  });
}

// ============================================================
// МОЙ ИНВЕНТАРЬ
// ============================================================
function appendMyInventoryCard(idx) {
  const inv = state.inventory[idx];
  if (!inv) return;
  const selected = state.betItemIds.includes(inv.instanceId);
  const card = document.createElement('div');
  card.className = 'inv-card' + (selected ? ' active selected-bet' : '');
  card.dataset.instanceId = String(inv.instanceId);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${inv.name || 'Предмет'}, ${fmt(inv.price)}`);
  if (selected) {
    const badge = document.createElement('div');
    badge.className = 'card-badge owned';
    badge.textContent = 'Ставка';
    card.appendChild(badge);
  }
  const imageWrap = document.createElement('div');
  imageWrap.className = 'item-img';
  const image = document.createElement('img');
  image.src = inv.img || '';
  image.alt = '';
  image.loading = 'lazy';
  imageWrap.appendChild(image);
  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = inv.name || 'Предмет';
  name.title = inv.name || 'Предмет';
  const price = document.createElement('div');
  price.className = 'item-price';
  price.textContent = fmt(inv.price);
  const qualities = [inv.wear, inv.stattrak ? 'StatTrak™' : '', inv.souvenir ? 'Souvenir' : '', inv.effect].filter(Boolean);
  card.append(imageWrap, name, price);
  if (qualities.length) {
    const quality = document.createElement('div');
    quality.className = 'item-quality';
    quality.textContent = qualities.join(' · ');
    card.appendChild(quality);
  }
  card.addEventListener('click', () => selectBet(inv));
  card.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectBet(inv);
  });
  myInventory.appendChild(card);
}

function appendMyInventoryPage() {
  const start = Number(myInventory.dataset.visibleCount || 0);
  const end = Math.min(start + PROFILE_INVENTORY_PAGE_SIZE, state.inventory.length);
  for (let idx = start; idx < end; idx += 1) appendMyInventoryCard(idx);
  myInventory.dataset.visibleCount = String(end);
  updateMyInventoryLoadMoreButton();
}

function updateMyInventoryLoadMoreButton() {
  const visibleCount = Number(myInventory.dataset.visibleCount || 0);
  myInventory.querySelector('.inventory-load-more')?.remove();
  if (visibleCount < state.inventory.length) {
    const remaining = state.inventory.length - visibleCount;
    const loadMore = document.createElement('button');
    loadMore.type = 'button';
    loadMore.className = 'btn-small inventory-load-more';
    loadMore.textContent = 'Показать ещё ' + Math.min(PROFILE_INVENTORY_PAGE_SIZE, remaining) + ' из ' + remaining;
    loadMore.addEventListener('click', appendMyInventoryPage);
    myInventory.appendChild(loadMore);
  }
}

function renderMyInventory() {
  if (!currentUser) return;
  updateBalanceUI();
  myInvCount.textContent = state.inventory.length;
  myInventory.innerHTML = '';
  myInventory.dataset.visibleCount = '0';

  if (state.inventory.length === 0) {
    myInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:11px;padding:16px">Пусто. Добавь предмет из каталога слева.</div>';
    return;
  }
  appendMyInventoryPage();
}

function openBattlePicker(mode, battleId = null) {
  battlePickerMode = mode === 'join' ? 'join' : 'create';
  battlePickerBattleId = battlePickerMode === 'join' ? battleId : null;
  selectedBattleSkinIds.clear();
  battlePickerTitle.textContent = battlePickerMode === 'join' ? 'Выбери скины для входа' : 'Создать батл';
  const battle = latestBattles.find(item => item.id === battlePickerBattleId);
  battlePickerHelp.textContent = battlePickerMode === 'join'
    ? `Выбери от 1 до 5 скинов. Общая ставка должна быть не меньше 95% ставки создателя (${fmt(minimumGuestStake(getBattleStakeTotal(battle?.creator_skin)))}).`
    : 'Выбери от 1 до 5 скинов. Предметы будут заблокированы до отмены или завершения батла.';
  battlePickerFeedback.textContent = '';
  battlePickerStatus.textContent = 'Выбери от 1 до 5 предметов';
  battlePickerConfirm.textContent = battlePickerMode === 'join' ? 'Вступить в батл' : 'Создать батл';
  battlePickerModal.classList.add('show');
  battlePickerModal.setAttribute('aria-hidden', 'false');
  renderBattlePicker();
}

function closeBattlePicker() {
  battlePickerModal.classList.remove('show');
  battlePickerModal.setAttribute('aria-hidden', 'true');
  selectedBattleSkinIds.clear();
}

function renderBattlePicker() {
  const battle = latestBattles.find(item => item.id === battlePickerBattleId);
  const requiredPrice = battlePickerMode === 'join' ? minimumGuestStake(getBattleStakeTotal(battle?.creator_skin)) : 0;
  const available = state.inventory;
  const availableIds = new Set(available.map(item => item.instanceId));
  selectedBattleSkinIds = new Set([...selectedBattleSkinIds].filter(id => availableIds.has(id)));
  battlePickerGrid.innerHTML = '';
  if (!available.length) {
    battlePickerGrid.innerHTML = '<div class="battle-empty">Инвентарь пуст. Сначала добавь скин из каталога.</div>';
  } else {
    available.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      const selected = selectedBattleSkinIds.has(item.instanceId);
      card.className = `battle-inventory-item${selected ? ' selected' : ''}`;
      card.setAttribute('aria-pressed', String(selected));
      card.innerHTML = `<img src="${escapeHtml(item.img || '')}" alt=""><span class="battle-inventory-name">${escapeHtml(item.name)}</span><span class="battle-inventory-price">${fmt(Number(item.price || 0))}</span>`;
      card.addEventListener('click', () => {
        if (selectedBattleSkinIds.has(item.instanceId)) {
          selectedBattleSkinIds.delete(item.instanceId);
          battlePickerFeedback.textContent = '';
        } else if (selectedBattleSkinIds.size < 5) {
          selectedBattleSkinIds.add(item.instanceId);
          battlePickerFeedback.textContent = '';
        } else battlePickerFeedback.textContent = 'В одном батле можно поставить максимум 5 скинов.';
        renderBattlePicker();
      });
      battlePickerGrid.appendChild(card);
    });
  }
  const selected = state.inventory.filter(item => selectedBattleSkinIds.has(item.instanceId));
  const selectedTotal = selected.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const enoughForJoin = battlePickerMode !== 'join' || selectedTotal + 1e-8 >= requiredPrice;
  battlePickerStatus.textContent = selected.length
    ? `Выбрано ${selected.length}/5 · сумма ${fmt(selectedTotal)}${battlePickerMode === 'join' ? ` · минимум ${fmt(requiredPrice)}` : ''}`
    : `Выбери от 1 до 5 предметов${battlePickerMode === 'join' ? ` · минимум ${fmt(requiredPrice)}` : ''}`;
  battlePickerConfirm.disabled = selected.length === 0 || !enoughForJoin;
}

openCreateBattleBtn.addEventListener('click', () => openBattlePicker('create'));
battlePickerCancel.addEventListener('click', closeBattlePicker);
battlePickerModal.addEventListener('click', event => { if (event.target === battlePickerModal) closeBattlePicker(); });

function minimumGuestStake(creatorPrice) {
  return Math.ceil(Number(creatorPrice || 0) * 95 - 1e-7) / 100;
}

function getBattleStakeItems(stake) {
  if (Array.isArray(stake)) return stake.filter(item => item && typeof item === 'object');
  return stake && typeof stake === 'object' ? [stake] : [];
}

function getBattleStakeTotal(stake) {
  return getBattleStakeItems(stake).reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function renderBattleStakeItems(stake, emptyText = 'Ожидает входа') {
  const items = getBattleStakeItems(stake);
  if (!items.length) return `<span>${escapeHtml(emptyText)}</span>`;
  return `<div class="battle-stake-items">${items.map(item => `<div class="battle-stake-item"><img src="${escapeHtml(item.img || '')}" alt=""><span title="${escapeHtml(item.name || 'Скин')}">${escapeHtml(item.name || 'Скин')}</span><small>${fmt(Number(item.price || 0))}</small></div>`).join('')}</div>`;
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
  battleWheelCtx.save();
  battleWheelCtx.fillStyle = '#101010';
  battleWheelCtx.font = '700 15px Arial';
  battleWheelCtx.textAlign = 'center';
  battleWheelCtx.textBaseline = 'middle';
  battleWheelCtx.fillText('СОЗДАТЕЛЬ', cx - radius * 0.46, cy);
  battleWheelCtx.fillText('ГОСТЬ', cx + radius * 0.46, cy);
  battleWheelCtx.restore();
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
  battleRoomBank.textContent = fmt(Number(battle.bank_value || getBattleStakeTotal(battle.creator_skin) + getBattleStakeTotal(battle.guest_skin)));
  const creatorProfile = await getBattleParticipantProfile(battle.creator_user_id).catch(() => null);
  const guestProfile = battle.guest_user_id ? await getBattleParticipantProfile(battle.guest_user_id).catch(() => null) : null;
  $('battleCreatorName').textContent = creatorProfile?.username || battle.creator_name || 'Создатель';
  setBattleAvatar('battleCreatorAvatar', 'battleCreatorAvatarFallback', creatorProfile?.avatar);
  $('battleCreatorSkins').innerHTML = renderBattleStakeItems(battle.creator_skin, 'Нет скинов');
  $('battleCreatorSkinPrice').textContent = fmt(getBattleStakeTotal(battle.creator_skin));
  $('battleGuestName').textContent = guestProfile?.username || battle.guest_name || 'Ждём гостя';
  setBattleAvatar('battleGuestAvatar', 'battleGuestAvatarFallback', guestProfile?.avatar);
  $('battleGuestSkins').innerHTML = renderBattleStakeItems(battle.guest_skin);
  $('battleGuestSkinPrice').textContent = battle.guest_skin ? fmt(getBattleStakeTotal(battle.guest_skin)) : '—';
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
  const winnerSide = battle.winner_side === 'creator' ? 'creator' : 'guest';
  const sliceCenter = winnerSide === 'creator' ? 180 : 0;
  const pointerAngle = 270;
  const targetAngle = (pointerAngle - sliceCenter + 360) % 360;
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
  const creatorSkins = getBattleStakeItems(battle.creator_skin);
  const guestSkins = getBattleStakeItems(battle.guest_skin);
  const waiting = battle.status === 'waiting';
  const ownBattle = battle.creator_user_id === currentUser.id;
  const outcomeDeferred = battle.status === 'completed' && deferredBattleResults.has(battle.id);
  const bankValue = Number(battle.bank_value || getBattleStakeTotal(battle.creator_skin) + getBattleStakeTotal(battle.guest_skin));
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
  const guestContent = guestSkins.length
    ? renderBattleStakeItems(guestSkins)
    : '<span>Ожидает гостя</span>';
  const stateLabel = waiting ? (ownBattle ? 'Ожидание' : 'Открыт') : (outcomeDeferred ? 'Колесо крутится…' : battle.status === 'completed' ? 'Завершён' : 'Отменён');
  return `<article class="battle-card ${waiting ? 'battle-open' : 'battle-finished'} ${archived ? 'archive-card' : ''}">
    <div class="battle-card-head"><span>Батл ${escapeHtml(String(battle.id).slice(0, 8))}</span><span>${stateLabel}</span></div>
    <div class="battle-matchup">
      <div class="battle-side creator-side"><span class="battle-side-label">Создатель · зелёная</span><strong>${escapeHtml(battle.creator_name || 'Игрок')}</strong>${renderBattleStakeItems(creatorSkins, 'Нет скинов')}<small>Ставка ${fmt(getBattleStakeTotal(creatorSkins))}</small></div>
      <div class="battle-vs"><strong>VS</strong><span>Банк<br>${fmt(bankValue)}</span></div>
      <div class="battle-side guest-side ${guestSkins.length ? '' : 'waiting-side'}"><span class="battle-side-label">Гость · белая</span><strong>${escapeHtml(battle.guest_name || 'Гость')}</strong>${guestContent}${guestSkins.length ? `<small>Ставка ${fmt(getBattleStakeTotal(guestSkins))}</small>` : ''}</div>
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
  const selectedStakes = state.inventory.filter(item => selectedBattleSkinIds.has(item.instanceId));
  const selectedTotal = selectedStakes.reduce((sum, item) => sum + Number(item.price || 0), 0);
  if (!selectedStakes.length || selectedStakes.length > 5) return;
  battlePickerConfirm.disabled = true;
  battlePickerFeedback.textContent = battlePickerMode === 'join' ? 'Вступаю в батл…' : 'Создаю батл…';
  if (battlePickerMode === 'create') {
    const creatorSkins = selectedStakes.map(item => ({ ...item }));
    const { data: battleId, error } = await supabaseClient.rpc('create_skin_battle', { p_inventory_item_ids: selectedStakes.map(item => item.instanceId) });
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
      creator_skin: creatorSkins, bank_value: selectedTotal, status: 'waiting'
    };
    openBattleRoom(battle);
  } else {
    const battle = latestBattles.find(item => item.id === battlePickerBattleId);
    if (!battle || selectedTotal + 1e-8 < minimumGuestStake(getBattleStakeTotal(battle.creator_skin))) {
      battlePickerFeedback.textContent = 'Сумма выбранных скинов должна быть не меньше 95% ставки создателя.';
      battlePickerConfirm.disabled = false;
      return;
    }
    const { data, error } = await supabaseClient.rpc('join_skin_battle', {
      p_battle_id: battlePickerBattleId,
      p_inventory_item_ids: selectedStakes.map(item => item.instanceId)
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
  if (currentUser) void loadUpgradeFeed();
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
  updateUpgradeSelectionCards();
}

// ============================================================
// МОДАЛКА ПОКУПКИ
// ============================================================
function renderPurchaseReview() {
  const entries = pendingBuy?.entries || [];
  const quantity = entries.reduce((sum, entry) => sum + Number(entry.quantity), 0);
  const total = entries.reduce((sum, entry) => sum + Number(entry.item.price || 0) * Number(entry.quantity), 0);
  modalTitle.textContent = quantity === 1 ? 'Подтверди покупку' : `Подтверди покупку · ${quantity} шт.`;
  modalItem.innerHTML = entries.length
    ? `<div class="purchase-batch-list">${entries.map(({ item, quantity: count }) => `<div class="purchase-batch-item">
        <img src="${escapeHtml(item.img || '')}" alt="">
        <span>${escapeHtml(item.name)} <small>×${count}</small></span>
        <strong>${fmt(Number(item.price || 0) * count)}</strong>
        <button type="button" class="purchase-remove" data-item-id="${escapeHtml(item.id)}" aria-label="Убрать ${escapeHtml(item.name)} из корзины" title="Убрать из корзины"><iconify-icon icon="mdi:trash-can-outline"></iconify-icon></button>
      </div>`).join('')}</div>`
    : '<div class="purchase-cart-empty">Корзина пуста. Вернись в каталог и выбери скины.</div>';
  modalPrice.textContent = fmt(total);
  modalConfirm.disabled = entries.length === 0;
  modalConfirm.textContent = entries.length ? `Купить ${quantity} за ${fmt(total)}` : 'Корзина пуста';
}

function openBuyModal(entries) {
  const selectedEntries = (Array.isArray(entries) ? entries : []).filter(entry => entry?.item && Number(entry.quantity) > 0);
  if (!selectedEntries.length) return;
  const total = selectedEntries.reduce((sum, entry) => sum + Number(entry.item.price || 0) * Number(entry.quantity), 0);
  if (total > Number(state.balance || 0) + 1e-8) {
    warningEl.textContent = 'Выбранные предметы дороже денежного баланса.';
    warningEl.classList.add('show');
    return;
  }
  pendingBuy = { entries: selectedEntries };
  renderPurchaseReview();
  buyModal.classList.add('show');
}

function closeBuyModal() {
  buyModal.classList.remove('show');
  pendingBuy = null;
}

modalCancel.addEventListener('click', closeBuyModal);
buySelectedBtn.addEventListener('click', () => openBuyModal(getMarketSelectionEntries()));
modalItem.addEventListener('click', event => {
  const removeButton = event.target.closest('.purchase-remove');
  if (!removeButton || !pendingBuy) return;
  const itemId = String(removeButton.dataset.itemId);
  pendingBuy.entries = pendingBuy.entries.filter(entry => String(entry.item.id) !== itemId);
  marketSelection.delete(itemId);
  updateMarketCard(itemId);
  updateBuySelectedButton();
  renderPurchaseReview();
});
buyModal.addEventListener('click', (e) => {
  if (e.target === buyModal) closeBuyModal();
});

modalConfirm.addEventListener('click', async () => {
  if (!pendingBuy?.entries?.length) return;
  const { entries } = pendingBuy;
  const total = entries.reduce((sum, entry) => sum + Number(entry.item.price || 0) * Number(entry.quantity), 0);

  if (!await spendBalance(total)) {
    warningEl.textContent = '⚠ Недостаточно средств или нет связи с базой';
    warningEl.classList.add('show');
    setTimeout(() => warningEl.classList.remove('show'), 2000);
    closeBuyModal();
    return;
  }

  const oldInventoryCount = state.inventory.length;
  const purchasedCatalogIds = entries.map(entry => String(entry.item.id));
  entries.forEach(({ item, quantity }) => {
    for (let copy = 0; copy < quantity; copy += 1) {
      state.inventory.push({
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
      });
    }
  });
  await saveState();
  marketSelection.clear();
  purchasedCatalogIds.forEach(updateMarketCard);
  updateBalanceUI();
  myInvCount.textContent = state.inventory.length;
  updateBuySelectedButton();
  if (!catalogMode) {
    if (oldInventoryCount === 0) {
      renderMyInventory();
    } else if (Number(myInventory.dataset.visibleCount || 0) >= oldInventoryCount) {
      appendMyInventoryPage();
    } else {
      updateMyInventoryLoadMoreButton();
    }
  }
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
      sellAllBtn.disabled = true;
      profileInventoryStatus.textContent = 'Продаю весь инвентарь…';
      try {
        await stateSaveQueue;
        const { data, error } = await supabaseClient.rpc('sell_all_inventory');
        if (error) {
          const message = String(error.message || '').toLowerCase();
          profileInventoryStatus.textContent = message.includes('sell_all_inventory')
            ? 'Запусти обновлённый файл supabase/admin-inventory.sql в SQL Editor Supabase.'
            : 'Продажа не выполнена. Инвентарь сохранён; попробуй ещё раз.';
          console.error('Could not sell all inventory:', error);
          return;
        }
        state.balance = Number(data.balance);
        state.inventory = [];
        state.betId = null;
        state.betItemIds = [];
        betData = null;
        betSelectionStatus.textContent = 'Выбери скин в инвентаре';
        inventoryGrid.querySelectorAll('.inv-card.active').forEach(card => card.classList.remove('active'));
        renderSlot(betSlot, null);
        updateBalanceUI(true);
        renderProfile();
        renderMyInventory();
        restoreSlotsFromState();
        updateChance();
        profileInventoryStatus.textContent = 'Обменяно ' + Number(data.sold_count || 0) + ' скинов на ' + fmt(Number(data.amount || 0)) + '.';
      } catch (error) {
        profileInventoryStatus.textContent = 'Продажа не выполнена. Инвентарь сохранён; попробуй ещё раз.';
        console.error('Could not sell all inventory:', error);
      } finally {
        sellAllBtn.disabled = false;
      }
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
function appendProfileInventoryCard(idx) {
  const item = state.inventory[idx];
  if (!item) return;
  const card = document.createElement('article');
  card.className = 'sell-card';
  const imageWrap = document.createElement('div');
  imageWrap.className = 'item-img';
  const image = document.createElement('img');
  image.src = item.img || '';
  image.alt = '';
  image.loading = 'lazy';
  imageWrap.appendChild(image);
  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = item.name || 'Предмет';
  name.title = item.name || 'Предмет';
  const quality = document.createElement('div');
  quality.className = 'item-quality';
  quality.textContent = [item.wear, item.stattrak ? 'StatTrak™' : '', item.souvenir ? 'Souvenir' : '', item.effect, item.pattern].filter(Boolean).join(' · ');
  const price = document.createElement('div');
  price.className = 'item-price';
  price.textContent = fmt(item.price);
  const receive = Math.round(Number(item.price || 0) * (1 - SELL_COMMISSION) * 100) / 100;
  const sellButton = document.createElement('button');
  sellButton.className = 'btn-sell';
  sellButton.type = 'button';
  sellButton.textContent = 'Обменять за ' + fmt(receive);
  sellButton.addEventListener('click', () => openSellModal(idx));
  card.append(imageWrap, name, quality, price, sellButton);
  profileInventory.appendChild(card);
}

function appendProfileInventoryPage() {
  const start = Number(profileInventory.dataset.visibleCount || 0);
  const end = Math.min(start + PROFILE_INVENTORY_PAGE_SIZE, state.inventory.length);
  for (let idx = start; idx < end; idx += 1) appendProfileInventoryCard(idx);
  profileInventory.dataset.visibleCount = String(end);
  profileInventory.querySelector('.profile-load-more')?.remove();
  if (end < state.inventory.length) {
    const remaining = state.inventory.length - end;
    const loadMore = document.createElement('button');
    loadMore.type = 'button';
    loadMore.className = 'btn-small profile-load-more';
    loadMore.textContent = 'Показать ещё ' + Math.min(PROFILE_INVENTORY_PAGE_SIZE, remaining) + ' из ' + remaining;
    loadMore.addEventListener('click', appendProfileInventoryPage);
    profileInventory.appendChild(loadMore);
  }
}

function renderProfile() {
  if (!currentUser) return;
  profileInventoryStatus.textContent = '';
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
  profileInventory.dataset.visibleCount = '0';
  if (state.inventory.length === 0) {
    profileInventory.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;font-size:12px;padding:30px">Инвентарь пуст</div>';
    return;
  }
  appendProfileInventoryPage();
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
      ${item.case_name ? `<small class="feed-item-source">Кейс: ${escapeHtml(item.case_name)}</small>` : ''}
      <small class="feed-item-date">${date}</small>
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

function startUpgradeFeedRealtime() {
  if (!currentUser || !supabaseClient || upgradeFeedChannel) return;
  try {
    upgradeFeedChannel = supabaseClient.channel('upgrade-wins-feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'upgrade_wins'
      }, () => { void loadUpgradeFeed(); })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Upgrade wins feed realtime subscription unavailable:', status);
        }
      });
  } catch (error) {
    upgradeFeedChannel = null;
    console.warn('Upgrade wins feed realtime subscription unavailable:', error);
  }
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
// ФИЛЬТРЫ КАТЕГОРИЙ
// ============================================================
invCategory.addEventListener('change', () => {
  invQuickFilter = invCategory.value;
  renderInventory();
});

targetCategory.addEventListener('change', () => {
  targetQuickFilter = targetCategory.value;
  renderTargets();
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
// ВНУТРИСАЙТОВЫЕ ВЫПАДАЮЩИЕ СПИСКИ
// ============================================================
function closeCustomSelect(instance, restoreFocus = false) {
  instance.wrapper.classList.remove('is-open');
  instance.trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) instance.trigger.focus();
}

function closeOtherCustomSelects(except = null) {
  customSelects.forEach(instance => {
    if (instance !== except) closeCustomSelect(instance);
  });
}

function syncCustomSelect(select) {
  const instance = customSelectInstances.get(select);
  if (!instance) return;
  const selectedOption = select.options[select.selectedIndex];
  instance.trigger.textContent = selectedOption?.textContent.trim() || 'Выбрать';
  instance.trigger.title = selectedOption?.textContent.trim() || '';
  instance.menu.replaceChildren();

  [...select.options].forEach((option, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'custom-select-option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.value === select.value));
    item.disabled = option.disabled;
    item.textContent = option.textContent.trim();
    if (option.value === select.value) item.classList.add('selected');
    item.addEventListener('click', () => {
      if (item.disabled) return;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeCustomSelect(instance, true);
    });
    instance.menu.appendChild(item);
  });
}

function openCustomSelect(instance) {
  closeOtherCustomSelects(instance);
  instance.wrapper.classList.add('is-open');
  instance.trigger.setAttribute('aria-expanded', 'true');
  const selected = instance.menu.querySelector('[aria-selected="true"]:not(:disabled)');
  (selected || instance.menu.querySelector('button:not(:disabled)'))?.focus();
}

function initCustomSelects() {
  document.querySelectorAll('select').forEach(select => {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    if (select.classList.contains('sort-select')) wrapper.classList.add('custom-select-sort');
    if (select.classList.contains('category-select')) wrapper.classList.add('custom-select-category');
    if (select.classList.contains('case-quantity-select')) wrapper.classList.add('custom-select-quantity');
    if (select.classList.contains('settings-select')) wrapper.classList.add('custom-select-settings');
    if (select.closest('.topup-form')) wrapper.classList.add('custom-select-payment');
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.classList.add('native-select-source');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = `${select.id}CustomTrigger`;
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${select.id}CustomMenu`);
    const label = document.querySelector(`label[for="${trigger.id}"]`);
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || label?.textContent.trim() || select.id);

    const menu = document.createElement('div');
    menu.id = `${select.id}CustomMenu`;
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', trigger.getAttribute('aria-label'));
    wrapper.append(trigger, menu);

    const instance = { select, wrapper, trigger, menu };
    customSelectInstances.set(select, instance);
    customSelects.add(instance);
    trigger.addEventListener('click', () => {
      if (wrapper.classList.contains('is-open')) closeCustomSelect(instance);
      else openCustomSelect(instance);
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openCustomSelect(instance);
      }
    });
    menu.addEventListener('keydown', event => {
      const options = [...menu.querySelectorAll('button:not(:disabled)')];
      const index = options.indexOf(document.activeElement);
      let nextIndex = index;
      if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, index + 1);
      else if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        closeCustomSelect(instance, true);
        return;
      } else if (event.key === 'Tab') {
        closeCustomSelect(instance);
        return;
      } else return;
      event.preventDefault();
      options[nextIndex]?.focus();
    });
    select.addEventListener('change', () => syncCustomSelect(select));
    syncCustomSelect(select);
  });

  document.addEventListener('click', event => {
    customSelects.forEach(instance => {
      if (!instance.wrapper.contains(event.target)) closeCustomSelect(instance);
    });
  });
}

// ============================================================
// СТАРТ
// ============================================================
function setOnlineUsersCount(count, live = true) {
  const indicator = onlineUsersCount?.closest('.online-users');
  if (onlineUsersCount) onlineUsersCount.textContent = Number.isFinite(count) ? String(count) : '—';
  indicator?.classList.toggle('is-live', live && Number.isFinite(count));
}

function readUniqueOnlineUsers() {
  const presence = onlinePresenceChannel?.presenceState?.() || {};
  const identities = new Set();
  Object.values(presence).flat().forEach(entry => {
    if (entry?.user_id) identities.add(`user:${entry.user_id}`);
    else if (entry?.session_id) identities.add(`session:${entry.session_id}`);
  });
  return identities.size;
}

async function updateOnlinePresenceIdentity() {
  if (!onlinePresenceChannel || !onlinePresenceReady) return;
  try {
    await onlinePresenceChannel.track({
      session_id: onlinePresenceSessionId,
      user_id: currentUser?.id || null,
      last_seen: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Could not update online presence:', error);
  }
}

function startOnlinePresence() {
  if (!supabaseClient || onlinePresenceChannel) return;
  try {
    onlinePresenceSessionId = makeInstanceId();
    setOnlineUsersCount(NaN, false);
    onlinePresenceChannel = supabaseClient.channel('site-online-users', {
      config: { presence: { key: onlinePresenceSessionId } }
    });
    onlinePresenceChannel
      .on('presence', { event: 'sync' }, () => setOnlineUsersCount(readUniqueOnlineUsers()))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          onlinePresenceReady = true;
          void updateOnlinePresenceIdentity();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          onlinePresenceReady = false;
          setOnlineUsersCount(NaN, false);
        }
      });
  } catch (error) {
    onlinePresenceChannel = null;
    onlinePresenceReady = false;
    setOnlineUsersCount(NaN, false);
    console.warn('Online counter unavailable; continuing site startup:', error);
  }
}

async function initSession() {
  if (!supabaseClient) {
    backendSetupHint.textContent = 'Общая база ещё не подключена. Владелец сайта должен настроить Supabase по инструкции в папке supabase.';
    authSubmit.disabled = true;
    showAuthScreen();
    return;
  }
  startOnlinePresence();
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
initCustomSelects();
void initSession();

setInterval(() => { void refreshWallet(); }, 10000);

loadSkins();

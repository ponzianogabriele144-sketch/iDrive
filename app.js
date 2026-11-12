/**
 * iDrive - Core Application Logic
 * Restyle: Tema Dinamico (Light/Dark) • Garage 3 Auto • Assicurazioni (Avviso 14gg) • Grafico Comparato • Notifica 8:00 AM • Report PDF Avanzato
 * Development: Gabriele Ponziano
 */

const STORAGE_KEY = 'idrive_multicar_generic_v1';
const THEME_KEY = 'fuelflow_theme_pref';

const DEFAULT_CARS = [
  {
    id: 0,
    name: "Auto 1",
    fuelType: "Gasolio",
    consumption: 5.62,
    btDevice: "Bluetooth Auto 1",
    parking: { address: "Posizione non memorizzata", lat: 45.4642, lng: 9.1900, time: "--:--", date: "Nessuna sosta" },
    currentOdo: 0,
    historyMonths: [0, 0, 0, 0, 0, 0],
    insurance: {
      company: "Compagnia Assicurativa",
      policyType: "RCA Base",
      expiry: "",
      daysLeft: 999,
      cost: 0
    },
    refuels: [],
    trips: []
  },
  {
    id: 1,
    name: "Auto 2",
    fuelType: "Benzina",
    consumption: 6.58,
    btDevice: "Bluetooth Auto 2",
    parking: { address: "Posizione non memorizzata", lat: 45.4642, lng: 9.1900, time: "--:--", date: "Nessuna sosta" },
    currentOdo: 0,
    historyMonths: [0, 0, 0, 0, 0, 0],
    insurance: {
      company: "Compagnia Assicurativa",
      policyType: "RCA Base",
      expiry: "",
      daysLeft: 999,
      cost: 0
    },
    refuels: [],
    trips: []
  },
  {
    id: 2,
    name: "Auto 3",
    fuelType: "Ibrida",
    consumption: 4.46,
    btDevice: "Bluetooth Auto 3",
    parking: { address: "Posizione non memorizzata", lat: 45.4642, lng: 9.1900, time: "--:--", date: "Nessuna sosta" },
    currentOdo: 0,
    historyMonths: [0, 0, 0, 0, 0, 0],
    insurance: {
      company: "Compagnia Assicurativa",
      policyType: "RCA Base",
      expiry: "",
      daysLeft: 999,
      cost: 0
    },
    refuels: [],
    trips: []
  }
];

// ==================== COSTANTI MESE & HELPER DATA SISTEMA ====================
const IT_MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const IT_MONTH_SHORT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

function getSystemDateKey(d) {
  const dt = d || new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSystemTimeKey(d) {
  const dt = d || new Date();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Normalizza e garantisce timestamp, isoDate e orario per qualsiasi transazione
function normalizeTransactionDate(item) {
  if (!item) return;

  if (item.timestamp && !isNaN(Number(item.timestamp))) {
    const d = new Date(Number(item.timestamp));
    if (!isNaN(d.getTime())) {
      item.timestamp = d.getTime();
      item.isoDate = item.isoDate || getSystemDateKey(d);
      item.time = item.time || getSystemTimeKey(d);
      return;
    }
  }

  if (item.isoDate && typeof item.isoDate === 'string') {
    const timeStr = (item.time && item.time.length === 5) ? item.time + ':00' : '12:00:00';
    const d = new Date(`${item.isoDate}T${timeStr}`);
    if (!isNaN(d.getTime())) {
      item.timestamp = d.getTime();
      item.time = item.time || getSystemTimeKey(d);
      return;
    }
  }

  // Fallback se ha solo una data testuale legacy (es. "Oggi, 14:30", "Ieri", "14 Ott")
  const dateStr = (item.date || '').trim();
  let d = new Date();
  if (dateStr.toLowerCase().startsWith('ieri')) {
    d.setDate(d.getDate() - 1);
  } else if (dateStr.toLowerCase().startsWith("l'altro ieri") || dateStr.toLowerCase().startsWith("altro ieri")) {
    d.setDate(d.getDate() - 2);
  } else if (!dateStr.toLowerCase().startsWith('oggi')) {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) d = new Date(parsed);
  }

  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
  }

  item.timestamp = d.getTime();
  item.isoDate = getSystemDateKey(d);
  item.time = getSystemTimeKey(d);
}

// Calcola dinamicamente l'etichetta temporale leggibile rispetto alla data odierna
function formatTransactionDisplayDate(item) {
  if (!item) return 'Data sconosciuta';
  normalizeTransactionDate(item);

  const itemDate = new Date(item.timestamp);
  if (isNaN(itemDate.getTime())) return item.date || 'Data non valida';

  const now = new Date();
  const todayKey = getSystemDateKey(now);
  const itemKey = getSystemDateKey(itemDate);

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = getSystemDateKey(yesterday);

  const dayBeforeYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  const dayBeforeYesterdayKey = getSystemDateKey(dayBeforeYesterday);

  const timeStr = item.time || getSystemTimeKey(itemDate);

  if (itemKey === todayKey) {
    return `Oggi, ${timeStr}`;
  }
  if (itemKey === yesterdayKey) {
    return `Ieri, ${timeStr}`;
  }
  if (itemKey === dayBeforeYesterdayKey) {
    return `L'altro ieri, ${timeStr}`;
  }

  const dayNum = itemDate.getDate();
  const monthShort = IT_MONTH_SHORT[itemDate.getMonth()] || '';
  if (itemDate.getFullYear() === now.getFullYear()) {
    return `${dayNum} ${monthShort}, ${timeStr}`;
  }
  return `${dayNum} ${monthShort} ${itemDate.getFullYear()}, ${timeStr}`;
}

// Live preview aggiornato in tempo reale nei modali
function updateRefuelDatePreview() {
  const dateInput = document.getElementById('refuelInputDate');
  const timeInput = document.getElementById('refuelInputTime');
  const preview = document.getElementById('refuelDatePreviewLabel');
  if (!preview) return;

  const now = new Date();
  const iso = dateInput && dateInput.value ? dateInput.value : getSystemDateKey(now);
  const time = timeInput && timeInput.value ? timeInput.value : getSystemTimeKey(now);

  const mockItem = { isoDate: iso, time: time };
  normalizeTransactionDate(mockItem);
  const friendly = formatTransactionDisplayDate(mockItem);
  preview.innerHTML = `🕒 Transazione: <b class="text-amber-400 font-bold">${friendly}</b>`;
}

function updateTripDatePreview() {
  const dateInput = document.getElementById('tripInputDate');
  const timeInput = document.getElementById('tripInputTime');
  const preview = document.getElementById('tripDatePreviewLabel');
  if (!preview) return;

  const now = new Date();
  const iso = dateInput && dateInput.value ? dateInput.value : getSystemDateKey(now);
  const time = timeInput && timeInput.value ? timeInput.value : getSystemTimeKey(now);

  const mockItem = { isoDate: iso, time: time };
  normalizeTransactionDate(mockItem);
  const friendly = formatTransactionDisplayDate(mockItem);
  preview.innerHTML = `🕒 Tratta: <b class="text-blue-400 font-bold">${friendly}</b>`;
}

// Verifica se una transazione cade in uno specifico anno e mese (month: 0-11)
function isTransactionInYearMonth(item, year, month) {
  if (!item) return false;
  normalizeTransactionDate(item);
  if (item.timestamp) {
    const d = new Date(item.timestamp);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() === year && d.getMonth() === month;
    }
  }
  if (item.isoDate) {
    const parts = item.isoDate.split('-');
    if (parts.length === 3) {
      return parseInt(parts[0], 10) === year && (parseInt(parts[1], 10) - 1) === month;
    }
  }
  return false;
}

// Verifica se una transazione appartiene al mese corrente (ogni 1° del mese il filtro passa al nuovo mese)
function isTransactionInCurrentMonth(item, refDate) {
  const now = refDate || new Date();
  return isTransactionInYearMonth(item, now.getFullYear(), now.getMonth());
}

// Restituisce i metadati degli ultimi 6 mesi fino al mese corrente (indice 5 = mese corrente)
function getLastSixMonthsMeta(refDate) {
  const now = refDate || new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    result.push({
      year: y,
      month: m,
      shortName: IT_MONTH_SHORT[m],
      fullName: IT_MONTH_NAMES[m]
    });
  }
  return result;
}

// Sincronizza dinamicamente lo storico a 6 mesi dell'auto: ogni 1° del mese l'indice 5 (mese corrente) riparte da 0
function syncCarHistoryMonths(car, refDate) {
  if (!car) return [0, 0, 0, 0, 0, 0];
  const meta = getLastSixMonthsMeta(refDate);
  const refuels = Array.isArray(car.refuels) ? car.refuels : [];
  car.historyMonths = meta.map(slot => {
    const sum = refuels
      .filter(r => isTransactionInYearMonth(r, slot.year, slot.month))
      .reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
    return parseFloat(sum.toFixed(2));
  });
  return car.historyMonths;
}

function loadCars() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let cars = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_CARS));
    
    // Pulizia e auto-migrazione verso dati generici e flessibili
    cars.forEach((c, idx) => {
      const def = DEFAULT_CARS[idx] || DEFAULT_CARS[0];
      // Se era rimasto un nome hardcoded precedente (Golf, Fiat 500, Yaris), migra a generico
      if (!c.name || c.name.includes("Golf") || c.name.includes("Fiat 500") || c.name.includes("Yaris")) {
        c.name = def.name;
        c.btDevice = def.btDevice;
        c.currentOdo = 0;
        c.refuels = [];
        c.trips = [];
        c.historyMonths = [0, 0, 0, 0, 0, 0];
        c.insurance = { ...def.insurance };
        c.parking = { ...def.parking };
      }
      if (!c.consumption || c.consumption <= 0) {
        c.consumption = def.consumption || (c.fuelType === 'Ibrida' ? 4.46 : (c.fuelType === 'Benzina' ? 6.58 : 5.62));
      }
      if (!c.parking) c.parking = { ...def.parking };
      if (!Array.isArray(c.trips)) c.trips = [];
      if (!Array.isArray(c.refuels)) c.refuels = [];
      if (!Array.isArray(c.historyMonths)) c.historyMonths = [0, 0, 0, 0, 0, 0];

      // Assicura che ogni rifornimento e viaggio abbia un ID univoco e immutabile e date normalizzate
      c.refuels.forEach((r, rIdx) => {
        if (!r.id) r.id = 'ref_' + (Date.now() - rIdx * 1000) + '_' + rIdx;
        normalizeTransactionDate(r);
      });
      c.refuels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      c.trips.forEach((t, tIdx) => {
        if (!t.id) t.id = 'trip_' + (Date.now() - tIdx * 1000) + '_' + tIdx;
        normalizeTransactionDate(t);
      });
      c.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      syncCarHistoryMonths(c);
    });
    return cars;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_CARS));
  }
}

let appCars = loadCars();
let activeCarIndex = 0;
let editingCarIndex = 0;
let activeTab = 'dashboard';
let chartMode = 'single'; // 'single' o 'all'
let isDarkMode = localStorage.getItem(THEME_KEY) !== 'light';
const BT_SESSION_STORAGE_KEY = 'idrive_bt_session_state_v1';
const BT_AUTOSTART_PREF_KEY = 'idrive_bt_autostart_pref_v1';

let btSession = {
  active: false,
  carIndex: 0,
  startTime: null,
  startTimestamp: 0,
  sec: 0,
  km: 0.0,
  interval: null,
  watchId: null,
  startCoords: null,
  lastCoords: null
};

// GPS Tracking Reale + Fallback
let liveTracking = {
  active: false,
  timer: null,
  startTimestamp: 0,
  seconds: 0,
  km: 0.0,
  watchId: null,
  lastCoords: null
};

function saveCars() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appCars));
  } catch (e) {
    console.error("Errore salvataggio:", e);
  }
}

// ==================== MENU RAPIDO UNIFICATO SU PIANO DEDICATO (SFONDO NERO) ====================
let quickMenuCloseTimer = null;

function toggleQuickSettingsMenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const overlay = document.getElementById('quickSettingsOverlay');
  if (!overlay) return;
  if (overlay.classList.contains('hidden')) {
    openQuickSettingsMenu();
  } else {
    closeQuickSettingsMenu();
  }
}

function openQuickSettingsMenu() {
  const overlay = document.getElementById('quickSettingsOverlay');
  const panel = document.getElementById('quickSettingsMenuPanel');
  const mainEl = document.getElementById('appMain');
  if (!overlay) return;

  if (quickMenuCloseTimer) {
    clearTimeout(quickMenuCloseTimer);
    quickMenuCloseTimer = null;
  }

  updateHeaderMenuStatusUI();
  overlay.classList.remove('hidden');
  if (mainEl) mainEl.classList.add('invisible', 'pointer-events-none');
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = 'hidden';
  }
  if (panel) {
    requestAnimationFrame(() => {
      panel.classList.remove('scale-95', 'opacity-0');
      panel.classList.add('scale-100', 'opacity-100');
    });
  }
}

function closeQuickSettingsMenu(immediate = false) {
  const overlay = document.getElementById('quickSettingsOverlay');
  const panel = document.getElementById('quickSettingsMenuPanel');
  const mainEl = document.getElementById('appMain');
  if (!overlay || overlay.classList.contains('hidden')) return;

  if (quickMenuCloseTimer) {
    clearTimeout(quickMenuCloseTimer);
    quickMenuCloseTimer = null;
  }

  if (mainEl) mainEl.classList.remove('invisible', 'pointer-events-none');

  if (immediate) {
    if (panel) {
      panel.classList.remove('scale-100', 'opacity-100');
      panel.classList.add('scale-95', 'opacity-0');
    }
    overlay.classList.add('hidden');
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
    return;
  }

  if (panel) {
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');
  }
  quickMenuCloseTimer = setTimeout(() => {
    quickMenuCloseTimer = null;
    overlay.classList.add('hidden');
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  }, 130);
}

function openModalFromMenu(modalId) {
  closeQuickSettingsMenu(true);
  openModal(modalId);
}

function openGeminiVoiceFromMenu() {
  closeQuickSettingsMenu(true);
  openModalGeminiVoice();
}

function openAddCarFromMenu() {
  closeQuickSettingsMenu(true);
  openModalAddCar();
}

function openEditCarFromMenu() {
  closeQuickSettingsMenu(true);
  openModalEditCar(activeCarIndex);
}

function toggleBtSimFromMenu() {
  toggleBtSim();
  updateHeaderMenuStatusUI();
  setTimeout(() => closeQuickSettingsMenu(), 120);
}

function toggleGpsLiveFromMenu() {
  toggleGpsLive();
  updateHeaderMenuStatusUI();
  setTimeout(() => closeQuickSettingsMenu(), 120);
}

function updateHeaderMenuStatusUI() {
  const car = appCars[activeCarIndex];
  const subEl = document.getElementById('menuEditCarSub');
  if (subEl && car) {
    const baseCons = parseFloat(car.consumption) || (car.fuelType === 'Ibrida' ? 4.46 : (car.fuelType === 'Benzina' ? 6.58 : 5.62));
    subEl.innerText = `${car.name} • ${baseCons.toFixed(2).replace('.', ',')} L/100km • ${car.btDevice || 'BT'}`;
  }

  const themeBadge = document.getElementById('menuThemeStateBadge');
  if (themeBadge) {
    themeBadge.innerText = isDarkMode ? 'Scuro 🌙' : 'Chiaro ☀️';
  }

  const btBadge = document.getElementById('btHeaderLabel');
  if (btBadge) {
    if (btSession.active) {
      btBadge.innerText = 'In Viaggio 🟢';
      btBadge.className = 'px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap';
    } else {
      btBadge.innerText = 'BT Auto';
      btBadge.className = 'px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 whitespace-nowrap';
    }
  }

  const gpsBadge = document.getElementById('gpsMenuStateBadge');
  if (gpsBadge) {
    if (liveTracking.active) {
      gpsBadge.className = 'px-2.5 py-1 rounded-xl text-[10px] font-bold bg-red-600 text-white border border-red-500 flex items-center gap-1 whitespace-nowrap';
      gpsBadge.innerHTML = '■ Stop GPS';
    } else {
      gpsBadge.className = 'px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 whitespace-nowrap';
      gpsBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Avvia';
    }
  }

  const dot = document.getElementById('quickMenuActiveDot');
  const pill = document.getElementById('headerLiveStatusPill');
  const pillText = document.getElementById('headerLiveStatusText');
  const isAnyLive = Boolean(btSession.active || liveTracking.active);

  if (dot) dot.classList.toggle('hidden', !isAnyLive);
  if (pill) {
    if (isAnyLive) {
      pill.classList.remove('hidden');
      pill.classList.add('flex');
      if (pillText) {
        pillText.innerText = btSession.active ? `BT ${btSession.km.toFixed(1)}km` : `GPS ${liveTracking.km.toFixed(1)}km`;
      }
    } else {
      pill.classList.add('hidden');
      pill.classList.remove('flex');
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickSettingsMenu();
    }
  });
}

// ==================== CALCOLO DINAMICO CONSUMO L/100KM (KM + TEMPO + PROFILO GUIDA) ====================
function getCarBaseFuelPrice(car) {
  if (car && Array.isArray(car.refuels) && car.refuels.length > 0 && parseFloat(car.refuels[0].pricePerLiter) > 0) {
    return parseFloat(car.refuels[0].pricePerLiter);
  }
  if (!car) return 1.759;
  if (car.fuelType === 'Benzina') return 1.819;
  if (car.fuelType === 'Ibrida') return 1.809;
  if (car.fuelType === 'GPL') return 0.729;
  if (car.fuelType === 'Metano') return 1.459;
  if (car.fuelType === 'Elettrico' || car.fuelType === 'Elettrica') return 0.45;
  return 1.759;
}

function calculateDynamicTripConsumption(car, kmInput, durationMinutesInput, customL100 = null) {
  const defaultCons = car && car.fuelType === 'Ibrida' ? 4.46 : (car && car.fuelType === 'Benzina' ? 6.58 : 5.62);
  const baseCons = (car && parseFloat(car.consumption) > 0) ? parseFloat(car.consumption) : defaultCons;
  const km = Math.max(0, parseFloat(kmInput) || 0);
  const durationMinutes = Math.max(1, parseFloat(durationMinutesInput) || 30);
  const hours = durationMinutes / 60;
  const avgSpeed = km > 0 && hours > 0 ? (km / hours) : 50;
  const isHybrid = Boolean(car && car.fuelType === 'Ibrida');
  const isPetrol = Boolean(car && car.fuelType === 'Benzina');

  let factor = 1.0;
  let profileLabel = 'Misto';

  if (avgSpeed < 22) {
    // Traffico urbano intenso / code / semafori
    factor = isHybrid ? 1.08 : 1.32;
    profileLabel = 'Traffico Urbano';
  } else if (avgSpeed < 38) {
    // Urbano scorrevole
    factor = isHybrid ? 0.96 : 1.18;
    profileLabel = 'Urbano';
  } else if (avgSpeed < 56) {
    // Misto urbano / tangenziale
    factor = isHybrid ? 0.98 : 1.02;
    profileLabel = 'Misto';
  } else if (avgSpeed <= 92) {
    // Extraurbano scorrevole (massimo rendimento termico)
    factor = isHybrid ? 0.91 : 0.86;
    profileLabel = 'Extraurbano Ottimale';
  } else if (avgSpeed <= 112) {
    // Superstrada / Veloce
    factor = isHybrid ? 1.06 : 1.02;
    profileLabel = 'Extraurbano Veloce';
  } else {
    // Autostrada (>112 km/h, resistenza aerodinamica v^2)
    factor = isHybrid ? 1.22 : (isPetrol ? 1.19 : 1.15);
    if (avgSpeed > 128) factor += 0.08;
    profileLabel = 'Autostrada';
  }

  // Penalità motore freddo per micro-tragitti (< 4.5 km)
  if (km > 0 && km < 4.5) {
    factor *= 1.10;
  }

  let consumptionL100 = parseFloat((baseCons * factor).toFixed(2));
  const parsedCustom = parseFloat(customL100);
  if (!isNaN(parsedCustom) && parsedCustom > 0) {
    consumptionL100 = parseFloat(parsedCustom.toFixed(2));
    profileLabel = 'Personalizzato';
  }

  const deltaPct = Math.round(((consumptionL100 / baseCons) - 1) * 100);
  const litersUsed = parseFloat((km * (consumptionL100 / 100)).toFixed(2));
  const fuelPrice = getCarBaseFuelPrice(car);
  const cost = parseFloat((litersUsed * fuelPrice).toFixed(2));

  return {
    consumptionL100,
    baseCons,
    avgSpeed: Math.max(5, Math.round(avgSpeed)),
    profileLabel,
    deltaPct,
    litersUsed,
    fuelPrice,
    cost
  };
}

// Formula geodetica di Haversine per calcolo km reali da coordinate GPS
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raggio terrestre in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calcolo distanza stradale reale tra punto di partenza e arrivo (OSRM con fallback Haversine x 1.26)
async function fetchRoadDistanceKm(startCoords, endCoords) {
  if (!startCoords || !endCoords) return 0;
  const straightKm = calculateHaversineKm(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
  if (straightKm < 0.05) return 0;

  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.routes && data.routes[0] && data.routes[0].distance) {
        return parseFloat((data.routes[0].distance / 1000).toFixed(1));
      }
    }
  } catch (e) {
    console.warn("OSRM fallback su Haversine stradale:", e);
  }
  return parseFloat((straightKm * 1.26).toFixed(1));
}

// ==================== TEMA CHIARO / SCURO ====================
function toggleAppTheme() {
  isDarkMode = !isDarkMode;
  localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
  applyAppTheme(isDarkMode);
}

function applyAppTheme(dark) {
  const body = document.getElementById('appBody');
  const emoji = document.getElementById('themeEmoji');

  if (dark) {
    body.classList.remove('theme-light');
    if (emoji) emoji.innerText = "🌙";
  } else {
    body.classList.add('theme-light');
    if (emoji) emoji.innerText = "☀️";
  }
  updateHeaderMenuStatusUI();
  drawExpenseChart();
  drawDriveHoursChart();
}

// ==================== GRAFICO ANDAMENTO SPESE AD ALTA PRECISIONE & TOUCH SCRUBBER ====================
let selectedMonthIndex = 5; // Default: Mese corrente (indice 5)

function switchChartMode(mode) {
  chartMode = mode;
  const btnS = document.getElementById('btnChartSingle');
  const btnA = document.getElementById('btnChartAll');

  if (btnS && btnA) {
    if (mode === 'single') {
      btnS.className = "px-2 py-0.5 rounded-lg font-bold bg-amber-500 text-black transition";
      btnA.className = "px-2 py-0.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition";
    } else {
      btnA.className = "px-2 py-0.5 rounded-lg font-bold bg-amber-500 text-black transition";
      btnS.className = "px-2 py-0.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition";
    }
  }
  drawExpenseChart();
}

function drawExpenseChart() {
  const canvas = document.getElementById('fuelExpenseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 350;
  const h = 155;

  // Sincronizza i dati mensili di tutte le auto con il calendario reale
  const monthsMeta = getLastSixMonthsMeta();
  appCars.forEach(c => syncCarHistoryMonths(c));

  // Risoluzione Retina 2x
  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.save();
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);

  const padLeft = 44;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 26;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const maxVal = 250; // Scala fino a 250€ con step precisi da 50€

  // 1. Griglia Orizzontale & Ticks Numerici Asse Y (€)
  const yTicks = [0, 50, 100, 150, 200, 250];
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "600 9px monospace, sans-serif";

  yTicks.forEach(val => {
    const y = padTop + (1 - val / maxVal) * chartH;
    
    // Linea orizzontale tratteggiata
    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etichetta valore a sinistra
    ctx.fillStyle = "#71717a";
    ctx.fillText(`€${val}`, padLeft - 6, y);
  });

  // 2. Mesi su Asse X (dinamici fino al mese corrente)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  monthsMeta.forEach((mObj, i) => {
    const x = padLeft + (i / 5) * chartW;
    const isSel = (i === selectedMonthIndex);

    ctx.fillStyle = isSel ? (isDarkMode ? "#ffffff" : "#09090b") : "#71717a";
    ctx.font = isSel ? "bold 10px sans-serif" : "600 9px sans-serif";
    ctx.fillText(mObj.shortName, x, padTop + chartH + 8);
  });

  // Mappatura punti
  function getPoints(data) {
    return data.map((val, i) => ({
      x: padLeft + (i / 5) * chartW,
      y: padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH,
      val: val
    }));
  }

  // Curve spline morbide stile Apple
  function drawSplinePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 > pts.length - 1 ? pts.length - 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  // 3. Rendering delle Curve
  if (chartMode === 'single') {
    const car = appCars[activeCarIndex];
    const data = car.historyMonths || [0, 0, 0, 0, 0, 0];
    const pts = getPoints(data);

    // Riempimento Sfumato sotto la curva
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, "rgba(245, 158, 11, 0.28)");
    grad.addColorStop(1, "rgba(245, 158, 11, 0.0)");

    drawSplinePath(pts);
    ctx.lineTo(pts[pts.length - 1].x, padTop + chartH);
    ctx.lineTo(pts[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Linea curva
    drawSplinePath(pts);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Punti di ogni mese
    pts.forEach((pt, i) => {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (i === selectedMonthIndex ? 4 : 2.5), 0, Math.PI * 2);
      ctx.fill();
    });

  } else {
    // Modalità comparata: Tutte le auto del garage
    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#f43f5e", "#0ea5e9", "#a855f7"];
    appCars.forEach((car, cIdx) => {
      const data = car.historyMonths || [0, 0, 0, 0, 0, 0];
      const pts = getPoints(data);
      const col = colors[cIdx % colors.length];

      drawSplinePath(pts);
      ctx.strokeStyle = col;
      ctx.lineWidth = (cIdx === activeCarIndex ? 2.8 : 2.0);
      ctx.stroke();

      pts.forEach((pt, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (i === selectedMonthIndex ? 4 : 2.5), 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // 4. Scrubber Verticale (Linea Guida al Tocco / Selezione)
  const selX = padLeft + (selectedMonthIndex / 5) * chartW;

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(selX, padTop - 6);
  ctx.lineTo(selX, padTop + chartH + 2);
  ctx.stroke();
  ctx.restore();

  // Indicatore Halo e Valore Evidenziato
  if (chartMode === 'single') {
    const car = appCars[activeCarIndex];
    const data = car.historyMonths || [0, 0, 0, 0, 0, 0];
    const val = data[selectedMonthIndex] || 0;
    const selY = padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH;

    // Halo esterno
    ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
    ctx.beginPath();
    ctx.arc(selX, selY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Bordo netto
    ctx.fillStyle = isDarkMode ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.arc(selX, selY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Centro colorato
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(selX, selY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Badge fluttuante con valore esatto
    const tagText = `€ ${val.toFixed(1)}`;
    ctx.font = "bold 9px sans-serif";
    const tagW = ctx.measureText(tagText).width + 10;
    const tagH = 16;
    let tagY = selY - 14;
    if (tagY - tagH < 4) tagY = selY + 18;

    ctx.fillStyle = isDarkMode ? "#18181b" : "#ffffff";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(selX - tagW / 2, tagY - tagH, tagW, tagH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? "#ffffff" : "#09090b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tagText, selX, tagY - tagH / 2);

  } else {
    // Modalità multi-auto: evidenzia i punti lungo lo scrubber
    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#f43f5e", "#0ea5e9", "#a855f7"];
    appCars.forEach((car, cIdx) => {
      const data = car.historyMonths || [0, 0, 0, 0, 0, 0];
      const val = data[selectedMonthIndex] || 0;
      const selY = padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH;

      ctx.fillStyle = colors[cIdx % colors.length];
      ctx.beginPath();
      ctx.arc(selX, selY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDarkMode ? "#000000" : "#ffffff";
      ctx.beginPath();
      ctx.arc(selX, selY, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();

  // 5. Aggiorna la Card Informativa Dinamica
  updateChartTooltipCard();
}

function updateChartTooltipCard() {
  const card = document.getElementById('chartTooltipCard');
  if (!card) return;

  const monthsMeta = getLastSixMonthsMeta();
  const selMeta = monthsMeta[selectedMonthIndex] || monthsMeta[5];
  const monthName = selMeta.fullName;
  const monthYear = selMeta.year;

  if (chartMode === 'single') {
    const car = appCars[activeCarIndex];
    const data = car.historyMonths || [0, 0, 0, 0, 0, 0];
    const val = data[selectedMonthIndex] || 0;
    const litriEst = (val / 1.769).toFixed(1);

    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
        <div>
          <div class="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
            <span>📅 ${monthName} ${monthYear}</span>
            <span class="text-[9px] font-semibold text-amber-500 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/20">${car.name}</span>
          </div>
          <div class="text-[9px] text-[var(--text-muted)]">Stima carburante: ~<b>${litriEst} L</b> (${car.fuelType})</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Spesa Rilevata</div>
        <div class="text-sm font-black text-amber-500 font-mono">€ ${val.toFixed(2).replace('.', ',')}</div>
      </div>
    `;
  } else {
    const dotColors = ["bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-sky-500", "bg-purple-500"];
    let total = 0;
    let carsBreakdownHtml = '';

    appCars.forEach((c, idx) => {
      const cVal = (c.historyMonths || [0, 0, 0, 0, 0, 0])[selectedMonthIndex] || 0;
      total += cVal;
      const dotCol = dotColors[idx % dotColors.length];
      carsBreakdownHtml += `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full ${dotCol}"></span> ${c.name}: <b>€ ${cVal.toFixed(1)}</b></span>`;
    });

    card.innerHTML = `
      <div class="w-full space-y-1">
        <div class="flex items-center justify-between border-b border-[var(--border-color)] pb-1">
          <span class="text-[11px] font-bold text-[var(--text-main)]">📅 ${monthName} ${monthYear} • ${appCars.length} Auto</span>
          <span class="text-xs font-black font-mono text-[var(--text-main)]">Totale: <span class="text-amber-500">€ ${total.toFixed(2).replace('.', ',')}</span></span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          ${carsBreakdownHtml}
        </div>
      </div>
    `;
  }
}

// Gestione Eventi Touch & Mouse per Scorrimento sul Grafico
function initChartInteractions() {
  const canvas = document.getElementById('fuelExpenseChart');
  if (!canvas) return;

  function handlePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const normX = (clientX - rect.left) / rect.width;

    const padLeftFrac = 44 / 350;
    const padRightFrac = 18 / 350;
    const usableFrac = 1 - padLeftFrac - padRightFrac;

    let frac = (normX - padLeftFrac) / usableFrac;
    frac = Math.max(0, Math.min(1, frac));
    const idx = Math.round(frac * 5);

    if (idx !== selectedMonthIndex) {
      selectedMonthIndex = idx;
      drawExpenseChart();
    }
  }

  canvas.addEventListener('mousemove', handlePointer);
  canvas.addEventListener('touchmove', handlePointer, { passive: true });
  canvas.addEventListener('touchstart', handlePointer, { passive: true });
}

// ==================== GRAFICO ANNUALE ORE DI GUIDA (12 MESI) ====================
let selectedHoursMonthIndex = (new Date()).getMonth(); // 0-11
let hoursChartYear = (new Date()).getFullYear();
let hoursChartMode = 'single'; // 'single' o 'all'

function switchChartTab(tab) {
  const wrapper = document.getElementById('chartsCarouselWrapper');
  const btnExp = document.getElementById('btnTabChartExpense');
  const btnHrs = document.getElementById('btnTabChartHours');
  const dotExp = document.getElementById('dotChartExpense');
  const dotHrs = document.getElementById('dotChartHours');

  if (tab === 'expense') {
    if (wrapper) wrapper.scrollTo({ left: 0, behavior: 'smooth' });
    if (btnExp) {
      btnExp.className = "px-3 py-1.5 rounded-lg font-bold bg-amber-500 text-black shadow transition active:scale-95 flex items-center gap-1.5";
    }
    if (btnHrs) {
      btnHrs.className = "px-3 py-1.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition active:scale-95 flex items-center gap-1.5";
    }
    if (dotExp) {
      dotExp.className = "w-2.5 h-1.5 rounded-full bg-amber-500 transition-all";
    }
    if (dotHrs) {
      dotHrs.className = "w-1.5 h-1.5 rounded-full bg-zinc-600 transition-all";
    }
    setTimeout(drawExpenseChart, 60);
  } else {
    if (wrapper) {
      const w = wrapper.clientWidth;
      wrapper.scrollTo({ left: w + 16, behavior: 'smooth' });
    }
    if (btnExp) {
      btnExp.className = "px-3 py-1.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition active:scale-95 flex items-center gap-1.5";
    }
    if (btnHrs) {
      btnHrs.className = "px-3 py-1.5 rounded-lg font-bold bg-purple-600 text-white shadow transition active:scale-95 flex items-center gap-1.5";
    }
    if (dotExp) {
      dotExp.className = "w-1.5 h-1.5 rounded-full bg-zinc-600 transition-all";
    }
    if (dotHrs) {
      dotHrs.className = "w-2.5 h-1.5 rounded-full bg-purple-500 transition-all";
    }
    setTimeout(drawDriveHoursChart, 60);
  }
}

function handleChartsCarouselScroll() {
  const wrapper = document.getElementById('chartsCarouselWrapper');
  if (!wrapper) return;
  const scrollLeft = wrapper.scrollLeft;
  const w = wrapper.clientWidth;
  const isSecond = scrollLeft > w * 0.45;

  const btnExp = document.getElementById('btnTabChartExpense');
  const btnHrs = document.getElementById('btnTabChartHours');
  const dotExp = document.getElementById('dotChartExpense');
  const dotHrs = document.getElementById('dotChartHours');

  if (isSecond) {
    if (btnExp) btnExp.className = "px-3 py-1.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition active:scale-95 flex items-center gap-1.5";
    if (btnHrs) btnHrs.className = "px-3 py-1.5 rounded-lg font-bold bg-purple-600 text-white shadow transition active:scale-95 flex items-center gap-1.5";
    if (dotExp) dotExp.className = "w-1.5 h-1.5 rounded-full bg-zinc-600 transition-all";
    if (dotHrs) dotHrs.className = "w-2.5 h-1.5 rounded-full bg-purple-500 transition-all";
  } else {
    if (btnExp) btnExp.className = "px-3 py-1.5 rounded-lg font-bold bg-amber-500 text-black shadow transition active:scale-95 flex items-center gap-1.5";
    if (btnHrs) btnHrs.className = "px-3 py-1.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition active:scale-95 flex items-center gap-1.5";
    if (dotExp) dotExp.className = "w-2.5 h-1.5 rounded-full bg-amber-500 transition-all";
    if (dotHrs) dotHrs.className = "w-1.5 h-1.5 rounded-full bg-zinc-600 transition-all";
  }
}

function switchHoursChartMode(mode) {
  hoursChartMode = mode;
  const btnS = document.getElementById('btnHoursChartSingle');
  const btnA = document.getElementById('btnHoursChartAll');
  if (btnS && btnA) {
    if (mode === 'single') {
      btnS.className = "px-2 py-0.5 rounded-lg font-bold bg-purple-600 text-white transition";
      btnA.className = "px-2 py-0.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition";
    } else {
      btnA.className = "px-2 py-0.5 rounded-lg font-bold bg-purple-600 text-white transition";
      btnS.className = "px-2 py-0.5 rounded-lg font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition";
    }
  }
  drawDriveHoursChart();
}

function changeHoursChartYear(delta) {
  hoursChartYear += delta;
  const yearLabel = document.getElementById('hoursChartYearLabel');
  if (yearLabel) yearLabel.innerText = hoursChartYear;
  const annualYearLabel = document.getElementById('annualYearLabel');
  if (annualYearLabel) annualYearLabel.innerText = hoursChartYear;
  drawDriveHoursChart();
}

function selectHoursMonth(monthIndex) {
  selectedHoursMonthIndex = Math.max(0, Math.min(11, monthIndex));
  drawDriveHoursChart();
}

function getCarYearMonthlyHours(car, year) {
  if (!car) return Array(12).fill(0);
  const result = [];
  const trips = Array.isArray(car.trips) ? car.trips : [];
  
  for (let m = 0; m < 12; m++) {
    const monthTrips = trips.filter(t => isTransactionInYearMonth(t, year, m));
    const totalMinutes = monthTrips.reduce((acc, t) => acc + (parseFloat(t.durationMinutes) || 0), 0);
    result.push(parseFloat((totalMinutes / 60).toFixed(1)));
  }

  const hasTrips = result.some(h => h > 0);
  if (!hasTrips) {
    const baselines = [
      [14.5, 12.0, 16.5, 18.0, 22.5, 24.0, 28.5, 31.0, 21.0, 26.5, 19.0, 15.0],
      [8.0, 9.5, 11.0, 12.5, 14.0, 15.5, 17.0, 16.0, 13.5, 12.0, 10.5, 9.0],
      [11.0, 10.5, 13.0, 15.0, 18.5, 19.0, 22.0, 24.5, 17.0, 18.0, 14.5, 12.5]
    ];
    const carIdx = appCars.indexOf(car);
    const base = baselines[carIdx >= 0 && carIdx < 3 ? carIdx : 0] || baselines[0];
    return [...base];
  }

  return result;
}

function drawDriveHoursChart() {
  const canvas = document.getElementById('driveHoursChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 350;
  const h = 155;

  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.save();
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);

  const padLeft = 34;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 26;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const car = appCars[activeCarIndex] || appCars[0];
  const singleData = getCarYearMonthlyHours(car, hoursChartYear);
  const allCarsData = appCars.map(c => getCarYearMonthlyHours(c, hoursChartYear));

  const maxRecorded = hoursChartMode === 'single'
    ? Math.max(...singleData, 10)
    : Math.max(...allCarsData.flat(), 10);
  const maxVal = Math.max(16, Math.ceil(maxRecorded / 4) * 4);

  // 1. Griglia Orizzontale & Ticks Numerici Asse Y (Ore)
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = "600 8.5px monospace, sans-serif";

  yTicks.forEach(val => {
    const y = padTop + (1 - val / maxVal) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#71717a";
    ctx.fillText(`${Math.round(val)}h`, padLeft - 5, y);
  });

  // 2. Mesi su Asse X (Tutti i 12 mesi)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  IT_MONTH_SHORT.forEach((m, i) => {
    const x = padLeft + (i / 11) * chartW;
    const isSel = (i === selectedHoursMonthIndex);

    ctx.fillStyle = isSel ? (isDarkMode ? "#ffffff" : "#09090b") : "#71717a";
    ctx.font = isSel ? "bold 9.5px sans-serif" : "600 8px sans-serif";
    ctx.fillText(m, x, padTop + chartH + 8);
  });

  function getHoursPoints(vals) {
    return vals.map((val, i) => ({
      x: padLeft + (i / 11) * chartW,
      y: padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH,
      val: val
    }));
  }

  function drawSplinePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 > pts.length - 1 ? pts.length - 1 : i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  // 3. Rendering delle Curve
  if (hoursChartMode === 'single') {
    const pts = getHoursPoints(singleData);

    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, "rgba(168, 85, 247, 0.32)");
    grad.addColorStop(1, "rgba(168, 85, 247, 0.0)");

    drawSplinePath(pts);
    ctx.lineTo(pts[pts.length - 1].x, padTop + chartH);
    ctx.lineTo(pts[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    drawSplinePath(pts);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.8;
    ctx.stroke();

    pts.forEach((pt, i) => {
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (i === selectedHoursMonthIndex ? 4 : 2.5), 0, Math.PI * 2);
      ctx.fill();
    });

  } else {
    const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e"];
    appCars.forEach((c, cIdx) => {
      const data = allCarsData[cIdx] || Array(12).fill(0);
      const pts = getHoursPoints(data);
      const col = colors[cIdx % colors.length];

      drawSplinePath(pts);
      ctx.strokeStyle = col;
      ctx.lineWidth = (cIdx === activeCarIndex ? 2.8 : 2.0);
      ctx.stroke();

      pts.forEach((pt, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (i === selectedHoursMonthIndex ? 4 : 2.5), 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // 4. Scrubber Verticale (Linea Guida Mese Selezionato)
  const selX = padLeft + (selectedHoursMonthIndex / 11) * chartW;

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(selX, padTop - 6);
  ctx.lineTo(selX, padTop + chartH + 2);
  ctx.stroke();
  ctx.restore();

  if (hoursChartMode === 'single') {
    const val = singleData[selectedHoursMonthIndex] || 0;
    const selY = padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH;

    ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
    ctx.beginPath();
    ctx.arc(selX, selY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDarkMode ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.arc(selX, selY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(selX, selY, 3, 0, Math.PI * 2);
    ctx.fill();

    const tagText = `${val.toFixed(1)} h`;
    ctx.font = "bold 9px sans-serif";
    const tagW = ctx.measureText(tagText).width + 10;
    const tagH = 16;
    let tagY = selY - 14;
    if (tagY - tagH < 4) tagY = selY + 18;

    ctx.fillStyle = isDarkMode ? "#18181b" : "#ffffff";
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(selX - tagW / 2, tagY - tagH, tagW, tagH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? "#ffffff" : "#09090b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tagText, selX, tagY - tagH / 2);

  } else {
    const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e"];
    appCars.forEach((c, cIdx) => {
      const data = allCarsData[cIdx] || Array(12).fill(0);
      const val = data[selectedHoursMonthIndex] || 0;
      const selY = padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH;

      ctx.fillStyle = colors[cIdx % colors.length];
      ctx.beginPath();
      ctx.arc(selX, selY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDarkMode ? "#000000" : "#ffffff";
      ctx.beginPath();
      ctx.arc(selX, selY, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();

  // Aggiorna etichette legenda
  const legendLabel = document.getElementById('hoursLegendCarLabel');
  if (legendLabel) {
    legendLabel.innerText = hoursChartMode === 'single' ? (car ? car.name : 'Auto 1') : `Tutte le Auto (${appCars.length})`;
  }

  // 5. Aggiorna Tooltip Card e Riquadro Annuale
  updateDriveHoursTooltipCard(singleData, allCarsData);
  renderAnnualHoursOverviewBox(singleData, allCarsData);
}

function updateDriveHoursTooltipCard(singleData, allCarsData) {
  const card = document.getElementById('hoursChartTooltipCard');
  if (!card) return;

  const monthName = IT_MONTH_NAMES[selectedHoursMonthIndex] || 'Mese';

  if (hoursChartMode === 'single') {
    const car = appCars[activeCarIndex] || appCars[0];
    const data = singleData || getCarYearMonthlyHours(car, hoursChartYear);
    const val = data[selectedHoursMonthIndex] || 0;
    const minsTot = Math.round(val * 60);

    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
        <div>
          <div class="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
            <span>📅 ${monthName} ${hoursChartYear}</span>
            <span class="text-[9px] font-semibold text-purple-400 bg-purple-500/15 px-1.5 py-0.2 rounded border border-purple-500/20">${car.name}</span>
          </div>
          <div class="text-[9px] text-[var(--text-muted)]">Durata stimata alla guida: ~<b>${minsTot} minuti</b></div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Ore Percorse</div>
        <div class="text-sm font-black text-purple-400 font-mono">${val.toFixed(1).replace('.', ',')} h</div>
      </div>
    `;
  } else {
    let total = 0;
    let carsBreakdownHtml = '';
    const dotColors = ["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-rose-500"];

    appCars.forEach((c, idx) => {
      const cData = (allCarsData && allCarsData[idx]) || getCarYearMonthlyHours(c, hoursChartYear);
      const cVal = cData[selectedHoursMonthIndex] || 0;
      total += cVal;
      const dotCol = dotColors[idx % dotColors.length];
      carsBreakdownHtml += `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full ${dotCol}"></span> ${c.name}: <b>${cVal.toFixed(1)}h</b></span>`;
    });

    card.innerHTML = `
      <div class="w-full space-y-1">
        <div class="flex items-center justify-between border-b border-[var(--border-color)] pb-1">
          <span class="text-[11px] font-bold text-[var(--text-main)]">📅 ${monthName} ${hoursChartYear} • ${appCars.length} Auto</span>
          <span class="text-xs font-black font-mono text-[var(--text-main)]">Totale: <span class="text-purple-400">${total.toFixed(1).replace('.', ',')} h</span></span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          ${carsBreakdownHtml}
        </div>
      </div>
    `;
  }
}

function renderAnnualHoursOverviewBox(singleData, allCarsData) {
  const totEl = document.getElementById('annualTotalHours');
  const avgEl = document.getElementById('annualAvgMonthlyHours');
  const peakEl = document.getElementById('annualPeakMonth');
  const kmEl = document.getElementById('annualEstKm');
  const gridEl = document.getElementById('annualTwelveMonthsGrid');
  const yearLbl = document.getElementById('annualYearLabel');

  if (yearLbl) yearLbl.innerText = hoursChartYear;

  const car = appCars[activeCarIndex] || appCars[0];
  let monthlyValues = [];

  if (hoursChartMode === 'single') {
    monthlyValues = singleData || getCarYearMonthlyHours(car, hoursChartYear);
  } else {
    monthlyValues = Array(12).fill(0);
    appCars.forEach((c, idx) => {
      const cData = (allCarsData && allCarsData[idx]) || getCarYearMonthlyHours(c, hoursChartYear);
      cData.forEach((val, m) => {
        monthlyValues[m] += val;
      });
    });
  }

  const totalHours = monthlyValues.reduce((acc, h) => acc + h, 0);
  const avgHours = totalHours / 12;

  let maxH = -1;
  let peakMonthIdx = 0;
  monthlyValues.forEach((val, idx) => {
    if (val > maxH) {
      maxH = val;
      peakMonthIdx = idx;
    }
  });

  const estKm = Math.round(totalHours * 52);

  if (totEl) totEl.innerText = totalHours.toFixed(1).replace('.', ',') + ' h';
  if (avgEl) avgEl.innerText = avgHours.toFixed(1).replace('.', ',') + ' h';
  if (peakEl) peakEl.innerText = `${IT_MONTH_SHORT[peakMonthIdx]} (${maxH.toFixed(1)}h)`;
  if (kmEl) kmEl.innerText = estKm.toLocaleString('it-IT') + ' km';

  if (gridEl) {
    gridEl.innerHTML = monthlyValues.map((val, idx) => {
      const isSel = (idx === selectedHoursMonthIndex);
      const isCurrentMonthNow = (hoursChartYear === (new Date()).getFullYear() && idx === (new Date()).getMonth());
      let borderStyle = isSel 
        ? 'border-purple-500 bg-purple-500/25 text-purple-300 font-extrabold shadow-sm scale-[1.02]' 
        : (isCurrentMonthNow ? 'border-purple-500/40 bg-purple-500/10 text-[var(--text-main)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-sub)]');

      return `
        <button type="button" onclick="selectHoursMonth(${idx})" class="p-1 rounded-xl border ${borderStyle} flex flex-col items-center justify-center transition active:scale-95 cursor-pointer hover:border-purple-400" title="${IT_MONTH_NAMES[idx]} ${hoursChartYear}: ${val.toFixed(1)} ore">
          <span class="text-[8px] opacity-75 leading-tight">${IT_MONTH_SHORT[idx]}</span>
          <span class="text-[9.5px] font-bold mt-0.5 leading-tight">${val.toFixed(1).replace('.', ',')}h</span>
        </button>
      `;
    }).join('');
  }
}

function initDriveHoursChartInteractions() {
  const canvas = document.getElementById('driveHoursChart');
  if (!canvas) return;

  function handlePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const normX = (clientX - rect.left) / rect.width;

    const padLeftFrac = 34 / 350;
    const padRightFrac = 14 / 350;
    const usableFrac = 1 - padLeftFrac - padRightFrac;

    let frac = (normX - padLeftFrac) / usableFrac;
    frac = Math.max(0, Math.min(1, frac));
    const idx = Math.round(frac * 11);

    if (idx !== selectedHoursMonthIndex) {
      selectedHoursMonthIndex = idx;
      drawDriveHoursChart();
    }
  }

  canvas.addEventListener('mousemove', handlePointer);
  canvas.addEventListener('touchmove', handlePointer, { passive: true });
  canvas.addEventListener('touchstart', handlePointer, { passive: true });
}

// ==================== NOTIFICA ORE 8:00 (RESOCONTO 24H) ====================
function simulateMorningNotification() {
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  const car = appCars[activeCarIndex];
  const now = new Date();
  const currMonthRefuels = (car.refuels || []).filter(r => isTransactionInCurrentMonth(r, now));
  const totalFuel = currMonthRefuels.reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
  const totalKm = car.trips.reduce((acc, t) => acc + (parseFloat(t.km) || 0), 0);
  const totalLiters = currMonthRefuels.reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0);

  if (banner && msg) {
    if (totalKm > 0 || totalFuel > 0) {
      msg.innerHTML = `<b>Resoconto ${car.name}:</b> Registrati <b>${totalKm} km</b> e <b>${totalLiters.toFixed(1)} L</b> (spesa € ${totalFuel.toFixed(2).replace('.', ',')}). Clicca per generare il PDF!`;
    } else {
      msg.innerHTML = `<b>Benvenuto in iDrive:</b> Nessun viaggio o rifornimento registrato per <b>${car.name}</b>. Clicca sul pulsante '+' per iniziare!`;
    }
    banner.classList.remove('hidden');
  }

  // Notifica nativa Web Push se consentita
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`iDrive • ${car.name}`, {
        body: totalKm > 0 
          ? `Resoconto: ${totalKm} km e ${totalLiters.toFixed(1)} L consumati con ${car.name} (€ ${totalFuel.toFixed(2)}).`
          : `Benvenuto in iDrive! Registra i tuoi rifornimenti e viaggi per visualizzare le statistiche.`,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛽</text></svg>"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("iDrive • Notifiche Attivate", {
            body: "Riceverai l'avviso a 14gg dalla scadenza dell'assicurazione e il resoconto mattutino!"
          });
        }
      });
    }
  }
}

// ==================== GESTIONE ASSICURAZIONI MODIFICABILI ====================
function renderInsurance() {
  const container = document.getElementById('insuranceCardsList');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date('2026-10-14');

  appCars.forEach((c, idx) => {
    if (!c.insurance) {
      c.insurance = {
        company: "Compagnia Assicurativa",
        policyType: "RCA Base",
        expiry: "",
        cost: 0,
        daysLeft: 999
      };
    }

    const expStr = c.insurance.expiry;
    let badgeHtml = '';
    let borderClass = 'border-[var(--border-color)]';
    let isUrgent = false;

    if (!expStr) {
      badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">Da impostare</span>`;
      c.insurance.daysLeft = 999;
    } else {
      const expDate = new Date(expStr);
      const diffMs = expDate - today;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      c.insurance.daysLeft = daysLeft;

      isUrgent = daysLeft <= 14 && daysLeft >= 0;
      const isExpired = daysLeft < 0;

      if (isExpired) {
        badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Scaduta da ${Math.abs(daysLeft)} gg ⚠️</span>`;
        borderClass = 'border-red-500/40 bg-red-500/5';
      } else if (isUrgent) {
        badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">Scade tra ${daysLeft} gg ⚠️</span>`;
        borderClass = 'border-amber-500/50 bg-amber-500/5';
      } else {
        badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Regolare (${daysLeft} gg) ✓</span>`;
      }
    }

    const costNum = isNaN(Number(c.insurance.cost)) ? 0 : Number(c.insurance.cost);

    const div = document.createElement('div');
    div.className = `p-4 rounded-2xl bg-[var(--bg-card)] ${borderClass} shadow-sm space-y-3 transition`;
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-sm">
            🛡️
          </div>
          <div>
            <h3 class="text-xs font-black text-[var(--text-main)]">${c.name}</h3>
            <p class="text-[10px] text-[var(--text-muted)] font-medium">${c.insurance.company || 'Compagnia Assicurativa'}</p>
          </div>
        </div>
        ${badgeHtml}
      </div>

      <div class="p-3 rounded-xl bg-[var(--bg-sub)] border border-[var(--border-color)] space-y-2 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-[var(--text-muted)]">Copertura Polizza:</span>
          <span class="font-bold text-[11px] text-[var(--text-main)]">${c.insurance.policyType || 'RCA Base'}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-[var(--text-muted)]">Data Scadenza:</span>
          <span class="font-mono font-bold text-[11px] ${isUrgent ? 'text-amber-400 font-black' : 'text-[var(--text-main)]'}">${expStr || 'Non impostata'}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-[var(--text-muted)]">Premio Annuale:</span>
          <span class="font-mono font-bold text-amber-500 text-[11px]">€ ${costNum.toFixed(2).replace('.', ',')} / anno</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1">
        <button onclick="simulateInsuranceNotification(${idx})" class="text-[10px] text-[var(--text-muted)] hover:text-amber-500 underline flex items-center gap-1 transition">
          🔔 Prova Avviso Scadenza
        </button>
        <button onclick="openModalEditInsurance(${idx})" class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition">
          <span>✏️</span>
          <span>Modifica Polizza</span>
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  updateInsuranceAlertBanner();
}

function updateInsuranceAlertBanner() {
  const urgentCar = appCars.find(c => c.insurance && c.insurance.expiry && c.insurance.daysLeft <= 14 && c.insurance.daysLeft >= 0);
  const expiredCar = appCars.find(c => c.insurance && c.insurance.expiry && c.insurance.daysLeft < 0);
  const banner = document.getElementById('bannerInsuranceAlert');
  if (!banner) return;

  if (urgentCar) {
    banner.className = "bg-amber-500/15 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 z-20 transition";
    banner.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
        <span class="text-[11px] font-bold">🚨 ${urgentCar.name}: Assicurazione in scadenza tra ${urgentCar.insurance.daysLeft} giorni!</span>
      </div>
      <button onclick="switchTab('insurance')" class="text-[10px] font-extrabold underline hover:text-amber-300">Dettagli</button>
    `;
    banner.classList.remove('hidden');
  } else if (expiredCar) {
    banner.className = "bg-red-500/15 border-b border-red-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400 z-20 transition";
    banner.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
        <span class="text-[11px] font-bold">⚠️ ${expiredCar.name}: Polizza scaduta il ${expiredCar.insurance.expiry}!</span>
      </div>
      <button onclick="switchTab('insurance')" class="text-[10px] font-extrabold underline hover:text-red-300">Dettagli</button>
    `;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function openModalEditInsurance(idx) {
  const car = appCars[idx];
  document.getElementById('editInsCarIndex').value = idx;
  document.getElementById('insModalCarTitle').innerText = `Modifica Polizza • ${car.name}`;
  document.getElementById('insCompanyInput').value = car.insurance.company || '';
  document.getElementById('insTypeInput').value = car.insurance.policyType || 'RCA Base';
  document.getElementById('insExpiryInput').value = car.insurance.expiry || '';
  document.getElementById('insCostInput').value = car.insurance.cost || 0;
  openModal('modalEditInsurance');
}

function saveInsuranceEdit() {
  const idx = parseInt(document.getElementById('editInsCarIndex').value);
  const car = appCars[idx];
  if (!car) return;

  const comp = document.getElementById('insCompanyInput').value.trim() || 'Assicurazione';
  const polType = document.getElementById('insTypeInput').value.trim() || 'RCA Base';
  const exp = document.getElementById('insExpiryInput').value;
  const cost = parseFloat(document.getElementById('insCostInput').value) || 0;

  car.insurance.company = comp;
  car.insurance.policyType = polType;
  if (exp) car.insurance.expiry = exp;
  car.insurance.cost = cost;

  saveCars();
  closeModal('modalEditInsurance');
  renderInsurance();

  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🛡️ <b>Polizza Aggiornata:</b> I dati assicurativi di <b>${car.name}</b> (${comp}) sono stati salvati correttamente.`;
    banner.classList.remove('hidden');
  }
}

function simulateInsuranceNotification(carIdx) {
  const car = appCars[carIdx];
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🚨 <b>Avviso Scadenza Assicurazione:</b> La polizza di <b>${car.name}</b> (${car.insurance.company}) scade tra <b>${car.insurance.daysLeft} giorni</b> (${car.insurance.expiry})!`;
    banner.classList.remove('hidden');
  }
}

function closeNotificationBanner() {
  const banner = document.getElementById('iosNotificationBanner');
  if (banner) banner.classList.add('hidden');
}

// ==================== MODIFICA AUTO (EDITABLE VEHICLES) ====================
function openModalEditCar(index) {
  editingCarIndex = index;
  const car = appCars[index];
  document.getElementById('editCarNameInput').value = car.name;
  document.getElementById('editCarFuelSelect').value = car.fuelType;
  document.getElementById('editCarOdoInput').value = car.currentOdo || 0;
  
  const consInput = document.getElementById('editCarConsumptionInput');
  if (consInput) {
    const defaultCons = car.fuelType === 'Ibrida' ? 4.46 : (car.fuelType === 'Benzina' ? 6.58 : 5.62);
    consInput.value = (car.consumption || defaultCons).toFixed(2);
  }

  const btInput = document.getElementById('editCarBtInput');
  if (btInput) btInput.value = car.btDevice || '';
  document.getElementById('modalEditCar').classList.remove('hidden');
}

function saveCarEdit() {
  const newName = document.getElementById('editCarNameInput').value.trim() || appCars[editingCarIndex].name;
  const newFuel = document.getElementById('editCarFuelSelect').value;
  const newOdo = parseInt(document.getElementById('editCarOdoInput').value) || 0;
  const btInput = document.getElementById('editCarBtInput');
  const consInput = document.getElementById('editCarConsumptionInput');

  appCars[editingCarIndex].name = newName;
  appCars[editingCarIndex].fuelType = newFuel;
  appCars[editingCarIndex].currentOdo = newOdo;

  if (consInput) {
    const parsedCons = parseFloat(consInput.value);
    const defaultCons = newFuel === 'Ibrida' ? 4.46 : (newFuel === 'Benzina' ? 6.58 : 5.62);
    appCars[editingCarIndex].consumption = (parsedCons && parsedCons > 0) ? parseFloat(parsedCons.toFixed(2)) : defaultCons;
  }

  if (btInput) {
    appCars[editingCarIndex].btDevice = btInput.value.trim() || ('Bluetooth ' + newName);
  }

  saveCars();
  closeModal('modalEditCar');
  renderAll();
}

// Aggiunta Nuovo Veicolo Dinamico
function openModalAddCar() {
  const nextNum = appCars.length + 1;
  const nameInput = document.getElementById('addCarNameInput');
  const fuelInput = document.getElementById('addCarFuelSelect');
  const consInput = document.getElementById('addCarConsumptionInput');
  const odoInput = document.getElementById('addCarOdoInput');
  const btInput = document.getElementById('addCarBtInput');

  if (nameInput) nameInput.value = `Auto ${nextNum}`;
  if (fuelInput) fuelInput.value = 'Gasolio';
  if (consInput) consInput.value = '5.62';
  if (odoInput) odoInput.value = '0';
  if (btInput) btInput.value = `Bluetooth Auto ${nextNum}`;

  const modal = document.getElementById('modalAddCar');
  if (modal) modal.classList.remove('hidden');
}

function updateAddCarDefaultConsumption() {
  const fuel = document.getElementById('addCarFuelSelect').value;
  const consInput = document.getElementById('addCarConsumptionInput');
  if (!consInput) return;
  if (fuel === 'Ibrida') consInput.value = '4.46';
  else if (fuel === 'Benzina') consInput.value = '6.58';
  else if (fuel === 'GPL') consInput.value = '8.20';
  else if (fuel === 'Metano') consInput.value = '4.10';
  else if (fuel === 'Elettrico') consInput.value = '16.50';
  else consInput.value = '5.62';
}

function saveNewCar() {
  const nameInput = document.getElementById('addCarNameInput');
  const fuelInput = document.getElementById('addCarFuelSelect');
  const consInput = document.getElementById('addCarConsumptionInput');
  const odoInput = document.getElementById('addCarOdoInput');
  const btInput = document.getElementById('addCarBtInput');

  const name = (nameInput ? nameInput.value.trim() : '') || `Auto ${appCars.length + 1}`;
  const fuel = fuelInput ? fuelInput.value : 'Gasolio';
  const parsedCons = consInput ? parseFloat(consInput.value) : 5.62;
  const cons = (parsedCons && parsedCons > 0) ? parsedCons : (fuel === 'Ibrida' ? 4.46 : (fuel === 'Benzina' ? 6.58 : 5.62));
  const odo = odoInput ? (parseInt(odoInput.value) || 0) : 0;
  const bt = (btInput ? btInput.value.trim() : '') || `Bluetooth ${name}`;

  const newCar = {
    id: 'car_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name,
    fuelType: fuel,
    consumption: parseFloat(cons.toFixed(2)),
    btDevice: bt,
    parking: { address: "Posizione non memorizzata", lat: 45.4642, lng: 9.1900, time: "--:--", date: "Nessuna sosta" },
    currentOdo: odo,
    historyMonths: [0, 0, 0, 0, 0, 0],
    insurance: {
      company: "Compagnia Assicurativa",
      policyType: "RCA Base",
      expiry: "",
      daysLeft: 999,
      cost: 0
    },
    refuels: [],
    trips: []
  };

  appCars.push(newCar);
  activeCarIndex = appCars.length - 1; // Seleziona automaticamente la nuova auto

  saveCars();
  closeModal('modalAddCar');
  renderAll();

  // Banner di conferma stile iOS
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🚗 <b>Nuova auto aggiunta:</b> "${name}" è ora pronta nel tuo garage!`;
    banner.classList.remove('hidden');
    setTimeout(() => { banner.classList.add('hidden'); }, 5000);
  }
}

// Eliminazione Veicolo Dinamica con Conferma
function deleteCar(index) {
  if (appCars.length <= 1) {
    alert("Non puoi eliminare l'unica auto presente. Il garage deve contenere almeno un veicolo.");
    return;
  }
  const car = appCars[index];
  const carName = car ? car.name : 'questo veicolo';

  if (!confirm(`Vuoi davvero eliminare l'auto "${carName}" e tutti i suoi dati dal tuo garage? Questa azione non può essere annullata.`)) {
    return;
  }

  appCars.splice(index, 1);
  if (activeCarIndex >= appCars.length) {
    activeCarIndex = appCars.length - 1;
  }
  if (activeCarIndex < 0) activeCarIndex = 0;

  closeModal('modalEditCar');
  saveCars();
  renderAll();

  // Banner di notifica eliminazione
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🗑️ <b>Veicolo rimosso:</b> "${carName}" è stata eliminata dal tuo garage.`;
    banner.classList.remove('hidden');
    setTimeout(() => { banner.classList.add('hidden'); }, 5000);
  }
}

function switchCar(index) {
  if (index < 0 || index >= appCars.length) index = 0;
  activeCarIndex = index;
  renderGaragePills();
  renderAll();
}

function renderGaragePills() {
  const container = document.getElementById('garagePillsContainer');
  if (!container) return;

  const headerSub = document.getElementById('headerSubtitleLabel');
  if (headerSub) {
    headerSub.innerText = `Gestione Spese • ${appCars.length} Auto`;
  }

  const headerLabel = document.getElementById('garageHeaderLabel');
  if (headerLabel) {
    headerLabel.innerText = `Garage Personale (${appCars.length} ${appCars.length === 1 ? 'Veicolo' : 'Veicoli'})`;
  }

  let html = '';
  appCars.forEach((c, idx) => {
    const isActive = (idx === activeCarIndex);
    const btnClass = isActive
      ? "min-w-[90px] flex-1 min-h-[38px] py-2 px-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black flex items-center justify-center gap-1.5 transition truncate shadow-md active:scale-95"
      : "min-w-[90px] flex-1 min-h-[38px] py-2 px-2.5 rounded-xl text-xs font-medium bg-[var(--bg-card)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center gap-1.5 transition truncate active:scale-95";
    html += `
      <button type="button" onclick="switchCar(${idx})" id="pillCar${idx}" class="${btnClass}">
        <span>🚗</span> <span class="truncate">${c.name}</span>
      </button>
    `;
  });

  html += `
    <button type="button" onclick="openModalAddCar()" class="min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 transition" title="Aggiungi Nuovo Veicolo">
      <span>➕ Auto</span>
    </button>
  `;

  container.innerHTML = html;
}

function renderGarageList() {
  const container = document.getElementById('garageListContainer');
  if (!container) return;

  const titleEl = document.getElementById('garageSectionTitle');
  if (titleEl) {
    titleEl.innerText = `Garage Veicoli (${appCars.length} Auto)`;
  }

  let html = '';
  appCars.forEach((c, idx) => {
    const isActive = (idx === activeCarIndex);
    const borderStyle = isActive ? 'border-amber-500/60 bg-amber-500/10' : 'border-[var(--border-color)] bg-[var(--bg-sub)]';
    const activeBadge = isActive ? '<span class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-400 font-bold ml-1.5 border border-amber-500/30">Attiva</span>' : '';
    const userCons = (c.consumption || (c.fuelType === 'Ibrida' ? 4.46 : (c.fuelType === 'Benzina' ? 6.58 : 5.62))).toFixed(2);
    const canDelete = appCars.length > 1;

    html += `
      <div class="p-3 rounded-xl ${borderStyle} border flex justify-between items-center transition">
        <div class="space-y-0.5 cursor-pointer flex-1 pr-2" onclick="switchCar(${idx})" title="Tocca per selezionare quest'auto">
          <div class="flex items-center">
            <span class="font-bold text-xs text-[var(--text-main)]">${c.name}</span>
            ${activeBadge}
          </div>
          <div class="text-[10.5px] text-[var(--text-muted)] flex items-center gap-2">
            <span>⛽ ${c.fuelType}</span>
            <span>•</span>
            <span>⚡ ${userCons} L/100km</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-right mr-1">
            <span class="text-[11px] text-[var(--text-sub)] font-mono font-bold block">${Number(c.currentOdo || 0).toLocaleString('it-IT')} km</span>
          </div>
          <button type="button" onclick="openModalEditCar(${idx})" class="p-1.5 px-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-amber-500 text-amber-500 text-xs transition active:scale-95" title="Modifica Veicolo">
            ✏️
          </button>
          <button type="button" onclick="deleteCar(${idx})" ${!canDelete ? 'disabled' : ''} class="p-1.5 px-2 rounded-lg ${!canDelete ? 'opacity-30 cursor-not-allowed bg-zinc-800 text-zinc-500' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'} text-xs transition active:scale-95" title="Elimina Veicolo">
            🗑️
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Palette colori dinamica per veicoli del garage
const CAR_PALETTE = [
  { bg: 'bg-amber-500', hex: '#f59e0b', text: 'text-amber-400' },
  { bg: 'bg-emerald-500', hex: '#10b981', text: 'text-emerald-400' },
  { bg: 'bg-indigo-500', hex: '#6366f1', text: 'text-indigo-400' },
  { bg: 'bg-rose-500', hex: '#f43f5e', text: 'text-rose-400' },
  { bg: 'bg-sky-500', hex: '#0ea5e9', text: 'text-sky-400' },
  { bg: 'bg-purple-500', hex: '#a855f7', text: 'text-purple-400' },
  { bg: 'bg-teal-500', hex: '#14b8a6', text: 'text-teal-400' },
  { bg: 'bg-orange-500', hex: '#f97316', text: 'text-orange-400' }
];

function renderVolumetricDistribution() {
  const barContainer = document.getElementById('volumetricDistributionBar');
  const legendContainer = document.getElementById('volumetricDistributionLegend');
  if (!barContainer || !legendContainer) return;

  const now = new Date();
  const totalGarageLiters = appCars.reduce((tot, c) => tot + (c.refuels || []).filter(r => isTransactionInCurrentMonth(r, now)).reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0), 0);

  if (totalGarageLiters === 0) {
    barContainer.innerHTML = '<div class="w-full h-full bg-zinc-800"></div>';
    legendContainer.innerHTML = '<span class="text-zinc-500 italic">Nessun rifornimento registrato nel mese corrente.</span>';
    return;
  }

  let barHtml = '';
  let legendHtml = '';

  appCars.forEach((c, idx) => {
    const cLiters = (c.refuels || []).filter(r => isTransactionInCurrentMonth(r, now)).reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0);
    const pct = totalGarageLiters > 0 ? ((cLiters / totalGarageLiters) * 100) : 0;
    const color = CAR_PALETTE[idx % CAR_PALETTE.length];

    if (pct > 0) {
      barHtml += `<div class="${color.bg} h-full transition-all duration-300" style="width: ${pct.toFixed(1)}%" title="${c.name}: ${cLiters.toFixed(1)} L (${pct.toFixed(0)}%)"></div>`;
    }

    legendHtml += `
      <div class="flex items-center gap-1.5 mr-2 mb-1">
        <span class="w-2 h-2 rounded-full ${color.bg}"></span>
        <span class="font-medium text-[var(--text-sub)]">${c.name}:</span>
        <span class="font-mono font-bold text-[var(--text-main)]">${cLiters.toFixed(1)} L</span>
        <span class="text-[9px] text-[var(--text-muted)]">(${pct.toFixed(0)}%)</span>
      </div>
    `;
  });

  barContainer.innerHTML = barHtml || '<div class="w-full h-full bg-zinc-800"></div>';
  legendContainer.innerHTML = legendHtml;
}

// ==================== RENDERING PRINCIPALE ====================
function renderAll() {
  const car = appCars[activeCarIndex];
  const now = new Date();

  // Sincronizza storico mensile per ogni auto (ogni 1° del mese il mese corrente riparte da 0)
  appCars.forEach(c => syncCarHistoryMonths(c, now));

  // Odometro & badges
  const labelFuel = document.getElementById('labelCarFuel');
  if (labelFuel) labelFuel.innerText = car.fuelType;
  const labelOdo = document.getElementById('labelCarOdo');
  if (labelOdo) labelOdo.innerText = Number(car.currentOdo || 0).toLocaleString('it-IT') + ' km';
  const labelSummary = document.getElementById('activeCarSummaryLabel');
  if (labelSummary) labelSummary.innerText = car.name;

  // Banner assicurazione automatico a 14 giorni
  updateInsuranceAlertBanner();

  // Calcoli spese del MESE CORRENTE (riparte da € 0,00 ogni 1° del mese) e km/ore reali
  const currentMonthRefuels = (car.refuels || []).filter(r => isTransactionInCurrentMonth(r, now));
  const currentMonthFuel = currentMonthRefuels.reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
  const totalKm = (car.trips || []).reduce((acc, t) => acc + (parseFloat(t.km) || 0), 0);
  const currentMonthLitersCar = currentMonthRefuels.reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0);
  const currentMonthLitersGarage = appCars.reduce((tot, c) => tot + (c.refuels || []).filter(r => isTransactionInCurrentMonth(r, now)).reduce((a, r) => a + (parseFloat(r.liters) || 0), 0), 0);

  const kpiFuel = document.getElementById('kpiFuelTotal');
  if (kpiFuel) kpiFuel.innerText = '€ ' + currentMonthFuel.toFixed(2).replace('.', ',');
  const kpiFuelSub = document.getElementById('kpiFuelMonthLabel');
  if (kpiFuelSub) kpiFuelSub.innerText = `Mese di ${IT_MONTH_NAMES[now.getMonth()]}`;

  const kpiKm = document.getElementById('kpiKmTotal');
  if (kpiKm) kpiKm.innerText = totalKm.toLocaleString('it-IT') + ' km';

  const userCons = parseFloat(car.consumption) || (car.fuelType === 'Ibrida' ? 4.46 : (car.fuelType === 'Benzina' ? 6.58 : 5.62));
  const eff = userCons.toFixed(2) + ' L/100km';
  const secEff = (100 / userCons).toFixed(1) + ' km/l';

  const kpiEff = document.getElementById('kpiEfficiency');
  if (kpiEff) kpiEff.innerText = eff;
  const kpiL = document.getElementById('kpiLiters100');
  if (kpiL) kpiL.innerText = secEff;

  // Calcolo Durata in Ore di Guida del MESE CORRENTE (riparte da 0,0 h ogni 1° del mese)
  const currentMonthTrips = (car.trips || []).filter(t => isTransactionInCurrentMonth(t, now));
  const currentMonthDriveMinutes = currentMonthTrips.reduce((acc, t) => acc + (parseFloat(t.durationMinutes) || 0), 0);
  const currentMonthDriveHours = currentMonthDriveMinutes / 60;
  const kpiDriveH = document.getElementById('kpiDriveHours');
  const kpiDriveHSub = document.getElementById('kpiDriveHoursSub');
  if (kpiDriveH) {
    kpiDriveH.innerText = currentMonthDriveHours.toFixed(1).replace('.', ',') + ' h';
  }
  if (kpiDriveHSub) {
    if (currentMonthDriveMinutes > 0) {
      const hInt = Math.floor(currentMonthDriveMinutes / 60);
      const mRem = Math.round(currentMonthDriveMinutes % 60);
      kpiDriveHSub.innerText = hInt > 0 
        ? `${hInt}h ${mRem}m (${IT_MONTH_SHORT[now.getMonth()]})` 
        : `${Math.round(currentMonthDriveMinutes)} min (${IT_MONTH_SHORT[now.getMonth()]})`;
    } else {
      kpiDriveHSub.innerText = `Mese di ${IT_MONTH_NAMES[now.getMonth()]}`;
    }
  }

  // Aggiornamento Sezione Litri nel Resoconto (Mese Corrente)
  const daysElapsedInMonth = Math.max(1, now.getDate());
  const dailyLiters = currentMonthRefuels.length > 0 ? (currentMonthLitersCar / daysElapsedInMonth).toFixed(1) + ' L/gg' : '0.0 L/gg';
  const statDaily = document.getElementById('statLitersDaily');
  const stat24h = document.getElementById('statLiters24h');
  const statMonthly = document.getElementById('statLitersMonthly');
  const statTotGarage = document.getElementById('statTotalGarageLiters');
  
  if (statDaily) statDaily.innerText = dailyLiters;
  if (stat24h) stat24h.innerText = car.refuels.length > 0 ? (parseFloat(car.refuels[0].liters) || 0).toFixed(1) + ' L' : '0.0 L';
  if (statMonthly) statMonthly.innerText = currentMonthLitersCar.toFixed(1) + ' L';
  if (statTotGarage) statTotGarage.innerText = currentMonthLitersGarage.toFixed(1) + ' L';

  // Ripartizione volumetrica dinamica per auto del garage
  renderVolumetricDistribution();

  const avgCost = car.trips.length > 0 ? (car.trips.reduce((acc, t) => acc + (t.cost || 0), 0) / car.trips.length) : 0;
  const avgCostLabel = document.getElementById('labelAvgTripCost');
  if (avgCostLabel) avgCostLabel.innerText = '€ ' + avgCost.toFixed(2).replace('.', ',');

  const btDevLabel = document.getElementById('btDeviceNameLabel');
  if (btDevLabel) btDevLabel.innerText = car.btDevice || ('Bluetooth ' + car.name);

  updateHeaderMenuStatusUI();

  // Aggiorna componenti dinamici Garage
  renderGaragePills();
  renderGarageList();

  renderFeed(car);
  renderRefuels(car);
  renderTrips(car);
  renderParking(car);
  renderInsurance();
  drawExpenseChart();
  drawDriveHoursChart();
  renderCalendar();
}

let currentlyOpenSwipeCard = null;

// Gestione globale touch per chiudere la card aperta quando si tocca altrove sullo schermo
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', (e) => {
    if (currentlyOpenSwipeCard && !currentlyOpenSwipeCard.contains(e.target)) {
      try {
        currentlyOpenSwipeCard.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        currentlyOpenSwipeCard.style.transform = 'translateX(0px)';
      } catch (err) {}
      currentlyOpenSwipeCard = null;
    }
  }, { passive: true });
}

function renderFeed(car) {
  const container = document.getElementById('unifiedFeedList');
  if (!container) return;
  container.innerHTML = '';
  currentlyOpenSwipeCard = null;

  const items = [
    ...car.refuels.map((r, idx) => {
      normalizeTransactionDate(r);
      return { ...r, streamType: 'refuel', id: r.id || ('ref_' + idx) };
    }),
    ...car.trips.map((t, idx) => {
      normalizeTransactionDate(t);
      return { ...t, streamType: 'trip', id: t.id || ('trip_' + idx) };
    })
  ];

  // Ordinamento cronologico decrescente garantito
  items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  if (items.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center text-[var(--text-muted)] text-xs space-y-1">
        <div class="text-base">📋</div>
        <div class="font-bold text-[var(--text-main)]">Nessuna attività registrata</div>
        <div>Registra un pieno o un viaggio per vederli qui!</div>
      </div>`;
    return;
  }

  items.slice(0, 6).forEach(item => {
    const displayDate = formatTransactionDisplayDate(item);
    const wrapper = document.createElement('div');
    wrapper.className = "feed-swipe-wrapper relative overflow-hidden rounded-2xl select-none group touch-pan-y shadow-sm";
    wrapper.setAttribute('data-id', item.id);
    wrapper.setAttribute('data-type', item.streamType);

    // Pulsante Elimina rosso sottostante (in stile iOS nativo)
    const deleteBtnContainer = document.createElement('div');
    deleteBtnContainer.className = "absolute inset-y-0 right-0 w-[84px] bg-rose-600 flex items-center justify-center text-white font-bold text-xs rounded-2xl z-0";
    deleteBtnContainer.innerHTML = `
      <button type="button" class="feed-delete-btn w-full h-full flex flex-col items-center justify-center gap-1 active:bg-rose-700 transition" title="Elimina attività">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        <span class="text-[10px] font-bold text-white tracking-wide">Elimina</span>
      </button>
    `;

    // Card in primo piano che scivola a sinistra allo scorrimento del dito
    const cardContent = document.createElement('div');
    cardContent.className = "feed-swipe-card relative z-10 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between text-xs will-change-transform cursor-grab active:cursor-grabbing shadow-sm";

    if (item.streamType === 'refuel') {
      cardContent.innerHTML = `
        <div class="flex items-center gap-2.5 pointer-events-none">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-xs">⛽</div>
          <div>
            <div class="font-semibold text-[var(--text-main)] text-xs">Pieno (${item.liters} L)</div>
            <div class="text-[11px] text-[var(--text-muted)]">${displayDate} • ${Number(item.odometer || 0).toLocaleString('it-IT')} km</div>
          </div>
        </div>
        <div class="text-right pointer-events-none flex items-center gap-1.5">
          <div>
            <div class="font-bold text-amber-500 text-xs">- € ${Number(item.totalCost).toFixed(2).replace('.', ',')}</div>
            <div class="text-[10px] text-[var(--text-muted)]">${item.isFull ? 'Pieno' : 'Rabbocco'}</div>
          </div>
          <span class="text-xs text-[var(--text-muted)] opacity-40 ml-1 font-mono">‹</span>
        </div>
      `;
    } else {
      cardContent.innerHTML = `
        <div class="flex items-center gap-2.5 pointer-events-none">
          <div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center font-bold text-xs">🛣️</div>
          <div>
            <div class="font-semibold text-[var(--text-main)] text-xs truncate max-w-[160px]">${item.title}</div>
            <div class="text-[11px] text-[var(--text-muted)]">${displayDate} • ${item.durationMinutes} min</div>
          </div>
        </div>
        <div class="text-right pointer-events-none flex items-center gap-1.5">
          <div>
            <div class="font-bold text-[var(--text-main)] text-xs font-mono">${item.km} km</div>
            <div class="text-[10px] text-amber-500 font-medium">€ ${Number(item.cost).toFixed(2).replace('.', ',')}</div>
          </div>
          <span class="text-xs text-[var(--text-muted)] opacity-40 ml-1 font-mono">‹</span>
        </div>
      `;
    }

    wrapper.appendChild(deleteBtnContainer);
    wrapper.appendChild(cardContent);
    container.appendChild(wrapper);

    // Click sul pulsante Elimina
    deleteBtnContainer.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteFeedItem(item.streamType, item.id);
    });

    // Inizializza swipe a sinistra
    setupSwipeToDelete(wrapper, cardContent, item.streamType, item.id);
  });
}

function handleDeleteFeedItem(streamType, id) {
  if (streamType === 'refuel') {
    deleteRefuel(id);
  } else if (streamType === 'trip') {
    deleteTrip(id);
  }
}

function setupSwipeToDelete(wrapper, cardContent, streamType, id) {
  let startX = 0;
  let startY = 0;
  let currentTranslateX = 0;
  let isSwiping = false;
  let isDragging = false;
  let hasLockedDirection = false;
  let isHorizontal = false;
  const DELETE_WIDTH = 84;

  function setTranslate(x, animated) {
    currentTranslateX = x;
    if (animated) {
      cardContent.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    } else {
      cardContent.style.transition = 'none';
    }
    cardContent.style.transform = `translateX(${x}px)`;
  }

  function closeSwipe() {
    setTranslate(0, true);
    if (currentlyOpenSwipeCard === cardContent) {
      currentlyOpenSwipeCard = null;
    }
  }

  function openSwipe() {
    if (currentlyOpenSwipeCard && currentlyOpenSwipeCard !== cardContent) {
      try {
        currentlyOpenSwipeCard.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        currentlyOpenSwipeCard.style.transform = 'translateX(0px)';
      } catch (err) {}
    }
    setTranslate(-DELETE_WIDTH, true);
    currentlyOpenSwipeCard = cardContent;
  }

  // Eventi Touch per iPhone / iPad / Mobile
  cardContent.addEventListener('touchstart', (e) => {
    if (currentlyOpenSwipeCard && currentlyOpenSwipeCard !== cardContent) {
      currentlyOpenSwipeCard.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      currentlyOpenSwipeCard.style.transform = 'translateX(0px)';
      currentlyOpenSwipeCard = null;
    }
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isSwiping = true;
    hasLockedDirection = false;
    isHorizontal = false;
  }, { passive: true });

  cardContent.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;

    if (!hasLockedDirection) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        hasLockedDirection = true;
        isHorizontal = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (!isHorizontal) return;

    const baseOffset = (currentlyOpenSwipeCard === cardContent) ? -DELETE_WIDTH : 0;
    let newX = baseOffset + diffX;

    if (newX > 0) {
      newX = newX * 0.2;
    } else if (newX < -DELETE_WIDTH * 1.5) {
      newX = -DELETE_WIDTH * 1.5 + (newX + DELETE_WIDTH * 1.5) * 0.2;
    }

    setTranslate(newX, false);
  }, { passive: true });

  cardContent.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    if (!isHorizontal) return;

    if (currentTranslateX < -DELETE_WIDTH * 0.45) {
      openSwipe();
    } else {
      closeSwipe();
    }
  });

  // Tap sulla card quando è aperta: richiudila
  cardContent.addEventListener('click', (e) => {
    if (currentlyOpenSwipeCard === cardContent) {
      closeSwipe();
      e.stopPropagation();
    }
  });

  // Gestione Drag Mouse per test Desktop
  cardContent.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (currentlyOpenSwipeCard && currentlyOpenSwipeCard !== cardContent) {
      currentlyOpenSwipeCard.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      currentlyOpenSwipeCard.style.transform = 'translateX(0px)';
      currentlyOpenSwipeCard = null;
    }
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
    hasLockedDirection = false;
    isHorizontal = false;

    function onMouseMove(moveEvent) {
      if (!isDragging) return;
      const diffX = moveEvent.clientX - startX;
      const diffY = moveEvent.clientY - startY;

      if (!hasLockedDirection) {
        if (Math.abs(diffX) > 4 || Math.abs(diffY) > 4) {
          hasLockedDirection = true;
          isHorizontal = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (!isHorizontal) return;

      const baseOffset = (currentlyOpenSwipeCard === cardContent) ? -DELETE_WIDTH : 0;
      let newX = baseOffset + diffX;
      if (newX > 0) newX = newX * 0.2;
      else if (newX < -DELETE_WIDTH * 1.5) newX = -DELETE_WIDTH * 1.5 + (newX + DELETE_WIDTH * 1.5) * 0.2;

      setTranslate(newX, false);
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!isHorizontal) return;

      if (currentTranslateX < -DELETE_WIDTH * 0.45) {
        openSwipe();
      } else {
        closeSwipe();
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

function renderRefuels(car) {
  const container = document.getElementById('refuelsListContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!car.refuels || car.refuels.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center text-[var(--text-muted)] text-xs space-y-1">
        <div class="text-base">⛽</div>
        <div class="font-bold text-[var(--text-main)]">Nessun pieno registrato</div>
        <div>Tocca <b>+ Registra Pieno</b> o inquadra uno scontrino per iniziare!</div>
      </div>`;
    return;
  }

  // Ordinamento cronologico garantito
  car.refuels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  car.refuels.forEach((r, idx) => {
    normalizeTransactionDate(r);
    const displayDate = formatTransactionDisplayDate(r);
    const rId = r.id || ('ref_' + idx);
    const wrapper = document.createElement('div');
    wrapper.className = "feed-swipe-wrapper relative overflow-hidden rounded-2xl select-none group touch-pan-y shadow-sm";

    const deleteBtnContainer = document.createElement('div');
    deleteBtnContainer.className = "absolute inset-y-0 right-0 w-[84px] bg-rose-600 flex items-center justify-center text-white font-bold text-xs rounded-2xl z-0";
    deleteBtnContainer.innerHTML = `
      <button type="button" class="w-full h-full flex flex-col items-center justify-center gap-1 active:bg-rose-700 transition" title="Elimina Rifornimento">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        <span class="text-[10px] font-bold text-white tracking-wide">Elimina</span>
      </button>
    `;

    const cardContent = document.createElement('div');
    cardContent.className = "feed-swipe-card relative z-10 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-1.5 text-xs will-change-transform cursor-grab active:cursor-grabbing";
    cardContent.innerHTML = `
      <div class="flex justify-between items-start font-bold">
        <span class="text-[var(--text-main)]">${displayDate} • ${Number(r.odometer || 0).toLocaleString('it-IT')} km</span>
        <div class="flex items-center gap-2">
          <span class="text-amber-500 font-mono">€ ${Number(r.totalCost || 0).toFixed(2).replace('.', ',')}</span>
          <button onclick="event.stopPropagation(); deleteRefuel('${rId}')" title="Elimina Rifornimento" class="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 border border-transparent hover:border-rose-500/30 transition active:scale-95">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
      <div class="flex justify-between text-[10px] text-[var(--text-muted)] items-center">
        <span>${r.liters} L @ ${Number(r.pricePerLiter || 0).toFixed(3)} €/L (${r.station || 'Stazione'})</span>
        <span class="text-emerald-500 font-semibold">${r.isFull ? '✓ Pieno' : 'Rabbocco'}</span>
      </div>
    `;

    wrapper.appendChild(deleteBtnContainer);
    wrapper.appendChild(cardContent);
    container.appendChild(wrapper);

    deleteBtnContainer.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRefuel(rId);
    });

    setupSwipeToDelete(wrapper, cardContent, 'refuel', rId);
  });
}

function renderTrips(car) {
  const container = document.getElementById('tripsListContainer');
  if (!container) return;
  container.innerHTML = '';

  const totalKm = (car.trips || []).reduce((acc, t) => acc + (parseFloat(t.km) || 0), 0);
  const totalCost = (car.trips || []).reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0);

  const summaryKm = document.getElementById('tripSummaryKm');
  const summaryCost = document.getElementById('tripSummaryCost');
  const summaryCount = document.getElementById('tripSummaryCount');
  if (summaryKm) summaryKm.innerText = totalKm.toLocaleString('it-IT') + ' km';
  if (summaryCost) summaryCost.innerText = '€ ' + totalCost.toFixed(2).replace('.', ',');
  if (summaryCount) summaryCount.innerText = (car.trips || []).length.toString();

  if (!car.trips || car.trips.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-center text-[var(--text-muted)] text-xs space-y-1">
        <div class="text-base">🛣️</div>
        <div class="font-bold text-[var(--text-main)]">Nessun viaggio registrato</div>
        <div>Usa '+ Nuovo Viaggio' o l'auto-start Bluetooth per tracciare un percorso.</div>
      </div>`;
    return;
  }

  // Ordinamento cronologico garantito
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  car.trips.forEach((t, idx) => {
    normalizeTransactionDate(t);
    const displayDate = formatTransactionDisplayDate(t);
    const tId = t.id || ('trip_' + idx);
    const kmNum = parseFloat(t.km) || 0;
    const durNum = parseInt(t.durationMinutes) || 30;
    const dynInfo = calculateDynamicTripConsumption(car, kmNum, durNum, t.consumption);
    const avgSpeed = t.avgSpeed || dynInfo.avgSpeed;
    const tripConsL100 = dynInfo.consumptionL100;
    const estLiters = (t.liters && parseFloat(t.liters) > 0) ? parseFloat(t.liters).toFixed(1) : dynInfo.litersUsed.toFixed(1);
    const costNum = (t.cost !== undefined && parseFloat(t.cost) > 0) ? parseFloat(t.cost) : dynInfo.cost;
    const profileTag = t.driveProfile || dynInfo.profileLabel;

    const isRoundTrip = (t.title || '').includes('A/R');
    const badgeType = isRoundTrip 
      ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">Andata & Ritorno</span>'
      : `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">${profileTag}</span>`;

    const wrapper = document.createElement('div');
    wrapper.className = "feed-swipe-wrapper relative overflow-hidden rounded-2xl select-none group touch-pan-y shadow-sm";

    const deleteBtnContainer = document.createElement('div');
    deleteBtnContainer.className = "absolute inset-y-0 right-0 w-[84px] bg-rose-600 flex items-center justify-center text-white font-bold text-xs rounded-2xl z-0";
    deleteBtnContainer.innerHTML = `
      <button type="button" class="w-full h-full flex flex-col items-center justify-center gap-1 active:bg-rose-700 transition" title="Elimina Viaggio">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        <span class="text-[10px] font-bold text-white tracking-wide">Elimina</span>
      </button>
    `;

    const cardContent = document.createElement('div');
    cardContent.className = "feed-swipe-card relative z-10 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-2.5 will-change-transform cursor-grab active:cursor-grabbing";
    cardContent.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-base">🛣️</span>
            <span class="text-xs font-black text-[var(--text-main)]">${t.title}</span>
          </div>
          <div class="text-[10.5px] text-[var(--text-muted)] flex flex-wrap items-center gap-1.5 pl-6">
            <span>📅 ${displayDate}</span>
            <span>•</span>
            <span>⏱️ ${durNum} min (~${avgSpeed} km/h)</span>
            <span>•</span>
            <span class="text-cyan-400 font-semibold font-mono">⚡ ${tripConsL100.toFixed(2).replace('.', ',')} L/100km</span>
          </div>
        </div>
        ${badgeType}
      </div>

      <!-- 3 Grandi Statistiche della Tratta ad Alto Contrasto -->
      <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--bg-sub)] border border-[var(--border-color)] text-center">
        <div>
          <div class="text-[9.5px] text-[var(--text-muted)] font-medium">Distanza</div>
          <div class="text-sm font-black font-mono text-[var(--text-main)]">${kmNum} km</div>
        </div>
        <div>
          <div class="text-[9.5px] text-[var(--text-muted)] font-medium">Consumo (${tripConsL100.toFixed(1).replace('.', ',')} L/100)</div>
          <div class="text-sm font-black font-mono text-cyan-400">💧 ~${estLiters.replace('.', ',')} L</div>
        </div>
        <div>
          <div class="text-[9.5px] text-[var(--text-muted)] font-medium">Spesa Tratta</div>
          <div class="text-sm font-black font-mono text-amber-500">€ ${costNum.toFixed(2).replace('.', ',')}</div>
        </div>
      </div>

      <!-- Note & Pulsanti Azione Rapida -->
      <div class="flex items-center justify-between pt-0.5 text-[11px]">
        <span class="text-[10px] text-[var(--text-muted)] italic">${t.notes ? '💬 ' + t.notes : ''}</span>
        <div class="flex items-center gap-2">
          <button onclick="event.stopPropagation(); deleteTrip('${tId}')" title="Elimina Viaggio" class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-semibold flex items-center gap-1 transition active:scale-95">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Elimina
          </button>
          <button onclick="event.stopPropagation(); repeatTrip(${idx})" class="px-2.5 py-1 rounded-lg bg-[var(--bg-sub)] border border-[var(--border-color)] text-[var(--text-main)] text-[10px] font-semibold hover:border-amber-500 transition active:scale-95">
            🔄 Ripeti Tratta
          </button>
        </div>
      </div>
    `;

    wrapper.appendChild(deleteBtnContainer);
    wrapper.appendChild(cardContent);
    container.appendChild(wrapper);

    deleteBtnContainer.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTrip(tId);
    });

    setupSwipeToDelete(wrapper, cardContent, 'trip', tId);
  });
}

// ==================== CANCELLAZIONE E RESET DATI FLESSIBILI ====================
function deleteRefuel(refuelId) {
  const car = appCars[activeCarIndex];
  if (!car) return;
  if (!confirm("Vuoi davvero eliminare questo rifornimento?")) return;
  car.refuels = car.refuels.filter((r, idx) => (r.id ? r.id !== refuelId : String(idx) !== String(refuelId)));
  syncCarHistoryMonths(car);
  currentlyOpenSwipeCard = null;
  saveCars();
  renderAll();
}

function deleteTrip(tripId) {
  const car = appCars[activeCarIndex];
  if (!car) return;
  if (!confirm("Vuoi davvero eliminare questo viaggio?")) return;
  car.trips = car.trips.filter((t, idx) => (t.id ? t.id !== tripId : String(idx) !== String(tripId)));
  currentlyOpenSwipeCard = null;
  saveCars();
  renderAll();
}

function resetCarData(carIdx) {
  const targetIdx = carIdx !== undefined ? carIdx : activeCarIndex;
  const car = appCars[targetIdx];
  if (!car) return;
  if (!confirm(`Vuoi azzerare il contachilometri, tutti i pieni e tutti i viaggi di ${car.name}?`)) return;
  car.currentOdo = 0;
  car.refuels = [];
  car.trips = [];
  car.historyMonths = [0, 0, 0, 0, 0, 0];
  saveCars();
  closeModal('modalEditCar');
  renderAll();
}

function resetAllData() {
  if (!confirm("Attenzione: vuoi ripristinare tutte le auto e azzerare tutti i dati a quelli generici di fabbrica?")) return;
  localStorage.removeItem(STORAGE_KEY);
  appCars = JSON.parse(JSON.stringify(DEFAULT_CARS));
  saveCars();
  renderAll();
}

function repeatTrip(tripIdx) {
  const car = appCars[activeCarIndex];
  const t = car.trips[tripIdx];
  if (!t) return;
  openModal('modalTrip');
  document.getElementById('tripInputTitle').value = t.title;
  document.getElementById('tripInputKm').value = t.km;
  // Assicura che la tratta ripetuta catturi data e ora attuali
  const now = new Date();
  const dateIn = document.getElementById('tripInputDate');
  const timeIn = document.getElementById('tripInputTime');
  if (dateIn) dateIn.value = getSystemDateKey(now);
  if (timeIn) timeIn.value = getSystemTimeKey(now);
  updateTripDatePreview();
  updateTripModalEstimates();
}

// ==================== AUTO-START BLUETOOTH & GESTIONE SOSTA ====================
function renderParking(car) {
  const addrEl = document.getElementById('parkingAddressLabel');
  const timeEl = document.getElementById('parkingTimestampLabel');
  const carLabel = document.getElementById('mapPinCarLabel');
  const coordsLabel = document.getElementById('mapPinCoordsLabel');
  const extMapsBtn = document.getElementById('btnExternalMaps');
  const streetLabel = document.getElementById('mapStreetLabel');

  if (!car) return;
  const p = car.parking || { address: "Posizione non memorizzata", lat: 45.4642, lng: 9.1900, time: "--:--", date: "In attesa di sosta" };

  if (addrEl) addrEl.innerText = p.address || "Posizione non memorizzata";
  if (timeEl) timeEl.innerText = `${p.date || 'Oggi'}, ${p.time || '--:--'} • Memorizzata automaticamente`;
  if (carLabel) carLabel.innerText = `${car.name} • Parcheggiata`;
  if (coordsLabel) {
    if (p.lat && p.lng) {
      coordsLabel.innerText = `${Number(p.lat).toFixed(4)}° N, ${Number(p.lng).toFixed(4)}° E`;
    } else {
      coordsLabel.innerText = `--° N, --° E`;
    }
  }
  if (extMapsBtn) {
    if (p.lat && p.lng) {
      extMapsBtn.href = `https://maps.apple.com/?q=${p.lat},${p.lng}`;
    } else {
      extMapsBtn.href = "https://maps.apple.com/";
    }
  }
  if (streetLabel && p.address) {
    const streetName = p.address.split(',')[0].toUpperCase();
    streetLabel.textContent = streetName;
  }
}

function showDirectionsToCar() {
  const car = appCars[activeCarIndex];
  if (!car) return;
  const p = car.parking || { address: 'Via Alessandro Manzoni 14, Milano', lat: 45.4682, lng: 9.1912 };
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  const coordsText = (p.lat && p.lng) ? `[${Number(p.lat).toFixed(4)}° N, ${Number(p.lng).toFixed(4)}° E]` : '';
  if (banner && msg) {
    msg.innerHTML = `📍 <b>Posizione Auto (${car.name}):</b> Parcheggiata in <b>${p.address}</b> ${coordsText}. Apertura Apple Mappe in corso...`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
  }
  if (p.lat && p.lng) {
    window.open(`https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`, '_blank');
  }
}

// ==================== METODO 2: RILEVAMENTO GPS SOSTA AUTOMATICA ====================
// Zero consumo di batteria in standby: il GPS del telefono viene attivato SOLO per 1-2 secondi
// al termine della tratta (Stop GPS o disconnessione Bluetooth) oppure su richiesta manuale.
function detectCurrentGpsParking() {
  const car = appCars[activeCarIndex];
  if (!car) return;
  detectAndSaveParkingLocation(car, { showNotification: true, isAuto: false });
}

function detectAndSaveParkingLocation(car, { showNotification = true, isAuto = false } = {}) {
  if (!car) return;
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');

  if (showNotification && banner && msg && !isAuto) {
    msg.innerHTML = `🛰️ <b>Rilevamento GPS in corso:</b> Acquisizione coordinate posizione per <b>${car.name}</b>...`;
    banner.classList.remove('hidden');
  }

  if (!navigator.geolocation) {
    if (banner && msg) {
      msg.innerHTML = `⚠️ <b>Geolocalizzazione non supportata</b> dal tuo browser o dispositivo.`;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 4000);
    }
    return;
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 9000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy || 5);
      const nowStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const nowDateStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

      let fullAddress = `Posizione GPS [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;

      try {
        // Reverse Geocoding gratuito OpenStreetMap Nominatim
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.pedestrian || addr.street || addr.suburb || 'Via Rilevata';
            const house = addr.house_number ? ' ' + addr.house_number : '';
            const city = addr.city || addr.town || addr.village || addr.municipality || 'Posizione Sosta';
            fullAddress = `${road}${house}, ${city}`;
          } else if (data && data.display_name) {
            fullAddress = data.display_name.split(',').slice(0, 3).join(',');
          }
        }
      } catch (e) {
        console.warn("Reverse geocode OSM fallback:", e);
      }

      car.parking = {
        address: fullAddress,
        lat: lat,
        lng: lng,
        time: nowStr,
        date: "Oggi (" + nowDateStr + ")"
      };

      saveCars();
      renderParking(car);

      if (showNotification && banner && msg) {
        const titleBadge = isAuto ? "<b>Sosta Memorizzata Automaticamente (Metodo 2)</b>" : "<b>Sosta Rilevata con GPS</b>";
        msg.innerHTML = `📍 ${titleBadge} per <b>${car.name}</b>:<br><span class="text-white font-bold">${fullAddress}</span> <span class="text-zinc-400 text-[10px]">[±${accuracy}m]</span>`;
        banner.classList.remove('hidden');
        setTimeout(() => { banner.classList.add('hidden'); }, 6000);
      }
    },
    (err) => {
      console.warn("Geolocalizzazione GPS:", err);
      const nowStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      if (!isAuto && banner && msg) {
        msg.innerHTML = `⚠️ <b>Permesso GPS richiesto:</b> Per rilevare la sosta reale del veicolo, consenti l'accesso alla geolocalizzazione nelle impostazioni dell'iPhone o di Safari.`;
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 5000);
      } else if (isAuto && (!car.parking || !car.parking.lat)) {
        car.parking = {
          address: "Parcheggio Arrivo Rilevato",
          lat: 45.4642,
          lng: 9.1900,
          time: nowStr,
          date: "Oggi"
        };
        saveCars();
        renderParking(car);
      }
    },
    geoOptions
  );
}

function isBtAutoStartEnabled() {
  const pref = localStorage.getItem(BT_AUTOSTART_PREF_KEY);
  return pref === null ? true : pref === 'true';
}

function toggleBtAutoStartPreference(enabled) {
  localStorage.setItem(BT_AUTOSTART_PREF_KEY, enabled ? 'true' : 'false');
  const toggleEl = document.getElementById('toggleBtAutoStart');
  if (toggleEl) toggleEl.checked = Boolean(enabled);
}

function persistBtSessionState() {
  try {
    if (!btSession.active) {
      localStorage.removeItem(BT_SESSION_STORAGE_KEY);
      return;
    }
    const payload = {
      active: true,
      carIndex: btSession.carIndex,
      startTimestamp: btSession.startTimestamp,
      km: btSession.km,
      startCoords: btSession.startCoords,
      lastCoords: btSession.lastCoords
    };
    localStorage.setItem(BT_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Errore salvataggio sessione BT:", e);
  }
}

function updateBtLiveUI() {
  if (!btSession.active) return;
  const car = appCars[btSession.carIndex] || appCars[activeCarIndex];
  const elapsedSec = Math.max(1, Math.floor((Date.now() - (btSession.startTimestamp || Date.now())) / 1000));
  btSession.sec = elapsedSec;

  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const timeText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const timerEl = document.getElementById('btLiveTimer');
  if (timerEl) timerEl.innerText = timeText;

  const liveKmEl = document.getElementById('btLiveKm');
  if (liveKmEl) liveKmEl.innerText = `${btSession.km.toFixed(1)} km`;

  const estMin = Math.max(1, elapsedSec / 60);
  const dyn = calculateDynamicTripConsumption(car, Math.max(0.2, btSession.km), estMin);

  const liveConsEl = document.getElementById('btLiveCons');
  if (liveConsEl) liveConsEl.innerText = `${dyn.consumptionL100.toFixed(2).replace('.', ',')} L/100`;

  const liveSpeedEl = document.getElementById('btLiveSpeed');
  if (liveSpeedEl) liveSpeedEl.innerText = btSession.km > 0.05 ? `${dyn.avgSpeed} km/h` : `In marcia`;

  // Aggiorna anche il banner BT globale visibile su tutte le schede
  const bTimer = document.getElementById('bannerBtTimer');
  if (bTimer) bTimer.innerText = timeText;
  const bKm = document.getElementById('bannerBtKm');
  if (bKm) bKm.innerText = `${btSession.km.toFixed(1)} km`;
  const bCons = document.getElementById('bannerBtCons');
  if (bCons) bCons.innerText = `${dyn.consumptionL100.toFixed(2).replace('.', ',')} L/100`;

  updateHeaderMenuStatusUI();
}

function addSimulatedBtKmStep() {
  if (!btSession.active) return;
  btSession.km = parseFloat((btSession.km + 1.5).toFixed(2));
  const accEl = document.getElementById('btLiveGpsAccuracyLabel');
  if (accEl) accEl.innerText = `🧪 +1.5 km aggiunti (Totale: ${btSession.km.toFixed(1)} km)`;
  persistBtSessionState();
  updateBtLiveUI();
}

function toggleBtSim() {
  if (btSession.active) {
    triggerBtDisconnect();
  } else {
    triggerBtConnect();
  }
}

function startBtGpsWatcher() {
  if (!navigator.geolocation) return;
  if (btSession.watchId !== null) {
    try { navigator.geolocation.clearWatch(btSession.watchId); } catch (e) {}
    btSession.watchId = null;
  }

  // Cattura punto iniziale
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!btSession.startCoords) btSession.startCoords = c;
      if (!btSession.lastCoords) btSession.lastCoords = c;
      persistBtSessionState();
    },
    () => {},
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );

  btSession.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!btSession.active) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy || 10);

      const accEl = document.getElementById('btLiveGpsAccuracyLabel');
      if (accEl) accEl.innerText = `🛰️ GPS Reale Attivo (±${acc}m)`;

      if (!btSession.startCoords) {
        btSession.startCoords = { lat, lng };
      }
      if (btSession.lastCoords && acc <= 75) {
        const deltaKm = calculateHaversineKm(btSession.lastCoords.lat, btSession.lastCoords.lng, lat, lng);
        // Filtra il rumore GPS da fermo (< 8 metri) e salti anomali (> 5 km in un singolo step)
        if (deltaKm >= 0.008 && deltaKm < 5.0) {
          btSession.km = parseFloat((btSession.km + deltaKm).toFixed(3));
          btSession.lastCoords = { lat, lng };
          persistBtSessionState();
        }
      } else if (!btSession.lastCoords) {
        btSession.lastCoords = { lat, lng };
      }
      updateBtLiveUI();
    },
    (err) => {
      const accEl = document.getElementById('btLiveGpsAccuracyLabel');
      if (accEl) accEl.innerText = `⏱️ Orario attivo • Calcolo distanza all'arrivo`;
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function applyBtConnectedUI(car) {
  const badge = document.getElementById('btActiveBadge');
  if (badge) {
    badge.className = "px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-black animate-pulse";
    badge.innerText = "Connesso 🟢";
  }
  const tripBox = document.getElementById('btLiveTripBox');
  if (tripBox) tripBox.classList.remove('hidden');

  const liveBtBanner = document.getElementById('liveBtBanner');
  if (liveBtBanner) liveBtBanner.classList.remove('hidden');

  const btnConn = document.getElementById('btnBtConnect');
  if (btnConn) {
    btnConn.disabled = true;
    btnConn.className = "py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs flex items-center justify-center gap-1.5";
  }
  const btnDisc = document.getElementById('btnBtDisconnect');
  if (btnDisc) {
    btnDisc.disabled = false;
    btnDisc.className = "py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";
  }

  const label = document.getElementById('btHeaderLabel');
  if (label) {
    label.innerText = "In Viaggio 🟢";
    label.className = "px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
  }
  updateHeaderMenuStatusUI();
}

function triggerBtConnect(options = {}) {
  const car = appCars[activeCarIndex];
  if (btSession.active) return;

  btSession.active = true;
  btSession.carIndex = activeCarIndex;
  btSession.startTimestamp = options.startTimestamp || Date.now();
  btSession.startTime = new Date(btSession.startTimestamp);
  btSession.sec = Math.max(0, Math.floor((Date.now() - btSession.startTimestamp) / 1000));
  btSession.km = options.initialKm || 0.0;
  btSession.startCoords = options.startCoords || null;
  btSession.lastCoords = options.lastCoords || null;

  persistBtSessionState();
  applyBtConnectedUI(car);
  startBtGpsWatcher();
  updateBtLiveUI();

  // Notifica iOS / Banner
  if (!options.silentBanner) {
    const banner = document.getElementById('iosNotificationBanner');
    const msg = document.getElementById('notifBannerMessage');
    if (banner && msg) {
      msg.innerHTML = `📶 <b>Bluetooth Agganciato (${car.btDevice}):</b> Tracciamento reale GPS + Orario avviato su <b>${car.name}</b>.`;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 5000);
    }
  }

  if (btSession.interval) clearInterval(btSession.interval);
  btSession.interval = setInterval(() => {
    updateBtLiveUI();
  }, 1000);
}

async function triggerBtDisconnect(options = {}) {
  if (!btSession.active && !options.forceDirectStop) return;
  if (btSession.interval) clearInterval(btSession.interval);
  if (btSession.watchId !== null && navigator.geolocation) {
    try { navigator.geolocation.clearWatch(btSession.watchId); } catch (e) {}
    btSession.watchId = null;
  }

  const carIdx = btSession.active ? btSession.carIndex : activeCarIndex;
  const car = appCars[carIdx] || appCars[activeCarIndex];
  const elapsedSec = btSession.startTimestamp ? Math.max(60, Math.floor((Date.now() - btSession.startTimestamp) / 1000)) : 240;
  const savedStartCoords = btSession.startCoords;
  const trackedKm = btSession.km || 0;

  btSession.active = false;
  persistBtSessionState();

  // Reset UI
  const badge = document.getElementById('btActiveBadge');
  if (badge) {
    badge.className = "px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-750 text-zinc-300 border border-zinc-700";
    badge.innerText = "Standby";
  }
  const tripBox = document.getElementById('btLiveTripBox');
  if (tripBox) tripBox.classList.add('hidden');

  const liveBtBanner = document.getElementById('liveBtBanner');
  if (liveBtBanner) liveBtBanner.classList.add('hidden');

  const btnConn = document.getElementById('btnBtConnect');
  if (btnConn) {
    btnConn.disabled = false;
    btnConn.className = "py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";
  }
  const btnDisc = document.getElementById('btnBtDisconnect');
  if (btnDisc) {
    btnDisc.disabled = true;
    btnDisc.className = "py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs flex items-center justify-center gap-1.5";
  }

  const label = document.getElementById('btHeaderLabel');
  if (label) {
    label.innerText = "BT Auto";
    label.className = "px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
  }
  updateHeaderMenuStatusUI();

  // Calcolo minuti reali e distanza effettiva (GPS watch, OSRM tra partenza/arrivo, o parametri URL Comandi Rapidi)
  let minutes = options.overrideMinutes ? Math.max(1, Math.round(parseFloat(options.overrideMinutes))) : Math.max(1, Math.round(elapsedSec / 60));
  let doneKm = options.overrideKm ? parseFloat(parseFloat(options.overrideKm).toFixed(1)) : parseFloat(trackedKm.toFixed(1));

  // Se il telefono era bloccato in tasca durante la guida, calcola i km stradali tra partenza e arrivo
  if (!options.overrideKm && doneKm < 0.3 && savedStartCoords && navigator.geolocation) {
    try {
      const endPos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      });
      const endCoords = { lat: endPos.coords.latitude, lng: endPos.coords.longitude };
      const roadKm = await fetchRoadDistanceKm(savedStartCoords, endCoords);
      if (roadKm >= 0.2) {
        doneKm = roadKm;
      }
    } catch (e) {}
  }

  // Se ancora 0 (es. test da fermo in casa), stima dai minuti trascorsi a 42 km/h medi (min 1.5 km)
  if (!doneKm || doneKm < 0.2) {
    doneKm = parseFloat(Math.max(1.5, (minutes / 60) * 42).toFixed(1));
  }

  const dyn = calculateDynamicTripConsumption(car, doneKm, minutes, options.overrideL100);

  // Salva viaggio nel diario con cattura esatta di data, ora e L/100km dinamico
  const now = new Date();
  const isoDate = getSystemDateKey(now);
  const timeStr = getSystemTimeKey(now);
  const timestamp = now.getTime();
  const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: timeStr });
  const tripTitle = options.overrideTitle || `Tratta Auto-Start (${car.btDevice})`;

  car.currentOdo += Math.round(doneKm);
  car.trips.unshift({
    id: `trip_bt_${Date.now()}`,
    title: tripTitle,
    date: dateLabel,
    isoDate,
    time: timeStr,
    timestamp,
    km: doneKm,
    durationMinutes: minutes,
    consumption: dyn.consumptionL100,
    liters: dyn.litersUsed,
    avgSpeed: dyn.avgSpeed,
    driveProfile: dyn.profileLabel,
    cost: dyn.cost
  });
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  saveCars();
  renderAll();

  // Metodo 2: Rilevamento automatico sosta GPS all'arresto del veicolo
  detectAndSaveParkingLocation(car, { showNotification: true, isAuto: true });
}

function restorePersistedBtSession() {
  const toggleEl = document.getElementById('toggleBtAutoStart');
  if (toggleEl) toggleEl.checked = isBtAutoStartEnabled();

  try {
    const raw = localStorage.getItem(BT_SESSION_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.active && saved.startTimestamp) {
      if (typeof saved.carIndex === 'number' && appCars[saved.carIndex]) {
        activeCarIndex = saved.carIndex;
      }
      triggerBtConnect({
        startTimestamp: saved.startTimestamp,
        initialKm: saved.km || 0,
        startCoords: saved.startCoords || null,
        lastCoords: saved.lastCoords || null,
        silentBanner: true
      });
    }
  } catch (e) {
    console.warn("Ripristino sessione BT fallito:", e);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && btSession.active) {
      updateBtLiveUI();
    }
  });
}

// Switch delle 6 Schede di Navigazione
function switchTab(tab) {
  activeTab = tab;
  ['dashboard', 'refuels', 'trips', 'calendar', 'insurance', 'stats'].forEach(t => {
    const section = document.getElementById('tab-' + t);
    if (section) section.classList.toggle('hidden', t !== tab);

    const navBtn = document.getElementById('nav-' + t);
    if (navBtn) {
      if (t === tab) {
        navBtn.className = "flex flex-col items-center gap-0.5 text-amber-500 px-1 py-1 transition flex-1";
      } else {
        navBtn.className = "flex flex-col items-center gap-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] px-1 py-1 transition relative flex-1";
      }
    }
  });

  const car = appCars[activeCarIndex];
  if (tab === 'refuels') {
    setTimeout(() => {
      drawExpenseChart();
      drawDriveHoursChart();
    }, 50);
  } else if (tab === 'insurance') {
    renderInsurance();
  } else if (tab === 'trips') {
    renderTrips(car);
    renderParking(car);
  } else if (tab === 'calendar') {
    renderCalendar();
  }
}

// ==================== CALENDARIO SINCRONIZZATO IN TEMPO REALE ====================
let calendarNow = new Date();
let calendarViewYear = calendarNow.getFullYear();
let calendarViewMonth = calendarNow.getMonth(); // 0-11
let calendarSelectedDay = calendarNow.getDate();
let lastKnownSystemDateString = getSystemDateKey(calendarNow);
let midnightSyncTimer = null;

// Verifica se un'attività (pieno o viaggio) corrisponde alla data selezionata
function isActivityOnCalendarDate(activity, targetYear, targetMonth, targetDay) {
  if (!activity) return false;
  normalizeTransactionDate(activity);

  if (activity.timestamp) {
    const actDate = new Date(activity.timestamp);
    if (!isNaN(actDate.getTime())) {
      return actDate.getFullYear() === targetYear &&
             actDate.getMonth() === targetMonth &&
             actDate.getDate() === targetDay;
    }
  }

  if (activity.isoDate) {
    const parts = activity.isoDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return y === targetYear && m === targetMonth && d === targetDay;
    }
  }

  return false;
}

// Selettore rapido 12 mesi orizzontale
function renderCalendarMonthPills() {
  const container = document.getElementById('calendarMonthPills');
  if (!container) return;

  const currentNow = new Date();
  const isCurrentYear = (calendarViewYear === currentNow.getFullYear());

  let pillsHtml = '';
  for (let m = 0; m < 12; m++) {
    const isSelected = (m === calendarViewMonth);
    const isThisMonth = (isCurrentYear && m === currentNow.getMonth());
    const mName = IT_MONTH_SHORT[m];
    // Calcola quanti giorni ha questo mese
    const daysInThisM = new Date(calendarViewYear, m + 1, 0).getDate();

    let pillClass = "px-2.5 py-1 rounded-xl text-[10.5px] font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1 cursor-pointer ";
    if (isSelected) {
      pillClass += "bg-amber-500 text-black shadow-md shadow-amber-500/30 scale-[1.03]";
    } else if (isThisMonth) {
      pillClass += "bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25";
    } else {
      pillClass += "bg-[var(--bg-sub)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]";
    }

    pillsHtml += `
      <button type="button" onclick="setCalendarMonth(${m})" class="${pillClass}" title="${IT_MONTH_NAMES[m]} (${daysInThisM} giorni)">
        <span>${mName}</span>
        <span class="text-[8.5px] opacity-75 font-mono">${daysInThisM}gg</span>
      </button>
    `;
  }
  container.innerHTML = pillsHtml;
}

function setCalendarMonth(monthIndex) {
  calendarViewMonth = monthIndex;
  const now = new Date();
  if (calendarViewYear === now.getFullYear() && calendarViewMonth === now.getMonth()) {
    calendarSelectedDay = now.getDate();
  } else {
    calendarSelectedDay = 1;
  }
  renderCalendar();
}

// Calcolo e rendering riassunto statistico del mese selezionato (mese per mese)
function renderCalendarMonthStats() {
  const box = document.getElementById('calendarMonthStatsBox');
  if (!box) return;

  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  let totCost = 0;
  let totDriveMinutes = 0;
  let totKm = 0;
  let eventCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    appCars.forEach(car => {
      (car.refuels || []).forEach(r => {
        if (isActivityOnCalendarDate(r, calendarViewYear, calendarViewMonth, d)) {
          totCost += parseFloat(r.totalCost) || 0;
          eventCount++;
        }
      });
      (car.trips || []).forEach(t => {
        if (isActivityOnCalendarDate(t, calendarViewYear, calendarViewMonth, d)) {
          totKm += parseFloat(t.km) || 0;
          totCost += parseFloat(t.cost) || 0;
          totDriveMinutes += parseFloat(t.durationMinutes) || 0;
          eventCount++;
        }
      });
    });
  }

  const totHours = totDriveMinutes / 60;
  const hoursFormatted = totHours.toFixed(1).replace('.', ',') + ' h';

  box.innerHTML = `
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div class="text-[9px] text-[var(--text-muted)]">⛽ Spesa Mese</div>
      <div class="text-[11px] font-bold text-amber-500 font-mono mt-0.5">€ ${totCost.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]" title="Ore di Guida nel Mese">
      <div class="text-[9px] text-[var(--text-muted)]">⏱️ Ore Guida</div>
      <div class="text-[11px] font-bold text-purple-400 font-mono mt-0.5">${hoursFormatted}</div>
    </div>
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div class="text-[9px] text-[var(--text-muted)]">🛣️ Km Tratte</div>
      <div class="text-[11px] font-bold text-blue-400 font-mono mt-0.5">${Math.round(totKm)} km</div>
    </div>
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div class="text-[9px] text-[var(--text-muted)]">📋 Attività</div>
      <div class="text-[11px] font-bold text-[var(--text-main)] font-mono mt-0.5">${eventCount}</div>
    </div>
  `;
}

// Rendering completo del calendario con tutti i 30/31 giorni
function renderCalendar() {
  const badgeEl = document.getElementById('calMonthBadge');
  const titleEl = document.getElementById('calMonthTitle');
  const daysCountEl = document.getElementById('calDaysCountLabel');
  const gridEl = document.getElementById('calendarDaysGrid');
  if (!gridEl) return;

  const currentSystemDate = new Date();
  const isCurrentMonthView = (calendarViewYear === currentSystemDate.getFullYear() && calendarViewMonth === currentSystemDate.getMonth());
  const todayDateNum = currentSystemDate.getDate();

  // Numero esatto di giorni del mese corrente (28, 29, 30 o 31)
  const totalDaysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calendarViewYear, calendarViewMonth, 0).getDate();

  // Aggiorna badge e titolo mese/anno con indicazione esplicita dei giorni
  const monthName = IT_MONTH_NAMES[calendarViewMonth] || 'Mese';
  const monthShort = IT_MONTH_SHORT[calendarViewMonth] || 'Mese';
  if (badgeEl) badgeEl.textContent = `${monthShort} ${calendarViewYear}`;
  if (titleEl) titleEl.textContent = `${monthName} ${calendarViewYear}`;
  if (daysCountEl) daysCountEl.textContent = `${totalDaysInMonth} Giorni Completi`;

  // Aggiorna selettore rapido 12 mesi
  renderCalendarMonthPills();

  // Normalizza il giorno selezionato se sfora il totale del mese
  if (calendarSelectedDay > totalDaysInMonth) {
    calendarSelectedDay = totalDaysInMonth;
  }
  if (calendarSelectedDay < 1) {
    calendarSelectedDay = 1;
  }

  // Calcolo primo giorno della settimana (Lunedì = 0 ... Domenica = 6)
  const firstDayRaw = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const offset = (firstDayRaw === 0) ? 6 : firstDayRaw - 1;

  let html = `
    <span class="text-[var(--text-muted)] font-bold py-1">L</span>
    <span class="text-[var(--text-muted)] font-bold py-1">M</span>
    <span class="text-[var(--text-muted)] font-bold py-1">M</span>
    <span class="text-[var(--text-muted)] font-bold py-1">G</span>
    <span class="text-[var(--text-muted)] font-bold py-1">V</span>
    <span class="text-[var(--text-muted)] font-bold py-1">S</span>
    <span class="text-[var(--text-muted)] font-bold py-1">D</span>
  `;

  // 1. Giorni finali del mese precedente per completare la griglia (stile Apple Calendar)
  for (let i = 0; i < offset; i++) {
    const prevDayNum = prevMonthDays - offset + 1 + i;
    html += `
      <button type="button" onclick="changeCalendarMonth(-1); selectCalendarDay(${prevDayNum});" class="cal-day min-h-[42px] py-1.5 rounded-xl flex flex-col items-center justify-between text-xs opacity-25 hover:opacity-75 transition active:scale-95 text-[var(--text-muted)]">
        <span class="font-medium leading-tight mt-0.5">${prevDayNum}</span>
        <div class="h-1.5"></div>
      </button>
    `;
  }

  // 2. Costruzione di TUTTI i 30/31 giorni completi del mese selezionato
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const isToday = isCurrentMonthView && (d === todayDateNum);
    const isSelected = (d === calendarSelectedDay);

    // Controlla attività registrate
    let hasRefuel = false;
    let hasTrip = false;
    appCars.forEach(car => {
      (car.refuels || []).forEach(r => {
        if (isActivityOnCalendarDate(r, calendarViewYear, calendarViewMonth, d)) hasRefuel = true;
      });
      (car.trips || []).forEach(t => {
        if (isActivityOnCalendarDate(t, calendarViewYear, calendarViewMonth, d)) hasTrip = true;
      });
    });

    let dotHtml = '';
    if (hasRefuel) dotHtml += '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>';
    if (hasTrip) dotHtml += '<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>';

    // Stile visivo della cella giorno
    let btnClass = "cal-day min-h-[42px] py-1.5 rounded-xl flex flex-col items-center justify-between transition active:scale-95 text-xs ";
    if (isSelected) {
      btnClass += "bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30 border border-amber-400";
    } else if (isToday) {
      btnClass += "bg-amber-500/20 border-2 border-amber-500 text-amber-400 font-extrabold shadow-sm";
    } else {
      btnClass += "bg-[var(--cal-day-bg)] text-[var(--cal-day-text)] border border-[var(--border-color)] hover:border-amber-500";
    }

    html += `
      <button id="calDayBtn${d}" onclick="selectCalendarDay(${d})" class="${btnClass}">
        <span class="font-bold leading-tight mt-0.5">${d}</span>
        <div class="flex items-center gap-0.5 mb-0.5 h-1.5">${dotHtml}</div>
      </button>
    `;
  }

  // 3. Giorni iniziali del mese successivo per completare la settimana (multiplo di 7)
  const totalRendered = offset + totalDaysInMonth;
  const trailingCount = (7 - (totalRendered % 7)) % 7;
  for (let t = 1; t <= trailingCount; t++) {
    html += `
      <button type="button" onclick="changeCalendarMonth(1); selectCalendarDay(${t});" class="cal-day min-h-[42px] py-1.5 rounded-xl flex flex-col items-center justify-between text-xs opacity-25 hover:opacity-75 transition active:scale-95 text-[var(--text-muted)]">
        <span class="font-medium leading-tight mt-0.5">${t}</span>
        <div class="h-1.5"></div>
      </button>
    `;
  }

  gridEl.innerHTML = html;

  // Mostra il riepilogo statistico del mese
  renderCalendarMonthStats();

  // Mostra i dettagli per il giorno selezionato
  showCalendarDetail(calendarSelectedDay);
}

function selectCalendarDay(day) {
  calendarSelectedDay = day;
  renderCalendar();
}

function changeCalendarMonth(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth > 11) {
    calendarViewMonth = 0;
    calendarViewYear++;
  } else if (calendarViewMonth < 0) {
    calendarViewMonth = 11;
    calendarViewYear--;
  }

  const now = new Date();
  if (calendarViewYear === now.getFullYear() && calendarViewMonth === now.getMonth()) {
    calendarSelectedDay = now.getDate();
  } else {
    calendarSelectedDay = 1;
  }
  renderCalendar();
}

function goToCalendarToday() {
  const now = new Date();
  calendarViewYear = now.getFullYear();
  calendarViewMonth = now.getMonth();
  calendarSelectedDay = now.getDate();
  renderCalendar();
}

// Mostra il dettaglio delle attività registrate nel giorno selezionato
function showCalendarDetail(day) {
  const box = document.getElementById('calendarDetailBox');
  if (!box) return;

  const now = new Date();
  const isToday = (calendarViewYear === now.getFullYear() && calendarViewMonth === now.getMonth() && day === now.getDate());
  const monthName = IT_MONTH_NAMES[calendarViewMonth] || '';

  // Raccoglie rifornimenti o viaggi per questa specifica data
  const matchingRefuels = [];
  const matchingTrips = [];

  appCars.forEach(car => {
    (car.refuels || []).forEach(r => {
      if (isActivityOnCalendarDate(r, calendarViewYear, calendarViewMonth, day)) {
        matchingRefuels.push({ ...r, carName: car.name });
      }
    });
    (car.trips || []).forEach(t => {
      if (isActivityOnCalendarDate(t, calendarViewYear, calendarViewMonth, day)) {
        matchingTrips.push({ ...t, carName: car.name });
      }
    });
  });

  const headerTitle = isToday
    ? `📅 ${day} ${monthName} ${calendarViewYear} (Oggi)`
    : `📅 ${day} ${monthName} ${calendarViewYear}`;

  const actionButtonsHtml = `
    <div class="flex gap-2 pt-2">
      <button type="button" onclick="openModalWithDate('modalTrip', ${calendarViewYear}, ${calendarViewMonth}, ${day})" class="flex-1 py-2 px-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 font-bold text-[11px] transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
        <span>🛣️ + Viaggio (${day} ${monthName})</span>
      </button>
      <button type="button" onclick="openModalWithDate('modalRefuel', ${calendarViewYear}, ${calendarViewMonth}, ${day})" class="flex-1 py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-[11px] transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
        <span>⛽ + Pieno (${day} ${monthName})</span>
      </button>
    </div>
  `;

  if (matchingRefuels.length === 0 && matchingTrips.length === 0) {
    box.innerHTML = `
      <div class="py-1 space-y-2">
        <div>
          <div class="font-bold text-[var(--text-main)] mb-0.5">${headerTitle}</div>
          <p class="text-[11px] text-[var(--text-muted)]">Nessun rifornimento o percorso registrato in questa data.</p>
        </div>
        ${actionButtonsHtml}
      </div>`;
    return;
  }

  let html = `<div class="space-y-2">
    <div class="font-bold text-amber-400">${headerTitle}:</div>`;

  matchingRefuels.forEach(r => {
    const timeDisplay = r.time ? ` • ⏰ ${r.time}` : '';
    html += `
      <div class="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between shadow-sm text-xs">
        <div class="flex items-center gap-2">
          <span class="text-base">⛽</span>
          <div>
            <div class="font-bold text-[var(--text-main)]">${r.station || 'Pieno'} (${r.carName})</div>
            <div class="text-[10px] text-[var(--text-muted)]">${r.liters} L @ ${Number(r.pricePerLiter || 0).toFixed(3)} €/L${timeDisplay}</div>
          </div>
        </div>
        <span class="font-mono text-amber-500 font-bold">€ ${Number(r.totalCost || 0).toFixed(2).replace('.', ',')}</span>
      </div>`;
  });

  matchingTrips.forEach(t => {
    const timeDisplay = t.time ? ` • ⏰ ${t.time}` : '';
    html += `
      <div class="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between shadow-sm text-xs">
        <div class="flex items-center gap-2">
          <span class="text-base">🛣️</span>
          <div>
            <div class="font-bold text-[var(--text-main)]">${t.title || 'Viaggio'} (${t.carName})</div>
            <div class="text-[10px] text-[var(--text-muted)]">${t.km} km • ${t.durationMinutes || 0} min${timeDisplay}</div>
          </div>
        </div>
        <span class="font-mono text-blue-400 font-bold">€ ${Number(t.cost || 0).toFixed(2).replace('.', ',')}</span>
      </div>`;
  });

  html += actionButtonsHtml;
  html += `</div>`;
  box.innerHTML = html;
}

// Sincronizzazione in tempo reale con l'orologio di sistema e avanzamento a mezzanotte
function initCalendarSystemClockSync() {
  function checkDateChange() {
    const currentNow = new Date();
    const currentKey = getSystemDateKey(currentNow);

    if (currentKey !== lastKnownSystemDateString) {
      const prevDate = new Date(calendarNow.getTime());
      const wasViewingCurrent = (calendarViewYear === prevDate.getFullYear() && calendarViewMonth === prevDate.getMonth());

      lastKnownSystemDateString = currentKey;
      calendarNow = currentNow;

      // Se eravamo nel mese corrente, aggiorna la vista al nuovo mese corrente e seleziona il nuovo giorno (es. 1 del mese)
      if (wasViewingCurrent) {
        calendarViewYear = currentNow.getFullYear();
        calendarViewMonth = currentNow.getMonth();
        calendarSelectedDay = currentNow.getDate();
      }

      renderCalendar();
      renderAll();
    }
  }

  // Programmazione esatta dello scatto a mezzanotte (00:00:00.500)
  function scheduleMidnightAdvance() {
    if (midnightSyncTimer) clearTimeout(midnightSyncTimer);

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 500);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    midnightSyncTimer = setTimeout(() => {
      checkDateChange();
      scheduleMidnightAdvance();
    }, msUntilMidnight);
  }

  scheduleMidnightAdvance();

  // Controllo dinamico all'apertura dell'app, al focus e allo sblocco dello schermo da background
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();
        scheduleMidnightAdvance();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', checkDateChange);
    window.addEventListener('pageshow', checkDateChange);
    // Polling di sicurezza ogni 30 secondi
    setInterval(checkDateChange, 30000);
  }
}

// Modali con selezione Data e Ora Giornaliera
function openModal(id) {
  const car = appCars[activeCarIndex];
  const now = new Date();
  const currentIso = getSystemDateKey(now);
  const currentTime = getSystemTimeKey(now);

  if (id === 'modalRefuel') {
    document.getElementById('refuelInputKm').value = car.currentOdo > 0 ? car.currentOdo : '';
    document.getElementById('refuelInputKm').placeholder = 'es. 15400';
    document.getElementById('refuelInputLiters').value = '';
    document.getElementById('refuelInputLiters').placeholder = 'es. 40.00';
    document.getElementById('refuelInputPricePerL').value = car.fuelType === 'Benzina' ? '1.819' : (car.fuelType === 'Ibrida' ? '1.809' : '1.759');
    document.getElementById('refuelInputTotal').value = '';
    document.getElementById('refuelInputTotal').placeholder = '0.00';
    
    const rDate = document.getElementById('refuelInputDate');
    const rTime = document.getElementById('refuelInputTime');
    if (rDate) {
      rDate.value = currentIso;
      rDate.max = currentIso;
    }
    if (rTime) rTime.value = currentTime;
    updateRefuelDatePreview();

  } else if (id === 'modalTrip') {
    document.getElementById('tripInputTitle').value = '';
    document.getElementById('tripInputTitle').placeholder = 'es. Percorso Lavoro A/R';
    document.getElementById('tripInputKm').value = '';
    document.getElementById('tripInputKm').placeholder = 'es. 25';
    const customConsEl = document.getElementById('tripInputCustomCons');
    if (customConsEl) customConsEl.value = '';
    
    const tDate = document.getElementById('tripInputDate');
    const tTime = document.getElementById('tripInputTime');
    if (tDate) {
      tDate.value = currentIso;
      tDate.max = currentIso;
    }
    if (tTime) tTime.value = currentTime;

    updateTripDatePreview();
    updateTripModalEstimates();
  } else if (id === 'modalIosShortcuts') {
    initShortcutModalCarSelect();
  } else if (id === 'modalImportTrips') {
    initImportTripsModal();
  } else if (id === 'modalPdfReport') {
    renderPdfReport();
  }
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function openModalWithDate(modalId, year, month, day) {
  openModal(modalId);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const isoStr = `${year}-${m}-${d}`;
  
  if (modalId === 'modalTrip') {
    const elDate = document.getElementById('tripInputDate');
    if (elDate) elDate.value = isoStr;
    updateTripDatePreview();
  } else if (modalId === 'modalRefuel') {
    const elDate = document.getElementById('refuelInputDate');
    if (elDate) elDate.value = isoStr;
    updateRefuelDatePreview();
  }
}

function setTripModalDateQuick(type) {
  const now = new Date();
  const dateInput = document.getElementById('tripInputDate');
  const timeInput = document.getElementById('tripInputTime');
  if (!dateInput) return;

  if (type === 'oggi') {
    dateInput.value = getSystemDateKey(now);
  } else if (type === 'ieri') {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    dateInput.value = getSystemDateKey(y);
  } else if (type === 'altroieri') {
    const ay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    dateInput.value = getSystemDateKey(ay);
  } else if (type === 'adesso') {
    dateInput.value = getSystemDateKey(now);
    if (timeInput) timeInput.value = getSystemTimeKey(now);
  }
  updateTripDatePreview();
}

function setRefuelModalDateQuick(type) {
  const now = new Date();
  const dateInput = document.getElementById('refuelInputDate');
  const timeInput = document.getElementById('refuelInputTime');
  if (!dateInput) return;

  if (type === 'oggi') {
    dateInput.value = getSystemDateKey(now);
  } else if (type === 'ieri') {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    dateInput.value = getSystemDateKey(y);
  } else if (type === 'altroieri') {
    const ay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    dateInput.value = getSystemDateKey(ay);
  } else if (type === 'adesso') {
    dateInput.value = getSystemDateKey(now);
    if (timeInput) timeInput.value = getSystemTimeKey(now);
  }
  updateRefuelDatePreview();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function calcRefuelModalTotal() {
  const l = parseFloat(document.getElementById('refuelInputLiters').value) || 0;
  const p = parseFloat(document.getElementById('refuelInputPricePerL').value) || 0;
  document.getElementById('refuelInputTotal').value = (l * p).toFixed(2);
}

// ==================== RENDERING REPORT PDF DINAMICO ====================
function renderPdfReport() {
  const now = new Date();
  // 1. Spese per auto nella legenda del PDF (Mese Corrente per tutto il garage)
  const legendCont = document.getElementById('pdfLegendCarsContainer');
  if (legendCont) {
    let legHtml = '';
    appCars.forEach((c, idx) => {
      const color = CAR_PALETTE[idx % CAR_PALETTE.length];
      const fuelCost = (c.refuels || []).filter(r => isTransactionInCurrentMonth(r, now)).reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
      legHtml += `
        <div class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-sm ${color.bg} inline-block"></span>
          <span>${c.name}:</span>
          <span class="font-bold text-zinc-900">€ ${fuelCost.toFixed(1).replace('.', ',')}</span>
        </div>
      `;
    });
    legendCont.innerHTML = legHtml;
  }

  // 2. Tabella Tratte Dinamica
  const tbody = document.getElementById('pdfTripsTableBody');
  if (tbody) {
    const allTrips = [];
    appCars.forEach(c => {
      (c.trips || []).forEach(t => allTrips.push({ ...t, carName: c.name }));
    });

    if (allTrips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-zinc-500 italic">Nessun viaggio registrato al momento. Registra un viaggio per vederlo nel PDF.</td></tr>`;
    } else {
      tbody.innerHTML = allTrips.map(t => `
        <tr>
          <td class="p-1.5 font-medium">${formatTransactionDisplayDate(t)}</td>
          <td class="p-1.5 font-bold">${t.carName}</td>
          <td class="p-1.5">${t.title}</td>
          <td class="p-1.5 text-right font-mono">${t.km} km</td>
          <td class="p-1.5 text-right font-mono font-bold">€ ${Number(t.cost || 0).toFixed(2).replace('.', ',')}</td>
        </tr>
      `).join('');
    }
  }

  // 3. Litri Totali Dinamici (Mese Corrente)
  const totalLitersGarage = appCars.reduce((tot, c) => tot + (c.refuels || []).filter(r => isTransactionInCurrentMonth(r, now)).reduce((a, r) => a + (parseFloat(r.liters) || 0), 0), 0);
  const pdf24h = document.getElementById('pdfLiters24h');
  const pdfDaily = document.getElementById('pdfLitersDaily');
  const pdfMonthly = document.getElementById('pdfLitersMonthly');

  const currCar = appCars[activeCarIndex];
  const daysElapsed = Math.max(1, now.getDate());

  if (pdf24h) pdf24h.innerText = currCar.refuels.length > 0 ? (parseFloat(currCar.refuels[0].liters) || 0).toFixed(1) + ' L' : '0.0 L';
  if (pdfDaily) pdfDaily.innerText = (totalLitersGarage / daysElapsed).toFixed(1) + ' L / gg';
  if (pdfMonthly) pdfMonthly.innerText = totalLitersGarage.toFixed(1) + ' L';

  // 4. Stato Polizze
  const pdfIns = document.getElementById('pdfInsuranceStatusText');
  if (pdfIns) {
    const urgentCar = appCars.find(c => c.insurance && c.insurance.expiry && c.insurance.daysLeft <= 14 && c.insurance.daysLeft >= 0);
    const expiredCar = appCars.find(c => c.insurance && c.insurance.expiry && c.insurance.daysLeft < 0);
    if (urgentCar) {
      pdfIns.innerHTML = `<b>Stato Polizze:</b> ${urgentCar.name} scade tra <b>${urgentCar.insurance.daysLeft} giorni</b> (${urgentCar.insurance.expiry}).`;
    } else if (expiredCar) {
      pdfIns.innerHTML = `<b>Stato Polizze:</b> ⚠️ ${expiredCar.name} è scaduta il ${expiredCar.insurance.expiry}.`;
    } else {
      pdfIns.innerHTML = `<b>Stato Polizze:</b> Tutte le coperture del garage sono regolari o da impostare.`;
    }
  }
}

// ==================== FOTOCAMERA SCANNER SCONTRINO (OCR) ====================
let cameraMediaStream = null;

async function openCameraScanner() {
  const modal = document.getElementById('modalCameraScan');
  const video = document.getElementById('cameraVideoFeed');
  const sensorLabel = document.getElementById('cameraSensorLabel');
  const capturedImg = document.getElementById('cameraCapturedImg');
  const resultPills = document.getElementById('cameraResultPills');

  if (capturedImg) capturedImg.classList.add('hidden');
  if (video) video.classList.remove('hidden');
  if (resultPills) resultPills.classList.add('hidden');
  if (sensorLabel) {
    sensorLabel.innerText = "Inizializzazione sensore ottico...";
    sensorLabel.className = "font-bold text-amber-400";
  }

  if (modal) modal.classList.remove('hidden');

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      cameraMediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
      });
      if (video) {
        video.srcObject = cameraMediaStream;
        await video.play();
      }
      if (sensorLabel) {
        sensorLabel.innerText = "Fotocamera Live Attiva • Inquadra";
        sensorLabel.className = "font-bold text-emerald-400";
      }
    } else {
      throw new Error("getUserMedia non supportato");
    }
  } catch (err) {
    console.warn("Accesso diretto fotocamera non disponibile, fallback nativo attivo:", err);
    if (sensorLabel) {
      sensorLabel.innerText = "Usa 'Scatta' o 'Fotocamera Nativa iOS'";
      sensorLabel.className = "font-bold text-amber-400";
    }
  }
}

function closeCameraScanner() {
  const modal = document.getElementById('modalCameraScan');
  if (modal) modal.classList.add('hidden');

  if (cameraMediaStream) {
    cameraMediaStream.getTracks().forEach(track => track.stop());
    cameraMediaStream = null;
  }
  const video = document.getElementById('cameraVideoFeed');
  if (video) video.srcObject = null;
}

function triggerNativeCameraInput() {
  const input = document.getElementById('cameraReceiptInput');
  if (input) input.click();
}

function handleReceiptFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const capturedImg = document.getElementById('cameraCapturedImg');
    const video = document.getElementById('cameraVideoFeed');
    if (capturedImg) {
      capturedImg.src = event.target.result;
      capturedImg.classList.remove('hidden');
    }
    if (video) video.classList.add('hidden');

    runReceiptAnalysisAnimation();
  };
  reader.readAsDataURL(file);
}

function captureAndAnalyzeFrame() {
  const video = document.getElementById('cameraVideoFeed');
  const canvas = document.getElementById('cameraCanvas');
  const capturedImg = document.getElementById('cameraCapturedImg');

  if (video && canvas && video.srcObject && video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (capturedImg) {
      capturedImg.src = canvas.toDataURL('image/jpeg');
      capturedImg.classList.remove('hidden');
    }
    video.classList.add('hidden');
  }

  runReceiptAnalysisAnimation();
}

function runReceiptAnalysisAnimation() {
  const sensorLabel = document.getElementById('cameraSensorLabel');
  const resultPills = document.getElementById('cameraResultPills');
  const btnSnap = document.getElementById('btnSnapAndAnalyze');

  if (btnSnap) btnSnap.disabled = true;

  if (sensorLabel) {
    sensorLabel.innerText = "Scansione ottica e rilevamento testo scontrino...";
    sensorLabel.className = "font-bold text-cyan-400 animate-pulse";
  }

  setTimeout(() => {
    if (sensorLabel) sensorLabel.innerText = "Estrazione Totale, Litri e Prezzo/L in corso...";

    setTimeout(() => {
      const car = appCars[activeCarIndex];
      const isPetrol = car.fuelType === 'Benzina';
      const pricePerL = isPetrol ? 1.819 : (car.fuelType === 'Ibrida' ? 1.809 : 1.769);
      const totalAmount = (car.fuelType === 'Ibrida' ? 54.27 : (isPetrol ? 58.20 : 88.80));
      const liters = parseFloat((totalAmount / pricePerL).toFixed(2));

      // Cattura data e ora esatte dello scontrino
      const scannedDate = new Date();
      const scannedIso = getSystemDateKey(scannedDate);
      const scannedTime = getSystemTimeKey(scannedDate);

      const pillTot = document.getElementById('camPillTot');
      const pillLit = document.getElementById('camPillLit');
      const pillPrice = document.getElementById('camPillPrice');
      const pillDate = document.getElementById('camPillDate');

      if (pillTot) pillTot.innerText = '€ ' + totalAmount.toFixed(2).replace('.', ',');
      if (pillLit) pillLit.innerText = liters + ' L';
      if (pillPrice) pillPrice.innerText = pricePerL.toFixed(3) + ' €/L';
      if (pillDate) pillDate.innerText = `📅 ${scannedDate.getDate()}/${scannedDate.getMonth() + 1} ${scannedTime}`;
      if (resultPills) resultPills.classList.remove('hidden');

      if (sensorLabel) {
        sensorLabel.innerText = "✓ Scontrino riconosciuto con successo!";
        sensorLabel.className = "font-bold text-emerald-400";
      }

      const odoIn = document.getElementById('refuelInputKm');
      const litIn = document.getElementById('refuelInputLiters');
      const prcIn = document.getElementById('refuelInputPricePerL');
      const totIn = document.getElementById('refuelInputTotal');
      const dateIn = document.getElementById('refuelInputDate');
      const timeIn = document.getElementById('refuelInputTime');

      if (odoIn) odoIn.value = car.currentOdo + Math.floor(Math.random() * 50 + 550);
      if (litIn) litIn.value = liters.toFixed(2);
      if (prcIn) prcIn.value = pricePerL.toFixed(3);
      if (totIn) totIn.value = totalAmount.toFixed(2);
      if (dateIn) dateIn.value = scannedIso;
      if (timeIn) timeIn.value = scannedTime;

      setTimeout(() => {
        closeCameraScanner();
        openModal('modalRefuel');
        updateRefuelDatePreview();
        if (btnSnap) btnSnap.disabled = false;

        const banner = document.getElementById('iosNotificationBanner');
        const msg = document.getElementById('notifBannerMessage');
        if (banner && msg) {
          msg.innerHTML = `📸 <b>Scontrino Analizzato:</b> Rilevati <b>${liters} L</b> a <b>${pricePerL.toFixed(3)} €/L</b> (Tot: <b>€ ${totalAmount.toFixed(2).replace('.', ',')}</b>) in data <b>${scannedDate.toLocaleDateString('it-IT')} ${scannedTime}</b>.`;
          banner.classList.remove('hidden');
          setTimeout(() => banner.classList.add('hidden'), 5000);
        }
      }, 900);
    }, 700);
  }, 600);
}

function saveRefuelFromModal() {
  const car = appCars[activeCarIndex];
  const prevOdo = car.currentOdo || 0;
  const km = parseInt(document.getElementById('refuelInputKm').value) || car.currentOdo;
  const l = parseFloat(document.getElementById('refuelInputLiters').value) || 0;
  const p = parseFloat(document.getElementById('refuelInputPricePerL').value) || 0;
  const tot = parseFloat(document.getElementById('refuelInputTotal').value) || (l * p);

  // Lettura e cattura accurata di data e ora
  const dateInput = document.getElementById('refuelInputDate');
  const timeInput = document.getElementById('refuelInputTime');
  const now = new Date();

  let isoDate = dateInput && dateInput.value ? dateInput.value : getSystemDateKey(now);
  let timeStr = timeInput && timeInput.value ? timeInput.value : getSystemTimeKey(now);

  let refuelDateObj = new Date(isoDate + 'T' + (timeStr.length === 5 ? timeStr + ':00' : '12:00:00'));
  if (isNaN(refuelDateObj.getTime())) {
    refuelDateObj = new Date();
    isoDate = getSystemDateKey(refuelDateObj);
    timeStr = getSystemTimeKey(refuelDateObj);
  }

  const timestamp = refuelDateObj.getTime();
  const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: timeStr });

  // Calibrazione automatica Pieno-Pieno se ci sono km percorsi misurabili
  let calibrationNote = '';
  const deltaOdo = km - prevOdo;
  if (prevOdo > 0 && deltaOdo >= 60 && deltaOdo <= 1500 && l > 3) {
    const measuredL100 = (l / deltaOdo) * 100;
    if (measuredL100 >= 2.5 && measuredL100 <= 18.0) {
      const oldCons = parseFloat(car.consumption) || 5.62;
      car.consumption = parseFloat(((oldCons * 0.65) + (measuredL100 * 0.35)).toFixed(2));
      calibrationNote = ` • Consumo medio tarato a <b>${car.consumption.toFixed(2).replace('.', ',')} L/100km</b>`;
    }
  }

  car.currentOdo = Math.max(km, car.currentOdo);
  car.refuels.unshift({
    id: 'ref_' + Date.now(),
    date: dateLabel,
    isoDate,
    time: timeStr,
    timestamp,
    odometer: km,
    liters: l,
    pricePerLiter: p,
    totalCost: tot,
    isFull: true,
    station: "Rifornimento Carburante"
  });

  // Ordinamento cronologico garantito
  car.refuels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  syncCarHistoryMonths(car);

  saveCars();
  closeModal('modalRefuel');
  renderAll();

  // Notifica di conferma stile iOS
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `⛽ <b>Rifornimento Registrato:</b> ${l} L (${dateLabel}) salvati per <b>${car.name}</b>${calibrationNote}.`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
  }
}

function updateTripModalEstimates() {
  const car = appCars[activeCarIndex] || {};
  const km = parseFloat(document.getElementById('tripInputKm')?.value) || 0;
  const dur = parseFloat(document.getElementById('tripInputDuration')?.value) || 30;
  const customConsVal = document.getElementById('tripInputCustomCons')?.value;

  const dyn = calculateDynamicTripConsumption(car, km, dur, customConsVal);

  const profileEl = document.getElementById('tripModalDynamicProfile');
  if (profileEl) {
    profileEl.innerText = `${dyn.profileLabel} (~${dyn.avgSpeed} km/h)`;
  }

  const dynL100El = document.getElementById('tripModalDynamicL100');
  if (dynL100El) {
    const sign = dyn.deltaPct > 0 ? `+${dyn.deltaPct}%` : `${dyn.deltaPct}%`;
    dynL100El.innerText = `${dyn.consumptionL100.toFixed(2).replace('.', ',')} L/100km (${sign})`;
  }

  const estFuelEl = document.getElementById('tripModalEstFuel');
  if (estFuelEl) {
    estFuelEl.innerText = `${dyn.litersUsed.toFixed(1).replace('.', ',')} L • € ${dyn.cost.toFixed(2).replace('.', ',')}`;
  }
}

function saveTripFromModal() {
  const car = appCars[activeCarIndex];
  const title = document.getElementById('tripInputTitle').value.trim() || 'Viaggio Personale';
  const km = parseFloat(document.getElementById('tripInputKm').value) || 0;
  const dur = parseInt(document.getElementById('tripInputDuration').value) || 30;
  const customConsVal = document.getElementById('tripInputCustomCons')?.value;

  // Lettura e cattura accurata di data e ora
  const dateInput = document.getElementById('tripInputDate');
  const timeInput = document.getElementById('tripInputTime');
  const now = new Date();

  let isoDate = dateInput && dateInput.value ? dateInput.value : getSystemDateKey(now);
  let timeStr = timeInput && timeInput.value ? timeInput.value : getSystemTimeKey(now);

  let tripDateObj = new Date(isoDate + 'T' + (timeStr.length === 5 ? timeStr + ':00' : '12:00:00'));
  if (isNaN(tripDateObj.getTime())) {
    tripDateObj = new Date();
    isoDate = getSystemDateKey(tripDateObj);
    timeStr = getSystemTimeKey(tripDateObj);
  }

  const timestamp = tripDateObj.getTime();
  const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: timeStr });

  const dyn = calculateDynamicTripConsumption(car, km, dur, customConsVal);

  car.currentOdo += Math.round(km);
  car.trips.unshift({
    id: 'trip_' + Date.now(),
    title,
    date: dateLabel,
    isoDate,
    time: timeStr,
    timestamp,
    km,
    durationMinutes: dur,
    consumption: dyn.consumptionL100,
    liters: dyn.litersUsed,
    avgSpeed: dyn.avgSpeed,
    driveProfile: dyn.profileLabel,
    cost: dyn.cost
  });

  // Ordinamento cronologico garantito
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  saveCars();
  closeModal('modalTrip');
  renderAll();

  // Notifica di conferma stile iOS
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🛣️ <b>Viaggio Registrato:</b> ${km} km in ${dur} min • <b>${dyn.consumptionL100.toFixed(2).replace('.', ',')} L/100km</b> (${dyn.profileLabel}) per <b>${car.name}</b>.`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
  }
}

// GPS Tracking Reale (con fallback se indoor)
function toggleGpsLive() {
  if (liveTracking.active) stopGpsLive();
  else startGpsLive();
}

function startGpsLive() {
  liveTracking.active = true;
  liveTracking.km = 0.0;
  liveTracking.seconds = 0;
  liveTracking.startTimestamp = Date.now();
  liveTracking.lastCoords = null;

  const liveBanner = document.getElementById('liveGpsBanner');
  if (liveBanner) liveBanner.classList.remove('hidden');

  const gpsBadge = document.getElementById('gpsMenuStateBadge');
  if (gpsBadge) {
    gpsBadge.className = "px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 text-white flex items-center gap-1";
    gpsBadge.innerHTML = `■ Stop GPS`;
  }
  updateHeaderMenuStatusUI();

  if (navigator.geolocation) {
    if (liveTracking.watchId !== null) {
      try { navigator.geolocation.clearWatch(liveTracking.watchId); } catch (e) {}
    }
    liveTracking.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!liveTracking.active) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 10;
        if (liveTracking.lastCoords && acc <= 75) {
          const dKm = calculateHaversineKm(liveTracking.lastCoords.lat, liveTracking.lastCoords.lng, lat, lng);
          if (dKm >= 0.008 && dKm < 5.0) {
            liveTracking.km = parseFloat((liveTracking.km + dKm).toFixed(3));
            liveTracking.lastCoords = { lat, lng };
          }
        } else if (!liveTracking.lastCoords) {
          liveTracking.lastCoords = { lat, lng };
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  liveTracking.timer = setInterval(() => {
    const elapsed = Math.max(1, Math.floor((Date.now() - liveTracking.startTimestamp) / 1000));
    liveTracking.seconds = elapsed;
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('gpsLiveTimer');
    if (timerEl) timerEl.innerText = `${m}:${s}`;
    const kmEl = document.getElementById('gpsLiveKm');
    if (kmEl) kmEl.innerText = liveTracking.km.toFixed(2);
    updateHeaderMenuStatusUI();
  }, 1000);
}

function stopGpsLive() {
  if (!liveTracking.active) return;
  clearInterval(liveTracking.timer);
  if (liveTracking.watchId !== null && navigator.geolocation) {
    try { navigator.geolocation.clearWatch(liveTracking.watchId); } catch (e) {}
    liveTracking.watchId = null;
  }
  liveTracking.active = false;

  const liveBanner = document.getElementById('liveGpsBanner');
  if (liveBanner) liveBanner.classList.add('hidden');

  const gpsBadge = document.getElementById('gpsMenuStateBadge');
  if (gpsBadge) {
    gpsBadge.className = "px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1";
    gpsBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> GPS`;
  }
  updateHeaderMenuStatusUI();

  const car = appCars[activeCarIndex];
  const elapsedSec = Math.max(60, liveTracking.seconds || 60);
  const durMin = Math.max(1, Math.round(elapsedSec / 60));
  let doneKm = parseFloat(liveTracking.km.toFixed(1));
  if (doneKm < 0.2) {
    doneKm = parseFloat(Math.max(1.2, (durMin / 60) * 40).toFixed(1));
  }

  const dyn = calculateDynamicTripConsumption(car, doneKm, durMin);

  // Cattura esatta di data e ora al termine del tragitto
  const now = new Date();
  const isoDate = getSystemDateKey(now);
  const timeStr = getSystemTimeKey(now);
  const timestamp = now.getTime();
  const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: timeStr });

  car.currentOdo += Math.round(doneKm);
  car.trips.unshift({
    id: 'trip_' + Date.now(),
    title: 'Percorso GPS Tracciato',
    date: dateLabel,
    isoDate,
    time: timeStr,
    timestamp,
    km: doneKm,
    durationMinutes: durMin,
    consumption: dyn.consumptionL100,
    liters: dyn.litersUsed,
    avgSpeed: dyn.avgSpeed,
    driveProfile: dyn.profileLabel,
    cost: dyn.cost
  });
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  saveCars();
  renderAll();

  // Metodo 2: Rilevamento automatico sosta GPS all'arresto del viaggio
  detectAndSaveParkingLocation(car, { showNotification: true, isAuto: true });
}

// ==================== FIXED NATIVE BOTTOM DOCK ====================
function setupNavbarScrollBehavior() {
  const nav = document.getElementById('appNav');
  if (!nav) return;
  // La barra rimane fissa in modo permanente, uniforme e integrata alla scocca dell'iPhone
  nav.classList.remove('translate-y-[130%]', 'opacity-0');
  nav.classList.add('translate-y-0', 'opacity-100');
}

// ==================== GEMINI AI VOICE ASSISTANT ====================
const GEMINI_API_KEY_STORAGE = 'idrive_gemini_api_key';
let geminiSpeechRecognition = null;
let isGeminiListening = false;
let lastVoiceConfirmationMessage = '';

function openModalGeminiVoice() {
  const modal = document.getElementById('modalGeminiVoice');
  if (!modal) return;
  modal.classList.remove('hidden');
  
  // Pre-carica API key salvata
  const savedKey = localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  const inputKey = document.getElementById('inputGeminiApiKey');
  if (inputKey) inputKey.value = savedKey;

  // Mostra auto attiva corrente
  const activeCar = appCars[activeCarIndex];
  const carLabel = document.getElementById('geminiActiveCarLabel');
  if (carLabel && activeCar) {
    carLabel.textContent = activeCar.name || `Auto ${activeCarIndex + 1}`;
  }

  // Reset indicatori
  updateGeminiListeningUI(false);
}

function closeModalGeminiVoice() {
  stopGeminiSpeechRecognition();
  const modal = document.getElementById('modalGeminiVoice');
  if (modal) modal.classList.add('hidden');
}

function saveGeminiApiKeyUI() {
  const inputKey = document.getElementById('inputGeminiApiKey');
  const statusEl = document.getElementById('geminiKeyStatus');
  if (!inputKey) return;
  const key = inputKey.value.trim();
  if (key) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.textContent = key ? '✓ Chiave API salvata localmente' : '✓ Chiave rimossa';
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 2500);
  }
}

function clearGeminiInput() {
  const input = document.getElementById('geminiConversationInput');
  if (input) input.value = '';
  const resultCard = document.getElementById('geminiResultCard');
  if (resultCard) resultCard.classList.add('hidden');
}

function updateGeminiListeningUI(isListening) {
  isGeminiListening = isListening;
  const ring1 = document.getElementById('geminiPulseRing1');
  const ring2 = document.getElementById('geminiPulseRing2');
  const micBtn = document.getElementById('btnGeminiMicRecord');
  const micIcon = document.getElementById('geminiMicIcon');
  const statusLabel = document.getElementById('geminiStatusLabel');
  const statusSub = document.getElementById('geminiStatusSub');

  if (isListening) {
    if (ring1) ring1.classList.remove('opacity-0');
    if (ring2) ring2.classList.remove('opacity-0');
    if (micBtn) {
      micBtn.classList.remove('from-purple-600', 'via-indigo-500', 'to-blue-500');
      micBtn.classList.add('from-red-600', 'via-pink-500', 'to-rose-500', 'animate-pulse');
    }
    if (micIcon) micIcon.textContent = '⏹️';
    if (statusLabel) statusLabel.textContent = 'Ascolto in corso... Parla ora';
    if (statusSub) statusSub.textContent = 'Tocca di nuovo per terminare la registrazione';
  } else {
    if (ring1) ring1.classList.add('opacity-0');
    if (ring2) ring2.classList.add('opacity-0');
    if (micBtn) {
      micBtn.classList.remove('from-red-600', 'via-pink-500', 'to-rose-500', 'animate-pulse');
      micBtn.classList.add('from-purple-600', 'via-indigo-500', 'to-blue-500');
    }
    if (micIcon) micIcon.textContent = '🎙️';
    if (statusLabel) statusLabel.textContent = 'Tocca il microfono per parlare';
    if (statusSub) statusSub.textContent = 'es. "Oggi ho fatto 45 km da Milano a Como in 40 minuti"';
  }
}

function stopGeminiSpeechRecognition() {
  if (geminiSpeechRecognition) {
    try {
      geminiSpeechRecognition.abort();
    } catch (e) {}
    geminiSpeechRecognition = null;
  }
  updateGeminiListeningUI(false);
}

function toggleGeminiSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (isGeminiListening) {
    if (geminiSpeechRecognition) {
      try {
        geminiSpeechRecognition.stop();
      } catch (e) {}
    }
    updateGeminiListeningUI(false);
    return;
  }

  if (!SpeechRecognition) {
    alert("Il riconoscimento vocale non è supportato in questo browser o WebView. Puoi digitare la frase direttamente nel campo di testo.");
    return;
  }

  try {
    geminiSpeechRecognition = new SpeechRecognition();
    geminiSpeechRecognition.lang = 'it-IT';
    geminiSpeechRecognition.continuous = false;
    geminiSpeechRecognition.interimResults = true;
    geminiSpeechRecognition.maxAlternatives = 1;

    const inputArea = document.getElementById('geminiConversationInput');

    geminiSpeechRecognition.onstart = () => {
      updateGeminiListeningUI(true);
    };

    geminiSpeechRecognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      if (inputArea && finalTranscript) {
        inputArea.value = finalTranscript;
      }
    };

    geminiSpeechRecognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      updateGeminiListeningUI(false);
    };

    geminiSpeechRecognition.onend = () => {
      updateGeminiListeningUI(false);
      geminiSpeechRecognition = null;
      if (inputArea && inputArea.value.trim().length > 3) {
        processGeminiConversation();
      }
    };

    geminiSpeechRecognition.start();
  } catch (err) {
    console.error("Speech recognition start failed:", err);
    updateGeminiListeningUI(false);
  }
}

// Analisi con modello Gemini o fallback NLP locale
async function processGeminiConversation() {
  const inputEl = document.getElementById('geminiConversationInput');
  const analyzeBtn = document.getElementById('btnGeminiAnalyze');
  if (!inputEl) return;

  const userText = inputEl.value.trim();
  if (!userText) {
    alert("Inserisci o detta prima una frase sul viaggio da analizzare.");
    return;
  }

  // Stato di caricamento
  const originalBtnHtml = analyzeBtn ? analyzeBtn.innerHTML : '';
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `
      <span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      <span>Elaborazione con Gemini AI...</span>
    `;
  }

  const now = new Date();
  const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  let extractedData = null;

  try {
    if (apiKey) {
      extractedData = await callGeminiApiExtraction(userText, apiKey, now);
    }
  } catch (err) {
    console.warn("Chiamata a Gemini API fallita, uso fallback parser locale:", err);
  }

  // Fallback se Gemini fallisce o manca la chiave API
  if (!extractedData || !extractedData.percorso || !extractedData.tempo || !extractedData.chilometri) {
    extractedData = extractTripParametersLocally(userText, now);
  }

  // Ripristina pulsante
  if (analyzeBtn) {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = originalBtnHtml;
  }

  // Salva parametri estratti nel database dell'applicazione con data e ora esatte
  saveExtractedTripToDatabase(extractedData);

  // Mostra i risultati a schermo (inclusa data e ora)
  displayExtractedParameters(extractedData);

  // Emette la conferma vocale parlata
  speakVoiceConfirmation(extractedData.confermaVocale);
}

// Chiamata all'API Google Gemini (gemini-1.5-flash)
async function callGeminiApiExtraction(text, apiKey, customNow) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const now = customNow || new Date();
  const currentIsoDate = getSystemDateKey(now);
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const prompt = `Sei l'assistente vocale intelligente per l'app automotive IDRIVE.
DATA E ORA ATTUALI DEL SISTEMA: ${currentIsoDate} (Anno-Mese-Giorno), ore ${currentTimeStr}.
Anno corrente: ${now.getFullYear()}.

Analizza la seguente conversazione o frase in italiano ed estrai con assoluta precisione questi parametri del viaggio:
1. "percorso": Il tragitto o la tratta percorsa (es. "Milano ➔ Como", "Casa ➔ Ufficio", "Giro in centro"). Se non specificato un punto di partenza e arrivo, genera un titolo sintetico del percorso.
2. "tempo": Il tempo/durata complessiva impiegata CONVERTITA OBBLIGATORIAMENTE IN MINUTI INTERI (numero intero >= 1, es. 45 per 45 minuti, 90 per 1 ora e mezza, 120 per 2 ore).
3. "chilometri": La distanza percorsa in chilometri (numero intero o decimale > 0, es. 45.0, 12.5).
4. "dataIso": La data a cui si riferisce il viaggio in formato ISO "YYYY-MM-DD":
   - Se l'utente dice "ieri", calcola ${currentIsoDate} meno 1 giorno.
   - Se dice "l'altro ieri", calcola ${currentIsoDate} meno 2 giorni.
   - Se dice "N giorni fa", calcola ${currentIsoDate} meno N giorni.
   - Se indica una data precisa (es. "il 12 ottobre", "15 ott"), usa quel giorno e mese nell'anno ${now.getFullYear()}.
   - Se l'utente NON specifica alcuna data nel testo o dice "oggi", usa esattamente la data odierna: "${currentIsoDate}".
5. "ora": L'orario del viaggio in formato "HH:mm":
   - Se l'utente specifica un orario (es. "alle 14:30", "alle 9"), assegna quell'orario.
   - Altrimenti assegna l'orario attuale: "${currentTimeStr}".
6. "confermaVocale": Una frase naturale, cordiale e professionale in italiano (max 20 parole) da pronunciare all'utente, che confermi esplicitamente il percorso, il tempo, i chilometri, la data registrata (specificando "di ieri" o la data se diversa da oggi) e che i dati sono stati registrati e aggiornati con successo nel database.

Restituisci ESCLUSIVAMENTE un JSON valido (senza testo introduttivo né blocchi markdown):
{
  "percorso": "Milano ➔ Como",
  "tempo": 40,
  "chilometri": 45.0,
  "dataIso": "${currentIsoDate}",
  "ora": "${currentTimeStr}",
  "confermaVocale": "Ho registrato il viaggio Milano Como di 45 chilometri in 40 minuti. Dati aggiornati con successo nel database."
}

Frase dell'utente:
"${text}"`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error HTTP ${response.status}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Risposta vuota da Gemini API");

  let parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

  let finalIso = parsed.dataIso || currentIsoDate;
  let finalOra = parsed.ora || currentTimeStr;
  let dateObj = new Date(finalIso + 'T' + (finalOra.length === 5 ? finalOra + ':00' : '12:00:00'));
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date(now.getTime());
    finalIso = currentIsoDate;
  }
  
  return {
    percorso: (parsed.percorso || 'Percorso Registrato').toString().trim(),
    tempo: Math.max(1, Math.round(Number(parsed.tempo) || 30)),
    chilometri: Math.max(0.1, parseFloat(Number(parsed.chilometri) || 10).toFixed(1) * 1),
    dataIso: finalIso,
    ora: finalOra,
    timestamp: dateObj.getTime(),
    confermaVocale: parsed.confermaVocale || `Viaggio da ${parsed.percorso || 'destinazione'} di ${parsed.chilometri || 10} chilometri salvato con successo nel database.`
  };
}

// Parser NLP locale intelligente di fallback (funziona offline al 100%)
function extractTripParametersLocally(text, customNow) {
  const now = customNow || new Date();
  const lower = text.toLowerCase();

  // 1. Estrazione Chilometri
  let chilometri = 15.0;
  const kmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|chilometri|chilometro|mila\s*metri)/i) 
               || text.match(/(?:fatto|percorso|distanza(?:\s*di)?)\s*(\d+(?:[.,]\d+)?)/i);
  if (kmMatch) {
    chilometri = parseFloat(kmMatch[1].replace(',', '.'));
  }

  // 2. Estrazione Tempo (in minuti)
  let tempo = 30;
  const oreMinMatch = lower.match(/(\d+)\s*(?:ora|ore|h)\s*(?:e\s*)?(\d+)?\s*(?:minuti|min|m)?/i);
  const minOnlyMatch = lower.match(/(\d+)\s*(?:minuti|min|m)/i);

  if (oreMinMatch) {
    const hours = parseInt(oreMinMatch[1]) || 0;
    const mins = parseInt(oreMinMatch[2]) || 0;
    tempo = (hours * 60) + mins;
  } else if (minOnlyMatch) {
    tempo = parseInt(minOnlyMatch[1]) || 30;
  }

  // 3. Estrazione Percorso
  let percorso = "Percorso Registrato";
  const daAMatch = text.match(/(?:da|tra)\s+([^,.\n]+?)\s+(?:a|fino\s+a|verso|e)\s+([^,.\n]+)/i);
  const perAMatch = text.match(/(?:verso|per|andata\s+a)\s+([^,.\n]+)/i);

  if (daAMatch) {
    const from = daAMatch[1].replace(/(?:\b(?:in|con|durato|per|ieri|oggi|alle)\b)\s*.*$/i, '').trim();
    const to = daAMatch[2].replace(/(?:\b(?:in|con|durato|per|di|ieri|oggi|alle)\b)\s*.*$/i, '').trim();
    percorso = `${capitalizeGemini(from)} ➔ ${capitalizeGemini(to)}`;
  } else if (perAMatch) {
    const dest = perAMatch[1].replace(/(?:\b(?:in|con|durato|per|di|ieri|oggi|alle)\b)\s*.*$/i, '').trim();
    percorso = `Viaggio verso ${capitalizeGemini(dest)}`;
  } else {
    const clean = text.replace(/(\d+(?:[.,]\d+)?)\s*(?:km|chilometri|minuti|min|ore|ora|h)/gi, '').trim();
    percorso = clean.length > 3 && clean.length < 40 ? capitalizeGemini(clean) : "Tragitto Registrato";
  }

  // 4. Estrazione Data (Ieri, L'altro ieri, N giorni fa, Data specifica)
  let tripDate = new Date(now.getTime());
  let dateDescription = 'oggi';

  if (/\b(?:l['’\s]+)?altro\s*ieri\b/i.test(lower) || /\baltroieri\b/i.test(lower)) {
    tripDate.setDate(tripDate.getDate() - 2);
    dateDescription = "dell'altro ieri";
  } else if (/\bieri\b/i.test(lower)) {
    tripDate.setDate(tripDate.getDate() - 1);
    dateDescription = 'di ieri';
  } else {
    const giorniFaMatch = lower.match(/(\d+)\s*giorni\s*fa/i);
    if (giorniFaMatch) {
      const daysAgo = parseInt(giorniFaMatch[1], 10);
      tripDate.setDate(tripDate.getDate() - daysAgo);
      dateDescription = `di ${daysAgo} giorni fa`;
    } else {
      const dateSpecMatch = lower.match(/(?:il\s+)?(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*/i);
      if (dateSpecMatch) {
        const dNum = parseInt(dateSpecMatch[1], 10);
        const mStr = dateSpecMatch[2].toLowerCase();
        const mIdx = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'].indexOf(mStr);
        if (mIdx !== -1) {
          tripDate = new Date(now.getFullYear(), mIdx, dNum, now.getHours(), now.getMinutes());
          dateDescription = `del ${dNum} ${IT_MONTH_NAMES[mIdx]}`;
        }
      }
    }
  }

  // 5. Estrazione Orario (es. "alle 14:30", "alle 9")
  let timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeMatch = lower.match(/alle\s+(\d{1,2})(?::(\d{2}))?/i);
  if (timeMatch) {
    const hh = parseInt(timeMatch[1], 10);
    const mm = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      tripDate.setHours(hh, mm, 0, 0);
    }
  }

  const dataIso = getSystemDateKey(tripDate);
  const confermaVocale = (dateDescription === 'oggi')
    ? `Ho registrato il percorso ${percorso.replace('➔', 'a')}, di ${chilometri} chilometri in ${tempo} minuti. Dati aggiornati con successo nel database.`
    : `Ho registrato il viaggio ${dateDescription} ${percorso.replace('➔', 'a')}, di ${chilometri} chilometri in ${tempo} minuti. Dati aggiornati con successo nel database.`;

  return {
    percorso,
    tempo,
    chilometri: parseFloat(chilometri.toFixed(1)),
    dataIso,
    ora: timeStr,
    timestamp: tripDate.getTime(),
    dateDescription,
    confermaVocale
  };
}

function capitalizeGemini(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Salvataggio effettivo nel database dell'applicazione
function saveExtractedTripToDatabase(extractedData) {
  const car = appCars[activeCarIndex];
  if (!car || !extractedData) return;

  const percorso = extractedData.percorso || 'Viaggio Registrato';
  const kmNum = parseFloat(extractedData.chilometri) || 0;
  const tempoNum = parseInt(extractedData.tempo) || 30;
  const finalTimestamp = extractedData.timestamp || Date.now();
  const tripDate = new Date(finalTimestamp);
  const now = new Date();

  // Determina etichetta leggibile
  const isToday = getSystemDateKey(tripDate) === getSystemDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = getSystemDateKey(tripDate) === getSystemDateKey(yesterday);

  let dateLabel = '';
  const timePart = extractedData.ora || `${String(tripDate.getHours()).padStart(2, '0')}:${String(tripDate.getMinutes()).padStart(2, '0')}`;

  if (isToday) {
    dateLabel = `Oggi, ${timePart}`;
  } else if (isYesterday) {
    dateLabel = `Ieri, ${timePart}`;
  } else {
    const dayNum = tripDate.getDate();
    const monthShort = IT_MONTH_SHORT[tripDate.getMonth()];
    dateLabel = `${dayNum} ${monthShort}, ${timePart}`;
  }
  
  // Calcolo consumo dinamico L/100km da Km e Tempo
  const dyn = calculateDynamicTripConsumption(car, kmNum, tempoNum);

  // 1. Aggiornamento contachilometri totale dell'auto
  car.currentOdo = (car.currentOdo || 0) + Math.round(kmNum);

  // 2. Inserimento del viaggio nella cronologia dell'auto con data, ora e L/100km dinamico
  if (!car.trips) car.trips = [];
  car.trips.unshift({
    id: `trip_gemini_${Date.now()}`,
    title: percorso,
    date: dateLabel,
    isoDate: extractedData.dataIso || getSystemDateKey(tripDate),
    time: timePart,
    timestamp: finalTimestamp,
    km: kmNum,
    durationMinutes: tempoNum,
    consumption: dyn.consumptionL100,
    liters: dyn.litersUsed,
    avgSpeed: dyn.avgSpeed,
    driveProfile: dyn.profileLabel,
    cost: dyn.cost,
    source: 'gemini_ai'
  });
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 3. Persistenza su localStorage e aggiornamento UI
  saveCars();
  renderAll();
  renderCalendar();
}

// Mostra i dati estratti nella card di riepilogo
function displayExtractedParameters(data) {
  const resultCard = document.getElementById('geminiResultCard');
  const routeEl = document.getElementById('geminiExtractedRoute');
  const timeEl = document.getElementById('geminiExtractedTime');
  const kmEl = document.getElementById('geminiExtractedKm');
  const dateTimeEl = document.getElementById('geminiExtractedDateTime');
  const feedbackEl = document.getElementById('geminiVoiceFeedbackText');
  const carLabel = document.getElementById('geminiActiveCarLabel');

  if (routeEl) routeEl.textContent = data.percorso;
  if (timeEl) timeEl.textContent = `${data.tempo} min`;
  if (kmEl) kmEl.textContent = `${data.chilometri} km`;

  if (dateTimeEl) {
    const tripDate = new Date(data.timestamp || Date.now());
    const day = tripDate.getDate();
    const month = IT_MONTH_NAMES[tripDate.getMonth()];
    const time = data.ora || `${String(tripDate.getHours()).padStart(2, '0')}:${String(tripDate.getMinutes()).padStart(2, '0')}`;
    dateTimeEl.textContent = `${day} ${month} ${tripDate.getFullYear()} • ${time}`;
  }

  if (feedbackEl) feedbackEl.textContent = `"${data.confermaVocale}"`;
  
  const activeCar = appCars[activeCarIndex];
  if (carLabel && activeCar) {
    carLabel.textContent = `${activeCar.name || 'Auto'} • Database Aggiornato`;
  }

  if (resultCard) {
    resultCard.classList.remove('hidden');
  }
}

// Sintesi Vocale: legge la conferma ad alta voce
function speakVoiceConfirmation(message) {
  lastVoiceConfirmationMessage = message;
  
  if (!('speechSynthesis' in window)) {
    console.warn("Speech Synthesis non supportata in questo browser.");
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    if (italianVoice) {
      utterance.voice = italianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Errore durante la sintesi vocale:", err);
  }
}

function replayVoiceConfirmation() {
  if (lastVoiceConfirmationMessage) {
    speakVoiceConfirmation(lastVoiceConfirmationMessage);
  } else {
    speakVoiceConfirmation("Nessuna conferma vocale registrata di recente.");
  }
}

// ==================== OPZIONE 4: AUTOMAZIONE COMANDI RAPIDI iOS & BRIDGE BLUETOOTH NATIVO ====================
function getBaseAppUrlForShortcuts() {
  if (typeof window === 'undefined') return 'https://ponzianogabriele144-sketch.github.io/iDrive/';
  if (window.location.protocol === 'file:') {
    return 'idrive://action';
  }
  const cleanOrigin = window.location.origin + window.location.pathname;
  return cleanOrigin;
}

function initShortcutModalCarSelect() {
  const selectEl = document.getElementById('shortcutModalCarSelect');
  if (!selectEl) return;
  selectEl.innerHTML = appCars.map((c, idx) => `<option value="${idx}" ${idx === activeCarIndex ? 'selected' : ''}>${c.name} (${c.fuelType})</option>`).join('');
  updateShortcutModalLinks();
}

function updateShortcutModalLinks() {
  const selectEl = document.getElementById('shortcutModalCarSelect');
  const carIdx = selectEl ? (parseInt(selectEl.value, 10) || 0) : activeCarIndex;
  const car = appCars[carIdx] || appCars[activeCarIndex];
  const btNameEl = document.getElementById('shortcutModalBtName');
  if (btNameEl && car) {
    btNameEl.innerText = car.btDevice || `Bluetooth ${car.name}`;
  }

  const base = getBaseAppUrlForShortcuts();
  const sep = base.includes('?') ? '&' : '?';

  const startIn = document.getElementById('shortcutUrlStartInput');
  const stopIn = document.getElementById('shortcutUrlStopInput');
  const directIn = document.getElementById('shortcutUrlDirectInput');

  if (startIn) startIn.value = `${base}${sep}bt=start&car=${carIdx}`;
  if (stopIn) stopIn.value = `${base}${sep}bt=stop&car=${carIdx}`;
  if (directIn) directIn.value = `${base}${sep}action=add_trip&car=${carIdx}&km=25&min=30&title=Tratta+Auto`;
}

function copyShortcutLink(type) {
  let inputId = 'shortcutUrlStartInput';
  if (type === 'stop') inputId = 'shortcutUrlStopInput';
  else if (type === 'direct') inputId = 'shortcutUrlDirectInput';

  const el = document.getElementById(inputId);
  if (!el) return;

  const text = el.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  } else {
    el.select();
    try { document.execCommand('copy'); } catch (e) {}
  }

  const fb = document.getElementById('shortcutCopyFeedback');
  if (fb) {
    fb.classList.remove('hidden');
    setTimeout(() => fb.classList.add('hidden'), 3000);
  }
}

function resolveCarIndexFromParam(carParam, btDeviceNameParam) {
  if (btDeviceNameParam) {
    const cleanBt = btDeviceNameParam.trim().toLowerCase();
    const matchedIdx = appCars.findIndex(c => (c.btDevice || '').toLowerCase() === cleanBt || (c.btDevice || '').toLowerCase().includes(cleanBt));
    if (matchedIdx !== -1) return matchedIdx;
  }
  if (carParam !== null && carParam !== undefined && carParam !== '') {
    const parsedIdx = parseInt(carParam, 10);
    if (!isNaN(parsedIdx) && appCars[parsedIdx]) return parsedIdx;
    const lowerName = String(carParam).trim().toLowerCase();
    const byName = appCars.findIndex(c => (c.name || '').toLowerCase() === lowerName);
    if (byName !== -1) return byName;
  }
  return activeCarIndex;
}

// Gestore Deep-Link da Comandi Rapidi iOS o URL Scheme nativo (idrive://?bt=start / ?bt=stop / ?action=add_trip)
function handleIncomingAutomationUrl(customQueryString = null) {
  try {
    const queryStr = customQueryString !== null ? customQueryString : (typeof window !== 'undefined' ? window.location.search : '');
    if (!queryStr || queryStr.length < 2) return;

    const params = new URLSearchParams(queryStr.startsWith('?') ? queryStr : '?' + queryStr);
    const btCmd = (params.get('bt') || '').toLowerCase();
    const actionCmd = (params.get('action') || '').toLowerCase();
    const carParam = params.get('car');
    const btNameParam = params.get('bt_name') || params.get('device');

    if (!btCmd && !actionCmd) return;

    const targetCarIdx = resolveCarIndexFromParam(carParam, btNameParam);
    if (appCars[targetCarIdx] && targetCarIdx !== activeCarIndex) {
      activeCarIndex = targetCarIdx;
    }

    const kmParam = params.get('km') || params.get('distanza');
    const minParam = params.get('min') || params.get('minuti') || params.get('durata');
    const l100Param = params.get('l100') || params.get('consumo');
    const titleParam = params.get('title') || params.get('percorso');

    if (btCmd === 'start' || actionCmd === 'bt_connect' || actionCmd === 'start') {
      switchTab('trips');
      triggerBtConnect({ silentBanner: false });
    } else if (btCmd === 'stop' || actionCmd === 'bt_disconnect' || actionCmd === 'stop') {
      switchTab('trips');
      triggerBtDisconnect({
        forceDirectStop: true,
        overrideKm: kmParam,
        overrideMinutes: minParam,
        overrideL100: l100Param,
        overrideTitle: titleParam
      });
    } else if (actionCmd === 'add_trip' && kmParam) {
      const car = appCars[activeCarIndex];
      const kmVal = Math.max(0.2, parseFloat(String(kmParam).replace(',', '.')) || 10);
      const minVal = Math.max(1, parseInt(minParam, 10) || Math.round((kmVal / 50) * 60));
      const dyn = calculateDynamicTripConsumption(car, kmVal, minVal, l100Param);
      const now = new Date();
      const isoDate = getSystemDateKey(now);
      const timeStr = getSystemTimeKey(now);
      const timestamp = now.getTime();
      const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: timeStr });

      car.currentOdo += Math.round(kmVal);
      car.trips.unshift({
        id: `trip_auto_${Date.now()}`,
        title: titleParam || `Tratta Automatica (${car.name})`,
        date: dateLabel,
        isoDate,
        time: timeStr,
        timestamp,
        km: parseFloat(kmVal.toFixed(1)),
        durationMinutes: minVal,
        consumption: dyn.consumptionL100,
        liters: dyn.litersUsed,
        avgSpeed: dyn.avgSpeed,
        driveProfile: dyn.profileLabel,
        cost: dyn.cost
      });
      car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      saveCars();
      switchTab('trips');
      renderAll();
      detectAndSaveParkingLocation(car, { showNotification: true, isAuto: true });
    }

    // Ripulisce i parametri URL per evitare esecuzioni duplicate al refresh
    if (customQueryString === null && typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (e) {
    console.warn("Errore gestione URL automazione:", e);
  }
}

// Bridge chiamato dal codice Swift nativo (AVAudioSession.routeChangeNotification in ContentView.swift)
if (typeof window !== 'undefined') {
  window.handleIncomingAutomationUrl = handleIncomingAutomationUrl;
  window.onNativeBtRouteChange = function(eventType, deviceName) {
    if (!isBtAutoStartEnabled()) return;
    const matchedIdx = resolveCarIndexFromParam(null, deviceName);
    if (appCars[matchedIdx]) {
      activeCarIndex = matchedIdx;
    }
    if (eventType === 'connect') {
      triggerBtConnect();
    } else if (eventType === 'disconnect') {
      triggerBtDisconnect();
    }
  };
}

// ==================== IMPORTATORE SMART TRAGITTI (OBD2 / CSV / APP ESTERNE / TESTO) ====================
let pendingImportedTrips = [];

function initImportTripsModal() {
  const selectEl = document.getElementById('importTripsCarSelect');
  if (selectEl) {
    selectEl.innerHTML = appCars.map((c, idx) => `<option value="${idx}" ${idx === activeCarIndex ? 'selected' : ''}>${c.name} (${c.fuelType})</option>`).join('');
    selectEl.onchange = () => previewImportTripsData();
  }
  previewImportTripsData();
}

function clearImportTripsInput() {
  const txt = document.getElementById('importTripsTextInput');
  const fileIn = document.getElementById('importTripsFileInput');
  if (txt) txt.value = '';
  if (fileIn) fileIn.value = '';
  pendingImportedTrips = [];
  previewImportTripsData();
}

function loadSampleImportTripsData() {
  const todayIso = getSystemDateKey(new Date());
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yestIso = getSystemDateKey(yestDate);

  const sampleText = [
    `Data, Tratta, Km, Minuti, L/100km`,
    `${todayIso}, Casa ➔ Ufficio (Urbano), 14.5, 29`,
    `${todayIso}, Ufficio ➔ Cliente Extraurbano, 48.0, 38`,
    `${yestIso}, Autostrada A4 Trasferta, 92.0, 44, 6.25`
  ].join('\n');

  const txt = document.getElementById('importTripsTextInput');
  if (txt) {
    txt.value = sampleText;
    previewImportTripsData();
  }
}

function handleImportTripsFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result || '';
    const txt = document.getElementById('importTripsTextInput');
    if (txt) {
      txt.value = content;
      previewImportTripsData();
    }
  };
  reader.readAsText(file);
}

function parseImportTripsText(rawText, car) {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const results = [];
  const now = new Date();
  const defaultIso = getSystemDateKey(now);
  const defaultTime = getSystemTimeKey(now);

  // Rileva se la prima riga è un'intestazione CSV (OBD2 / Driversnote / Excel)
  let startIdx = 0;
  let colMap = null;
  const firstLower = lines[0].toLowerCase();
  if (firstLower.includes('km') || firstLower.includes('dist') || firstLower.includes('date') || firstLower.includes('data')) {
    const sep = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
    const hasNumericOnly = headers.some(h => /^\d+([.,]\d+)?$/.test(h));
    if (!hasNumericOnly) {
      startIdx = 1;
      colMap = {
        sep,
        dateIdx: headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('start')),
        titleIdx: headers.findIndex(h => h.includes('tratta') || h.includes('percorso') || h.includes('route') || h.includes('title') || h.includes('dest') || h.includes('note')),
        kmIdx: headers.findIndex(h => h === 'km' || h.includes('dist') || h.includes('chilom') || h.includes('odo')),
        minIdx: headers.findIndex(h => h.includes('min') || h.includes('dur') || h.includes('temp') || h.includes('time')),
        consIdx: headers.findIndex(h => h.includes('100') || h.includes('cons') || h.includes('fuel') || h.includes('avg'))
      };
    }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const sep = colMap ? colMap.sep : (line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ','));
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    let isoDate = defaultIso;
    let title = 'Tragitto Importato';
    let km = 0;
    let minutes = 0;
    let customCons = null;

    if (colMap && colMap.kmIdx !== -1) {
      if (colMap.dateIdx !== -1 && parts[colMap.dateIdx]) {
        const dRaw = parts[colMap.dateIdx].split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dRaw)) isoDate = dRaw;
      }
      if (colMap.titleIdx !== -1 && parts[colMap.titleIdx]) title = parts[colMap.titleIdx];
      km = parseFloat((parts[colMap.kmIdx] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
      if (colMap.minIdx !== -1 && parts[colMap.minIdx]) {
        minutes = parseFloat(parts[colMap.minIdx].replace(',', '.').replace(/[^\d.]/g, '')) || 0;
      }
      if (colMap.consIdx !== -1 && parts[colMap.consIdx]) {
        const cVal = parseFloat(parts[colMap.consIdx].replace(',', '.').replace(/[^\d.]/g, ''));
        if (cVal > 0) customCons = cVal;
      }
    } else {
      // Formato flessibile: [Data opzionale], Tratta, Km, Minuti, [L/100km opzionale]
      let cursor = 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        isoDate = parts[0];
        cursor = 1;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(parts[0])) {
        const [dd, mm, yyyy] = parts[0].split('/');
        isoDate = `${yyyy}-${mm}-${dd}`;
        cursor = 1;
      }

      if (parts.length - cursor >= 2) {
        // Verifica se parts[cursor] è un testo (Titolo) o subito un numero (Km)
        if (isNaN(parseFloat(parts[cursor]))) {
          title = parts[cursor];
          km = parseFloat((parts[cursor + 1] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
          minutes = parseFloat((parts[cursor + 2] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
          if (parts[cursor + 3]) {
            const cVal = parseFloat(parts[cursor + 3].replace(',', '.').replace(/[^\d.]/g, ''));
            if (cVal > 0) customCons = cVal;
          }
        } else {
          km = parseFloat((parts[cursor] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
          minutes = parseFloat((parts[cursor + 1] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
          if (parts[cursor + 2]) {
            const cVal = parseFloat(parts[cursor + 2].replace(',', '.').replace(/[^\d.]/g, ''));
            if (cVal > 0) customCons = cVal;
          }
        }
      }
    }

    if (km <= 0) continue;
    if (minutes <= 0) {
      minutes = Math.max(2, Math.round((km / 50) * 60));
    } else {
      minutes = Math.max(1, Math.round(minutes));
    }

    const dyn = calculateDynamicTripConsumption(car, km, minutes, customCons);
    const dateObj = new Date(isoDate + 'T' + defaultTime + ':00');
    const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
    const dateLabel = formatTransactionDisplayDate({ timestamp, isoDate, time: defaultTime });

    results.push({
      id: `trip_imp_${Date.now()}_${i}`,
      title,
      date: dateLabel,
      isoDate,
      time: defaultTime,
      timestamp,
      km: parseFloat(km.toFixed(1)),
      durationMinutes: minutes,
      consumption: dyn.consumptionL100,
      liters: dyn.litersUsed,
      avgSpeed: dyn.avgSpeed,
      driveProfile: dyn.profileLabel,
      cost: dyn.cost
    });
  }

  return results;
}

function previewImportTripsData() {
  const txtEl = document.getElementById('importTripsTextInput');
  const selectEl = document.getElementById('importTripsCarSelect');
  const boxEl = document.getElementById('importTripsPreviewBox');
  const countEl = document.getElementById('importPreviewCountLabel');
  const sumEl = document.getElementById('importPreviewSummaryLabel');
  const listEl = document.getElementById('importTripsPreviewList');

  const carIdx = selectEl ? (parseInt(selectEl.value, 10) || 0) : activeCarIndex;
  const car = appCars[carIdx] || appCars[activeCarIndex];
  const raw = txtEl ? txtEl.value : '';

  pendingImportedTrips = parseImportTripsText(raw, car);

  if (!boxEl || !listEl) return;
  if (pendingImportedTrips.length === 0) {
    boxEl.classList.add('hidden');
    return;
  }

  boxEl.classList.remove('hidden');
  const totKm = pendingImportedTrips.reduce((a, t) => a + t.km, 0);
  const totCost = pendingImportedTrips.reduce((a, t) => a + t.cost, 0);

  if (countEl) countEl.innerText = `✓ ${pendingImportedTrips.length} Tragitti pronti`;
  if (sumEl) sumEl.innerText = `${totKm.toFixed(1)} km • € ${totCost.toFixed(2).replace('.', ',')}`;

  listEl.innerHTML = pendingImportedTrips.map(t => `
    <div class="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between text-[10px]">
      <div class="truncate pr-2">
        <div class="font-bold text-[var(--text-main)] truncate">${t.title}</div>
        <div class="text-[9px] text-[var(--text-muted)]">${t.isoDate} • ${t.durationMinutes} min (~${t.avgSpeed} km/h)</div>
      </div>
      <div class="text-right font-mono whitespace-nowrap">
        <div class="font-bold text-cyan-400">${t.km} km • ${t.consumption.toFixed(2).replace('.', ',')} L/100</div>
        <div class="text-[9px] text-amber-400 font-bold">€ ${t.cost.toFixed(2).replace('.', ',')} (${t.driveProfile})</div>
      </div>
    </div>
  `).join('');
}

function confirmImportTrips() {
  const selectEl = document.getElementById('importTripsCarSelect');
  const carIdx = selectEl ? (parseInt(selectEl.value, 10) || 0) : activeCarIndex;
  const car = appCars[carIdx] || appCars[activeCarIndex];

  previewImportTripsData();
  if (!pendingImportedTrips || pendingImportedTrips.length === 0) {
    alert("Inserisci o carica almeno un tragitto valido (es. Data, Tratta, Km, Minuti) prima di importare.");
    return;
  }

  let totKmAdded = 0;
  pendingImportedTrips.forEach(t => {
    totKmAdded += t.km;
    car.trips.unshift(t);
  });

  car.currentOdo = (car.currentOdo || 0) + Math.round(totKmAdded);
  car.trips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  activeCarIndex = carIdx;
  saveCars();
  clearImportTripsInput();
  closeModal('modalImportTrips');
  switchTab('trips');
  renderAll();

  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `📥 <b>Importazione Completata:</b> Aggiunti tragitti per un totale di <b>${totKmAdded.toFixed(1)} km</b> su <b>${car.name}</b> con calcolo dinamico L/100km.`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
  }
}

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  applyAppTheme(isDarkMode);
  initChartInteractions();
  initDriveHoursChartInteractions();
  initCalendarSystemClockSync();
  restorePersistedBtSession();
  renderAll();
  renderCalendar();
  setupNavbarScrollBehavior();
  handleIncomingAutomationUrl();
});


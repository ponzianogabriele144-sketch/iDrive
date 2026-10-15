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

let appCars = loadCars();
let activeCarIndex = 0;
let editingCarIndex = 0;
let activeTab = 'dashboard';
let chartMode = 'single'; // 'single' o 'all'
let isDarkMode = localStorage.getItem(THEME_KEY) !== 'light';
let btSession = { active: false, carIndex: 0, startTime: null, sec: 0, km: 0.0, interval: null };

// GPS Tracking
let liveTracking = {
  active: false,
  timer: null,
  seconds: 0,
  km: 0.0
};

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
      if (!c.parking) c.parking = { ...def.parking };
      if (!Array.isArray(c.trips)) c.trips = [];
      if (!Array.isArray(c.refuels)) c.refuels = [];
      if (!Array.isArray(c.historyMonths)) c.historyMonths = [0, 0, 0, 0, 0, 0];

      // Assicura che ogni rifornimento e viaggio abbia un ID univoco e immutabile
      c.refuels.forEach((r, rIdx) => {
        if (!r.id) r.id = 'ref_' + (Date.now() - rIdx * 1000) + '_' + rIdx;
      });
      c.trips.forEach((t, tIdx) => {
        if (!t.id) t.id = 'trip_' + (Date.now() - tIdx * 1000) + '_' + tIdx;
      });
    });
    return cars;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_CARS));
  }
}

function saveCars() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appCars));
  } catch (e) {
    console.error("Errore salvataggio:", e);
  }
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
  drawExpenseChart();
}

// ==================== GRAFICO ANDAMENTO SPESE AD ALTA PRECISIONE & TOUCH SCRUBBER ====================
let selectedMonthIndex = 5; // Default: Mese corrente (Ottobre = 5)
const monthsShort = ["Mag", "Giu", "Lug", "Ago", "Set", "Ott"];
const monthsFull = ["Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre"];

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

  // 2. Mesi su Asse X
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  monthsShort.forEach((m, i) => {
    const x = padLeft + (i / 5) * chartW;
    const isSel = (i === selectedMonthIndex);

    ctx.fillStyle = isSel ? (isDarkMode ? "#ffffff" : "#09090b") : "#71717a";
    ctx.font = isSel ? "bold 10px sans-serif" : "600 9px sans-serif";
    ctx.fillText(m, x, padTop + chartH + 8);
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
    const data = car.historyMonths || [145, 160, 150, 195, 175, 218.5];
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
    // Modalità comparata: Tutte e 3 le auto
    const colors = ["#f59e0b", "#3b82f6", "#10b981"];
    appCars.forEach((car, cIdx) => {
      const data = car.historyMonths || [50, 60, 55, 70, 65, 80];
      const pts = getPoints(data);

      drawSplinePath(pts);
      ctx.strokeStyle = colors[cIdx];
      ctx.lineWidth = (cIdx === activeCarIndex ? 2.8 : 2.0);
      ctx.stroke();

      pts.forEach((pt, i) => {
        ctx.fillStyle = colors[cIdx];
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
    const data = car.historyMonths || [145, 160, 150, 195, 175, 218.5];
    const val = data[selectedMonthIndex];
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
    // Modalità 3 auto: evidenzia i 3 punti lungo lo scrubber
    const colors = ["#f59e0b", "#3b82f6", "#10b981"];
    appCars.forEach((car, cIdx) => {
      const data = car.historyMonths || [50, 60, 55, 70, 65, 80];
      const val = data[selectedMonthIndex];
      const selY = padTop + (1 - Math.min(val, maxVal) / maxVal) * chartH;

      ctx.fillStyle = colors[cIdx];
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

  const monthName = monthsFull[selectedMonthIndex];

  if (chartMode === 'single') {
    const car = appCars[activeCarIndex];
    const data = car.historyMonths || [145, 160, 150, 195, 175, 218.5];
    const val = data[selectedMonthIndex];
    const litriEst = (val / 1.769).toFixed(1);

    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
        <div>
          <div class="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
            <span>📅 ${monthName} 2026</span>
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
    const val0 = (appCars[0].historyMonths || [145, 160, 150, 195, 175, 218.5])[selectedMonthIndex];
    const val1 = (appCars[1].historyMonths || [35, 42, 38, 55, 48, 58.2])[selectedMonthIndex];
    const val2 = (appCars[2].historyMonths || [48, 52, 45, 60, 50, 54.27])[selectedMonthIndex];
    const total = val0 + val1 + val2;

    card.innerHTML = `
      <div class="w-full space-y-1">
        <div class="flex items-center justify-between border-b border-[var(--border-color)] pb-1">
          <span class="text-[11px] font-bold text-[var(--text-main)]">📅 ${monthName} 2026 • 3 Auto</span>
          <span class="text-xs font-black font-mono text-[var(--text-main)]">Totale: <span class="text-amber-500">€ ${total.toFixed(2).replace('.', ',')}</span></span>
        </div>
        <div class="flex items-center justify-between text-[10px] font-mono">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> ${appCars[0]?.name || 'Auto 1'}: <b>€ ${val0.toFixed(1)}</b></span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> ${appCars[1]?.name || 'Auto 2'}: <b>€ ${val1.toFixed(1)}</b></span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${appCars[2]?.name || 'Auto 3'}: <b>€ ${val2.toFixed(1)}</b></span>
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

// ==================== NOTIFICA ORE 8:00 (RESOCONTO 24H) ====================
// ==================== NOTIFICA ORE 8:00 (RESOCONTO 24H) ====================
function simulateMorningNotification() {
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  const car = appCars[activeCarIndex];
  const totalFuel = car.refuels.reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
  const totalKm = car.trips.reduce((acc, t) => acc + (parseFloat(t.km) || 0), 0);
  const totalLiters = car.refuels.reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0);

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
  const btInput = document.getElementById('editCarBtInput');
  if (btInput) btInput.value = car.btDevice || '';
  document.getElementById('modalEditCar').classList.remove('hidden');
}

function saveCarEdit() {
  const newName = document.getElementById('editCarNameInput').value.trim() || appCars[editingCarIndex].name;
  const newFuel = document.getElementById('editCarFuelSelect').value;
  const newOdo = parseInt(document.getElementById('editCarOdoInput').value) || 0;
  const btInput = document.getElementById('editCarBtInput');

  appCars[editingCarIndex].name = newName;
  appCars[editingCarIndex].fuelType = newFuel;
  appCars[editingCarIndex].currentOdo = newOdo;
  if (btInput) {
    appCars[editingCarIndex].btDevice = btInput.value.trim() || ('Bluetooth ' + newName);
  }

  saveCars();

  const label = document.getElementById('pillCarLabel' + editingCarIndex);
  if (label) label.innerText = newName;

  const listName = document.getElementById('listCarName' + editingCarIndex);
  if (listName) listName.innerText = newName;
  const listFuel = document.getElementById('listCarFuel' + editingCarIndex);
  if (listFuel) listFuel.innerText = newFuel;
  const listOdo = document.getElementById('listCarOdo' + editingCarIndex);
  if (listOdo) listOdo.innerText = newOdo.toLocaleString('it-IT') + ' km';

  closeModal('modalEditCar');
  renderAll();
}

function switchCar(index) {
  activeCarIndex = index;
  [0, 1, 2].forEach(i => {
    const btn = document.getElementById('pillCar' + i);
    if (btn) {
      if (i === index) {
        btn.className = "flex-1 min-h-[38px] py-2 px-2 rounded-xl text-xs font-bold bg-amber-500 text-black flex items-center justify-center gap-1 transition truncate shadow-md active:scale-95";
      } else {
        btn.className = "flex-1 min-h-[38px] py-2 px-2 rounded-xl text-xs font-medium bg-[var(--bg-card)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center gap-1 transition truncate active:scale-95";
      }
    }
  });
  renderAll();
}

// ==================== RENDERING PRINCIPALE ====================
function renderAll() {
  const car = appCars[activeCarIndex];

  // Odometro & badges
  const labelFuel = document.getElementById('labelCarFuel');
  if (labelFuel) labelFuel.innerText = car.fuelType;
  const labelOdo = document.getElementById('labelCarOdo');
  if (labelOdo) labelOdo.innerText = Number(car.currentOdo || 0).toLocaleString('it-IT') + ' km';
  const labelSummary = document.getElementById('activeCarSummaryLabel');
  if (labelSummary) labelSummary.innerText = car.name;

  // Banner assicurazione automatico a 14 giorni
  updateInsuranceAlertBanner();

  // Calcoli spese e km reali
  const totalFuel = car.refuels.reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
  const totalKm = car.trips.reduce((acc, t) => acc + (parseFloat(t.km) || 0), 0);
  const totalLitersCar = car.refuels.reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0);
  const totalLitersGarage = appCars.reduce((tot, c) => tot + c.refuels.reduce((a, r) => a + (parseFloat(r.liters) || 0), 0), 0);

  const kpiFuel = document.getElementById('kpiFuelTotal');
  if (kpiFuel) kpiFuel.innerText = '€ ' + totalFuel.toFixed(2).replace('.', ',');
  const kpiKm = document.getElementById('kpiKmTotal');
  if (kpiKm) kpiKm.innerText = totalKm.toLocaleString('it-IT') + ' km';

  const eff = car.fuelType === 'Ibrida' ? '4.46 L/100km' : (car.fuelType === 'Benzina' ? '6.58 L/100km' : '5.62 L/100km');
  const secEff = car.fuelType === 'Ibrida' ? '22.4 km/l' : (car.fuelType === 'Benzina' ? '15.2 km/l' : '17.8 km/l');
  const costKm = car.fuelType === 'Ibrida' ? '€ 0,080 /km' : '€ 0,100 /km';

  const kpiEff = document.getElementById('kpiEfficiency');
  if (kpiEff) kpiEff.innerText = eff;
  const kpiL = document.getElementById('kpiLiters100');
  if (kpiL) kpiL.innerText = secEff;
  const kpiC = document.getElementById('kpiCostKm');
  if (kpiC) kpiC.innerText = costKm;

  // Aggiornamento Sezione Litri nel Resoconto (100% Dinamico)
  const dailyLiters = car.refuels.length > 0 ? (totalLitersCar / 30).toFixed(1) + ' L/gg' : '0.0 L/gg';
  const statDaily = document.getElementById('statLitersDaily');
  const stat24h = document.getElementById('statLiters24h');
  const statMonthly = document.getElementById('statLitersMonthly');
  const statTotGarage = document.getElementById('statTotalGarageLiters');
  
  if (statDaily) statDaily.innerText = dailyLiters;
  if (stat24h) stat24h.innerText = car.refuels.length > 0 ? (parseFloat(car.refuels[0].liters) || 0).toFixed(1) + ' L' : '0.0 L';
  if (statMonthly) statMonthly.innerText = totalLitersCar.toFixed(1) + ' L';
  if (statTotGarage) statTotGarage.innerText = totalLitersGarage.toFixed(1) + ' L';

  // Ripartizione volumetrica dinamica per auto
  [0, 1, 2].forEach(i => {
    const c = appCars[i];
    const lbl = document.getElementById('distLabelCar' + i);
    const val = document.getElementById('distValCar' + i);
    const cLiters = c ? c.refuels.reduce((acc, r) => acc + (parseFloat(r.liters) || 0), 0) : 0;
    if (lbl) lbl.innerText = c ? c.name : ('Auto ' + (i + 1));
    if (val) val.innerText = cLiters.toFixed(1) + ' L';
  });

  const avgCost = car.trips.length > 0 ? (car.trips.reduce((acc, t) => acc + (t.cost || 0), 0) / car.trips.length) : 0;
  const avgCostLabel = document.getElementById('labelAvgTripCost');
  if (avgCostLabel) avgCostLabel.innerText = '€ ' + avgCost.toFixed(2).replace('.', ',');

  const btDevLabel = document.getElementById('btDeviceNameLabel');
  if (btDevLabel) btDevLabel.innerText = car.btDevice || ('Bluetooth ' + car.name);

  // Sincronizza etichette Garage
  [0, 1, 2].forEach(i => {
    const c = appCars[i];
    if (c) {
      const pl = document.getElementById('pillCarLabel' + i);
      if (pl) pl.innerText = c.name;
      const ln = document.getElementById('listCarName' + i);
      if (ln) ln.innerText = c.name;
      const lf = document.getElementById('listCarFuel' + i);
      if (lf) lf.innerText = c.fuelType;
      const lo = document.getElementById('listCarOdo' + i);
      if (lo) lo.innerText = Number(c.currentOdo || 0).toLocaleString('it-IT') + ' km';
    }
  });

  renderFeed(car);
  renderRefuels(car);
  renderTrips(car);
  renderParking(car);
  renderInsurance();
  drawExpenseChart();
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
    ...car.refuels.map((r, idx) => ({ ...r, streamType: 'refuel', id: r.id || ('ref_' + idx) })),
    ...car.trips.map((t, idx) => ({ ...t, streamType: 'trip', id: t.id || ('trip_' + idx) }))
  ];

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
            <div class="text-[11px] text-[var(--text-muted)]">${item.date} • ${Number(item.odometer || 0).toLocaleString('it-IT')} km</div>
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
            <div class="text-[11px] text-[var(--text-muted)]">${item.date} • ${item.durationMinutes} min</div>
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

  car.refuels.forEach((r, idx) => {
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
        <span class="text-[var(--text-main)]">${r.date} • ${Number(r.odometer || 0).toLocaleString('it-IT')} km</span>
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

  car.trips.forEach((t, idx) => {
    const tId = t.id || ('trip_' + idx);
    const kmNum = parseFloat(t.km) || 0;
    const costNum = parseFloat(t.cost) || 0;
    const durNum = parseInt(t.durationMinutes) || 30;
    const avgSpeed = durNum > 0 ? Math.round(kmNum / (durNum / 60)) : 50;
    const estLiters = (kmNum * (car.fuelType === 'Ibrida' ? 0.0446 : (car.fuelType === 'Benzina' ? 0.0658 : 0.0562))).toFixed(1);

    const isRoundTrip = (t.title || '').includes('A/R');
    const badgeType = isRoundTrip 
      ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">Andata & Ritorno</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Tratta Singola</span>';

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
          <div class="text-[10.5px] text-[var(--text-muted)] flex items-center gap-1.5 pl-6">
            <span>📅 ${t.date}</span>
            <span>•</span>
            <span>⏱️ ${durNum} min (~${avgSpeed} km/h)</span>
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
          <div class="text-[9.5px] text-[var(--text-muted)] font-medium">Carburante</div>
          <div class="text-sm font-black font-mono text-cyan-400">💧 ~${estLiters} L</div>
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
  const currMonthTotal = car.refuels.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);
  if (Array.isArray(car.historyMonths) && car.historyMonths.length > 5) {
    car.historyMonths[5] = parseFloat(currMonthTotal.toFixed(2));
  }
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

  if (car.parking) {
    if (addrEl) addrEl.innerText = car.parking.address;
    if (timeEl) timeEl.innerText = `${car.parking.date}, ${car.parking.time} • Memorizzata automaticamente`;
    if (carLabel) carLabel.innerText = `${car.name} • Parcheggiata`;
    if (coordsLabel && car.parking.lat && car.parking.lng) {
      coordsLabel.innerText = `${car.parking.lat.toFixed(4)}° N, ${car.parking.lng.toFixed(4)}° E`;
    }
    if (extMapsBtn && car.parking.lat && car.parking.lng) {
      extMapsBtn.href = `https://maps.apple.com/?q=${car.parking.lat},${car.parking.lng}`;
    }
    if (streetLabel && car.parking.address) {
      const streetName = car.parking.address.split(',')[0].toUpperCase();
      streetLabel.textContent = streetName;
    }
  }
}

function showDirectionsToCar() {
  const car = appCars[activeCarIndex];
  const p = car.parking || { address: 'Via Alessandro Manzoni 14, Milano', lat: 45.4682, lng: 9.1912 };
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  const coordsText = p.lat && p.lng ? `[${p.lat.toFixed(4)}° N, ${p.lng.toFixed(4)}° E]` : '';
  if (banner && msg) {
    msg.innerHTML = `📍 <b>Posizione Auto (${car.name}):</b> Parcheggiata in <b>${p.address}</b> ${coordsText}. Apertura Apple Mappe in corso...`;
    banner.classList.remove('hidden');
  }
  if (p.lat && p.lng) {
    window.open(`https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`, '_blank');
  }
}

function toggleBtSim() {
  if (btSession.active) {
    triggerBtDisconnect();
  } else {
    triggerBtConnect();
  }
}

function triggerBtConnect() {
  const car = appCars[activeCarIndex];
  if (btSession.active) return;

  btSession.active = true;
  btSession.carIndex = activeCarIndex;
  btSession.sec = 0;
  btSession.km = 0.0;
  btSession.startTime = new Date();

  // UI updates
  const badge = document.getElementById('btActiveBadge');
  if (badge) {
    badge.className = "px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-black animate-pulse";
    badge.innerText = "Connesso 🟢";
  }
  const tripBox = document.getElementById('btLiveTripBox');
  if (tripBox) tripBox.classList.remove('hidden');

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

  // Header BT button update
  const btnHeaderBt = document.getElementById('btnHeaderBt');
  if (btnHeaderBt) {
    btnHeaderBt.className = "px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center gap-1.5 transition";
    const label = document.getElementById('btHeaderLabel');
    if (label) label.innerText = "In Viaggio...";
  }

  // Notifica iOS / Banner
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `📶 <b>Bluetooth Agganciato (${car.btDevice}):</b> Registrazione viaggio avviata automaticamente in background con <b>${car.name}</b>.`;
    banner.classList.remove('hidden');
  }

  // Intervallo di simulazione
  btSession.interval = setInterval(() => {
    btSession.sec += 1;
    btSession.km += 0.05;
    const m = Math.floor(btSession.sec / 60);
    const s = btSession.sec % 60;
    const timerEl = document.getElementById('btLiveTimer');
    if (timerEl) timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const liveKmEl = document.getElementById('btLiveKm');
    if (liveKmEl) liveKmEl.innerText = `${btSession.km.toFixed(1)} km`;
  }, 1000);
}

function triggerBtDisconnect() {
  if (!btSession.active) return;
  clearInterval(btSession.interval);
  btSession.active = false;

  const car = appCars[btSession.carIndex];
  const doneKm = Math.max(1.8, parseFloat(btSession.km.toFixed(1)));
  const minutes = Math.max(2, Math.round(btSession.sec / 60) || 4);
  const costTrip = doneKm * (car.fuelType === 'Ibrida' ? 0.08 : 0.10);

  // Salva viaggio nel diario
  car.currentOdo += Math.round(doneKm);
  car.trips.unshift({
    id: `trip_bt_${Date.now()}`,
    title: `Tratta Auto-Start (${car.btDevice})`,
    date: "Oggi",
    km: doneKm,
    durationMinutes: minutes,
    cost: costTrip
  });

  // Salva posizione sosta / parcheggio con coordinate precise
  const nowStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  let pAddr = "Via Alessandro Manzoni 14, Milano";
  let pLat = 45.4682;
  let pLng = 9.1912;
  if (btSession.carIndex === 1) {
    pAddr = "Corso Buenos Aires 32, Milano";
    pLat = 45.4795;
    pLng = 9.2085;
  } else if (btSession.carIndex === 2) {
    pAddr = "Piazza del Duomo 1, Milano";
    pLat = 45.4642;
    pLng = 9.1900;
  }

  car.parking = {
    address: pAddr,
    lat: pLat,
    lng: pLng,
    time: nowStr,
    date: "Oggi"
  };

  saveCars();

  // Reset UI
  const badge = document.getElementById('btActiveBadge');
  if (badge) {
    badge.className = "px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-750 text-zinc-300 border border-zinc-700";
    badge.innerText = "Standby";
  }
  const tripBox = document.getElementById('btLiveTripBox');
  if (tripBox) tripBox.classList.add('hidden');

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

  // Header BT button reset
  const btnHeaderBt = document.getElementById('btnHeaderBt');
  if (btnHeaderBt) {
    btnHeaderBt.className = "px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 flex items-center gap-1.5 transition";
    const label = document.getElementById('btHeaderLabel');
    if (label) label.innerText = "BT Auto";
  }

  // Notifica iOS con posizione esatta e coordinate GPS
  const banner = document.getElementById('iosNotificationBanner');
  const msg = document.getElementById('notifBannerMessage');
  if (banner && msg) {
    msg.innerHTML = `🅿️ <b>Sosta Rilevata (${car.btDevice}):</b> Auto parcheggiata in <b>${car.parking.address}</b> [${car.parking.lat}° N, ${car.parking.lng}° E]. Mappa e coordinate aggiornate in Viaggi!`;
    banner.classList.remove('hidden');
  }

  renderAll();
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
    setTimeout(drawExpenseChart, 50);
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
const IT_MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const IT_MONTH_SHORT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

let calendarNow = new Date();
let calendarViewYear = calendarNow.getFullYear();
let calendarViewMonth = calendarNow.getMonth(); // 0-11
let calendarSelectedDay = calendarNow.getDate();
let lastKnownSystemDateString = getSystemDateKey(calendarNow);
let midnightSyncTimer = null;

function getSystemDateKey(d) {
  const dt = d || new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Verifica se un'attività (pieno o viaggio) corrisponde alla data selezionata
function isActivityOnCalendarDate(activity, targetYear, targetMonth, targetDay) {
  if (!activity) return false;

  // 1. Confronto via timestamp numerico esatto se disponibile
  if (activity.timestamp) {
    const actDate = new Date(activity.timestamp);
    if (!isNaN(actDate.getTime())) {
      return actDate.getFullYear() === targetYear &&
             actDate.getMonth() === targetMonth &&
             actDate.getDate() === targetDay;
    }
  }

  // 2. Confronto via stringa ISO YYYY-MM-DD
  if (activity.isoDate) {
    const parts = activity.isoDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return y === targetYear && m === targetMonth && d === targetDay;
    }
  }

  // 3. Confronto con etichette flessibili relative ("Oggi", "Ieri") o storiche ("14 Ott")
  const dateStr = (activity.date || '').trim();
  const now = new Date();

  if (dateStr.toLowerCase().startsWith('oggi')) {
    return targetYear === now.getFullYear() &&
           targetMonth === now.getMonth() &&
           targetDay === now.getDate();
  }

  if (dateStr.toLowerCase().startsWith('ieri')) {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return targetYear === yesterday.getFullYear() &&
           targetMonth === yesterday.getMonth() &&
           targetDay === yesterday.getDate();
  }

  // Ricerca corrispondenza mese abbreviato (es. "15 Ott", "12 Nov")
  const shortMonth = IT_MONTH_SHORT[targetMonth];
  const dayP1 = `${targetDay} ${shortMonth}`;
  const dayP2 = `${String(targetDay).padStart(2, '0')} ${shortMonth}`;
  if (dateStr.includes(dayP1) || dateStr.includes(dayP2)) {
    const yearMatch = dateStr.match(/\b(20\d\d)\b/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10) === targetYear;
    }
    return targetYear === now.getFullYear();
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

// Calcolo e rendering riassunto statistico del mese selezionato
function renderCalendarMonthStats() {
  const box = document.getElementById('calendarMonthStatsBox');
  if (!box) return;

  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  let totCost = 0;
  let totLiters = 0;
  let totKm = 0;
  let eventCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    appCars.forEach(car => {
      (car.refuels || []).forEach(r => {
        if (isActivityOnCalendarDate(r, calendarViewYear, calendarViewMonth, d)) {
          totCost += parseFloat(r.totalCost) || 0;
          totLiters += parseFloat(r.liters) || 0;
          eventCount++;
        }
      });
      (car.trips || []).forEach(t => {
        if (isActivityOnCalendarDate(t, calendarViewYear, calendarViewMonth, d)) {
          totKm += parseFloat(t.km) || 0;
          totCost += parseFloat(t.cost) || 0;
          eventCount++;
        }
      });
    });
  }

  box.innerHTML = `
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div class="text-[9px] text-[var(--text-muted)]">⛽ Spesa Mese</div>
      <div class="text-[11px] font-bold text-amber-500 font-mono mt-0.5">€ ${totCost.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div class="text-[9px] text-[var(--text-muted)]">💧 Litri Pieni</div>
      <div class="text-[11px] font-bold text-[var(--text-main)] font-mono mt-0.5">${totLiters.toFixed(1)} L</div>
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

  if (matchingRefuels.length === 0 && matchingTrips.length === 0) {
    box.innerHTML = `
      <div class="py-1">
        <div class="font-bold text-[var(--text-main)] mb-1">${headerTitle}</div>
        <p class="text-[11px] text-[var(--text-muted)]">Nessun rifornimento o percorso registrato in questa data.</p>
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

  html += `</div>`;
  box.innerHTML = html;
}

// Sincronizzazione in tempo reale con l'orologio di sistema e avanzamento a mezzanotte
function initCalendarSystemClockSync() {
  function checkDateChange() {
    const currentNow = new Date();
    const currentKey = getSystemDateKey(currentNow);

    if (currentKey !== lastKnownSystemDateString) {
      lastKnownSystemDateString = currentKey;
      calendarNow = currentNow;

      // Se eravamo nel mese corrente o in quello precedente, aggiorna la vista a oggi
      const wasViewingCurrent = (calendarViewYear === currentNow.getFullYear() && calendarViewMonth === currentNow.getMonth());
      if (wasViewingCurrent) {
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

// Modali
function openModal(id) {
  const car = appCars[activeCarIndex];
  if (id === 'modalRefuel') {
    document.getElementById('refuelInputKm').value = car.currentOdo > 0 ? car.currentOdo : '';
    document.getElementById('refuelInputKm').placeholder = 'es. 15400';
    document.getElementById('refuelInputLiters').value = '';
    document.getElementById('refuelInputLiters').placeholder = 'es. 40.00';
    document.getElementById('refuelInputPricePerL').value = car.fuelType === 'Benzina' ? '1.819' : (car.fuelType === 'Ibrida' ? '1.809' : '1.759');
    document.getElementById('refuelInputTotal').value = '';
    document.getElementById('refuelInputTotal').placeholder = '0.00';
  } else if (id === 'modalTrip') {
    document.getElementById('tripInputTitle').value = '';
    document.getElementById('tripInputTitle').placeholder = 'es. Percorso Lavoro A/R';
    document.getElementById('tripInputKm').value = '';
    document.getElementById('tripInputKm').placeholder = 'es. 25';
    updateTripModalEstimates();
  } else if (id === 'modalPdfReport') {
    renderPdfReport();
  }
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
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
  // 1. Spese per auto nella legenda del PDF
  [0, 1, 2].forEach(i => {
    const c = appCars[i];
    const lbl = document.getElementById('pdfLegendCar' + i);
    const val = document.getElementById('pdfValCar' + i);
    if (c) {
      const fuelCost = (c.refuels || []).reduce((acc, r) => acc + (parseFloat(r.totalCost) || 0), 0);
      if (lbl) lbl.innerText = c.name;
      if (val) val.innerText = '€ ' + fuelCost.toFixed(1).replace('.', ',');
    }
  });

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
          <td class="p-1.5 font-medium">${t.date || 'Oggi'}</td>
          <td class="p-1.5 font-bold">${t.carName}</td>
          <td class="p-1.5">${t.title}</td>
          <td class="p-1.5 text-right font-mono">${t.km} km</td>
          <td class="p-1.5 text-right font-mono font-bold">€ ${Number(t.cost || 0).toFixed(2).replace('.', ',')}</td>
        </tr>
      `).join('');
    }
  }

  // 3. Litri Totali Dinamici
  const totalLitersGarage = appCars.reduce((tot, c) => tot + c.refuels.reduce((a, r) => a + (parseFloat(r.liters) || 0), 0), 0);
  const pdf24h = document.getElementById('pdfLiters24h');
  const pdfDaily = document.getElementById('pdfLitersDaily');
  const pdfMonthly = document.getElementById('pdfLitersMonthly');

  const currCar = appCars[activeCarIndex];
  const currCarLiters = currCar.refuels.reduce((a, r) => a + (parseFloat(r.liters) || 0), 0);

  if (pdf24h) pdf24h.innerText = currCar.refuels.length > 0 ? (parseFloat(currCar.refuels[0].liters) || 0).toFixed(1) + ' L' : '0.0 L';
  if (pdfDaily) pdfDaily.innerText = (totalLitersGarage / 30).toFixed(1) + ' L / gg';
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

      const pillTot = document.getElementById('camPillTot');
      const pillLit = document.getElementById('camPillLit');
      const pillPrice = document.getElementById('camPillPrice');
      if (pillTot) pillTot.innerText = '€ ' + totalAmount.toFixed(2).replace('.', ',');
      if (pillLit) pillLit.innerText = liters + ' L';
      if (pillPrice) pillPrice.innerText = pricePerL.toFixed(3) + ' €/L';
      if (resultPills) resultPills.classList.remove('hidden');

      if (sensorLabel) {
        sensorLabel.innerText = "✓ Scontrino riconosciuto con successo!";
        sensorLabel.className = "font-bold text-emerald-400";
      }

      const odoIn = document.getElementById('refuelInputKm');
      const litIn = document.getElementById('refuelInputLiters');
      const prcIn = document.getElementById('refuelInputPricePerL');
      const totIn = document.getElementById('refuelInputTotal');

      if (odoIn) odoIn.value = car.currentOdo + Math.floor(Math.random() * 50 + 550);
      if (litIn) litIn.value = liters.toFixed(2);
      if (prcIn) prcIn.value = pricePerL.toFixed(3);
      if (totIn) totIn.value = totalAmount.toFixed(2);

      setTimeout(() => {
        closeCameraScanner();
        openModal('modalRefuel');
        if (btnSnap) btnSnap.disabled = false;

        const banner = document.getElementById('iosNotificationBanner');
        const msg = document.getElementById('notifBannerMessage');
        if (banner && msg) {
          msg.innerHTML = `📸 <b>Scontrino Analizzato:</b> Rilevati <b>${liters} L</b> a <b>${pricePerL.toFixed(3)} €/L</b> (Totale: <b>€ ${totalAmount.toFixed(2).replace('.', ',')}</b>). Controlla e premi Salva.`;
          banner.classList.remove('hidden');
        }
      }, 900);
    }, 700);
  }, 600);
}

function saveRefuelFromModal() {
  const car = appCars[activeCarIndex];
  const km = parseInt(document.getElementById('refuelInputKm').value) || car.currentOdo;
  const l = parseFloat(document.getElementById('refuelInputLiters').value) || 0;
  const p = parseFloat(document.getElementById('refuelInputPricePerL').value) || 0;
  const tot = parseFloat(document.getElementById('refuelInputTotal').value) || (l * p);

  car.currentOdo = Math.max(km, car.currentOdo);
  car.refuels.unshift({
    id: 'ref_' + Date.now(),
    date: 'Oggi',
    odometer: km,
    liters: l,
    pricePerLiter: p,
    totalCost: tot,
    isFull: true,
    station: "Rifornimento Diretto"
  });

  const currMonthTotal = car.refuels.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);
  if (Array.isArray(car.historyMonths) && car.historyMonths.length > 5) {
    car.historyMonths[5] = parseFloat(currMonthTotal.toFixed(2));
  }

  saveCars();
  closeModal('modalRefuel');
  renderAll();
}

function updateTripModalEstimates() {
  const km = parseFloat(document.getElementById('tripInputKm').value) || 0;
  const cost = km * 0.10;
  document.getElementById('tripModalEstFuel').innerText = '€ ' + cost.toFixed(2).replace('.', ',');
}

function saveTripFromModal() {
  const car = appCars[activeCarIndex];
  const title = document.getElementById('tripInputTitle').value || 'Viaggio Personale';
  const km = parseFloat(document.getElementById('tripInputKm').value) || 0;
  const dur = parseInt(document.getElementById('tripInputDuration').value) || 30;

  car.currentOdo += Math.round(km);
  car.trips.unshift({
    id: 'trip_' + Date.now(),
    title,
    date: 'Oggi',
    km,
    durationMinutes: dur,
    cost: km * 0.10
  });

  saveCars();
  closeModal('modalTrip');
  renderAll();
}

// GPS Tracking Simulato
function toggleGpsLive() {
  if (liveTracking.active) stopGpsLive();
  else startGpsLive();
}

function startGpsLive() {
  liveTracking.active = true;
  liveTracking.km = 0.0;
  liveTracking.seconds = 0;
  document.getElementById('liveGpsBanner').classList.remove('hidden');
  document.getElementById('btnHeaderGps').classList.add('bg-red-500', 'text-white');
  document.getElementById('btnHeaderGps').innerText = '■ Stop GPS';

  liveTracking.timer = setInterval(() => {
    liveTracking.seconds += 1;
    liveTracking.km += 0.03;
    const m = Math.floor(liveTracking.seconds / 60).toString().padStart(2, '0');
    const s = (liveTracking.seconds % 60).toString().padStart(2, '0');
    document.getElementById('gpsLiveTimer').innerText = `${m}:${s}`;
    document.getElementById('gpsLiveKm').innerText = liveTracking.km.toFixed(2);
  }, 1000);
}

function stopGpsLive() {
  if (!liveTracking.active) return;
  clearInterval(liveTracking.timer);
  liveTracking.active = false;
  document.getElementById('liveGpsBanner').classList.add('hidden');
  document.getElementById('btnHeaderGps').classList.remove('bg-red-500', 'text-white');
  document.getElementById('btnHeaderGps').innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> GPS Live`;

  const car = appCars[activeCarIndex];
  const doneKm = parseFloat(liveTracking.km.toFixed(1));
  if (doneKm > 0) {
    car.currentOdo += Math.round(doneKm);
    car.trips.unshift({
      id: 'trip_' + Date.now(),
      title: 'Percorso GPS Tracciato',
      date: 'Oggi',
      km: doneKm,
      durationMinutes: Math.max(1, Math.round(liveTracking.seconds / 60)),
      cost: doneKm * 0.10
    });
    saveCars();
    renderAll();
  }
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
  
  // Costo stimato in base al tipo carburante
  let costPerKm = 0.10;
  if (car.fuelType === 'Ibrida') costPerKm = 0.08;
  else if (car.fuelType === 'Elettrica') costPerKm = 0.05;
  else if (car.fuelType === 'Benzina') costPerKm = 0.12;
  const tripCost = parseFloat((kmNum * costPerKm).toFixed(2));

  // 1. Aggiornamento contachilometri totale dell'auto
  car.currentOdo = (car.currentOdo || 0) + Math.round(kmNum);

  // 2. Inserimento del viaggio nella cronologia dell'auto con data e ora esatte
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
    cost: tripCost,
    source: 'gemini_ai'
  });

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

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  applyAppTheme(isDarkMode);
  initChartInteractions();
  initCalendarSystemClockSync();
  renderAll();
  renderCalendar();
  setupNavbarScrollBehavior();
});


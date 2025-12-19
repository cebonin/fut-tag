// ====== CONFIG ======
const CONFIG = {
  teams: [
    {
      id: "LEC",
      label: "LEC",
      color: "#10b981",
      actions: [
        { key: "LEC_GOL",     label: "Gol",        color: "#f43f5e" }, // vermelho
        { key: "LEC_ESCANTEIO", label: "Escanteio", color: "#10b981" }, // verde
        { key: "LEC_FALTA",   label: "Falta",      color: "#3b82f6" }  // azul
      ]
    },
    {
      id: "ADV",
      label: "ADV",
      color: "#ef4444",
      actions: [
        { key: "ADV_GOL",     label: "Gol",        color: "#f43f5e" },
        { key: "ADV_ESCANTEIO", label: "Escanteio", color: "#10b981" },
        { key: "ADV_FALTA",   label: "Falta",      color: "#3b82f6" }
      ]
    }
  ],
  regionGroups: [
    { key: "FINALIZACAO",   label: "Finalizações" },
    { key: "ENTRADA_TERCO", label: "Entradas no Último Terço" }
  ],
  regions: ["R1","R2","R3","R4","R5","R6"],
  clip: { preMs: 25000, postMs: 10000 }
};

// ====== STATE ======
let counters = {};        // { "LEC_FINALIZACAO_R1": 3, ... }
let eventRecords = [];    // [{ type, timestampISO, clipStartISO, clipEndISO }]
let clockInterval = null;
let clockStartEpoch = null;
let clockPausedAccum = 0; // ms acumulados enquanto rodou
const LS_KEYS = { counters: "hud_counters", events: "hud_events", clock: "hud_clock" };

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  // Renderizar telas
  renderFieldGrids();
  renderActionButtons();

  // Carregar estado
  loadState();

  // Wire buttons
  document.getElementById("btn-export-csv").addEventListener("click", exportCSV);
  document.getElementById("btn-export-xml").addEventListener("click", exportXML);

  // Relógio
  document.getElementById("btn-start").addEventListener("click", startClock);
  document.getElementById("btn-pause").addEventListener("click", pauseClock);
  document.getElementById("btn-reset").addEventListener("click", resetClock);
  updateClockUI(0);
});

// ====== RENDER ======
function renderFieldGrids(){
  document.querySelectorAll(".field-grid").forEach(grid => {
    const teamId = grid.getAttribute("data-team");
    const groupKey = grid.getAttribute("data-group");
    grid.innerHTML = ""; // reset

    CONFIG.regions.forEach(region => {
      const key = `${teamId}_${groupKey}_${region}`;
      const btn = document.createElement("button");
      btn.className = "field-cell";
      btn.setAttribute("data-key", key);
      btn.innerHTML = `<span>${region}</span> <span class="badge" id="count-${key}">0</span>`;
      btn.addEventListener("click", () => recordEvent(key));
      grid.appendChild(btn);
      if(!(key in counters)) counters[key] = 0;
    });
  });
}

function renderActionButtons(){
  const lecBox = document.getElementById("actions-lec");
  const advBox = document.getElementById("actions-adv");
  lecBox.innerHTML = ""; advBox.innerHTML = "";

  CONFIG.teams.forEach(team => {
    const box = team.id === "LEC" ? lecBox : advBox;
    team.actions.forEach(action => {
      if(!(action.key in counters)) counters[action.key] = 0;
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.style.background = action.color;
      btn.setAttribute("data-key", action.key);
      btn.innerHTML = `<span>${action.label}</span> <span class="count" id="count-${action.key}">${counters[action.key]}</span>`;
      btn.addEventListener("click", () => recordEvent(action.key));
      box.appendChild(btn);
    });
  });
}

// ====== RECORD / COUNTERS ======
function recordEvent(eventKey){
  // 1) contador
  counters[eventKey] = (counters[eventKey] || 0) + 1;
  const badge = document.getElementById(`count-${eventKey}`);
  if (badge) badge.textContent = counters[eventKey];

  // 2) timestamps (-25s / +10s)
  const now = Date.now();
  const clipStart = new Date(now - CONFIG.clip.preMs);
  const clipEnd   = new Date(now + CONFIG.clip.postMs);

  eventRecords.push({
    type: eventKey,
    timestampISO: new Date(now).toISOString(),
    clipStartISO: clipStart.toISOString(),
    clipEndISO: clipEnd.toISOString()
  });

  persistState();
}

// ====== STORAGE ======
function persistState(){
  try {
    localStorage.setItem(LS_KEYS.counters, JSON.stringify(counters));
    localStorage.setItem(LS_KEYS.events, JSON.stringify(eventRecords));
  } catch(e) { console.warn("Falha ao salvar estado:", e); }
}

function loadState(){
  try {
    const c = localStorage.getItem(LS_KEYS.counters);
    const e = localStorage.getItem(LS_KEYS.events);
    if (c) counters = JSON.parse(c);
    if (e) eventRecords = JSON.parse(e);
  } catch(_) {}

  // Atualiza UI de contadores
  Object.keys(counters).forEach(k => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = counters[k];
  });
}

// ====== CLOCK ======
function startClock(){
  if (clockInterval) return; // já rodando
  if (!clockStartEpoch) clockStartEpoch = Date.now() - clockPausedAccum;
  clockInterval = setInterval(() => {
    const elapsed = Date.now() - clockStartEpoch;
    updateClockUI(elapsed);
  }, 200);
}

function pauseClock(){
  if (!clockInterval) return;
  clearInterval(clockInterval); clockInterval = null;
  clockPausedAccum = Date.now() - clockStartEpoch;
}

function resetClock(){
  clearInterval(clockInterval); clockInterval = null;
  clockStartEpoch = null; clockPausedAccum = 0;
  updateClockUI(0);
}

function updateClockUI(ms){
  const el = document.getElementById("match-clock");
  const totalSec = Math.floor(ms/1000);
  const mm = String(Math.floor(totalSec/60)).padStart(2,'0');
  const ss = String(totalSec%60).padStart(2,'0');
  el.textContent = `${mm}:${ss}`;
}

// ====== EXPORTS ======
function exportCSV(){
  // Cabeçalho: Evento,Contagem
  const keys = Object.keys(counters).sort();
  let csv = "Evento,Contagem\n";
  keys.forEach(k => { csv += `${k},${counters[k]}\n`; });
  const now = new Date();
  downloadFile(csv, `juega10_contadores_${fmtStamp(now)}.csv`, "text/csv");
}

function exportXML(){
  // <Events><Event type="" timestamp="" clipStart="" clipEnd="" /></Events>
  const now = new Date();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Events>\n';
  eventRecords.forEach(ev => {
    xml += `  <Event type="${ev.type}" timestamp="${ev.timestampISO}" clipStart="${ev.clipStartISO}" clipEnd="${ev.clipEndISO}" />\n`;
  });
  xml += '</Events>';
  downloadFile(xml, `juega10_eventos_${fmtStamp(now)}.xml`, "application/xml");
}

function fmtStamp(d){
  // yyyy-mm-dd_hh-mm-ss
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function downloadFile(content, filename, type){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

// ======= Estado =======
let startTime = null;
let elapsedMs = 0;
let intervalId = null;
let running = true; // relógio contínuo
let counters = {};  // {key: number}
let matchId = null;

// ======= Elementos =======
const timerDisplay = document.getElementById('timerDisplay');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const tagsGrid = document.getElementById('tagsGrid');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportXmlBtn = document.getElementById('exportXmlBtn');
const statusMsg = document.getElementById('statusMsg');

// ======= Util =======
function two(n) { return n.toString().padStart(2, '0'); }
function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${two(mm)}:${two(ss)}`;
}
function nowIso() { return new Date().toISOString(); }

// ======= Persistência local =======
const STORE_KEY = 'hud-timer-state-v2';
function saveState() {
  const data = {
    elapsedMs,
    running,
    counters,
    matchId,
    savedAt: nowIso()
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}
function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    elapsedMs = data.elapsedMs || 0;
    running = data.running ?? true;
    counters = data.counters || {};
    matchId = data.matchId || null;
  } catch {}
}

// ======= Timer =======
function tick() {
  const now = Date.now();
  elapsedMs += now - startTime;
  startTime = now;
  timerDisplay.textContent = formatMMSS(elapsedMs);
}
function startTimer() {
  if (intervalId) return;
  startTime = Date.now();
  intervalId = setInterval(tick, 250);
  toggleBtn.textContent = 'Pausar';
  running = true;
  saveState();
}
function stopTimer() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
  toggleBtn.textContent = 'Continuar';
  running = false;
  saveState();
}
function resetTimerAndCounts(confirmar = true) {
  const ok = confirmar ? confirm('Zerar cronômetro e contadores?') : true;
  if (!ok) return;
  stopTimer();
  elapsedMs = 0;
  Object.keys(counters).forEach(k => counters[k] = 0);
  updateAllCounts();
  timerDisplay.textContent = formatMMSS(0);
  running = true;
  startTimer();
  status('Zerado.');
  saveState();
}

// ======= Tags / UI =======
function ensureCounters() {
  TAGS.forEach(t => { if (typeof counters[t.key] !== 'number') counters[t.key] = 0; });
}
function createTagButton(tag, idx) {
  const btn = document.createElement('button');
  btn.className = `tag-btn tag-${idx+1}`;
  btn.dataset.key = tag.key;
  btn.setAttribute('aria-label', `${tag.label}`);
  btn.innerHTML = `
    <span class="label">${tag.label}</span>
    <span class="count" id="count-${tag.key}">0</span>
  `;
  btn.addEventListener('click', () => {
    counters[tag.key] = (counters[tag.key] || 0) + 1;
    updateCount(tag.key);
    haptic();
    saveState();
  });
  return btn;
}
function updateCount(key) {
  const el = document.getElementById(`count-${key}`);
  if (el) el.textContent = counters[key] || 0;
}
function updateAllCounts() {
  TAGS.forEach(t => updateCount(t.key));
}
function buildButtons() {
  tagsGrid.innerHTML = '';
  TAGS.forEach((t, i) => {
    const btn = createTagButton(t, i);
    tagsGrid.appendChild(btn);
  });
}

// Haptic feedback (limitado no iOS, mas tentamos)
function haptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// ======= Exportação =======
function exportCSV() {
  // CSV simples: tag,count
  const header = 'tag,count';
  const lines = TAGS.map(t => `${sanitizeCsv(t.label)},${counters[t.key] || 0}`);
  const csv = [header, ...lines].join('\n');

  downloadText(csv, `stats-${stamp()}.csv`, 'text/csv');
  status('CSV exportado.');
}
function sanitizeCsv(s) {
  // Envolver em aspas se necessário
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportXML() {
  // XML agregado: <tag name="..." count="..."/>
  const startedAt = matchId || nowIso();
  const durationSec = Math.floor(elapsedMs / 1000);

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<stats generatedAt="${nowIso()}">\n`;
  xml += `  <match startedAt="${startedAt}" durationSeconds="${durationSec}">\n`;
  TAGS.forEach(t => {
    const c = counters[t.key] || 0;
    xml += `    <tag name="${escapeXml(t.label)}" key="${t.key}" count="${c}" />\n`;
  });
  xml += '  </match>\n';
  xml += '</stats>\n';

  downloadText(xml, `stats-${stamp()}.xml`, 'application/xml');
  status('XML exportado.');
}
function escapeXml(s) {
  return s.replace(/&/g,'&amp;')
          .replace(/</g,'&lt;')
          .replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;')
          .replace(/'/g,'&apos;');
}

function stamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function downloadText(content, filename, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ======= Status UI =======
let statusTimeout = null;
function status(msg) {
  if (!statusMsg) return;
  statusMsg.textContent = msg;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => statusMsg.textContent = '', 3000);
}

// ======= Controles =======
toggleBtn.addEventListener('click', () => {
  if (running) stopTimer(); else startTimer();
});
resetBtn.addEventListener('click', () => resetTimerAndCounts(true));
exportCsvBtn.addEventListener('click', exportCSV);
exportXmlBtn.addEventListener('click', exportXML);

// ======= Boot =======
(function init() {
  loadState();
  ensureCounters();
  buildButtons();
  updateAllCounts();
  timerDisplay.textContent = formatMMSS(elapsedMs);
  if (running) startTimer();
  if (!matchId) matchId = nowIso();
  saveState();
})();

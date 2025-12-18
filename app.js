// Estado do relógio
let running = false;
let startTs = 0;       // timestamp do último frame quando rodando
let elapsed = 0;       // ms acumulados
let rafId = null;

const clockEl = document.getElementById('clock');
const startPauseBtn = document.getElementById('startPause');
const resetBtn = document.getElementById('reset');
const markHalfBtn = document.getElementById('markHalf');
const eventsList = document.getElementById('eventsList');

// Eventos armazenados em localStorage
const STORAGE_KEY = 'hud-events-v1';
let events = [];

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    events = raw ? JSON.parse(raw) : [];
  } catch {
    events = [];
  }
  renderEvents();
}
function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function tick(ts) {
  if (!running) return;
  if (!startTs) startTs = ts;
  const dt = ts - startTs;
  startTs = ts;
  elapsed += dt;
  clockEl.textContent = formatTime(elapsed);
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (running) return;
  running = true;
  startTs = 0;
  rafId = requestAnimationFrame(tick);
  startPauseBtn.textContent = 'Pausar';
}
function pause() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  startPauseBtn.textContent = 'Continuar';
}
function reset() {
  pause();
  elapsed = 0;
  clockEl.textContent = '00:00';
}

function currentTimestamp() {
  return new Date().toISOString();
}
function addEvent(tag) {
  const item = {
    tag,
    gameTimeMs: elapsed,
    gameTime: formatTime(elapsed),
    createdAt: currentTimestamp()
  };
  events.push(item);
  saveEvents();
  renderEvents();
}

function renderEvents() {
  eventsList.innerHTML = '';
  events.forEach((e, idx) => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.textContent = e.tag;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = e.gameTime;
    left.appendChild(badge);

    const right = document.createElement('div');
    right.className = 'time';
    right.textContent = new Date(e.createdAt).toLocaleTimeString();

    li.appendChild(left);
    li.appendChild(right);
    eventsList.appendChild(li);
  });
}

// Botões
startPauseBtn.addEventListener('click', () => (running ? pause() : start()));
resetBtn.addEventListener('click', reset);
markHalfBtn.addEventListener('click', () => addEvent('Intervalo'));

document.querySelectorAll('.tag').forEach(btn => {
  btn.addEventListener('click', () => addEvent(btn.dataset.tag));
});

// Exportações
function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('exportCsv').addEventListener('click', () => {
  const header = ['tag', 'game_time', 'game_time_ms', 'created_at'];
  const rows = events.map(e => [e.tag, e.gameTime, e.gameTimeMs, e.createdAt]);
  const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  download(`hud_${stamp}.csv`, csv, 'text/csv');
});

document.getElementById('exportJson').addEventListener('click', () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  download(`hud_${stamp}.json`, JSON.stringify(events, null, 2), 'application/json');
});

document.getElementById('clearEvents').addEventListener('click', () => {
  if (confirm('Limpar todos os eventos?')) {
    events = [];
    saveEvents();
    renderEvents();
  }
});

loadEvents();

// ====== Estado ======
let running = false;
let startAt = null;    // timestamp (ms) de quando deu start
let elapsedMs = 0;     // ms acumulados quando pausado
let rafId = null;

const TAGS = ["Recuperação", "Perda", "Finalização"];

const stateKeys = {
  running: "j10_running",
  startAt: "j10_startAt",
  elapsedMs: "j10_elapsedMs",
  events: "j10_events"
};

let events = []; // { ms: number, tag: string, note: string }

// ====== Elementos ======
const clockEl = document.getElementById("clock");
const statusEl = document.getElementById("status");
const btnStartPause = document.getElementById("btnStartPause");
const btnReset = document.getElementById("btnReset");
const btnUndo = document.getElementById("btnUndo");
const btnExportCSV = document.getElementById("btnExportCSV");
const noteInput = document.getElementById("noteInput");
const eventsList = document.getElementById("eventsList");

// ====== Util ======
function pad2(n) { return n.toString().padStart(2, "0"); }
function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function now() { return Date.now(); }

function currentElapsed() {
  if (!running) return elapsedMs;
  return elapsedMs + (now() - startAt);
}

function saveState() {
  localStorage.setItem(stateKeys.running, JSON.stringify(running));
  localStorage.setItem(stateKeys.startAt, JSON.stringify(startAt));
  localStorage.setItem(stateKeys.elapsedMs, JSON.stringify(elapsedMs));
  localStorage.setItem(stateKeys.events, JSON.stringify(events));
}

function loadState() {
  try {
    const r = JSON.parse(localStorage.getItem(stateKeys.running) || "false");
    const s = JSON.parse(localStorage.getItem(stateKeys.startAt) || "null");
    const e = JSON.parse(localStorage.getItem(stateKeys.elapsedMs) || "0");
    const ev = JSON.parse(localStorage.getItem(stateKeys.events) || "[]");
    running = r;
    startAt = s;
    elapsedMs = e;
    events = Array.isArray(ev) ? ev : [];
    if (running && startAt) {
      // Se estava rodando quando fechou, retoma corretamente
      // elapsedMs permanece e recalcularemos no render
    }
  } catch (err) {
    console.error("Erro ao carregar state:", err);
  }
}

function render() {
  clockEl.textContent = formatMMSS(currentElapsed());
  statusEl.textContent = running ? "Rodando" : "Pausado";
  btnStartPause.textContent = running ? "Pausar" : "Iniciar";
  renderEvents();
}

function renderEvents() {
  eventsList.innerHTML = "";
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    const li = document.createElement("li");

    const left = document.createElement("div");
    left.className = "event-left";

    const row1 = document.createElement("div");
    const timeSpan = document.createElement("span");
    timeSpan.className = "event-time";
    timeSpan.textContent = formatMMSS(ev.ms);

    const tagSpan = document.createElement("span");
    tagSpan.className = `event-tag tag-${ev.tag}`;
    tagSpan.textContent = ev.tag;

    row1.appendChild(timeSpan);
    row1.appendChild(document.createTextNode(" • "));
    row1.appendChild(tagSpan);

    const noteSpan = document.createElement("span");
    noteSpan.className = "event-note";
    noteSpan.textContent = ev.note || "";

    left.appendChild(row1);
    if (ev.note) left.appendChild(noteSpan);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remover";
    removeBtn.addEventListener("click", () => {
      events.splice(i, 1);
      saveState();
      render();
    });

    li.appendChild(left);
    li.appendChild(removeBtn);
    eventsList.appendChild(li);
  }
}

function loop() {
  render();
  rafId = requestAnimationFrame(loop);
}

// ====== Ações ======
function start() {
  if (running) return;
  running = true;
  startAt = now();
  saveState();
}

function pause() {
  if (!running) return;
  // Acumula o tempo decorrido deste ciclo
  elapsedMs += (now() - startAt);
  running = false;
  startAt = null;
  saveState();
}

function resetAll() {
  if (confirm("Zerar relógio e limpar eventos?")) {
    running = false;
    startAt = null;
    elapsedMs = 0;
    events = [];
    saveState();
    render();
  }
}

function addEvent(tag) {
  const ms = currentElapsed();
  const note = (noteInput.value || "").trim();
  events.push({ ms, tag, note });
  // Limpa nota após salvar, se quiser
  noteInput.value = "";
  saveState();
  render();
}

function undoLast() {
  if (events.length > 0) {
    events.pop();
    saveState();
    render();
  }
}

function exportCSV() {
  const rows = [];
  // Cabeçalho
  rows.push(["timestamp_ms", "tempo_mmss", "tag", "nota"]);
  events.forEach(ev => {
    rows.push([ev.ms, formatMMSS(ev.ms), ev.tag, ev.note ? ev.note.replace(/\n/g, " ") : ""]);
  });

  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    if (s.includes(",") || s.includes(";") || s.includes(""")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `juega10_eventos_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ====== Listeners ======
btnStartPause.addEventListener("click", () => {
  running ? pause() : start();
});
btnReset.addEventListener("click", resetAll);
btnUndo.addEventListener("click", undoLast);
btnExportCSV.addEventListener("click", exportCSV);

document.querySelectorAll(".btn.tag").forEach(btn => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.tag;
    addEvent(tag);
  });
});

// ====== Boot ======
loadState();
render();
loop();

// ====== Service Worker ======
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(err => console.warn("SW não registrado:", err));
  });
}

// ====== Dicas de uso no iPhone ======
// 1) Ajuste Ajustes > Tela e Brilho > Bloqueio Automático > Nunca (durante o jogo)
// 2) Brilho mais baixo para poupar bateria
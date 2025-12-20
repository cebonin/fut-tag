// Estado simples do cronômetro e períodos
let timer = null;
let startedAt = null;
let elapsed = 0; // em ms do período corrente
let currentHalf = 1; // 1 ou 2
let running = false;

const periodoEl = document.getElementById('periodo');
const clockEl = document.getElementById('cronometro');

const inicio1tBtn = document.getElementById('inicio1t');
const final1tBtn = document.getElementById('final1t');
const inicio2tBtn = document.getElementById('inicio2t');
const final2tBtn = document.getElementById('final2t');

const placarLecEl = document.getElementById('placarLec');
const placarAdvEl = document.getElementById('placarAdv');

const golLecBtn = document.getElementById('golLec');
const golAdvBtn = document.getElementById('golAdv');

const exportCsvBtn = document.getElementById('exportCsv');
const exportXmlBtn = document.getElementById('exportXml');

// Util
function pad2(n) { return n.toString().padStart(2, '0'); }
function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}
function updatePeriodLabel() {
  periodoEl.textContent = currentHalf === 1 ? '1ºT' : '2ºT';
}
function renderClock() {
  clockEl.textContent = formatMMSS(elapsed);
}

// Timer
function startTimer() {
  if (running) return;
  running = true;
  startedAt = Date.now();
  timer = setInterval(() => {
    const now = Date.now();
    elapsed += now - startedAt;
    startedAt = now;
    renderClock();
  }, 250);
}
function stopTimer() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
}

// Eventos dos botões de tempo
inicio1tBtn.addEventListener('click', () => {
  currentHalf = 1;
  updatePeriodLabel();
  elapsed = 0;
  renderClock();
  startTimer();
});
final1tBtn.addEventListener('click', () => {
  if (currentHalf !== 1) return;
  stopTimer();
});

inicio2tBtn.addEventListener('click', () => {
  currentHalf = 2;
  updatePeriodLabel();
  elapsed = 0;
  renderClock();
  startTimer();
});
final2tBtn.addEventListener('click', () => {
  if (currentHalf !== 2) return;
  stopTimer();
});

// Ações rápidas (exemplo: atualizar placar)
golLecBtn.addEventListener('click', () => {
  const v = parseInt(placarLecEl.textContent || '0', 10) + 1;
  placarLecEl.textContent = String(v);
  pulse(golLecBtn);
});
golAdvBtn.addEventListener('click', () => {
  const v = parseInt(placarAdvEl.textContent || '0', 10) + 1;
  placarAdvEl.textContent = String(v);
  pulse(golAdvBtn);
});

// Efeito rápido de feedback visual
function pulse(el) {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.98)' }, { transform: 'scale(1)' }],
    { duration: 120, easing: 'ease-out' }
  );
}

// Exports (stubs; integre com seus dados reais)
exportCsvBtn.addEventListener('click', () => {
  // TODO: monte o CSV com seus eventos e faça download
  alert('Exportar CSV: implemente sua coleta de eventos e geração do arquivo.');
});
exportXmlBtn.addEventListener('click', () => {
  // TODO: monte o XML com seus eventos e faça download
  alert('Exportar XML: implemente sua coleta de eventos e geração do arquivo.');
});

// Inicializa UI
updatePeriodLabel();
renderClock();

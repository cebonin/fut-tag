// ======================================================
// FutTag Pro - app.js
// Developed by Carlos Bonin (based on AI assistance)
// ======================================================

// ==================== APLICATIVO DE ESTADO ====================
// Centraliza todas as informações importantes do jogo
const appState = {
  score: {
    lec: 0,
    adv: 0
  },
  currentHalf: 1, // 1 ou 2
  timer: {
    isRunning: false,
    startEpoch: 0, // performance.now() quando iniciou/retomou
    elapsedMs: 0,  // milissegundos acumulados (pausado ou entre metades)
    rafId: null    // ID da animação para o requestAnimationFrame
  },
  events: [],      // Armazena todos os eventos registrados para exportação e undo
  eventCounts: {}, // Contagem atual de cada tipo de evento
  lastAction: null // Usado para a função UNDO
};

// ==================== SELETORES DE DOM ====================
const timerDisplay = document.getElementById('timerDisplay');
const scoreLecDisplay = document.getElementById('scoreLec');
const scoreAdvDisplay = document.getElementById('scoreAdv');
const currentHalfDisplay = document.getElementById('currentHalfDisplay');

const btnToggleTimer = document.getElementById('btnToggleTimer');
const btnResetAll = document.getElementById('btnResetAll');
const btnUndo = document.getElementById('btnUndo');
const btnShowStats = document.getElementById('btnShowStats');

const statsModal = document.getElementById('statsModal');
const closeButton = document.querySelector('.modal .close-button');
const btnExportXML = document.getElementById('btnExportXML');
const downloadChartButtons = document.querySelectorAll('.download-chart-btn');

// ==================== DEFINIÇÕES DE EVENTOS ====================
// Mapeamento de todos os códigos de evento possíveis
const ALL_EVENT_CODES = [
  'FIN_LEC_ESQ', 'FIN_LEC_CTR', 'FIN_LEC_DIR',
  'ENT_LEC_ESQ', 'ENT_LEC_CTR', 'ENT_LEC_DIR',
  'GOL_LEC', 'ESC_OF_LEC', 'FALTA_OF_LEC',

  'FIN_ADV_ESQ', 'FIN_ADV_CTR', 'FIN_ADV_DIR',
  'ENT_ADV_ESQ', 'ENT_ADV_CTR', 'ENT_ADV_DIR',
  'GOL_ADV', 'ESC_DEF_ADV', 'FALTA_DEF_ADV'
];

// Mapeamento para nomes amigáveis em gráficos
const EVENT_LABELS = {
  'FIN_LEC_ESQ': 'Finalização LEC (Esq)', 'FIN_LEC_CTR': 'Finalização LEC (Ctr)', 'FIN_LEC_DIR': 'Finalização LEC (Dir)',
  'ENT_LEC_ESQ': 'Entrada LEC (Esq)', 'ENT_LEC_CTR': 'Entrada LEC (Ctr)', 'ENT_LEC_DIR': 'Entrada LEC (Dir)',
  'GOL_LEC': 'GOL LEC', 'ESC_OF_LEC': 'ESC OF LEC', 'FALTA_OF_LEC': 'FL OF LEC',

  'FIN_ADV_ESQ': 'Finalização ADV (Esq)', 'FIN_ADV_CTR': 'Finalização ADV (Ctr)', 'FIN_ADV_DIR': 'Finalização ADV (Dir)',
  'ENT_ADV_ESQ': 'Entrada ADV (Esq)', 'ENT_ADV_CTR': 'Entrada ADV (Ctr)', 'ENT_ADV_DIR': 'Entrada ADV (Dir)',
  'GOL_ADV': 'GOL ADV', 'ESC_DEF_ADV': 'ESC DEF ADV', 'FALTA_DEF_ADV': 'FL DEF ADV'
};

// ==================== FUNÇÕES UTILITÁRIAS ====================
function formatTimeMMSS(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getCurrentTimeSeconds() {
  const currentMs = appState.timer.isRunning ?
    (appState.timer.elapsedMs + (performance.now() - appState.timer.startEpoch)) :
    appState.timer.elapsedMs;
  return Math.max(0, currentMs / 1000); // Garante que nunca seja negativo
}

function updateUI() {
  // Atualiza placar
  scoreLecDisplay.textContent = appState.score.lec;
  scoreAdvDisplay.textContent = appState.score.adv;

  // Atualiza contadores dos badges
  document.querySelectorAll('.count-badge').forEach(badge => {
    const code = badge.dataset.counter;
    badge.textContent = appState.eventCounts[code] || 0;
  });

  // Atualiza display de tempo de jogo
  currentHalfDisplay.textContent = `${appState.currentHalf}°T`;

  // Atualiza botões de half
  document.querySelectorAll('.half-btn').forEach(btn => {
    const half = parseInt(btn.dataset.half);
    const action = btn.dataset.action;
    btn.classList.remove('active');
    if (half === appState.currentHalf) {
      if (action === 'start' && appState.timer.isRunning && appState.timer.elapsedMs > 0) {
        // Se o timer está rodando e já tem tempo, consideramos a metade "iniciada"
        btn.classList.add('active');
      } else if (action === 'start' && !appState.timer.isRunning && appState.timer.elapsedMs === 0) {
        // Se é a primeira vez que a metade vai iniciar
        btn.classList.add('active');
      } else if (action === 'end' && !appState.timer.isRunning && appState.timer.elapsedMs > 0) {
         // Se o timer está pausado e tem tempo, e estamos na metade correta, podemos "finalizar"
         btn.classList.add('active');
      }
    }
  });

  // Atualiza o texto do botão Iniciar/Pausar
  if (appState.timer.isRunning) {
    btnToggleTimer.textContent = 'Pausar';
  } else {
    btnToggleTimer.textContent = appState.timer.elapsedMs === 0 ? 'Iniciar' : 'Retomar';
  }

  // Desabilita Undo se não há eventos
  btnUndo.disabled = appState.events.length === 0;
}

// Feedback tátil (se suportado)
function triggerHapticFeedback() {
  try { window.navigator.vibrate && window.navigator.vibrate(50); } catch (e) {}
}

// ==================== FUNÇÕES DO CRONÔMETRO ====================
function updateTimerDisplay() {
  timerDisplay.textContent = formatTimeMMSS(appState.timer.elapsedMs + (appState.timer.isRunning ? (performance.now() - appState.timer.startEpoch) : 0));
}

function tick() {
  if (!appState.timer.isRunning) return;
  updateTimerDisplay();
  appState.timer.rafId = requestAnimationFrame(tick);
}

function startTimer() {
  if (appState.timer.isRunning) return;
  appState.timer.isRunning = true;
  appState.timer.startEpoch = performance.now();
  updateUI(); // Atualiza texto do botão
  tick(); // Inicia o loop de atualização
}

function pauseTimer() {
  if (!appState.timer.isRunning) return;
  appState.timer.isRunning = false;
  appState.timer.elapsedMs += performance.now() - appState.timer.startEpoch; // Acumula tempo
  if (appState.timer.rafId) cancelAnimationFrame(appState.timer.rafId);
  updateTimerDisplay(); // Atualiza display uma última vez
  updateUI(); // Atualiza texto do botão
}

function resetTimer() {
  pauseTimer(); // Garante que o timer pare e o tempo acumulado seja salvo
  appState.timer.elapsedMs = 0;
  appState.timer.startEpoch = 0;
  updateTimerDisplay();
  updateUI(); // Atualiza texto do botão
}

// ==================== GERENCIAMENTO DE TEMPOS (METADES) ====================
function handleHalfControl(half, action) {
  triggerHapticFeedback();
  if (action === 'start') {
    if (appState.currentHalf !== half) {
      // Se iniciar uma nova metade, reinicia o timer e muda a metade
      pauseTimer();
      resetTimer(); // Zera o tempo da metade anterior
      appState.currentHalf = half;
      // Registrar evento de início de metade
      appState.events.push({
        type: 'HALF_START',
        half: half,
        timestamp: new Date().toISOString(),
        timeInGameSeconds: getCurrentTimeSeconds(),
        previousState: { timer: { ...appState.timer } } // Salva estado do timer antes do reset
      });
      startTimer();
    } else if (!appState.timer.isRunning) {
      startTimer(); // Retoma se já está na metade e pausado
    }
  } else if (action === 'end') {
    if (appState.currentHalf === half && appState.timer.isRunning) {
      pauseTimer();
      // Registrar evento de fim de metade
      appState.events.push({
        type: 'HALF_END',
        half: half,
        timestamp: new Date().toISOString(),
        timeInGameSeconds: getCurrentTimeSeconds(),
        previousState: { timer: { ...appState.timer } } // Salva estado do timer antes da pausa
      });
    }
  }
  updateUI();
}

// ==================== GERENCIAMENTO DE EVENTOS E CONTADORES ====================
function recordEventClick(code) {
  if (!appState.timer.isRunning) {
    alert('Por favor, inicie o cronômetro antes de registrar eventos.');
    return;
  }
  triggerHapticFeedback();

  const currentTimeSec = getCurrentTimeSeconds();

  // Salva o estado atual para o UNDO
  const previousCounts = { ...appState.eventCounts };
  const previousScore = { ...appState.score };

  // Atualiza contador na memória
  appState.eventCounts[code] = (appState.eventCounts[code] || 0) + 1;

  // Lógica para gols
  if (code === 'GOL_LEC') {
    appState.score.lec++;
  } else if (code === 'GOL_ADV') {
    appState.score.adv++;
  }

  // Gera o evento para o XML e registro
  const clipStartSec = Math.max(0, currentTimeSec - 25);
  const clipEndSec = currentTimeSec + 10;

  appState.events.push({
    id: appState.events.length, // ID simples para a pilha, pode ser um UUID real
    type: 'EVENT',
    code: code,
    half: appState.currentHalf,
    timestamp: new Date().toISOString(),
    timeInGameSeconds: currentTimeSec,
    start: clipStartSec,
    end: clipEndSec,
    // Estado anterior para facilitar o UNDO
    previousCounts: previousCounts,
    previousScore: previousScore
  });

  updateUI();
}

function undoLastAction() {
  triggerHapticFeedback();

  if (appState.events.length === 0) {
    console.warn('Nenhum evento para desfazer.');
    return;
  }

  const lastEvent = appState.events.pop();

  if (lastEvent.type === 'EVENT') {
    // Restaura contadores
    appState.eventCounts = lastEvent.previousCounts;
    // Restaura placar
    appState.score = lastEvent.previousScore;
  } else if (lastEvent.type === 'HALF_START' || lastEvent.type === 'HALF_END') {
    // Para simplificar, o UNDO do HALF_START/END apenas reverte o estado do timer.
    // Pode ser mais complexo dependendo do que se quer desfazer exatamente.
    appState.timer = lastEvent.previousState.timer;
    appState.currentHalf = lastEvent.half; // Assume que o HALF_START/END só é desfeito se o currentHalf for o mesmo
    // Se o timer estava rodando antes de ser desfeito, reinicia o tick
    if(appState.timer.isRunning) {
        startTimer(); // Isso vai chamar tick()
    } else {
        if (appState.timer.rafId) cancelAnimationFrame(appState.timer.rafId);
    }
  }

  updateUI();
  updateTimerDisplay(); // Garante que o timer display esteja correto
}

function resetAll() {
  if (!confirm('Tem certeza que deseja zerar TUDO (placar, cronômetro e eventos)?')) {
    return;
  }
  triggerHapticFeedback();

  // Reseta estado
  appState.score = { lec: 0, adv: 0 };
  appState.currentHalf = 1;
  appState.timer = {
    isRunning: false,
    startEpoch: 0,
    elapsedMs: 0,
    rafId: null
  };
  appState.events = [];
  ALL_EVENT_CODES.forEach(code => { appState.eventCounts[code] = 0; });

  // Atualiza UI
  resetTimer(); // Reseta apenas o display do timer
  updateUI();
}


// ==================== FUNÇÕES DE EXPORTAÇÃO XML ====================
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToLiveTagProColor(rgbVal) {
  // LiveTagPro usa um formato de cor de 16 bits (0-65535) para cada canal RGB
  return Math.round(rgbVal / 255 * 65535);
}

// Definições de cores e sort_order para a seção <ROWS> do XML
const rowDefinitions = [
  // LEC
  { code: 'FIN_LEC_ESQ', sort_order: 1, color: '#4caf50', label: 'FIN_LEC_ESQ' },
  { code: 'FIN_LEC_CTR', sort_order: 2, color: '#66bb6a', label: 'FIN_LEC_CTR' },
  { code: 'FIN_LEC_DIR', sort_order: 3, color: '#81c784', label: 'FIN_LEC_DIR' },
  { code: 'ENT_LEC_ESQ', sort_order: 4, color: '#9c27b0', label: 'ENT_LEC_ESQ' },
  { code: 'ENT_LEC_CTR', sort_order: 5, color: '#ab47bc', label: 'ENT_LEC_CTR' },
  { code: 'ENT_LEC_DIR', sort_order: 6, color: '#ba68c8', label: 'ENT_LEC_DIR' },
  { code: 'GOL_LEC', sort_order: 7, color: '#e91e63', label: 'GOL_LEC' },
  { code: 'ESC_OF_LEC', sort_order: 8, color: '#2196f3', label: 'ESC_OF_LEC' },
  { code: 'FALTA_OF_LEC', sort_order: 9, color: '#f44336', label: 'FALTA_OF_LEC' },

  // ADV
  { code: 'FIN_ADV_ESQ', sort_order: 10, color: '#ff9800', label: 'FIN_ADV_ESQ' },
  { code: 'FIN_ADV_CTR', sort_order: 11, color: '#ffa726', label: 'FIN_ADV_CTR' },
  { code: 'FIN_ADV_DIR', sort_order: 12, color: '#ffb74d', label: 'FIN_ADV_DIR' },
  { code: 'ENT_ADV_ESQ', sort_order: 13, color: '#795548', label: 'ENT_ADV_ESQ' },
  { code: 'ENT_ADV_CTR', sort_order: 14, color: '#8d6e63', label: 'ENT_ADV_CTR' },
  { code: 'ENT_ADV_DIR', sort_order: 15, color: '#a1887f', label: 'ENT_ADV_DIR' },
  { code: 'GOL_ADV', sort_order: 16, color: '#e91e63', label: 'GOL_ADV' },
  { code: 'ESC_DEF_ADV', sort_order: 17, color: '#2196f3', label: 'ESC_DEF_ADV' },
  { code: 'FALTA_DEF_ADV', sort_order: 18, color: '#f44336', label: 'FALTA_DEF_ADV' },
];

function buildLiveTagProXml() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<file>\n`;
  xml += `    <!--Generated by FutTag Pro-->\n`;
  xml += `    <SORT_INFO>\n`;
  xml += `        <sort_type>sort order</sort_type>\n`;
  xml += `    </SORT_INFO>\n`;
  xml += `    <ALL_INSTANCES>\n`;

  // Filtra apenas eventos do tipo 'EVENT' para o XML
  const eventInstances = appState.events.filter(event => event.type === 'EVENT');

  eventInstances.forEach(event => {
    xml += `        <instance>\n`;
    xml += `            <ID>${event.id}</ID>\n`;
    xml += `            <code>${escapeXml(event.code)}</code>\n`;
    xml += `            <start>${event.start.toFixed(6)}</start>\n`;
    xml += `            <end>${event.end.toFixed(6)}</end>\n`;
    xml += `            <label>\n`;
    xml += `                <group>Event</group>\n`;
    xml += `                <text>${escapeXml(event.code)}</text>\n`;
    xml += `            </label>\n`;
    xml += `        </instance>\n`;
  });

  xml += `    </ALL_INSTANCES>\n`;
  xml += `    <ROWS>\n`;

  rowDefinitions.forEach(row => {
    const rgb = hexToRgb(row.color);
    const R = rgbToLiveTagProColor(rgb.r);
    const G = rgbToLiveTagProColor(rgb.g);
    const B = rgbToLiveTagProColor(rgb.b);
    xml += `        <row>\n`;
    xml += `            <sort_order>${row.sort_order}</sort_order>\n`;
    xml += `            <code>${escapeXml(row.code)}</code>\n`;
    xml += `            <R>${R}</R>\n`;
    xml += `            <G>${G}</G>\n`;
    xml += `            <B>${B}</B>\n`;
    xml += `        </row>\n`;
  });

  xml += `    </ROWS>\n`;
  xml += `</file>\n`;
  return xml;
}

function exportXML() {
  triggerHapticFeedback();
  const xmlContent = buildLiveTagProXml();
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `futtag_events_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xml`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
}

// ==================== FUNÇÕES DE ESTATÍSTICAS E GRÁFICOS ====================
let chartsInstances = {}; // Armazena instâncias dos gráficos para poder fazer download

function showStatsModal() {
  triggerHapticFeedback();
  statsModal.style.display = 'block';
  
  // Aguarda um pouco para o modal aparecer antes de criar os gráficos
  setTimeout(() => {
    createFinalizationsChart();
    createEntriesChart();
    createGoalsChart();
  }, 100);
}

function hideStatsModal() {
  statsModal.style.display = 'none';
  
  // Destroi os gráficos para liberar memória
  Object.values(chartsInstances).forEach(chart => {
    if (chart) chart.destroy();
  });
  chartsInstances = {};
}

function createFinalizationsChart() {
  const ctx = document.getElementById('finChart').getContext('2d');
  
  // Destroi gráfico anterior se existir
  if (chartsInstances.finChart) {
    chartsInstances.finChart.destroy();
  }

  const lecFins = (appState.eventCounts['FIN_LEC_ESQ'] || 0) + 
                  (appState.eventCounts['FIN_LEC_CTR'] || 0) + 
                  (appState.eventCounts['FIN_LEC_DIR'] || 0);
  
  const advFins = (appState.eventCounts['FIN_ADV_ESQ'] || 0) + 
                  (appState.eventCounts['FIN_ADV_CTR'] || 0) + 
                  (appState.eventCounts['FIN_ADV_DIR'] || 0);

  chartsInstances.finChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['LEC', 'ADV'],
      datasets: [{
        label: 'Finalizações',
        data: [lecFins, advFins],
        backgroundColor: ['#00bcd4', '#ff9800'],
        borderColor: ['#00acc1', '#f57c00'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e0e0f0' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#e0e0f0', stepSize: 1 },
          grid: { color: 'rgba(224, 224, 240, 0.1)' }
        },
        x: {
          ticks: { color: '#e0e0f0' },
          grid: { color: 'rgba(224, 224, 240, 0.1)' }
        }
      }
    }
  });
}

function createEntriesChart() {
  const ctx = document.getElementById('entryChart').getContext('2d');
  
  if (chartsInstances.entryChart) {
    chartsInstances.entryChart.destroy();
  }

  const lecEntries = (appState.eventCounts['ENT_LEC_ESQ'] || 0) + 
                     (appState.eventCounts['ENT_LEC_CTR'] || 0) + 
                     (appState.eventCounts['ENT_LEC_DIR'] || 0);
  
  const advEntries = (appState.eventCounts['ENT_ADV_ESQ'] || 0) + 
                     (appState.eventCounts['ENT_ADV_CTR'] || 0) + 
                     (appState.eventCounts['ENT_ADV_DIR'] || 0);

  chartsInstances.entryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['LEC', 'ADV'],
      datasets: [{
        label: 'Entradas no Último Terço',
        data: [lecEntries, advEntries],
        backgroundColor: ['#00bcd4', '#ff9800'],
        borderColor: ['#00acc1', '#f57c00'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e0e0f0' }
        }
      }
    }
  });
}

function createGoalsChart() {
  const ctx = document.getElementById('goalChart').getContext('2d');
  
  if (chartsInstances.goalChart) {
    chartsInstances.goalChart.destroy();
  }

  chartsInstances.goalChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['LEC', 'ADV'],
      datasets: [{
        label: 'Gols',
        data: [appState.score.lec, appState.score.adv],
        backgroundColor: ['#00bcd4', '#ff9800'],
        borderColor: ['#00acc1', '#f57c00'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e0e0f0' }
        }
      }
    }
  });
}

function downloadChart(chartName) {
  triggerHapticFeedback();
  const chart = chartsInstances[chartName];
  if (!chart) {
    alert('Gráfico não encontrado!');
    return;
  }

  const url = chart.toBase64Image('image/png', 1.0);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `futtag_${chartName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// ==================== EVENT LISTENERS ====================

// Cronômetro
btnToggleTimer.addEventListener('click', () => {
  if (!appState.timer.isRunning && appState.timer.elapsedMs === 0) {
    startTimer(); // Primeira vez que inicia
  } else if (appState.timer.isRunning) {
    pauseTimer(); // Já está rodando, então pausa
  } else {
    startTimer(); // Não está rodando, mas tem tempo acumulado, então retoma
  }
});

// Controles principais
btnResetAll.addEventListener('click', resetAll);
btnUndo.addEventListener('click', undoLastAction);
btnShowStats.addEventListener('click', showStatsModal);

// Controles de metade (1°T, 2°T)
document.querySelectorAll('.half-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const half = parseInt(btn.dataset.half);
    const action = btn.dataset.action;
    handleHalfControl(half, action);
  });
});

// Botões de eventos
document.querySelectorAll('.event-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const code = btn.dataset.code;
    if (code) {
      recordEventClick(code);
    }
  });
});

// Modal de estatísticas
closeButton.addEventListener('click', hideStatsModal);
window.addEventListener('click', (event) => {
  if (event.target === statsModal) {
    hideStatsModal();
  }
});

// Exportação XML
btnExportXML.addEventListener('click', exportXML);

// Download de gráficos
downloadChartButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const chartName = btn.dataset.chart;
    downloadChart(chartName);
  });
});

// ==================== INICIALIZAÇÃO ====================
function initializeApp() {
  // Inicializa contadores
  ALL_EVENT_CODES.forEach(code => { 
    appState.eventCounts[code] = 0; 
  });

  // Atualiza UI inicial
  updateUI();
  updateTimerDisplay();

  console.log('FutTag Pro inicializado com sucesso! 🚀');
}

// Inicializa quando a página carrega
window.addEventListener('load', initializeApp);

// Previne zoom acidental em iOS
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

// Previne seleção de texto em botões
document.addEventListener('selectstart', function (e) {
  if (e.target.closest('.btn')) {
    e.preventDefault();
  }
});
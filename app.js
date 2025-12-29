// ======================================================
// FutTag Pro - app.js v3.1 - Versão Original Funcionando
// Developed by Carlos Bonin
// ======================================================

// ==================== APLICATIVO DE ESTADO ====================
const appState = {
  score: {
    home: 0,
    away: 0
  },
  currentHalf: 1,
  timer: {
    isRunning: false,
    startEpoch: 0,
    elapsedMs: 0,
    rafId: null
  },
  events: [],
  eventCounts: {
    total: {},
    half1: {},
    half2: {}
  },
  lastAction: null,
  teamNames: {
    home: 'CASA',
    away: 'VISITANTE'
  }
};

// ==================== SELETORES DE DOM ====================
const timerDisplay = document.getElementById('timerDisplay');
const scoreHomeDisplay = document.getElementById('homeScore');
const scoreAwayDisplay = document.getElementById('awayScore');
const currentHalfDisplay = document.getElementById('currentHalfDisplay');

const btnToggleTimer = document.getElementById('btnToggleTimer');
const btnResetAll = document.getElementById('btnResetAll');
const btnUndo = document.getElementById('btnUndo');
const btnShowStats = document.getElementById('btnShowStats');
const btnTeamConfig = document.getElementById('btnTeamConfig');

// Modal de configuração das equipes
const teamConfigModal = document.getElementById('teamConfigModal');
const teamConfigClose = document.getElementById('teamConfigClose');
const homeTeamInput = document.getElementById('homeTeamInput');
const awayTeamInput = document.getElementById('awayTeamInput');
const btnSaveTeamConfig = document.getElementById('btnSaveTeamConfig');
const btnResetTeamConfig = document.getElementById('btnResetTeamConfig');

// Nomes das equipes na interface
const homeTeamName = document.getElementById('homeTeamName');
const awayTeamName = document.getElementById('awayTeamName');

// Modal de estatísticas
const statsModal = document.getElementById('statsModal');
const closeButton = document.querySelector('#statsModal .close-button');
const btnGeneratePDF = document.getElementById('btnGeneratePDF');
const btnExportXML = document.getElementById('btnExportXML');

// Summary elements
const finSummary = document.getElementById('finSummary');
const entSummary = document.getElementById('entSummary');
const escSummary = document.getElementById('escSummary');
const faltaSummary = document.getElementById('faltaSummary');

// ==================== DEFINIÇÕES DE EVENTOS ====================
const ALL_EVENT_CODES = [
  'FIN_HOME_ESQ', 'FIN_HOME_CTR', 'FIN_HOME_DIR',
  'ENT_HOME_ESQ', 'ENT_HOME_CTR', 'ENT_HOME_DIR',
  'GOL_HOME', 'ESC_OF_HOME', 'FALTA_OF_HOME',

  'FIN_AWAY_ESQ', 'FIN_AWAY_CTR', 'FIN_AWAY_DIR',
  'ENT_AWAY_ESQ', 'ENT_AWAY_CTR', 'ENT_AWAY_DIR',
  'GOL_AWAY', 'ESC_DEF_AWAY', 'FALTA_DEF_AWAY'
];

// ==================== GERENCIAMENTO DOS NOMES DAS EQUIPES ====================
function loadTeamNames() {
  try {
    const savedNames = localStorage.getItem('futtag_team_names');
    if (savedNames) {
      const names = JSON.parse(savedNames);
      appState.teamNames.home = names.home || 'CASA';
      appState.teamNames.away = names.away || 'VISITANTE';
    }
  } catch (error) {
    console.warn('Erro ao carregar nomes das equipes:', error);
    appState.teamNames = { home: 'CASA', away: 'VISITANTE' };
  }
}

function saveTeamNames() {
  try {
    localStorage.setItem('futtag_team_names', JSON.stringify(appState.teamNames));
  } catch (error) {
    console.warn('Erro ao salvar nomes das equipes:', error);
  }
}

function updateTeamNamesUI() {
  if (homeTeamName) homeTeamName.textContent = appState.teamNames.home;
  if (awayTeamName) awayTeamName.textContent = appState.teamNames.away;
  
  if (homeTeamInput) homeTeamInput.value = appState.teamNames.home;
  if (awayTeamInput) awayTeamInput.value = appState.teamNames.away;
}

function showTeamConfigModal() {
  triggerHapticFeedback();
  updateTeamNamesUI();
  if (teamConfigModal) {
    teamConfigModal.style.display = 'block';
    if (homeTeamInput) homeTeamInput.focus();
  }
}

function hideTeamConfigModal() {
  if (teamConfigModal) {
    teamConfigModal.style.display = 'none';
  }
}

function saveTeamConfiguration() {
  const homeName = homeTeamInput ? homeTeamInput.value.trim() : '';
  const awayName = awayTeamInput ? awayTeamInput.value.trim() : '';
  
  if (!homeName || !awayName) {
    alert('Por favor, preencha os nomes das duas equipes.');
    return;
  }
  
  if (homeName.length > 15 || awayName.length > 15) {
    alert('Os nomes devem ter no máximo 15 caracteres cada.');
    return;
  }
  
  appState.teamNames.home = homeName.toUpperCase();
  appState.teamNames.away = awayName.toUpperCase();
  
  saveTeamNames();
  updateTeamNamesUI();
  hideTeamConfigModal();
  
  triggerHapticFeedback();
  alert(`Configuração salva! ${appState.teamNames.home} vs ${appState.teamNames.away}`);
}

function resetTeamConfiguration() {
  if (confirm('Deseja restaurar os nomes padrão das equipes?')) {
    appState.teamNames.home = 'CASA';
    appState.teamNames.away = 'VISITANTE';
    saveTeamNames();
    updateTeamNamesUI();
    triggerHapticFeedback();
  }
}

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
  return Math.max(0, currentMs / 1000);
}

function updateUI() {
  if (scoreHomeDisplay) scoreHomeDisplay.textContent = appState.score.home;
  if (scoreAwayDisplay) scoreAwayDisplay.textContent = appState.score.away;

  document.querySelectorAll('.count-badge').forEach(badge => {
    const code = badge.dataset.counter;
    badge.textContent = appState.eventCounts.total[code] || 0;
  });

  if (currentHalfDisplay) currentHalfDisplay.textContent = `${appState.currentHalf}°T`;

  document.querySelectorAll('.half-btn').forEach(btn => {
    const half = parseInt(btn.dataset.half);
    btn.classList.remove('active');
    if (half === appState.currentHalf) {
      btn.classList.add('active');
    }
  });

  if (btnToggleTimer) {
    if (appState.timer.isRunning) {
      btnToggleTimer.textContent = 'Pausar';
    } else {
      btnToggleTimer.textContent = appState.timer.elapsedMs === 0 ? 'Iniciar' : 'Retomar';
    }
  }

  if (btnUndo) {
    btnUndo.disabled = appState.events.length === 0;
  }
  
  updateStatsSummary();
}

function updateStatsSummary() {
  if (!finSummary) return;
  
  const counts = appState.eventCounts.total;
  const homeTeamName = appState.teamNames.home;
  const awayTeamName = appState.teamNames.away;
  
  const homeFins = (counts['FIN_HOME_ESQ'] || 0) + (counts['FIN_HOME_CTR'] || 0) + (counts['FIN_HOME_DIR'] || 0);
  const awayFins = (counts['FIN_AWAY_ESQ'] || 0) + (counts['FIN_AWAY_CTR'] || 0) + (counts['FIN_AWAY_DIR'] || 0);
  finSummary.textContent = `${homeTeamName}: ${homeFins} | ${awayTeamName}: ${awayFins}`;
  
  const homeEnts = (counts['ENT_HOME_ESQ'] || 0) + (counts['ENT_HOME_CTR'] || 0) + (counts['ENT_HOME_DIR'] || 0);
  const awayEnts = (counts['ENT_AWAY_ESQ'] || 0) + (counts['ENT_AWAY_CTR'] || 0) + (counts['ENT_AWAY_DIR'] || 0);
  entSummary.textContent = `${homeTeamName}: ${homeEnts} | ${awayTeamName}: ${awayEnts}`;
  
  const homeEscs = counts['ESC_OF_HOME'] || 0;
  const awayEscs = counts['ESC_DEF_AWAY'] || 0;
  escSummary.textContent = `${homeTeamName}: ${homeEscs} | ${awayTeamName}: ${awayEscs}`;
  
  const homeFaltas = counts['FALTA_OF_HOME'] || 0;
  const awayFaltas = counts['FALTA_DEF_AWAY'] || 0;
  faltaSummary.textContent = `${homeTeamName}: ${homeFaltas} | ${awayTeamName}: ${awayFaltas}`;
}

function triggerHapticFeedback() {
  try { 
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  } catch (e) {
    console.log('Vibração não disponível');
  }
}

// ==================== FUNÇÕES DO CRONÔMETRO ====================
function updateTimerDisplay() {
  if (timerDisplay) {
    timerDisplay.textContent = formatTimeMMSS(appState.timer.elapsedMs + (appState.timer.isRunning ? (performance.now() - appState.timer.startEpoch) : 0));
  }
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
  updateUI();
  tick();
}

function pauseTimer() {
  if (!appState.timer.isRunning) return;
  appState.timer.isRunning = false;
  appState.timer.elapsedMs += performance.now() - appState.timer.startEpoch;
  if (appState.timer.rafId) cancelAnimationFrame(appState.timer.rafId);
  updateTimerDisplay();
  updateUI();
}

function resetTimer() {
  pauseTimer();
  appState.timer.elapsedMs = 0;
  appState.timer.startEpoch = 0;
  updateTimerDisplay();
  updateUI();
}

// ==================== GERENCIAMENTO DE TEMPOS ====================
function handleHalfControl(half, action) {
  triggerHapticFeedback();
  if (action === 'start') {
    if (appState.currentHalf !== half) {
      pauseTimer();
      resetTimer();
      appState.currentHalf = half;
      appState.events.push({
        type: 'HALF_START',
        half: half,
        timestamp: new Date().toISOString(),
        timeInGameSeconds: getCurrentTimeSeconds(),
        previousState: { timer: { ...appState.timer } }
      });
      startTimer();
    } else if (!appState.timer.isRunning) {
      startTimer();
    }
  } else if (action === 'end') {
    if (appState.currentHalf === half && appState.timer.isRunning) {
      pauseTimer();
      appState.events.push({
        type: 'HALF_END',
        half: half,
        timestamp: new Date().toISOString(),
        timeInGameSeconds: getCurrentTimeSeconds(),
        previousState: { timer: { ...appState.timer } }
      });
    }
  }
  updateUI();
}

// ==================== GERENCIAMENTO DE EVENTOS ====================
function initializeEventCounts() {
  ['total', 'half1', 'half2'].forEach(period => {
    appState.eventCounts[period] = {};
    ALL_EVENT_CODES.forEach(code => {
      appState.eventCounts[period][code] = 0;
    });
  });
}

function recordEventClick(code) {
  if (!appState.timer.isRunning) {
    alert('Por favor, inicie o cronômetro antes de registrar eventos.');
    return;
  }
  triggerHapticFeedback();

  const currentTimeSec = getCurrentTimeSeconds();
  const currentHalf = appState.currentHalf;

  const previousCounts = JSON.parse(JSON.stringify(appState.eventCounts));
  const previousScore = { ...appState.score };

  appState.eventCounts.total[code] = (appState.eventCounts.total[code] || 0) + 1;
  appState.eventCounts[`half${currentHalf}`][code] = (appState.eventCounts[`half${currentHalf}`][code] || 0) + 1;

  if (code === 'GOL_HOME') {
    appState.score.home++;
  } else if (code === 'GOL_AWAY') {
    appState.score.away++;
  }

  const clipStartSec = Math.max(0, currentTimeSec - 25);
  const clipEndSec = currentTimeSec + 10;

  appState.events.push({
    id: appState.events.length,
    type: 'EVENT',
    code: code,
    half: currentHalf,
    timestamp: new Date().toISOString(),
    timeInGameSeconds: currentTimeSec,
    start: clipStartSec,
    end: clipEndSec,
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
    appState.eventCounts = lastEvent.previousCounts;
    appState.score = lastEvent.previousScore;
  } else if (lastEvent.type === 'HALF_START' || lastEvent.type === 'HALF_END') {
    appState.timer = lastEvent.previousState.timer;
    appState.currentHalf = lastEvent.half;
    if(appState.timer.isRunning) {
      startTimer();
    } else {
      if (appState.timer.rafId) cancelAnimationFrame(appState.timer.rafId);
    }
  }

  updateUI();
  updateTimerDisplay();
}

function resetAll() {
  if (!confirm('Tem certeza que deseja zerar TUDO (placar, cronômetro e eventos)?')) {
    return;
  }
  triggerHapticFeedback();

  appState.score = { home: 0, away: 0 };
  appState.currentHalf = 1;
  appState.timer = {
    isRunning: false,
    startEpoch: 0,
    elapsedMs: 0,
    rafId: null
  };
  appState.events = [];
  
  initializeEventCounts();
  resetTimer();
  updateUI();
}

// ==================== GERAÇÃO DE GRÁFICOS PARA PDF ====================
let chartsInstances = {};

if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
}

function createChartForPDF(canvasId, title, data, chartType = 'bar', hideLegend = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas ${canvasId} não encontrado`);
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (chartsInstances[canvasId]) {
    chartsInstances[canvasId].destroy();
  }

  const config = {
    type: chartType,
    data: data,
    options: {
      responsive: false,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30,
          left: 20,
          right: 20,
          bottom: 20
        }
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: !hideLegend,
          position: 'top',
          labels: { 
            color: '#000000',
            font: { size: 14, weight: 'bold' },
            padding: 15
          }
        },
        datalabels: {
          display: function(context) {
            return context.dataset.data[context.dataIndex] > 0;
          },
          color: '#000000',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value) => value,
          align: function(context) {
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            if (meta.stack) {
              return 'center';
            }
            return 'start';
          },
          anchor: function(context) {
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            if (meta.stack) {
              return 'center';
            }
            return 'end';
          },
          offset: function(context) {
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            if (meta.stack) {
              return 0;
            }
            return -15;
          }
        }
      },
      scales: chartType === 'bar' ? {
        y: {
          beginAtZero: true,
          stacked: data.datasets.length > 1,
          ticks: { 
            color: '#000000',
            stepSize: 1,
            font: { size: 12, weight: 'bold' }
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        x: {
          stacked: data.datasets.length > 1,
          ticks: { 
            color: '#000000',
            font: { size: 12, weight: 'bold' }
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      } : {},
      elements: {
        bar: {
          borderWidth: 2
        }
      },
      animation: false
    }
  };

  try {
    chartsInstances[canvasId] = new Chart(ctx, config);
    return chartsInstances[canvasId];
  } catch (error) {
    console.error(`Erro ao criar gráfico ${canvasId}:`, error);
    return null;
  }
}

function getDataByPeriod(codes, period) {
  const counts = appState.eventCounts[period];
  return codes.reduce((sum, code) => sum + (counts[code] || 0), 0);
}

function generateAllCharts() {
  console.log('Gerando gráficos...');
  const homeColor = '#00bcd4';
  const awayColor = '#ff9800';

  // 1. FINALIZAÇÕES (3 gráficos)
  const finCodesHome = ['FIN_HOME_ESQ', 'FIN_HOME_CTR', 'FIN_HOME_DIR'];
  const finCodesAway = ['FIN_AWAY_ESQ', 'FIN_AWAY_CTR', 'FIN_AWAY_DIR'];
  const finLabels = [`${appState.teamNames.home} E`, `${appState.teamNames.home} C`, `${appState.teamNames.home} D`, `${appState.teamNames.away} E`, `${appState.teamNames.away} C`, `${appState.teamNames.away} D`];
  const finChartColors = [homeColor, homeColor, homeColor, awayColor, awayColor, awayColor];

  const finalizacoesDataTemplate = {
    labels: finLabels,
    datasets: [{
      label: 'Finalizações',
      data: [],
      backgroundColor: finChartColors,
      borderColor: finChartColors,
      borderWidth: 2
    }]
  };

  // 1°T
  const fin1TData = JSON.parse(JSON.stringify(finalizacoesDataTemplate));
  fin1TData.datasets[0].data = [
    getDataByPeriod(['FIN_HOME_ESQ'], 'half1'),
    getDataByPeriod(['FIN_HOME_CTR'], 'half1'),
    getDataByPeriod(['FIN_HOME_DIR'], 'half1'),
    getDataByPeriod(['FIN_AWAY_ESQ'], 'half1'),
    getDataByPeriod(['FIN_AWAY_CTR'], 'half1'),
    getDataByPeriod(['FIN_AWAY_DIR'], 'half1')
  ];
  createChartForPDF('fin1TChart', 'Finalizações - 1° Tempo', fin1TData, 'bar', true);

  // 2°T
  const fin2TData = JSON.parse(JSON.stringify(finalizacoesDataTemplate));
  fin2TData.datasets[0].data = [
    getDataByPeriod(['FIN_HOME_ESQ'], 'half2'),
    getDataByPeriod(['FIN_HOME_CTR'], 'half2'),
    getDataByPeriod(['FIN_HOME_DIR'], 'half2'),
    getDataByPeriod(['FIN_AWAY_ESQ'], 'half2'),
    getDataByPeriod(['FIN_AWAY_CTR'], 'half2'),
    getDataByPeriod(['FIN_AWAY_DIR'], 'half2')
  ];
  createChartForPDF('fin2TChart', 'Finalizações - 2° Tempo', fin2TData, 'bar', true);

  // Total
  const finTotalData = JSON.parse(JSON.stringify(finalizacoesDataTemplate));
  finTotalData.datasets[0].data = [
    getDataByPeriod(['FIN_HOME_ESQ'], 'total'),
    getDataByPeriod(['FIN_HOME_CTR'], 'total'),
    getDataByPeriod(['FIN_HOME_DIR'], 'total'),
    getDataByPeriod(['FIN_AWAY_ESQ'], 'total'),
    getDataByPeriod(['FIN_AWAY_CTR'], 'total'),
    getDataByPeriod(['FIN_AWAY_DIR'], 'total')
  ];
  createChartForPDF('finTotalChart', 'Finalizações - Total da Partida', finTotalData, 'bar', true);

  // 2. ENTRADAS NO ÚLTIMO TERÇO (3 gráficos)
  const entCodesHome = ['ENT_HOME_ESQ', 'ENT_HOME_CTR', 'ENT_HOME_DIR'];
  const entCodesAway = ['ENT_AWAY_ESQ', 'ENT_AWAY_CTR', 'ENT_AWAY_DIR'];
  const entLabels = [`${appState.teamNames.home} E`, `${appState.teamNames.home} C`, `${appState.teamNames.home} D`, `${appState.teamNames.away} E`, `${appState.teamNames.away} C`, `${appState.teamNames.away} D`];

  const entradasDataTemplate = {
    labels: entLabels,
    datasets: [{
      label: 'Entradas no Último Terço',
      data: [],
      backgroundColor: finChartColors,
      borderColor: finChartColors,
      borderWidth: 2
    }]
  };

  // 1°T
  const ent1TData = JSON.parse(JSON.stringify(entradasDataTemplate));
  ent1TData.datasets[0].data = [
    getDataByPeriod(['ENT_HOME_ESQ'], 'half1'),
    getDataByPeriod(['ENT_HOME_CTR'], 'half1'),
    getDataByPeriod(['ENT_HOME_DIR'], 'half1'),
    getDataByPeriod(['ENT_AWAY_ESQ'], 'half1'),
    getDataByPeriod(['ENT_AWAY_CTR'], 'half1'),
    getDataByPeriod(['ENT_AWAY_DIR'], 'half1')
  ];
  createChartForPDF('ent1TChart', 'Entradas no Último Terço - 1° Tempo', ent1TData, 'bar', true);

  // 2°T
  const ent2TData = JSON.parse(JSON.stringify(entradasDataTemplate));
  ent2TData.datasets[0].data = [
    getDataByPeriod(['ENT_HOME_ESQ'], 'half2'),
    getDataByPeriod(['ENT_HOME_CTR'], 'half2'),
    getDataByPeriod(['ENT_HOME_DIR'], 'half2'),
    getDataByPeriod(['ENT_AWAY_ESQ'], 'half2'),
    getDataByPeriod(['ENT_AWAY_CTR'], 'half2'),
    getDataByPeriod(['ENT_AWAY_DIR'], 'half2')
  ];
  createChartForPDF('ent2TChart', 'Entradas no Último Terço - 2° Tempo', ent2TData, 'bar', true);

  // Total
  const entTotalData = JSON.parse(JSON.stringify(entradasDataTemplate));
  entTotalData.datasets[0].data = [
    getDataByPeriod(['ENT_HOME_ESQ'], 'total'),
    getDataByPeriod(['ENT_HOME_CTR'], 'total'),
    getDataByPeriod(['ENT_HOME_DIR'], 'total'),
    getDataByPeriod(['ENT_AWAY_ESQ'], 'total'),
    getDataByPeriod(['ENT_AWAY_CTR'], 'total'),
    getDataByPeriod(['ENT_AWAY_DIR'], 'total')
  ];
  createChartForPDF('entTotalChart', 'Entradas no Último Terço - Total da Partida', entTotalData, 'bar', true);

  // 3. ESCANTEIOS E FALTAS LATERAIS (3 gráficos empilhados)
  const escFaltaLabels = [appState.teamNames.home, appState.teamNames.away];
  const escCodes = ['ESC_OF_HOME'];
  const faltaCodes = ['FALTA_OF_HOME'];
  const awayEscCodes = ['ESC_DEF_AWAY'];
  const awayFaltaCodes = ['FALTA_DEF_AWAY'];

    function createEscFaltaData(period) {
    return {
      labels: escFaltaLabels,
      datasets: [
        {
          label: 'Escanteios',
          data: [getDataByPeriod(escCodes, period), getDataByPeriod(awayEscCodes, period)],
          backgroundColor: '#2196f3',
          borderColor: '#1976d2',
          borderWidth: 2
        },
        {
          label: 'Faltas Laterais',
          data: [getDataByPeriod(faltaCodes, period), getDataByPeriod(awayFaltaCodes, period)],
          backgroundColor: '#f44336',
          borderColor: '#d32f2f',
          borderWidth: 2
        }
      ]
    };
  }

  createChartForPDF('escFalta1TChart', 'Escanteios e Faltas Laterais - 1° Tempo', createEscFaltaData('half1'));
  createChartForPDF('escFalta2TChart', 'Escanteios e Faltas Laterais - 2° Tempo', createEscFaltaData('half2'));
  createChartForPDF('escFaltaTotalChart', 'Escanteios e Faltas Laterais - Total da Partida', createEscFaltaData('total'));
  
  console.log('Gráficos gerados com sucesso!');
}

// ==================== GERAÇÃO DE PDF ====================
async function generatePDFReport() {
  if (!window.jspdf) {
    alert('Biblioteca jsPDF não carregada. Recarregue a página.');
    return;
  }

  try {
    triggerHapticFeedback();
    console.log('Iniciando geração do PDF...');
    
    generateAllCharts();
    
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    console.log('Aguardando renderização...');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const chartPdfWidth = 180;
    const chartPdfHeight = 60;

    function getCanvasImageData(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        throw new Error(`Canvas ${canvasId} não encontrado no DOM.`);
      }
      return canvas.toDataURL('image/png', 1.0);
    }
    
    const getTotals = (codesHome, codesAway, period) => {
      const counts = appState.eventCounts[period];
      const totalHome = codesHome.reduce((acc, code) => acc + (counts[code] || 0), 0);
      const totalAway = codesAway.reduce((acc, code) => acc + (counts[code] || 0), 0);
      return `Total ${appState.teamNames.home}: ${totalHome} | Total ${appState.teamNames.away}: ${totalAway}`;
    };

    // --- PAGE 1: FINALIZAÇÕES ---
    console.log('Gerando página 1 - Finalizações...');
    
    let yCurrent = 25;
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0); 
    pdf.text('ESTATÍSTICAS DO JOGO', pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 10;
    
    pdf.setFontSize(12);
    pdf.text(`${appState.teamNames.home} ${appState.score.home} x ${appState.score.away} ${appState.teamNames.away}`, pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 7;
    pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 13;
    
    pdf.setFontSize(16);
    pdf.setTextColor(76, 175, 80);
    pdf.text('FINALIZAÇÕES', pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 10;

    const finCharts = [
      { id: 'fin1TChart', title: '1° Tempo', codesHome: ['FIN_HOME_ESQ', 'FIN_HOME_CTR', 'FIN_HOME_DIR'], codesAway: ['FIN_AWAY_ESQ', 'FIN_AWAY_CTR', 'FIN_AWAY_DIR'], period: 'half1' },
      { id: 'fin2TChart', title: '2° Tempo', codesHome: ['FIN_HOME_ESQ', 'FIN_HOME_CTR', 'FIN_HOME_DIR'], codesAway: ['FIN_AWAY_ESQ', 'FIN_AWAY_CTR', 'FIN_AWAY_DIR'], period: 'half2' },
      { id: 'finTotalChart', title: 'Total da Partida', codesHome: ['FIN_HOME_ESQ', 'FIN_HOME_CTR', 'FIN_HOME_DIR'], codesAway: ['FIN_AWAY_ESQ', 'FIN_AWAY_CTR', 'FIN_AWAY_DIR'], period: 'total' }
    ];
    
    for (const chart of finCharts) {
      try {
        const canvasImg = getCanvasImageData(chart.id);
        
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(chart.title, pageWidth/2, yCurrent, { align: 'center' });
        yCurrent += 5;
        
        pdf.addImage(canvasImg, 'PNG', margin, yCurrent, chartPdfWidth, chartPdfHeight);
        yCurrent += chartPdfHeight;
        
        pdf.setFontSize(10);
        pdf.text(getTotals(chart.codesHome, chart.codesAway, chart.period), pageWidth/2, yCurrent + 5, { align: 'center' });
        yCurrent += 15;
      } catch (error) {
        console.error(`Erro ao processar gráfico ${chart.id}:`, error);
      }
    }

    // --- PAGE 2: ENTRADAS NO ÚLTIMO TERÇO ---
    console.log('Gerando página 2 - Entradas...');
    pdf.addPage();
    
    yCurrent = 30;
    pdf.setFontSize(16);
    pdf.setTextColor(156, 39, 176);
    pdf.text('ENTRADAS NO ÚLTIMO TERÇO', pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 10;
    
    const entCharts = [
      { id: 'ent1TChart', title: '1° Tempo', codesHome: ['ENT_HOME_ESQ', 'ENT_HOME_CTR', 'ENT_HOME_DIR'], codesAway: ['ENT_AWAY_ESQ', 'ENT_AWAY_CTR', 'ENT_AWAY_DIR'], period: 'half1' },
      { id: 'ent2TChart', title: '2° Tempo', codesHome: ['ENT_HOME_ESQ', 'ENT_HOME_CTR', 'ENT_HOME_DIR'], codesAway: ['ENT_AWAY_ESQ', 'ENT_AWAY_CTR', 'ENT_AWAY_DIR'], period: 'half2' },
      { id: 'entTotalChart', title: 'Total da Partida', codesHome: ['ENT_HOME_ESQ', 'ENT_HOME_CTR', 'ENT_HOME_DIR'], codesAway: ['ENT_AWAY_ESQ', 'ENT_AWAY_CTR', 'ENT_AWAY_DIR'], period: 'total' }
    ];
    
    for (const chart of entCharts) {
      try {
        const canvasImg = getCanvasImageData(chart.id);
        
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(chart.title, pageWidth/2, yCurrent, { align: 'center' });
        yCurrent += 5;
        
        pdf.addImage(canvasImg, 'PNG', margin, yCurrent, chartPdfWidth, chartPdfHeight);
        yCurrent += chartPdfHeight;
        
        pdf.setFontSize(10);
        pdf.text(getTotals(chart.codesHome, chart.codesAway, chart.period), pageWidth/2, yCurrent + 5, { align: 'center' });
        yCurrent += 15;
      } catch (error) {
        console.error(`Erro ao processar gráfico ${chart.id}:`, error);
      }
    }
    
    // --- PAGE 3: ESCANTEIOS E FALTAS LATERAIS ---
    console.log('Gerando página 3 - Escanteios e Faltas...');
    pdf.addPage();
    
    yCurrent = 30;
    pdf.setFontSize(16);
    pdf.setTextColor(33, 150, 243);
    pdf.text('ESCANTEIOS E FALTAS LATERAIS', pageWidth/2, yCurrent, { align: 'center' });
    yCurrent += 10;
    
    const escFaltaCharts = [
      { id: 'escFalta1TChart', title: '1° Tempo', codesHome: ['ESC_OF_HOME'], codesAway: ['ESC_DEF_AWAY'], codesHome_FL: ['FALTA_OF_HOME'], codesAway_FL: ['FALTA_DEF_AWAY'], period: 'half1' },
      { id: 'escFalta2TChart', title: '2° Tempo', codesHome: ['ESC_OF_HOME'], codesAway: ['ESC_DEF_AWAY'], codesHome_FL: ['FALTA_OF_HOME'], codesAway_FL: ['FALTA_DEF_AWAY'], period: 'half2' },
      { id: 'escFaltaTotalChart', title: 'Total da Partida', codesHome: ['ESC_OF_HOME'], codesAway: ['ESC_DEF_AWAY'], codesHome_FL: ['FALTA_OF_HOME'], codesAway_FL: ['FALTA_DEF_AWAY'], period: 'total' }
    ];
    
    for (const chart of escFaltaCharts) {
      try {
        const canvasImg = getCanvasImageData(chart.id);
        
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(chart.title, pageWidth/2, yCurrent, { align: 'center' });
        yCurrent += 5;
        
        pdf.addImage(canvasImg, 'PNG', margin, yCurrent, chartPdfWidth, chartPdfHeight);
        yCurrent += chartPdfHeight;
        
        const totalEscanteios = getTotals(chart.codesHome, chart.codesAway, chart.period);
        const totalFaltas = getTotals(chart.codesHome_FL, chart.codesAway_FL, chart.period);
        pdf.setFontSize(10);
        pdf.text(`Escanteios - ${totalEscanteios}`, pageWidth/2, yCurrent + 2, { align: 'center' });
        pdf.text(`Faltas Laterais - ${totalFaltas}`, pageWidth/2, yCurrent + 8, { align: 'center' });
        yCurrent += 15;
      } catch (error) {
        console.error(`Erro ao processar gráfico ${chart.id}:`, error);
      }
    }

    // Salva o PDF
    const filename = `futtag_${appState.teamNames.home}_vs_${appState.teamNames.away}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    console.log('Salvando PDF...');
    pdf.save(filename);
    
    // Limpa os gráficos
    Object.values(chartsInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    chartsInstances = {};
    
    console.log('PDF gerado com sucesso!');
    alert('Relatório PDF gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro detalhado na geração do PDF:', error);
    alert(`Erro ao gerar PDF: ${error.message}`);
    
    Object.values(chartsInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    chartsInstances = {};
  }
}

// ==================== FUNÇÕES DE EXPORTAÇÃO XML ====================
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
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
  return Math.round(rgbVal / 255 * 65535);
}

const rowDefinitions = [
  // HOME
  { code: 'FIN_HOME_ESQ', sort_order: 1, color: '#4caf50', label: 'FIN_HOME_ESQ' },
  { code: 'FIN_HOME_CTR', sort_order: 2, color: '#66bb6a', label: 'FIN_HOME_CTR' },
  { code: 'FIN_HOME_DIR', sort_order: 3, color: '#81c784', label: 'FIN_HOME_DIR' },
  { code: 'ENT_HOME_ESQ', sort_order: 4, color: '#9c27b0', label: 'ENT_HOME_ESQ' },
  { code: 'ENT_HOME_CTR', sort_order: 5, color: '#ab47bc', label: 'ENT_HOME_CTR' },
  { code: 'ENT_HOME_DIR', sort_order: 6, color: '#ba68c8', label: 'ENT_HOME_DIR' },
  { code: 'GOL_HOME', sort_order: 7, color: '#e91e63', label: 'GOL_HOME' },
  { code: 'ESC_OF_HOME', sort_order: 8, color: '#2196f3', label: 'ESC_OF_HOME' },
  { code: 'FALTA_OF_HOME', sort_order: 9, color: '#f44336', label: 'FALTA_OF_HOME' },

  // AWAY
  { code: 'FIN_AWAY_ESQ', sort_order: 10, color: '#ff9800', label: 'FIN_AWAY_ESQ' },
  { code: 'FIN_AWAY_CTR', sort_order: 11, color: '#ffa726', label: 'FIN_AWAY_CTR' },
  { code: 'FIN_AWAY_DIR', sort_order: 12, color: '#ffb74d', label: 'FIN_AWAY_DIR' },
  { code: 'ENT_AWAY_ESQ', sort_order: 13, color: '#795548', label: 'ENT_AWAY_ESQ' },
  { code: 'ENT_AWAY_CTR', sort_order: 14, color: '#8d6e63', label: 'ENT_AWAY_CTR' },
  { code: 'ENT_AWAY_DIR', sort_order: 15, color: '#a1887f', label: 'ENT_AWAY_DIR' },
  { code: 'GOL_AWAY', sort_order: 16, color: '#e91e63', label: 'GOL_AWAY' },
  { code: 'ESC_DEF_AWAY', sort_order: 17, color: '#2196f3', label: 'ESC_DEF_AWAY' },
  { code: 'FALTA_DEF_AWAY', sort_order: 18, color: '#f44336', label: 'FALTA_DEF_AWAY' },
];

function buildLiveTagProXml() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<file>\n';
  xml += `    <!--Generated by FutTag Pro - ${appState.teamNames.home} vs ${appState.teamNames.away}-->\n`;
  xml += '    <SORT_INFO>\n';
  xml += '        <sort_type>sort order</sort_type>\n';
  xml += '    </SORT_INFO>\n';
  xml += '    <ALL_INSTANCES>\n';

  const eventInstances = appState.events.filter(event => event.type === 'EVENT');

  eventInstances.forEach(event => {
    xml += '        <instance>\n';
    xml += `            <ID>${event.id}</ID>\n`;
    xml += `            <code>${escapeXml(event.code)}</code>\n`;
    xml += `            <start>${event.start.toFixed(6)}</start>\n`;
    xml += `            <end>${event.end.toFixed(6)}</end>\n`;
    xml += '            <label>\n';
    xml += '                <group>Event</group>\n';
    xml += `                <text>${escapeXml(event.code)}</text>\n`;
    xml += '            </label>\n';
    xml += '        </instance>\n';
  });

  xml += '    </ALL_INSTANCES>\n';
  xml += '    <ROWS>\n';

  rowDefinitions.forEach(row => {
    const rgb = hexToRgb(row.color);
    const R = rgbToLiveTagProColor(rgb.r);
    const G = rgbToLiveTagProColor(rgb.g);
    const B = rgbToLiveTagProColor(rgb.b);
    xml += '        <row>\n';
    xml += `            <sort_order>${row.sort_order}</sort_order>\n`;
    xml += `            <code>${escapeXml(row.code)}</code>\n`;
    xml += `            <R>${R}</R>\n`;
    xml += `            <G>${G}</G>\n`;
    xml += `            <B>${B}</B>\n`;
    xml += '        </row>\n';
  });

  xml += '    </ROWS>\n';
  xml += '</file>\n';
  return xml;
}

function exportXML() {
  triggerHapticFeedback();
  const xmlContent = buildLiveTagProXml();
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `futtag_${appState.teamNames.home}_vs_${appState.teamNames.away}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xml`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
  
  alert('Arquivo XML exportado com sucesso!');
}

// ==================== FUNÇÕES DE MODAL ====================
function showStatsModal() {
  triggerHapticFeedback();
  updateStatsSummary();
  if (statsModal) {
    statsModal.style.display = 'block';
  }
}

function hideStatsModal() {
  if (statsModal) {
    statsModal.style.display = 'none';
  }
  
  Object.values(chartsInstances).forEach(chart => {
    if (chart) chart.destroy();
  });
  chartsInstances = {};
}

// ==================== EVENT LISTENERS ====================

// Cronômetro
if (btnToggleTimer) {
  btnToggleTimer.addEventListener('click', () => {
    if (!appState.timer.isRunning && appState.timer.elapsedMs === 0) {
      startTimer();
    } else if (appState.timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });
}

// Controles principais
if (btnResetAll) btnResetAll.addEventListener('click', resetAll);
if (btnUndo) btnUndo.addEventListener('click', undoLastAction);
if (btnShowStats) btnShowStats.addEventListener('click', showStatsModal);
if (btnTeamConfig) btnTeamConfig.addEventListener('click', showTeamConfigModal);

// Controles de metade
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
if (closeButton) closeButton.addEventListener('click', hideStatsModal);
window.addEventListener('click', (event) => {
  if (event.target === statsModal) {
    hideStatsModal();
  }
});

// Modal de configuração das equipes
if (teamConfigClose) teamConfigClose.addEventListener('click', hideTeamConfigModal);
if (btnSaveTeamConfig) btnSaveTeamConfig.addEventListener('click', saveTeamConfiguration);
if (btnResetTeamConfig) btnResetTeamConfig.addEventListener('click', resetTeamConfiguration);

window.addEventListener('click', (event) => {
  if (event.target === teamConfigModal) {
    hideTeamConfigModal();
  }
});

if (homeTeamInput) {
  homeTeamInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (awayTeamInput) awayTeamInput.focus();
    }
  });
}

if (awayTeamInput) {
  awayTeamInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      saveTeamConfiguration();
    }
  });
}

// Exportações
if (btnGeneratePDF) btnGeneratePDF.addEventListener('click', generatePDFReport);
if (btnExportXML) btnExportXML.addEventListener('click', exportXML);

// ==================== INICIALIZAÇÃO ====================
function initializeApp() {
  console.log('Inicializando FutTag Pro...');
  
  loadTeamNames();
  initializeEventCounts();
  
  updateTeamNamesUI();
  updateUI();
  updateTimerDisplay();
  
  console.log('FutTag Pro inicializado!');
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

// Previne scroll bounce no iOS
document.addEventListener('touchmove', function(e) {
  if (e.target.closest('.modal-content')) {
    return;
  }
  e.preventDefault();
}, { passive: false });
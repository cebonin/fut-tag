// ======================================================
// FutTag Pro - app.js v2.0
// Developed by Carlos Bonin
// ======================================================

// ==================== APLICATIVO DE ESTADO ====================
const appState = {
  score: {
    lec: 0,
    adv: 0
  },
  currentHalf: 1, // 1 ou 2
  timer: {
    isRunning: false,
    startEpoch: 0,
    elapsedMs: 0,
    rafId: null
  },
  events: [],      // Armazena todos os eventos registrados
  eventCounts: {   // Contagem atual de cada tipo de evento
    total: {},     // Contadores totais
    half1: {},     // Contadores do 1° tempo
    half2: {}      // Contadores do 2° tempo
  },
  lastAction: null
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
const btnGeneratePDF = document.getElementById('btnGeneratePDF');
const btnExportXML = document.getElementById('btnExportXML');

// Summary elements
const finSummary = document.getElementById('finSummary');
const entSummary = document.getElementById('entSummary');
const escSummary = document.getElementById('escSummary');
const faltaSummary = document.getElementById('faltaSummary');

// ==================== DEFINIÇÕES DE EVENTOS ====================
const ALL_EVENT_CODES = [
  'FIN_LEC_ESQ', 'FIN_LEC_CTR', 'FIN_LEC_DIR',
  'ENT_LEC_ESQ', 'ENT_LEC_CTR', 'ENT_LEC_DIR',
  'GOL_LEC', 'ESC_OF_LEC', 'FALTA_OF_LEC',

  'FIN_ADV_ESQ', 'FIN_ADV_CTR', 'FIN_ADV_DIR',
  'ENT_ADV_ESQ', 'ENT_ADV_CTR', 'ENT_ADV_DIR',
  'GOL_ADV', 'ESC_DEF_ADV', 'FALTA_DEF_ADV'
];

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
  // Atualiza placar
  scoreLecDisplay.textContent = appState.score.lec;
  scoreAdvDisplay.textContent = appState.score.adv;

  // Atualiza contadores dos badges
  document.querySelectorAll('.count-badge').forEach(badge => {
    const code = badge.dataset.counter;
    badge.textContent = appState.eventCounts.total[code] || 0;
  });

  // Atualiza display de tempo de jogo
  currentHalfDisplay.textContent = `${appState.currentHalf}°T`;

  // Atualiza botões de half
  document.querySelectorAll('.half-btn').forEach(btn => {
    const half = parseInt(btn.dataset.half);
    btn.classList.remove('active');
    if (half === appState.currentHalf) {
      btn.classList.add('active');
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
  
  // Atualiza summary no modal se estiver visível
  updateStatsSummary();
}

function updateStatsSummary() {
  if (!finSummary) return;
  
  const counts = appState.eventCounts.total;
  
  // Finalizações
  const lecFins = (counts['FIN_LEC_ESQ'] || 0) + (counts['FIN_LEC_CTR'] || 0) + (counts['FIN_LEC_DIR'] || 0);
  const advFins = (counts['FIN_ADV_ESQ'] || 0) + (counts['FIN_ADV_CTR'] || 0) + (counts['FIN_ADV_DIR'] || 0);
  finSummary.textContent = `LEC: ${lecFins} | ADV: ${advFins}`;
  
  // Entradas
  const lecEnts = (counts['ENT_LEC_ESQ'] || 0) + (counts['ENT_LEC_CTR'] || 0) + (counts['ENT_LEC_DIR'] || 0);
  const advEnts = (counts['ENT_ADV_ESQ'] || 0) + (counts['ENT_ADV_CTR'] || 0) + (counts['ENT_ADV_DIR'] || 0);
  entSummary.textContent = `LEC: ${lecEnts} | ADV: ${advEnts}`;
  
  // Escanteios
  const lecEscs = counts['ESC_OF_LEC'] || 0;
  const advEscs = counts['ESC_DEF_ADV'] || 0;
  escSummary.textContent = `LEC: ${lecEscs} | ADV: ${advEscs}`;
  
  // Faltas
  const lecFaltas = counts['FALTA_OF_LEC'] || 0;
  const advFaltas = counts['FALTA_DEF_ADV'] || 0;
  faltaSummary.textContent = `LEC: ${lecFaltas} | ADV: ${advFaltas}`;
}

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

  // Salva estado anterior
  const previousCounts = JSON.parse(JSON.stringify(appState.eventCounts));
  const previousScore = { ...appState.score };

  // Atualiza contadores
  appState.eventCounts.total[code] = (appState.eventCounts.total[code] || 0) + 1;
  appState.eventCounts[`half${currentHalf}`][code] = (appState.eventCounts[`half${currentHalf}`][code] || 0) + 1;

  // Lógica para gols
  if (code === 'GOL_LEC') {
    appState.score.lec++;
  } else if (code === 'GOL_ADV') {
    appState.score.adv++;
  }

  // Registra o evento
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

  appState.score = { lec: 0, adv: 0 };
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

function createChartForPDF(canvasId, title, data, chartType = 'bar') {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  // Destroi gráfico anterior se existir
  if (chartsInstances[canvasId]) {
    chartsInstances[canvasId].destroy();
  }

  const config = {
    type: chartType,
    data: data,
    options: {
      responsive: false,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: 'bold' },
          color: '#e0e0f0'
        },
        legend: {
          labels: { color: '#e0e0f0' }
        },
        datalabels: {
          display: true,
          color: '#fff',
          font: { weight: 'bold', size: 12 },
          formatter: (value) => value > 0 ? value : ''
        }
      },
      scales: chartType === 'bar' ? {
        y: {
          beginAtZero: true,
          ticks: { color: '#e0e0f0', stepSize: 1 },
          grid: { color: 'rgba(224, 224, 240, 0.1)' }
        },
        x: {
          ticks: { color: '#e0e0f0' },
          grid: { color: 'rgba(224, 224, 240, 0.1)' }
        }
      } : {}
    },
    plugins: [{
      id: 'datalabels',
      afterDatasetsDraw: function(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const data = dataset.data[index];
            if (data > 0) {
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(data, bar.x, bar.y - 5);
            }
          });
        });
      }
    }]
  };

  chartsInstances[canvasId] = new Chart(ctx, config);
  return chartsInstances[canvasId];
}

function generateAllCharts() {
  const lecColor = '#00bcd4';
  const advColor = '#ff9800';

  // Helper function para obter dados por período
  function getDataByPeriod(codes, period) {
    const counts = appState.eventCounts[period];
    return codes.map(code => counts[code] || 0);
  }

  // 1. Finalizações
  const finCodes = ['FIN_LEC_ESQ', 'FIN_LEC_CTR', 'FIN_LEC_DIR', 'FIN_ADV_ESQ', 'FIN_ADV_CTR', 'FIN_ADV_DIR'];
  const finLabels = ['LEC E', 'LEC C', 'LEC D', 'ADV E', 'ADV C', 'ADV D'];
  const finColors = [lecColor, lecColor, lecColor, advColor, advColor, advColor];

  createChartForPDF('fin1TChart', 'Finalizações - 1° Tempo', {
    labels: finLabels,
    datasets: [{
      label: 'Finalizações',
      data: getDataByPeriod(finCodes, 'half1'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('fin2TChart', 'Finalizações - 2° Tempo', {
    labels: finLabels,
    datasets: [{
      label: 'Finalizações',
      data: getDataByPeriod(finCodes, 'half2'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('finTotalChart', 'Finalizações - Total da Partida', {
    labels: finLabels,
    datasets: [{
      label: 'Finalizações',
      data: getDataByPeriod(finCodes, 'total'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  // 2. Entradas no Último Terço
  const entCodes = ['ENT_LEC_ESQ', 'ENT_LEC_CTR', 'ENT_LEC_DIR', 'ENT_ADV_ESQ', 'ENT_ADV_CTR', 'ENT_ADV_DIR'];
  const entLabels = ['LEC E', 'LEC C', 'LEC D', 'ADV E', 'ADV C', 'ADV D'];

  createChartForPDF('ent1TChart', 'Entradas no Último Terço - 1° Tempo', {
    labels: entLabels,
    datasets: [{
      label: 'Entradas',
      data: getDataByPeriod(entCodes, 'half1'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('ent2TChart', 'Entradas no Último Terço - 2° Tempo', {
    labels: entLabels,
    datasets: [{
      label: 'Entradas',
      data: getDataByPeriod(entCodes, 'half2'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('entTotalChart', 'Entradas no Último Terço - Total da Partida', {
    labels: entLabels,
    datasets: [{
      label: 'Entradas',
      data: getDataByPeriod(entCodes, 'total'),
      backgroundColor: finColors,
      borderWidth: 1
    }]
  });

  // 3. Escanteios
  const escCodes = ['ESC_OF_LEC', 'ESC_DEF_ADV'];
  const escLabels = ['LEC', 'ADV'];
  const escColors = [lecColor, advColor];

  createChartForPDF('esc1TChart', 'Escanteios - 1° Tempo', {
    labels: escLabels,
    datasets: [{
      label: 'Escanteios',
      data: getDataByPeriod(escCodes, 'half1'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('esc2TChart', 'Escanteios - 2° Tempo', {
    labels: escLabels,
    datasets: [{
      label: 'Escanteios',
      data: getDataByPeriod(escCodes, 'half2'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('escTotalChart', 'Escanteios - Total da Partida', {
    labels: escLabels,
    datasets: [{
      label: 'Escanteios',
      data: getDataByPeriod(escCodes, 'total'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });

  // 4. Faltas Laterais
  const faltaCodes = ['FALTA_OF_LEC', 'FALTA_DEF_ADV'];
  const faltaLabels = ['LEC', 'ADV'];

  createChartForPDF('falta1TChart', 'Faltas Laterais - 1° Tempo', {
    labels: faltaLabels,
    datasets: [{
      label: 'Faltas',
      data: getDataByPeriod(faltaCodes, 'half1'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('falta2TChart', 'Faltas Laterais - 2° Tempo', {
    labels: faltaLabels,
    datasets: [{
      label: 'Faltas',
      data: getDataByPeriod(faltaCodes, 'half2'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });

  createChartForPDF('faltaTotalChart', 'Faltas Laterais - Total da Partida', {
    labels: faltaLabels,
    datasets: [{
      label: 'Faltas',
      data: getDataByPeriod(faltaCodes, 'total'),
      backgroundColor: escColors,
      borderWidth: 1
    }]
  });
}

// ==================== GERAÇÃO DE PDF ====================
async function generatePDFReport() {
  try {
    triggerHapticFeedback();
    
    // Gera todos os gráficos
    generateAllCharts();
    
    // Aguarda um pouco para os gráficos renderizarem
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, milimetros, A4
    
    // Título principal
    pdf.setFontSize(20);
    pdf.setTextColor(0, 188, 212); // Cor do LEC
    pdf.text('ESTATÍSTICAS DO JOGO', 105, 20, { align: 'center' });
    
    // Informações do jogo
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Placar: LEC ${appState.score.lec} x ${appState.score.adv} ADV`, 105, 30, { align: 'center' });
    pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 37, { align: 'center' });
    
    let yPosition = 50;
    const chartWidth = 80;
    const chartHeight = 60;
    const margin = 10;
    
    // Lista de gráficos para incluir no PDF
    const charts = [
      { id: 'fin1TChart', title: 'Finalizações - 1° Tempo' },
      { id: 'fin2TChart', title: 'Finalizações - 2° Tempo' },
      { id: 'finTotalChart', title: 'Finalizações - Total' },
      { id: 'ent1TChart', title: 'Entradas no Último Terço - 1° Tempo' },
      { id: 'ent2TChart', title: 'Entradas no Último Terço - 2° Tempo' },
      { id: 'entTotalChart', title: 'Entradas no Último Terço - Total' },
      { id: 'esc1TChart', title: 'Escanteios - 1° Tempo' },
      { id: 'esc2TChart', title: 'Escanteios - 2° Tempo' },
      { id: 'escTotalChart', title: 'Escanteios - Total' },
      { id: 'falta1TChart', title: 'Faltas Laterais - 1° Tempo' },
      { id: 'falta2TChart', title: 'Faltas Laterais - 2° Tempo' },
      { id: 'faltaTotalChart', title: 'Faltas Laterais - Total' }
    ];
    
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      const canvas = document.getElementById(chart.id);
      
      if (canvas) {
        // Converte o canvas para imagem
        const canvasImg = canvas.toDataURL('image/png', 1.0);
        
        // Calcula posição
        const isLeftColumn = i % 2 === 0;
        const xPosition = isLeftColumn ? margin : margin + chartWidth + margin;
        
        // Nova página a cada 6 gráficos (3 linhas de 2 gráficos)
        if (i > 0 && i % 6 === 0) {
          pdf.addPage();
          yPosition = 20;
        } else if (i > 0 && i % 2 === 0) {
          yPosition += chartHeight + 15; // Espaço entre linhas
        }
        
                // Adiciona título do gráfico
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(chart.title, xPosition + chartWidth/2, yPosition - 3, { align: 'center' });
        
        // Adiciona a imagem do gráfico
        pdf.addImage(canvasImg, 'PNG', xPosition, yPosition, chartWidth, chartHeight);
      }
    }
    
    // Salva o PDF
    const filename = `futtag_estatisticas_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    pdf.save(filename);
    
    // Limpa os gráficos
    Object.values(chartsInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    chartsInstances = {};
    
    alert('📄 Relatório PDF gerado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('❌ Erro ao gerar o relatório PDF. Tente novamente.');
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

// ==================== FUNÇÕES DE MODAL ====================
function showStatsModal() {
  triggerHapticFeedback();
  updateStatsSummary();
  statsModal.style.display = 'block';
}

function hideStatsModal() {
  statsModal.style.display = 'none';
  
  // Limpa os gráficos para liberar memória
  Object.values(chartsInstances).forEach(chart => {
    if (chart) chart.destroy();
  });
  chartsInstances = {};
}

// ==================== EVENT LISTENERS ====================

// Cronômetro
btnToggleTimer.addEventListener('click', () => {
  if (!appState.timer.isRunning && appState.timer.elapsedMs === 0) {
    startTimer();
  } else if (appState.timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

// Controles principais
btnResetAll.addEventListener('click', resetAll);
btnUndo.addEventListener('click', undoLastAction);
btnShowStats.addEventListener('click', showStatsModal);

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
closeButton.addEventListener('click', hideStatsModal);
window.addEventListener('click', (event) => {
  if (event.target === statsModal) {
    hideStatsModal();
  }
});

// Exportações
btnGeneratePDF.addEventListener('click', generatePDFReport);
btnExportXML.addEventListener('click', exportXML);

// ==================== INICIALIZAÇÃO ====================
function initializeApp() {
  // Inicializa contadores
  initializeEventCounts();

  // Atualiza UI inicial
  updateUI();
  updateTimerDisplay();

  console.log('🚀 FutTag Pro v2.0 inicializado com sucesso!');
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
    // Permite scroll no modal
    return;
  }
  e.preventDefault();
}, { passive: false });
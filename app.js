// ***** FUTTAG PRO v3.2 BETA - SISTEMA DE ANÁLISE ESPORTIVA EM TEMPO REAL *****
// Desenvolvido por Carlos Bonin - Juega10
// Data: Dezembro 2024
// ****************************************************************************

// ***** CONFIGURAÇÃO DE PROTEÇÃO BETA *****
const BETA_CONFIG = {
    enabled: true,
    expirationDate: '2026-03-31', // ✅ CORRIGIDO: 2026
    users: { // ✅ NOVO: Sistema de usuários
        'BONIN2025': 'futpro123',
        'ANALYST01': 'scout2025',
        'ANALYST02': 'data2025',
        'ANALYST03': 'stats2025',
        'SCOUT2025': 'field2025',
        'COACH2025': 'tactic25',
        'BETA2025': 'test2025'
    }
};

// ***** VARIÁVEIS GLOBAIS *****
let gameData = {
    homeTeam: 'CASA',
    awayTeam: 'VISITANTE',
    homeScore: 0,
    awayScore: 0,
    currentHalf: 1,
    timerRunning: false,
    startTime: 0,
    elapsedTime: 0,
    events: [],
    stats: {
        home: { fin_e: 0, fin_c: 0, fin_d: 0, ent_e: 0, ent_c: 0, ent_d: 0, gols: 0, esc: 0, falta: 0 },
        away: { fin_e: 0, fin_c: 0, fin_d: 0, ent_e: 0, ent_c: 0, ent_d: 0, gols: 0, esc: 0, falta: 0 }
    }
};

let analytics = {
    sessionsCount: parseInt(localStorage.getItem('futtag_sessions') || '0'),
    appOpens: parseInt(localStorage.getItem('futtag_opens') || '0')
};

// ***** CONFIGURAÇÃO DE GRÁFICOS *****
let currentStatsPage = 1;
const TOTAL_STATS_PAGES = 3;
let chartsInitialized = false;
let chartInstances = {};

// ***** INICIALIZAÇÃO *****
document.addEventListener('DOMContentLoaded', function() {
    analytics.appOpens++;
    localStorage.setItem('futtag_opens', analytics.appOpens.toString());
    
    // ✅ CORRIGIDO: Verificação de acesso beta
    if (!checkBetaAccess()) {
        showBetaAccessModal();
        return;
    }
    
    initializeApp();
});

// ***** FUNÇÕES DE PROTEÇÃO BETA *****
function checkBetaAccess() {
    if (!BETA_CONFIG.enabled) return true;
    
    // ✅ CORRIGIDO: Verificar expiração
    const now = new Date();
    const expirationDate = new Date(BETA_CONFIG.expirationDate);
    if (now > expirationDate) {
        alert('❌ Versão Beta expirada!\n\nData limite: ' + expirationDate.toLocaleDateString('pt-BR') + 
              '\n\nContate: carlos@juega10.com.br');
        return false;
    }
    
    // Verificar se usuário já validado
    const validatedUser = localStorage.getItem('futtag_beta_user');
    const validatedCode = localStorage.getItem('futtag_beta_code');
    
    if (validatedUser && validatedCode && BETA_CONFIG.users[validatedCode] === validatedUser) {
        return true;
    }
    
    return false;
}

function showBetaAccessModal() {
    const modal = document.getElementById('betaAccessModal');
    modal.style.display = 'block';
}

function validateBetaAccess() {
    const userInput = document.getElementById('betaUser').value.trim();
    const codeInput = document.getElementById('betaCode').value.trim().toUpperCase();
    
    // ✅ CORRIGIDO: Validação usuário + código
    if (!userInput) {
        alert('❌ Digite seu nome/email');
        return;
    }
    
    if (!codeInput) {
        alert('❌ Digite o código de acesso');
        return;
    }
    
    if (!BETA_CONFIG.users[codeInput]) {
        alert('❌ Código de acesso inválido');
        return;
    }
    
    if (BETA_CONFIG.users[codeInput] !== userInput) {
        alert('❌ Usuário não autorizado para este código');
        return;
    }
    
    // Salvar validação
    localStorage.setItem('futtag_beta_user', userInput);
    localStorage.setItem('futtag_beta_code', codeInput);
    
    // Fechar modal e inicializar
    document.getElementById('betaAccessModal').style.display = 'none';
    initializeApp();
}

// ***** INICIALIZAÇÃO DO APLICATIVO *****
function initializeApp() {
    setupEventListeners();
    loadTeamNames();
    updateDisplay();
    updateTimer();
    
    analytics.sessionsCount++;
    localStorage.setItem('futtag_sessions', analytics.sessionsCount.toString());
}

function setupEventListeners() {
    // Controles de tempo
    document.getElementById('half1Btn').addEventListener('click', () => setHalf(1));
    document.getElementById('half2Btn').addEventListener('click', () => setHalf(2));
    
    // Botões de ação principais
    document.getElementById('startBtn').addEventListener('click', toggleTimer);
    document.getElementById('undoBtn').addEventListener('click', undoLastEvent);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('statsBtn').addEventListener('click', showStatsModal);
    document.getElementById('configBtn').addEventListener('click', showTeamConfig);
    document.getElementById('exportBtn').addEventListener('click', exportToXML);
    document.getElementById('feedbackBtn').addEventListener('click', showFeedbackModal); // ✅ CORRIGIDO: Movido para bottom bar

    // Event listeners para botões de eventos
    setupEventButtons();
    
    // Modals
    setupModalListeners();
}

function setupEventButtons() {
    // Finalizações
    ['fin-e-home', 'fin-c-home', 'fin-d-home', 'fin-e-away', 'fin-c-away', 'fin-d-away'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => handleEvent(e.target));
    });
    
    // Entradas no último terço
    ['ent-e-home', 'ent-c-home', 'ent-d-home', 'ent-e-away', 'ent-c-away', 'ent-d-away'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => handleEvent(e.target));
    });
    
    // Gols
    ['gol-home', 'gol-away'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => handleEvent(e.target));
    });
    
    // ✅ CORRIGIDO: Escanteios e faltas sem OF/DEF
    ['esc-home', 'esc-away', 'falta-home', 'falta-away'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => handleEvent(e.target));
    });
}

function setupModalListeners() {
    // Fechar modals
    document.querySelectorAll('.close-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    
    // Configuração de times
    document.getElementById('saveTeamConfig').addEventListener('click', saveTeamConfig);
    document.getElementById('resetTeamConfig').addEventListener('click', resetTeamConfig);
    
    // Beta access
    document.getElementById('validateBeta').addEventListener('click', validateBetaAccess);
    
    // Feedback
    document.getElementById('submitFeedback').addEventListener('click', submitFeedback);
    document.getElementById('cancelFeedback').addEventListener('click', () => {
        document.getElementById('feedbackModal').style.display = 'none';
    });

    // Estatísticas
    document.getElementById('prevStatsPage').addEventListener('click', prevStatsPage);
    document.getElementById('nextStatsPage').addEventListener('click', nextStatsPage);
    document.getElementById('generatePDF').addEventListener('click', generatePDF);
}

// ***** FUNÇÕES DO TIMER *****
function setHalf(half) {
    gameData.currentHalf = half;
    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`half${half}Btn`).classList.add('active');
    updateDisplay();
}

function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (gameData.timerRunning) {
        // Pausar
        gameData.timerRunning = false;
        btn.textContent = 'INICIAR';
        btn.style.backgroundColor = 'var(--primary-action-bg)';
    } else {
        // Iniciar
        gameData.timerRunning = true;
        gameData.startTime = Date.now() - gameData.elapsedTime;
        btn.textContent = 'PAUSAR';
        btn.style.backgroundColor = 'var(--undo-action-bg)';
        
        updateTimer();
    }
}

function updateTimer() {
    if (!gameData.timerRunning) return;
    
    gameData.elapsedTime = Date.now() - gameData.startTime;
    updateDisplay();
    
    requestAnimationFrame(updateTimer);
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ***** FUNÇÕES DE EVENTOS *****
function handleEvent(button) {
    const now = Date.now();
    const gameTime = gameData.elapsedTime;
    
    const event = {
        id: Date.now(),
        type: button.dataset.type,
        team: button.dataset.team,
        zone: button.dataset.zone || null,
        half: gameData.currentHalf,
        timestamp: now,
        gameTime: gameTime,
        formattedTime: formatTime(gameTime)
    };
    
    // Processar evento específico
    if (event.type === 'gol') {
        if (event.team === 'home') {
            gameData.homeScore++;
        } else {
            gameData.awayScore++;
        }
        gameData.stats[event.team].gols++;
    } else if (event.type === 'fin') {
        gameData.stats[event.team][`fin_${event.zone}`]++;
    } else if (event.type === 'ent') {
        gameData.stats[event.team][`ent_${event.zone}`]++;
    } else if (event.type === 'esc') {
        gameData.stats[event.team].esc++;
    } else if (event.type === 'falta') { // ✅ CORRIGIDO: nome atualizado
        gameData.stats[event.team].falta++;
    }
    
    gameData.events.push(event);
    updateDisplay();
    updateEventCounts();
    
    // Feedback tátil
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function undoLastEvent() {
    if (gameData.events.length === 0) return;
    
    const lastEvent = gameData.events.pop();
    
    // Reverter estatísticas
    if (lastEvent.type === 'gol') {
        if (lastEvent.team === 'home') {
            gameData.homeScore = Math.max(0, gameData.homeScore - 1);
        } else {
            gameData.awayScore = Math.max(0, gameData.awayScore - 1);
        }
        gameData.stats[lastEvent.team].gols = Math.max(0, gameData.stats[lastEvent.team].gols - 1);
    } else if (lastEvent.type === 'fin') {
        gameData.stats[lastEvent.team][`fin_${lastEvent.zone}`] = Math.max(0, gameData.stats[lastEvent.team][`fin_${lastEvent.zone}`] - 1);
    } else if (lastEvent.type === 'ent') {
        gameData.stats[lastEvent.team][`ent_${lastEvent.zone}`] = Math.max(0, gameData.stats[lastEvent.team][`ent_${lastEvent.zone}`] - 1);
    } else if (lastEvent.type === 'esc') {
        gameData.stats[lastEvent.team].esc = Math.max(0, gameData.stats[lastEvent.team].esc - 1);
    } else if (lastEvent.type === 'falta') {
        gameData.stats[lastEvent.team].falta = Math.max(0, gameData.stats[lastEvent.team].falta - 1);
    }
    
    updateDisplay();
    updateEventCounts();
}

function resetGame() {
    if (!confirm('⚠️ Tem certeza que deseja reiniciar o jogo?\n\nTodos os dados serão perdidos!')) {
        return;
    }
    
    gameData = {
        homeTeam: gameData.homeTeam,
        awayTeam: gameData.awayTeam,
        homeScore: 0,
        awayScore: 0,
        currentHalf: 1,
        timerRunning: false,
        startTime: 0,
        elapsedTime: 0,
        events: [],
        stats: {
            home: { fin_e: 0, fin_c: 0, fin_d: 0, ent_e: 0, ent_c: 0, ent_d: 0, gols: 0, esc: 0, falta: 0 },
            away: { fin_e: 0, fin_c: 0, fin_d: 0, ent_e: 0, ent_c: 0, ent_d: 0, gols: 0, esc: 0, falta: 0 }
        }
    };
    
    setHalf(1);
    updateDisplay();
    updateEventCounts();
    
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'INICIAR';
    startBtn.style.backgroundColor = 'var(--primary-action-bg)';
}

// ***** FUNÇÕES DE DISPLAY *****
function updateDisplay() {
    // Score
    document.querySelector('.score-display').textContent = `${gameData.homeScore} × ${gameData.awayScore}`;
    
    // Timer
    document.querySelector('.timer-display').textContent = formatTime(gameData.elapsedTime);
    
    // Current half
    document.querySelector('.current-half-display').textContent = `${gameData.currentHalf}°T`;
    
    // Team names
    document.querySelector('.team-column.home .team-name').textContent = gameData.homeTeam;
    document.querySelector('.team-column.away .team-name').textContent = gameData.awayTeam;
}

function updateEventCounts() {
    const updateCount = (id, count) => {
        const element = document.getElementById(id);
        if (element) {
            let badge = element.querySelector('.count-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'count-badge';
                element.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    };
    
    // Atualizar contadores home
    updateCount('fin-e-home', gameData.stats.home.fin_e);
    updateCount('fin-c-home', gameData.stats.home.fin_c);
    updateCount('fin-d-home', gameData.stats.home.fin_d);
    updateCount('ent-e-home', gameData.stats.home.ent_e);
    updateCount('ent-c-home', gameData.stats.home.ent_c);
    updateCount('ent-d-home', gameData.stats.home.ent_d);
    updateCount('gol-home', gameData.stats.home.gols);
    updateCount('esc-home', gameData.stats.home.esc);
    updateCount('falta-home', gameData.stats.home.falta);
    
    // Atualizar contadores away
    updateCount('fin-e-away', gameData.stats.away.fin_e);
    updateCount('fin-c-away', gameData.stats.away.fin_c);
    updateCount('fin-d-away', gameData.stats.away.fin_d);
    updateCount('ent-e-away', gameData.stats.away.ent_e);
    updateCount('ent-c-away', gameData.stats.away.ent_c);
    updateCount('ent-d-away', gameData.stats.away.ent_d);
    updateCount('gol-away', gameData.stats.away.gols);
    updateCount('esc-away', gameData.stats.away.esc);
    updateCount('falta-away', gameData.stats.away.falta);
}

// ***** CONFIGURAÇÃO DE TIMES *****
function loadTeamNames() {
    const homeTeam = localStorage.getItem('futtag_home_team');
    const awayTeam = localStorage.getItem('futtag_away_team');
    
    if (homeTeam) gameData.homeTeam = homeTeam;
    if (awayTeam) gameData.awayTeam = awayTeam;
}

function showTeamConfig() {
    document.getElementById('homeTeamInput').value = gameData.homeTeam;
    document.getElementById('awayTeamInput').value = gameData.awayTeam;
    document.getElementById('teamConfigModal').style.display = 'block';
}

function saveTeamConfig() {
    const homeTeam = document.getElementById('homeTeamInput').value.trim().toUpperCase();
    const awayTeam = document.getElementById('awayTeamInput').value.trim().toUpperCase();
    
    if (!homeTeam || !awayTeam) {
        alert('❌ Digite os nomes das duas equipes');
        return;
    }
    
    if (homeTeam === awayTeam) {
        alert('❌ Os nomes das equipes devem ser diferentes');
        return;
    }
    
    gameData.homeTeam = homeTeam;
    gameData.awayTeam = awayTeam;
    
    localStorage.setItem('futtag_home_team', homeTeam);
    localStorage.setItem('futtag_away_team', awayTeam);
    
    updateDisplay();
    document.getElementById('teamConfigModal').style.display = 'none';
}

function resetTeamConfig() {
    gameData.homeTeam = 'CASA';
    gameData.awayTeam = 'VISITANTE';
    
    localStorage.removeItem('futtag_home_team');
    localStorage.removeItem('futtag_away_team');
    
    document.getElementById('homeTeamInput').value = gameData.homeTeam;
    document.getElementById('awayTeamInput').value = gameData.awayTeam;
    updateDisplay();
}

// ***** SISTEMA DE FEEDBACK ***** 
// ✅ CORRIGIDO: Movido para bottom bar, feedback visual nas estrelas
let selectedRating = 0;

function showFeedbackModal() {
    selectedRating = 0;
    document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('feedbackModal').style.display = 'block';
}

// ✅ CORRIGIDO: Feedback visual persistente nas estrelas
function selectRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('.rating-btn').forEach((btn, index) => {
        if (index < rating) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function submitFeedback() {
    const name = document.getElementById('feedbackName').value.trim();
    const role = document.getElementById('feedbackRole').value;
    const experience = document.getElementById('feedbackExperience').value;
    const comments = document.getElementById('feedbackComments').value.trim();
    
    if (!name || !role || selectedRating === 0) {
        alert('❌ Preencha os campos obrigatórios: Nome, Função e Avaliação');
        return;
    }
    
    const feedback = {
        name,
        role,
        experience,
        rating: selectedRating,
        comments,
        timestamp: new Date().toISOString(),
        version: 'v3.2',
        userAgent: navigator.userAgent,
        sessionData: {
            sessions: analytics.sessionsCount,
            opens: analytics.appOpens
        }
    };
    
    console.log('📝 Feedback coletado:', feedback);
    
    alert('✅ Feedback enviado com sucesso!\n\nObrigado por ajudar a melhorar o FutTag Pro!');
    
    // Reset form
    document.getElementById('feedbackForm').reset();
    selectedRating = 0;
    document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('feedbackModal').style.display = 'none';
}

// ***** SISTEMA DE ESTATÍSTICAS *****
function showStatsModal() {
    const modal = document.getElementById('statsModal');
    currentStatsPage = 1;
    updateStatsDisplay();
    modal.style.display = 'block';
}

function updateStatsDisplay() {
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    // Update page indicator
    document.getElementById('statsPageIndicator').textContent = `${currentStatsPage}/${TOTAL_STATS_PAGES}`;
    
    // Update navigation buttons
    document.getElementById('prevStatsPage').disabled = currentStatsPage === 1;
    document.getElementById('nextStatsPage').disabled = currentStatsPage === TOTAL_STATS_PAGES;
    
    // Clear existing charts
    const chartsContainer = document.getElementById('statsCharts');
    chartsContainer.innerHTML = '';
    
    // Clear chart instances
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};
    
    if (currentStatsPage === 1) {
        // Página 1: Visão Geral + Finalizações + Entradas
        chartsContainer.innerHTML = `
            <div class="stats-page">
                <h3>📊 Página 1 - Visão Geral</h3>
                <div class="chart-grid">
                    <div class="chart-container">
                        <canvas id="overviewChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="shotsChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="entriesChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            createOverviewChart();
            createShotsChart();
            createEntriesChart();
        }, 100);
        
    } else if (currentStatsPage === 2) {
        // Página 2: Heatmaps + Distribuição por Zona
        chartsContainer.innerHTML = `
            <div class="stats-page">
                <h3>🗺️ Página 2 - Análise Espacial</h3>
                <div class="chart-grid">
                    <div class="chart-container">
                        <canvas id="heatmapShotsChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="heatmapEntriesChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="zoneDistributionChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            createHeatmapShotsChart();
            createHeatmapEntriesChart();
            createZoneDistributionChart();
        }, 100);
        
    } else if (currentStatsPage === 3) {
        // Página 3: Eventos Gerais + Timeline
        chartsContainer.innerHTML = `
            <div class="stats-page">
                <h3>⏱️ Página 3 - Eventos e Timeline</h3>
                <div class="chart-grid">
                    <div class="chart-container">
                        <canvas id="eventsChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="timelineChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="efficiencyChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            createEventsChart();
            createTimelineChart();
            createEfficiencyChart();
        }, 100);
    }
}

function prevStatsPage() {
    if (currentStatsPage > 1) {
        currentStatsPage--;
        updateStatsDisplay();
    }
}

function nextStatsPage() {
    if (currentStatsPage < TOTAL_STATS_PAGES) {
        currentStatsPage++;
        updateStatsDisplay();
    }
}

// ***** FUNÇÕES DE CRIAÇÃO DOS GRÁFICOS *****
function createOverviewChart() {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    const totalHome = homeStats.fin_e + homeStats.fin_c + homeStats.fin_d + 
                     homeStats.ent_e + homeStats.ent_c + homeStats.ent_d + 
                     homeStats.esc + homeStats.falta;
    const totalAway = awayStats.fin_e + awayStats.fin_c + awayStats.fin_d + 
                     awayStats.ent_e + awayStats.ent_c + awayStats.ent_d + 
                     awayStats.esc + awayStats.falta;
    
    chartInstances.overview = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [gameData.homeTeam, gameData.awayTeam],
            datasets: [
                {
                    label: 'Total de Eventos',
                    data: [totalHome, totalAway],
                    backgroundColor: ['#00bcd4', '#ff9800'],
                    borderColor: ['#00acc1', '#f57c00'],
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Visão Geral dos Eventos',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 14 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createShotsChart() {
    const ctx = document.getElementById('shotsChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    chartInstances.shots = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Finalizações Esq', 'Finalizações Centro', 'Finalizações Dir'],
            datasets: [
                {
                    label: gameData.homeTeam,
                    data: [homeStats.fin_e, homeStats.fin_c, homeStats.fin_d],
                    backgroundColor: 'rgba(0, 188, 212, 0.2)',
                    borderColor: '#00bcd4',
                    borderWidth: 2,
                    pointBackgroundColor: '#00bcd4'
                },
                {
                    label: gameData.awayTeam,
                    data: [awayStats.fin_e, awayStats.fin_c, awayStats.fin_d],
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    borderColor: '#ff9800',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff9800'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribuição das Finalizações',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#e0e0f0' }
                }
            }
        }
    });
}

function createEntriesChart() {
    const ctx = document.getElementById('entriesChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    chartInstances.entries = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Esquerda', 'Centro', 'Direita'],
            datasets: [
                {
                    label: gameData.homeTeam,
                    data: [homeStats.ent_e, homeStats.ent_c, homeStats.ent_d],
                    backgroundColor: '#00bcd4'
                },
                {
                    label: gameData.awayTeam,
                    data: [awayStats.ent_e, awayStats.ent_c, awayStats.ent_d],
                    backgroundColor: '#ff9800'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Entradas no Último Terço',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createHeatmapShotsChart() {
    const ctx = document.getElementById('heatmapShotsChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    // Simulated heatmap data for shots
    const heatmapData = [
        [homeStats.fin_e, homeStats.fin_c, homeStats.fin_d],
        [awayStats.fin_e, awayStats.fin_c, awayStats.fin_d]
    ];
    
    chartInstances.heatmapShots = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Esquerda', 'Centro', 'Direita'],
            datasets: [
                {
                    label: `${gameData.homeTeam} - Finalizações`,
                    data: [homeStats.fin_e, homeStats.fin_c, homeStats.fin_d],
                    backgroundColor: ['#00bcd4', '#00acc1', '#0097a7']
                },
                {
                    label: `${gameData.awayTeam} - Finalizações`,
                    data: [awayStats.fin_e, awayStats.fin_c, awayStats.fin_d],
                    backgroundColor: ['#ff9800', '#f57c00', '#ef6c00']
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mapa de Calor - Finalizações',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function createHeatmapEntriesChart() {
    const ctx = document.getElementById('heatmapEntriesChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    chartInstances.heatmapEntries = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Esquerda', 'Centro', 'Direita'],
            datasets: [
                {
                    label: `${gameData.homeTeam} - Entradas`,
                    data: [homeStats.ent_e, homeStats.ent_c, homeStats.ent_d],
                    backgroundColor: ['#9c27b0', '#8e24aa', '#7b1fa2']
                },
                {
                    label: `${gameData.awayTeam} - Entradas`,
                    data: [awayStats.ent_e, awayStats.ent_c, awayStats.ent_d],
                    backgroundColor: ['#ff5722', '#f4511e', '#e64a19']
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mapa de Calor - Entradas no Último Terço',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function createZoneDistributionChart() {
    const ctx = document.getElementById('zoneDistributionChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    const totalHomeZone = homeStats.fin_e + homeStats.fin_c + homeStats.fin_d + homeStats.ent_e + homeStats.ent_c + homeStats.ent_d;
    const totalAwayZone = awayStats.fin_e + awayStats.fin_c + awayStats.fin_d + awayStats.ent_e + awayStats.ent_c + awayStats.ent_d;
    
    chartInstances.zoneDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`${gameData.homeTeam}`, `${gameData.awayTeam}`],
            datasets: [{
                data: [totalHomeZone, totalAwayZone],
                backgroundColor: ['#00bcd4', '#ff9800'],
                borderColor: ['#00acc1', '#f57c00'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribuição Total por Zona',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 14 },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${value}\n(${percentage}%)`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createEventsChart() {
    const ctx = document.getElementById('eventsChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    chartInstances.events = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Gols', 'Escanteios', 'Faltas Ofensivas'], // ✅ CORRIGIDO: "Faltas Ofensivas"
            datasets: [
                {
                    label: gameData.homeTeam,
                    data: [homeStats.gols, homeStats.esc, homeStats.falta],
                    backgroundColor: '#00bcd4'
                },
                {
                    label: gameData.awayTeam,
                    data: [awayStats.gols, awayStats.esc, awayStats.falta],
                    backgroundColor: '#ff9800'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Eventos Gerais da Partida',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function createTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    
    // Agrupar eventos por período de 10 minutos
    const timeSlots = [];
    for (let i = 0; i < 100; i += 10) {
        timeSlots.push(`${i}-${i+10}'`);
    }
    
    const homeEventsByTime = new Array(timeSlots.length).fill(0);
    const awayEventsByTime = new Array(timeSlots.length).fill(0);
    
    gameData.events.forEach(event => {
        const minute = Math.floor(event.gameTime / 60000);
        const slotIndex = Math.min(Math.floor(minute / 10), timeSlots.length - 1);
        
        if (event.team === 'home') {
            homeEventsByTime[slotIndex]++;
        } else {
            awayEventsByTime[slotIndex]++;
        }
    });
    
    chartInstances.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeSlots,
            datasets: [
                {
                    label: gameData.homeTeam,
                    data: homeEventsByTime,
                    borderColor: '#00bcd4',
                    backgroundColor: 'rgba(0, 188, 212, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: gameData.awayTeam,
                    data: awayEventsByTime,
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Timeline dos Eventos',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function createEfficiencyChart() {
    const ctx = document.getElementById('efficiencyChart');
    if (!ctx) return;
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    const homeTotalShots = homeStats.fin_e + homeStats.fin_c + homeStats.fin_d;
    const awayTotalShots = awayStats.fin_e + awayStats.fin_c + awayStats.fin_d;
    
    const homeEfficiency = homeTotalShots > 0 ? ((homeStats.gols / homeTotalShots) * 100) : 0;
    const awayEfficiency = awayTotalShots > 0 ? ((awayStats.gols / awayTotalShots) * 100) : 0;
    
    chartInstances.efficiency = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Eficiência %', 'Total Finalizações', 'Gols', 'Escanteios', 'Faltas Ofensivas'], // ✅ CORRIGIDO: "Faltas Ofensivas"
            datasets: [
                {
                    label: gameData.homeTeam,
                    data: [homeEfficiency, homeTotalShots, homeStats.gols, homeStats.esc, homeStats.falta],
                    backgroundColor: 'rgba(0, 188, 212, 0.2)',
                    borderColor: '#00bcd4',
                    borderWidth: 2,
                    pointBackgroundColor: '#00bcd4'
                },
                {
                    label: gameData.awayTeam,
                    data: [awayEfficiency, awayTotalShots, awayStats.gols, awayStats.esc, awayStats.falta],
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    borderColor: '#ff9800',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff9800'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Análise de Eficiência',
                    color: '#e0e0f0'
                },
                legend: {
                    labels: { color: '#e0e0f0' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0c0' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#e0e0f0' }
                }
            }
        }
    });
}

// ***** GERAÇÃO DE PDF *****
function generatePDF() {
    if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        alert('❌ Erro: Bibliotecas PDF não carregadas');
        return;
    }
    
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    
    // Cabeçalho do PDF com proteção beta
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FUTTAG PRO v3.2 BETA - RELATÓRIO DE ANÁLISE', 20, 20);
    
    // ✅ Informações de proteção beta
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Desenvolvido por Carlos Bonin - Juega10 | carlos@juega10.com.br', 20, 28);
    doc.text('Versão Beta - Uso restrito | Expiração: 31/03/2026', 20, 32); // ✅ CORRIGIDO: 2026
    
    // Informações da partida
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const gameInfo = [
        `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
        `Partida: ${gameData.homeTeam} ${gameData.homeScore} × ${gameData.awayScore} ${gameData.awayTeam}`,
        `Duração: ${formatTime(gameData.elapsedTime)} (${gameData.currentHalf}°T)`,
        `Total de Eventos: ${gameData.events.length}`
    ];
    
    let yPos = 45;
    gameInfo.forEach(info => {
        doc.text(info, 20, yPos);
        yPos += 8;
    });
    
    // Estatísticas detalhadas
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTATÍSTICAS DETALHADAS', 20, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const homeStats = gameData.stats.home;
    const awayStats = gameData.stats.away;
    
    const statsData = [
        ['Estatística', gameData.homeTeam, gameData.awayTeam],
        ['Gols', homeStats.gols, awayStats.gols],
        ['Finalizações Esquerda', homeStats.fin_e, awayStats.fin_e],
        ['Finalizações Centro', homeStats.fin_c, awayStats.fin_c],
        ['Finalizações Direita', homeStats.fin_d, awayStats.fin_d],
        ['Entradas Esquerda', homeStats.ent_e, awayStats.ent_e],
        ['Entradas Centro', homeStats.ent_c, awayStats.ent_c],
        ['Entradas Direita', homeStats.ent_d, awayStats.ent_d],
        ['Escanteios', homeStats.esc, awayStats.esc],
        ['Faltas Ofensivas', homeStats.falta, awayStats.falta] // ✅ CORRIGIDO: "Faltas Ofensivas"
    ];
    
    // Tabela de estatísticas
    const tableStartY = yPos;
    const cellHeight = 6;
    const cellWidth = 50;
    
    statsData.forEach((row, index) => {
        const currentY = tableStartY + (index * cellHeight);
        
        // Cabeçalho em negrito
        if (index === 0) {
            doc.setFont('helvetica', 'bold');
        } else {
            doc.setFont('helvetica', 'normal');
        }
        
        // Células da tabela
        doc.rect(20, currentY - 4, cellWidth, cellHeight);
        doc.rect(20 + cellWidth, currentY - 4, cellWidth, cellHeight);
        doc.rect(20 + (cellWidth * 2), currentY - 4, cellWidth, cellHeight);
        
        // Texto
        doc.text(row[0], 22, currentY);
        doc.text(String(row[1]), 22 + cellWidth, currentY);
        doc.text(String(row[2]), 22 + (cellWidth * 2), currentY);
    });
    
    // Lista de eventos
    yPos = tableStartY + (statsData.length * cellHeight) + 20;
    
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CRONOLOGIA DOS EVENTOS', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    gameData.events.slice(-15).forEach(event => { // Últimos 15 eventos
        const eventText = `${event.formattedTime} - ${event.team === 'home' ? gameData.homeTeam : gameData.awayTeam} - ${event.type.toUpperCase()}${event.zone ? ` (${event.zone.toUpperCase()})` : ''}`;
        
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.text(eventText, 20, yPos);
        yPos += 5;
    });
    
    // Rodapé com proteção
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`FutTag Pro v3.2 Beta - Página ${i}/${pageCount} | © 2024 Juega10`, 20, 290);
        doc.text('Relatório gerado automaticamente - Versão Beta', 150, 290);
    }
    
    // Salvar PDF
    const filename = `FutTagPro_${gameData.homeTeam}_vs_${gameData.awayTeam}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    alert('✅ Relatório PDF gerado com sucesso!\n\n📄 Nome: ' + filename);
}

// ***** EXPORTAÇÃO XML *****
function exportToXML() {
    const timestamp = new Date().toISOString();
    const filename = `futtag_${gameData.homeTeam}_vs_${gameData.awayTeam}_${timestamp.split('T')[0]}.xml`;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- FutTag Pro v3.2 - Exportação XML -->
<!-- Desenvolvido por Carlos Bonin - Juega10 -->
<!-- Data: ${new Date().toLocaleString('pt-BR')} -->
<match>
    <metadata>
        <version>FutTag Pro v3.2 BETA</version>
        <export_time>${timestamp}</export_time>
        <analyzer>FutTag Pro</analyzer>
        <developer>Carlos Bonin - Juega10</developer>
        <contact>carlos@juega10.com.br</contact>
        <expiration>2026-03-31</expiration>
    </metadata>
    <game_info>
        <home_team>${gameData.homeTeam}</home_team>
        <away_team>${gameData.awayTeam}</away_team>
        <final_score>${gameData.homeScore}-${gameData.awayScore}</final_score>
        <duration>${formatTime(gameData.elapsedTime)}</duration>
        <last_half>${gameData.currentHalf}</last_half>
    </game_info>
    <events>`;
    
    gameData.events.forEach(event => {
        xml += `
        <event>
            <id>${event.id}</id>
            <type>${event.type}</type>
            <team>${event.team}</team>
            <zone>${event.zone || 'N/A'}</zone>
            <half>${event.half}</half>
            <game_time>${event.formattedTime}</game_time>
            <timestamp>${new Date(event.timestamp).toISOString()}</timestamp>
        </event>`;
    });
    
    xml += `
    </events>
    <statistics>
        <home_stats>
            <team_name>${gameData.homeTeam}</team_name>
            <goals>${gameData.stats.home.gols}</goals>
            <shots_left>${gameData.stats.home.fin_e}</shots_left>
            <shots_center>${gameData.stats.home.fin_c}</shots_center>
            <shots_right>${gameData.stats.home.fin_d}</shots_right>
            <entries_left>${gameData.stats.home.ent_e}</entries_left>
            <entries_center>${gameData.stats.home.ent_c}</entries_center>
            <entries_right>${gameData.stats.home.ent_d}</entries_right>
            <corners>${gameData.stats.home.esc}</corners>
            <offensive_fouls>${gameData.stats.home.falta}</offensive_fouls>
        </home_stats>
        <away_stats>
            <team_name>${gameData.awayTeam}</team_name>
            <goals>${gameData.stats.away.gols}</goals>
            <shots_left>${gameData.stats.away.fin_e}</shots_left>
            <shots_center>${gameData.stats.away.fin_c}</shots_center>
            <shots_right>${gameData.stats.away.fin_d}</shots_right>
            <entries_left>${gameData.stats.away.ent_e}</entries_left>
            <entries_center>${gameData.stats.away.ent_c}</entries_center>
            <entries_right>${gameData.stats.away.ent_d}</entries_right>
            <corners>${gameData.stats.away.esc}</corners>
            <offensive_fouls>${gameData.stats.away.falta}</offensive_fouls>
        </away_stats>
    </statistics>
</match>`;
    
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Arquivo XML exportado com sucesso!\n\n' + 
          '📄 Nome: ' + filename + '\n' +
          '📊 Eventos: ' + gameData.events.length + '\n' +
          '⚽ Placar: ' + gameData.homeScore + ' × ' + gameData.awayScore);
}
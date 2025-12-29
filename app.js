// ***** FUTTAG PRO v3.2 BETA - SISTEMA DE ANÁLISE ESPORTIVA EM TEMPO REAL *****
// Desenvolvido por Carlos Bonin
// Data: Dezembro 2024
// Email: carlosmattes96@gmail.com | WhatsApp: (47) 9 9153-0653
// ****************************************************************************

// ***** CONFIGURAÇÃO DE PROTEÇÃO BETA *****
const BETA_CONFIG = {
    enabled: true,
    expirationDate: '2026-03-31',
    users: {
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

// ***** ERROR HANDLING ROBUSTO *****
window.addEventListener('error', function(e) {
    console.error('🚨 Erro JavaScript:', e.error);
    console.error('📍 Arquivo:', e.filename, 'Linha:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Promise rejeitada:', e.reason);
});

// ***** INICIALIZAÇÃO *****
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 FutTag Pro v3.2 iniciando...');
    
    try {
        analytics.appOpens++;
        localStorage.setItem('futtag_opens', analytics.appOpens.toString());
        
        console.log('🔐 BETA_CONFIG:', BETA_CONFIG);
        
        if (!checkBetaAccess()) {
            console.log('❌ Acesso beta negado, mostrando modal...');
            showBetaAccessModal();
            return;
        }
        
        console.log('✅ Acesso beta autorizado, inicializando app...');
        initializeApp();
    } catch (error) {
        console.error('🚨 Erro na inicialização:', error);
        alert('❌ Erro crítico na inicialização. Recarregue a página.');
    }
});

// ***** FUNÇÕES DE PROTEÇÃO BETA *****
function checkBetaAccess() {
    console.log('🔍 Verificando acesso beta...');
    
    try {
        if (!BETA_CONFIG.enabled) {
            console.log('✅ Beta desabilitado, acesso liberado');
            return true;
        }
        
        const now = new Date();
        const expirationDate = new Date(BETA_CONFIG.expirationDate);
        console.log('📅 Data atual:', now.toISOString());
        console.log('📅 Data expiração:', expirationDate.toISOString());
        
        if (now > expirationDate) {
            alert('❌ Versão Beta expirada!\n\nData limite: ' + expirationDate.toLocaleDateString('pt-BR') + 
                  '\n\nContate: carlosmattes96@gmail.com');
            return false;
        }
        
        const savedUser = localStorage.getItem('futtag_beta_user');
        const savedCode = localStorage.getItem('futtag_beta_code');
        
        console.log('💾 Dados salvos - Usuário:', savedUser, 'Código:', savedCode ? '***' : 'null');
        
        if (savedUser && savedCode && BETA_CONFIG.users[savedUser] === savedCode) {
            console.log('✅ Login salvo válido');
            return true;
        }
        
        console.log('❌ Necessário fazer login');
        return false;
    } catch (error) {
        console.error('🚨 Erro na verificação beta:', error);
        return false;
    }
}

function showBetaAccessModal() {
    console.log('📱 Exibindo modal de acesso beta...');
    
    try {
        const modal = document.getElementById('betaAccessModal');
        
        if (!modal) {
            console.error('❌ Modal betaAccessModal não encontrado no HTML!');
            alert('❌ Erro: Modal de acesso não encontrado. Verifique o HTML.');
            return;
        }
        
        modal.style.display = 'block';
        
        setTimeout(() => {
            const userInput = document.getElementById('betaUser');
            if (userInput) {
                userInput.focus();
                console.log('🎯 Foco definido no campo usuário');
            } else {
                console.error('❌ Campo betaUser não encontrado!');
            }
        }, 300);
    } catch (error) {
        console.error('🚨 Erro ao exibir modal:', error);
    }
}

// ✅ FUNÇÃO GLOBAL para validar acesso
window.validateBetaAccess = function() {
    console.log('🔐 Iniciando validação de acesso...');
    
    try {
        const userInput = document.getElementById('betaUser');
        const codeInput = document.getElementById('betaCode');
        
        console.log('🔍 Campos encontrados:', { userInput: !!userInput, codeInput: !!codeInput });
        
        if (!userInput) {
            console.error('❌ Campo betaUser não encontrado!');
            alert('❌ Erro: Campo de usuário não encontrado');
            return;
        }
        
        if (!codeInput) {
            console.error('❌ Campo betaCode não encontrado!');
            alert('❌ Erro: Campo de código não encontrado');
            return;
        }
        
        const user = userInput.value.trim().toUpperCase();
        const code = codeInput.value.trim();
        
        console.log('📝 Dados inseridos - Usuário:', user, 'Código:', code ? '***' : 'vazio');
        
        if (!user) {
            alert('❌ Digite o usuário');
            userInput.focus();
            return;
        }
        
        if (!code) {
            alert('❌ Digite o código de acesso');
            codeInput.focus();
            return;
        }
        
        if (!BETA_CONFIG.users.hasOwnProperty(user)) {
            console.log('❌ Usuário inválido:', user);
            console.log('📋 Usuários válidos:', Object.keys(BETA_CONFIG.users));
            alert('❌ Usuário não autorizado');
            userInput.focus();
            userInput.select();
            return;
        }
        
        const expectedCode = BETA_CONFIG.users[user];
        console.log('🔍 Código esperado:', expectedCode, 'Código inserido:', code);
        
        if (expectedCode !== code) {
            console.log('❌ Código incorreto para usuário:', user);
            alert('❌ Código de acesso incorreto');
            codeInput.focus();
            codeInput.select();
            return;
        }
        
        console.log('✅ Login válido! Salvando dados...');
        
        localStorage.setItem('futtag_beta_user', user);
        localStorage.setItem('futtag_beta_code', code);
        localStorage.setItem('futtag_beta_validated_at', new Date().toISOString());
        
        const modal = document.getElementById('betaAccessModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        userInput.value = '';
        codeInput.value = '';
        
        alert('✅ Acesso liberado!\n\nBem-vindo ao FutTag Pro v3.2 Beta');
        
        console.log('🚀 Inicializando aplicação...');
        initializeApp();
    } catch (error) {
        console.error('🚨 Erro na validação:', error);
        alert('❌ Erro na validação. Tente novamente.');
    }
};

// ***** INICIALIZAÇÃO DO APLICATIVO *****
function initializeApp() {
    console.log('🎮 Inicializando aplicação...');
    
    try {
        setupEventListeners();
        loadTeamNames();
        updateDisplay();
        updateTimer();
        
        analytics.sessionsCount++;
        localStorage.setItem('futtag_sessions', analytics.sessionsCount.toString());
        
        const savedUser = localStorage.getItem('futtag_beta_user');
        if (savedUser) {
            console.log('🔐 Usuário logado:', savedUser);
        }
        
        console.log('✅ Aplicação inicializada com sucesso!');
    } catch (error) {
        console.error('🚨 Erro na inicialização do app:', error);
        alert('❌ Erro na inicialização. Recarregue a página.');
    }
}

function setupEventListeners() {
    console.log('🎧 Configurando event listeners...');
    
    try {
        // Controles de tempo
        const half1Btn = document.getElementById('half1Btn');
        const half2Btn = document.getElementById('half2Btn');
        
        if (half1Btn) half1Btn.addEventListener('click', () => setHalf(1));
        if (half2Btn) half2Btn.addEventListener('click', () => setHalf(2));
        
        // Botões de ação principais
        const startBtn = document.getElementById('startBtn');
        const undoBtn = document.getElementById('undoBtn');
        const resetBtn = document.getElementById('resetBtn');
        const statsBtn = document.getElementById('statsBtn');
        const configBtn = document.getElementById('configBtn');
        const exportBtn = document.getElementById('exportBtn');
        const feedbackBtn = document.getElementById('feedbackBtn');
        
        if (startBtn) startBtn.addEventListener('click', toggleTimer);
        if (undoBtn) undoBtn.addEventListener('click', undoLastEvent);
        if (resetBtn) resetBtn.addEventListener('click', resetGame);
        if (statsBtn) statsBtn.addEventListener('click', showStatsModal);
        if (configBtn) configBtn.addEventListener('click', showTeamConfig);
        if (exportBtn) exportBtn.addEventListener('click', exportToXML);
        if (feedbackBtn) feedbackBtn.addEventListener('click', showFeedbackModal);

        setupEventButtons();
        setupModalListeners();
        
        console.log('✅ Event listeners configurados');
    } catch (error) {
        console.error('🚨 Erro ao configurar event listeners:', error);
    }
}

function setupEventButtons() {
    try {
        // Finalizações
        ['fin-e-home', 'fin-c-home', 'fin-d-home', 'fin-e-away', 'fin-c-away', 'fin-d-away'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => handleEvent(e.target));
            }
        });
        
        // Entradas no último terço
        ['ent-e-home', 'ent-c-home', 'ent-d-home', 'ent-e-away', 'ent-c-away', 'ent-d-away'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => handleEvent(e.target));
            }
        });
        
        // Gols
        ['gol-home', 'gol-away'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => handleEvent(e.target));
            }
        });
        
        // Escanteios e faltas ofensivas
        ['esc-home', 'esc-away', 'falta-home', 'falta-away'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => handleEvent(e.target));
            }
        });
    } catch (error) {
        console.error('🚨 Erro ao configurar botões de evento:', error);
    }
}

function setupModalListeners() {
    console.log('🎭 Configurando listeners dos modais...');
    
    try {
        // Fechar modals
        document.querySelectorAll('.close-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
        
        // Event listeners para navegação por Enter no beta access
        const betaUser = document.getElementById('betaUser');
        const betaCode = document.getElementById('betaCode');
        
        if (betaUser) {
            betaUser.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (betaCode) {
                        betaCode.focus();
                    } else {
                        validateBetaAccess();
                    }
                }
            });
            console.log('✅ Event listener Enter configurado para betaUser');
        }
        
        if (betaCode) {
            betaCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validateBetaAccess();
                }
            });
            console.log('✅ Event listener Enter configurado para betaCode');
        }
        
        // Configuração de times
        const saveTeamBtn = document.getElementById('saveTeamConfig');
        const resetTeamBtn = document.getElementById('resetTeamConfig');
        if (saveTeamBtn) saveTeamBtn.addEventListener('click', saveTeamConfig);
        if (resetTeamBtn) resetTeamBtn.addEventListener('click', resetTeamConfig);
        
        // Feedback
        const submitFeedbackBtn = document.getElementById('submitFeedback');
        const cancelFeedbackBtn = document.getElementById('cancelFeedback');
        if (submitFeedbackBtn) submitFeedbackBtn.addEventListener('click', submitFeedback);
        if (cancelFeedbackBtn) {
            cancelFeedbackBtn.addEventListener('click', () => {
                const modal = document.getElementById('feedbackModal');
                if (modal) modal.style.display = 'none';
            });
        }

        // Estatísticas
        const prevStatsBtn = document.getElementById('prevStatsPage');
        const nextStatsBtn = document.getElementById('nextStatsPage');
        const generatePDFBtn = document.getElementById('generatePDF');
        
        if (prevStatsBtn) prevStatsBtn.addEventListener('click', prevStatsPage);
        if (nextStatsBtn) nextStatsBtn.addEventListener('click', nextStatsPage);
        if (generatePDFBtn) generatePDFBtn.addEventListener('click', generatePDF);
        
        console.log('✅ Listeners dos modais configurados');
    } catch (error) {
        console.error('🚨 Erro ao configurar modal listeners:', error);
    }
}

// ***** FUNÇÕES DO TIMER *****
function setHalf(half) {
    try {
        gameData.currentHalf = half;
        document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('active'));
        const halfBtn = document.getElementById(`half${half}Btn`);
        if (halfBtn) halfBtn.classList.add('active');
        updateDisplay();
    } catch (error) {
        console.error('🚨 Erro ao definir tempo:', error);
    }
}

function toggleTimer() {
    try {
        const btn = document.getElementById('startBtn');
        if (!btn) return;
        
        if (gameData.timerRunning) {
            gameData.timerRunning = false;
            btn.textContent = 'INICIAR';
            btn.style.background = 'var(--gradient-accent)';
        } else {
            gameData.timerRunning = true;
            gameData.startTime = Date.now() - gameData.elapsedTime;
            btn.textContent = 'PAUSAR';
            btn.style.background = 'linear-gradient(45deg, #9c27b0, #e91e63)';
            updateTimer();
        }
    } catch (error) {
        console.error('🚨 Erro no timer:', error);
    }
}

function updateTimer() {
    try {
        if (!gameData.timerRunning) return;
        gameData.elapsedTime = Date.now() - gameData.startTime;
        updateDisplay();
        requestAnimationFrame(updateTimer);
    } catch (error) {
        console.error('🚨 Erro na atualização do timer:', error);
    }
}

function formatTime(ms) {
    try {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('🚨 Erro na formatação de tempo:', error);
        return '00:00';
    }
}

// ***** FUNÇÕES DE EVENTOS *****
function handleEvent(button) {
    try {
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
        } else if (event.type === 'falta') {
            gameData.stats[event.team].falta++;
        }
        
        gameData.events.push(event);
        updateDisplay();
        updateEventCounts();
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } catch (error) {
        console.error('🚨 Erro ao processar evento:', error);
    }
}

function undoLastEvent() {
    try {
        if (gameData.events.length === 0) return;
        
        const lastEvent = gameData.events.pop();
        
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
    } catch (error) {
        console.error('🚨 Erro ao desfazer evento:', error);
    }
}

function resetGame() {
    try {
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
        if (startBtn) {
            startBtn.textContent = 'INICIAR';
            startBtn.style.background = 'var(--gradient-accent)';
        }
    } catch (error) {
        console.error('🚨 Erro ao resetar jogo:', error);
    }
}

// ***** FUNÇÕES DE DISPLAY *****
function updateDisplay() {
    try {
        const scoreDisplay = document.querySelector('.score-display');
        const timerDisplay = document.querySelector('.timer-display');
        const halfDisplay = document.querySelector('.current-half-display');
        const homeNameDisplay = document.querySelector('.team-column.home .team-name');
        const awayNameDisplay = document.querySelector('.team-column.away .team-name');
        
        if (scoreDisplay) scoreDisplay.textContent = `${gameData.homeScore} × ${gameData.awayScore}`;
        if (timerDisplay) timerDisplay.textContent = formatTime(gameData.elapsedTime);
        if (halfDisplay) halfDisplay.textContent = `${gameData.currentHalf}°T`;
        if (homeNameDisplay) homeNameDisplay.textContent = gameData.homeTeam;
        if (awayNameDisplay) awayNameDisplay.textContent = gameData.awayTeam;
    } catch (error) {
        console.error('🚨 Erro ao atualizar display:', error);
    }
}

function updateEventCounts() {
    try {
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
        
        updateCount('fin-e-home', gameData.stats.home.fin_e);
        updateCount('fin-c-home', gameData.stats.home.fin_c);
        updateCount('fin-d-home', gameData.stats.home.fin_d);
        updateCount('ent-e-home', gameData.stats.home.ent_e);
        updateCount('ent-c-home', gameData.stats.home.ent_c);
        updateCount('ent-d-home', gameData.stats.home.ent_d);
        updateCount('gol-home', gameData.stats.home.gols);
        updateCount('esc-home', gameData.stats.home.esc);
        updateCount('falta-home', gameData.stats.home.falta);
        
        updateCount('fin-e-away', gameData.stats.away.fin_e);
        updateCount('fin-c-away', gameData.stats.away.fin_c);
        updateCount('fin-d-away', gameData.stats.away.fin_d);
        updateCount('ent-e-away', gameData.stats.away.ent_e);
        updateCount('ent-c-away', gameData.stats.away.ent_c);
        updateCount('ent-d-away', gameData.stats.away.ent_d);
        updateCount('gol-away', gameData.stats.away.gols);
        updateCount('esc-away', gameData.stats.away.esc);
        updateCount('falta-away', gameData.stats.away.falta);
    } catch (error) {
        console.error('🚨 Erro ao atualizar contadores:', error);
    }
}

// ***** CONFIGURAÇÃO DE TIMES *****
function loadTeamNames() {
    try {
        const homeTeam = localStorage.getItem('futtag_home_team');
        const awayTeam = localStorage.getItem('futtag_away_team');
        
        if (homeTeam) gameData.homeTeam = homeTeam;
        if (awayTeam) gameData.awayTeam = awayTeam;
    } catch (error) {
        console.error('🚨 Erro ao carregar nomes dos times:', error);
    }
}

function showTeamConfig() {
    try {
        const homeInput = document.getElementById('homeTeamInput');
        const awayInput = document.getElementById('awayTeamInput');
        const modal = document.getElementById('teamConfigModal');
        
        if (homeInput) homeInput.value = gameData.homeTeam;
        if (awayInput) awayInput.value = gameData.awayTeam;
        if (modal) modal.style.display = 'block';
    } catch (error) {
        console.error('🚨 Erro ao exibir configuração:', error);
    }
}

function saveTeamConfig() {
    try {
        const homeInput = document.getElementById('homeTeamInput');
        const awayInput = document.getElementById('awayTeamInput');
        
        if (!homeInput || !awayInput) return;
        
        const homeTeam = homeInput.value.trim().toUpperCase();
        const awayTeam = awayInput.value.trim().toUpperCase();
        
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
        
        const modal = document.getElementById('teamConfigModal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        console.error('🚨 Erro ao salvar configuração:', error);
    }
}

function resetTeamConfig() {
    try {
        gameData.homeTeam = 'CASA';
        gameData.awayTeam = 'VISITANTE';
        
        localStorage.removeItem('futtag_home_team');
        localStorage.removeItem('futtag_away_team');
        
        const homeInput = document.getElementById('homeTeamInput');
        const awayInput = document.getElementById('awayTeamInput');
        
        if (homeInput) homeInput.value = gameData.homeTeam;
        if (awayInput) awayInput.value = gameData.awayTeam;
        
        updateDisplay();
    } catch (error) {
        console.error('🚨 Erro ao resetar configuração:', error);
    }
}

// ***** SISTEMA DE FEEDBACK ***** 
let selectedRating = 0;

function showFeedbackModal() {
    try {
        selectedRating = 0;
        document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
        const modal = document.getElementById('feedbackModal');
        if (modal) modal.style.display = 'block';
    } catch (error) {
        console.error('🚨 Erro ao exibir feedback:', error);
    }
}

window.selectRating = function(rating) {
    try {
        selectedRating = rating;
        document.querySelectorAll('.rating-btn').forEach((btn, index) => {
            if (index < rating) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    } catch (error) {
        console.error('🚨 Erro ao selecionar rating:', error);
    }
};

function submitFeedback() {
    try {
        const nameInput = document.getElementById('feedbackName');
        const roleInput = document.getElementById('feedbackRole');
        const experienceInput = document.getElementById('feedbackExperience');
        const commentsInput = document.getElementById('feedbackComments');
        
        if (!nameInput || !roleInput) return;
        
        const name = nameInput.value.trim();
        const role = roleInput.value;
        const experience = experienceInput ? experienceInput.value : '';
        const comments = commentsInput ? commentsInput.value.trim() : '';
        
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
            betaUser: localStorage.getItem('futtag_beta_user'),
            userAgent: navigator.userAgent,
            sessionData: {
                sessions: analytics.sessionsCount,
                opens: analytics.appOpens
            },
            contact: 'carlosmattes96@gmail.com'
        };
        
        console.log('📝 Feedback coletado:', feedback);
        
        alert('✅ Feedback enviado com sucesso!\n\nObrigado por ajudar a melhorar o FutTag Pro!');
        
        const form = document.getElementById('feedbackForm');
        if (form) form.reset();
        selectedRating = 0;
        document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
        
        const modal = document.getElementById('feedbackModal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        console.error('🚨 Erro ao enviar feedback:', error);
    }
}

// ***** SISTEMA DE ESTATÍSTICAS *****
function showStatsModal() {
    try {
        const modal = document.getElementById('statsModal');
        if (!modal) return;
        
        currentStatsPage = 1;
        updateStatsDisplay();
        modal.style.display = 'block';
    } catch (error) {
        console.error('🚨 Erro ao exibir estatísticas:', error);
    }
}

function updateStatsDisplay() {
    try {
        const pageIndicator = document.getElementById('statsPageIndicator');
        if (pageIndicator) {
            pageIndicator.textContent = `${currentStatsPage}/${TOTAL_STATS_PAGES}`;
        }
        
        const prevBtn = document.getElementById('prevStatsPage');
        const nextBtn = document.getElementById('nextStatsPage');
        if (prevBtn) prevBtn.disabled = currentStatsPage === 1;
        if (nextBtn) nextBtn.disabled = currentStatsPage === TOTAL_STATS_PAGES;
        
        const chartsContainer = document.getElementById('statsCharts');
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
        
        Object.values(chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        chartInstances = {};
        
        if (currentStatsPage === 1) {
            if (chartsContainer) {
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
            }
            
            setTimeout(() => {
                createOverviewChart();
                createShotsChart();
                createEntriesChart();
            }, 100);
            
        } else if (currentStatsPage === 2) {
            if (chartsContainer) {
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
            }
            
            setTimeout(() => {
                createHeatmapShotsChart();
                createHeatmapEntriesChart();
                createZoneDistributionChart();
            }, 100);
            
        } else if (currentStatsPage === 3) {
            if (chartsContainer) {
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
            }
            
            setTimeout(() => {
                createEventsChart();
                createTimelineChart();
                createEfficiencyChart();
            }, 100);
        }
    } catch (error) {
        console.error('🚨 Erro ao atualizar estatísticas:', error);
    }
}

function prevStatsPage() {
    try {
        if (currentStatsPage > 1) {
            currentStatsPage--;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('🚨 Erro na página anterior:', error);
    }
}

function nextStatsPage() {
    try {
        if (currentStatsPage < TOTAL_STATS_PAGES) {
            currentStatsPage++;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('🚨 Erro na próxima página:', error);
    }
}

// ***** FUNÇÕES DE CRIAÇÃO DOS GRÁFICOS *****
function createOverviewChart() {
    try {
        const ctx = document.getElementById('overviewChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico overview:', error);
    }
}

function createShotsChart() {
    try {
        const ctx = document.getElementById('shotsChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico de finalizações:', error);
    }
}

function createEntriesChart() {
    try {
        const ctx = document.getElementById('entriesChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico de entradas:', error);
    }
}

function createHeatmapShotsChart() {
    try {
        const ctx = document.getElementById('heatmapShotsChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const homeStats = gameData.stats.home;
        const awayStats = gameData.stats.away;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar heatmap de finalizações:', error);
    }
}

function createHeatmapEntriesChart() {
    try {
        const ctx = document.getElementById('heatmapEntriesChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar heatmap de entradas:', error);
    }
}

function createZoneDistributionChart() {
    try {
        const ctx = document.getElementById('zoneDistributionChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
                    }
                }
            }
        });
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico de distribuição:', error);
    }
}

function createEventsChart() {
    try {
        const ctx = document.getElementById('eventsChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const homeStats = gameData.stats.home;
        const awayStats = gameData.stats.away;
        
        chartInstances.events = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Gols', 'Escanteios', 'Faltas Ofensivas'],
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
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico de eventos:', error);
    }
}

function createTimelineChart() {
    try {
        const ctx = document.getElementById('timelineChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
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
    } catch (error) {
        console.error('🚨 Erro ao criar timeline:', error);
    }
}

function createEfficiencyChart() {
    try {
        const ctx = document.getElementById('efficiencyChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        const homeStats = gameData.stats.home;
        const awayStats = gameData.stats.away;
        
        const homeTotalShots = homeStats.fin_e + homeStats.fin_c + homeStats.fin_d;
        const awayTotalShots = awayStats.fin_e + awayStats.fin_c + awayStats.fin_d;
        
        const homeEfficiency = homeTotalShots > 0 ? ((homeStats.gols / homeTotalShots) * 100) : 0;
        const awayEfficiency = awayTotalShots > 0 ? ((awayStats.gols / awayTotalShots) * 100) : 0;
        
        chartInstances.efficiency = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Eficiência %', 'Total Finalizações', 'Gols', 'Escanteios', 'Faltas Ofensivas'],
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
    } catch (error) {
        console.error('🚨 Erro ao criar gráfico de eficiência:', error);
    }
}

// ***** GERAÇÃO DE PDF *****
function generatePDF() {
    try {
        if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
            alert('❌ Erro: Bibliotecas PDF não carregadas');
            return;
        }
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('FUTTAG PRO v3.2 BETA - RELATÓRIO DE ANÁLISE', 20, 20);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Desenvolvido por Carlos Bonin | carlosmattes96@gmail.com', 20, 28);
        doc.text('Versão Beta - Uso restrito | Expiração: 31/03/2026', 20, 32);
        doc.text('WhatsApp: (47) 9 9153-0653', 20, 36);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const gameInfo = [
            `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
            `Partida: ${gameData.homeTeam} ${gameData.homeScore} × ${gameData.awayScore} ${gameData.awayTeam}`,
            `Duração: ${formatTime(gameData.elapsedTime)} (${gameData.currentHalf}°T)`,
            `Total de Eventos: ${gameData.events.length}`,
            `Usuário: ${localStorage.getItem('futtag_beta_user') || 'N/A'}`
        ];
        
        let yPos = 50;
        gameInfo.forEach(info => {
            doc.text(info, 20, yPos);
            yPos += 8;
        });
        
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
            ['Faltas Ofensivas', homeStats.falta, awayStats.falta]
        ];
        
        const tableStartY = yPos;
        const cellHeight = 6;
        const cellWidth = 50;
        
        statsData.forEach((row, index) => {
            const currentY = tableStartY + (index * cellHeight);
            
            if (index === 0) {
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setFont('helvetica', 'normal');
            }
            
            doc.rect(20, currentY - 4, cellWidth, cellHeight);
            doc.rect(20 + cellWidth, currentY - 4, cellWidth, cellHeight);
            doc.rect(20 + (cellWidth * 2), currentY - 4, cellWidth, cellHeight);
            
            doc.text(row[0], 22, currentY);
            doc.text(String(row[1]), 22 + cellWidth, currentY);
            doc.text(String(row[2]), 22 + (cellWidth * 2), currentY);
        });
        
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
        
        gameData.events.slice(-15).forEach(event => {
            const eventText = `${event.formattedTime} - ${event.team === 'home' ? gameData.homeTeam : gameData.awayTeam} - ${event.type.toUpperCase()}${event.zone ? ` (${event.zone.toUpperCase()})` : ''}`;
            
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.text(eventText, 20, yPos);
            yPos += 5;
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`FutTag Pro v3.2 Beta - Página ${i}/${pageCount} | © 2024 Carlos Bonin`, 20, 290);
            doc.text('Relatório gerado automaticamente - Versão Beta', 150, 290);
        }
        
        const filename = `FutTagPro_${gameData.homeTeam}_vs_${gameData.awayTeam}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        alert('✅ Relatório PDF gerado com sucesso!\n\n📄 Nome: ' + filename);
    } catch (error) {
        console.error('🚨 Erro ao gerar PDF:', error);
        alert('❌ Erro ao gerar PDF. Tente novamente.');
    }
}

// ***** EXPORTAÇÃO XML *****
function exportToXML() {
    try {
        const timestamp = new Date().toISOString();
        const filename = `futtag_${gameData.homeTeam}_vs_${gameData.awayTeam}_${timestamp.split('T')[0]}.xml`;
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- FutTag Pro v3.2 - Exportação XML -->
<!-- Desenvolvido por Carlos Bonin -->
<!-- Data: ${new Date().toLocaleString('pt-BR')} -->
<match>
    <metadata>
        <version>FutTag Pro v3.2 BETA</version>
        <export_time>${timestamp}</export_time>
        <analyzer>FutTag Pro</analyzer>
        <developer>Carlos Bonin</developer>
        <contact>carlosmattes96@gmail.com</contact>
        <whatsapp>(47) 9 9153-0653</whatsapp>
        <expiration>2026-03-31</expiration>
        <beta_user>${localStorage.getItem('futtag_beta_user') || 'N/A'}</beta_user>
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
    } catch (error) {
        console.error('🚨 Erro ao exportar XML:', error);
        alert('❌ Erro ao exportar XML. Tente novamente.');
    }
}

// ✅ FUNÇÃO para limpar acesso (logout)
window.clearBetaAccess = function() {
    try {
        localStorage.removeItem('futtag_beta_user');
        localStorage.removeItem('futtag_beta_code');
        localStorage.removeItem('futtag_beta_validated_at');
        location.reload();
    } catch (error) {
        console.error('🚨 Erro ao limpar acesso:', error);
    }
};

console.log('✅ FutTag Pro v3.2 carregado com sucesso!');
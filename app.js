// ===== CONFIGURACAO =====
const CONFIG = {
  teams: ["LEC", "ADV"],
  quickActions: {
    LEC: ["GOL", "ESC OF", "FL OF"],
    ADV: ["GOL", "ESC DEF", "FL DEF"]
  },
  clip: { pre: 25, post: 10 } // segundos
};

// ===== ESTADO =====
let isRunning = false;
let timerInterval = null;
let elapsedMs = 0;

const state = {
  score: { LEC: 0, ADV: 0 },
  counters: {
    LEC: {
      finalizacao: { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0 },
      entrada:      { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0 },
      acao:         {}
    },
    ADV: {
      finalizacao: { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0 },
      entrada:      { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0 },
      acao:         {}
    }
  },
  events: [] // {team, section, label, zone, timeSec, clipStart, clipEnd, ts}
};

// Inicializar contadores de ação conforme CONFIG
CONFIG.teams.forEach(team=>{
  state.counters[team].acao = {};
  CONFIG.quickActions[team].forEach(a => state.counters[team].acao[a] = 0);
});

// ===== HELPERS =====
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function pad(n){return String(n).padStart(2,'0')}
function formatMMSS(ms){
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  return `${pad(m)}:${pad(s%60)}`;
}
function nowSec(){ return Math.floor(elapsedMs/1000); }

function safeClipStart(sec){ return Math.max(0, sec - CONFIG.clip.pre); }
function clipEnd(sec){ return sec + CONFIG.clip.post; }

function updateTimerUI(){
  $('#timerDisplay').textContent = formatMMSS(elapsedMs);
}

function updateScoresUI(){
  $('#lecScore').textContent = state.score.LEC;
  $('#advScore').textContent = state.score.ADV;
}

function updateBadges(){
  // Zones
  CONFIG.teams.forEach(team=>{
    ['finalizacao','entrada'].forEach(section=>{
      ['Z1','Z2','Z3','Z4','Z5','Z6'].forEach(z=>{
        const key = `${team}-${section}-${z}`;
        const el = document.querySelector(`[data-counter="${key}"]`);
        if (el) el.textContent = state.counters[team][section][z];
      });
    });
    // Quick
    Object.entries(state.counters[team].acao).forEach(([act, val])=>{
      const key = `${team}-acao-${act}`;
      const el = document.querySelector(`[data-counter="${key}"]`);
      if (el) el.textContent = val;
    });
  });
}

function startTimer(){
  if (isRunning) return;
  isRunning = true;
  $('#startPauseBtn').textContent = 'Pausar';
  let last = performance.now();
  timerInterval = setInterval(()=>{
    const now = performance.now();
    elapsedMs += (now - last);
    last = now;
    updateTimerUI();
  }, 250);
}
function pauseTimer(){
  if (!isRunning) return;
  isRunning = false;
  $('#startPauseBtn').textContent = 'Iniciar';
  clearInterval(timerInterval);
  timerInterval = null;
}
function resetTimerOnly(){
  pauseTimer();
  elapsedMs = 0;
  updateTimerUI();
}

// Registro de evento (grid ou ação)
function recordEvent({team, section, label=null, zone=null}){
  const t = nowSec();
  const evt = {
    team, section, label, zone,
    timeSec: t,
    clipStart: safeClipStart(t),
    clipEnd: clipEnd(t),
    ts: new Date().toISOString()
  };
  state.events.push(evt);
}

// Incrementos
function incZone(team, section, zone){
  state.counters[team][section][zone]++;
  recordEvent({team, section, zone});
  updateBadges();
}

function incAction(team, action){
  state.counters[team].acao[action]++;
  recordEvent({team, section:'acao', label:action});

  // GOL atualiza placar
  if (action === 'GOL'){
    state.score[team]++;
    updateScoresUI();
  }
  updateBadges();
}

// ===== LISTENERS =====
window.addEventListener('DOMContentLoaded', ()=>{
  // Timer buttons
  $('#startPauseBtn').addEventListener('click', ()=>{
    isRunning ? pauseTimer() : startTimer();
  });
  $('#resetBtn').addEventListener('click', resetTimerOnly);

  // Zones (delegação)
  $$('.zones-grid').forEach(grid=>{
    grid.addEventListener('click', (e)=>{
      const btn = e.target.closest('.zone-btn');
      if (!btn) return;
      const team = btn.dataset.team;
      const section = btn.dataset.section; // finalizacao | entrada
      const zone = btn.dataset.zone;       // Z1..Z6
      incZone(team, section, zone);
    });
  });

  // Quick actions
  $$('.quick-grid').forEach(qg=>{
    qg.addEventListener('click', (e)=>{
      const btn = e.target.closest('.quick-btn');
      if (!btn) return;
      const team = btn.dataset.team;
      const action = btn.dataset.action;
      incAction(team, action);
    });
  });

  // Export buttons
  $('#exportCsvBtn').addEventListener('click', exportCSV);
  $('#exportXmlBtn').addEventListener('click', exportXML);

  // UI inicial
  updateTimerUI();
  updateScoresUI();
  updateBadges();
});

// ===== EXPORTAÇÃO =====
function exportCSV(){
  // Formato: team,section,label_or_zone,count
  // Agrupa contadores atuais
  const rows = [['team','section','key','count']];

  CONFIG.teams.forEach(team=>{
    // finalizacoes/entradas por zona
    ['finalizacao','entrada'].forEach(section=>{
      ['Z1','Z2','Z3','Z4','Z5','Z6'].forEach(z=>{
        rows.push([team, section, z, state.counters[team][section][z]]);
      });
    });
    // ações rápidas
    Object.entries(state.counters[team].acao).forEach(([act,val])=>{
      rows.push([team, 'acao', act, val]);
    });
  });

  const csv = rows.map(r => r.map(x=>{
    const s = String(x);
    return s.includes(',') ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\n');

  downloadText(csv, `contadores_${dateStamp()}.csv`, 'text/csv');
}

function exportXML(){
  // Eventos com janela [t-25, t+10]
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gameStats>');
  lines.push(`  <meta><exportedAt>${new Date().toISOString()}</exportedAt></meta>`);
  lines.push(`  <score><LEC>${state.score.LEC}</LEC><ADV>${state.score.ADV}</ADV></score>`);
  lines.push('  <events>');
  state.events.forEach(evt=>{
    const attrs = [
      `team="${evt.team}"`,
      `section="${evt.section}"`,
      evt.label ? `label="${escapeXml(evt.label)}"` : null,
      evt.zone ? `zone="${evt.zone}"` : null,
      `timeSec="${evt.timeSec}"`,
      `clipStart="${evt.clipStart}"`,
      `clipEnd="${evt.clipEnd}"`,
      `timestamp="${evt.ts}"`
    ].filter(Boolean).join(' ');
    lines.push(`    <event ${attrs} />`);
  });
  lines.push('  </events>');
  lines.push('</gameStats>');

  downloadText(lines.join('\n'), `eventos_${dateStamp()}.xml`, 'application/xml');
}

function escapeXml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function downloadText(text, filename, mime){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function dateStamp(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

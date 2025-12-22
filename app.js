// Cronômetro
let running = false;
let baseMs = 0;     // ms acumulados quando pausado
let startTs = 0;    // timestamp do início atual (ms)

const $timer = document.getElementById('timer');
const $btnStart = document.getElementById('btnStart');
const $btnReset = document.getElementById('btnReset');
const $btnXML = document.getElementById('btnXML');

function fmt(t){
  const m = Math.floor(t/60);
  const s = Math.floor(t%60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function nowSec(){
  const ms = running ? (baseMs + (performance.now() - startTs)) : baseMs;
  return ms/1000;
}
let rafId = null;
function tick(){
  $timer.textContent = fmt(nowSec());
  rafId = requestAnimationFrame(tick);
}

$btnStart.addEventListener('click', () => {
  if(!running){
    // iniciar/retomar
    running = true;
    startTs = performance.now();
    $btnStart.textContent = (baseMs === 0) ? 'Pausar' : 'Pausar';
    if(!rafId) tick();
  }else{
    // pausar
    running = false;
    baseMs = baseMs + (performance.now() - startTs);
    $btnStart.textContent = 'Retomar';
    if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
    $timer.textContent = fmt(nowSec());
  }
});

$btnReset.addEventListener('click', () => {
  running = false;
  baseMs = 0;
  $btnStart.textContent = 'Iniciar';
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  $timer.textContent = '00:00';
  // Não limpamos contadores/eventos automaticamente; se quiser, diga que eu ativo reset total.
});

// Registro de eventos e contadores
const counters = Object.create(null);
const events = []; // {team, code, t, clipStart, clipEnd}

function inc(code){
  counters[code] = (counters[code] || 0) + 1;
  const el = document.querySelector(`[data-count="${code}"]`);
  if(el) el.textContent = counters[code];
}

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function clickEvent(team, code){
  const t = nowSec();
  const clipStart = clamp(t - 25, 0, Number.MAX_SAFE_INTEGER);
  const clipEnd = t + 10;
  events.push({ team, code, t, clipStart, clipEnd });
  inc(code);
}

// Delegação de clique para todos os botões de evento
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn[data-event]');
  if(!btn) return;
  const code = btn.getAttribute('data-event');
  const team = btn.closest('.team')?.dataset.team || 'NA';
  clickEvent(team, code);
});

// Export XML (estrutura base; ajusto para seu padrão ao receber o XML completo)
$btnXML.addEventListener('click', () => {
  const xml = buildXML(events);
  const blob = new Blob([xml], {type: 'application/xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url;
  a.download = `juega10_${stamp}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Gerador XML genérico (vou alinhar ao seu “xml exemplo” exato assim que você enviar o arquivo completo)
function pad(n, w){ return String(n).padStart(w, '0'); }
function secToTC(s){
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const sc = Math.floor(s%60);
  return `${pad(h,2)}:${pad(m,2)}:${pad(sc,2)}`;
}

function buildXML(evts){
  // OBS: importadores variam. Aqui um esqueleto seguro com <file><EVENTS> e <ROWS>.
  // Ajusto tags/nó-raiz e metadados para seu software quando você me enviar o exemplo completo.
  const rows = [
    {code:'FIN_L', name:'Finalização LEC', R:255,G:255,B:255},
    {code:'FIN_A', name:'Finalização ADV', R:255,G:255,B:255},
    {code:'ESC_OF', name:'Escanteio Ofensivo', R:200,G:180,B:140},
    {code:'FALTA_OF', name:'Falta Ofensiva', R:240,G:210,B:80},
    {code:'ESC_DEF', name:'Escanteio Defensivo', R:200,G:180,B:140},
    {code:'FALTA_DEF', name:'Falta Defensiva', R:240,G:210,B:80},
    {code:'ENT_L_ESQ', name:'Entrada LEC Esquerda', R:180,G:80,B:220},
    {code:'ENT_L_CTR', name:'Entrada LEC Centro', R:60,G:80,B:200},
    {code:'ENT_L_DIR', name:'Entrada LEC Direita', R:0,G:140,B:120},
    {code:'ENT_A_ESQ', name:'Entrada ADV Esquerda', R:180,G:80,B:220},
    {code:'ENT_A_CTR', name:'Entrada ADV Centro', R:60,G:80,B:200},
    {code:'ENT_A_DIR', name:'Entrada ADV Direita', R:0,G:140,B:120},
  ];

  const rowMap = new Map(rows.map((r,i)=>[r.code, {...r, sort:i+1}]));

  const eventsXml = evts.map((e, idx) => {
    const tcStart = secToTC(e.clipStart);
    const tcEnd = secToTC(e.clipEnd);
    // Muitas suítes aceitam <code>, <start>, <end>, <team>, <index>. Ajusto nomes ao seu padrão depois.
    return `
    <event>
      <index>${idx+1}</index>
      <team>${e.team}</team>
      <code>${e.code}</code>
      <time>${secToTC(e.t)}</time>
      <clipStart>${tcStart}</clipStart>
      <clipEnd>${tcEnd}</clipEnd>
    </event>`;
  }).join('');

  const rowsXml = rows.map(r => `
    <row>
      <sort_order>${r.sort}</sort_order>
      <code>${r.code}</code>
      <R>${r.R}</R>
      <G>${r.G}</G>
      <B>${r.B}</B>
    </row>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<file>
  <EVENTS>
  ${eventsXml}
  </EVENTS>
  <ROWS>
  ${rowsXml}
  </ROWS>
</file>`;
}

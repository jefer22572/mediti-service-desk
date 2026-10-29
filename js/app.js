/* MediTI Service Desk – lógica de la aplicación, dashboard y autenticación */
// ===== Estado y almacenamiento =====
let TICKETS = [];
let READY = false;
let DB = null, COL = null, LOCAL = false;
const LS_KEY = 'mediti-tickets-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIN = 60000;
const fmtDT = ms => ms ? new Date(ms).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
const fmtDur = m => { if (m == null || isNaN(m)) return '—'; const neg = m < 0; m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), mm = m % 60; return (neg ? '-' : '') + (h ? h + ' h ' : '') + mm + ' min'; };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }

function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } }
function lsSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(TICKETS)); } catch (e) { } }

async function guardar(t) {
  const clean = JSON.parse(JSON.stringify(t));
  if (LOCAL || !COL) { const i = TICKETS.findIndex(x => x.id === t.id); if (i >= 0) TICKETS[i] = clean; else TICKETS.push(clean); lsSave(); render(); return true; }
  try { await COL.doc(t.id).set(clean); return true; }
  catch (e) {
    if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 600 + Math.random() * 600)); try { await COL.doc(t.id).set(clean); return true; } catch (e2) { } }
    toast(e && e.code === 'invalid_argument' ? 'No tiene permiso para modificar tickets en esta página.' : 'No se pudo guardar el ticket. Intente nuevamente.');
    return false;
  }
}

// ===== Cálculos =====
const ahora = () => Date.now();
function fueraDeHorario(d = new Date()) { const h = d.getHours(), w = d.getDay(); return w === 0 || w === 6 || h < 8 || h >= 18; }
const abierto = t => !['Resuelto', 'Cerrado'].includes(t.estado);
function slaRes(t) { const lim = PRIO[t.prioridad].res; const fin = t.resuelto || ahora(); const usado = (fin - t.creado) / MIN; return { lim, usado, pct: usado / lim * 100, rest: lim - usado }; }
function slaResp(t) { const lim = PRIO[t.prioridad].resp; const fin = t.asignado || ahora(); return { lim, usado: (fin - t.creado) / MIN }; }
function slaColor(p) { return p >= 100 ? 'var(--bad)' : p >= 75 ? 'var(--bad)' : p >= 50 ? 'var(--warn)' : 'var(--ok)'; }
function necesitaEscalar(t) { if (!abierto(t) || t.nivel !== 'N1') return false; const lim = { P1: 0, P2: 15, P3: 30, P4: 60 }[t.prioridad]; return (ahora() - (t.asignado || t.creado)) / MIN >= lim && !!t.asignado; }

function kpis(dias) {
  const desde = ahora() - dias * 24 * 60 * MIN;
  const P = TICKETS.filter(t => t.creado >= desde);
  const res = P.filter(t => t.resuelto);
  const conResp = P.filter(t => t.asignado);
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
  const slaR = pct(res.filter(t => (t.resuelto - t.creado) / MIN <= PRIO[t.prioridad].res).length, res.length);
  const slaA = pct(conResp.filter(t => (t.asignado - t.creado) / MIN <= PRIO[t.prioridad].resp).length, conResp.length);
  const mttr = p => { const x = res.filter(t => t.prioridad === p); return x.length ? x.reduce((s, t) => s + (t.resuelto - t.creado) / MIN, 0) / x.length : null; };
  const p1a = P.filter(t => t.prioridad === 'P1' && t.asignado);
  const mtta1 = p1a.length ? p1a.reduce((s, t) => s + (t.asignado - t.creado) / MIN, 0) / p1a.length : null;
  const fcr = pct(res.filter(t => t.fcr).length, res.length);
  const escal = pct(P.filter(t => t.nivel !== 'N1').length, P.length);
  const csatT = P.filter(t => t.csat); const csat = pct(csatT.filter(t => t.csat >= 4).length, csatT.length);
  const cerr = P.filter(t => t.estado === 'Cerrado'); const reab = pct(cerr.filter(t => t.reabierto > 0).length, cerr.length);
  return { P, res, slaR, slaA, mttr, mtta1, fcr, escal, csat, reab, abiertos: TICKETS.filter(abierto).length, p1: TICKETS.filter(t => abierto(t) && t.prioridad === 'P1').length };
}

// ===== Render: Dashboard =====
function kpiTile(lbl, val, meta, st) { return `<div class="kpi"><span class="st ${st}"></span><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="meta">${meta}</span></div>`; }
const stHi = (v, m, w) => v == null ? '' : v >= m ? 'ok' : v >= w ? 'warn' : 'bad';
const stLo = (v, m, w) => v == null ? '' : v <= m ? 'ok' : v <= w ? 'warn' : 'bad';
const fmtPct = v => v == null ? '—' : String(v).replace('.', ',') + ' %';

function renderDash() {
  const d = +$('#periodo').value; const k = kpis(d);
  const m1 = k.mttr('P1');
  $('#kpis').innerHTML = [
    kpiTile('Tickets abiertos', k.abiertos, `${k.P.length} registrados en el periodo`, k.abiertos > 12 ? 'warn' : 'ok'),
    kpiTile('P1 activos', k.p1, 'Incidentes críticos en curso', k.p1 ? 'bad' : 'ok'),
    kpiTile('Cumplimiento SLA resolución', fmtPct(k.slaR), 'Meta ≥ 90 %', stHi(k.slaR, 90, 80)),
    kpiTile('Cumplimiento SLA respuesta', fmtPct(k.slaA), 'Meta ≥ 95 %', stHi(k.slaA, 95, 85)),
    kpiTile('MTTA P1', k.mtta1 == null ? '—' : Math.round(k.mtta1) + ' min', 'Meta ≤ 15 min', stLo(k.mtta1, 15, 25)),
    kpiTile('MTTR P1', m1 == null ? '—' : (m1 / 60).toFixed(1).replace('.', ',') + ' h', 'Meta ≤ 4 h', stLo(m1, 240, 300)),
    kpiTile('Resolución 1er contacto', fmtPct(k.fcr), 'FCR · meta ≥ 70 %', stHi(k.fcr, 70, 55)),
    kpiTile('Satisfacción (CSAT)', fmtPct(k.csat), `Meta ≥ 90 % · escalamiento ${fmtPct(k.escal)} · reabiertos ${fmtPct(k.reab)}`, stHi(k.csat, 90, 80)),
  ].join('');
  // Gráfico por día
  const W = 640, H = 220, pl = 30, pb = 26, pt = 10;
  const days = []; const base = new Date(); base.setHours(0, 0, 0, 0);
  for (let i = d - 1; i >= 0; i--) days.push(base.getTime() - i * 864e5);
  const cnt = days.map(s => { const o = { P1: 0, P2: 0, P3: 0, P4: 0 }; TICKETS.forEach(t => { if (t.creado >= s && t.creado < s + 864e5) o[t.prioridad]++; }); return o; });
  const mx = Math.max(4, ...cnt.map(o => o.P1 + o.P2 + o.P3 + o.P4));
  const step = Math.ceil(mx / 4); const top = step * 4;
  const bw = (W - pl - 6) / days.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tickets por día">`;
  for (let g = 0; g <= 4; g++) { const y = pt + (H - pt - pb) * (1 - g / 4); s += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${g * step}</text>`; }
  cnt.forEach((o, i) => {
    let y = H - pb; const x = pl + i * bw + bw * 0.18, w = bw * 0.64;
    ['P4', 'P3', 'P2', 'P1'].forEach(p => { if (!o[p]) return; const h = o[p] / top * (H - pt - pb); y -= h; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--${p.toLowerCase()})"><title>${p}: ${o[p]}</title></rect>`; });
    if (d <= 14 || i % 3 === 0) { const dt = new Date(days[i]); s += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${dt.getDate()}/${dt.getMonth() + 1}</text>`; }
  });
  $('#chDia').innerHTML = s + '</svg>';
  // MTTR vs meta
  const W2 = 420, H2 = 200; const pr = ['P1', 'P2', 'P3', 'P4'];
  const vals = pr.map(p => (k.mttr(p) ?? 0) / 60), metas = pr.map(p => PRIO[p].res / 60);
  const mx2 = Math.max(...vals, ...metas) * 1.1; const sc = v => Math.log10(1 + v) / Math.log10(1 + mx2) * (H2 - 40);
  let s2 = `<svg viewBox="0 0 ${W2} ${H2}" role="img" aria-label="MTTR por prioridad">`; const cw = (W2 - 20) / 4;
  pr.forEach((p, i) => {
    const x = 10 + i * cw + cw * 0.25, w = cw * 0.5; const h = sc(vals[i]); const ym = H2 - 22 - sc(metas[i]);
    s2 += `<rect x="${x}" y="${H2 - 22 - h}" width="${w}" height="${h}" rx="2" fill="${vals[i] > metas[i] ? 'var(--bad)' : 'var(--accent)'}"/>`;
    s2 += `<line x1="${x - 8}" x2="${x + w + 8}" y1="${ym}" y2="${ym}" stroke="var(--fg)" stroke-width="2"/>`;
    s2 += `<text x="${x + w + 10}" y="${ym + 4}">${metas[i]} h</text>`;
    s2 += `<text x="${x + w / 2}" y="${H2 - 22 - h - 5}" text-anchor="middle" style="fill:var(--fg);font-weight:600">${vals[i] ? vals[i].toFixed(1).replace('.', ',') : '—'}</text>`;
    s2 += `<text x="${x + w / 2}" y="${H2 - 6}" text-anchor="middle">${p}</text>`;
  });
  $('#chMttr').innerHTML = s2 + '</svg><p class="note" style="margin:4px 0 0">Escala logarítmica para comparar P1 (4 h) con P4 (72 h).</p>';
  // Nivel de resolución
  const nv = { N1: 0, N2: 0, N3: 0 }; k.res.forEach(t => nv[t.nivel]++); const tot = k.res.length || 1;
  const cols = { N1: 'var(--accent)', N2: 'var(--p2)', N3: 'var(--p1)' };
  let s3 = `<svg viewBox="0 0 400 46" role="img" aria-label="Nivel de resolución">`; let x0 = 0;
  ['N1', 'N2', 'N3'].forEach(n => { const w = nv[n] / tot * 400; if (w > 0) { s3 += `<rect x="${x0}" y="0" width="${w}" height="22" fill="${cols[n]}"/>`; if (w > 40) s3 += `<text x="${x0 + w / 2}" y="40" text-anchor="middle">${n}: ${Math.round(nv[n] / tot * 100)} %</text>`; } x0 += w; });
  $('#chNivel').innerHTML = s3 + '</svg>';
  // Categoría
  const cc = {}; k.P.forEach(t => cc[t.categoria] = (cc[t.categoria] || 0) + 1);
  const arr = Object.entries(cc).sort((a, b) => b[1] - a[1]); const mxc = Math.max(1, ...arr.map(a => a[1]));
  const rowH = 24; let s4 = `<svg viewBox="0 0 400 ${arr.length * rowH + 4}" role="img" aria-label="Tickets por categoría">`;
  arr.forEach(([c, v], i) => { const w = v / mxc * 190; s4 += `<text x="0" y="${i * rowH + 15}">${esc(c)}</text><rect x="160" y="${i * rowH + 4}" width="${w}" height="14" rx="2" fill="var(--accent)" opacity=".85"/><text x="${166 + w}" y="${i * rowH + 15}" style="fill:var(--fg)">${v}</text>`; });
  $('#chCat').innerHTML = arr.length ? s4 + '</svg>' : '<p class="note">Sin tickets en el periodo.</p>';
  // Riesgo
  const op = TICKETS.filter(abierto).map(t => ({ t, s: slaRes(t) })).sort((a, b) => b.s.pct - a.s.pct).slice(0, 7);
  $('#riesgo').innerHTML = op.length ? op.map(({ t, s }) => `<li data-id="${t.id}"><span class="pill ${t.prioridad}">${t.prioridad}</span><span class="t">${esc(t.titulo)}<br><span class="note">${esc(t.sede)} · ${t.nivel}${necesitaEscalar(t) ? ' · <b style="color:var(--bad)">escalar ahora</b>' : ''}</span></span><span class="slatxt" style="color:${slaColor(s.pct)}">${s.rest < 0 ? 'Vencido ' + fmtDur(-s.rest) : fmtDur(s.rest)}</span></li>`).join('') : '<li class="empty" style="cursor:default">No hay tickets abiertos.</li>';
}

// ===== Render: Tabla =====
function renderTabla() {
  const q = $('#fq').value.trim().toLowerCase(), fe = $('#fe').value, fp = $('#fp').value, fn = $('#fn').value, fs = $('#fs').value;
  const L = TICKETS.filter(t => (fe === 'abiertos' ? abierto(t) : !fe || t.estado === fe) && (!fp || t.prioridad === fp) && (!fn || t.nivel === fn) && (!fs || t.sede === fs)
    && (!q || [t.id, t.titulo, t.sede, t.ci, t.categoria].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (abierto(b) - abierto(a)) || a.prioridad.localeCompare(b.prioridad) || b.creado - a.creado);
  $('#tbody').innerHTML = L.length ? L.map(t => { const s = slaRes(t); const p = Math.min(100, s.pct);
    const sla = abierto(t) ? `<span class="slabar"><span style="width:${p}%;background:${slaColor(s.pct)}"></span></span><span class="slatxt" style="color:${slaColor(s.pct)}">${s.rest < 0 ? 'vencido' : fmtDur(s.rest)}</span>`
      : `<span class="slatxt" style="color:${s.usado <= s.lim ? 'var(--ok)' : 'var(--bad)'}">${s.usado <= s.lim ? 'Cumplido' : 'Incumplido'} · ${fmtDur(s.usado)}</span>`;
    return `<tr data-id="${t.id}"><td class="mono">${t.id}</td><td><span class="pill ${t.prioridad}">${t.prioridad}</span> ${t.mayor && abierto(t) ? '<span class="mi">IM</span>' : ''}</td><td>${esc(t.titulo)}${necesitaEscalar(t) ? ' <b style="color:var(--bad);font-size:12px">· escalar</b>' : ''}</td><td>${esc(t.sede)}</td><td class="mono">${t.nivel}</td><td><span class="est ${t.estado.replace(' ', '')}">${t.estado}</span></td><td>${sla}</td><td class="mono">${fmtDT(t.creado)}</td></tr>`; }).join('')
    : `<tr><td colspan="8" class="empty">No hay tickets con estos filtros.</td></tr>`;
}

function renderEmpty() {
  const b = $('#banner');
  let h = '';
  if (LOCAL) h += `<div class="banner">Modo local: los tickets se guardan solo en este navegador.</div>`;
  if (!READY) h += `<div class="card empty" style="margin-bottom:16px">Conectando con los datos…</div>`;
  else if (!TICKETS.length) h += `<div class="card empty" style="margin-bottom:16px"><h3>Aún no hay tickets</h3><p>Registre el primer incidente en la pestaña «Registrar incidente» o cargue un conjunto de tickets de demostración para ver el dashboard funcionando.</p><button class="btn pri" id="btnDemo">Cargar datos de demostración</button></div>`;
  b.innerHTML = h;
  const bd = $('#btnDemo'); if (bd) bd.onclick = cargarDemo;
}

function render() { renderEmpty(); renderDash(); renderTabla(); if (OPEN) renderDetalle(OPEN); }

// ===== Detalle y acciones =====
let OPEN = null;
function abrir(id) { OPEN = id; $('#drawer').hidden = false; renderDetalle(id); }
function cerrarPanel() { OPEN = null; $('#drawer').hidden = true; }
function renderDetalle(id) {
  const t = TICKETS.find(x => x.id === id); if (!t) return cerrarPanel();
  const s = slaRes(t), r = slaResp(t);
  const ab = abierto(t);
  const n2 = fueraDeHorario() ? 'Guardia on-call ' : '';
  let act = '';
  if (t.estado === 'Nuevo') act += `<button class="btn pri" data-a="tomar">Asignarme el ticket</button>`;
  if (['Asignado', 'En espera', 'Escalado'].includes(t.estado)) act += `<button class="btn" data-a="curso">Marcar en curso</button>`;
  if (['Asignado', 'En curso', 'Escalado'].includes(t.estado)) act += `<button class="btn" data-a="espera">Poner en espera</button>`;
  if (ab && t.prioridad === 'P1' && !t.mayor) act += `<button class="btn dng" data-a="mayor">Declarar incidente mayor</button>`;
  if (ab && t.estado !== 'Nuevo' && t.nivel === 'N1') act += `<span class="row" style="gap:6px"><select id="selN2" style="width:auto">${GRUPOS_N2.map(g => `<option ${g === GRUPO_POR_CAT[t.categoria] ? 'selected' : ''}>${g}</option>`).join('')}</select><button class="btn" data-a="n2">Escalar a N2</button></span>`;
  if (ab && t.nivel === 'N2') act += `<span class="row" style="gap:6px"><select id="selN3" style="width:auto">${PROVEEDORES.map(g => `<option>${g}</option>`).join('')}</select><button class="btn" data-a="n3">Escalar a N3</button></span>`;
  if (ab && t.estado !== 'Nuevo') act += `<div style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap"><select id="txtSol" style="flex:1;min-width:200px">${solOpts(t)}</select><button class="btn pri" data-a="resolver">Resolver</button></div>`;
  if (t.estado === 'Resuelto') act += `<span class="row" style="gap:6px">Encuesta del usuario <select id="selCsat" style="width:auto"><option value="5">5 – Muy satisfecho</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1 – Insatisfecho</option></select><button class="btn pri" data-a="cerrar">Confirmar y cerrar</button></span><button class="btn" data-a="reabrir">Reabrir</button>`;
  if (ab) act += `<div style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap"><select id="txtNota" style="flex:1;min-width:200px">${NOTAS.map(n => `<option>${esc(n)}</option>`).join('')}</select><button class="btn" data-a="nota">Agregar nota</button></div>`;
  $('#pane').innerHTML = `
    <div class="row" style="justify-content:space-between"><span class="mono">${t.id}${t.demo ? ' · ejemplo' : ''}</span><button class="btn" id="btnX">Cerrar panel</button></div>
    <h2 style="margin-top:8px">${esc(t.titulo)}</h2>
    <div class="row"><span class="pill ${t.prioridad}">${t.prioridad} · ${PRIO[t.prioridad].label}</span><span class="est ${t.estado.replace(' ', '')}">${t.estado}</span><span class="lvl" style="font-size:12px">${t.nivel}${t.nivel === 'N2' ? ' · ' + n2 + esc(t.grupo) : t.nivel === 'N3' ? ' · ' + esc(t.proveedor) : ''}</span>${t.mayor ? '<span class="mi">INCIDENTE MAYOR</span>' : ''}</div>
    <dl class="dl">
      <dt>Solicitante</dt><dd>${esc(t.solicitante)}</dd><dt>Sede / área</dt><dd>${esc(t.sede)} · ${esc(t.area)}</dd>
      <dt>Canal</dt><dd>${esc(t.canal)}</dd><dt>Categoría</dt><dd>${esc(t.categoria)}</dd><dt>CI afectado</dt><dd class="mono">${esc(t.ci || '—')}</dd>
      <dt>Impacto / urgencia</dt><dd>${t.impacto} / ${t.urgencia}${t.clinico ? ' · regla clínica' : ''}</dd>
      <dt>Descripción</dt><dd>${esc(t.descripcion || '—')}</dd>
      <dt>SLA respuesta</dt><dd><span style="color:${r.usado <= r.lim ? 'var(--ok)' : 'var(--bad)'}">${t.asignado ? fmtDur(r.usado) + ' de ' + fmtDur(r.lim) : 'Pendiente · ' + fmtDur(r.lim - r.usado) + ' restantes'}</span></dd>
      <dt>SLA resolución</dt><dd><span class="slabar"><span style="width:${Math.min(100, s.pct)}%;background:${slaColor(s.pct)}"></span></span><span class="slatxt" style="color:${slaColor(s.pct)}">${fmtDur(s.usado)} de ${fmtDur(s.lim)} (${Math.round(s.pct)} %)</span></dd>
      ${t.solucion ? `<dt>Solución</dt><dd>${esc(t.solucion)}</dd>` : ''}${t.csat ? `<dt>Satisfacción</dt><dd>${t.csat}/5</dd>` : ''}
    </dl>
    ${necesitaEscalar(t) ? `<div class="banner">Este ${t.prioridad} supera el tiempo máximo en Nivel 1. Escálelo a Nivel 2${fueraDeHorario() ? ' (guardia on-call)' : ''}.</div>` : ''}
    ${act ? `<div class="actions">${act}</div>` : ''}
    <h3>Historial del ticket</h3>
    <ul class="timeline">${t.log.slice().sort((a, b) => b.t - a.t).map(l => `<li><div class="when">${fmtDT(l.t)}</div><span class="lvl">${l.nivel}</span><span class="who">${esc(l.autor)}</span><div>${esc(l.texto)}</div></li>`).join('')}</ul>`;
  $('#btnX').onclick = cerrarPanel;
  $('#pane').querySelectorAll('[data-a]').forEach(b => b.onclick = () => accion(t.id, b.dataset.a));
}

function solOpts(t) {
  const pl = PLANTILLAS.find(p => p.t === t.titulo || t.titulo.startsWith(p.t));
  const L = (pl ? [pl.sol] : []).concat(SOLUCIONES);
  return L.map(s => `<option>${esc(s)}</option>`).join('');
}
async function accion(id, a) {
  const t0 = TICKETS.find(x => x.id === id); if (!t0) return;
  const t = JSON.parse(JSON.stringify(t0)); const now = ahora();
  const log = (nivel, autor, texto) => t.log.push({ t: now, nivel, autor: autor + (SESSION ? ' · ' + SESSION.user : ''), texto });
  if (a === 'tomar') { t.estado = 'En curso'; t.asignado = now; log('N1', 'Analista N1', 'Ticket asignado y en diagnóstico.'); }
  if (a === 'curso') { t.estado = 'En curso'; log(t.nivel, 'Analista', 'Ticket en curso.'); }
  if (a === 'espera') { t.estado = 'En espera'; log(t.nivel, 'Analista', 'En espera de información del usuario o del proveedor.'); }
  if (a === 'mayor') { t.mayor = true; log('N1', 'Gestor de Incidentes Mayores', 'Incidente Mayor declarado. Notificación a N2 ' + (fueraDeHorario() ? 'on-call' : '') + ', Jefe TI VidaSalud y dirección médica. Puente de crisis abierto.'); }
  if (a === 'n2') { const g = $('#selN2').value; t.nivel = 'N2'; t.grupo = g; t.estado = 'Escalado'; t.fcr = false; log('N2', 'Analista N1', 'Escalado a ' + (fueraDeHorario() ? 'guardia on-call de ' : '') + g + '.'); }
  if (a === 'n3') { const p = $('#selN3').value; t.nivel = 'N3'; t.proveedor = p; t.estado = 'Escalado'; log('N3', t.grupo || 'TI VidaSalud', 'Escalado al proveedor ' + p + ' según contrato de soporte.'); }
  if (a === 'resolver') { const s = $('#txtSol').value.trim(); if (!s) { toast('Elija la solución aplicada.'); return; } t.solucion = s; t.estado = 'Resuelto'; t.resuelto = now; if (t.nivel === 'N1' && t.reabierto === 0) t.fcr = !t.log.some(l => l.nivel !== 'N1'); log(t.nivel, t.nivel === 'N3' ? t.proveedor : t.nivel === 'N2' ? t.grupo : 'Analista N1', 'Resuelto: ' + s); }
  if (a === 'cerrar') { t.csat = +$('#selCsat').value; t.estado = 'Cerrado'; t.cerrado = now; log('N1', 'Service Desk MediTI', 'Usuario confirmó la solución. Encuesta: ' + t.csat + '/5. Ticket cerrado.'); }
  if (a === 'reabrir') { t.estado = 'En curso'; t.resuelto = null; t.reabierto = (t.reabierto || 0) + 1; t.fcr = false; log(t.nivel, 'Service Desk MediTI', 'El usuario indica que la falla persiste. Ticket reabierto.'); }
  if (a === 'nota') { const s = $('#txtNota').value.trim(); if (!s) return; log(t.nivel, 'Analista', s); }
  if (await guardar(t)) toast({ tomar: 'Ticket asignado', curso: 'Ticket en curso', espera: 'Ticket en espera', mayor: 'Incidente mayor declarado', n2: 'Escalado a Nivel 2', n3: 'Escalado a Nivel 3', resolver: 'Ticket resuelto', cerrar: 'Ticket cerrado', reabrir: 'Ticket reabierto', nota: 'Nota agregada' }[a]);
}

function siguienteId() { const n = Math.max(4800, ...TICKETS.map(t => t.n || 0)) + 1; return { n, id: 'INC-2026-' + String(n).padStart(6, '0') }; }

async function crear(d) {
  const { n, id } = siguienteId(); const now = ahora();
  const prio = prioridadDe(d.impacto, d.urgencia, d.clinico);
  const t = { id, n, titulo: d.titulo, descripcion: d.descripcion, solicitante: d.solicitante, sede: d.sede, area: d.area, canal: d.canal, categoria: d.categoria, ci: d.ci, impacto: d.impacto, urgencia: d.urgencia, clinico: d.clinico, prioridad: prio, nivel: 'N1', grupo: '', proveedor: '', estado: 'Nuevo', creado: now, asignado: null, resuelto: null, cerrado: null, csat: null, reabierto: 0, fcr: false, mayor: false, solucion: '', log: [{ t: now, nivel: 'N1', autor: d.canal === 'Monitoreo (Zabbix)' ? 'Zabbix' : 'Service Desk MediTI' + (SESSION ? ' · ' + SESSION.user : ''), texto: 'Ticket registrado vía ' + d.canal + '. Prioridad ' + prio + ' (impacto ' + d.impacto + ', urgencia ' + d.urgencia + (d.clinico ? ', regla clínica' : '') + ').' }] };
  if (await guardar(t)) return t; return null;
}

async function cargarDemo() {
  const demo = genDemo(ahora()); const b = $('#btnDemo'); if (b) { b.disabled = true; b.textContent = 'Cargando…'; }
  if (LOCAL || !COL) { TICKETS = demo; lsSave(); render(); toast('Datos de demostración cargados'); return; }
  for (const t of demo) { try { await COL.doc(t.id).set(t); } catch (e) { toast('No se pudieron cargar los datos de demostración.'); break; } }
  toast('Datos de demostración cargados');
}

// ===== Formulario por clics =====
function llenarIncidentes() { const c = CATALOGO[$('#nCat').value]; $('#nTit').innerHTML = c.inc.map((x, i) => `<option value="${i}">${esc(x.t)}</option>`).join(''); opts('#nCi', c.ci); }
function incSel() { return CATALOGO[$('#nCat').value].inc[+$('#nTit').value]; }
function aplicarIncidente() { const x = incSel(); $('#nImp').value = x.i; $('#nUrg').value = x.u; $('#nCli').checked = !!x.cl; prioPreview(); descGen(); }
function descGen() { const x = incSel(); $('#nDesc').textContent = x.d + ' ' + $('#nSin').value + '. Ocurre: ' + $('#nDes').value.toLowerCase() + '. Área: ' + $('#nArea').value + '.'; }
function opts(sel, arr) { $(sel).innerHTML = arr.map(x => `<option>${esc(x)}</option>`).join(''); }
function prioPreview() {
  const p = prioridadDe(+$('#nImp').value, +$('#nUrg').value, $('#nCli').checked); const S = PRIO[p];
  $('#prioBox').innerHTML = `<span class="big pill ${p}" style="font-size:22px;padding:4px 12px">${p}</span><div><b>${S.label}</b><br><span class="note">Respuesta ≤ ${fmtDur(S.resp)} · Resolución ≤ ${fmtDur(S.res)}${p === 'P1' ? ' · activa protocolo de incidente mayor' : ''}${fueraDeHorario() && (p === 'P1' || p === 'P2') ? ' · N2 por guardia on-call' : ''}</span></div>`;
}

// ===== Inicio =====
function initUI() {
  opts('#nSede', SEDES); opts('#nArea', AREAS); opts('#nCanal', CANALES.filter(c => !c.startsWith('Monitoreo'))); opts('#nCat', CATEGORIAS); opts('#nSol', ROLES); opts('#nSin', SINTOMAS); opts('#nDes', DESDE);
  $('#nCat').addEventListener('change', () => { llenarIncidentes(); aplicarIncidente(); }); $('#nTit').addEventListener('change', aplicarIncidente);
  ['#nSin', '#nDes', '#nArea'].forEach(s => $(s).addEventListener('change', descGen)); llenarIncidentes(); aplicarIncidente();
  $('#fs').innerHTML = '<option value="">Todas las sedes</option>' + SEDES.map(s => `<option>${esc(s)}</option>`).join('');
  $('#lstN2').innerHTML = GRUPOS_N2.map(g => `<li>${g}</li>`).join(''); $('#lstN3').innerHTML = PROVEEDORES.map(g => `<li>${g}</li>`).join('');
  document.querySelectorAll('nav.tabs button').forEach(b => b.onclick = () => ver(b.dataset.v));
  ['#fq', '#fe', '#fp', '#fn', '#fs'].forEach(s => $(s).addEventListener('input', renderTabla));
  $('#periodo').onchange = renderDash;
  ['#nImp', '#nUrg', '#nCli'].forEach(s => $(s).addEventListener('change', prioPreview)); prioPreview();
  $('#tbody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if (tr) abrir(tr.dataset.id); };
  $('#riesgo').onclick = e => { const li = e.target.closest('li[data-id]'); if (li) abrir(li.dataset.id); };
  $('#drawer').onclick = e => { if (e.target.id === 'drawer') cerrarPanel(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && OPEN) cerrarPanel(); });
  $('#fNuevo').onsubmit = async e => {
    e.preventDefault();
    const d = { solicitante: $('#nSol').value, sede: $('#nSede').value, area: $('#nArea').value, canal: $('#nCanal').value, categoria: $('#nCat').value, ci: $('#nCi').value, titulo: incSel().t, descripcion: $('#nDesc').textContent, impacto: +$('#nImp').value, urgencia: +$('#nUrg').value, clinico: $('#nCli').checked };
    
    const t = await crear(d); if (t) { $('#nMsg').textContent = ''; e.target.reset(); llenarIncidentes(); aplicarIncidente(); toast('Ticket ' + t.id + ' registrado con prioridad ' + t.prioridad); ver('tickets'); abrir(t.id); }
  };
  $('#btnZabbix').onclick = async () => {
    const alertas = [
      { titulo: 'Alerta Zabbix: enlace WAN caído', categoria: 'Red y comunicaciones', ci: 'ENL-WAN-SEDE', impacto: 1, urgencia: 1, clinico: true },
      { titulo: 'Alerta Zabbix: tablespace USERS al 92 % en HISPRD', categoria: 'Base de datos', ci: 'SRV-ORA-PRD01 / HISPRD', impacto: 1, urgencia: 2, clinico: false },
      { titulo: 'Alerta Zabbix: fuente de poder redundante con falla', categoria: 'Infraestructura', ci: 'SRV-APP-01 (Dell R750)', impacto: 2, urgencia: 2, clinico: false },
    ];
    const a = alertas[Math.floor(Math.random() * alertas.length)];
    const t = await crear({ ...a, solicitante: 'Monitoreo automático', sede: SEDES[Math.floor(Math.random() * SEDES.length)], area: 'Centro de datos', canal: 'Monitoreo (Zabbix)', descripcion: 'Ticket creado automáticamente por un disparador de Zabbix.' });
    if (t) toast('Zabbix creó ' + t.id + ' (' + t.prioridad + ')');
  };
  const tick = () => { const d = new Date(); $('#clock').textContent = d.toLocaleString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const off = fueraDeHorario(d); const s = $('#shift'); s.className = 'shift ' + (off ? 'off' : 'on'); s.textContent = off ? 'Fuera de horario · N2 en guardia on-call' : 'Horario de oficina · N2 presencial'; };
  tick(); setInterval(() => { tick(); render(); }, 30000);
}
function ver(v) { document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v)); ['dashboard', 'tickets', 'nuevo', 'matriz'].forEach(x => $('#v-' + x).hidden = x !== v); }

// ===== Inicio de la aplicación (solo después del login) =====
let STARTED = false;
function start() {
  if (STARTED) { render(); return; }
  STARTED = true;
  initUI(); render();
  (async () => {
    try { DB = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { DB = null; }
    READY = true;
    if (!DB) { LOCAL = true; TICKETS = lsLoad(); $('#mode').textContent = 'Guardado local'; render(); return; }
    COL = DB.collection('tickets'); $('#mode').textContent = 'Datos compartidos en vivo';
    COL.onSnapshot(snap => { TICKETS = snap.docs.map(d => d.data()); render(); }, () => { toast('Se perdió la conexión con los datos.'); });
  })();
}

// ===== Autenticación =====
// Las credenciales no se guardan en texto plano: se compara el hash SHA-256 de "MediTI-SD|usuario|contraseña".
const USUARIOS = [{ user: 'admin', rol: 'Administrador del Service Desk', hash: '8cae2aa505b222e8ee85e52571bd8d477a64933a4e329cd2193d6833405d93a6' }];
const SESSION_KEY = 'mediti-session', LOCK_KEY = 'mediti-lock';
const INACTIVIDAD_MS = 30 * MIN, MAX_INTENTOS = 5, BLOQUEO_MS = 60000;
let SESSION = null;

function sha256Fallback(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a)); const K = []; const H = []; let pc = 0;
  const isP = {}; for (let c = 2; pc < 64; c++) { if (!isP[c]) { for (let i = 0; i < 313; i += c) isP[i] = c; H[pc] = (Math.pow(c, .5) * 4294967296) | 0; K[pc++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; } }
  const bytes = Array.from(new TextEncoder().encode(ascii)); const bl = bytes.length * 8; bytes.push(0x80);
  while (bytes.length % 64 - 56) bytes.push(0);
  const words = []; for (let i = 0; i < bytes.length; i += 4) words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
  words.push(Math.floor(bl / 4294967296)); words.push(bl | 0);
  let h = H.slice(0, 8);
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16); const old = h.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]; const a = h[0], e = h[4];
      const t1 = h[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + K[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
      h = [(t1 + t2) | 0].concat(h); h[4] = (h[4] + t1) | 0; h.length = 8;
    }
    for (let i = 0; i < 8; i++) h[i] = (h[i] + old[i]) | 0;
  }
  return h.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
async function sha256(txt) {
  try { if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
  return sha256Fallback(txt);
}
const ssGet = k => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const ssSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
let LOCK_MEM = { intentos: 0, hasta: 0 };
const getLock = () => lsGet(LOCK_KEY) || LOCK_MEM;
const setLock = v => { LOCK_MEM = v; lsSet(LOCK_KEY, v); };

function mostrarApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  $('#uName').textContent = SESSION.user; $('#uAv').textContent = SESSION.user.slice(0, 1).toUpperCase();
  start();
}
function cerrarSesion(motivo) {
  SESSION = null; ssSet(SESSION_KEY, null); cerrarPanel();
  $('#app').hidden = true; $('#login').hidden = false;
  $('#lPass').value = ''; $('#lErr').textContent = motivo || ''; $('#lUser').focus();
}
function actividad() { if (SESSION) { SESSION.exp = Date.now() + INACTIVIDAD_MS; ssSet(SESSION_KEY, SESSION); } }
let _act = 0;
['click', 'keydown', 'pointermove', 'scroll'].forEach(ev => document.addEventListener(ev, () => { const n = Date.now(); if (n - _act > 15000) { _act = n; actividad(); } }, { passive: true }));
setInterval(() => { if (SESSION && Date.now() > SESSION.exp) cerrarSesion('Su sesión se cerró por inactividad. Ingrese nuevamente.'); }, 15000);

let lockTimer = null;
function pintarBloqueo() {
  const L = getLock(); const rest = Math.ceil((L.hasta - Date.now()) / 1000);
  if (rest > 0) { $('#lBtn').disabled = true; $('#lErr').textContent = 'Demasiados intentos fallidos. Intente de nuevo en ' + rest + ' s.'; clearTimeout(lockTimer); lockTimer = setTimeout(pintarBloqueo, 1000); return true; }
  $('#lBtn').disabled = false; if (L.hasta) { setLock({ intentos: 0, hasta: 0 }); $('#lErr').textContent = ''; }
  return false;
}

$('#lShow').onclick = () => { const i = $('#lPass'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#lShow').textContent = show ? 'Ocultar' : 'Mostrar'; };
$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  if (pintarBloqueo()) return;
  const u = $('#lUser').value.trim().toLowerCase(), pw = $('#lPass').value;
  if (!u || !pw) { $('#lErr').textContent = 'Ingrese su usuario y contraseña.'; return; }
  const h = await sha256('MediTI-SD|' + u + '|' + pw);
  const ok = USUARIOS.find(x => x.user === u && x.hash === h);
  if (!ok) {
    const L = getLock(); const n = (L.intentos || 0) + 1;
    if (n >= MAX_INTENTOS) { setLock({ intentos: n, hasta: Date.now() + BLOQUEO_MS }); pintarBloqueo(); }
    else { setLock({ intentos: n, hasta: 0 }); $('#lErr').textContent = 'Usuario o contraseña incorrectos. Intentos restantes: ' + (MAX_INTENTOS - n) + '.'; }
    $('#lPass').value = ''; $('#lPass').focus(); return;
  }
  setLock({ intentos: 0, hasta: 0 });
  SESSION = { user: ok.user, rol: ok.rol, inicio: Date.now(), exp: Date.now() + INACTIVIDAD_MS };
  ssSet(SESSION_KEY, SESSION); $('#lErr').textContent = ''; $('#lPass').value = '';
  mostrarApp(); toast('Bienvenido, ' + ok.user);
};
$('#btnLogout').onclick = () => cerrarSesion('Sesión cerrada correctamente.');

(() => {
  const s = ssGet(SESSION_KEY);
  if (s && s.exp > Date.now() && USUARIOS.some(x => x.user === s.user)) { SESSION = s; mostrarApp(); }
  else { ssSet(SESSION_KEY, null); pintarBloqueo(); }
})();

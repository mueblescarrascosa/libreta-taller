// «Diseñar la cocina»: con las paredes (y el tramo de cada una) donde va la cocina y los electrodomésticos que hacen
// falta, propone cocinas enteras (lineal, en L o en U según las paredes, con rinconero en las esquinas), las puntúa con
// la nota de siempre y devuelve las mejores distintas. Respetando lo medido (fregadero sobre el desagüe, placa bajo la
// salida de humos) y, aparte, una «de reforma» que coloca libre (luego «Colocar lo que falta» pone las instalaciones).
// No cambia la ficha: cada propuesta trae sus paredes (bajos y altos) para aplicarlas si se elige.
import { situarMuebles, moduloNuevo, esColumna, nombreModulo, medidasRemates } from './modulos.js';
import { geometriaAlzado, ALTURAS } from './alzado.js';
import { puntuarCocina, nuevosSimetricos, filaCon, altosEsquina } from './puntuacion.js';
import { avisosObra } from './avisos-obra.js';

const hay = v => v !== null && v !== undefined && v !== '';
const copiar = o => JSON.parse(JSON.stringify(o));
export const ELECTRO_DISENO = [['frigo', 'Frigorífico'], ['horno', 'Horno'], ['microondas', 'Microondas'], ['placa', 'Placa'], ['campana', 'Campana'],
  ['lavavajillas', 'Lavavajillas'], ['lavadora', 'Lavadora'], ['termo', 'Termo']];
// Los de la ficha; sin ninguno, lo normal: frigorífico, horno, placa, campana y lavavajillas.
export function electroDeFicha(d) {
  const l = [...new Set((d.electro || []).map(e => e.clave).filter(k => ELECTRO_DISENO.some(x => x[0] === k)))];
  return l.length ? l : ['frigo', 'horno', 'placa', 'campana', 'lavavajillas'];
}
const REGLETA = 40, RINCON = 1000, FONDO = 600, LIBRE_PLACA = 600, PASO = 50;
const CHOQUE = /tapa la ventana|choca con la puerta|por debajo de la encimera/;

// Tramos libres de suelo de una pared entre a y b (mm): sin puertas, pilares ni ventanas que bajen de la encimera.
function tramosLibres(d, p, a, b) {
  const g = geometriaAlzado(d, p), est = g ? g.piezas.filter(q => q.clase === 'puerta' || q.clase === 'pilar' || (q.clase === 'ventana' && q.y < ALTURAS.encimera)).map(q => [q.x, q.x + q.w]).sort((x, y) => x[0] - y[0]) : [];
  const r = []; let x = a;
  est.forEach(([u, v]) => { if (v <= x || u >= b) return; if (u > x) r.push([x, u]); x = Math.max(x, v); });
  if (b > x) r.push([x, b]);
  return r.filter(([u, v]) => v - u >= 300);
}
// Punto de una instalación a lo largo de su pared (mm desde la izquierda)
const puntoDe = (p, e) => (hay(e.distancia) && hay(p.largo) ? (e.ref === 'der' ? p.largo - e.distancia : e.distancia) : null);

// Los tramos de la cocina (en el orden de las paredes), donde van las piezas y el relleno: [{ ip, x, y, u0 }] con u0 la
// posición seguida a lo largo de la encimera (la del rincón cuenta: 1 m + 60 de fondo); y los rinconeros de las esquinas.
// esquinas: por cada esquina entre dos paredes marcadas, el rinconero al final de la primera ('fin') o al principio de la
// segunda ('ini').
function esquinasDe(d, sel) {
  const ps = d.paredes, orden = sel.map(s => Object.assign({}, s, { ip: ps.findIndex(p => p.id === s.pared) })).filter(s => s.ip >= 0 && hay(ps[s.ip].largo)).sort((a, b) => a.ip - b.ip);
  const r = [];
  orden.forEach((s, k) => { const sig = orden[k + 1], p = ps[s.ip];
    if (sig && sig.ip === s.ip + 1 && (hay(s.hasta) ? s.hasta : p.largo) >= p.largo - 50 && (hay(sig.desde) ? sig.desde : 0) <= 50) r.push(s.ip); });
  return { orden, esquinas: r };
}
function tramosCocina(d, sel, lados) {
  const ps = d.paredes, { orden, esquinas } = esquinasDe(d, sel), tramos = [], rincones = [], inicio = {};
  let u = 0, ultimo = null;
  orden.forEach(s => {
    const p = ps[s.ip], a = Math.max(0, hay(s.desde) ? s.desde : 0), b = Math.min(p.largo, hay(s.hasta) ? s.hasta : p.largo);
    const kFin = esquinas.indexOf(s.ip), kIni = esquinas.indexOf(s.ip - 1);
    let x0 = a > 0 ? a : medidasRemates(d).regleta, x1 = b;
    // Dónde empieza la fila de bajos de la pared: tras la regleta, o tras lo que entra el rinconero de la pared de antes
    inicio[s.ip] = medidasRemates(d).regleta;
    if (kIni >= 0) { if (lados[kIni] === 'ini') { rincones.push({ ip: s.ip, x: 0, gira: 'izq' }); x0 = RINCON; inicio[s.ip] = 0; } else { x0 = FONDO; inicio[s.ip] = FONDO; } }
    if (kFin >= 0) { if (lados[kFin] === 'fin') { rincones.push({ ip: s.ip, x: p.largo - RINCON, gira: 'der' }); x1 = p.largo - RINCON; } else x1 = p.largo - FONDO; }
    const libres = tramosLibres(d, p, x0, x1).map(([v, w]) => ({ ip: s.ip, x: Math.ceil(v / PASO) * PASO, y: Math.floor(w / PASO) * PASO })).filter(t => t.y - t.x >= 300);
    libres.forEach(t => {
      if (ultimo) u += ultimo.ip === t.ip ? t.x - ultimo.y : kIni >= 0 ? RINCON + FONDO : 0;
      t.u0 = u; u += t.y - t.x; tramos.push(t); ultimo = t;
    });
  });
  return { tramos, rincones, inicio, paredes: [...new Set(orden.map(s => s.ip))], fin: u };
}

// Piezas de la cocina según los electrodomésticos: columnas, grupo de agua (fregadero, lavavajillas, lavadora) y placa.
function piezas(d, electro, largoTotal, { compacta = 0 } = {}) {
  const e = k => (d.electro || []).find(x => x.clave === k) || {}, quiere = k => electro.includes(k);
  const cols = [];
  if (quiere('frigo')) cols.push({ tipo: 'columna_frigo', ancho: e('frigo').ancho >= 600 ? e('frigo').ancho : e('frigo').tipo === 'americano' ? 920 : 600 });
  // Horno: el de la ficha; sin decir, en columna si hay sitio (compacta: bajo la placa)
  const hornoColumna = quiere('horno') && (e('horno').tipo === 'columna' || (!e('horno').tipo && largoTotal >= 3600 && !compacta));
  if (hornoColumna) cols.push({ tipo: 'columna_hmo', ancho: 600 });
  const agua = [{ tipo: 'fregadero', ancho: largoTotal < 2200 ? 600 : 800 }];
  if (quiere('lavavajillas')) agua.push({ tipo: 'lavavajillas', ancho: e('lavavajillas').ancho === 450 ? 450 : 600 });
  if (quiere('lavadora')) agua.push({ tipo: 'lavadora', ancho: 600 });
  const hornoBajo = quiere('horno') && !hornoColumna, pl = e('placa').ancho;
  const placa = quiere('placa') ? { tipo: 'placa', ancho: pl >= 750 ? 900 : hornoBajo || largoTotal < 2800 || compacta > 1 ? 600 : 900, horno: hornoBajo } : null;
  return { cols, agua, placa, microAlto: quiere('microondas') && !hornoColumna, termo: quiere('termo'), campana: quiere('campana') ? e('campana').tipo || 'decorativa' : null };
}

// Rellenar un hueco de largo L (mm, múltiplo de 50) con anchos de catálogo: lo que menos sobre y con menos muebles.
const ANCHOS = [900, 800, 600, 500, 450, 400, 300];
function rellenar(L) {
  const mejor = new Map([[0, []]]);
  for (let s = 0; s <= L; s += PASO) { const b = mejor.get(s); if (!b) continue; ANCHOS.forEach(w => { const t = s + w; if (t <= L && (!mejor.has(t) || mejor.get(t).length > b.length + 1)) mejor.set(t, b.concat([w])); }); }
  const llega = [...mejor.keys()].sort((a, b) => b - a)[0];
  return { anchos: mejor.get(llega), sobra: L - llega };
}

// Una cocina: piezas con su sitio en u. Devuelve los bajos de cada pared (relleno de catálogo en los tramos, huecos donde
// no va nada) o null si una pieza no cabe entera en un tramo.
function aSitio(T, u, w) { const t = T.tramos.find(q => u >= q.u0 && u + w <= q.u0 + (q.y - q.x)); return t ? { ip: t.ip, x: t.x + u - t.u0 } : null; }
function montar(d, T, colocadas) {
  const items = [];
  for (const c of colocadas) { const s0 = aSitio(T, c.u, c.ancho); if (!s0) return null; items.push(Object.assign({}, c, s0)); }
  T.rincones.forEach(r => items.push({ ip: r.ip, x: r.x, ancho: RINCON, tipo: 'rinconero', extra: { forma: 'recto', gira: r.gira } }));
  // El costado que pone la colocación entre una columna y un bajo (si llega al suelo): se cuenta para que todo quede en su sitio
  const R = medidasRemates(d), costadoCol = R.columnaSobre ? 0 : R.costado, r = {};
  T.paredes.forEach(ip => {
    const lista = items.filter(x => x.ip === ip).sort((a, b) => a.x - b.x), tr = T.tramos.filter(t => t.ip === ip), bajos = [];
    // La colocación pone la regleta de 4 cm al principio de la pared: se empieza a contar ahí si no hay rinconero
    let pos = T.inicio[ip] ?? R.regleta;
    const hueco = w => { if (w >= 10) bajos.push(Object.assign(moduloNuevo('hueco'), { ancho: w })); pos += Math.max(0, w); };
    const llenar = (hasta, junto) => tr.forEach(t => {
      const a = Math.max(pos, t.x), b = Math.min(hasta, t.y); if (b - a < 1) return;
      hueco(a - pos);
      const f = rellenar(b - a);
      f.anchos.forEach(w => bajos.push(Object.assign(moduloNuevo(junto ? 'cajonero' : 'bajo'), { ancho: w })));
      pos = a + (b - a - f.sobra); if (f.sobra) hueco(f.sobra);
    });
    lista.forEach((c, i) => {
      const col = esColumna({ tipo: c.tipo }), ult = bajos.filter(q => q.tipo !== 'hueco').slice(-1)[0];
      // Antes de una columna con un bajo delante, el costado ocupa su sitio
      const antes = col && ult && !esColumna(ult) ? costadoCol : 0;
      llenar(c.x - antes, c.tipo === 'placa' || (lista[i - 1] && lista[i - 1].tipo === 'placa'));
      hueco(c.x - antes - pos); pos += antes;
      bajos.push(Object.assign(moduloNuevo(c.tipo), { ancho: c.ancho }, c.extra || {}, c.tipo === 'placa' && c.horno ? { horno: true } : {}));
      // Tras una columna (con bajos detrás), su costado
      pos = c.x + c.ancho + (col && !(lista[i + 1] && esColumna({ tipo: lista[i + 1].tipo }) && lista[i + 1].x <= c.x + c.ancho + 1) ? costadoCol : 0);
    });
    llenar(Infinity, lista.length && lista[lista.length - 1].tipo === 'placa');
    r[ip] = bajos;
  });
  return { bajos: r, items };
}
// ¿Cada pieza ha quedado donde se quería (a 6 cm) y nada se sale de la pared?
function bienColocada(f, m) {
  return m.items.every(c => { const s = situarMuebles(f.datos.paredes[c.ip], f.datos); return s.bajos.some(b => b.m.tipo === c.tipo && Math.abs(b.desde - c.x) <= 60); })
    && Object.keys(m.bajos).every(ip => { const p = f.datos.paredes[ip], s = situarMuebles(p, f.datos); return !s.bajos.length || s.bajos[s.bajos.length - 1].hasta <= p.largo + 1; });
}

// Los altos: simétricos sobre los bajos, campana (decorativa: su hueco; extraíble o integrada: alto campana), micro y
// termo en un alto, y hasta la esquina.
function ponerAltos(f, ips, pz) {
  ips.forEach(ip => { f.datos.paredes[ip].altos = []; });
  ips.forEach(ip => { const sim = nuevosSimetricos(f.datos, ip); if (sim.length) { const l = filaCon(f.datos, ip, sim); if (l) f.datos.paredes[ip].altos = l; } });
  ips.forEach(ip => { const e = altosEsquina(f.datos, ip); if (e.length) { const l = filaCon(f.datos, ip, e); if (l) f.datos.paredes[ip].altos = l; } });
  const altosSobre = tipo => ips.flatMap(ip => { const p = f.datos.paredes[ip], sit = situarMuebles(p, f.datos); return sit.altos.filter(a => a.m.tipo === 'alto').map(a => ({ a, ip, bajo: sit.bajos.find(b => a.desde < b.hasta - 1 && a.hasta > b.desde + 1) })).filter(x => !tipo || (x.bajo && x.bajo.m.tipo === tipo)); });
  if (pz.campana && pz.campana !== 'decorativa' && pz.campana !== 'techo' && pz.campana !== 'isla') altosSobre('placa').forEach(x => { x.a.m.tipo = 'alto_campana'; });
  const libres = () => altosSobre().filter(x => x.a.m.tipo === 'alto' && (!x.bajo || !['placa', 'fregadero'].includes(x.bajo.m.tipo)));
  // Primero el termo (necesita el agua cerca): el alto libre de 45 o más más cerca del fregadero
  if (pz.termo) {
    const fr = ips.flatMap(ip => situarMuebles(f.datos.paredes[ip], f.datos).bajos.filter(b => b.m.tipo === 'fregadero').map(b => ({ ip, c: (b.desde + b.hasta) / 2 })))[0];
    const lejos = q => (fr && q.ip === fr.ip ? Math.abs((q.a.desde + q.a.hasta) / 2 - fr.c) : 1e6);
    const l = libres().filter(q => q.a.m.ancho >= 450).sort((a, b) => lejos(a) - lejos(b));
    if (l[0]) Object.assign(l[0].a.m, { tipo: 'otro', nombre: 'Termo' });
  }
  // El micro: en un alto de 50 o 60 si lo hay (si no, de 45 o más)
  if (pz.microAlto) { const l = libres(), x = l.find(q => q.a.m.ancho >= 500 && q.a.m.ancho <= 600) || l.find(q => q.a.m.ancho >= 450); if (x) x.a.m.tipo = 'alto_micro'; }
}

const choques = f => avisosObra(f, 'mm').filter(a => CHOQUE.test(a.texto)).length;
// Distintas formas de ordenar las piezas a lo largo de la cocina: columnas a un lado, al otro o repartidas; el grupo de
// agua antes o después de la placa; el lavavajillas a un lado u otro del fregadero.
function ordenes(pz) {
  const r = [], C = pz.cols, colsOp = C.length === 0 ? [[[], []]] : C.length === 1 ? [[C, []], [[], C]] : [[C, []], [[], C], [[C[0]], [C[1]]], [[C[1]], [C[0]]]];
  const [F, ...resto] = pz.agua, aguaOp = [[F, ...resto], [...resto.slice().reverse(), F]].filter((x, i, a) => i === 0 || JSON.stringify(x) !== JSON.stringify(a[0]));
  colsOp.forEach(([ini, fin]) => aguaOp.forEach(agua => [true, false].forEach(aguaPrimero => r.push({ ini, fin, agua, aguaPrimero }))));
  return r;
}

// Las propuestas. sel: [{ pared (id), desde, hasta }] (mm); electro: claves que hacen falta.
export function disenarCocina(ficha, sel, electro, { cuantas = 3, dbg = null, mano = 'diestro' } = {}) {
  const d = ficha.datos, { esquinas } = esquinasDe(d, sel);
  const combos = esquinas.reduce((l) => l.flatMap(c => [c.concat(['fin']), c.concat(['ini'])]), [[]]);
  const candidatos = [];
  let T0 = null, pz = null, desague = null, humos = null, falta = null;
  combos.forEach(lados => {
  const T = tramosCocina(d, sel, lados);
  if (!T.tramos.length) return;
  T0 = T0 || T;
  const total = T.fin, usable = T.tramos.reduce((s, t) => s + t.y - t.x, 0);
  // Si lo de por defecto no cabe, más compacta: horno bajo la placa y luego placa de 60
  const necesitaDe = q => q.cols.concat(q.agua, q.placa ? [q.placa] : []).reduce((s, x) => s + x.ancho, 0) + (q.placa ? LIBRE_PLACA : 0);
  pz = piezas(d, electro, usable);
  for (let k = 1; k <= 2 && necesitaDe(pz) > total; k++) pz = piezas(d, electro, usable, { compacta: k });
  const aU = (ip, x) => { const t = T.tramos.find(q => q.ip === ip && x >= q.x - 300 && x <= q.y + 300); return t ? t.u0 + x - t.x : null; };
  // Lo medido: desagüe y salida de humos (en u)
  const elems = tipo => T.paredes.flatMap(ip => (d.paredes[ip].elementos || []).filter(e => e.tipo === tipo).map(e => aU(ip, puntoDe(d.paredes[ip], e)))).filter(x => x !== null);
  desague = elems('desague')[0] ?? null; humos = elems('humos')[0] ?? null;
  const necesita = necesitaDe(pz);
  if (necesita > total) falta = { necesita, hay: total };
  const snap = x => Math.round(x / PASO) * PASO;
  ordenes(pz).forEach(o => {
    const anchoAgua = o.agua.reduce((s, x) => s + x.ancho, 0), wIni = o.ini.reduce((s, x) => s + x.ancho, 0), wFin = o.fin.reduce((s, x) => s + x.ancho, 0);
    const libreIni = wIni, libreFin = total - wFin;
    if (libreFin - libreIni < anchoAgua + (pz.placa ? pz.placa.ancho + LIBRE_PLACA : 0)) return;
    const posF = o.agua.findIndex(x => x.tipo === 'fregadero'), antesF = o.agua.slice(0, posF).reduce((s, x) => s + x.ancho, 0), wF = o.agua[posF].ancho;
    // Respetando lo medido solo si hay algo medido (si no, saldrían las mismas dos veces)
    (desague !== null || humos !== null ? [true, false] : [false]).forEach(respetar => {
      const opsAgua = [], opsPlaca = [];
      if (respetar && desague !== null) opsAgua.push(snap(desague - wF / 2 - antesF));
      else for (let u = libreIni; u + anchoAgua <= libreFin; u += 300) opsAgua.push(u);
      opsAgua.forEach(ua => {
        if (ua < libreIni || ua + anchoAgua > libreFin) return;
        if (!pz.placa) { candidatos.push({ T, o, respetar, ua, up: null }); return; }
        const w = pz.placa.ancho;
        // La placa: bajo la salida de humos, o en cualquier sitio con 60 cm o más de encimera libre hasta el agua (y no
        // tan lejos que haya que andar: 3 m como mucho)
        const ups = [];
        if (respetar && humos !== null) ups.push(snap(humos - w / 2));
        else {
          [600, 900, 1200].forEach(g => ups.push(o.aguaPrimero ? ua + anchoAgua + g : ua - g - w));
          for (let up = libreIni; up + w <= libreFin; up += 150) { const g = up >= ua + anchoAgua ? up - (ua + anchoAgua) : ua - (up + w); if ((up >= ua + anchoAgua) === o.aguaPrimero && g >= LIBRE_PLACA && g <= 3000) ups.push(up); }
        }
        ups.forEach(up => {
          if (up < libreIni || up + w > libreFin) return;
          // Siempre espacio de trabajo: al menos 60 cm libres entre el grupo de agua y la placa
          const gap = up >= ua + anchoAgua ? up - (ua + anchoAgua) : ua - (up + w);
          if (gap < LIBRE_PLACA) return;
          candidatos.push({ T, o, respetar, ua, up });
        });
      });
    });
  });
  });
  if (dbg) Object.assign(dbg, { candidatos: candidatos.length, tramos: T0 && T0.tramos, rincones: T0 && T0.rincones });
  if (!T0) return { propuestas: [], aviso: 'No hay sitio: marca paredes con medida y sin puertas en todo el tramo.' };
  // Montar y puntuar (sin altos primero, para elegir rápido; con altos las mejores)
  const montadas = [];
  candidatos.forEach(c => {
    const T = c.T, col = []; let u = 0;
    c.o.ini.forEach(x => { col.push(Object.assign({}, x, { u })); u += x.ancho; });
    let v = T.fin; c.o.fin.slice().reverse().forEach(x => { v -= x.ancho; col.push(Object.assign({}, x, { u: v })); });
    let ua = c.ua; c.o.agua.forEach(x => { col.push(Object.assign({}, x, { u: ua })); ua += x.ancho; });
    if (pz.placa && c.up !== null) col.push(Object.assign({}, pz.placa, { u: c.up }));
    const m = montar(d, T, col); if (!m) { if (dbg) { dbg.noMonta = (dbg.noMonta || 0) + 1; if (c.o.ini.length) dbg.noMontaIni = (dbg.noMontaIni || 0) + 1; } return; }
    const f = copiar(ficha); Object.keys(m.bajos).forEach(ip => { f.datos.paredes[ip].bajos = m.bajos[ip]; f.datos.paredes[ip].altos = []; });
    if (!bienColocada(f, m)) { if (dbg) { dbg.mal = (dbg.mal || 0) + 1; if (c.o.ini.length) { dbg.malIni = (dbg.malIni || 0) + 1; dbg.ejIni = dbg.ejIni || { items: m.items.map(c => [c.tipo, c.ip, c.x]), sit: Object.keys(m.bajos).map(ip => situarMuebles(f.datos.paredes[ip], f.datos).bajos.map(b => [b.m.tipo, b.desde, b.hasta])) }; } dbg.ej = dbg.ej || { items: m.items.map(c => [c.tipo, c.ip, c.x]), sit: Object.keys(m.bajos).map(ip => [ip, situarMuebles(f.datos.paredes[ip], f.datos).bajos.map(b => [b.m.tipo, b.desde, b.hasta])]) }; } return; }
    const pu = puntuarCocina(f); if (!pu) return;
    montadas.push({ c, f, nota: pu.total, extra: preferencias(c, col, T, mano) });
  });
  const orden = (a, b) => (b.nota + b.extra) - (a.nota + a.extra);
  montadas.sort(orden);
  // Sin repetidas (los mismos muebles en el mismo orden en cada pared)
  const vistasM = new Set(), unicas = montadas.filter(m => { const k = Object.keys(m.f.datos.paredes).map(ip => (m.f.datos.paredes[ip].bajos || []).map(x => x.tipo + x.ancho).join(',')).join('|') + m.c.respetar; if (vistasM.has(k)) return false; vistasM.add(k); return true; });
  // Con altos las 12 mejores; sin choques con puertas y ventanas
  const finales = [];
  // Con altos: las 12 mejores de las que respetan lo medido y las 12 mejores de reforma
  unicas.filter(m => m.c.respetar).slice(0, 20).concat(unicas.filter(m => !m.c.respetar).slice(0, 20)).forEach(m => {
    ponerAltos(m.f, m.c.T.paredes, pz);
    if (choques(m.f) > choques(ficha)) { if (dbg) dbg.choques = (dbg.choques || 0) + 1; return; }
    const pu = puntuarCocina(m.f);
    finales.push(Object.assign(m, { nota: pu.total, pu }));
  });
  finales.sort(orden);
  if (dbg) dbg.finales = finales.map(m => [m.nota, m.extra, m.c.respetar, describir(m.f, m.c.T.paredes).join(' / ')]);
  // Distintas: por el orden de las piezas en cada pared
  // Distintas de verdad: qué va en cada pared y en qué orden, con el grupo de agua (fregadero, lavavajillas, lavadora) como uno
  const AGUA = ['fregadero', 'lavavajillas', 'lavadora'];
  const T = T0, firma = m => T.paredes.map(ip => (m.f.datos.paredes[ip].bajos || []).filter(x => !['bajo', 'cajonero', 'hueco'].includes(x.tipo)).map(x => (AGUA.includes(x.tipo) ? 'agua' : x.tipo)).filter((t, i, a) => i === 0 || t !== a[i - 1]).join(',')).join('|');
  const elegir = (lista, n, vistos) => { const r = []; lista.forEach(m => { const k = firma(m); if (r.length < n && !vistos.has(k)) { vistos.add(k); r.push(m); } }); return r; };
  const vistos = new Set(), hayLoMedido = desague !== null || humos !== null;
  const respetan = finales.filter(m => m.c.respetar), reforma = finales.filter(m => !m.c.respetar);
  const bajosDe = m => T.paredes.map(ip => (m.f.datos.paredes[ip].bajos || []).filter(x => x.tipo !== 'hueco').map(x => x.tipo + x.ancho).join(',')).join('|');
  let elegidas = hayLoMedido ? elegir(respetan, cuantas - 1, vistos) : elegir(finales, cuantas, vistos);
  // La de reforma: la mejor que no sea igual que una de las que respetan
  if (hayLoMedido) { const r1 = reforma.find(m => !elegidas.some(e => bajosDe(e) === bajosDe(m))); if (r1) { elegidas.push(r1); vistos.add(firma(r1)); } }
  if (elegidas.length < cuantas) elegidas = elegidas.concat(elegir(finales, cuantas - elegidas.length, vistos));
  const forma = T.paredes.length === 1 ? 'Lineal' : T.paredes.length === 2 ? 'En L' : 'En U';
  const aviso = elegidas.length ? null : falta ? 'No cabe: hacen falta unos ' + Math.round(falta.necesita / 10) + ' cm de muebles y espacio de trabajo y hay ' + Math.round(falta.hay / 10) + ' cm. Quita algún electrodoméstico (el frigorífico puede ir en otra pared) o marca más pared.'
    : 'No encuentro una cocina que quepa sin tapar puertas o ventanas: prueba con otras paredes o tramos.';
  return {
    // Hay algo medido pero respetándolo no sale ninguna (no queda espacio de trabajo o no cabe): todas son de reforma
    sinRespetar: hayLoMedido && elegidas.length > 0 && !elegidas.some(m => m.c.respetar),
    forma, aviso, desague: desague !== null, humos: humos !== null,
    propuestas: elegidas.map(m => ({ nota: m.nota, almacenaje: m.pu.almacenaje.nota, usabilidad: m.pu.usabilidad.nota, reforma: hayLoMedido && !m.c.respetar,
      texto: describir(m.f, T.paredes), paredes: T.paredes.map(ip => ({ id: m.f.datos.paredes[ip].id, bajos: m.f.datos.paredes[ip].bajos, altos: m.f.datos.paredes[ip].altos })) })),
  };
}
// Lo que recomiendan las guías (AMC, NKBA, Schmidt…) y la nota no mide: puntos de más para ordenar las propuestas.
// Diestros: fregadero a la izquierda y placa a la derecha (zurdos, al revés); frigorífico del lado del fregadero
// (almacenaje → lavado → cocción); 90 cm de encimera para preparar; 50 cm libres a cada lado de la placa.
function preferencias(c, col, T, mano) {
  const F = col.find(x => x.tipo === 'fregadero'), P = col.find(x => x.tipo === 'placa'), R = col.find(x => x.tipo === 'columna_frigo');
  if (!F) return 0;
  let p = 0;
  const cF = F.u + F.ancho / 2;
  if (P) {
    const cP = P.u + P.ancho / 2, prep = cP > cF ? P.u - (F.u + F.ancho) : F.u - (P.u + P.ancho);
    if ((mano === 'zurdo') === (cF > cP)) p += 3;
    if (prep >= 900) p += 2;
    // Libre a los lados de la placa (hasta la pieza o el final del tramo de al lado)
    const otros = col.filter(x => x !== P), izq = Math.min(P.u - Math.max(0, ...otros.filter(x => x.u + x.ancho <= P.u).map(x => x.u + x.ancho)), P.u),
      der = Math.min(...otros.filter(x => x.u >= P.u + P.ancho).map(x => x.u).concat([T.fin])) - (P.u + P.ancho);
    if (izq >= 500 && der >= 500) p += 1;
    if (R) { const cR = R.u + R.ancho / 2; if (Math.abs(cR - cF) < Math.abs(cR - cP)) p += 2; }
  }
  return p;
}
function describir(f, ips) {
  return ips.map(ip => { const p = f.datos.paredes[ip]; return 'Pared ' + p.letra + ': ' + (p.bajos || []).filter(m => m.tipo !== 'hueco').map(m => nombreModulo(m) + ' ' + Math.round(m.ancho / 10)).join(', '); });
}
// Aplicar una propuesta a la ficha: los bajos y altos de sus paredes; los electrodomésticos que faltan, apuntados.
export function aplicarDiseno(d, prop, electro) {
  prop.paredes.forEach(x => { const p = (d.paredes || []).find(q => q.id === x.id); if (p) { p.bajos = copiar(x.bajos); p.altos = copiar(x.altos); } });
  d.electro = d.electro || [];
  electro.filter(k => k !== 'termo' && !d.electro.some(e => e.clave === k)).forEach(k => d.electro.push({ id: crypto.randomUUID(), clave: k, tipo: null, ancho: null, alto: null, modelo: '', nombre: '', auto: true }));
}

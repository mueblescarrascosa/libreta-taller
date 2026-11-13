// Planta dibujada a partir de las paredes de la ficha: forma (del plano a mano o, si no hay, en ángulo recto),
// largos a escala y cada elemento en su sitio según su distancia y su referencia.
import { aEscala, comprobar, planoPorDefecto, letras, pilarDibujado } from './plano-geo.js';
import { encajarRotulo, textoRotulo, fondoRotulo } from './rotulos.js';
import { camposDeElemento, paredNueva, elementoNuevo, nombreElemento, USOS, textoAzulejo, extraPilar, tamanoHumos, esquinaDe, esquinaDescuadrada, textoDescuadre } from './modelo.js';
import { verMedida } from './unidades.js';
import { nombreModulo, esColumna, medidasModulo, situarMuebles, situarCuerpos } from './modulos.js';

const FONDO_MODULO = 600, FONDO_ALTO = 350;
// Ancho orientativo (mm) de lo que se mide al centro, solo para el dibujo: no es la medida real de la caja.
const ANCHO_APROX = { enchufe: 80, toma: 60, agua: 60, gas: 60, desague: 50, humos: 120 };

const ETIQUETA_CORTA = {
  humos: 'Humos', desague: 'Desagüe', agua: 'Agua', gas: 'Gas', enchufe: 'E', enchufe_hmo: 'E H/MO', enchufe_horno: 'E horno',
  enchufe_microondas: 'E micro', enchufe_frigo: 'E frigo', enchufe_lavavajillas: 'E lavav.', ventana: 'Ventana', puerta: 'Puerta', pilar: 'Mocheta', zona: 'Az.',
};
const COLOR = { humos: '#7c3aed', desague: '#0891b2', toma: '#2563eb', agua: '#2563eb', gas: '#ea580c', ventana: '#0284c7', puerta: '#92400e', pilar: '#6b7280' };
const colorDe = t => COLOR[t] || (t.startsWith('enchufe') ? '#dc2626' : '#111827');

const hay = v => v !== null && v !== undefined;
const etiqueta = e => nombreElemento(e);
// Etiqueta corta para la planta: «E H/MO», «Toma termo», «Desagüe»…
export function corta(e) {
  if (e.tipo === 'otro') return e.nombre || 'Otro';
  if (e.tipo === 'zona') return 'Az.' + (e.nombre ? ' ' + e.nombre : '');
  const uso = USOS[e.tipo] && USOS[e.tipo].find(u => u[0] === e.para), texto = e.para_nombre || (uso && uso[1]);
  if (e.tipo === 'enchufe') return texto ? 'E ' + (e.para === 'hmo' ? 'H/MO' : texto.toLowerCase()) : 'E';
  if (e.tipo === 'toma') return texto ? 'Toma ' + texto.toLowerCase() : 'Toma';
  if (e.tipo === 'humos' && e.humos_forma === 'recirculacion') return 'Recirculación';
  if (e.tipo === 'humos' && e.humos_sale === 'techo') return 'Humos techo' + (tamanoHumos(e) ? ' ' + tamanoHumos(e).replace(' mm', '').replace(' cm', '') : '');
  if (e.tipo === 'humos' && tamanoHumos(e)) return 'Humos ' + tamanoHumos(e).replace(' mm', '').replace(' cm', '');
  return ETIQUETA_CORTA[e.tipo] || etiqueta(e);
}

// El plano dibujado guarda la forma; los largos son siempre los de las paredes (por letra).
function planoDe(d) {
  const paredes = d.paredes || [];
  if (d.plano) {
    const m = d.plano.cerrada ? d.plano.vertices.length : d.plano.vertices.length - 1;
    const largos = letras(m).map(l => { const p = paredes.find(x => x.letra === l); return p ? p.largo ?? null : null; });
    return Object.assign({ esquinas: [], diagonales: [] }, d.plano, { largos });
  }
  return planoPorDefecto(paredes);
}

// Cota de un elemento tal como se midió, diciendo desde dónde: «a 82 de B» (la pared de esa esquina)
// o, si no hay pared al lado, «a 82 de izq» / «a 82 de dcha». Solo el número se confundía con el ancho.
const cotaDe = (e, unidad, vecinas = {}, delPilar = false) => {
  if (!hay(e.distancia)) return null;
  if (delPilar) return 'a ' + verMedida(e.distancia, unidad) + ' del pilar';
  const desde = e.ref === 'der' ? vecinas.der || 'dcha' : vecinas.izq || 'izq';
  return 'a ' + verMedida(e.distancia, e.tipo === 'pilar' ? 'cm' : unidad) + ' de ' + desde;
};

export function geometriaPlanta(d, { margen = 10, unidad = 'cm' } = {}) {
  const plano = planoDe(d), vacio = { paredes: [], elementos: [], sinSituar: [], aEscala: false, cierre: null };
  if (!plano) return vacio;
  let pts = aEscala(plano, margen);
  const escala = !!pts;
  if (!pts) pts = plano.vertices.map(v => ({ x: v.x * 10, y: v.y * 10 }));
  const n = pts.length, m = plano.cerrada ? n : n - 1;
  // Sin plano dibujado, cada pared de la planta es la de la ficha en ese orden, con su letra.
  const nombres = d.plano ? letras(m) : (d.paredes || []).map(p => p.letra);
  const geo = { paredes: [], elementos: [], modulos: [], islas: [], esquinas: [], sinSituar: [], fuera: [], aEscala: escala, cierre: comprobar(plano, margen).cierre };
  const ejes = {};
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], letra = nombres[i];
    const pared = (d.paredes || []).find(p => p.letra === letra) || { largo: null, elementos: [] };
    geo.paredes.push({ letra, a, b, largo: pared.largo ?? null, azulejo: textoAzulejo(pared, 'm') });
    // Esquina descuadrada al principio de esta pared: punto rojo con lo que abre o cierra.
    const esq = (d.paredes || []).includes(pared) ? esquinaDe(d, pared, 'izq') : null;
    if (esq && esquinaDescuadrada(esq.valor)) geo.esquinas.push({ punto: a, texto: '∠ ' + textoDescuadre(esq.valor, 'cm'), con: esq.con, letra });
    const L = pared.largo, lon = Math.hypot(b.x - a.x, b.y - a.y);
    const u = { x: (b.x - a.x) / (lon || 1), y: (b.y - a.y) / (lon || 1) }, dentro = { x: -u.y, y: u.x };
    const k = hay(L) && L > 0 ? lon / L : null;
    const en = s => ({ x: a.x + u.x * s * k, y: a.y + u.y * s * k });
    ejes[letra] = { en, dentro, k, L };
    // Paredes que tocan cada punta: la izquierda es el principio de la pared y la derecha el final.
    const vecinas = { izq: i > 0 ? nombres[i - 1] : plano.cerrada ? nombres[m - 1] : null,
      der: i < m - 1 ? nombres[i + 1] : plano.cerrada ? nombres[0] : null };
    (pared.elementos || []).forEach(e => {
      const extra = extraPilar(d, pared, e);
      const base = { tipo: e.tipo, etiqueta: etiqueta(e), corta: corta(e), cota: cotaDe(e, unidad, vecinas, extra > 0), pared: letra, dentro, dato: e };
      if (k === null || !hay(e.distancia)) { geo.sinSituar.push(base); return; }
      const c = camposDeElemento(e.tipo), ancho = c.ancho && hay(e.ancho) ? e.ancho : 0, dist = e.distancia + extra;
      const s = e.ref === 'der' ? (c.punto === 'centro' || !ancho ? L - dist : L - dist - ancho) : dist;
      if (!ancho) {
        const techo = e.tipo === 'humos' && e.humos_sale === 'techo', sep = techo && hay(e.separacion) ? e.separacion * k : 0;
        const w = techo ? null : ANCHO_APROX[e.tipo], r = Object.assign(base, { punto: { x: en(s).x + dentro.x * sep, y: en(s).y + dentro.y * sep } });
        if (w) r.caja = [en(s - w / 2), en(s + w / 2)];
        geo.elementos.push(r); return;
      }
      const pa = en(s), pb = en(s + ancho), r = Object.assign(base, { a: pa, b: pb });
      if (e.tipo === 'pilar' && hay(e.fondo)) {
        const f = e.fondo * k;
        r.rect = [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }];
      }
      geo.elementos.push(r);
    });
    // Bajos y columnas, seguidos desde la izquierda, con 60 de fondo hacia dentro. Se para en el primero sin ancho.
    if (k !== null) {
      const caja = (desde, hasta, fondo) => { const pa = en(desde), pb = en(hasta), f = fondo * k; return [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }]; };
      const sit = situarMuebles(pared, d);
      // Lo que entra de un rinconero de la pared de al lado: un trozo sin rótulo en esa punta.
      if (sit.entran.izq) geo.modulos.push({ tipo: 'rinconero', nombre: '', ancho: sit.entran.izq, columna: false, pared: letra, dentro, sinTexto: true, rect: caja(0, sit.entran.izq, FONDO_MODULO) });
      if (sit.entran.der && hay(L)) geo.modulos.push({ tipo: 'rinconero', nombre: '', ancho: sit.entran.der, columna: false, pared: letra, dentro, sinTexto: true, rect: caja(L - sit.entran.der, L, FONDO_MODULO) });
      for (const b of sit.bajos) geo.modulos.push({ tipo: b.m.tipo, nombre: nombreModulo(b.m), medidas: medidasModulo(b.m), ancho: b.m.ancho, columna: esColumna(b.m), pared: letra, dentro, dato: b.m, rect: caja(b.desde, b.hasta, FONDO_MODULO) });
      for (const a of sit.altos) geo.modulos.push({ tipo: a.m.tipo, nombre: nombreModulo(a.m), medidas: medidasModulo(a.m), ancho: a.m.ancho, alto: true, columna: false, pared: letra, dentro, rect: caja(a.desde, a.hasta, FONDO_ALTO) });
      // Cuerpos del vestidor, igual que los bajos, y lo que entra del cuerpo de rincón de la pared de al lado.
      const sc = situarCuerpos(pared, d), fc = FONDO_MODULO;
      if (sc.entran.izq) geo.modulos.push({ tipo: 'cuerpo', nombre: '', ancho: sc.entran.izq, columna: false, pared: letra, dentro, sinTexto: true, dato: sc.entran.cIzq, rect: caja(0, sc.entran.izq, fc) });
      if (sc.entran.der && hay(L)) geo.modulos.push({ tipo: 'cuerpo', nombre: '', ancho: sc.entran.der, columna: false, pared: letra, dentro, sinTexto: true, dato: sc.entran.cDer, rect: caja(L - sc.entran.der, L, fc) });
      sc.cuerpos.forEach(({ c: cu, desde, hasta }) => geo.modulos.push({ tipo: 'cuerpo', nombre: 'Cuerpo ' + ((pared.cuerpos || []).indexOf(cu) + 1), ancho: cu.ancho, columna: false, pared: letra, dentro, dato: cu,
        rincon: cu.rincon || null, rect: caja(desde, hasta, fc) }));
    }
  }
  // Islas y penínsulas: en su sitio respecto a su pared, con las cotas al suelo (separación y distancia desde la esquina).
  const mas = (p, v, f) => ({ x: p.x + v.x * f, y: p.y + v.y * f });
  (d.islas || []).forEach(x => {
    const e = ejes[x.pared], nombre = x.tipo === 'peninsula' ? 'Península' : 'Isla';
    const medidas = hay(x.largo) && hay(x.fondo) ? verMedida(x.largo, unidad) + '×' + verMedida(x.fondo, unidad) : '';
    const sep = x.tipo === 'peninsula' ? 0 : x.separacion;
    const ancho = x.tipo === 'peninsula' ? x.fondo : x.largo, hondo = x.tipo === 'peninsula' ? x.largo : x.fondo;
    if (!e || e.k === null || !hay(x.distancia) || !hay(ancho) || !hay(hondo) || !hay(sep) || !hay(e.L)) {
      geo.sinSituar.push({ tipo: x.tipo, etiqueta: nombre, corta: nombre, pared: x.pared || '?' }); return;
    }
    const s0 = x.ref === 'der' ? e.L - x.distancia - ancho : x.distancia, k = e.k, D = e.dentro;
    const p0 = mas(e.en(s0), D, sep * k), p1 = mas(e.en(s0 + ancho), D, sep * k);
    const rect = [p0, p1, mas(p1, D, hondo * k), mas(p0, D, hondo * k)];
    const cotas = [];
    // A lo largo de la pared, a media hondura: desde la esquina de referencia hasta el lado de la isla.
    const fondoMedio = (sep + hondo * (x.tipo === 'peninsula' ? 0.2 : 0.5)) * k, esquina = x.ref === 'der' ? e.L : 0, lado = x.ref === 'der' ? s0 + ancho : s0;
    if (x.distancia > 0) cotas.push({ a: mas(e.en(esquina), D, fondoMedio), b: mas(e.en(lado), D, fondoMedio), texto: verMedida(x.distancia, unidad) });
    // Separación de la pared (solo islas): de la pared al borde, por el centro.
    if (x.tipo !== 'peninsula' && sep > 0) cotas.push({ a: e.en(s0 + ancho / 2), b: mas(e.en(s0 + ancho / 2), D, sep * k), texto: verMedida(sep, unidad) });
    geo.islas.push({ tipo: x.tipo, nombre: nombre + (medidas ? ' ' + medidas : ''), rect, cotas, pared: x.pared });
  });

  // Rincón en chaflán: el mueble y su trozo en la pared de al lado son una sola pieza de cinco lados, con el frente en diagonal
  // (frente: el lado de delante, de rect[1] a rect[2]).
  const igual = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6 * (1 + Math.abs(p.x) + Math.abs(p.y)) + 0.5;
  geo.modulos.filter(m => !m.sinTexto && ((m.tipo === 'rinconero' && m.dato && m.dato.forma === 'chaflan') || (m.tipo === 'cuerpo' && m.rincon === 'chaflan'))).forEach(m => {
    const der = (m.dato && m.dato.gira) !== 'izq';
    const otro = geo.modulos.find(o => o.sinTexto && o.tipo === m.tipo && o !== m && (der ? igual(o.rect[0], m.rect[1]) : igual(o.rect[1], m.rect[0])));
    if (!otro) return;
    m.rect = der ? [m.rect[0], m.rect[3], otro.rect[2], otro.rect[1], m.rect[1]] : [otro.rect[0], otro.rect[3], m.rect[2], m.rect[1], m.rect[0]];
    m.chaflan = true;
    geo.modulos.splice(geo.modulos.indexOf(otro), 1);
  });

  // Paredes de la ficha que el plano no tiene: se avisan y sus elementos van a «sin situar».
  (d.paredes || []).filter(p => !nombres.includes(p.letra)).forEach(p => {
    geo.fuera.push(p.letra);
    (p.elementos || []).forEach(e => geo.sinSituar.push({ tipo: e.tipo, etiqueta: etiqueta(e), corta: corta(e), pared: p.letra }));
  });
  return geo;
}

// Pasa un plano dibujado a la ficha: una pared por letra, conservando lo que ya tuvieran.
export function aplicarPlano(datos, plano) {
  const m = plano.cerrada ? plano.vertices.length : plano.vertices.length - 1, existentes = datos.paredes || [];
  const paredes = letras(m).map((letra, i) => {
    const largo = plano.largos ? plano.largos[i] : undefined, previa = existentes.find(p => p.letra === letra);
    // El editor se abre con los largos de la ficha: si vuelve uno vacío es que se borró.
    if (previa) return Object.assign({}, previa, plano.largos ? { largo: hay(largo) ? largo : null } : {});
    return Object.assign(paredNueva([]), { letra, largo: hay(largo) ? largo : null });
  });
  // Pilares que el dibujo sacó de las paredes: van como mocheta de su pared (si no tenía ya bastantes).
  (plano.pilares || []).forEach((pl, j, todos) => {
    const p = paredes[pl.pared];
    if (!p) return;
    const quiere = todos.filter(x => x.pared === pl.pared).length, tiene = (p.elementos || []).filter(e => e.tipo === 'pilar').length;
    if (tiene >= quiere) return;
    const e = Object.assign(elementoNuevo('pilar', pl.ref), { distancia: pl.distancia ?? null, fondo: null });
    paredes[pl.pared] = Object.assign({}, p, { elementos: (p.elementos || []).concat([e]) });
  });
  const sobran = existentes.filter(p => !paredes.some(x => x.letra === p.letra));
  const guardado = { vertices: plano.vertices, cerrada: plano.cerrada, esquinas: plano.esquinas || [], diagonales: plano.diagonales || [] };
  return Object.assign({}, datos, { paredes: paredes.concat(sobran), plano: guardado });
}

// ── Pilares dibujados como paredes (planos de antes) ──
// Qué paredes parecen un pilar y en qué pared quedaría: {paredes: ['E','F'], en: 'D'} o null.
export function pilarEnParedes(datos) {
  const c = datos && datos.plano && pilarDibujado(datos.plano);
  if (!c) return null;
  const n = datos.plano.vertices.length, nom = letras(datos.plano.cerrada ? n : n - 1), k = i => nom[(c.j + i) % n];
  return { paredes: c.tipo === 'rincon' ? [k(1), k(2)] : [k(1), k(2), k(3)], en: k(0), tipo: c.tipo };
}
// Todos los pilares dibujados como paredes, con las letras de ahora: [{paredes: ['B','C'], en: 'A'}, {paredes: ['E','F'], en: 'D'}].
export function pilaresEnParedes(datos) {
  const r = [];
  let d = JSON.parse(JSON.stringify(datos));
  (d.paredes || []).forEach(p => { p._antes = p.letra; });
  const antes = l => { const p = d.paredes.find(x => x.letra === l); return p && p._antes ? p._antes : l; };
  for (let veces = 0; veces < 8; veces++) {
    const c = d.plano && pilarDibujado(d.plano), pp = pilarEnParedes(d);
    if (!c || !pp) break;
    r.push({ paredes: pp.paredes.map(antes), en: antes(pp.en) });
    d = unPilar(d, c);
  }
  return r;
}
// Pasa a mocheta los pilares dibujados como paredes. Lo que sobresale (1.ª pared corta) es el fondo y la cara (2.ª) el ancho.
// La pared que lo lleva y la de al lado crecen hasta la esquina de verdad; lo medido desde la cara del pilar queda «desde el pilar».
export function pasarAPilar(datos) {
  let d = JSON.parse(JSON.stringify(datos));
  for (let veces = 0; veces < 8; veces++) {
    const c = d.plano && pilarDibujado(d.plano);
    if (!c) break;
    d = unPilar(d, c);
  }
  return d;
}
function unPilar(d, c) {
  const pl = d.plano, n = pl.vertices.length, m = pl.cerrada ? n : n - 1, nom = letras(m);
  const idx = k => ((k % n) + n) % n, pared = k => d.paredes.find(p => p.letra === nom[idx(k)]) || paredNueva([]);
  const suma = (...v) => (v.every(hay) ? v.reduce((a, b) => a + b, 0) : null);
  const j = c.j, host = pared(j), cortos = [];
  const juntar = (a, b) => { ['elementos', 'bajos', 'altos', 'cuerpos'].forEach(k => { if ((b[k] || []).length) a[k] = (a[k] || []).concat(b[k]); }); };
  const pilar = Object.assign(elementoNuevo('pilar', 'izq'), { fondo: pared(j + 1).largo ?? null, ancho: pared(j + 2).largo ?? null });
  let quitar;
  if (c.tipo === 'rincon') {
    const otra = pared(j + 3);
    cortos.push(pared(j + 1), pared(j + 2));
    Object.assign(pilar, { ref: 'der', distancia: 0 });
    (host.elementos || []).forEach(e => { if (e.tipo !== 'pilar' && e.ref === 'der') e.desde = 'pilar'; });
    (otra.elementos || []).forEach(e => { if (e.tipo !== 'pilar' && e.ref !== 'der') e.desde = 'pilar'; });
    host.largo = suma(host.largo, pilar.ancho); otra.largo = suma(otra.largo, pilar.fondo);
    quitar = [idx(j + 2), idx(j + 3)];
  } else {
    const sigue = pared(j + 4), L1 = host.largo, L2 = sigue.largo;
    cortos.push(pared(j + 1), pared(j + 2), pared(j + 3));
    pilar.distancia = hay(L1) ? L1 : null;
    (host.elementos || []).forEach(e => { if (e.ref === 'der' && hay(e.distancia)) e.distancia = suma(e.distancia, pilar.ancho, L2); });
    (sigue.elementos || []).forEach(e => { if (e.ref !== 'der' && hay(e.distancia)) e.distancia = suma(e.distancia, L1, pilar.ancho); });
    host.largo = suma(L1, pilar.ancho, L2);
    juntar(host, Object.assign({}, sigue, { elementos: sigue.elementos }));
    quitar = [idx(j + 1), idx(j + 2), idx(j + 3), idx(j + 4)];
  }
  cortos.forEach(p => juntar(host, p));
  host.elementos = (host.elementos || []).concat([pilar]);
  // Paredes en el orden nuevo: la que empezaba en cada esquina que queda (en el rincón, la esquina nueva es la de la pared de al lado).
  const quedan = [], esquinas = [], nuevo = [];
  for (let k = 0; k < n; k++) {
    if (quitar.includes(k)) continue;
    nuevo[k] = quedan.length;
    const rin = c.tipo === 'rincon' && k === idx(j + 1);
    if (k < m || pl.cerrada) quedan.push(rin ? pared(j + 3) : pared(k));
    esquinas.push(rin ? { estado: 'escuadra', sentido: null, mm: null, en: 1000 } : (pl.esquinas || [])[k] || { estado: 'escuadra', sentido: null, mm: null, en: 1000 });
  }
  if (!pl.cerrada) quedan.splice(c.vertices.length - 1);
  const fuera = new Set([...cortos, c.tipo === 'medio' ? pared(j + 4) : null].filter(Boolean));
  const letrasNuevas = letras(quedan.length);
  const enPlano = quedan.map((p, i) => Object.assign(p, { letra: letrasNuevas[i] }));
  const sobran = d.paredes.filter(p => !enPlano.includes(p) && !fuera.has(p) && !nom.includes(p.letra));
  const diagonales = (pl.diagonales || []).filter(g => nuevo[g.de] !== undefined && nuevo[g.a] !== undefined).map(g => Object.assign({}, g, { de: nuevo[g.de], a: nuevo[g.a] }));
  return Object.assign(d, { paredes: enPlano.concat(sobran), plano: Object.assign({}, pl, { vertices: c.vertices, esquinas, diagonales }) });
}

// Dibujo SVG de la planta. Solo en el navegador.
export function svgPlanta(geo) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const todos = geo.paredes.flatMap(p => [p.a, p.b]).concat(geo.elementos.flatMap(e => e.rect || (e.punto ? [e.punto] : [e.a, e.b])), geo.modulos.flatMap(m => m.rect), (geo.islas || []).flatMap(x => x.rect));
  const xs = todos.map(p => p.x), ys = todos.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1, s = Math.max(w, h) / 120, pad = s * 14;
  const svg = el('svg', { class: 'planta', role: 'img', 'aria-label': 'Planta de la habitación', 'data-acc': 'planta' });
  const texto = (x, y, t, o) => svg.append(el('text', Object.assign({ x, y, 'font-size': s * 4, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': s * 1.2 }, o), t));
  // Sitio que ocupa cada texto (aproximado por su largo y su tamaño de letra), para que nada se pise
  // y para que el marco del dibujo crezca hasta que quepan todos.
  // Los textos van al final, encima de las rayitas, para que ninguna los tache.
  const nombres = [];
  const puestos = [], pisa = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
  const cajaTexto = (x, y, t, tam = 4) => { const w = String(t).length * s * tam * 0.62 + s, hh = s * tam * 1.35; return { x: x - w / 2, y: y - hh / 2, w, h: hh, cx: x, cy: y }; };
  geo.paredes.forEach(p => {
    svg.append(el('line', { x1: p.a.x, y1: p.a.y, x2: p.b.x, y2: p.b.y, stroke: '#1f2937', 'stroke-width': s * 1.6, 'stroke-linecap': 'square' }));
    const lon = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) || 1, fuera = { x: (p.b.y - p.a.y) / lon, y: -(p.b.x - p.a.x) / lon };
    const mx = (p.a.x + p.b.x) / 2 + fuera.x * s * 6, my = (p.a.y + p.b.y) / 2 + fuera.y * s * 6;
    const rotulo = p.letra + (hay(p.largo) ? ' · ' + verMedida(p.largo, 'm') + ' m' : '');
    nombres.push(() => texto(mx, my, rotulo, { 'font-weight': 700, 'data-pared': p.letra })); puestos.push(cajaTexto(mx, my, rotulo));
    if (p.azulejo) {
      const ax = mx + fuera.x * s * 5, ay = my + fuera.y * s * 5;
      nombres.push(() => texto(ax, ay, p.azulejo, { 'font-size': s * 3, fill: '#0f766e' })); puestos.push(cajaTexto(ax, ay, p.azulejo, 3));
    }
  });
  // Esquinas descuadradas: punto rojo y el texto hacia dentro de la habitación.
  const centro = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  (geo.esquinas || []).forEach(q => {
    svg.append(el('circle', { cx: q.punto.x, cy: q.punto.y, r: s * 1.6, fill: '#dc2626', 'data-esquina-descuadrada': q.letra }));
    const dx = centro.x - q.punto.x, dy = centro.y - q.punto.y, l = Math.hypot(dx, dy) || 1;
    const tx = q.punto.x + dx / l * s * 9, ty = q.punto.y + dy / l * s * 6;
    nombres.push(() => texto(tx, ty, q.texto, { 'font-size': s * 2.8, fill: '#b91c1c', 'font-weight': 700 })); puestos.push(cajaTexto(tx, ty, q.texto, 2.8));
  });
  // Bajos (marrón) y, encima, los altos (azul, más estrechos y transparentes). El rótulo de los bajos va hacia dentro
  // y el de los altos pegado a la pared, para que no se pisen.
  const hayAltos = geo.modulos.some(m => m.alto);
  [...geo.modulos.filter(m => !m.alto), ...geo.modulos.filter(m => m.alto)].forEach(m => {
    svg.append(el('polygon', Object.assign({ points: m.rect.map(p => p.x + ',' + p.y).join(' '), 'data-modulo': m.tipo, 'stroke-width': s * 0.5 },
      m.alto ? { fill: '#bfdbfe', 'fill-opacity': 0.7, stroke: '#1d4ed8', 'stroke-dasharray': s * 1.2 + ' ' + s * 0.8, 'data-alto': '' }
        : { fill: m.columna ? '#e7d8c9' : '#f5ede4', stroke: '#92400e' })));
    if (m.sinTexto) return;
    const [a, b, c2, d2] = m.rect, t = (m.tipo === 'rinconero' ? 'Rinc.' : m.nombre) + (m.medidas || m.medidas === '' ? (m.medidas ? ' ' + m.medidas : '') : ' ' + verMedida(m.ancho, 'cm'));
    // El rótulo, dentro de su mueble y sin pisar otros: los altos en su caja; los bajos, si hay altos, en la parte que queda libre.
    // Si no cabe, girado, en dos líneas o con letra menor.
    const [f0, f1] = m.alto || !hayAltos ? [0, 1] : [0.6, 1], en = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f });
    const zona = m.chaflan ? m.rect : [en(a, d2, f0), en(b, c2, f0), en(b, c2, f1), en(a, d2, f1)];
    const hueco = { x0: Math.min(...zona.map(p => p.x)), x1: Math.max(...zona.map(p => p.x)), y0: Math.min(...zona.map(p => p.y)), y1: Math.max(...zona.map(p => p.y)) };
    const tamanos = [2.6, 2.3, 2, 1.8].map(k => k * s), color = m.alto ? '#1e3a8a' : '#78350f';
    const r = encajarRotulo(t, hueco, { tamanos, ancho: 0.62, puestos }) || encajarRotulo(t, hueco, { tamanos: [1.8 * s], ancho: 0.62, margen: 1.3 })
      || { tam: 1.8 * s, girar: false, lineas: [t], cx: (hueco.x0 + hueco.x1) / 2, cy: (hueco.y0 + hueco.y1) / 2, caja: cajaTexto((hueco.x0 + hueco.x1) / 2, (hueco.y0 + hueco.y1) / 2, t, 1.8) };
    puestos.push(r.caja);
    nombres.push(() => svg.append(fondoRotulo(el, r, r.tam), textoRotulo(el, r, { fill: color })));
  });
  // Islas y penínsulas (amarillo) y sus cotas al suelo (raya de puntos con la medida en medio).
  (geo.islas || []).forEach(x => {
    svg.append(el('polygon', { points: x.rect.map(p => p.x + ',' + p.y).join(' '), fill: '#fef3c7', stroke: '#b45309', 'stroke-width': s * 0.6, 'data-isla': x.tipo }));
    const c = { x: (x.rect[0].x + x.rect[2].x) / 2, y: (x.rect[0].y + x.rect[2].y) / 2 };
    nombres.push(() => texto(c.x, c.y, x.nombre, { 'font-size': s * 2.8, fill: '#92400e', 'font-weight': 700 })); puestos.push(cajaTexto(c.x, c.y, x.nombre, 2.8));
    x.cotas.forEach(q => {
      svg.append(el('line', { x1: q.a.x, y1: q.a.y, x2: q.b.x, y2: q.b.y, stroke: '#b45309', 'stroke-width': s * 0.35, 'stroke-dasharray': s * 1 + ' ' + s * 0.7, 'data-cota-suelo': '' }));
      [q.a, q.b].forEach(p => svg.append(el('circle', { cx: p.x, cy: p.y, r: s * 0.6, fill: '#b45309' })));
      // La medida, hacia el final de la raya (cerca de la isla) para no pisar los rótulos de los muebles.
      const m = { x: q.a.x + (q.b.x - q.a.x) * 0.7, y: q.a.y + (q.b.y - q.a.y) * 0.7 };
      nombres.push(() => texto(m.x, m.y, q.texto, { 'font-size': s * 2.6, fill: '#b45309' })); puestos.push(cajaTexto(m.x, m.y, q.texto, 2.6));
    });
  });
  // Nombres sin pisarse: si uno cae encima de otro ya puesto, se aleja de la pared con una rayita hasta su sitio.
  // Primero hacia dentro; si por ahí está todo ocupado, el sitio libre más cercano hacia los lados o hacia fuera.
  // El sitio libre más cercano a su elemento: hacia d (lo preferido) o hacia el otro lado, alejándose de la pared y
  // corriéndose a lo largo de ella. El otro lado cuenta como un poco más lejos, para que solo se use si así queda más cerca.
  const nombre = (c, d, t, col, tipo, { tam = 4, desde = 6 } = {}) => {
    const u = { x: -d.y, y: d.x }, paso1 = tam * 1.4, ancho = String(t).length * tam * 0.62, otro = { x: -d.x, y: -d.y };
    const en = (k, j, dir) => cajaTexto(c.x + dir.x * s * (desde + k * paso1) + u.x * s * j, c.y + dir.y * s * (desde + k * paso1) + u.y * s * j, t, tam);
    const libre = b => !puestos.some(q => pisa(b, q));
    let caja = null, mejor = Infinity;
    for (const [dir, extra] of [[d, 0], [otro, tam * 4]]) for (let k = 0; k < 25; k++) for (const f of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) {
      const coste = Math.hypot(desde + k * paso1, f * ancho) + extra;
      if (coste >= mejor) continue;
      const b = en(k, f * ancho, dir);
      if (libre(b)) { caja = b; mejor = coste; }
    }
    if (!caja) caja = en(0, 0, d);
    const paso = Math.hypot(caja.cx - c.x, caja.cy - c.y) > s * (desde + 1) ? 2 : 1;
    puestos.push(caja);
    if (paso > 1) { const vx = caja.cx - c.x, vy = caja.cy - c.y, l = Math.hypot(vx, vy) || 1;
      svg.append(el('line', { x1: c.x + vx / l * s * 2, y1: c.y + vy / l * s * 2, x2: caja.cx - vx / l * s * 2, y2: caja.cy - vy / l * s * 2, stroke: col, 'stroke-width': s * 0.3, opacity: 0.7 })); }
    nombres.push(() => texto(caja.cx, caja.cy, t, Object.assign({ fill: col, 'font-size': s * tam }, tipo ? { 'data-elemento': tipo } : {})));
  };
  geo.elementos.forEach(e => {
    const col = colorDe(e.tipo), d = e.dentro;
    if (e.tipo === 'zona' && e.a) {
      const f = s * 2.4, a = { x: e.a.x - d.x * f, y: e.a.y - d.y * f }, b = { x: e.b.x - d.x * f, y: e.b.y - d.y * f };
      svg.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#0f766e', 'stroke-width': s * 0.7, 'stroke-dasharray': s * 1.5 + ' ' + s, opacity: 0.8, 'data-zona': '' }));
      nombre({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { x: -d.x, y: -d.y }, e.corta, '#0f766e', null, { tam: 2.6, desde: 2.5 });
      return;
    }
    let c;
    if (e.rect) { svg.append(el('polygon', { points: e.rect.map(p => p.x + ',' + p.y).join(' '), fill: '#d1d5db', stroke: col, 'stroke-width': s * 0.6 })); c = { x: (e.rect[0].x + e.rect[2].x) / 2, y: (e.rect[0].y + e.rect[2].y) / 2 }; }
    else if (e.caja) {
      const f = s * 2, [p, q] = e.caja;
      svg.append(el('polygon', { points: [p, q, { x: q.x + d.x * f, y: q.y + d.y * f }, { x: p.x + d.x * f, y: p.y + d.y * f }].map(z => z.x + ',' + z.y).join(' '), fill: col, opacity: 0.85, 'data-caja': e.tipo }));
      c = e.punto;
    }
    else if (e.punto) { svg.append(el('circle', { cx: e.punto.x, cy: e.punto.y, r: s * 1.8, fill: col })); c = e.punto; }
    else { svg.append(el('line', { x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, stroke: col, 'stroke-width': s * 2.6 })); c = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }; }
    // Ventanas, puertas y pilares: el nombre por fuera de la habitación (no se mete entre los muebles).
    const fuera = e.tipo === 'ventana' || e.tipo === 'puerta' || e.tipo === 'pilar';
    nombre(c, fuera ? { x: -d.x, y: -d.y } : d, e.corta + (e.cota ? ' ' + e.cota : ''), col, e.tipo, fuera ? { desde: 5 } : {});
  });
  nombres.forEach(f => f());
  // Marco: el dibujo y todos los textos, con un poco de aire.
  const X0 = Math.min(x0, ...puestos.map(q => q.x)) - pad / 2, Y0 = Math.min(y0, ...puestos.map(q => q.y)) - pad / 2;
  const X1 = Math.max(x0 + w, ...puestos.map(q => q.x + q.w)) + pad / 2, Y1 = Math.max(y0 + h, ...puestos.map(q => q.y + q.h)) + pad / 2;
  svg.setAttribute('viewBox', `${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}`);
  return svg;
}

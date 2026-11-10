// Planta dibujada a partir de las paredes de la ficha: forma (del plano a mano o, si no hay, en ángulo recto),
// largos a escala y cada elemento en su sitio según su distancia y su referencia.
import { aEscala, comprobar, planoPorDefecto, letras } from './plano-geo.js';
import { camposDeElemento, paredNueva, nombreElemento, USOS, textoAzulejo } from './modelo.js';
import { verMedida } from './unidades.js';
import { nombreModulo, esColumna } from './modulos.js';

const FONDO_MODULO = 600;

const ETIQUETA_CORTA = {
  humos: 'Humos', desague: 'Desagüe', agua: 'Agua', gas: 'Gas', enchufe: 'E', enchufe_hmo: 'E H/MO', enchufe_horno: 'E horno',
  enchufe_microondas: 'E micro', enchufe_frigo: 'E frigo', enchufe_lavavajillas: 'E lavav.', ventana: 'Ventana', puerta: 'Puerta', pilar: 'Mocheta', zona: 'Azulejo',
};
const COLOR = { humos: '#7c3aed', desague: '#0891b2', toma: '#2563eb', agua: '#2563eb', gas: '#ea580c', ventana: '#0284c7', puerta: '#92400e', pilar: '#6b7280' };
const colorDe = t => COLOR[t] || (t.startsWith('enchufe') ? '#dc2626' : '#111827');

const hay = v => v !== null && v !== undefined;
const etiqueta = e => nombreElemento(e);
// Etiqueta corta para la planta: «E H/MO», «Toma termo», «Desagüe»…
function corta(e) {
  if (e.tipo === 'otro') return e.nombre || 'Otro';
  const uso = USOS[e.tipo] && USOS[e.tipo].find(u => u[0] === e.para), texto = e.para_nombre || (uso && uso[1]);
  if (e.tipo === 'enchufe') return texto ? 'E ' + (e.para === 'hmo' ? 'H/MO' : texto.toLowerCase()) : 'E';
  if (e.tipo === 'toma') return texto ? 'Toma ' + texto.toLowerCase() : 'Toma';
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

export function geometriaPlanta(d, { margen = 10 } = {}) {
  const plano = planoDe(d), vacio = { paredes: [], elementos: [], sinSituar: [], aEscala: false, cierre: null };
  if (!plano) return vacio;
  let pts = aEscala(plano, margen);
  const escala = !!pts;
  if (!pts) pts = plano.vertices.map(v => ({ x: v.x * 10, y: v.y * 10 }));
  const n = pts.length, m = plano.cerrada ? n : n - 1;
  // Sin plano dibujado, cada pared de la planta es la de la ficha en ese orden, con su letra.
  const nombres = d.plano ? letras(m) : (d.paredes || []).map(p => p.letra);
  const geo = { paredes: [], elementos: [], modulos: [], sinSituar: [], fuera: [], aEscala: escala, cierre: comprobar(plano, margen).cierre };
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], letra = nombres[i];
    const pared = (d.paredes || []).find(p => p.letra === letra) || { largo: null, elementos: [] };
    geo.paredes.push({ letra, a, b, largo: pared.largo ?? null, azulejo: textoAzulejo(pared, 'm') });
    const L = pared.largo, lon = Math.hypot(b.x - a.x, b.y - a.y);
    const u = { x: (b.x - a.x) / (lon || 1), y: (b.y - a.y) / (lon || 1) }, dentro = { x: -u.y, y: u.x };
    const k = hay(L) && L > 0 ? lon / L : null;
    const en = s => ({ x: a.x + u.x * s * k, y: a.y + u.y * s * k });
    (pared.elementos || []).forEach(e => {
      const base = { tipo: e.tipo, etiqueta: etiqueta(e), corta: corta(e), pared: letra, dentro };
      if (k === null || !hay(e.distancia)) { geo.sinSituar.push(base); return; }
      const c = camposDeElemento(e.tipo), ancho = c.ancho && hay(e.ancho) ? e.ancho : 0;
      const s = e.ref === 'der' ? (c.punto === 'centro' || !ancho ? L - e.distancia : L - e.distancia - ancho) : e.distancia;
      if (!ancho) { geo.elementos.push(Object.assign(base, { punto: en(s) })); return; }
      const pa = en(s), pb = en(s + ancho), r = Object.assign(base, { a: pa, b: pb });
      if (e.tipo === 'pilar' && hay(e.fondo)) {
        const f = e.fondo * k;
        r.rect = [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }];
      }
      geo.elementos.push(r);
    });
    // Bajos y columnas, seguidos desde la izquierda, con 60 de fondo hacia dentro. Se para en el primero sin ancho.
    if (k !== null) {
      let s = 0;
      for (const mo of pared.bajos || []) {
        if (!hay(mo.ancho)) break;
        const pa = en(s), pb = en(s + mo.ancho), f = FONDO_MODULO * k;
        geo.modulos.push({ tipo: mo.tipo, nombre: nombreModulo(mo), ancho: mo.ancho, columna: esColumna(mo), pared: letra, dentro,
          rect: [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }] });
        s += mo.ancho;
      }
    }
  }
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
    if (previa) return Object.assign({}, previa, hay(largo) ? { largo } : {});
    return Object.assign(paredNueva([]), { letra, largo: hay(largo) ? largo : null });
  });
  const sobran = existentes.filter(p => !paredes.some(x => x.letra === p.letra));
  const guardado = { vertices: plano.vertices, cerrada: plano.cerrada, esquinas: plano.esquinas || [], diagonales: plano.diagonales || [] };
  return Object.assign({}, datos, { paredes: paredes.concat(sobran), plano: guardado });
}

// Dibujo SVG de la planta. Solo en el navegador.
export function svgPlanta(geo) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const todos = geo.paredes.flatMap(p => [p.a, p.b]).concat(geo.elementos.flatMap(e => e.rect || (e.punto ? [e.punto] : [e.a, e.b])), geo.modulos.flatMap(m => m.rect));
  const xs = todos.map(p => p.x), ys = todos.map(p => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1, s = Math.max(w, h) / 120, pad = s * 14;
  const svg = el('svg', { viewBox: `${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`, class: 'planta', role: 'img', 'aria-label': 'Planta de la habitación', 'data-acc': 'planta' });
  const texto = (x, y, t, o) => svg.append(el('text', Object.assign({ x, y, 'font-size': s * 4, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': s * 1.2 }, o), t));
  geo.paredes.forEach(p => {
    svg.append(el('line', { x1: p.a.x, y1: p.a.y, x2: p.b.x, y2: p.b.y, stroke: '#1f2937', 'stroke-width': s * 1.6, 'stroke-linecap': 'square' }));
    const lon = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) || 1, fuera = { x: (p.b.y - p.a.y) / lon, y: -(p.b.x - p.a.x) / lon };
    const mx = (p.a.x + p.b.x) / 2 + fuera.x * s * 6, my = (p.a.y + p.b.y) / 2 + fuera.y * s * 6;
    texto(mx, my, p.letra + (hay(p.largo) ? ' · ' + verMedida(p.largo, 'm') + ' m' : ''), { 'font-weight': 700, 'data-pared': p.letra });
    if (p.azulejo) texto(mx + fuera.x * s * 5, my + fuera.y * s * 5, p.azulejo, { 'font-size': s * 3, fill: '#0f766e' });
  });
  geo.modulos.forEach(m => {
    svg.append(el('polygon', { points: m.rect.map(p => p.x + ',' + p.y).join(' '), fill: m.columna ? '#e7d8c9' : '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.5, 'data-modulo': m.tipo }));
    const c = { x: (m.rect[0].x + m.rect[2].x) / 2, y: (m.rect[0].y + m.rect[2].y) / 2 };
    texto(c.x, c.y, m.nombre + ' ' + verMedida(m.ancho, 'cm'), { 'font-size': s * 2.8, fill: '#78350f' });
  });
  geo.elementos.forEach(e => {
    const col = colorDe(e.tipo), d = e.dentro;
    let c;
    if (e.rect) { svg.append(el('polygon', { points: e.rect.map(p => p.x + ',' + p.y).join(' '), fill: '#d1d5db', stroke: col, 'stroke-width': s * 0.6 })); c = { x: (e.rect[0].x + e.rect[2].x) / 2, y: (e.rect[0].y + e.rect[2].y) / 2 }; }
    else if (e.punto) { svg.append(el('circle', { cx: e.punto.x, cy: e.punto.y, r: s * 1.8, fill: col })); c = e.punto; }
    else { svg.append(el('line', { x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, stroke: col, 'stroke-width': s * 2.6 })); c = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 }; }
    texto(c.x + d.x * s * 6, c.y + d.y * s * 6, e.corta, { fill: col, 'data-elemento': e.tipo });
  });
  return svg;
}

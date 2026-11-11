// Planta dibujada a partir de las paredes de la ficha: forma (del plano a mano o, si no hay, en ángulo recto),
// largos a escala y cada elemento en su sitio según su distancia y su referencia.
import { aEscala, comprobar, planoPorDefecto, letras } from './plano-geo.js';
import { camposDeElemento, paredNueva, nombreElemento, USOS, textoAzulejo, extraPilar } from './modelo.js';
import { verMedida } from './unidades.js';
import { nombreModulo, esColumna } from './modulos.js';

const FONDO_MODULO = 600;
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
function corta(e) {
  if (e.tipo === 'otro') return e.nombre || 'Otro';
  if (e.tipo === 'zona') return 'Az.' + (e.nombre ? ' ' + e.nombre : '');
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
  const geo = { paredes: [], elementos: [], modulos: [], sinSituar: [], fuera: [], aEscala: escala, cierre: comprobar(plano, margen).cierre };
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], letra = nombres[i];
    const pared = (d.paredes || []).find(p => p.letra === letra) || { largo: null, elementos: [] };
    geo.paredes.push({ letra, a, b, largo: pared.largo ?? null, azulejo: textoAzulejo(pared, 'm') });
    const L = pared.largo, lon = Math.hypot(b.x - a.x, b.y - a.y);
    const u = { x: (b.x - a.x) / (lon || 1), y: (b.y - a.y) / (lon || 1) }, dentro = { x: -u.y, y: u.x };
    const k = hay(L) && L > 0 ? lon / L : null;
    const en = s => ({ x: a.x + u.x * s * k, y: a.y + u.y * s * k });
    // Paredes que tocan cada punta: la izquierda es el principio de la pared y la derecha el final.
    const vecinas = { izq: i > 0 ? nombres[i - 1] : plano.cerrada ? nombres[m - 1] : null,
      der: i < m - 1 ? nombres[i + 1] : plano.cerrada ? nombres[0] : null };
    (pared.elementos || []).forEach(e => {
      const extra = extraPilar(d, pared, e);
      const base = { tipo: e.tipo, etiqueta: etiqueta(e), corta: corta(e), cota: cotaDe(e, unidad, vecinas, extra > 0), pared: letra, dentro };
      if (k === null || !hay(e.distancia)) { geo.sinSituar.push(base); return; }
      const c = camposDeElemento(e.tipo), ancho = c.ancho && hay(e.ancho) ? e.ancho : 0, dist = e.distancia + extra;
      const s = e.ref === 'der' ? (c.punto === 'centro' || !ancho ? L - dist : L - dist - ancho) : dist;
      if (!ancho) {
        const w = ANCHO_APROX[e.tipo], r = Object.assign(base, { punto: en(s) });
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
      let s = 0;
      for (const mo of pared.bajos || []) {
        if (!hay(mo.ancho)) break;
        const pa = en(s), pb = en(s + mo.ancho), f = FONDO_MODULO * k;
        geo.modulos.push({ tipo: mo.tipo, nombre: nombreModulo(mo), ancho: mo.ancho, columna: esColumna(mo), pared: letra, dentro,
          rect: [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }] });
        s += mo.ancho;
      }
      // Cuerpos del vestidor, igual que los bajos.
      s = 0;
      for (const [i, cu] of (pared.cuerpos || []).entries()) {
        if (!hay(cu.ancho)) break;
        const pa = en(s), pb = en(s + cu.ancho), f = FONDO_MODULO * k;
        geo.modulos.push({ tipo: 'cuerpo', nombre: 'Cuerpo ' + (i + 1), ancho: cu.ancho, columna: false, pared: letra, dentro,
          rect: [pa, pb, { x: pb.x + dentro.x * f, y: pb.y + dentro.y * f }, { x: pa.x + dentro.x * f, y: pa.y + dentro.y * f }] });
        s += cu.ancho;
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
    // El editor se abre con los largos de la ficha: si vuelve uno vacío es que se borró.
    if (previa) return Object.assign({}, previa, plano.largos ? { largo: hay(largo) ? largo : null } : {});
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
  geo.modulos.forEach(m => {
    svg.append(el('polygon', { points: m.rect.map(p => p.x + ',' + p.y).join(' '), fill: m.columna ? '#e7d8c9' : '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.5, 'data-modulo': m.tipo }));
    const c = { x: (m.rect[0].x + m.rect[2].x) / 2, y: (m.rect[0].y + m.rect[2].y) / 2 };
    const t = m.nombre + ' ' + verMedida(m.ancho, 'cm');
    texto(c.x, c.y, t, { 'font-size': s * 2.8, fill: '#78350f' }); puestos.push(cajaTexto(c.x, c.y, t, 2.8));
  });
  // Nombres sin pisarse: si uno cae encima de otro ya puesto, se aleja de la pared con una rayita hasta su sitio.
  const nombre = (c, d, t, col, tipo, { tam = 4, desde = 6 } = {}) => {
    let paso = 0, caja;
    do { caja = cajaTexto(c.x + d.x * s * (desde + paso * tam * 1.4), c.y + d.y * s * (desde + paso * tam * 1.4), t, tam); paso++; }
    while (paso < 15 && puestos.some(q => pisa(caja, q)));
    puestos.push(caja);
    if (paso > 1) svg.append(el('line', { x1: c.x + d.x * s * 2, y1: c.y + d.y * s * 2, x2: caja.cx - d.x * s * 2, y2: caja.cy - d.y * s * 2, stroke: col, 'stroke-width': s * 0.3, opacity: 0.7 }));
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
    nombre(c, d, e.corta + (e.cota ? ' ' + e.cota : ''), col, e.tipo);
  });
  nombres.forEach(f => f());
  // Marco: el dibujo y todos los textos, con un poco de aire.
  const X0 = Math.min(x0, ...puestos.map(q => q.x)) - pad / 2, Y0 = Math.min(y0, ...puestos.map(q => q.y)) - pad / 2;
  const X1 = Math.max(x0 + w, ...puestos.map(q => q.x + q.w)) + pad / 2, Y1 = Math.max(y0 + h, ...puestos.map(q => q.y + q.h)) + pad / 2;
  svg.setAttribute('viewBox', `${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}`);
  return svg;
}

// Alzados: cada pared vista de frente (en 2D), con la altura de la habitación, los muebles a su altura,
// ventanas, puertas, pilares, azulejo y las tomas en su punto, con la altura al lado.
// Las alturas de los muebles son orientativas (las de una cocina normal); lo medido manda.
import { camposDeElemento, extraPilar, pilarDeVecina } from './modelo.js';
import { situarMuebles, situarCuerpos, esColumna, nombreModulo, medidasModulo, interioresDe, textoInteriores, piezasInterior } from './modulos.js';
import { verMedida } from './unidades.js';
import { corta } from './plano-vista.js';

const hay = v => v !== null && v !== undefined;
// Alturas orientativas (mm desde el suelo).
export const ALTURAS = { techo: 2500, zocalo: 100, encimera: 850, grueso_encimera: 30, altos_desde: 1450, altos_hasta: 2150, columna: 2150, frigo: 1850 };
const PUNTOS = ['humos', 'desague', 'toma', 'agua', 'gas', 'enchufe', 'otro'];

export function geometriaAlzado(d, pared, ajustes = null) {
  const L = pared.largo;
  if (!hay(L) || L <= 0) return null;
  const techo = hay(d.alto_techo) && d.alto_techo > 0 ? d.alto_techo : ALTURAS.techo;
  const arriba = Math.min(ALTURAS.altos_hasta, techo), col = Math.min(ALTURAS.columna, techo);
  const g = { letra: pared.letra, largo: L, techo, techoMedido: hay(d.alto_techo), piezas: [], puntos: [] };
  const pieza = (clase, x, y, w, h, texto, tipo) => { if (w > 0 && h > 0) g.piezas.push({ clase, tipo: tipo || clase, x, y, w, h, texto: texto || '' }); };

  // Azulejo de la pared: toda o en franja (las zonas van con los elementos).
  if (pared.azulejo === 'toda') pieza('azulejo', 0, 0, L, techo);
  if (pared.azulejo === 'franja' && (hay(pared.azulejo_desde) || pared.azulejo_techo || hay(pared.azulejo_hasta))) {
    const y0 = pared.azulejo_desde || 0, y1 = pared.azulejo_techo ? techo : hay(pared.azulejo_hasta) ? pared.azulejo_hasta : techo;
    pieza('azulejo', 0, y0, L, y1 - y0);
  }

  // Muebles: bajos con zócalo y encimera; columnas hasta arriba (la de frigo, hasta su alto si lo lleva); altos.
  const sit = situarMuebles(pared, d), frigosConAlto = new Set(sit.altos.filter(a => a.m.tipo === 'alto_frigo').map(a => a.desde));
  const bajo = (x, w, texto, tipo) => {
    pieza('zocalo', x, 0, w, ALTURAS.zocalo);
    pieza('bajo', x, ALTURAS.zocalo, w, ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, texto, tipo);
    pieza('encimera', x, ALTURAS.encimera - ALTURAS.grueso_encimera, w, ALTURAS.grueso_encimera);
  };
  if (sit.entran.izq) bajo(0, sit.entran.izq, '', 'rinconero');
  if (sit.entran.der) bajo(L - sit.entran.der, sit.entran.der, '', 'rinconero');
  sit.bajos.forEach(({ m, desde, hasta }) => {
    const texto = (m.tipo === 'rinconero' ? 'Rinc.' : nombreModulo(m)) + ' ' + medidasModulo(m);
    if (m.tipo === 'hueco') return pieza('hueco', desde, 0, hasta - desde, ALTURAS.encimera, texto);
    if (esColumna(m)) return pieza('columna', desde, 0, hasta - desde, m.tipo === 'columna_frigo' && frigosConAlto.has(desde) ? ALTURAS.frigo : col, texto, m.tipo);
    bajo(desde, hasta - desde, texto, m.tipo);
  });
  sit.altos.forEach(({ m, desde, hasta }) => {
    if (m.tipo === 'hueco') return;
    const y0 = m.tipo === 'alto_frigo' ? ALTURAS.frigo : ALTURAS.altos_desde;
    pieza('alto', desde, y0, hasta - desde, arriba - y0, nombreModulo(m) + ' ' + medidasModulo(m), m.tipo);
  });

  // Cuerpos del vestidor, de izquierda a derecha, con su interior dibujado (barras, estantes, cajones…);
  // en las puntas, lo que entra del cuerpo de rincón de la pared de al lado (con su interior, sin rótulo).
  const cuerpo = (cu, xc, w, texto) => {
    pieza('cuerpo', xc, 0, w, col, texto);
    piezasInterior(cu, col).forEach(q => {
      if (q.tipo === 'barra') pieza('int_barra', xc + 40, q.z - 12, w - 80, 24);
      if (q.tipo === 'estante') pieza('int_estante', xc + 15, q.z - 9, w - 30, 18);
      if (q.tipo === 'zapato') pieza('int_zapato', xc + 25, q.z - 8, w - 50, 16);
      if (q.tipo === 'cajon') pieza('int_cajon', xc + 30, q.z0, w - 60, q.z1 - q.z0);
      if (q.tipo === 'pantalonero') { const wp = Math.min(q.ancho || w - 80, w - 40); pieza('int_pantalonero', xc + (w - wp) / 2, q.z0, wp, q.z1 - q.z0); }
    });
  };
  const sc = situarCuerpos(pared, d);
  if (sc.entran.izq) cuerpo(sc.entran.cIzq, 0, sc.entran.izq, '');
  if (sc.entran.der) cuerpo(sc.entran.cDer, L - sc.entran.der, sc.entran.der, '');
  sc.cuerpos.forEach(({ c: cu, desde, hasta }) => {
    const ti = textoInteriores(cu, ajustes), n = (pared.cuerpos || []).indexOf(cu) + 1;
    cuerpo(cu, desde, hasta - desde, 'C' + n + (cu.rincon ? ' rincón' : '') + (ti ? ' ' + ti : ''));
  });

  // Elementos de la pared, en su sitio (con el pilar si se midió desde él).
  (pared.elementos || []).forEach(e => {
    if (!hay(e.distancia)) return;
    const c = camposDeElemento(e.tipo), dist = e.distancia + extraPilar(d, pared, e), ancho = c.ancho && hay(e.ancho) ? e.ancho : 0;
    const x = e.ref === 'der' ? L - dist - (c.punto === 'centro' ? 0 : ancho) : dist;
    if (e.tipo === 'pilar') return pieza('pilar', x, 0, ancho, techo, 'Pilar');
    if (e.tipo === 'puerta') return pieza('puerta', x, e.altura || 0, ancho, hay(e.alto) ? e.alto : 2030, 'Puerta');
    if (e.tipo === 'ventana') {
      const y0 = hay(e.altura) ? e.altura : 1000;
      return pieza('ventana', x, y0, ancho, hay(e.alto) ? e.alto : Math.min(1000, techo - y0), 'Ventana');
    }
    if (e.tipo === 'zona') {
      const y0 = e.altura || 0, h = e.techo ? techo - y0 : hay(e.alto) ? e.alto : 0;
      return pieza('azulejo', x, y0, ancho, h, e.nombre ? 'Az. ' + e.nombre : '');
    }
    if (e.tipo === 'humos' && e.humos_sale === 'techo') return g.puntos.push({ tipo: e.tipo, x, y: techo, texto: corta(e), techo: true });
    if (PUNTOS.includes(e.tipo)) g.puntos.push({ tipo: e.tipo, x, y: hay(e.altura) ? e.altura : null, texto: corta(e) });
  });
  // Pilar de la pared de al lado en esta esquina: también se ve aquí, con lo que sobresale allí.
  ['izq', 'der'].forEach(lado => {
    const v = pilarDeVecina(d, pared, lado);
    if (v) pieza('pilar', lado === 'izq' ? 0 : L - v.fondo, 0, v.fondo, techo, 'Pilar ' + v.de, 'pilar_vecino');
  });
  return g;
}

// Dibujo SVG del alzado. Solo en el navegador.
export function svgAlzado(g, { unidad = 'cm' } = {}) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const s = Math.max(g.largo, g.techo) / 120, pad = s * 12, Y = y => g.techo - y;
  const svg = el('svg', { class: 'alzado', role: 'img', 'aria-label': 'Alzado de la pared ' + g.letra, 'data-acc': 'alzado', viewBox: `${-pad * 1.4} ${-pad} ${g.largo + pad * 2.4} ${g.techo + pad * 2.2}` });
  const texto = (x, y, t, o) => svg.append(el('text', Object.assign({ x, y, 'font-size': s * 3.4, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': s * 0.8 }, o), t));
  const caja = (p, o) => svg.append(el('rect', Object.assign({ x: p.x, y: Y(p.y + p.h), width: p.w, height: p.h, 'data-pieza': p.clase }, o)));
  // La pared.
  svg.append(el('rect', { x: 0, y: 0, width: g.largo, height: g.techo, fill: '#fff', stroke: '#1f2937', 'stroke-width': s * 0.8 }));
  const ESTILO = {
    azulejo: { fill: '#99f6e4', 'fill-opacity': 0.35, stroke: '#0f766e', 'stroke-width': s * 0.25, 'stroke-dasharray': s + ' ' + s * 0.6 },
    pilar: { fill: '#d1d5db', stroke: '#6b7280', 'stroke-width': s * 0.4 },
    zocalo: { fill: '#e7d8c9', stroke: '#92400e', 'stroke-width': s * 0.3 },
    bajo: { fill: '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.4 },
    encimera: { fill: '#57534e', stroke: 'none' },
    columna: { fill: '#e7d8c9', stroke: '#92400e', 'stroke-width': s * 0.4 },
    cuerpo: { fill: '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.4 },
    int_barra: { fill: '#57534e', stroke: 'none' },
    int_estante: { fill: '#c08a4a', stroke: 'none' },
    int_zapato: { fill: '#a8a29e', stroke: 'none' },
    int_cajon: { fill: '#fde68a', stroke: '#92400e', 'stroke-width': s * 0.3 },
    int_pantalonero: { fill: '#fef3c7', stroke: '#78350f', 'stroke-width': s * 0.25, 'stroke-dasharray': s * 0.8 + ' ' + s * 0.5 },
    hueco: { fill: 'none', stroke: '#a8a29e', 'stroke-width': s * 0.3, 'stroke-dasharray': s + ' ' + s },
    alto: { fill: '#bfdbfe', stroke: '#1d4ed8', 'stroke-width': s * 0.4 },
    ventana: { fill: '#e0f2fe', stroke: '#0284c7', 'stroke-width': s * 0.5 },
    puerta: { fill: '#fef3c7', stroke: '#92400e', 'stroke-width': s * 0.5 },
  };
  const orden = ['azulejo', 'pilar', 'ventana', 'puerta', 'zocalo', 'bajo', 'encimera', 'columna', 'cuerpo', 'int_estante', 'int_zapato', 'int_cajon', 'int_pantalonero', 'int_barra', 'hueco', 'alto'];
  const rotulos = [];
  orden.forEach(clase => g.piezas.filter(p => p.clase === clase).forEach(p => {
    caja(p, ESTILO[clase]);
    if (clase === 'ventana') svg.append(el('path', { d: `M${p.x} ${Y(p.y)} L${p.x + p.w} ${Y(p.y + p.h)} M${p.x} ${Y(p.y + p.h)} L${p.x + p.w} ${Y(p.y)}`, stroke: '#7dd3fc', 'stroke-width': s * 0.25, fill: 'none' }));
    if (p.texto) rotulos.push([p, clase]);
  }));
  // Rótulos de muebles y huecos, girados si la pieza es estrecha y alta.
  rotulos.forEach(([p, clase]) => {
    const cx = p.x + p.w / 2, cy = Y(p.y + p.h / 2), girar = p.w < p.h * 0.6 && p.w < String(p.texto).length * s * 2.1;
    const color = clase === 'alto' ? '#1e3a8a' : clase === 'ventana' ? '#075985' : clase === 'azulejo' ? '#0f766e' : '#78350f';
    texto(cx, cy, p.texto, Object.assign({ fill: color }, girar ? { transform: `rotate(-90 ${cx} ${cy})` } : {}));
  });
  // Tomas, enchufes, desagües y humos: un punto en su altura, con lo que es y la altura.
  const COLOR = { humos: '#7c3aed', desague: '#0891b2', toma: '#2563eb', agua: '#2563eb', gas: '#ea580c', enchufe: '#dc2626', otro: '#111827' };
  // Si un rótulo pisa a otro, sube un escalón y una rayita lo une a su punto.
  const puestos = [], pisa = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  g.puntos.forEach(q => {
    const col = COLOR[q.tipo] || '#111827', y = q.y === null ? 0 : q.y, py = Y(y);
    svg.append(el('circle', { cx: q.x, cy: py, r: s * 1.5, fill: q.y === null ? '#fff' : col, stroke: col, 'stroke-width': s * 0.5, 'data-punto': q.tipo }));
    const t = q.techo ? q.texto : q.texto + ' ' + (q.y === null ? '(sin altura)' : verMedida(q.y, unidad)), tam = 3, w = t.length * s * tam * 0.58, hh = s * tam * 1.3;
    let paso = 0, caja;
    do { caja = { x: q.x - w / 2, y: (q.techo ? py + s * 2.5 : py - s * 4 - hh / 2) + (q.techo ? 1 : -1) * paso * hh, w, h: hh }; paso++; } while (paso < 12 && puestos.some(b => pisa(caja, b)));
    puestos.push(caja);
    if (paso > 1) svg.append(el('line', { x1: q.x, y1: py - s * 1.5, x2: q.x, y2: caja.y + hh, stroke: col, 'stroke-width': s * 0.3, opacity: 0.7 }));
    texto(q.x, caja.y + hh / 2, t, { fill: col, 'font-size': s * tam, 'data-rotulo-punto': q.tipo });
  });
  // Cotas generales: largo abajo y altura del techo a la izquierda.
  texto(g.largo / 2, g.techo + pad * 0.6, g.letra + ' · ' + verMedida(g.largo, 'm') + ' m', { 'font-weight': 700, 'font-size': s * 4 });
  const tTecho = (g.techoMedido ? '' : '≈ ') + verMedida(g.techo, 'm') + ' m';
  texto(-pad * 0.7, g.techo / 2, tTecho, { 'font-size': s * 3.6, transform: `rotate(-90 ${-pad * 0.7} ${g.techo / 2})`, fill: g.techoMedido ? '#111827' : '#b45309' });
  return svg;
}

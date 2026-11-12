// Perspectiva: la habitación como se ve de pie (ojos a 175 cm), desde un punto de la planta y mirando hacia un lado.
// Dibujo sencillo de cajas de colores (como los alzados), hecho a mano: funciona sin conexión y sale en el PDF.
// Todo va en mm: x e y como en la planta (y hacia abajo), z hacia arriba desde el suelo.
import { geometriaPlanta } from './plano-vista.js';
import { ALTURAS } from './alzado.js';
import { piezasInterior, textoInteriores } from './modulos.js';

export const OJOS = 1750;
const FOV = 90 * Math.PI / 180, CERCA = 60;
export const INCLINACION = -20;
const hay = v => v !== null && v !== undefined;
const COLOR = {
  suelo: ['#ece6da', '#d6cfc0'], pared: ['#faf8f3', '#6b7280'], azulejo: ['#ccfbf1', '#5eead4'], ventana: ['#bae6fd', '#0369a1'], puerta: ['#e5e7eb', '#374151'],
  bajo: ['#f5ede4', '#92400e'], cuerpo: ['#f5ede4', '#92400e'], barra: ['#57534e', '#44403c'], estante: ['#c08a4a', '#92400e'], zapato: ['#a8a29e', '#78716c'],
  cajon: ['#fde68a', '#92400e'], pantalonero: ['#fef3c7', '#78350f'], encimera: ['#9ca3af', '#4b5563'], columna: ['#e7d8c9', '#92400e'], alto: ['#dbeafe', '#1d4ed8'], pilar: ['#d1d5db', '#6b7280'], isla: ['#fef3c7', '#b45309'],
};

// mm por unidad de la planta: 1 si está a escala; si no, lo que dicen los largos (la mediana).
function escalaDe(geo) {
  const r = geo.paredes.filter(p => hay(p.largo) && p.largo > 0).map(p => p.largo / (Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) || 1)).sort((a, b) => a - b);
  return r.length ? r[Math.floor(r.length / 2)] : null;
}

// La escena: caras en 3D agrupadas (cada caja, un grupo) y lo que hace falta para situar la vista.
export function escenaPerspectiva(d, { margen = 10, ajustes = null } = {}) {
  const geo = geometriaPlanta(d, { margen, unidad: 'cm' });
  if (!geo.paredes.length) return null;
  const k = escalaDe(geo);
  if (!k) return null;
  const techo = hay(d.alto_techo) && d.alto_techo > 0 ? d.alto_techo : ALTURAS.techo;
  const P = p => ({ x: p.x * k, y: p.y * k });
  const fondo = [], paredes = [], sobre = [], cajas = [], rotulos = [];
  const cara = (pts, color, n, extra) => Object.assign({ pts, fill: COLOR[color][0], stroke: COLOR[color][1], n }, extra || {});

  // Suelo.
  const contorno = geo.paredes.map(p => P(p.a)).concat([P(geo.paredes[geo.paredes.length - 1].b)]);
  fondo.push(cara(contorno.map(p => [p.x, p.y, 0]), 'suelo', [0, 0, 1]));

  const ejes = geo.paredes.map(p => {
    const a = P(p.a), b = P(p.b), lon = Math.hypot(b.x - a.x, b.y - a.y) || 1, u = { x: (b.x - a.x) / lon, y: (b.y - a.y) / lon };
    return { letra: p.letra, a, b, u, dentro: { x: -u.y, y: u.x }, lon };
  });
  // Un trozo pegado a la pared (azulejo, ventana, puerta), un pelín hacia dentro para que se vea encima.
  const sobrePared = (e, a, b, z0, z1, color, sep) => {
    const o = { x: e.dentro.x * sep, y: e.dentro.y * sep };
    sobre.push(cara([[a.x + o.x, a.y + o.y, z0], [b.x + o.x, b.y + o.y, z0], [b.x + o.x, b.y + o.y, z1], [a.x + o.x, a.y + o.y, z1]], color, [e.dentro.x, e.dentro.y, 0], { pared: e.letra }));
  };
  ejes.forEach(e => {
    paredes.push(cara([[e.a.x, e.a.y, 0], [e.b.x, e.b.y, 0], [e.b.x, e.b.y, techo], [e.a.x, e.a.y, techo]], 'pared', [e.dentro.x, e.dentro.y, 0], { pared: e.letra }));
    rotulos.push({ p: [(e.a.x + e.b.x) / 2 + e.dentro.x * 10, (e.a.y + e.b.y) / 2 + e.dentro.y * 10, Math.min(techo - 180, 1950)], texto: e.letra, n: [e.dentro.x, e.dentro.y, 0], clase: 'pared' });
    const pared = (d.paredes || []).find(x => x.letra === e.letra);
    if (pared && pared.azulejo === 'toda') sobrePared(e, e.a, e.b, 0, techo, 'azulejo', 3);
    if (pared && pared.azulejo === 'franja' && (hay(pared.azulejo_desde) || pared.azulejo_techo || hay(pared.azulejo_hasta))) {
      const z0 = pared.azulejo_desde || 0, z1 = pared.azulejo_techo ? techo : hay(pared.azulejo_hasta) ? pared.azulejo_hasta : techo;
      if (z1 > z0) sobrePared(e, e.a, e.b, z0, z1, 'azulejo', 3);
    }
  });
  const eje = letra => ejes.find(e => e.letra === letra);

  // Caja: tapa, fondo y los cuatro lados, con su normal hacia fuera.
  // detalles: trozos en la cara de delante (t0-t1 a lo ancho, de 0 a 1; z0-z1 de alto), p. ej. el interior de un armario.
  const caja = (r, z0, z1, color, texto, tapa, detalles = []) => {
    const c = { x: r.reduce((s, p) => s + p.x, 0) / 4, y: r.reduce((s, p) => s + p.y, 0) / 4 }, caras = [];
    for (let i = 0; i < 4; i++) {
      const p = r[i], q = r[(i + 1) % 4], m = { x: (p.x + q.x) / 2 - c.x, y: (p.y + q.y) / 2 - c.y }, l = Math.hypot(m.x, m.y) || 1;
      caras.push(cara([[p.x, p.y, z0], [q.x, q.y, z0], [q.x, q.y, z1], [p.x, p.y, z1]], color, [m.x / l, m.y / l, 0]));
    }
    caras.push(cara(r.map(p => [p.x, p.y, z1]), tapa || color, [0, 0, 1]), cara(r.map(p => [p.x, p.y, z0]), color, [0, 0, -1]));
    // El rótulo, en la cara de delante (la que no toca la pared: de r[2] a r[3]).
    const fr = { x: (r[2].x + r[3].x) / 2, y: (r[2].y + r[3].y) / 2 }, nf = { x: fr.x - c.x, y: fr.y - c.y }, ln = Math.hypot(nf.x, nf.y) || 1;
    const nx = nf.x / ln * 4, ny = nf.y / ln * 4, en = t => ({ x: r[3].x + (r[2].x - r[3].x) * t + nx, y: r[3].y + (r[2].y - r[3].y) * t + ny });
    detalles.forEach(q => { const a = en(q.t0), b = en(q.t1);
      caras.push(cara([[a.x, a.y, q.z0], [b.x, b.y, q.z0], [b.x, b.y, q.z1], [a.x, a.y, q.z1]], q.color, [nf.x / ln, nf.y / ln, 0])); });
    cajas.push({ caras, huella: r, z0, z1, color, centro: [c.x, c.y, (z0 + z1) / 2], texto: texto ? { p: [fr.x + nf.x / ln * 5, fr.y + nf.y / ln * 5, (z0 + z1) / 2], texto, n: [nf.x / ln, nf.y / ln, 0] } : null });
  };
  // Mueble cajeado: si se mete en un pilar, se quita ese trozo y queda en piezas alrededor (cada una, una caja).
  const pilares = geo.elementos.filter(el => el.tipo === 'pilar' && el.rect).map(el => el.rect.map(P));
  const mueble = (r, z0, z1, color, texto, tapa, detalles = []) => {
    const L = Math.hypot(r[1].x - r[0].x, r[1].y - r[0].y) || 1, D = Math.hypot(r[3].x - r[0].x, r[3].y - r[0].y) || 1;
    const u = { x: (r[1].x - r[0].x) / L, y: (r[1].y - r[0].y) / L }, v = { x: (r[3].x - r[0].x) / D, y: (r[3].y - r[0].y) / D };
    let piezas = [{ s0: 0, s1: L, t0: 0, t1: D }];
    pilares.filter(pi => !separadas(r, pi)).forEach(pi => {
      const s = pi.map(q => (q.x - r[0].x) * u.x + (q.y - r[0].y) * u.y), t = pi.map(q => (q.x - r[0].x) * v.x + (q.y - r[0].y) * v.y);
      const h = { s0: Math.min(...s), s1: Math.max(...s), t0: Math.min(...t), t1: Math.max(...t) };
      piezas = piezas.flatMap(p => {
        if (h.s1 <= p.s0 || h.s0 >= p.s1 || h.t1 <= p.t0 || h.t0 >= p.t1) return [p];
        const a = Math.max(p.s0, h.s0), b = Math.min(p.s1, h.s1);
        return [{ s0: p.s0, s1: a, t0: p.t0, t1: p.t1 }, { s0: b, s1: p.s1, t0: p.t0, t1: p.t1 },
          { s0: a, s1: b, t0: p.t0, t1: Math.max(p.t0, h.t0) }, { s0: a, s1: b, t0: Math.min(p.t1, h.t1), t1: p.t1 }];
      }).filter(p => p.s1 - p.s0 > 5 && p.t1 - p.t0 > 5);
    });
    if (piezas.length === 1 && piezas[0].s1 - piezas[0].s0 === L && piezas[0].t1 - piezas[0].t0 === D) return caja(r, z0, z1, color, texto, tapa, detalles);
    const en = (s, t) => ({ x: r[0].x + u.x * s + v.x * t, y: r[0].y + u.y * s + v.y * t });
    // El rótulo, en la pieza más ancha de las de delante; el interior, repartido por las de delante.
    const delante = piezas.filter(p => p.t1 > D - 1), mayor = delante.slice().sort((a, b) => (b.s1 - b.s0) - (a.s1 - a.s0))[0];
    piezas.forEach(p => {
      const w = p.s1 - p.s0, det = p.t1 > D - 1 ? detalles.map(q => Object.assign({}, q, { t0: Math.max(0, (q.t0 * L - p.s0) / w), t1: Math.min(1, (q.t1 * L - p.s0) / w) })).filter(q => q.t1 > q.t0) : [];
      caja([en(p.s0, p.t0), en(p.s1, p.t0), en(p.s1, p.t1), en(p.s0, p.t1)], z0, z1, color, p === mayor ? texto : '', tapa, det);
    });
  };

  const encimera = ALTURAS.encimera, grueso = ALTURAS.grueso_encimera, arriba = Math.min(ALTURAS.altos_hasta, techo), col = Math.min(ALTURAS.columna, techo);
  // Muebles en mm; donde dos se pisan (en las esquinas), el que llega de la otra pared se recorta.
  const mods = geo.modulos.filter(m => m.tipo !== 'hueco').map(m => Object.assign({}, m, { r: m.rect.map(P) }));
  recortarSolapes(mods.filter(m => !m.alto).sort((a, b) => !!a.sinTexto - !!b.sinTexto));
  recortarSolapes(mods.filter(m => m.alto).sort((a, b) => !!a.sinTexto - !!b.sinTexto));
  const bajoEncimera = encimera - grueso;
  mods.filter(m => m.r).forEach(m => {
    const t = m.sinTexto ? '' : [m.nombre, m.medidas].filter(Boolean).join(' ');
    if (m.alto) return mueble(m.r, m.tipo === 'alto_frigo' ? ALTURAS.frigo : ALTURAS.altos_desde, arriba, 'alto', t);
    // La columna del frigo con un alto encima llega hasta el frigo; el alto va encima.
    const conAlto = m.tipo === 'columna_frigo' && geo.modulos.some(a => a.alto && a.tipo === 'alto_frigo' && a.pared === m.pared && Math.hypot(a.rect[0].x - m.rect[0].x, a.rect[0].y - m.rect[0].y) < 1e-6 + 0.01 * Math.hypot(m.rect[1].x - m.rect[0].x, m.rect[1].y - m.rect[0].y));
    if (m.tipo === 'cuerpo') {
      // Cuerpo de vestidor: abierto, con su interior en la cara de delante.
      const ancho = Math.hypot(m.r[1].x - m.r[0].x, m.r[1].y - m.r[0].y) || 1, mm = v => Math.max(0, Math.min(1, v / ancho)), ti = textoInteriores(m.dato, ajustes);
      const det = piezasInterior(m.dato, col).map(q => q.tipo === 'barra' ? { t0: mm(40), t1: mm(ancho - 40), z0: q.z - 12, z1: q.z + 12, color: 'barra' }
        : q.tipo === 'estante' ? { t0: mm(15), t1: mm(ancho - 15), z0: q.z - 9, z1: q.z + 9, color: 'estante' }
        : q.tipo === 'zapato' ? { t0: mm(25), t1: mm(ancho - 25), z0: q.z - 8, z1: q.z + 8, color: 'zapato' }
        : q.tipo === 'pantalonero' ? (wp => ({ t0: mm((ancho - wp) / 2), t1: mm((ancho + wp) / 2), z0: q.z0, z1: q.z1, color: 'pantalonero' }))(Math.min(q.ancho || ancho - 80, ancho - 40))
        : { t0: mm(30), t1: mm(ancho - 30), z0: q.z0, z1: q.z1, color: 'cajon' });
      return mueble(m.r, 0, col, 'cuerpo', m.sinTexto ? '' : m.nombre.replace('Cuerpo ', 'C') + (m.rincon ? ' rincón' : '') + (ti ? ' ' + ti : ''), null, det);
    }
    if (m.columna) return mueble(m.r, 0, conAlto ? Math.min(ALTURAS.frigo, techo) : col, 'columna', t);
    mueble(m.r, 0, bajoEncimera, 'bajo', t);
  });
  // La encimera: una pieza seguida por cada tramo de bajos, con 2 cm de vuelo por delante; en la esquina, la de una pared llega hasta el canto de la otra.
  const tramos = [];
  geo.paredes.forEach(pa => {
    const bajos = mods.filter(m => m.r && !m.alto && !m.columna && m.tipo !== 'cuerpo' && m.pared === pa.letra);
    if (!bajos.length) return;
    const r0 = P(pa.a), q = { x: P(pa.b).x - r0.x, y: P(pa.b).y - r0.y }, ql = Math.hypot(q.x, q.y) || 1, u = { x: q.x / ql, y: q.y / ql };
    const pos = v => (v.x - r0.x) * u.x + (v.y - r0.y) * u.y;
    bajos.map(m => ({ m, s0: Math.min(pos(m.r[0]), pos(m.r[1])), s1: Math.max(pos(m.r[0]), pos(m.r[1])) })).sort((a, b) => a.s0 - b.s0).forEach(b => {
      const ult = tramos.length && tramos[tramos.length - 1];
      if (ult && ult.pared === pa.letra && b.s0 - ult.s1 < 5) { ult.s1 = Math.max(ult.s1, b.s1); return; }
      const dv = { x: b.m.r[3].x - b.m.r[0].x, y: b.m.r[3].y - b.m.r[0].y }, dl = Math.hypot(dv.x, dv.y) || 1, p0 = pos(b.m.r[0]);
      tramos.push({ pared: pa.letra, u, s0: b.s0, s1: b.s1, d: { x: dv.x / dl * (dl + 20), y: dv.y / dl * (dl + 20) }, base: { x: b.m.r[0].x - u.x * p0, y: b.m.r[0].y - u.y * p0 } });
    });
  });
  const losas = tramos.map(t => {
    const a = { x: t.base.x + t.u.x * t.s0, y: t.base.y + t.u.y * t.s0 }, b = { x: t.base.x + t.u.x * t.s1, y: t.base.y + t.u.y * t.s1 };
    return { r: [a, b, { x: b.x + t.d.x, y: b.y + t.d.y }, { x: a.x + t.d.x, y: a.y + t.d.y }] };
  });
  recortarSolapes(mods.filter(m => m.r && !m.alto && (m.columna || m.tipo === 'cuerpo')).map(m => ({ fijo: true, r: m.r })).concat(losas));
  losas.forEach(l => { if (l.r) mueble(l.r, bajoEncimera, encimera, 'encimera', '', 'encimera'); });
  (geo.islas || []).forEach(x => { const r = x.rect.map(P); caja(r, 0, bajoEncimera, 'isla', x.nombre); caja(r, bajoEncimera, encimera, 'encimera', '', 'encimera'); });
  geo.elementos.forEach(el => {
    if (el.tipo === 'pilar' && el.rect) return caja(el.rect.map(P), 0, techo, 'pilar', 'Pilar');
    const e = eje(el.pared), dt = el.dato || {};
    if (!e || !el.a || !el.b) return;
    if (el.tipo === 'ventana') {
      const z0 = hay(dt.altura) ? dt.altura : 1000, z1 = Math.min(techo, z0 + (hay(dt.alto) ? dt.alto : Math.min(1000, techo - z0)));
      sobrePared(e, P(el.a), P(el.b), z0, z1, 'ventana', 6);
    }
    if (el.tipo === 'puerta') sobrePared(e, P(el.a), P(el.b), dt.altura || 0, Math.min(techo, (dt.altura || 0) + (hay(dt.alto) ? dt.alto : 2030)), 'puerta', 6);
    if (el.tipo === 'zona') {
      const z0 = dt.altura || 0, z1 = dt.techo ? techo : hay(dt.alto) ? z0 + dt.alto : z0;
      if (z1 > z0) sobrePared(e, P(el.a), P(el.b), z0, z1, 'azulejo', 4);
    }
  });
  const xs = contorno.map(p => p.x), ys = contorno.map(p => p.y);
  return { fondo, paredes, sobre, cajas, rotulos, ejes, techo, k, geo, caja: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } };
}

// Dos huellas (rectángulos en planta) se pisan si no hay ningún lado de una que las separe.
function separadas(A, B, holgura = 1) {
  for (const R of [A, B]) for (let i = 0; i < R.length; i++) {
    const p = R[i], q = R[(i + 1) % R.length], n = { x: -(q.y - p.y), y: q.x - p.x }, l = Math.hypot(n.x, n.y) || 1;
    const pr = X => X.map(v => (v.x * n.x + v.y * n.y) / l), a = pr(A), b = pr(B);
    if (Math.max(...a) <= Math.min(...b) + holgura || Math.max(...b) <= Math.min(...a) + holgura) return { n: { x: n.x / l, y: n.y / l }, a, b };
  }
  return null;
}
// Recorta, a lo largo de su pared, lo que se mete en otro ya puesto (los primeros mandan; «fijo» nunca se recorta). Si no queda nada, r = null.
function recortarSolapes(lista) {
  const puestos = [];
  lista.forEach(m => {
    if (!m.r) return;
    if (!m.fijo) for (const o of puestos) {
      if (!m.r || separadas(m.r, o.r)) continue;
      const r = m.r, L = Math.hypot(r[1].x - r[0].x, r[1].y - r[0].y) || 1, u = { x: (r[1].x - r[0].x) / L, y: (r[1].y - r[0].y) / L };
      const s = o.r.map(q => (q.x - r[0].x) * u.x + (q.y - r[0].y) * u.y), smin = Math.min(...s), smax = Math.max(...s);
      let s0 = 0, s1 = L;
      if (smin <= 1) s0 = smax; else if (smax >= L - 1) s1 = smin; else continue;
      if (s1 - s0 < 10) { m.r = null; break; }
      const dv = { x: r[3].x - r[0].x, y: r[3].y - r[0].y }, a = { x: r[0].x + u.x * s0, y: r[0].y + u.y * s0 }, b = { x: r[0].x + u.x * s1, y: r[0].y + u.y * s1 };
      m.r = [a, b, { x: b.x + dv.x, y: b.y + dv.y }, { x: a.x + dv.x, y: a.y + dv.y }];
    }
    if (m.r) puestos.push(m);
  });
}

// Dónde ponerse si no se ha elegido: frente a la pared con más muebles (o la más larga), a lo hondo de la habitación, mirándola.
export function vistaPorDefecto(esc) {
  const cuenta = {};
  esc.geo.modulos.forEach(m => { if (!m.sinTexto) cuenta[m.pared] = (cuenta[m.pared] || 0) + 1; });
  const e = esc.ejes.slice().sort((p, q) => (cuenta[q.letra] || 0) - (cuenta[p.letra] || 0) || q.lon - p.lon)[0];
  const M = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
  let t = Infinity;
  esc.ejes.forEach(o => {
    if (o === e) return;
    const s = cortaRayo(M, e.dentro, o.a, o.b);
    if (s !== null && s > 1 && s < t) t = s;
  });
  if (!isFinite(t)) t = Math.max(3000, e.lon * 0.8);
  const dist = Math.max(t * 0.6, t - 150);
  return { x: M.x + e.dentro.x * dist, y: M.y + e.dentro.y * dist, ang: Math.atan2(-e.dentro.y, -e.dentro.x) * 180 / Math.PI };
}
function cortaRayo(o, d, a, b) {
  const ex = b.x - a.x, ey = b.y - a.y, den = d.x * ey - d.y * ex;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den, s = ((a.x - o.x) * d.y - (a.y - o.y) * d.x) / den;
  return t > 0 && s >= -0.001 && s <= 1.001 ? t : null;
}
// La vista guardada vale si cae dentro de la habitación (más o menos); si no, la de por defecto.
export function vistaDe(esc, guardada) {
  const c = esc.caja, v = guardada;
  if (v && hay(v.x) && hay(v.y) && hay(v.ang) && v.x >= c.x0 - 200 && v.x <= c.x1 + 200 && v.y >= c.y0 - 200 && v.y <= c.y1 + 200) return v;
  return vistaPorDefecto(esc);
}

// Proyección: polígonos en la pantalla (W×H), de lo de atrás a lo de delante.
export function proyectar(esc, vista, W = 1000, H = 640) {
  // Mirando un poco hacia abajo (como de pie delante de una cocina).
  const a = vista.ang * Math.PI / 180, b = (hay(vista.inc) ? vista.inc : INCLINACION) * Math.PI / 180;
  const f = [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)], r = [-Math.sin(a), Math.cos(a), 0];
  const up = [-Math.sin(b) * Math.cos(a), -Math.sin(b) * Math.sin(a), Math.cos(b)];
  const C = [vista.x, vista.y, OJOS], foco = (W / 2) / Math.tan(FOV / 2);
  const cam = p => { const d = [p[0] - C[0], p[1] - C[1], p[2] - C[2]], pr = v => d[0] * v[0] + d[1] * v[1] + d[2] * v[2]; return [pr(r), pr(up), pr(f)]; };
  const pant = q => [W / 2 + foco * q[0] / q[2], H / 2 - foco * q[1] / q[2]];
  const ve = c => { const m = c.pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map(v => v / c.pts.length);
    return c.n[0] * (C[0] - m[0]) + c.n[1] * (C[1] - m[1]) + c.n[2] * (C[2] - m[2]) > 0; };
  // Recorta por delante de los ojos (lo de detrás no se dibuja).
  const recortar = pts => {
    const fuera = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], pd = p[2] >= CERCA, qd = q[2] >= CERCA;
      if (pd) fuera.push(p);
      if (pd !== qd) { const t = (CERCA - p[2]) / (q[2] - p[2]); fuera.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, CERCA]); }
    }
    return fuera.length >= 3 ? fuera : null;
  };
  const dist = p => Math.hypot(p[0] - C[0], p[1] - C[1], p[2] - C[2]);
  const poli = c => { const q = recortar(c.pts.map(cam)); return q ? { pts: q.map(pant), fill: c.fill, stroke: c.stroke, pared: c.pared } : null; };
  const lejos = (x, y) => y.dist - x.dist;
  const salida = [];
  esc.fondo.forEach(c => { const p = poli(c); if (p) salida.push(p); });
  esc.paredes.filter(ve).map(c => ({ c, dist: dist(c.pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])) })).sort(lejos)
    .forEach(({ c }) => { const p = poli(c); if (p) salida.push(p); });
  esc.sobre.filter(ve).forEach(c => { const p = poli(c); if (p) salida.push(p); });
  const textos = [];
  const texto = (t, grande) => {
    if (!t || (t.n && t.n[0] * (C[0] - t.p[0]) + t.n[1] * (C[1] - t.p[1]) + t.n[2] * (C[2] - t.p[2]) <= 0)) return;
    const q = cam(t.p);
    if (q[2] < CERCA * 4) return;
    const [x, y] = pant(q), tam = Math.max(9, Math.min(grande ? 30 : 18, foco * (grande ? 160 : 70) / q[2]));
    if (x > -50 && x < W + 50 && y > -20 && y < H + 20) textos.push({ x, y, texto: t.texto, tam, clase: t.clase || 'mueble', z: q[2] });
  };
  ordenCajas(esc.cajas, C).forEach(b => {
    b.caras.filter(ve).forEach(c => { const p = poli(c); if (p) salida.push(p); });
  });
  esc.cajas.forEach(b => texto(b.texto, false));
  esc.rotulos.forEach(t => texto(t, true));
  // Si dos rótulos se pisan, se queda el de más cerca.
  const caja = t => { const w = String(t.texto).length * t.tam * 0.55, h = t.tam * 1.2; return { x0: t.x - w / 2, x1: t.x + w / 2, y0: t.y - h / 2, y1: t.y + h / 2 }; };
  const puestos = [], quedan = [];
  textos.slice().sort((a, b) => (a.clase === 'pared') - (b.clase === 'pared') || a.z - b.z).forEach(t => {
    const c = caja(t);
    if (t.clase !== 'pared' && puestos.some(o => c.x0 < o.x1 && o.x0 < c.x1 && c.y0 < o.y1 && o.y0 < c.y1)) return;
    puestos.push(c); quedan.push(t);
  });
  return { poligonos: salida, textos: quedan, W, H };
}

// Orden de dibujo de las cajas, de atrás a delante: si un plano separa dos cajas, la del lado de los ojos va después
// (por alturas: encima y debajo; en planta: un lado de una de las dos huellas). Si no, la más lejana primero.
export function ordenCajas(cajas, C) {
  const n = cajas.length, dist = b => Math.hypot(b.centro[0] - C[0], b.centro[1] - C[1], b.centro[2] - C[2]);
  const antes = Array.from({ length: n }, () => []), faltan = new Array(n).fill(0);
  const delante = (A, B) => { // 1: A tapa a B; -1: B tapa a A; 0: no se sabe
    if (A.z1 <= B.z0 + 1) return C[2] > A.z1 ? -1 : 1;
    if (B.z1 <= A.z0 + 1) return C[2] > B.z1 ? 1 : -1;
    const s = separadas(A.huella, B.huella, 0.5);
    if (!s) return A.color === 'pilar' ? -1 : B.color === 'pilar' ? 1 : 0; // un mueble metido en un pilar (cajeado) va por delante
    const c = C[0] * s.n.x + C[1] * s.n.y;
    return Math.max(...s.a) <= Math.min(...s.b) + 0.5 ? (c > Math.max(...s.a) ? -1 : 1) : (c < Math.min(...s.a) ? -1 : 1);
  };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = delante(cajas[i], cajas[j]);
    if (d === 1) { antes[j].push(i); faltan[i]++; } else if (d === -1) { antes[i].push(j); faltan[j]++; }
  }
  const d = cajas.map(dist), hecho = new Array(n).fill(false), orden = [];
  for (let k = 0; k < n; k++) {
    let mejor = -1;
    for (let i = 0; i < n; i++) if (!hecho[i] && !faltan[i] && (mejor < 0 || d[i] > d[mejor])) mejor = i;
    if (mejor < 0) for (let i = 0; i < n; i++) if (!hecho[i] && (mejor < 0 || d[i] > d[mejor])) mejor = i; // un círculo: la más lejana
    hecho[mejor] = true; orden.push(cajas[mejor]);
    antes[mejor].forEach(j => { faltan[j]--; });
  }
  return orden;
}

// SVG de la perspectiva. Solo en el navegador.
export function svgPerspectiva(esc, vista, { W = 1000, H = 640 } = {}) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const r = proyectar(esc, vista, W, H);
  const svg = el('svg', { class: 'perspectiva', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Perspectiva de la habitación', 'data-acc': 'perspectiva' });
  svg.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#f3efe6' }));
  r.poligonos.forEach(p => svg.append(el('polygon', { points: p.pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '), fill: p.fill, stroke: p.stroke, 'stroke-width': 1.2, 'stroke-linejoin': 'round' })));
  r.textos.forEach(t => svg.append(el('text', { x: t.x, y: t.y, 'font-size': t.tam, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': t.tam / 5,
    fill: t.clase === 'pared' ? '#111827' : '#78350f', 'font-weight': t.clase === 'pared' ? 700 : 400 }, t.texto)));
  return svg;
}

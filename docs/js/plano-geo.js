// Geometría del plano: de un trazo a mano alzada a paredes rectas, y comprobación de las medidas.
// Coordenadas de pantalla: x a la derecha, y hacia abajo.

const GRADO = Math.PI / 180;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

export const letras = n => Array.from({ length: n }, (_, i) => (i < 26 ? String.fromCharCode(65 + i) : 'P' + (i + 1)));

// Distancia de p a la recta a-b.
function aRecta(p, a, b) {
  const l = dist(a, b);
  if (!l) return dist(p, a);
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / l;
}

// Ramer-Douglas-Peucker sin recursión.
function simplificar(pts, eps) {
  const guardar = new Array(pts.length).fill(false);
  guardar[0] = guardar[pts.length - 1] = true;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let max = 0, k = -1;
    for (let m = i + 1; m < j; m++) { const d = aRecta(pts[m], pts[i], pts[j]); if (d > max) { max = d; k = m; } }
    if (k >= 0 && max > eps) { guardar[k] = true; pila.push([i, k], [k, j]); }
  }
  return pts.filter((_, i) => guardar[i]);
}

// Giro en un vértice (0 = sigue recto), en grados.
function giro(a, v, b) {
  const d = Math.atan2(b.y - v.y, b.x - v.x) - Math.atan2(v.y - a.y, v.x - a.x);
  return Math.abs(((d / GRADO) % 360 + 540) % 360 - 180);
}

// Quita vértices que sobran: tramos muy cortos y vértices casi en línea recta.
function limpiar(vs, cerrada, corto) {
  let cambio = true;
  while (cambio && vs.length > 2) {
    cambio = false;
    const n = vs.length;
    for (let i = 0; i < n; i++) {
      const primero = i === 0, ultimo = i === n - 1;
      if (!cerrada && (primero || ultimo)) continue;
      const a = vs[(i - 1 + n) % n], v = vs[i], b = vs[(i + 1) % n];
      if (giro(a, v, b) < 20 || dist(a, v) < corto) { vs.splice(i, 1); cambio = true; break; }
    }
    if (!cambio && !cerrada && vs.length > 2 && dist(vs[vs.length - 2], vs[vs.length - 1]) < corto) { vs.splice(vs.length - 2, 1); cambio = true; }
  }
  return vs;
}

function cortar(l1, l2) {
  const det = l1.d.x * l2.d.y - l1.d.y * l2.d.x;
  if (Math.abs(det) < 1e-9) return null;
  const t = ((l2.p.x - l1.p.x) * l2.d.y - (l2.p.y - l1.p.y) * l2.d.x) / det;
  return { x: l1.p.x + l1.d.x * t, y: l1.p.y + l1.d.y * t };
}
const proyectar = (p, l) => { const t = (p.x - l.p.x) * l.d.x + (p.y - l.p.y) * l.d.y; return { x: l.p.x + l.d.x * t, y: l.p.y + l.d.y * t }; };
const areaPantalla = vs => vs.reduce((s, v, i) => { const w = vs[(i + 1) % vs.length]; return s + v.x * w.y - w.x * v.y; }, 0) / 2;

// Ajusta a ángulos rectos los tramos que estén a menos de 15° de serlo, tomando como referencia el más largo.
function enderezarTramos(vs, cerrada) {
  const n = vs.length, tramos = [];
  for (let i = 0; i < (cerrada ? n : n - 1); i++) tramos.push([vs[i], vs[(i + 1) % n]]);
  const largo = tramos.reduce((m, t) => (dist(...t) > dist(...m) ? t : m), tramos[0]);
  let ref = Math.atan2(largo[1].y - largo[0].y, largo[1].x - largo[0].x);
  const alEje = Math.round(ref / (90 * GRADO)) * 90 * GRADO;
  if (Math.abs(ref - alEje) < 10 * GRADO) ref = alEje; // casi recto respecto a la pantalla: recto del todo
  let lineas = tramos.map(([a, b]) => {
    let ang = Math.atan2(b.y - a.y, b.x - a.x), recta = false;
    const k = Math.round((ang - ref) / (90 * GRADO));
    if (Math.abs(ang - ref - k * 90 * GRADO) < 15 * GRADO) { ang = ref + k * 90 * GRADO; recta = true; }
    return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: { x: Math.cos(ang), y: Math.sin(ang) }, a, b, recta, l: dist(a, b) };
  });
  // Un tramo corto en diagonal entre dos rectos es el temblor de una esquina, no una pared: se quita.
  const diag = Math.max(...lineas.map(l => l.l)) * 1.5;
  lineas = lineas.filter((l, i) => {
    const n = lineas.length, ant = lineas[(i - 1 + n) % n], sig = lineas[(i + 1) % n];
    const extremo = !cerrada && (i === 0 || i === n - 1);
    return extremo || l.recta || l.l > 0.12 * diag || (!ant.recta && !sig.recta);
  });
  // Dos tramos seguidos con la misma dirección son uno solo.
  const paralelas = (l1, l2) => Math.abs(l1.d.x * l2.d.y - l1.d.y * l2.d.x) < 1e-9;
  for (let i = 0; i < lineas.length && lineas.length > 1; i++) {
    const j = (i + 1) % lineas.length;
    if (!cerrada && j === 0) break;
    if (paralelas(lineas[i], lineas[j])) {
      const l = lineas[i], m = lineas[j];
      lineas[i] = { p: { x: (l.a.x + m.b.x) / 2, y: (l.a.y + m.b.y) / 2 }, d: l.d, a: l.a, b: m.b };
      lineas.splice(j, 1); i = -1;
    }
  }
  if (cerrada) return lineas.map((l, i) => cortar(lineas[(i - 1 + lineas.length) % lineas.length], l)).filter(Boolean);
  const r = [proyectar(lineas[0].a, lineas[0])];
  for (let i = 1; i < lineas.length; i++) { const c = cortar(lineas[i - 1], lineas[i]); if (c) r.push(c); }
  r.push(proyectar(lineas[lineas.length - 1].b, lineas[lineas.length - 1]));
  return r;
}

export function enderezar(puntos) {
  const pts = [];
  (puntos || []).forEach(p => { if (!pts.length || dist(pts[pts.length - 1], p) > 0.5) pts.push({ x: p.x, y: p.y }); });
  if (pts.length < 2) return null;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (diag < 1) return null;
  let cerrada = pts.length >= 8 && dist(pts[0], pts[pts.length - 1]) < 0.08 * diag;
  let vs = simplificar(pts, 0.03 * diag);
  if (cerrada) vs.pop();
  if (cerrada && vs.length < 3) cerrada = false;
  vs = limpiar(vs, cerrada, 0.04 * diag);
  if (vs.length < 2 || (cerrada && vs.length < 3)) return null;
  vs = enderezarTramos(vs, cerrada);
  if (vs.length < 2) return null;
  // Abierta: el interior queda a la derecha del recorrido, como en las cerradas (cerrándola con la cuerda).
  if (!cerrada && vs.length >= 3 && areaPantalla(vs) < 0) vs.reverse();
  if (cerrada) {
    if (areaPantalla(vs) < 0) vs.reverse();
    // Empieza en la esquina de arriba a la izquierda: la pared A es la de arriba, de izquierda a derecha.
    const tope = Math.min(...vs.map(v => v.y)), tol = 0.02 * diag;
    let ini = 0;
    vs.forEach((v, i) => { const w = vs[ini]; if (v.y <= tope + tol && (w.y > tope + tol || v.x < w.x)) ini = i; });
    vs = vs.slice(ini).concat(vs.slice(0, ini));
  }
  return { vertices: vs, cerrada };
}

// ── Comprobación de medidas ──
const MARGEN_FABRICA = 10;
const recta = a => Math.abs(a / 90 - Math.round(a / 90)) < 0.5 / 90;
const esquinaRecta = () => ({ estado: 'escuadra', sentido: null, mm: null, en: 1000 });

// Ángulo interior que tiene cada esquina en el dibujo (en sentido horario: 90 normal, 270 hacia dentro).
export function angulosNominales(plano) {
  const vs = plano.vertices, n = vs.length;
  return vs.map((v, i) => {
    if (!plano.cerrada && (i === 0 || i === n - 1)) return null;
    const a = vs[(i - 1 + n) % n], b = vs[(i + 1) % n];
    const giroG = ((Math.atan2(b.y - v.y, b.x - v.x) - Math.atan2(v.y - a.y, v.x - a.x)) / GRADO % 360 + 540) % 360 - 180;
    return 180 - giroG;
  });
}

// Ángulo real de una esquina: el del dibujo si está a escuadra, o corregido con su desviación.
export function anguloEsquina(e, nominal = 90) {
  if (nominal === null || nominal === undefined) return null;
  if (!e || e.estado !== 'descuadrada') return nominal;
  if (e.mm === null || e.mm === undefined || !e.en) return null;
  const d = Math.atan(e.mm / e.en) / GRADO;
  return e.sentido === 'cerrada' ? nominal - d : nominal + d;
}

// Tras arrastrar una esquina: vuelve a poner rectos los tramos que estén a menos de 15° de serlo.
export function reenderezar(vertices, cerrada) {
  return enderezarTramos(vertices.map(v => ({ x: v.x, y: v.y })), cerrada);
}

// Recorre las paredes con sus largos y ángulos. Devuelve los puntos en mm, la dirección de cada pared
// y la dirección final; o null si faltan largos; o {error, esquina} si un ángulo no se sabe.
function recorrer(plano) {
  const vs = plano.vertices, n = vs.length, m = plano.cerrada ? n : n - 1, nom = angulosNominales(plano);
  const largos = plano.largos || [];
  for (let i = 0; i < m; i++) if (largos[i] === null || largos[i] === undefined) return null;
  let h = Math.atan2(vs[1].y - vs[0].y, vs[1].x - vs[0].x), p = { x: 0, y: 0 };
  const pts = [p], dirs = [];
  for (let i = 0; i < m; i++) {
    dirs.push(h);
    p = { x: p.x + largos[i] * Math.cos(h), y: p.y + largos[i] * Math.sin(h) };
    pts.push(p);
    const k = (i + 1) % n;
    if (i + 1 < n || plano.cerrada) {
      if (!plano.cerrada && k === n - 1) continue;
      const nk = nom[k];
      if (nk === null) continue;
      const e = (plano.esquinas || [])[k] || esquinaRecta();
      if (e.estado !== 'descuadrada' && !recta(nk)) return { error: 'esquina_no_recta', esquina: k }; // dibujada sin escuadra
      const ang = anguloEsquina(e, recta(nk) ? Math.round(nk / 90) * 90 : nk);
      if (ang === null) return { error: 'esquina_sin_medir', esquina: k };
      h += (180 - ang) * GRADO;
    }
  }
  return { pts, dirs, hFin: h };
}

export function comprobar(plano, MARGEN = MARGEN_FABRICA) {
  const m = plano.cerrada ? plano.vertices.length : plano.vertices.length - 1;
  const faltan = [];
  for (let i = 0; i < m; i++) if (plano.largos[i] === null || plano.largos[i] === undefined) faltan.push(i);
  const base = { errorX: 0, errorY: 0, paredes: [], faltan, diagonales: (plano.diagonales || []).map(d => Object.assign({}, d, { calculada: null, ok: null })) };
  if (!plano.cerrada) return Object.assign(base, { cierre: 'abierta' });
  if (faltan.length) return Object.assign(base, { cierre: 'sin_datos' });
  const r = recorrer(plano);
  if (!r || r.error) return Object.assign(base, { cierre: 'no_comprobable', motivo: r ? r.error : null, esquina: r ? r.esquina : null });
  const h0 = r.dirs[0], fin = r.pts[m], c = Math.cos(-h0), s = Math.sin(-h0);
  const errorX = fin.x * c - fin.y * s, errorY = fin.x * s + fin.y * c;
  // También la dirección: tras dar la vuelta hay que acabar mirando como al empezar (la esquina del primer vértice).
  const dAng = ((r.hFin - h0 - 2 * Math.PI) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  const errorAngulo = Math.abs(dAng) * plano.largos[0];
  const malX = Math.abs(errorX) > MARGEN + 1e-6, malY = Math.abs(errorY) > MARGEN + 1e-6, malA = errorAngulo > MARGEN + 1e-6, paredes = [];
  r.dirs.forEach((h, i) => { const x = Math.abs(Math.cos(h - h0)) > 0.7; if ((x && malX) || (!x && malY) || (malA && (i === 0 || i === m - 1))) paredes.push(i); });
  const diagonales = (plano.diagonales || []).map(d => {
    const a = r.pts[d.de], b = r.pts[d.a], calculada = Math.hypot(b.x - a.x, b.y - a.y);
    return Object.assign({}, d, { calculada, ok: d.mm === null || d.mm === undefined ? null : Math.abs(d.mm - calculada) <= MARGEN });
  });
  return { cierre: malX || malY || malA ? 'falla' : 'ok', errorX, errorY, errorAngulo, paredes, faltan, diagonales };
}

// Vértices en mm para dibujar a escala, o null si no hay datos o no cierra.
export function aEscala(plano, margen = MARGEN_FABRICA) {
  if (plano.cerrada && comprobar(plano, margen).cierre !== 'ok') return null;
  const r = recorrer(plano);
  if (!r || r.error) return null;
  return plano.cerrada ? r.pts.slice(0, plano.vertices.length) : r.pts;
}

// Sin plano dibujado: las paredes van seguidas en ángulo recto (lineal, L, U o cerrada si son cuatro).
export function planoPorDefecto(paredes) {
  const n = paredes.length;
  if (!n) return null;
  const cerrada = n === 4, vs = [{ x: 0, y: 0 }];
  let h = 0;
  for (let i = 0; i < (cerrada ? n - 1 : n); i++) {
    const l = (paredes[i].largo || 1000) / 10, p = vs[vs.length - 1];
    vs.push({ x: p.x + l * Math.round(Math.cos(h)), y: p.y + l * Math.round(Math.sin(h)) });
    h += Math.PI / 2;
  }
  return { vertices: vs, cerrada, largos: paredes.map(p => p.largo ?? null), esquinas: vs.map(esquinaRecta), diagonales: [] };
}

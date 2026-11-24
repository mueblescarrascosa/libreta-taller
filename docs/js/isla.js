// Isla o península: con la planta a escala, se mide el suelo libre delante de la encimera y se propone una isla
// (paralela a una pared de cocina) o una península (pegada a una pared, al final de la cocina, hacia dentro), solo si
// queda paso alrededor: 90 cm como poco, mejor 100–120 (AMC, Leroy Merlin; NKBA 107). Delante de una puerta, nada.
// No cambia la ficha: devuelve las opciones ({ tipo, pared, ref, distancia, separacion, largo, fondo, vuelo, paso, texto }).
import { geometriaPlanta } from './plano-vista.js';
import { situarMuebles } from './modulos.js';
import { MEDIDAS } from './consejos.js';

const hay = v => v !== null && v !== undefined && v !== '';
export const ISLA = { fondo: 600, vuelo: 300, largo_max: 2400, largo_min: 1200, largo_bien: 1800, fondo_encimera: 650, puerta_libre: 1000 };
const cm = mm => Math.round(mm / 10) + ' cm';

// Rayo desde P en la dirección v: distancia (en unidades de la planta) a la primera pared que corta (sin contar «salvo»).
function rayo(P, v, paredes, salvo) {
  let t = Infinity;
  paredes.forEach(w => {
    if (w === salvo) return;
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, den = v.x * ey - v.y * ex;
    if (Math.abs(den) < 1e-9) return;
    const dx = w.a.x - P.x, dy = w.a.y - P.y, s = (dx * ey - dy * ex) / den, u = (dx * v.y - dy * v.x) / den;
    if (s > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) t = Math.min(t, s);
  });
  return t;
}
// ¿Se tocan dos cuadriláteros convexos? (ejes separadores)
function chocan(A, B) {
  const ejes = [A, B].flatMap(P => P.map((p, i) => { const q = P[(i + 1) % P.length]; return { x: -(q.y - p.y), y: q.x - p.x }; }));
  return ejes.every(e => {
    const pr = P => P.map(p => p.x * e.x + p.y * e.y), a = pr(A), b = pr(B);
    return Math.max(...a) > Math.min(...b) + 1e-6 && Math.max(...b) > Math.min(...a) + 1e-6;
  });
}
const mas = (p, v, f) => ({ x: p.x + v.x * f, y: p.y + v.y * f });

// ips: las paredes de la cocina (índices en d.paredes). Devuelve { opciones, aviso }.
export function propuestasIsla(d, ips) {
  let pl = null; try { pl = geometriaPlanta(d); } catch (e) { pl = null; }
  if (!pl || !pl.aEscala || !pl.paredes.length) return { opciones: [], aviso: 'Para proponer isla o península hace falta la planta a escala (todas las paredes con medida).' };
  const W = pl.paredes.filter(w => hay(w.largo) && w.largo > 0 && Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) > 0);
  if (!W.length) return { opciones: [], aviso: null };
  const k = Math.hypot(W[0].b.x - W[0].a.x, W[0].b.y - W[0].a.y) / W[0].largo;   // unidades de la planta por mm
  const paso = MEDIDAS.isla_paso, pasoBien = MEDIDAS.isla_paso_bien;
  // Delante de cada puerta, 1 m libre para entrar
  const puertas = pl.elementos.filter(e => e.tipo === 'puerta' && e.a && e.b).map(e => [e.a, e.b, mas(e.b, e.dentro, ISLA.puerta_libre * k), mas(e.a, e.dentro, ISLA.puerta_libre * k)]);
  // Lo que ocupan los bajos de cada pared (60 de fondo + encimera): rectángulos para medir el paso hasta ellos
  const ocupado = [];
  (d.paredes || []).forEach(p => {
    const w = pl.paredes.find(x => x.letra === p.letra); if (!w || !hay(p.largo)) return;
    const lon = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), u = { x: (w.b.x - w.a.x) / lon, y: (w.b.y - w.a.y) / lon }, dn = { x: -u.y, y: u.x };
    situarMuebles(p, d).bajos.filter(b => b.m.tipo !== 'hueco').forEach(b => {
      const a0 = mas(w.a, u, b.desde * k), a1 = mas(w.a, u, b.hasta * k);
      ocupado.push([a0, a1, mas(a1, dn, ISLA.fondo_encimera * k), mas(a0, dn, ISLA.fondo_encimera * k)]);
    });
  });
  const libreDe = R => !puertas.some(P => chocan(P, R)) && !ocupado.some(P => chocan(P, R));
  // El paso de alrededor puede ir por delante de una puerta (por ahí se pasa), pero no meterse en los muebles
  const sinMuebles = R => !ocupado.some(P => chocan(P, R));
  // El paso que queda alrededor de un rectángulo: lo hinchamos y miramos que no toque paredes, muebles ni puertas
  const rectDe = (o, u, dn, largo, hondo) => [o, mas(o, u, largo), mas(mas(o, u, largo), dn, hondo), mas(o, dn, hondo)];
  const hinchar = (R, u, dn, f) => [mas(mas(R[0], u, -f), dn, -f), mas(mas(R[1], u, f), dn, -f), mas(mas(R[2], u, f), dn, f), mas(mas(R[3], u, -f), dn, f)];
  const dentroSala = R => {
    // Ningún lado del rectángulo cruza una pared y su centro está dentro (los rayos chocan por los cuatro lados)
    const c = { x: R.reduce((s, p) => s + p.x, 0) / 4, y: R.reduce((s, p) => s + p.y, 0) / 4 };
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([x, y]) => !isFinite(rayo(c, { x, y }, pl.paredes)))) return false;
    // Y las cuatro esquinas dentro (un poco hacia el centro, para no caer justo en la pared)
    if (!R.every(p => puntoDentro({ x: p.x + (c.x - p.x) * 0.001, y: p.y + (c.y - p.y) * 0.001 }, pl.paredes))) return false;
    return !pl.paredes.some(w => R.some((p, i) => { const q = R[(i + 1) % 4]; return cruzan(p, q, w.a, w.b); }));
  };
  const opciones = [];
  ips.forEach(ip => {
    const p = d.paredes[ip], w = p && pl.paredes.find(x => x.letra === p.letra); if (!w || !hay(p.largo)) return;
    const lon = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), u = { x: (w.b.x - w.a.x) / lon, y: (w.b.y - w.a.y) / lon }, dn = { x: -u.y, y: u.x };
    const sit = situarMuebles(p, d), bajos = sit.bajos.filter(b => b.m.tipo !== 'hueco');
    const ini = bajos.length ? bajos[0].desde : 0, fin = bajos.length ? bajos[bajos.length - 1].hasta : p.largo;
    // ── Isla delante de la encimera de esta pared, con el paso que se pueda (mejor 110–120) ──
    for (const pz of [1200, pasoBien, 1000, paso]) {
      const sep = ISLA.fondo_encimera + pz, hondo = ISLA.fondo + ISLA.vuelo;
      // Lo más largo que quepa (de 120 a 240) centrado con la cocina de esta pared
      let hecho = false;
      for (let L = Math.min(ISLA.largo_max, Math.floor((fin - ini) / 50) * 50); L >= ISLA.largo_min && !hecho; L -= 100) {
        const s0 = Math.round(((ini + fin) / 2 - L / 2) / 10) * 10;
        const R = rectDe(mas(mas(w.a, u, s0 * k), dn, sep * k), u, dn, L * k, hondo * k);
        // Paso alrededor: por delante (el de la encimera) ya está; por detrás y los lados, al menos «paso»
        if (!dentroSala(hinchar(R, u, dn, paso * k)) || !libreDe(R) || !sinMuebles(hinchar(R, u, dn, (paso - 10) * k))) continue;
        opciones.push({ tipo: 'isla', pared: p.letra, ref: 'izq', distancia: s0, separacion: sep, largo: L, fondo: ISLA.fondo, vuelo: ISLA.vuelo, paso: pz,
          texto: 'Isla de ' + cm(L) + ' × ' + cm(hondo) + ' (60 de muebles y 30 de vuelo para sentarse) delante de la pared ' + p.letra + ', con ' + cm(pz) + ' de paso hasta la encimera' });
        hecho = true;
      }
      if (hecho) break;
    }
    // ── Península al final de la cocina de esta pared, hacia dentro (como una L), si queda pared libre a ese lado ──
    [['der', fin], ['izq', ini]].forEach(([lado, x]) => {
      const libre = lado === 'der' ? p.largo - x : x;
      if (libre < ISLA.fondo + ISLA.vuelo) return;
      const s0 = lado === 'der' ? x : x - ISLA.fondo - ISLA.vuelo;
      for (let L = ISLA.largo_bien; L >= ISLA.largo_min; L -= 100) {
        const R = rectDe(mas(w.a, u, s0 * k), u, dn, (ISLA.fondo + ISLA.vuelo) * k, L * k);
        // Por delante de la punta, paso; y el lado de la cocina da a la encimera (no hace falta más)
        const punta = rectDe(mas(mas(w.a, u, s0 * k), dn, L * k), u, dn, (ISLA.fondo + ISLA.vuelo) * k, paso * k);
        if (!dentroSala(R) || !dentroSala(punta) || !libreDe(R) || !sinMuebles(punta)) continue;
        // La península no puede cerrar el paso a la cocina: entre ella y la pared de enfrente, el paso
        const fondoSala = rayo(mas(mas(w.a, u, (s0 + (ISLA.fondo + ISLA.vuelo) / 2) * k), dn, 1), dn, pl.paredes, w) / k;
        if (!isFinite(fondoSala) || fondoSala - L < paso) continue;
        // Los muebles junto a la cocina y el vuelo (la barra) por fuera
        opciones.push({ tipo: 'peninsula', pared: p.letra, ref: 'izq', distancia: Math.round(lado === 'der' ? s0 : s0 + ISLA.vuelo), vuelo_lado: lado === 'der' ? 'der' : 'izq', separacion: 0, largo: L, fondo: ISLA.fondo, vuelo: ISLA.vuelo, paso: Math.round(fondoSala - L),
          texto: 'Península de ' + cm(L) + ' × ' + cm(ISLA.fondo + ISLA.vuelo) + ' al ' + (lado === 'der' ? 'final' : 'principio') + ' de la cocina de la pared ' + p.letra + ' (60 de muebles y 30 de vuelo), con ' + cm(Math.round(fondoSala - L)) + ' de paso por delante' });
        break;
      }
    });
  });
  // Mejor primero: más paso (hasta 120) y más larga
  opciones.sort((a, b) => Math.min(b.paso, 1200) - Math.min(a.paso, 1200) || b.largo - a.largo);
  return { opciones: opciones.slice(0, 3), aviso: opciones.length ? null : 'No queda sitio para una isla ni una península con ' + cm(paso) + ' de paso alrededor.' };
}
// ¿Dentro de la sala? (rayo hacia la derecha: corta un número impar de paredes)
function puntoDentro(P, paredes) {
  let n = 0;
  paredes.forEach(w => { const a = w.a, b = w.b; if ((a.y > P.y) !== (b.y > P.y) && P.x < a.x + (P.y - a.y) * (b.x - a.x) / (b.y - a.y)) n++; });
  return n % 2 === 1;
}
function cruzan(p, q, a, b) {
  const o = (u, v, w) => Math.sign((v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x));
  return o(p, q, a) * o(p, q, b) < 0 && o(a, b, p) * o(a, b, q) < 0;
}
// Añadir la elegida a la ficha
export function aplicarIsla(d, o) {
  d.islas = d.islas || [];
  d.islas.push(Object.assign({ id: crypto.randomUUID(), tipo: o.tipo, pared: o.pared, ref: o.ref, distancia: o.distancia, separacion: o.tipo === 'peninsula' ? null : o.separacion, largo: o.largo, fondo: o.fondo, vuelo: o.vuelo },
    o.vuelo_lado ? { vuelo_lado: o.vuelo_lado } : {}));
}

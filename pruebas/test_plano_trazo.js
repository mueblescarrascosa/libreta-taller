import { prueba, afirma, igual, fin } from './mini.js';
import { enderezar, letras } from '../docs/js/plano-geo.js';

// Generador de trazos a mano: recorre los vértices con puntos cada pocos píxeles y les añade temblor.
function azar(semilla) { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function trazo(vertices, { cerrada = false, temblor = 0.02, semilla = 1, paso = 4, desde = 0 } = {}) {
  const r = azar(semilla), xs = vertices.map(v => v[0]), ys = vertices.map(v => v[1]);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), t = temblor * diag;
  let vs = vertices.slice(desde).concat(vertices.slice(0, desde));
  if (cerrada) vs = vs.concat([vs[0]]);
  const pts = [];
  for (let i = 0; i < vs.length - 1; i++) {
    const [a, b] = [vs[i], vs[i + 1]], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
    for (let k = 0; k < n; k++) pts.push({ x: a[0] + (b[0] - a[0]) * k / n + (r() - 0.5) * t, y: a[1] + (b[1] - a[1]) * k / n + (r() - 0.5) * t });
  }
  const u = vs[vs.length - 1]; pts.push({ x: u[0] + (r() - 0.5) * t, y: u[1] + (r() - 0.5) * t });
  return pts;
}
const angulos = vs => vs.map((v, i) => {
  const a = vs[(i - 1 + vs.length) % vs.length], b = vs[(i + 1) % vs.length];
  const d = Math.atan2(b.y - v.y, b.x - v.x) - Math.atan2(a.y - v.y, a.x - v.x);
  return Math.round(Math.abs(((d * 180 / Math.PI) % 360 + 360) % 360));
});
const areaPantalla = vs => vs.reduce((s, v, i) => { const w = vs[(i + 1) % vs.length]; return s + v.x * w.y - w.x * v.y; }, 0) / 2;
const rectos = vs => angulos(vs).every(a => a === 90 || a === 270);

const RECT = [[100, 100], [500, 100], [500, 350], [100, 350]];
const ELE = [[100, 100], [400, 100], [400, 250], [250, 250], [250, 400], [100, 400]];
const U = [[100, 100], [200, 100], [200, 300], [300, 300], [300, 100], [400, 100], [400, 400], [100, 400]];

prueba('rectángulo: 4 vértices, cerrado, todo a 90°', () => {
  const r = enderezar(trazo(RECT, { cerrada: true, desde: 1 })); igual(r.cerrada, true); igual(r.vertices.length, 4); afirma(rectos(r.vertices), angulos(r.vertices).join());
});
prueba('forma en L: 6 vértices, cerrada y en ángulos rectos', () => {
  const r = enderezar(trazo(ELE, { cerrada: true })); igual(r.cerrada, true); igual(r.vertices.length, 6); afirma(rectos(r.vertices), angulos(r.vertices).join());
});
prueba('forma en U: 8 vértices', () => { const r = enderezar(trazo(U, { cerrada: true, temblor: 0.01 })); igual(r.vertices.length, 8); afirma(rectos(r.vertices)); });
prueba('línea recta: 2 vértices, abierta', () => { const r = enderezar(trazo([[100, 100], [500, 110]])); igual(r.cerrada, false); igual(r.vertices.length, 2); });
prueba('L abierta: 3 vértices', () => { const r = enderezar(trazo([[100, 100], [500, 100], [500, 400]])); igual(r.cerrada, false); igual(r.vertices.length, 3); afirma([90, 270].includes(angulos(r.vertices)[1]), angulos(r.vertices).join()); });
prueba('las figuras cerradas quedan en sentido horario y empiezan arriba a la izquierda', () => {
  const r = enderezar(trazo(RECT.slice().reverse(), { cerrada: true }));
  afirma(areaPantalla(r.vertices) > 0, 'no es horario'); const v0 = r.vertices[0];
  afirma(Math.abs(v0.x - 100) < 20 && Math.abs(v0.y - 100) < 20, JSON.stringify(v0));
  afirma(Math.abs(r.vertices[1].y - v0.y) < 1 && r.vertices[1].x > v0.x, 'la pared A no va hacia la derecha por arriba');
});
prueba('un ángulo de 45° no se fuerza a 90°', () => {
  const r = enderezar(trazo([[100, 100], [400, 100], [550, 250], [550, 500]], { temblor: 0.005 }));
  igual(r.vertices.length, 4); afirma(angulos(r.vertices).slice(1, 3).every(a => a === 135 || a === 225), angulos(r.vertices).join());
});
prueba('trazos imposibles devuelven null sin fallar', () => {
  igual(enderezar([]), null); igual(enderezar([{ x: 5, y: 5 }]), null); igual(enderezar([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }]), null);
});
prueba('con 20 temblores distintos sale siempre lo mismo', () => {
  for (let s = 1; s <= 20; s++) {
    igual(enderezar(trazo(ELE, { cerrada: true, semilla: s })).vertices.length, 6, 'L semilla ' + s);
    igual(enderezar(trazo(RECT, { cerrada: true, semilla: s, desde: 2 })).vertices.length, 4, 'rect semilla ' + s);
  }
});
export { trazo, ELE };
prueba('letras de las paredes', () => igual(letras(4), ['A', 'B', 'C', 'D']));
prueba('una figura abierta dibujada al revés queda con el interior a la derecha del recorrido', () => {
  const r = enderezar(trazo([[100, 100], [100, 400], [400, 400], [400, 100]]));
  igual(r.cerrada, false); igual(r.vertices.length, 4);
  const cierre = r.vertices.concat([r.vertices[0]]);
  afirma(areaPantalla(r.vertices) > 0, 'sigue al revés: ' + JSON.stringify(r.vertices));
});
prueba('una sola pared respeta el sentido del trazo', () => {
  const r = enderezar(trazo([[500, 100], [100, 105]])); afirma(r.vertices[0].x > r.vertices[1].x, JSON.stringify(r.vertices));
});
fin();

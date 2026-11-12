import { prueba, afirma, igual, fin } from './mini.js';
import { enderezar } from '../docs/js/plano-geo.js';
import { aplicarPlano, pasarAPilar, pilarEnParedes } from '../docs/js/plano-vista.js';
import { cuadreBajos, textoCuadre, moduloNuevo } from '../docs/js/modulos.js';
import { elementoNuevo } from '../docs/js/modelo.js';
import { fichaNueva } from '../docs/js/modelo.js';

function azar(semilla) { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function trazo(vertices, { temblor = 0.01, semilla = 1, paso = 4 } = {}) {
  const r = azar(semilla), vs = vertices.concat([vertices[0]]), pts = [];
  for (let i = 0; i < vs.length - 1; i++) {
    const [a, b] = [vs[i], vs[i + 1]], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
    for (let k = 0; k < n; k++) pts.push({ x: a[0] + (b[0] - a[0]) * k / n + (r() - 0.5) * temblor * 400, y: a[1] + (b[1] - a[1]) * k / n + (r() - 0.5) * temblor * 400 });
  }
  pts.push({ x: vs[vs.length - 1][0], y: vs[vs.length - 1][1] });
  return pts;
}
// Habitación de 400 × 250 con un pilar de 50 × 40 en medio de la pared de arriba (hacia dentro).
const MEDIO = [[100, 100], [250, 100], [250, 140], [300, 140], [300, 100], [500, 100], [500, 350], [100, 350]];
// Pilar en el rincón de arriba a la derecha.
const RINCON = [[100, 100], [450, 100], [450, 140], [500, 140], [500, 350], [100, 350]];
// Hueco hacia fuera (hornacina): eso sí son paredes.
const HUECO = [[100, 100], [250, 100], [250, 60], [300, 60], [300, 100], [500, 100], [500, 350], [100, 350]];

prueba('pilar en medio de una pared: 4 paredes y el pilar en la A', () => {
  for (let s = 1; s <= 10; s++) {
    const r = enderezar(trazo(MEDIO, { semilla: s }));
    igual(r.vertices.length, 4, 'semilla ' + s); igual(r.pilares.length, 1, 'semilla ' + s);
    igual(r.pilares[0].pared, 0); igual(r.pilares[0].ref, 'izq'); igual(r.pilares[0].distancia, null);
    igual(r.conPilares.length, 8, 'figura completa guardada');
  }
});
prueba('pilar en un rincón: 4 paredes, pilar pegado a la derecha de la A', () => {
  for (let s = 1; s <= 10; s++) {
    const r = enderezar(trazo(RINCON, { semilla: s }));
    igual(r.vertices.length, 4, 'semilla ' + s); igual(r.pilares.length, 1);
    igual(r.pilares[0].pared, 0); igual(r.pilares[0].ref, 'der'); igual(r.pilares[0].distancia, 0);
    const v = r.vertices[1]; afirma(Math.abs(v.x - 500) < 15 && Math.abs(v.y - 100) < 15, 'la esquina vuelve a su sitio: ' + JSON.stringify(v));
  }
});
prueba('un hueco hacia fuera sigue siendo paredes', () => {
  const r = enderezar(trazo(HUECO)); igual(r.vertices.length, 8); igual(r.pilares.length, 0);
});
prueba('la U ancha no se toma por pilar', () => {
  const U = [[100, 100], [200, 100], [200, 300], [300, 300], [300, 100], [400, 100], [400, 400], [100, 400]];
  igual(enderezar(trazo(U)).vertices.length, 8);
});
prueba('dibujado al revés, el pilar del rincón sigue bien', () => {
  const r = enderezar(trazo(RINCON.slice().reverse()));
  igual(r.vertices.length, 4); igual(r.pilares[0].pared, 0); igual(r.pilares[0].ref, 'der');
});
prueba('al guardar, la pared recibe su pilar (sin medidas, salvo pegado a la esquina) y no se duplica', () => {
  const r = enderezar(trazo(RINCON));
  const d0 = fichaNueva('cocina', null, 't').datos;
  const plano = { vertices: r.vertices, cerrada: true, largos: [null, null, null, null], pilares: r.pilares };
  const d = aplicarPlano(d0, plano);
  const ps = d.paredes[0].elementos.filter(e => e.tipo === 'pilar');
  igual(ps.length, 1); igual(ps[0].ref, 'der'); igual(ps[0].distancia, 0); igual(ps[0].ancho, null);
  afirma(!('pilares' in d.plano), 'el plano guardado no lleva los pilares');
  const d2 = aplicarPlano(d, plano);
  igual(d2.paredes[0].elementos.filter(e => e.tipo === 'pilar').length, 1);
});

// Plano de antes: pilar del rincón dibujado como dos paredes (B sobresale 40, C ancho 50).
function conParedesPilar() {
  const d = fichaNueva('cocina', null, 't').datos;
  const largos = [3500, 400, 500, 2100, 4000, 2500];
  d.plano = { vertices: RINCON.map(([x, y]) => ({ x, y })), cerrada: true, esquinas: [], diagonales: [] };
  d.paredes = largos.map((l, i) => ({ id: 'p' + i, letra: 'ABCDEF'[i], largo: l, alto: null, elementos: [], bajos: [], altos: [] }));
  return d;
}
prueba('un plano de antes con el pilar como paredes se reconoce', () => {
  igual(pilarEnParedes(conParedesPilar()), { paredes: ['B', 'C'], en: 'A', tipo: 'rincon' });
});
prueba('pasar a pilar: A y la de al lado llegan a la esquina, el pilar va en A y el rinconero sigue en la pared de verdad', () => {
  const d = conParedesPilar();
  const r = Object.assign(moduloNuevo('rinconero'), { ancho: 1000, lado2: 1000, gira: 'der' });
  d.paredes[0].bajos = [{ id: 'm1', tipo: 'bajo', ancho: 3020 }, r];
  d.paredes[3].elementos = [Object.assign(elementoNuevo('enchufe', 'izq'), { distancia: 300 })];
  const n = pasarAPilar(d);
  igual(n.paredes.map(p => [p.letra, p.largo]), [['A', 4000], ['B', 2500], ['C', 4000], ['D', 2500]]);
  const pil = n.paredes[0].elementos.find(e => e.tipo === 'pilar');
  igual([pil.ref, pil.distancia, pil.ancho, pil.fondo], ['der', 0, 500, 400]);
  igual(n.paredes[1].elementos[0].desde, 'pilar', 'el enchufe se midió desde la cara del pilar');
  igual(n.plano.vertices.length, 4); igual(pilarEnParedes(n), null);
  const c = cuadreBajos(n.paredes[0], n);
  igual(textoCuadre(c, 'cm'), 'Choca con el pilar (cajear) · te pasas 2 cm de la pared B');
  n.paredes[0].bajos[0].ancho = 2990;
  igual(textoCuadre(cuadreBajos(n.paredes[0], n), 'cm'), 'Choca con el pilar (cajear) · te falta 1 cm para la pared B');
  afirma(/Choca con el pilar/.test(textoCuadre(cuadreBajos(n.paredes[1], n), 'cm')) || !n.paredes[1].bajos.length, 'la de al lado sin bajos no dice nada');
});
prueba('sin pilar el cuadre sigue igual', () => {
  const d = fichaNueva('cocina', null, 't').datos;
  d.paredes = [{ id: 'x', letra: 'A', largo: 3000, elementos: [], bajos: [{ id: 'm', tipo: 'bajo', ancho: 3100 }], altos: [] }];
  igual(textoCuadre(cuadreBajos(d.paredes[0], d), 'cm'), 'Te pasas 10 cm');
});
prueba('pasar a pilar uno en medio: la pared se junta y lo de la otra mitad se corre', () => {
  const d = fichaNueva('cocina', null, 't').datos;
  d.plano = { vertices: MEDIO.map(([x, y]) => ({ x, y })), cerrada: true, esquinas: [], diagonales: [] };
  const L = [1500, 400, 500, 400, 2000, 2500, 4000, 2500];
  d.paredes = L.map((l, i) => ({ id: 'p' + i, letra: 'ABCDEFGH'[i], largo: l, elementos: [], bajos: [], altos: [] }));
  d.paredes[4].elementos = [Object.assign(elementoNuevo('toma', 'izq'), { distancia: 100 })];
  const n = pasarAPilar(d);
  igual(n.paredes.map(p => [p.letra, p.largo]), [['A', 4000], ['B', 2500], ['C', 4000], ['D', 2500]]);
  const pil = n.paredes[0].elementos.find(e => e.tipo === 'pilar'), toma = n.paredes[0].elementos.find(e => e.tipo === 'toma');
  igual([pil.ref, pil.distancia, pil.ancho, pil.fondo], ['izq', 1500, 500, 400]); igual(toma.distancia, 2100);
});
fin();

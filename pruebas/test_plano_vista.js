import { prueba, afirma, igual, fin } from './mini.js';
import { geometriaPlanta, aplicarPlano } from '../docs/js/plano-vista.js';
import { fichaNueva, elementoNuevo, paredNueva } from '../docs/js/modelo.js';

const cerca = (a, b, t) => Math.abs(a - b) <= (t ?? 0.5);
const el = (tipo, o) => Object.assign(elementoNuevo(tipo, 'izq'), o);
function cocina(paredes) {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = paredes.map((p, i) => Object.assign(paredNueva(f.datos.paredes.slice(0, i).length ? f.datos.paredes : []), { letra: 'ABCD'[i] }, p));
  return f.datos;
}

prueba('sin plano dibujado: paredes seguidas en ángulo recto y a escala', () => {
  const g = geometriaPlanta(cocina([{ largo: 3000 }, { largo: 2000 }]));
  igual(g.aEscala, true); igual(g.paredes.map(p => p.letra), ['A', 'B']);
  afirma(cerca(g.paredes[0].b.x - g.paredes[0].a.x, 3000) && cerca(g.paredes[1].b.y - g.paredes[1].a.y, 2000), JSON.stringify(g.paredes));
});
prueba('elementos en su sitio según la referencia', () => {
  const g = geometriaPlanta(cocina([
    { largo: 3000, elementos: [el('desague', { distancia: 600 }), el('humos', { distancia: 600, ref: 'der' }), el('ventana', { distancia: 1000, ancho: 800 })] },
    { largo: 2000, elementos: [el('enchufe', { distancia: 500 })] },
  ]));
  const [des, hum, ven, enc] = g.elementos;
  afirma(cerca(des.punto.x, 600) && cerca(des.punto.y, 0), JSON.stringify(des)); igual(des.etiqueta, 'Desagüe');
  afirma(cerca(hum.punto.x, 2400), JSON.stringify(hum));
  afirma(cerca(ven.a.x, 1000) && cerca(ven.b.x, 1800), JSON.stringify(ven));
  afirma(cerca(enc.punto.x, 3000) && cerca(enc.punto.y, 500), JSON.stringify(enc));
});
prueba('una ventana medida desde la derecha se coloca desde ese extremo', () => {
  const g = geometriaPlanta(cocina([{ largo: 3000, elementos: [el('ventana', { distancia: 200, ancho: 800, ref: 'der' })] }]));
  afirma(cerca(g.elementos[0].a.x, 2000) && cerca(g.elementos[0].b.x, 2800), JSON.stringify(g.elementos[0]));
});
prueba('la mocheta es un rectángulo hacia dentro de la habitación', () => {
  const g = geometriaPlanta(cocina([{ largo: 3000, elementos: [el('pilar', { distancia: 0, ancho: 300, fondo: 400 })] }, { largo: 2000 }]));
  const r = g.elementos[0].rect; igual(r.length, 4);
  afirma(r.every(p => p.y >= -0.5) && r.some(p => cerca(p.y, 400)), JSON.stringify(r)); // hacia dentro = hacia abajo en la pared de arriba
});
prueba('lo que no se puede situar se lista aparte', () => {
  const g = geometriaPlanta(cocina([{ largo: null, elementos: [el('gas', { distancia: 300 })] }, { largo: 2000, elementos: [el('agua', { distancia: null })] }]));
  igual(g.elementos.length, 0); igual(g.sinSituar.map(e => e.etiqueta), ['Gas', 'Toma de agua']); igual(g.aEscala, false);
});
prueba('con plano dibujado usa su forma', () => {
  const d = cocina([{ largo: 3000 }, { largo: 1000 }, { largo: 1500 }, { largo: 1000 }, { largo: 1500 }, { largo: 2000 }].map((p, i) => Object.assign(p, { letra: 'ABCDEF'[i] })));
  d.plano = { vertices: [[0, 0], [300, 0], [300, 100], [150, 100], [150, 200], [0, 200]].map(([x, y]) => ({ x, y })), cerrada: true, esquinas: [], diagonales: [] };
  const g = geometriaPlanta(d); igual(g.paredes.length, 6); igual(g.aEscala, true); igual(g.cierre, 'ok');
});
prueba('aplicar un plano crea paredes por letra y conserva lo que había', () => {
  const d = cocina([{ largo: 3000, elementos: [el('gas', { distancia: 300 })] }]);
  const plano = { vertices: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 0, y: 2 }], cerrada: true, largos: [3000, 2000, 3000, 2000], esquinas: [], diagonales: [] };
  const n = aplicarPlano(d, plano);
  igual(n.paredes.map(p => p.letra), ['A', 'B', 'C', 'D']); igual(n.paredes[0].largo, 3000); igual(n.paredes[0].elementos.length, 1);
  igual(n.paredes[1].largo, 2000); afirma(n.plano && !('largos' in n.plano), 'el plano no debe guardar largos: los tienen las paredes');
});
prueba('sin plano, paredes con letras salteadas conservan su letra y sus elementos', () => {
  const d = cocina([{ largo: 3000 }, { largo: 2000, elementos: [el('humos', { distancia: 500 })] }]); d.paredes[1].letra = 'C';
  const g = geometriaPlanta(d); igual(g.paredes.map(p => p.letra), ['A', 'C']); igual(g.elementos.length, 1); igual(g.elementos[0].pared, 'C');
});
prueba('con un plano de menos paredes, lo que queda fuera se avisa', () => {
  const d = cocina([{ largo: 3000 }, { largo: 2000 }, { largo: 1500, elementos: [el('desague', { distancia: 300 })] }]);
  d.plano = { vertices: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 200 }], cerrada: false, esquinas: [], diagonales: [] };
  const g = geometriaPlanta(d); igual(g.fuera, ['C']); igual(g.sinSituar.map(e => e.pared), ['C']);
});
fin();

import { prueba, afirma, igual, fin } from './mini.js';
import { moduloNuevo, nombreModulo, textoModulo, anchosDe, cuadreBajos, cuadreAltos, situarMuebles, esColumna, rinconerosQueEntran } from '../docs/js/modulos.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { textoResumen } from '../docs/js/resumen.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';

const mod = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o);
const G = AJUSTES_FABRICA.modulo_anchos;

prueba('medidas habituales por tipo', () => {
  igual(anchosDe(mod('lavavajillas'), G), [450, 600]);
  igual(anchosDe(mod('fregadero'), G)[0], 500);
  igual(anchosDe(mod('columna_frigo'), G), [600, 700, 920]);
  igual(anchosDe(mod('alto_micro'), G), [500, 600]);
  igual(anchosDe(mod('alto_frigo'), G), [600, 700, 920]);
  igual(anchosDe(mod('rinconero'), G), [930, 950, 980, 1000, 1030]);
  igual(anchosDe(mod('rinconero', null, { forma: 'recto' }), G), [900, 1000, 1200]);
  igual(anchosDe(mod('bajo'), G), G);
});
prueba('escobero y despensero son columnas; placa con horno; rinconeros con su forma', () => {
  afirma(esColumna(mod('escobero')) && esColumna(mod('despensero')));
  igual(nombreModulo(mod('placa', 600, { horno: true })), 'Placa con horno');
  igual(textoModulo(mod('rinconero', 1000, { lado2: 950 })), 'Rinconero en L 100×95');
  igual(textoModulo(mod('rinconero', 1000, { forma: 'chaflan', lado2: 1000 })), 'Rinconero chaflán 100×100');
  igual(textoModulo(mod('rinconero', 1200, { forma: 'recto' })), 'Rinconero recto 120');
});
prueba('altos: saltan las columnas y el alto sobre frigo va encima de la suya', () => {
  const p = { largo: 4000, bajos: [mod('columna_frigo', 600), mod('bajo', 600), mod('columna_hmo', 600), mod('bajo', 800)], altos: [mod('alto_frigo', 600), mod('alto', 600), mod('alto', 800)] };
  const s = situarMuebles(p, null);
  igual(s.altos.map(a => [a.m.tipo, a.desde]), [['alto_frigo', 0], ['alto', 600], ['alto', 1800]]);
  igual(cuadreAltos(p), { suma: 2600, resto: 1400 });
  const q = { largo: 3000, bajos: [mod('escobero', 400), mod('bajo', 600)], altos: [mod('alto', 600)] };
  igual(situarMuebles(q, null).altos[0].desde, 400);
});
prueba('rinconero que sigue en la pared de al lado: ocupa allí y se cuadra', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = ['A', 'B'].map(l => Object.assign(paredNueva([]), { letra: l, largo: 3000, elementos: [], bajos: [], altos: [] }));
  const [A, B] = f.datos.paredes;
  A.bajos.push(mod('bajo', 600), mod('rinconero', 1000, { lado2: 950, gira: 'der' }));
  B.bajos.push(mod('bajo', 600));
  igual(rinconerosQueEntran(f.datos, B), { izq: 950, der: 0 });
  igual(cuadreBajos(B, f.datos), { suma: 1550, resto: 1450 });
  igual(situarMuebles(B, f.datos).bajos[0].desde, 950);
  A.bajos[1] = mod('rinconero', 1000, { forma: 'recto', gira: 'der' });
  igual(rinconerosQueEntran(f.datos, B).izq, 600);
  afirma(textoResumen({ ficha: f, trabajo: null, ajustes: Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' }) }).includes('Rinconero recto 100 (sigue en B)'));
  const g = geometriaPlanta(f.datos, { unidad: 'cm' });
  igual(g.modulos.filter(m => m.pared === 'B' && m.sinTexto).length, 1);
});
prueba('la planta dibuja los altos con 35 de fondo', () => {
  const f = fichaNueva('cocina', null, 't'); Object.assign(f.datos.paredes[0], { largo: 3000, bajos: [mod('bajo', 600)], altos: [mod('alto_micro', 600)] });
  const g = geometriaPlanta(f.datos, { unidad: 'cm' }), al = g.modulos.find(m => m.alto), ba = g.modulos.find(m => !m.alto);
  const fondo = r => Math.hypot(r[3].x - r[0].x, r[3].y - r[0].y);
  afirma(Math.abs(fondo(al.rect) / fondo(ba.rect) - 35 / 60) < 0.01);
});
fin();

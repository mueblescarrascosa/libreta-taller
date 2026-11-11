import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, pilarEnPunta, extraPilar, avisos } from '../docs/js/modelo.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { textoResumen } from '../docs/js/resumen.js';

const AJ = { unidad: 'cm', paredes_m: false };
function cocina() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = ['A', 'B'].map(l => Object.assign(paredNueva([]), { letra: l, largo: 3000, elementos: [] }));
  return f;
}
const pilar = (ref, distancia, ancho, fondo) => Object.assign(elementoNuevo('pilar', ref), { distancia, ancho, fondo });

prueba('pilar en la punta de la propia pared, medido desde cualquier lado', () => {
  const f = cocina(), B = f.datos.paredes[1];
  B.elementos.push(pilar('izq', 0, 300, 400));
  igual(pilarEnPunta(f.datos, B, 'izq'), 300); igual(pilarEnPunta(f.datos, B, 'der'), null);
  B.elementos[0] = pilar('der', 2700, 300, 400);
  igual(pilarEnPunta(f.datos, B, 'izq'), 300);
  B.elementos[0] = pilar('izq', 1000, 300, 400);
  igual(pilarEnPunta(f.datos, B, 'izq'), null, 'un pilar en medio no es de la esquina');
});
prueba('pilar de la esquina apuntado en la pared vecina: aquí ocupa lo que sobresale', () => {
  const f = cocina(), [A, B] = f.datos.paredes;
  A.elementos.push(pilar('der', 0, 300, 250));
  igual(pilarEnPunta(f.datos, B, 'izq'), 250);
  igual(pilarEnPunta(f.datos, A, 'der'), 300);
});
prueba('medido desde el pilar: la planta lo sitúa detrás del pilar y lo dice', () => {
  const f = cocina(), B = f.datos.paredes[1];
  B.elementos.push(pilar('izq', 0, 300, 400), Object.assign(elementoNuevo('puerta', 'izq'), { distancia: 820, ancho: 800, desde: 'pilar' }));
  igual(extraPilar(f.datos, B, B.elementos[1]), 300);
  const g = geometriaPlanta(f.datos, { unidad: 'cm' }), pu = g.elementos.find(e => e.tipo === 'puerta');
  igual(pu.cota, 'a 82 del pilar');
  const pa = g.paredes.find(p => p.letra === 'B'), k = Math.hypot(pa.b.x - pa.a.x, pa.b.y - pa.a.y) / 3000;
  afirma(Math.abs(Math.hypot(pu.a.x - pa.a.x, pu.a.y - pa.a.y) / k - 1120) < 1, 'no está a 112 de la esquina');
  afirma(textoResumen({ ficha: f, trabajo: null, ajustes: AJ }).includes('a 82 cm desde el pilar de la izquierda'));
});
prueba('desde la esquina (o si el pilar ya no está) se queda como antes', () => {
  const f = cocina(), B = f.datos.paredes[1];
  B.elementos.push(Object.assign(elementoNuevo('puerta', 'izq'), { distancia: 820, ancho: 800, desde: 'pilar' }));
  igual(extraPilar(f.datos, B, B.elementos[0]), 0);
  igual(geometriaPlanta(f.datos, { unidad: 'cm' }).elementos.find(e => e.tipo === 'puerta').cota, 'a 82 de A');
});
prueba('el aviso de «se sale de la pared» cuenta el pilar', () => {
  const f = cocina(), B = f.datos.paredes[1];
  B.elementos.push(pilar('izq', 0, 300, 400), Object.assign(elementoNuevo('ventana', 'izq'), { distancia: 2000, ancho: 800, desde: 'pilar' }));
  afirma(avisos(f, 'cm').some(a => /se sale de la pared B/.test(a.texto)));
});
fin();

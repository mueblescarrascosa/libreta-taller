import { prueba, afirma, igual, fin } from './mini.js';
import { puertasCuerpo, frenteFrigoLibre } from '../docs/js/frentes.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { escenaPerspectiva } from '../docs/js/perspectiva.js';
import { materialVestidor } from '../docs/js/material.js';
import { textoResumen } from '../docs/js/resumen.js';
import { AJUSTES_FABRICA } from '../docs/js/modelo.js';

const mod = (tipo, ancho, extra = {}) => Object.assign(moduloNuevo(tipo), { ancho }, extra);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [] }, extra);

prueba('puertas de cuerpo: abatibles de 60 como mucho; correderas 2 hojas (3 si pasa de 1,5 m)', () => {
  const n = (w, t, k) => puertasCuerpo(w, 2150, t).filter(q => q.pieza === k).length;
  igual([n(900, 'abatible', 'puerta'), n(600, 'abatible', 'puerta'), n(1200, 'corredera', 'corredera'), n(1800, 'corredera', 'corredera')], [2, 1, 2, 3]);
  igual(puertasCuerpo(900, 2150, null), []);
  igual(frenteFrigoLibre(900, true).filter(q => q.k === 'acero').length, 2);
});

prueba('rincón en chaflán: una sola pieza de cinco lados, con el frente en diagonal', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('B', 1530, { bajos: [mod('bajo', 600), mod('rinconero', 930, { gira: 'der', forma: 'chaflan', lado2: 930 })] }), pared('C', 3000, { bajos: [mod('fregadero', 800)] })];
  const g = geometriaPlanta(f.datos, {}), r = g.modulos.filter(m => m.tipo === 'rinconero');
  igual(r.length, 1);
  igual([r[0].chaflan, r[0].rect.length], [true, 5]);
  const e = escenaPerspectiva(f.datos);
  afirma(e.cajas.some(c => c.huella.length === 5 && c.color === 'bajo') && e.cajas.some(c => c.huella.length === 5 && c.color === 'encimera'), 'mueble y encimera de cinco lados');
});

prueba('vestidor con puertas: en el resumen y en el material', () => {
  const f = fichaNueva('armario', 'vestidor', 't');
  f.datos.paredes = [pared('A', 3000, { cuerpos: [{ id: '1', ancho: 1200, interior: 'barra', puertas: 'corredera' }, { id: '2', ancho: 900, interior: 'estantes', puertas: 'abatible' }] })];
  const m = materialVestidor(f.datos);
  igual([m.correderas, m.puertas, m.bisagras], [2, 2, 8]);
  const t = textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJUSTES_FABRICA });
  afirma(t.includes('120 barra con puertas correderas') && t.includes('90 estantes con puertas abatibles'), t);
});

prueba('isla con sus frentes hacia su pared', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('A', 4000, { bajos: [mod('bajo', 600)] }), pared('B', 3000)];
  f.datos.islas = [{ id: 'i', tipo: 'isla', pared: 'A', ref: 'izq', distancia: 1000, separacion: 1100, largo: 1800, fondo: 900 }];
  const e = escenaPerspectiva(f.datos), isla = e.cajas.find(c => c.color === 'isla');
  afirma(isla && isla.caras.filter(c => c.fill === '#fbf6f0').length >= 2, 'puertas en la isla');
});
fin();

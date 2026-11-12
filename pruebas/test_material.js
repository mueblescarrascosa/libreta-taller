import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { materialCocina, materialVestidor, textoMaterial } from '../docs/js/material.js';
import { textoResumen } from '../docs/js/resumen.js';
import { AJUSTES_FABRICA } from '../docs/js/modelo.js';

const mod = (tipo, ancho, extra = {}) => Object.assign(moduloNuevo(tipo), { ancho }, extra);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [] }, extra);
function cocinaL() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [
    pared('B', 2580, { bajos: [mod('hueco', 50), mod('bajo', 500), mod('placa', 800), mod('bajo', 300), mod('rinconero', 930, { gira: 'der', forma: 'L', lado2: 930 })], altos: [mod('hueco', 650), mod('alto_campana', 600)] }),
    pared('C', 4020, { bajos: [mod('cajonero', 450), mod('fregadero', 800), mod('lavavajillas', 600), mod('columna_hmo', 600), mod('columna_frigo', 600)], altos: [mod('hueco', 380), mod('alto', 600), mod('alto', 400), mod('alto', 800), mod('alto', 600)] })];
  return f;
}

prueba('encimera: una pieza por tramo, la segunda desde el canto de la primera, con sus huecos', () => {
  const r = materialCocina(cocinaL().datos);
  igual(r.piezas.map(q => [q.pared, q.largo, q.fondo]), [['B', 2530, 620], ['C', 2160, 620]]);
  igual(r.uniones, ['B-C']);
  igual(r.huecos.map(q => q.que), ['placa', 'fregadero']);
});

prueba('herrajes: puertas con sus bisagras, cajones, tiradores, patas y el panel del lavavajillas', () => {
  const h = materialCocina(cocinaL().datos).herrajes;
  igual([h.puertas, h.cajones, h.lavavajillas, h.patas], [16, 9, 1, 36]);
  afirma(h.bisagras >= h.puertas * 2, 'bisagras');
});

prueba('texto: zócalo siempre; cornisa y LED si la cocina los lleva; sale en el resumen', () => {
  const f = cocinaL();
  let t = textoMaterial(f);
  afirma(t.includes('Zócalo: 5,89 m') && !t.some(x => /Cornisa/.test(x)), t.join(' | '));
  f.datos.acabados.lineales = [{ id: 'x', tipo: 'cornisa', modelo: '' }, { id: 'y', tipo: 'led', modelo: '' }];
  t = textoMaterial(f);
  afirma(t.some(x => /^Cornisa: /.test(x)) && t.some(x => /^Tira LED/.test(x)), t.join(' | '));
  const r = textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJUSTES_FABRICA });
  afirma(r.includes('*Material (orientativo)*') && r.includes('Encimera: 2 piezas, 4,69 m en total'), r);
});

prueba('vestidor: barras con soportes, estantes, cajones y patas', () => {
  const f = fichaNueva('armario', 'vestidor', 't');
  f.datos.paredes = [pared('A', 3000, { cuerpos: [{ id: '1', ancho: 1000, interior: 'barra', interior2: 'cajonera' }, { id: '2', ancho: 800, interior: 'doble_barra' }] })];
  const r = materialVestidor(f.datos);
  igual([r.barras, r.barras_mm, r.cajones, r.patas], [3, 960 + 760 * 2, 3, 8]);
});
fin();

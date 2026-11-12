import { prueba, afirma, igual, fin } from './mini.js';
import { TIPOS_MODULO, moduloNuevo, nombreModulo, cuadreBajos, cuadreAltos, cuadreCuerpos, lineaNueva, nombreLineal, nombreInterior } from '../docs/js/modulos.js';
import { fichaNueva, avisos, tieneInformacion, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';

const mod = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o);
const cerca = (a, b) => Math.abs(a - b) <= 0.5;

prueba('tipos de módulo por fila y anchos rápidos', () => {
  igual(TIPOS_MODULO.bajos, ['bajo', 'fregadero', 'placa', 'cajonero', 'lavavajillas', 'rinconero', 'columna_hmo', 'columna_frigo', 'escobero', 'despensero', 'hueco', 'otro']);
  igual(TIPOS_MODULO.altos, ['alto', 'alto_campana', 'alto_micro', 'alto_frigo', 'hueco', 'otro']);
  igual(AJUSTES_FABRICA.modulo_anchos, [300, 400, 450, 500, 600, 800, 900, 1000, 1200]);
  igual(nombreLineal({ tipo: 'led' }, AJUSTES_FABRICA), 'Tira LED'); igual(nombreLineal({ tipo: 'otro', nombre: 'Copete' }, AJUSTES_FABRICA), 'Copete');
  igual(nombreInterior('doble_barra', AJUSTES_FABRICA), 'Doble barra'); igual(nombreInterior('desconocido', AJUSTES_FABRICA), 'desconocido');
  const l = lineaNueva('zocalo'); afirma(l.id); igual([l.tipo, l.modelo, l.nombre], ['zocalo', '', '']);
});
prueba('módulo nuevo y su nombre', () => {
  const m = moduloNuevo('columna_hmo'); afirma(m.id); igual([m.tipo, m.ancho, m.nombre], ['columna_hmo', null, '']);
  igual(nombreModulo(m), 'Columna H/MO'); igual(nombreModulo({ tipo: 'otro', nombre: 'Botellero' }), 'Botellero'); igual(nombreModulo({ tipo: 'otro', nombre: '' }), 'Otro');
});
prueba('cuadre de bajos: lo que queda o lo que sobra', () => {
  igual(cuadreBajos({ largo: 3000, bajos: [mod('fregadero', 800), mod('lavavajillas', 600)] }), { suma: 1400, resto: 1600 });
  igual(cuadreBajos({ largo: 1000, bajos: [mod('bajo', 600), mod('bajo', 600)] }), { suma: 1200, resto: -200 });
  igual(cuadreBajos({ largo: null, bajos: [mod('bajo', 600)] }), { suma: 600, resto: null });
  igual(cuadreBajos({ largo: 3000 }), { suma: 0, resto: 3000 });
});
prueba('cuadre de altos: las columnas de abajo también ocupan arriba', () => {
  igual(cuadreAltos({ largo: 3000, bajos: [mod('columna_hmo', 600), mod('bajo', 600)], altos: [mod('alto', 800)] }), { suma: 1400, resto: 1600 });
});
prueba('pasarse del largo de la pared avisa; quedarse corto no', () => {
  const f = fichaNueva('cocina', null, 't'); Object.assign(f.datos.paredes[0], { largo: 1000, bajos: [mod('bajo', 600), mod('bajo', 600)] });
  const a = avisos(f, 'mm'); igual(a.length, 1); afirma(/pasa.*20 cm|200 mm/.test(a[0].texto), a[0].texto);
  f.datos.paredes[0].bajos = [mod('bajo', 600)]; igual(avisos(f, 'mm').length, 0);
});
prueba('cuerpos de armario contra el hueco más estrecho', () => {
  igual(cuadreCuerpos({ ancho_arriba: 2010, ancho_medio: 2000, ancho_abajo: null, cuerpos: [mod('x', 1000), mod('x', 900)] }), { suma: 1900, resto: 100 });
  const f = fichaNueva('armario', 'abatible', 't'); Object.assign(f.datos, { ancho_arriba: 1500, cuerpos: [{ id: 'c', ancho: 1000, interior: 'barra' }, { id: 'd', ancho: 600, interior: 'estantes' }] });
  igual(avisos(f, 'mm').length, 1);
});
prueba('fichas nuevas traen sus listas vacías', () => {
  const c = fichaNueva('cocina', null, 't');
  igual([c.datos.paredes[0].bajos, c.datos.paredes[0].altos], [[], []]);
  igual(c.datos.acabados, { bitono: null, modelo: '', color: '', modelo_altos: '', color_altos: '', modelo_bajos: '', color_bajos: '', casco: '', encimera: { material: '', modelo: '', color: '', grueso: null }, lineales: [] });
  igual(fichaNueva('armario', 'corredera', 't').datos.cuerpos, []);
  const p = fichaNueva('puerta', null, 't'); igual([p.datos.modelo, p.datos.color], ['', '']);
  afirma(!tieneInformacion(c.datos) && !tieneInformacion(p.datos), 'vacías cuentan como información');
});
prueba('la planta dibuja bajos y columnas desde la izquierda con 60 de fondo', () => {
  const c = fichaNueva('cocina', null, 't');
  Object.assign(c.datos.paredes[0], { largo: 3000, bajos: [mod('columna_hmo', 600), mod('fregadero', 800), mod('bajo', null)] });
  const g = geometriaPlanta(c.datos), m = g.modulos;
  igual(m.length, 2, 'el que no tiene ancho no se dibuja');
  afirma(cerca(m[0].rect[0].x, 0) && cerca(m[0].rect[1].x, 600) && cerca(m[0].rect[2].y, 600), JSON.stringify(m[0].rect));
  afirma(cerca(m[1].rect[0].x, 600) && cerca(m[1].rect[1].x, 1400), JSON.stringify(m[1].rect));
  igual(m.map(x => x.columna), [true, false]);
});
fin();

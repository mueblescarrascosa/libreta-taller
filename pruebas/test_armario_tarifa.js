// 1.44.0: el armario empotrado (correderas o abatibles) pasa a Presupuestos como un tramo de armario, para calcularlo
// con la tarifa de armarios (y «Pasar a presupuesto»).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, mezclarAjustes } from '../docs/js/modelo.js';
import { paquetePresupuesto } from '../docs/js/presupuesto.js';

const AJ = mezclarAjustes({});
function armario(subtipo, datos) { const f = fichaNueva('armario', subtipo, 't'); Object.assign(f.datos, datos); return f; }

prueba('correderas con cuerpos: medidas en cm, hojas, interior, resto del hueco y recargo del cuerpo', () => {
  const f = armario('corredera', { ancho_medio: 2405, ancho_arriba: 2400, alto_izq: 2500, alto_der: 2480, fondo: 600, hojas: 3,
    cuerpos: [{ ancho: 1000, interior: 'barra', recargo: { motivo: 'pilar', pct: null } }, { ancho: 1000, interior: 'cajonera' }] });
  f.nombre = 'Dormitorio';
  const p = paquetePresupuesto(f, { nombre: 'Casa' }, AJ), g = p.grupos.find(x => x.tipo === 'armario');
  igual(g.nombre, 'Armario de correderas');
  const t = g.tramos[0];
  igual([t.clase, t.nombre, t.ancho, t.alto, t.fondo, t.hojas, t.puertas], ['armario', 'Dormitorio', 240.5, 248, 60, 3, 'corredera_tablero']);
  igual(t.cuerpos.map(c => [c.ancho, c.barra, c.cajones]), [[100, 1, 0], [100, 0, 3], [40.5, 1, 0]]);
  afirma(t.cuerpos[2].maletero, 'el resto del hueco lleva maletero');
  igual(t.recargos, [{ ancho: 100, motivo: 'pilar', pct: 20, texto: 'Cajeado por pilar – Cuerpo 1 100' }]);
  igual(p.plano3d, null); igual(p.titulo, 'el armario «Dormitorio» de Casa'); igual(p.resumen, '3 cuerpos');
});
prueba('abatible sin cuerpos: cuerpos de 1 m más o menos, recargo del armario entero y aviso si falta el alto', () => {
  const f = armario('abatible', { ancho_medio: 1800, recargo: { motivo: 'descuadre', pct: 15 } });
  const p = paquetePresupuesto(f, null, AJ), t = p.grupos.find(x => x.tipo === 'armario').tramos[0];
  igual([t.puertas, t.alto, t.hojas], ['abatible_tablero', 250, undefined]);
  igual(t.cuerpos.map(c => c.ancho), [90, 90]);
  igual(t.recargos, [{ ancho: 180, motivo: 'descuadre', pct: 15, texto: 'Pared descuadrada – Armario 180' }]);
  afirma(p.grupos.find(x => x.tipo === 'revisar').lineas.some(l => /falta el alto/.test(l)));
});
prueba('armario sin medidas: no pasa ningún tramo', () => {
  const p = paquetePresupuesto(armario('corredera', {}), null, AJ);
  igual(p.grupos.filter(x => x.tipo === 'armario'), []);
});
fin();

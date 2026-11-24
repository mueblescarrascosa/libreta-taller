// 1.42.0: coste estimado por metro lineal y recargos por complicación (cajeado por pilar, tubo, descuadre).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, mezclarAjustes } from '../docs/js/modelo.js';
import { moduloNuevo, REMATES } from '../docs/js/modulos.js';
import { estimacionRapida, piezasCoste, propuestasRecargo, aceptarPropuesta, descartarPropuesta, PRECIOS_ML, euros } from '../docs/js/coste.js';

REMATES.porDefecto = false;   // sin regletas ni costados: los muebles empiezan en 0
const mod = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, extra);
function cocina(paredes, extra = {}) { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; Object.assign(f.datos, extra); return f; }
const AJ = mezclarAjustes({});

prueba('precios de fábrica en los ajustes y los guardados mandan si son válidos', () => {
  igual(AJ.precios_ml, PRECIOS_ML); igual(AJ.recargo_pct, 20);
  const a = mezclarAjustes({ precios_ml: { bajos: 350, altos: -3, raro: 9 }, recargo_pct: 15 });
  igual(a.precios_ml.bajos, 350); igual(a.precios_ml.altos, PRECIOS_ML.altos); igual(a.precios_ml.raro, undefined); igual(a.recargo_pct, 15);
  igual(mezclarAjustes({ recargo_pct: 'x' }).recargo_pct, 20);
});
prueba('cocina: bajos, columnas y altos por metro; los huecos y la campana decorativa no cuentan', () => {
  const f = cocina([pared('A', 4000, { bajos: [mod('columna_frigo', 600), mod('bajo', 600), mod('fregadero', 800), mod('hueco', 300)], altos: [mod('alto', 800), mod('campana_deco', 600)] })]);
  const e = estimacionRapida(f, AJ);
  igual(e.lineas.map(l => [l.clase, l.metros, l.importe]), [['bajos', 1.4, 420], ['altos', 0.8, 152], ['columnas', 0.6, 360]]);
  igual(e.total, 932); igual(e.conIva, 1127.72); igual(e.recargos, []);
});
prueba('ficha vacía: sin importe', () => { const e = estimacionRapida(cocina([pared('A', 3000)]), AJ); afirma(e.vacio); igual(e.total, 0); });
prueba('el recargo suma su % al precio del mueble (el de Ajustes o el suyo)', () => {
  const b = mod('bajo', 600, { recargo: { motivo: 'pilar', pct: null } }), c = mod('bajo', 1000, { recargo: { motivo: 'tubo', pct: 10 } });
  const e = estimacionRapida(cocina([pared('A', 3000, { bajos: [b, c] })]), AJ);
  igual(e.recargos.map(r => [r.motivo, r.pct, r.importe]), [['pilar', 20, 36], ['tubo', 10, 30]]);
  igual(e.total, 480 + 66);
  afirma(e.recargos[0].texto.startsWith('Cajeado por pilar – Bajo 60'), e.recargos[0].texto);
});
prueba('un mueble que choca con un pilar se propone; aceptar y descartar', () => {
  const b1 = mod('bajo', 600), b2 = mod('bajo', 600);
  const f = cocina([pared('A', 3000, { elementos: [{ id: 'p', tipo: 'pilar', ref: 'izq', distancia: 800, ancho: 300, fondo: 200 }], bajos: [b1, b2] })]);
  igual(propuestasRecargo(f).map(x => x.obj), [b2]);
  aceptarPropuesta(b2); igual(b2.recargo, { motivo: 'pilar', pct: null }); igual(propuestasRecargo(f), []);
  igual(estimacionRapida(f, AJ).total, 360 + 36);
  delete b2.recargo; descartarPropuesta(b2); igual(propuestasRecargo(f), []);
});
prueba('vestidor por paredes y armario: cuerpos y resto del hueco', () => {
  const v = fichaNueva('armario', 'vestidor', 't'); v.datos.paredes = [pared('A', 3000, { cuerpos: [{ id: 'a', ancho: 1000 }, { id: 'b', ancho: 800, recargo: { motivo: 'descuadre', pct: null } }] })];
  const ev = estimacionRapida(v, AJ); igual(ev.lineas.map(l => [l.clase, l.metros]), [['vestidor', 1.8]]); igual(ev.total, 810 + 72);
  const a = fichaNueva('armario', 'corredera', 't'); Object.assign(a.datos, { ancho_medio: 2400, cuerpos: [{ id: 'c', ancho: 1000 }] });
  igual(piezasCoste(a).map(x => [x.texto, x.ancho]), [['Cuerpo 1 100', 1000], ['Resto del hueco 140', 1400]]);
  igual(estimacionRapida(a, AJ).total, 1392);
  const b = fichaNueva('armario', 'abatible', 't'); Object.assign(b.datos, { ancho_arriba: 2000, recargo: { motivo: 'pilar', pct: 25 } });
  igual(estimacionRapida(b, AJ).total, 1080 + 270);
});
prueba('importe en euros a la española', () => { igual(euros(5400.4), '5.400 €'); igual(euros(932), '932 €'); });
fin();

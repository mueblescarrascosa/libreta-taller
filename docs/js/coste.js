// Coste estimado (solo para el usuario, en pantalla): por metro lineal de muebles, con los precios de Ajustes, y los
// recargos por complicación de cada mueble o cuerpo (cajeado por pilar, tubo o contador, pared descuadrada).
// Sin IVA; el total con IVA debajo. No va al PDF ni a lo compartido.
import { situarMuebles, situarCuerpos, esColumna, tramosPilar, nombreModulo } from './modulos.js';

const hay = v => v !== null && v !== undefined;
export const IVA = 21;
export const MOTIVOS_RECARGO = [['pilar', 'Cajeado por pilar'], ['tubo', 'Tubo o contador'], ['descuadre', 'Pared descuadrada']];
export const NOMBRE_MOTIVO = Object.fromEntries(MOTIVOS_RECARGO);
// Para los botones (en el móvil no caben los nombres largos).
export const MOTIVOS_CORTOS = [['pilar', 'Pilar'], ['tubo', 'Tubo/contador'], ['descuadre', 'Descuadre']];
// Precios de partida (€/m sin IVA): cocina, mediana de presupuestos reales; armarios y vestidor, la calculadora de
// armarios de Presupuestos (margen 25 %). Se cambian en Ajustes.
export const PRECIOS_ML = { bajos: 300, altos: 190, columnas: 600, vestidor: 450, corredera: 580, abatible: 540 };
export const NOMBRE_PRECIO = { bajos: 'Bajos', altos: 'Altos', columnas: 'Columnas', vestidor: 'Vestidor', corredera: 'Armario de correderas', abatible: 'Armario abatible' };
export const RECARGO_PCT = 20;
// Para «Calcular con la tarifa» (orientativos, sin IVA, se cambian en Ajustes): cornisa y tira LED por metro, y
// electrodomésticos por unidad (solo en el cálculo; al pasar a presupuesto siguen para elegir modelo).
export const PRECIOS_EXTRA = { cornisa: 25, led: 30, placa: 300, horno: 350, microondas: 200, campana: 250, frigo: 700, lavavajillas: 400, lavadora: 400, otro: 0 };
export const NOMBRE_EXTRA = { cornisa: 'Cornisa (€/m)', led: 'Tira LED (€/m)', placa: 'Placa', horno: 'Horno', microondas: 'Microondas', campana: 'Campana', frigo: 'Frigorífico',
  lavavajillas: 'Lavavajillas', lavadora: 'Lavadora', otro: 'Otro electrodoméstico' };
export const preciosExtraDe = aj => Object.assign({}, PRECIOS_EXTRA, (aj && aj.precios_extra) || {});
// Lo que no se cobra como mueble: huecos y la campana decorativa (es un electrodoméstico).
const SIN_MUEBLE = ['hueco', 'campana_deco'];

export const preciosDe = aj => Object.assign({}, PRECIOS_ML, (aj && aj.precios_ml) || {});
export const pctDe = aj => (aj && Number.isFinite(aj.recargo_pct) ? aj.recargo_pct : RECARGO_PCT);
export const pctRecargo = (obj, aj) => (obj && obj.recargo && Number.isFinite(obj.recargo.pct) ? obj.recargo.pct : pctDe(aj));

const v = x => (hay(x) && x > 0 ? x : null);
const solapa = (a, b, x, y) => a < y - 1 && x < b - 1;

// Lo que se cobra de una ficha: una pieza por mueble o cuerpo con medida.
// { obj (donde va el recargo), clase (clave de precio), ancho (mm), texto, choca (con un pilar) }
export function piezasCoste(ficha) {
  const d = (ficha && ficha.datos) || {}, r = [];
  if (ficha.tipo === 'cocina') {
    (d.paredes || []).forEach(p => {
      const sit = situarMuebles(p, d), pil = tramosPilar(d, p);
      const poner = (lista, fila) => lista.forEach(({ m, desde, hasta }) => {
        if (SIN_MUEBLE.includes(m.tipo) || !v(m.ancho)) return;
        const clase = fila === 'bajos' ? (esColumna(m) ? 'columnas' : 'bajos') : 'altos';
        r.push({ obj: m, clase, ancho: m.ancho, texto: nombreModulo(m) + ' ' + Math.round(m.ancho / 10) + ' (pared ' + p.letra + ')', choca: pil.some(([a, b]) => solapa(desde, hasta, a, b)) });
      });
      poner(sit.bajos, 'bajos'); poner(sit.altos, 'altos'); poner(sit.altillos || [], 'altos');
    });
    (d.islas || []).forEach((x, i) => { if (v(x.largo)) r.push({ obj: x, clase: 'bajos', ancho: x.largo, texto: (x.tipo === 'peninsula' ? 'Península' : 'Isla') + ' ' + Math.round(x.largo / 10) + (d.islas.length > 1 ? ' (' + (i + 1) + ')' : ''), choca: false }); });
    return r;
  }
  if (ficha.tipo !== 'armario') return r;
  const clase = ficha.subtipo === 'vestidor' ? 'vestidor' : ficha.subtipo === 'abatible' ? 'abatible' : 'corredera';
  if (ficha.subtipo === 'vestidor') (d.paredes || []).forEach(p => {
    const pil = tramosPilar(d, p);
    situarCuerpos(p, d).cuerpos.forEach(({ c, desde, hasta }, i) => r.push({ obj: c, clase, ancho: c.ancho, texto: 'Cuerpo ' + (i + 1) + ' ' + Math.round(c.ancho / 10) + ' (pared ' + p.letra + ')', choca: pil.some(([a, b]) => solapa(desde, hasta, a, b)) }));
  });
  // Cuerpos del hueco (armario, o vestidor de antes); si el hueco es más ancho que los cuerpos, el resto también se cobra.
  const cs = (d.cuerpos || []).filter(c => v(c.ancho)), A = v(d.ancho_medio) || v(d.ancho_arriba) || v(d.ancho_abajo), suma = cs.reduce((s, c) => s + c.ancho, 0);
  cs.forEach((c, i) => r.push({ obj: c, clase, ancho: c.ancho, texto: 'Cuerpo ' + (i + 1) + ' ' + Math.round(c.ancho / 10), choca: false }));
  if (ficha.subtipo !== 'vestidor' && A && A - suma > 1) r.push({ obj: cs.length ? null : d, clase, ancho: A - suma, texto: cs.length ? 'Resto del hueco ' + Math.round((A - suma) / 10) : 'Armario ' + Math.round(A / 10), choca: false });
  return r;
}

// Muebles que chocan con un pilar y aún no tienen recargo ni se ha dicho que no: para proponer el cajeado.
export const propuestasRecargo = ficha => piezasCoste(ficha).filter(x => x.choca && x.obj && !x.obj.recargo && !x.obj.recargo_no);
export function aceptarPropuesta(obj) { obj.recargo = { motivo: 'pilar', pct: null }; delete obj.recargo_no; }
export function descartarPropuesta(obj) { obj.recargo_no = true; }

const r2 = x => Math.round(x * 100) / 100;
// Estimación rápida: líneas por clase (metros × €/m), recargos de cada mueble, total sin IVA y con IVA.
export function estimacionRapida(ficha, aj) {
  const P = preciosDe(aj), piezas = piezasCoste(ficha), porClase = {}, recargos = [];
  piezas.forEach(x => {
    const importe = x.ancho / 1000 * (P[x.clase] || 0);
    porClase[x.clase] = (porClase[x.clase] || 0) + x.ancho;
    if (x.obj && x.obj.recargo) {
      const pct = pctRecargo(x.obj, aj);
      recargos.push({ texto: (NOMBRE_MOTIVO[x.obj.recargo.motivo] || 'Complicación') + ' – ' + x.texto, motivo: x.obj.recargo.motivo, pct, importe: r2(importe * pct / 100) });
    }
  });
  const lineas = Object.keys(NOMBRE_PRECIO).filter(k => porClase[k]).map(k => ({ clase: k, texto: NOMBRE_PRECIO[k], metros: r2(porClase[k] / 1000), precio: P[k], importe: r2(porClase[k] / 1000 * P[k]) }));
  const total = r2(lineas.reduce((s, l) => s + l.importe, 0) + recargos.reduce((s, l) => s + l.importe, 0));
  return { lineas, recargos, total, conIva: r2(total * (1 + IVA / 100)), vacio: !piezas.length, propuestas: propuestasRecargo(ficha) };
}

export const euros = x => (Math.round(x)).toLocaleString('es-ES', { useGrouping: 'always' }) + ' €';
export const metros = x => x.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

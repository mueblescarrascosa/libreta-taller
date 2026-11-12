// Módulos de cocina (bajos y altos, de izquierda a derecha), cuerpos de armario y lineales de los acabados.
import { verMedida } from './unidades.js';

const id = () => crypto.randomUUID();
const hay = v => v !== null && v !== undefined;

export const TIPOS_MODULO = {
  bajos: ['bajo', 'fregadero', 'placa', 'cajonero', 'lavavajillas', 'rinconero', 'columna_hmo', 'columna_frigo', 'escobero', 'despensero', 'hueco', 'otro'],
  altos: ['alto', 'alto_campana', 'alto_micro', 'alto_frigo', 'hueco', 'otro'],
};
export const NOMBRE_MODULO = {
  bajo: 'Bajo', fregadero: 'Fregadero', placa: 'Placa', cajonero: 'Cajonero', lavavajillas: 'Lavavajillas', rinconero: 'Rinconero',
  columna_hmo: 'Columna H/MO', columna_frigo: 'Columna frigo', escobero: 'Escobero', despensero: 'Despensero', hueco: 'Hueco',
  alto: 'Alto', alto_campana: 'Alto campana', alto_micro: 'Alto micro', alto_frigo: 'Alto sobre frigo', otro: 'Otro',
};
const COLUMNAS = ['columna_hmo', 'columna_frigo', 'escobero', 'despensero'];
export const esColumna = m => COLUMNAS.includes(m.tipo);
// Nombre corto para los botones (en el resumen y la planta sigue el completo).
export const CORTO_MODULO = { columna_hmo: 'Col. H/MO', columna_frigo: 'Col. frigo', escobero: 'Escobero', despensero: 'Despensero', lavavajillas: 'Lavavaj.', alto_campana: 'Alto campana', alto_micro: 'Alto micro', alto_frigo: 'Alto s/frigo' };

// Anchos habituales en España (mm) por tipo de mueble; los demás usan la lista general de Ajustes. Siempre se puede escribir otro.
const ANCHOS_TIPO = {
  fregadero: [500, 600, 800, 900, 1000, 1200], placa: [600, 800, 900, 1000, 1200], cajonero: [400, 450, 500, 600, 800, 900, 1000, 1200],
  lavavajillas: [450, 600], columna_hmo: [600], columna_frigo: [600, 700, 920], escobero: [300, 400, 450, 500, 600], despensero: [300, 400, 450, 500, 600],
  alto_campana: [600, 900], alto_micro: [500, 600], alto_frigo: [600, 700, 920],
};
// Rinconero: en L o chaflán, de 93 a 103 por lado; recto, de 90, 100 o 120 de largo y 60 de fondo.
export const FORMAS_RINCONERO = [['L', 'En L'], ['chaflan', 'Chaflán'], ['recto', 'Recto']];
export const LADOS_RINCONERO = [930, 950, 980, 1000, 1030];
const LARGOS_RINCONERO_RECTO = [900, 1000, 1200];
export const FONDO_BAJO = 600;
export function anchosDe(m, general) {
  if (m.tipo === 'rinconero') return m.forma === 'recto' ? LARGOS_RINCONERO_RECTO : LADOS_RINCONERO;
  return ANCHOS_TIPO[m.tipo] || general;
}

export const moduloNuevo = tipo => (tipo === 'rinconero' ? { id: id(), tipo, ancho: null, nombre: '', forma: 'L', lado2: null, gira: 'der' } : { id: id(), tipo, ancho: null, nombre: '' });
export const lineaNueva = tipo => ({ id: id(), tipo, modelo: '', nombre: '' });

export function nombreModulo(m) {
  if (m.tipo === 'otro') return m.nombre || 'Otro';
  if (m.tipo === 'rinconero') return m.forma === 'recto' ? 'Rinconero recto' : m.forma === 'chaflan' ? 'Rinconero chaflán' : 'Rinconero en L';
  if (m.tipo === 'placa' && m.horno) return 'Placa con horno';
  return NOMBRE_MODULO[m.tipo] || m.tipo;
}
// Las medidas de un módulo para listas y textos: «60», «100×95» en rinconeros en L o chaflán.
export function medidasModulo(m) {
  if (!hay(m.ancho)) return '';
  const a = verMedida(m.ancho, 'cm');
  return m.tipo === 'rinconero' && m.forma !== 'recto' && hay(m.lado2) ? a + '×' + verMedida(m.lado2, 'cm') : a;
}
export const textoModulo = m => nombreModulo(m) + (hay(m.ancho) ? ' ' + medidasModulo(m) : '');

// Lo que un rinconero ocupa en la pared donde sigue: el otro lado (en L o chaflán) o el fondo (recto).
const ocupaVecina = m => (m.forma === 'recto' ? FONDO_BAJO : hay(m.lado2) ? m.lado2 : null);
// Rinconeros de las paredes de al lado que entran en esta: cuánto ocupan en su punta izquierda y en la derecha.
export function rinconerosQueEntran(datos, p) {
  const r = { izq: 0, der: 0 }, lista = (datos && datos.paredes) || [], i = lista.indexOf(p);
  if (i < 0) return r;
  const cerrada = !!(datos.plano && datos.plano.cerrada);
  const ant = i > 0 ? lista[i - 1] : cerrada && lista.length > 1 ? lista[lista.length - 1] : null;
  const sig = i < lista.length - 1 ? lista[i + 1] : cerrada && lista.length > 1 ? lista[0] : null;
  (ant && ant.bajos || []).forEach(m => { if (m.tipo === 'rinconero' && m.gira !== 'izq') r.izq += ocupaVecina(m) || 0; });
  (sig && sig.bajos || []).forEach(m => { if (m.tipo === 'rinconero' && m.gira === 'izq') r.der += ocupaVecina(m) || 0; });
  return r;
}
// Las paredes donde puede seguir un rinconero de esta pared: la anterior (izquierda) y la siguiente (derecha).
export function paredesVecinas(datos, p) {
  const lista = (datos && datos.paredes) || [], i = lista.indexOf(p), cerrada = !!(datos && datos.plano && datos.plano.cerrada);
  return { izq: i > 0 ? lista[i - 1] : cerrada && lista.length > 1 ? lista[lista.length - 1] : null,
    der: i >= 0 && i < lista.length - 1 ? lista[i + 1] : cerrada && lista.length > 1 ? lista[0] : null };
}
const buscar = (lista, clave) => { const x = (lista || []).find(p => p[0] === clave); return x ? x[1] : null; };
export const nombreLineal = (l, ajustes) => (l.tipo === 'otro' ? l.nombre || 'Otro' : l.nombre || buscar(ajustes.lineales, l.tipo) || l.tipo);
export const nombreInterior = (clave, ajustes) => buscar(ajustes.interiores, clave) || clave;

const suma = lista => (lista || []).reduce((s, m) => s + (hay(m.ancho) ? m.ancho : 0), 0);
const resto = (largo, s) => (hay(largo) ? largo - s : null);

// Lo que ocupan los bajos en una pared (con lo que entran los rinconeros de las de al lado) y lo que queda (negativo: se pasa).
// Si la fila toca un pilar (de la pared o de la de al lado, en esa esquina), lo dice: hay que cajear, y el cuadre es hasta la pared siguiente.
export function cuadreBajos(p, datos) {
  const e = rinconerosQueEntran(datos, p), s = suma(p.bajos) + e.izq + e.der, c = { suma: s, resto: resto(p.largo, s) };
  const L = p.largo, ocupa = [];
  if (e.izq + suma(p.bajos) > 0) ocupa.push([0, e.izq + suma(p.bajos)]);
  if (e.der && hay(L)) ocupa.push([L - e.der, L]);
  const choca = tramosPilar(datos, p).some(([a, b]) => ocupa.some(([x, y]) => x < b - 1 && a < y - 1));
  if (choca) { const v = paredesVecinas(datos, p).der; Object.assign(c, { choca: true, hasta: v ? v.letra : null }); }
  return c;
}
// Lo que ocupan los pilares a lo largo de una pared (mm desde la izquierda): los suyos y lo que sobresalen los de las
// paredes de al lado pegados a esta esquina.
const PEGADO = 50;
function tramosPilar(datos, p) {
  const L = p.largo, r = [], pilares = q => (q.elementos || []).filter(x => x.tipo === 'pilar' && hay(x.distancia) && hay(x.ancho));
  pilares(p).forEach(x => {
    const a = x.ref === 'der' ? (hay(L) ? L - x.distancia - x.ancho : null) : x.distancia;
    if (a !== null) r.push([a, a + x.ancho]);
  });
  const enPunta = (q, lado) => pilares(q).find(x => hay(x.fondo) && ((x.ref === 'der') === (lado === 'der') ? x.distancia <= PEGADO : hay(q.largo) && q.largo - x.distancia - x.ancho <= PEGADO));
  const v = paredesVecinas(datos, p);
  const pi = v.izq && v.izq !== p && enPunta(v.izq, 'der'), pd = v.der && v.der !== p && enPunta(v.der, 'izq');
  if (pi) r.push([0, pi.fondo]);
  if (pd && hay(L)) r.push([L - pd.fondo, L]);
  return r;
}
// Arriba ocupan los altos y también las columnas de abajo, que llegan hasta arriba. El alto sobre frigo va encima de su columna: no suma.
export function cuadreAltos(p) { const s = suma((p.altos || []).filter(m => m.tipo !== 'alto_frigo')) + suma((p.bajos || []).filter(esColumna)); return { suma: s, resto: resto(p.largo, s) }; }

// Dónde va cada mueble a lo largo de la pared (mm desde la izquierda). Los bajos, seguidos desde lo que ocupe un rinconero
// de la pared anterior; los altos, seguidos pero saltando las columnas, salvo el alto sobre frigo, que va encima de la suya.
export function situarMuebles(p, datos) {
  const e = rinconerosQueEntran(datos, p), bajos = [], altos = [], columnas = [];
  let s = e.izq;
  for (const m of p.bajos || []) {
    if (!hay(m.ancho)) break;
    bajos.push({ m, desde: s, hasta: s + m.ancho });
    if (esColumna(m)) columnas.push({ m, desde: s, hasta: s + m.ancho, usada: false });
    s += m.ancho;
  }
  s = 0;
  for (const m of p.altos || []) {
    if (!hay(m.ancho)) break;
    if (m.tipo === 'alto_frigo') {
      const c = columnas.find(c => c.m.tipo === 'columna_frigo' && !c.usada && c.hasta > s);
      if (c) { c.usada = true; altos.push({ m, desde: c.desde, hasta: c.desde + m.ancho }); s = Math.max(s, c.desde + m.ancho); continue; }
    }
    let choca;
    while ((choca = columnas.find(c => s < c.hasta && s + m.ancho > c.desde))) s = choca.hasta;
    altos.push({ m, desde: s, hasta: s + m.ancho });
    s += m.ancho;
  }
  return { bajos, altos, entran: e };
}
// Cuerpos de armario contra el hueco más estrecho de los medidos.
export function cuadreCuerpos(d) {
  const anchos = [d.ancho_arriba, d.ancho_medio, d.ancho_abajo].filter(hay), s = suma(d.cuerpos);
  return { suma: s, resto: anchos.length ? Math.min(...anchos) - s : null };
}

// Cuerpos de una pared (vestidor) contra su largo.
export function cuadreCuerposPared(p) { const s = suma(p.cuerpos); return { suma: s, resto: resto(p.largo, s) }; }

// Texto del cuadre para enseñar debajo de cada fila: «quedan 23 cm» o «te pasas 5 cm».
export function textoCuadre(c, unidad) {
  if (!hay(c.resto) || !c.suma) return '';
  const n = v => verMedida(Math.abs(v), unidad) + ' ' + unidad;
  if (c.choca) {
    const con = c.hasta ? ' la pared ' + c.hasta : '';
    const t = c.resto === 0 ? 'cuadra justo' + (con ? ' con' + con : '') : c.resto > 0 ? 'te falta ' + n(c.resto) + (con ? ' para' + con : '') : 'te pasas ' + n(c.resto) + (con ? ' de' + con : '');
    return 'Choca con el pilar (cajear) · ' + t;
  }
  if (c.resto === 0) return 'Cuadra justo';
  return c.resto > 0 ? 'Quedan ' + n(c.resto) : 'Te pasas ' + n(c.resto);
}

// Avisos: pasarse del largo de la pared o del hueco. Quedarse corto no es aviso (se enseña como «quedan»).
export function avisosModulos(ficha, unidad) {
  const l = [], d = ficha.datos, pasa = (campo, que, c) => {
    if (hay(c.resto) && c.resto < 0) l.push({ campo, texto: que + ': ' + (c.choca ? textoCuadre(c, unidad).replace('Choca', 'choca') : 'te pasas ' + verMedida(-c.resto, unidad) + ' ' + unidad) });
  };
  (d.paredes || []).forEach(p => {
    pasa('pared.' + p.id, 'Bajos de la pared ' + p.letra, cuadreBajos(p, d));
    pasa('pared.' + p.id, 'Altos de la pared ' + p.letra, cuadreAltos(p));
    pasa('pared.' + p.id, 'Cuerpos de la pared ' + p.letra, cuadreCuerposPared(p));
  });
  if (ficha.tipo === 'armario') pasa('cuerpos', 'Los cuerpos', cuadreCuerpos(d));
  return l;
}

export const acabadosNuevos = () => ({ bitono: null, modelo: '', color: '', modelo_altos: '', color_altos: '', modelo_bajos: '', color_bajos: '', encimera: { material: '', color: '', grueso: null }, lineales: [] });

// Electrodomésticos de la cocina: qué son, de qué tipo, su ancho (cm) y el modelo si se sabe.
export const ELECTRO = [
  ['frigo', 'Frigorífico', [['integrable', 'Integrable'], ['libre', 'Libre'], ['americano', 'Americano']]],
  ['horno', 'Horno', [['columna', 'En columna'], ['bajo', 'Bajo encimera']]],
  ['microondas', 'Microondas', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['placa', 'Placa', [['induccion', 'Inducción'], ['vitro', 'Vitro'], ['gas', 'Gas']]],
  ['campana', 'Campana', [['decorativa', 'Decorativa'], ['extraible', 'Extraíble'], ['integrada', 'Integrada'], ['techo', 'De techo'], ['isla', 'De isla']]],
  ['lavavajillas', 'Lavavajillas', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['lavadora', 'Lavadora', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['otro', 'Otro', []],
];
export const datosElectro = clave => ELECTRO.find(e => e[0] === clave) || ['otro', 'Otro', []];
export const electroNuevo = clave => ({ id: id(), clave, tipo: null, ancho: null, modelo: '', nombre: '' });
export const nombreElectro = e => (e.clave === 'otro' ? e.nombre || 'Otro' : datosElectro(e.clave)[1]);
export function textoElectro(e) {
  const tipo = (datosElectro(e.clave)[2].find(t => t[0] === e.tipo) || [])[1];
  const partes = [tipo && tipo.toLowerCase(), hay(e.ancho) ? verMedida(e.ancho, 'cm') + ' cm' : null, e.modelo && e.modelo.trim()].filter(Boolean);
  return nombreElectro(e) + (partes.length ? ': ' + partes.join(' · ') : '');
}

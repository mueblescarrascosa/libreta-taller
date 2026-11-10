// Módulos de cocina (bajos y altos, de izquierda a derecha), cuerpos de armario y lineales de los acabados.
import { verMedida } from './unidades.js';

const id = () => crypto.randomUUID();
const hay = v => v !== null && v !== undefined;

export const TIPOS_MODULO = {
  bajos: ['bajo', 'fregadero', 'placa', 'cajonero', 'lavavajillas', 'rinconero', 'columna_hmo', 'columna_frigo', 'hueco', 'otro'],
  altos: ['alto', 'alto_campana', 'hueco', 'otro'],
};
export const NOMBRE_MODULO = {
  bajo: 'Bajo', fregadero: 'Fregadero', placa: 'Placa', cajonero: 'Cajonero', lavavajillas: 'Lavavajillas', rinconero: 'Rinconero',
  columna_hmo: 'Columna H/MO', columna_frigo: 'Columna frigo', hueco: 'Hueco', alto: 'Alto', alto_campana: 'Alto campana', otro: 'Otro',
};
export const esColumna = m => m.tipo === 'columna_hmo' || m.tipo === 'columna_frigo';

export const moduloNuevo = tipo => ({ id: id(), tipo, ancho: null, nombre: '' });
export const lineaNueva = tipo => ({ id: id(), tipo, modelo: '', nombre: '' });

export const nombreModulo = m => (m.tipo === 'otro' ? m.nombre || 'Otro' : NOMBRE_MODULO[m.tipo] || m.tipo);
const buscar = (lista, clave) => { const x = (lista || []).find(p => p[0] === clave); return x ? x[1] : null; };
export const nombreLineal = (l, ajustes) => (l.tipo === 'otro' ? l.nombre || 'Otro' : l.nombre || buscar(ajustes.lineales, l.tipo) || l.tipo);
export const nombreInterior = (clave, ajustes) => buscar(ajustes.interiores, clave) || clave;

const suma = lista => (lista || []).reduce((s, m) => s + (hay(m.ancho) ? m.ancho : 0), 0);
const resto = (largo, s) => (hay(largo) ? largo - s : null);

// Lo que ocupan los bajos en una pared y lo que queda (negativo: se pasa).
export function cuadreBajos(p) { const s = suma(p.bajos); return { suma: s, resto: resto(p.largo, s) }; }
// Arriba ocupan los altos y también las columnas de abajo, que llegan hasta arriba.
export function cuadreAltos(p) { const s = suma(p.altos) + suma((p.bajos || []).filter(esColumna)); return { suma: s, resto: resto(p.largo, s) }; }
// Cuerpos de armario contra el hueco más estrecho de los medidos.
export function cuadreCuerpos(d) {
  const anchos = [d.ancho_arriba, d.ancho_medio, d.ancho_abajo].filter(hay), s = suma(d.cuerpos);
  return { suma: s, resto: anchos.length ? Math.min(...anchos) - s : null };
}

// Texto del cuadre para enseñar debajo de cada fila: «quedan 23 cm» o «te pasas 5 cm».
export function textoCuadre(c, unidad) {
  if (!hay(c.resto) || !c.suma) return '';
  if (c.resto === 0) return 'Cuadra justo';
  return c.resto > 0 ? 'Quedan ' + verMedida(c.resto, unidad) + ' ' + unidad : 'Te pasas ' + verMedida(-c.resto, unidad) + ' ' + unidad;
}

// Avisos: pasarse del largo de la pared o del hueco. Quedarse corto no es aviso (se enseña como «quedan»).
export function avisosModulos(ficha, unidad) {
  const l = [], d = ficha.datos, pasa = (campo, que, c) => {
    if (hay(c.resto) && c.resto < 0) l.push({ campo, texto: que + ': te pasas ' + verMedida(-c.resto, unidad) + ' ' + unidad });
  };
  (d.paredes || []).forEach(p => {
    pasa('pared.' + p.id, 'Bajos de la pared ' + p.letra, cuadreBajos(p));
    pasa('pared.' + p.id, 'Altos de la pared ' + p.letra, cuadreAltos(p));
  });
  if (ficha.tipo === 'armario') pasa('cuerpos', 'Los cuerpos', cuadreCuerpos(d));
  return l;
}

export const acabadosNuevos = () => ({ bitono: null, modelo: '', color: '', modelo_altos: '', color_altos: '', modelo_bajos: '', color_bajos: '', encimera: { material: '', color: '', grueso: null }, lineales: [] });

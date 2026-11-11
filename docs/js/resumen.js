// Resumen de una ficha como texto para WhatsApp (*negrita*), con las medidas en su unidad.
import { verMedida } from './unidades.js';
import { tituloFicha } from './util.js';
import { resumenPuerta, nombreElemento, camposDeElemento, textoAzulejo, extraPilar } from './modelo.js';
import { nombreModulo, cuadreBajos, cuadreAltos, cuadreCuerposPared, textoCuadre, nombreLineal, nombreInterior, textoElectro } from './modulos.js';

const hay = v => v !== null && v !== undefined && v !== '';
const unir = (partes, sep = ' · ') => partes.filter(hay).join(sep);

// Unidades de una ficha: la del trabajo para casi todo; metros en paredes si así se apuntan.
export function unidadesDe(ficha, trabajo, ajustes) {
  const u = (trabajo && trabajo.unidad) || ajustes.unidad, d = ficha.datos;
  return { u, pared: (d.paredes_m ?? ajustes.paredes_m) ? 'm' : u };
}

function lineaElemento(e, u, delPilar = false) {
  const c = camposDeElemento(e.tipo), ud = e.tipo === 'pilar' ? 'cm' : u, v = mm => verMedida(mm, ud) + ' ' + ud;
  const partes = [], lado = e.ref === 'der' ? 'derecha' : 'izquierda';
  if (hay(e.distancia)) partes.push('a ' + v(e.distancia) + (delPilar ? ' desde el pilar de la ' + lado : ' desde la ' + lado));
  if (c.altura && hay(e.altura)) partes.push('altura ' + v(e.altura));
  if (c.ancho && hay(e.ancho)) partes.push('ancho ' + v(e.ancho));
  if (c.alto && e.techo) partes.push('hasta el techo');
  else if (c.alto && hay(e.alto)) partes.push('alto ' + v(e.alto));
  if (c.fondo && hay(e.fondo)) partes.push('sobresale ' + v(e.fondo));
  return '- ' + nombreElemento(e) + (partes.length ? ': ' + partes.join(', ') : '');
}

function lineaModulos(nombre, lista, cuadre) {
  if (!lista || !lista.length) return null;
  const t = lista.map(m => nombreModulo(m) + (hay(m.ancho) ? ' ' + verMedida(m.ancho, 'cm') : '')).join(', ');
  const c = textoCuadre(cuadre, 'cm');
  return '- ' + nombre + ': ' + t + (c ? ' (' + c.charAt(0).toLowerCase() + c.slice(1) + ')' : '');
}

const textoCuerpo = (c, ajustes) => unir([hay(c.ancho) ? verMedida(c.ancho, 'cm') : '?', c.interior ? (c.interior === 'otro' ? c.nombre || 'otro' : nombreInterior(c.interior, ajustes).toLowerCase()) : null], ' ');

function bloquePared(p, ud, u, ajustes, d) {
  const l = [unir(['*Pared ' + p.letra + '*', hay(p.largo) ? verMedida(p.largo, ud) + ' ' + ud : null, hay(p.alto) ? 'alto ' + verMedida(p.alto, ud) + ' ' + ud : null, textoAzulejo(p, ud) || null])];
  if ((p.cuerpos || []).length) {
    const c = textoCuadre(cuadreCuerposPared(p), 'cm');
    l.push('- Cuerpos: ' + p.cuerpos.map(x => textoCuerpo(x, ajustes)).join(', ') + (c ? ' (' + c.charAt(0).toLowerCase() + c.slice(1) + ')' : ''));
  }
  (p.elementos || []).forEach(e => l.push(lineaElemento(e, u, extraPilar(d, p, e) > 0)));
  l.push(lineaModulos('Bajos', p.bajos, cuadreBajos(p)), (p.altos || []).length ? lineaModulos('Altos', p.altos, cuadreAltos(p)) : null);
  return l.filter(hay);
}

function acabadosTexto(ac, ajustes) {
  if (!ac) return [];
  const l = [];
  if (ac.bitono) { l.push(unir(['Altos: ' + unir([ac.modelo_altos, ac.color_altos], ' ')]), unir(['Bajos: ' + unir([ac.modelo_bajos, ac.color_bajos], ' ')])); }
  else if (hay(ac.modelo) || hay(ac.color)) l.push('Muebles: ' + unir([ac.modelo, ac.color], ' '));
  const e = ac.encimera || {};
  if (hay(e.material) || hay(e.color) || hay(e.grueso)) l.push('Encimera: ' + unir([e.material, e.color, hay(e.grueso) ? e.grueso + ' mm' : null], ' '));
  (ac.lineales || []).forEach(x => l.push(nombreLineal(x, ajustes) + (hay(x.modelo) ? ': ' + x.modelo : '')));
  return l.filter(x => !/^(Altos|Bajos): $/.test(x));
}

// Bloques de líneas (la primera de cada bloque suele ser un título entre asteriscos).
export function bloquesResumen({ ficha, trabajo, ajustes }) {
  const d = ficha.datos, { u, pared } = unidadesDe(ficha, trabajo, ajustes), v = (mm, ud = u) => verMedida(mm, ud);
  const bloques = [];
  if (trabajo) bloques.push(['*' + (trabajo.nombre || 'Trabajo') + '*', unir([trabajo.cliente, trabajo.direccion])].filter(hay));
  const cab = ['*' + tituloFicha(ficha) + '*'];
  if (ficha.tipo === 'puerta') {
    const mc = unir([hay(d.modelo) ? 'Modelo: ' + d.modelo : null, hay(d.color) ? 'Color: ' + d.color : null]);
    if (mc) cab.push(mc);
    (d.puertas || []).forEach((p, i) => cab.push((i + 1) + '. ' + (p.nombre || 'Puerta ' + (i + 1)) + ': ' + resumenPuerta(p, u)));
    bloques.push(cab);
  } else if (ficha.tipo === 'cocina' || ficha.subtipo === 'vestidor') {
    if (hay(d.alto_techo)) cab.push('Altura: ' + v(d.alto_techo, pared) + ' ' + pared);
    cab.push(...acabadosTexto(d.acabados, ajustes));
    (d.electro || []).forEach(e => cab.push(textoElectro(e)));
    bloques.push(cab);
    (d.paredes || []).forEach(p => bloques.push(bloquePared(p, pared, u, ajustes, d)));
  } else {
    bloques.push(cab);
  }
  if (ficha.tipo === 'armario') {
    const l = [], tri = [['arriba', d.ancho_arriba], ['en medio', d.ancho_medio], ['abajo', d.ancho_abajo]].filter(x => hay(x[1]));
    if (tri.length) l.push('Ancho del hueco: ' + tri.map(x => x[0] + ' ' + v(x[1])).join(', ') + ' ' + u);
    const altos = [['izquierda', d.alto_izq], ['derecha', d.alto_der]].filter(x => hay(x[1]));
    if (altos.length) l.push('Alto del hueco: ' + altos.map(x => x[0] + ' ' + v(x[1])).join(', ') + ' ' + u);
    if (hay(d.diag_1) || hay(d.diag_2)) l.push('Diagonales: ' + [d.diag_1, d.diag_2].filter(hay).map(x => v(x)).join(' y ') + ' ' + u);
    if (hay(d.fondo)) l.push('Fondo: ' + v(d.fondo) + ' ' + u);
    if (hay(d.rodapie_alto) || hay(d.rodapie_grosor)) l.push('Rodapié: ' + unir([hay(d.rodapie_alto) ? 'alto ' + v(d.rodapie_alto) + ' ' + u : null, hay(d.rodapie_grosor) ? 'grosor ' + v(d.rodapie_grosor) + ' ' + u : null], ', '));
    if (hay(d.hojas)) l.push('Hojas: ' + d.hojas);
    if (hay(d.puertas) && !Array.isArray(d.puertas)) l.push('Puertas: ' + d.puertas);
    if ((d.cuerpos || []).length) l.push('Cuerpos: ' + d.cuerpos.map(c => textoCuerpo(c, ajustes)).join(', '));
    (d.enchufes || []).forEach(e => l.push(lineaElemento(Object.assign({ tipo: 'enchufe' }, e), u)));
    bloques[bloques.length - 1].push(...l);
  }
  const libres = (d.libres || []).filter(m => hay(m.nombre) || hay(m.mm)).map(m => (m.nombre || 'Medida') + ': ' + (hay(m.mm) ? v(m.mm) + ' ' + u : '—'));
  if (libres.length) bloques.push(['*Otras medidas*', ...libres]);
  const notas = (d.notas || []).map(n => String(n.texto || '').trim()).filter(Boolean);
  if (notas.length) bloques.push(['*Notas*', ...notas]);
  return bloques.filter(b => b.length);
}

// Abre WhatsApp con el texto ya escrito (WhatsApp pregunta a quién).
export const urlWhatsapp = t => 'https://wa.me/?text=' + encodeURIComponent(t);

export function textoResumen(o) {
  return bloquesResumen(o).map(b => b.join('\n')).join('\n\n');
}

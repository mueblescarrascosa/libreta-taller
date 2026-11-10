// Modelo de datos: fichas, elementos, avisos y búsqueda. Sin pantallas ni red.
import { verMedida } from './unidades.js';

const MARGEN = 10, MAXIMO = 20000;
const id = () => crypto.randomUUID();
const ahora = () => new Date().toISOString();

export const TIPOS_ELEMENTO = {
  cocina: ['humos', 'desague', 'agua', 'gas', 'enchufe_horno', 'enchufe_microondas', 'enchufe_frigo', 'enchufe_lavavajillas', 'ventana', 'puerta', 'pilar', 'otro'],
  vestidor: ['enchufe', 'ventana', 'puerta', 'pilar', 'otro'],
};
export const NOMBRE_ELEMENTO = {
  humos: 'Salida de humos', desague: 'Desagüe', agua: 'Toma de agua', gas: 'Gas', enchufe_horno: 'Enchufe horno', enchufe_microondas: 'Enchufe microondas',
  enchufe_frigo: 'Enchufe frigorífico', enchufe_lavavajillas: 'Enchufe lavavajillas', enchufe: 'Enchufe', ventana: 'Ventana', puerta: 'Puerta', pilar: 'Pilar', otro: 'Otro',
};

export function camposDeElemento(tipo) {
  if (tipo === 'ventana' || tipo === 'puerta') return { ancho: true, alto: true, punto: 'borde' };
  if (tipo === 'pilar') return { ancho: true, alto: false, punto: 'borde' };
  return { ancho: false, alto: false, punto: 'centro' };
}

export function trabajoNuevo(nombre, unidad) {
  return { id: id(), nombre, cliente: '', direccion: '', unidad, creado_at: ahora(), updated_at: null, borrado_at: null };
}

function datosDe(tipo, subtipo) {
  const c = { libres: [], notas: [], ref_ultima: 'izq' };
  if (tipo === 'puerta') return Object.assign(c, { ancho: null, alto: null, tabique: null, mano: null, condena: null, vidriera: null });
  if (tipo === 'cocina') return Object.assign(c, { alto_techo: null, paredes: [] });
  if (tipo === 'armario') {
    Object.assign(c, { ancho_arriba: null, ancho_medio: null, ancho_abajo: null, alto_izq: null, alto_der: null, fondo: null, rodapie_alto: null, rodapie_grosor: null, enchufes: [] });
    if (subtipo === 'corredera') c.hojas = null;
    if (subtipo === 'abatible') c.puertas = null;
    if (subtipo === 'vestidor') c.paredes = [];
  }
  return c;
}

export function fichaNueva(tipo, subtipo, trabajoId) {
  return { id: id(), trabajo_id: trabajoId, tipo, subtipo: subtipo || null, nombre: '', datos: datosDe(tipo, subtipo), creado_at: ahora(), updated_at: null, borrado_at: null };
}

export function elementoNuevo(tipo, refUltima) {
  return { id: id(), tipo, nombre: '', distancia: null, ref: refUltima || 'izq', altura: null, ancho: null, alto: null };
}

export function paredNueva(paredes) {
  const usadas = new Set(paredes.map(p => p.letra));
  let n = 0, letra;
  do { letra = n < 26 ? String.fromCharCode(65 + n) : 'P' + (n + 1); n++; } while (usadas.has(letra));
  return { id: id(), letra, largo: null, elementos: [] };
}

const hay = v => v !== null && v !== undefined;

function revisarMaximo(lista, campo, nombre, v, unidad) {
  if (hay(v) && v > MAXIMO) lista.push({ campo, texto: nombre + ': ' + verMedida(v, unidad) + ' ' + unidad + ' parece demasiado' });
}
function revisarTamano(lista, campo, nombre, v, unidad) {
  if (v === 0) lista.push({ campo, texto: nombre + ': no puede ser 0' });
  else revisarMaximo(lista, campo, nombre, v, unidad);
}
function revisarDiferencia(lista, campo, nombre, valores, unidad) {
  const v = valores.filter(hay);
  if (v.length < 2) return;
  const dif = Math.max(...v) - Math.min(...v);
  if (dif > MARGEN) lista.push({ campo, texto: nombre + ' difieren ' + verMedida(dif, unidad) + ' ' + unidad });
}

function avisosParedes(lista, paredes, unidad) {
  (paredes || []).forEach(p => {
    revisarTamano(lista, 'pared.' + p.id, 'Pared ' + p.letra, p.largo, unidad);
    p.elementos.forEach(e => {
      const campo = 'elemento.' + e.id, nombre = e.nombre || NOMBRE_ELEMENTO[e.tipo] || e.tipo;
      revisarMaximo(lista, campo, nombre, e.distancia, unidad);
      revisarMaximo(lista, campo, nombre + ' (altura)', e.altura, unidad);
      revisarTamano(lista, campo, nombre + ' (ancho)', e.ancho, unidad);
      revisarTamano(lista, campo, nombre + ' (alto)', e.alto, unidad);
      if (hay(p.largo) && hay(e.distancia) && e.distancia + (e.ancho || 0) > p.largo) {
        lista.push({ campo, texto: nombre + ' se sale de la pared ' + p.letra + ' (' + verMedida(p.largo, unidad) + ' ' + unidad + ')' });
      }
    });
  });
}

export function avisos(ficha, unidad) {
  const d = ficha.datos, l = [];
  if (ficha.tipo === 'puerta') {
    revisarTamano(l, 'ancho', 'Ancho', d.ancho, unidad);
    revisarTamano(l, 'alto', 'Alto', d.alto, unidad);
    revisarTamano(l, 'tabique', 'Tabique', d.tabique, unidad);
  }
  if (ficha.tipo === 'cocina') revisarTamano(l, 'alto_techo', 'Altura', d.alto_techo, unidad);
  if (ficha.tipo === 'armario') {
    [['ancho_arriba', 'Ancho arriba'], ['ancho_medio', 'Ancho en medio'], ['ancho_abajo', 'Ancho abajo'], ['alto_izq', 'Alto izquierda'], ['alto_der', 'Alto derecha'], ['fondo', 'Fondo'], ['rodapie_alto', 'Alto de rodapié']]
      .forEach(([c, n]) => revisarTamano(l, c, n, d[c], unidad));
    revisarMaximo(l, 'rodapie_grosor', 'Grosor de rodapié', d.rodapie_grosor, unidad);
    revisarDiferencia(l, 'anchos', 'Los anchos', [d.ancho_arriba, d.ancho_medio, d.ancho_abajo], unidad);
    revisarDiferencia(l, 'altos', 'Los altos', [d.alto_izq, d.alto_der], unidad);
    (d.enchufes || []).forEach(e => {
      revisarMaximo(l, 'enchufe.' + e.id, 'Enchufe', e.distancia, unidad);
      revisarMaximo(l, 'enchufe.' + e.id, 'Enchufe (altura)', e.altura, unidad);
    });
  }
  avisosParedes(l, d.paredes, unidad);
  d.libres.forEach(m => revisarMaximo(l, 'libre.' + m.id, m.nombre || 'Medida', m.mm, unidad));
  return l;
}

const norma = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function textoFicha(f) {
  const d = f.datos || {}, t = [f.nombre];
  (d.notas || []).forEach(n => t.push(n.texto));
  (d.libres || []).forEach(m => t.push(m.nombre));
  (d.paredes || []).forEach(p => p.elementos.forEach(e => t.push(e.nombre)));
  return t.join(' ');
}

export function buscar(consulta, trabajos, fichas) {
  const q = norma(consulta).trim();
  const vivos = l => l.filter(x => !x.borrado_at);
  if (!q) return { trabajos: vivos(trabajos), fichas: vivos(fichas) };
  return {
    trabajos: vivos(trabajos).filter(t => norma([t.nombre, t.cliente, t.direccion].join(' ')).includes(q)),
    fichas: vivos(fichas).filter(f => norma(textoFicha(f)).includes(q)),
  };
}

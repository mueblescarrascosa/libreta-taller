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
  enchufe_frigo: 'Enchufe frigorífico', enchufe_lavavajillas: 'Enchufe lavavajillas', enchufe: 'Enchufe', ventana: 'Ventana', puerta: 'Puerta', pilar: 'Pilar o columna', otro: 'Otro',
};

export function camposDeElemento(tipo) {
  if (tipo === 'ventana' || tipo === 'puerta') return { ancho: true, alto: true, fondo: false, altura: true, punto: 'borde' };
  if (tipo === 'pilar') return { ancho: true, alto: false, fondo: true, altura: false, punto: 'borde' };
  return { ancho: false, alto: false, fondo: false, altura: true, punto: 'centro' };
}

// Lo que no es información: identificadores, letras de pared y referencias por defecto.
const SIN_INFO = new Set(['id', 'letra', 'ref', 'ref_ultima', 'paredes_m']);

// ¿Hay algo apuntado? Cuenta cualquier texto, número, sí/no o elemento añadido.
export function tieneInformacion(v, clave) {
  if (clave && SIN_INFO.has(clave)) return false;
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number' || typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.some(x => tieneInformacion(x));
  return Object.keys(v).some(k => tieneInformacion(v[k], k));
}

// Quita las notas en blanco y las medidas sin nombre ni valor. No cambia el original.
export function limpiarDatos(d) {
  return Object.assign({}, d, {
    notas: (d.notas || []).filter(n => String(n.texto || '').trim()),
    libres: (d.libres || []).filter(m => tieneInformacion(m)),
  });
}

export function trabajoNuevo(nombre, unidad) {
  return { id: id(), nombre, cliente: '', direccion: '', unidad, creado_at: ahora(), updated_at: null, borrado_at: null };
}

// Botones de medida habitual (en mm): anchos de puerta, altos y grosores de tabique.
export const RAPIDAS_PUERTA = { ancho: [920, 820, 720, 620], alto: [2030, 2110], tabique: [70, 90, 110] };
const CAMPOS_PUERTA = ['ancho', 'alto', 'tabique', 'mano', 'condena', 'vidriera'];

// En un mismo piso el tabique suele repetirse: la puerta nueva lo copia de la anterior.
export function puertaNueva(anterior) {
  return { id: id(), nombre: '', ancho: null, alto: null, tabique: anterior ? anterior.tabique ?? null : null, mano: null, condena: null, vidriera: null };
}

// Las fichas de puerta antiguas tenían una sola puerta con los datos sueltos: pasan a la lista.
export function normalizarFicha(f) {
  if (f.tipo !== 'puerta' || Array.isArray(f.datos.puertas)) return f;
  const d = Object.assign({}, f.datos), p = Object.assign(puertaNueva(null), { nombre: f.nombre || '' });
  CAMPOS_PUERTA.forEach(k => { if (k in d) p[k] = d[k]; delete d[k]; });
  if (d.mal) { p.mal = d.mal; delete d.mal; }
  d.puertas = [p];
  return Object.assign({}, f, { nombre: '', datos: d });
}

export function resumenPuerta(p, unidad) {
  const t = [], v = mm => verMedida(mm, unidad);
  if (hay(p.ancho) && hay(p.alto)) t.push(v(p.ancho) + ' × ' + v(p.alto) + ' ' + unidad);
  else if (hay(p.ancho)) t.push('ancho ' + v(p.ancho) + ' ' + unidad);
  else if (hay(p.alto)) t.push('alto ' + v(p.alto) + ' ' + unidad);
  if (hay(p.tabique)) t.push('tabique ' + v(p.tabique));
  if (p.mano) t.push(p.mano === 'izq' ? 'izquierda' : 'derecha');
  if (p.condena) t.push('condena');
  if (p.vidriera) t.push('vidriera');
  return t.length ? t.join(' · ') : 'sin medidas';
}

function datosDe(tipo, subtipo) {
  const c = { libres: [], notas: [], ref_ultima: 'izq' };
  if (tipo === 'puerta') return Object.assign(c, { puertas: [puertaNueva(null)] });
  if (tipo === 'cocina') return Object.assign(c, { alto_techo: null, paredes: [paredNueva([])] });
  if (tipo === 'armario') {
    Object.assign(c, { ancho_arriba: null, ancho_medio: null, ancho_abajo: null, alto_izq: null, alto_der: null, fondo: null, rodapie_alto: null, rodapie_grosor: null, enchufes: [] });
    if (subtipo === 'corredera') c.hojas = null;
    if (subtipo === 'abatible') c.puertas = null;
    if (subtipo === 'vestidor') c.paredes = [paredNueva([])];
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
  return { id: id(), letra, largo: null, alto: null, elementos: [] };
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
    revisarTamano(lista, 'pared.' + p.id, 'Alto de la pared ' + p.letra, p.alto, unidad);
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
    (d.puertas || []).forEach((p, i) => {
      const campo = 'puerta.' + p.id, n = (p.nombre || 'Puerta ' + (i + 1)) + ': ';
      revisarTamano(l, campo, n + 'ancho', p.ancho, unidad);
      revisarTamano(l, campo, n + 'alto', p.alto, unidad);
      revisarTamano(l, campo, n + 'tabique', p.tabique, unidad);
    });
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
  (Array.isArray(d.puertas) ? d.puertas : []).forEach(p => t.push(p.nombre));
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

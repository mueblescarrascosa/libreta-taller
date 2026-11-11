// Modelo de datos: fichas, elementos, avisos y búsqueda. Sin pantallas ni red.
import { verMedida } from './unidades.js';
import { avisosModulos, acabadosNuevos } from './modulos.js';

const MAXIMO = 20000;
const id = () => crypto.randomUUID();
const ahora = () => new Date().toISOString();

// Botones para añadir: pocos; de qué es cada toma o enchufe se elige después (campo «para»).
// Los tipos antiguos (agua, gas, enchufe_horno…) siguen teniendo nombre para las fichas ya hechas.
export const TIPOS_ELEMENTO = {
  cocina: ['humos', 'desague', 'toma', 'enchufe', 'ventana', 'puerta', 'pilar', 'otro'],
  vestidor: ['enchufe', 'ventana', 'puerta', 'pilar', 'otro'],
};
// Valores de fábrica de lo que se puede cambiar en Ajustes (compartidos entre dispositivos). Medidas en mm.
export const AJUSTES_FABRICA = {
  unidad: 'mm', paredes_m: true, margen: 10,
  puerta_anchos: [920, 820, 720, 620], puerta_altos: [2030, 2110], puerta_tabiques: [70, 90, 110],
  modulo_anchos: [300, 400, 450, 500, 600, 800, 900, 1000, 1200],
  usos_toma: [['agua', 'Agua'], ['termo', 'Termo'], ['gas', 'Gas']],
  usos_enchufe: [['general', 'General'], ['hmo', 'H/MO (columna)'], ['placa', 'Placa'], ['campana', 'Campana'], ['frigo', 'Frigorífico'], ['lavavajillas', 'Lavavajillas'], ['lavadora', 'Lavadora'], ['termo', 'Termo']],
  lineales: [['zocalo', 'Zócalo'], ['cornisa', 'Cornisa'], ['moldura', 'Moldura'], ['led', 'Tira LED'], ['tapajuntas', 'Tapajuntas']],
  interiores: [['barra', 'Barra'], ['doble_barra', 'Doble barra'], ['estantes', 'Estantes'], ['cajonera', 'Cajonera'], ['zapatero', 'Zapatero']],
};
export const USOS = { toma: AJUSTES_FABRICA.usos_toma, enchufe: AJUSTES_FABRICA.usos_enchufe };

const copiar = v => JSON.parse(JSON.stringify(v));
const listaNumeros = v => Array.isArray(v) && v.every(x => Number.isInteger(x) && x > 0);
const listaPares = v => Array.isArray(v) && v.every(x => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string');

// Ajustes completos: lo guardado si es válido; si no, el valor de fábrica.
export function mezclarAjustes(g) {
  const a = copiar(AJUSTES_FABRICA), d = g && typeof g === 'object' ? g : {};
  if (['mm', 'cm'].includes(d.unidad)) a.unidad = d.unidad;
  if (typeof d.paredes_m === 'boolean') a.paredes_m = d.paredes_m;
  if (Number.isInteger(d.margen) && d.margen > 0) a.margen = d.margen;
  ['puerta_anchos', 'puerta_altos', 'puerta_tabiques', 'modulo_anchos'].forEach(k => { if (listaNumeros(d[k])) a[k] = copiar(d[k]); });
  ['usos_toma', 'usos_enchufe', 'lineales', 'interiores'].forEach(k => { if (listaPares(d[k])) a[k] = copiar(d[k]); });
  return a;
}

// Clave para un texto que añade el usuario: «Vitrocerámica grande» → vitroceramica_grande.
export function claveDe(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
}
export const NOMBRE_ELEMENTO = {
  humos: 'Salida de humos', desague: 'Desagüe', toma: 'Toma', agua: 'Toma de agua', gas: 'Gas', enchufe_hmo: 'Enchufe H/MO (columna)', enchufe_horno: 'Enchufe horno', enchufe_microondas: 'Enchufe microondas',
  enchufe_frigo: 'Enchufe frigorífico', enchufe_lavavajillas: 'Enchufe lavavajillas', enchufe: 'Enchufe', ventana: 'Ventana', puerta: 'Puerta', pilar: 'Mocheta (pilar)', zona: 'Zona azulejada', otro: 'Otro',
};

export function nombreElemento(e) {
  if (e.tipo === 'otro') return e.nombre || 'Otro';
  if (e.tipo === 'zona') return 'Zona azulejada' + (e.nombre ? ' (' + e.nombre + ')' : '');
  const uso = USOS[e.tipo] && USOS[e.tipo].find(u => u[0] === e.para), texto = e.para_nombre || (uso && uso[1]);
  if (texto && (e.tipo === 'toma' || e.tipo === 'enchufe')) return e.tipo === 'toma' ? 'Toma de ' + texto.toLowerCase() : 'Enchufe ' + texto;
  return NOMBRE_ELEMENTO[e.tipo] || e.tipo;
}

// Azulejo de una pared, en una frase: «azulejo desde 0,9 hasta el techo».
export function textoAzulejo(p, unidad) {
  const v = mm => verMedida(mm, unidad);
  if (p.azulejo === 'no') return 'sin azulejo';
  if (p.azulejo === 'toda') return 'azulejo en toda la pared';
  if (p.azulejo === 'zonas') return 'azulejo por zonas';
  if (p.azulejo !== 'franja') return '';
  // La franja puede llevar además zonas (la de la campana, por ejemplo).
  const zonas = (p.elementos || []).some(e => e.tipo === 'zona') ? ' + zonas' : '';
  const desde = hay(p.azulejo_desde), hasta = !p.azulejo_techo && hay(p.azulejo_hasta);
  if (!desde && !hasta && !p.azulejo_techo) return 'azulejo en franja' + zonas;
  let t = 'azulejo';
  if (desde) t += ' desde ' + v(p.azulejo_desde) + (hasta ? '' : ' ' + unidad);
  if (p.azulejo_techo) t += ' hasta el techo';
  else if (hasta) t += ' hasta ' + v(p.azulejo_hasta) + ' ' + unidad;
  return t + zonas;
}

export function camposDeElemento(tipo) {
  if (tipo === 'ventana' || tipo === 'puerta' || tipo === 'zona') return { ancho: true, alto: true, fondo: false, altura: true, punto: 'borde' };
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
export const RAPIDAS_PUERTA = { ancho: AJUSTES_FABRICA.puerta_anchos, alto: AJUSTES_FABRICA.puerta_altos, tabique: AJUSTES_FABRICA.puerta_tabiques };
const CAMPOS_PUERTA = ['ancho', 'alto', 'tabique', 'mano', 'condena', 'vidriera'];

// En un mismo piso el tabique suele repetirse: la puerta nueva lo copia de la anterior.
export function puertaNueva(anterior) {
  return { id: id(), nombre: '', tipo: null, ancho: null, alto: null, tabique: anterior ? anterior.tabique ?? null : null, mano: null, condena: null, vidriera: null };
}
// Tipo de puerta: la abatible de una hoja es la normal y no se repite en los resúmenes.
// «fija» era un tipo antiguo: ya no se ofrece (el paño fijo es un añadido de la puerta), pero se sigue enseñando si estaba puesto.
export const TIPOS_PUERTA = [['abatible', 'Abatible'], ['corredera', 'Corredera'], ['doble', 'Doble']];
export const tiposPuertaPara = p => (p.tipo === 'fija' ? [...TIPOS_PUERTA, ['fija', 'Fija (antiguo)']] : TIPOS_PUERTA);
const ladoTexto = l => (l === 'izq' ? 'a la izquierda' : l === 'der' ? 'a la derecha' : '');

// Doble con hojas distintas: se apunta la que abre y la otra es lo que queda del ancho.
// Con paño fijo, «ancho» es el total del hueco: se apunta la puerta y el paño es lo que queda.
export const anchoPuerta = p => (p.fijo ? (hay(p.puerta_ancho) ? p.puerta_ancho : null) : p.ancho);
export const anchoFijo = p => (p.fijo && hay(p.ancho) && hay(p.puerta_ancho) && p.ancho > p.puerta_ancho ? p.ancho - p.puerta_ancho : null);
export const otraHoja = p => { const a = anchoPuerta(p); return hay(a) && hay(p.hoja1) && a > p.hoja1 ? a - p.hoja1 : null; };
// Doble: hojas iguales o el ancho de cada una. Paño fijo: su ancho y a qué lado (mirando desde el pasillo).
export function textoTipoPuerta(p, unidad) {
  const v = mm => verMedida(mm, unidad), t = [];
  if (p.tipo === 'corredera') t.push('corredera');
  if (p.tipo === 'fija') t.push('fija');
  if (p.tipo === 'doble') {
    if (p.hojas_iguales === true) t.push('doble, hojas iguales');
    else if (p.hojas_iguales === false && hay(p.hoja1)) { const o = otraHoja(p); t.push('doble, hojas ' + v(p.hoja1) + ' + ' + (o !== null ? v(o) : '?') + ' ' + unidad); }
    else if (p.hojas_iguales === false) t.push('doble, hojas distintas');
    else t.push('doble');
  }
  if (p.fijo) {
    const f = anchoFijo(p);
    t.push([hay(p.puerta_ancho) ? 'puerta ' + v(p.puerta_ancho) + ' ' + unidad + ' +' : null, 'paño fijo', f !== null ? v(f) + ' ' + unidad : null, ladoTexto(p.fijo_lado)].filter(Boolean).join(' '));
  }
  return t.join(' · ');
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
  const tipo = textoTipoPuerta(p, unidad);
  if (tipo) t.push(tipo);
  if (p.mano) t.push(p.mano === 'izq' ? 'izquierda' : 'derecha');
  if (p.condena) t.push('condena');
  if (p.vidriera) t.push('vidriera');
  return t.length ? t.join(' · ') : 'sin medidas';
}

function datosDe(tipo, subtipo) {
  const c = { libres: [], notas: [], ref_ultima: 'izq' };
  if (tipo === 'puerta') return Object.assign(c, { modelo: '', color: '', puertas: [puertaNueva(null)] });
  if (tipo === 'cocina') return Object.assign(c, { alto_techo: null, acabados: acabadosNuevos(), paredes: [paredNueva([])] });
  if (tipo === 'armario') {
    Object.assign(c, { ancho_arriba: null, ancho_medio: null, ancho_abajo: null, alto_izq: null, alto_der: null, fondo: null, rodapie_alto: null, rodapie_grosor: null, enchufes: [], cuerpos: [] });
    if (subtipo === 'corredera') c.hojas = null;
    if (subtipo === 'abatible') c.puertas = null;
    if (subtipo === 'vestidor') Object.assign(c, { alto_techo: null, paredes: [paredNueva([])] });
  }
  return c;
}

export function fichaNueva(tipo, subtipo, trabajoId) {
  return { id: id(), trabajo_id: trabajoId, tipo, subtipo: subtipo || null, nombre: '', datos: datosDe(tipo, subtipo), creado_at: ahora(), updated_at: null, borrado_at: null };
}

export function elementoNuevo(tipo, refUltima) {
  return { id: id(), tipo, para: null, nombre: '', distancia: null, ref: refUltima || 'izq', altura: null, ancho: null, alto: null };
}

export function paredNueva(paredes) {
  const usadas = new Set(paredes.map(p => p.letra));
  let n = 0, letra;
  do { letra = n < 26 ? String.fromCharCode(65 + n) : 'P' + (n + 1); n++; } while (usadas.has(letra));
  return { id: id(), letra, largo: null, alto: null, elementos: [], bajos: [], altos: [] };
}

const hay = v => v !== null && v !== undefined;

function revisarMaximo(lista, campo, nombre, v, unidad) {
  if (hay(v) && v > MAXIMO) lista.push({ campo, texto: nombre + ': ' + verMedida(v, unidad) + ' ' + unidad + ' parece demasiado' });
}
function revisarTamano(lista, campo, nombre, v, unidad) {
  if (v === 0) lista.push({ campo, texto: nombre + ': no puede ser 0' });
  else revisarMaximo(lista, campo, nombre, v, unidad);
}
function revisarDiferencia(lista, campo, nombre, valores, unidad, margen) {
  const v = valores.filter(hay);
  if (v.length < 2) return;
  const dif = Math.max(...v) - Math.min(...v);
  if (dif > margen) lista.push({ campo, texto: nombre + ' difieren ' + verMedida(dif, unidad) + ' ' + unidad });
}

// ── Pilar en una punta de la pared ──
// Devuelve cuánto ocupa (mm desde la esquina hasta la cara del pilar) o null si no hay.
// Cuenta un pilar de la propia pared pegado a esa punta (5 cm de holgura) y el de la pared vecina en esa esquina,
// que aquí ocupa lo que allí «sobresale».
const HOLGURA_PILAR = 50;
function pilarPropio(p, lado) {
  const L = p.largo;
  for (const e of p.elementos || []) {
    if (e.tipo !== 'pilar' || !hay(e.distancia) || !hay(e.ancho)) continue;
    const mismo = (e.ref === 'der') === (lado === 'der');
    if (mismo && e.distancia <= HOLGURA_PILAR) return e.distancia + e.ancho;
    if (!mismo && hay(L) && L - e.distancia - e.ancho <= HOLGURA_PILAR) return L - e.distancia;
  }
  return null;
}
function pilarVecino(p, lado) {
  for (const e of p.elementos || []) {
    if (e.tipo !== 'pilar' || !hay(e.distancia) || !hay(e.ancho) || !hay(e.fondo)) continue;
    const mismo = (e.ref === 'der') === (lado === 'der');
    if ((mismo && e.distancia <= HOLGURA_PILAR) || (!mismo && hay(p.largo) && p.largo - e.distancia - e.ancho <= HOLGURA_PILAR)) return e.fondo;
  }
  return null;
}
export function pilarEnPunta(datos, pared, lado) {
  const propio = pilarPropio(pared, lado);
  if (propio !== null) return propio;
  const lista = (datos && datos.paredes) || [], i = lista.indexOf(pared), cerrada = !!(datos && datos.plano && datos.plano.cerrada);
  if (i < 0) return null;
  const j = lado === 'der' ? (i + 1 < lista.length ? i + 1 : cerrada ? 0 : -1) : (i > 0 ? i - 1 : cerrada ? lista.length - 1 : -1);
  if (j < 0 || j === i) return null;
  return pilarVecino(lista[j], lado === 'der' ? 'izq' : 'der');
}
// Lo que hay que sumar a la distancia de un elemento medido desde la cara del pilar (0 si se midió desde la esquina).
export function extraPilar(datos, pared, e) {
  if (e.tipo === 'pilar' || e.desde !== 'pilar') return 0;
  return pilarEnPunta(datos, pared, e.ref === 'der' ? 'der' : 'izq') || 0;
}

function avisosParedes(lista, paredes, unidad, datos) {
  (paredes || []).forEach(p => {
    revisarTamano(lista, 'pared.' + p.id, 'Pared ' + p.letra, p.largo, unidad);
    revisarTamano(lista, 'pared.' + p.id, 'Alto de la pared ' + p.letra, p.alto, unidad);
    if (p.azulejo === 'franja' && !p.azulejo_techo && hay(p.azulejo_desde) && hay(p.azulejo_hasta) && p.azulejo_hasta <= p.azulejo_desde)
      lista.push({ campo: 'pared.' + p.id, texto: 'Azulejo de la pared ' + p.letra + ': termina por debajo de donde empieza' });
    p.elementos.forEach(e => {
      const campo = 'elemento.' + e.id, nombre = nombreElemento(e);
      revisarMaximo(lista, campo, nombre, e.distancia, unidad);
      revisarMaximo(lista, campo, nombre + ' (altura)', e.altura, unidad);
      revisarTamano(lista, campo, nombre + ' (ancho)', e.ancho, unidad);
      revisarTamano(lista, campo, nombre + ' (alto)', e.alto, unidad);
      if (hay(p.largo) && hay(e.distancia) && e.distancia + extraPilar(datos, p, e) + (e.ancho || 0) > p.largo) {
        lista.push({ campo, texto: nombre + ' se sale de la pared ' + p.letra + ' (' + verMedida(p.largo, unidad) + ' ' + unidad + ')' });
      }
    });
  });
}

export function avisos(ficha, unidad, { margen = AJUSTES_FABRICA.margen } = {}) {
  const d = ficha.datos, l = [];
  if (ficha.tipo === 'puerta') {
    (d.puertas || []).forEach((p, i) => {
      const campo = 'puerta.' + p.id, n = (p.nombre || 'Puerta ' + (i + 1)) + ': ';
      revisarTamano(l, campo, n + 'ancho', p.ancho, unidad);
      revisarTamano(l, campo, n + 'alto', p.alto, unidad);
      revisarTamano(l, campo, n + 'tabique', p.tabique, unidad);
    });
  }
  if (ficha.tipo === 'cocina' || ficha.subtipo === 'vestidor') revisarTamano(l, 'alto_techo', 'Altura', d.alto_techo, unidad);
  if (ficha.tipo === 'armario') {
    [['ancho_arriba', 'Ancho arriba'], ['ancho_medio', 'Ancho en medio'], ['ancho_abajo', 'Ancho abajo'], ['alto_izq', 'Alto izquierda'], ['alto_der', 'Alto derecha'], ['fondo', 'Fondo'], ['rodapie_alto', 'Alto de rodapié']]
      .forEach(([c, n]) => revisarTamano(l, c, n, d[c], unidad));
    revisarMaximo(l, 'rodapie_grosor', 'Grosor de rodapié', d.rodapie_grosor, unidad);
    revisarDiferencia(l, 'anchos', 'Los anchos', [d.ancho_arriba, d.ancho_medio, d.ancho_abajo], unidad, margen);
    revisarDiferencia(l, 'altos', 'Los altos', [d.alto_izq, d.alto_der], unidad, margen);
    revisarMaximo(l, 'diagonales', 'Diagonal', d.diag_1, unidad);
    revisarMaximo(l, 'diagonales', 'Diagonal', d.diag_2, unidad);
    if (hay(d.diag_1) && hay(d.diag_2) && Math.abs(d.diag_1 - d.diag_2) > margen)
      l.push({ campo: 'diagonales', texto: 'Las diagonales difieren ' + verMedida(Math.abs(d.diag_1 - d.diag_2), unidad) + ' ' + unidad + ': el hueco no está a escuadra' });
    (d.enchufes || []).forEach(e => {
      revisarMaximo(l, 'enchufe.' + e.id, 'Enchufe', e.distancia, unidad);
      revisarMaximo(l, 'enchufe.' + e.id, 'Enchufe (altura)', e.altura, unidad);
    });
  }
  avisosParedes(l, d.paredes, unidad, d);
  l.push(...avisosModulos(ficha, 'cm'));
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

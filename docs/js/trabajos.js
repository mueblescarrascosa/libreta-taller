// Cuentas sobre trabajos y fichas: resumen corto, lo que falta, recuento de puertas, duplicar, papelera,
// orden por actividad, limpieza de fotos y plantilla de piso. Sin pantalla: todo se prueba en Node.
import { verMedida } from './unidades.js';
import { tituloFicha, NOMBRE_SUBTIPO } from './util.js';
import { normalizarFicha, tieneInformacion, limpiarDatos, fichaNueva, anchoPuerta, AJUSTES_FABRICA } from './modelo.js';
import { bloquesResumen } from './resumen.js';
import { instante } from './sincro.js';

const hay = v => v !== null && v !== undefined && v !== '';
const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
const DIA = 86400000;
export const DIAS_PAPELERA = 30;
export const DIAS_FOTOS = 60;

// «3 puertas», «Corredera · 3 cuerpos», «2 paredes», «2 notas».
export function resumenCorto(ficha) {
  const f = normalizarFicha(ficha), d = f.datos || {}, partes = [];
  if (f.tipo === 'puerta') partes.push(plural((d.puertas || []).length, 'puerta', 'puertas'));
  if (f.tipo === 'armario') {
    if (f.subtipo) partes.push(NOMBRE_SUBTIPO[f.subtipo]);
    const nc = (d.cuerpos || []).length + (d.paredes || []).reduce((s, p) => s + (p.cuerpos || []).length, 0);
    if (nc) partes.push(plural(nc, 'cuerpo', 'cuerpos'));
  }
  if ((d.paredes || []).length && (f.tipo === 'cocina' || f.subtipo === 'vestidor')) partes.push(plural(d.paredes.length, 'pared', 'paredes'));
  const notas = (d.notas || []).filter(n => String(n.texto || '').trim()).length;
  if (f.tipo === 'nota' && notas) partes.push(plural(notas, 'nota', 'notas'));
  return partes.filter(Boolean).join(' · ');
}

// Medidas principales sin apuntar, para verlas antes de irse de la obra.
export function faltan(ficha) {
  const f = normalizarFicha(ficha), d = f.datos || {}, l = [];
  if (f.tipo === 'puerta') (d.puertas || []).forEach((p, i) => {
    const n = p.nombre || 'Puerta ' + (i + 1), sin = ['ancho', 'alto'].filter(k => !hay(p[k]));
    if (sin.length === 2) l.push(n + ': sin medidas');
    else if (sin.length) l.push(n + ': falta el ' + sin[0]);
  });
  if (f.tipo === 'cocina' || f.subtipo === 'vestidor') {
    if (!hay(d.alto_techo)) l.push('Falta la altura');
    (d.paredes || []).forEach(p => { if (!hay(p.largo)) l.push('Pared ' + p.letra + ': falta el largo'); });
  }
  // El vestidor se mide por paredes: no tiene hueco de armario.
  if (f.tipo === 'armario' && f.subtipo !== 'vestidor') {
    if (![d.ancho_arriba, d.ancho_medio, d.ancho_abajo].some(hay)) l.push('Falta el ancho del hueco');
    if (![d.alto_izq, d.alto_der].some(hay)) l.push('Falta el alto del hueco');
    if (!hay(d.fondo)) l.push('Falta el fondo');
  }
  return l;
}

// Copia de seguridad de todo: cada trabajo con sus fichas (con su resumen en texto para leerla sin la app),
// las notas sueltas, la papelera y los ajustes. Las fotos no van dentro (siguen en la nube): solo su ruta.
export function copiaSeguridad({ trabajos, fichas, adjuntos = [], ajustes, version, ahora }) {
  const fotos = id => adjuntos.filter(a => a.ficha_id === id && !a.borrado_at).map(a => a.ruta);
  const conTexto = (f, t) => {
    const n = normalizarFicha(f), b = bloquesResumen({ ficha: n, trabajo: t || null, ajustes });
    return Object.assign({}, n, { texto: (t ? b.slice(1) : b).map(x => x.join('\n')).join('\n\n'), fotos: fotos(f.id) });
  };
  const vivosT = trabajos.filter(t => !t.borrado_at), vivas = fichas.filter(f => !f.borrado_at);
  return {
    app: 'Libreta Taller', version, fecha: ahora,
    trabajos: vivosT.map(t => Object.assign({}, t, { fichas: vivas.filter(f => f.trabajo_id === t.id).map(f => conTexto(f, t)) })),
    // También las fichas vivas cuyo trabajo no está (para que nada se quede fuera de la copia).
    notas_sueltas: vivas.filter(f => !vivosT.some(t => t.id === f.trabajo_id)).map(f => conTexto(f, null)),
    papelera: { trabajos: trabajos.filter(t => t.borrado_at), fichas: fichas.filter(f => f.borrado_at) },
    ajustes,
  };
}

// Trabajos borrados que aún tienen fichas vivas (las siguió usando otro móvil mientras se borraba aquí):
// se recuperan para que esas fichas no queden escondidas.
export function trabajosARecuperar(trabajos, fichas) {
  const conVivas = new Set(fichas.filter(f => !f.borrado_at && f.trabajo_id).map(f => f.trabajo_id));
  return trabajos.filter(t => t.borrado_at && conVivas.has(t.id));
}

// Qué puerta pedir para un premarco, en una medida (ancho o alto): la más grande que entra con su holgura sin tocar el premarco;
// si esa es mucho más pequeña (más de 3 cm) que otra que entra rebajando el premarco como mucho «rebaje_max», esa otra,
// la que menos haya que rebajar. Así, con 84 sale la de 80,5 (y no la de 82 rebajando 1), y con 83 la de 80,5 rebajando 0,5.
const SOBRA_MAX = 30;
function puertaPara(A, lista, extra, holgura, rebajeMax) {
  if (!hay(A)) return null;
  const todas = lista.map(w => ({ w, extra: false })).concat(extra.map(w => ({ w, extra: true }))).sort((a, b) => b.w - a.w || a.extra - b.extra);
  // Sin tocar el premarco, y sin que sobre demasiado (más de 3 cm por encima de lo justo ya no es esa puerta).
  const sin = todas.find(c => A >= c.w + holgura && A - c.w - holgura <= SOBRA_MAX);
  const con = todas.filter(c => c.w + holgura > A && c.w + holgura - A <= rebajeMax && (!sin || c.w - sin.w > 30))
    .sort((a, b) => a.w - b.w)[0]; // la que menos hay que rebajar (la más estrecha de las que entran rebajando)
  if (con) return Object.assign({}, con, { rebaje: con.w + holgura - A });
  return sin ? Object.assign({}, sin, { rebaje: 0 }) : null;
}
export function puertaParaPremarco(ancho, alto, aj = AJUSTES_FABRICA) {
  const a = Object.assign({}, AJUSTES_FABRICA, aj);
  return { ancho: puertaPara(ancho, a.pedido_anchos, a.pedido_anchos_extra, a.holgura_ancho, a.rebaje_max), alto: puertaPara(alto, a.pedido_altos, [], a.holgura_alto, a.rebaje_max) };
}

// Recuento de todas las puertas de un trabajo para el pedido: lo medido como premarco, agrupado por la puerta que hay que pedir;
// lo medido como puerta, por su medida.
// opc.abre: al lado de cada medida, a dónde abren («3 ← izq., 1 dcha. →»).
export function recuentoPuertas(fichas, unidad, ajustes = AJUSTES_FABRICA, opc = {}) {
  const todas = fichas.map(normalizarFicha).filter(f => f.tipo === 'puerta').flatMap(f => (f.datos.puertas || []).map(p => (f.datos.medida === 'premarco' ? Object.assign({}, p, { medida: 'premarco' }) : p)));
  // Las de entrada son de otro grosor: se piden aparte y no se juntan con las de paso.
  const puertas = todas.filter(p => !esDeEntrada(p)), entrada = todas.filter(esDeEntrada);
  const v = mm => verMedida(mm, unidad), grupos = new Map();
  const abren = l => {
    if (!opc.abre) return '';
    const i = l.filter(p => p.mano === 'izq').length, d = l.filter(p => p.mano === 'der').length;
    return i || d ? ' (' + [i ? i + ' ← izq.' : null, d ? d + ' dcha. →' : null].filter(Boolean).join(', ') + ')' : '';
  };
  const clase = p => (p.tipo === 'corredera' ? ' corredera' + (p.medida === 'premarco' ? '' : 's') : p.tipo === 'doble' ? ' doble' : '');
  // Con paño fijo cuenta el ancho de la puerta, no el del hueco entero.
  const pedido = new Map(), sinPuerta = [];
  puertas.map(p => (p.fijo ? Object.assign({}, p, { ancho: anchoPuerta(p) }) : p)).forEach(p => {
    // Premarco con ancho y alto (de una hoja): a la puerta del catálogo que le toca.
    if (p.medida === 'premarco' && hay(p.ancho) && hay(p.alto) && p.tipo !== 'doble' && p.tipo !== 'corredera') {
      const q = puertaParaPremarco(p.ancho, p.alto, ajustes), pre = v(p.ancho) + '×' + v(p.alto);
      if (!q.ancho || !q.alto) { sinPuerta.push(pre); return; }
      const k = q.ancho.w + 'x' + q.alto.w, g = pedido.get(k) || { q, n: 0, pre: [], l: [] };
      const reb = [q.ancho.rebaje ? 'rebajar ' + v(q.ancho.rebaje) + ' ' + unidad + ' de ancho' : null, q.alto.rebaje ? 'rebajar ' + v(q.alto.rebaje) + ' ' + unidad + ' de alto' : null].filter(Boolean).join(' y ');
      g.n++; g.l.push(p); g.pre.push(pre + (reb ? ' (' + reb + ')' : '')); pedido.set(k, g);
      return;
    }
    let k = hay(p.ancho) && hay(p.alto) ? 'de ' + v(p.ancho) + ' × ' + v(p.alto) : hay(p.ancho) ? 'de ' + v(p.ancho) + ' de ancho' : hay(p.alto) ? 'de ' + v(p.alto) + ' de alto' : 'sin medidas';
    if (p.medida === 'premarco' && k !== 'sin medidas') k += ' (premarco)';
    k += clase(p);
    grupos.set(k, (grupos.get(k) || []).concat([p]));
  });
  // Premarcos iguales juntos («86×204 ×2»).
  const juntos = l => [...l.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map())].map(([t, n]) => (n > 1 ? t + ' ×' + n : t)).join(', ');
  const lineas = [...pedido.values()].sort((a, b) => b.n - a.n || b.q.ancho.w - a.q.ancho.w)
    .map(g => g.n + ' de ' + v(g.q.ancho.w) + ' × ' + v(g.q.alto.w) + (g.q.ancho.extra ? ' (no todos los fabricantes)' : '') + abren(g.l) + ' · premarco' + (g.pre.length > 1 ? 's ' : ' ') + juntos(g.pre));
  if (sinPuerta.length) lineas.push(sinPuerta.length + ' sin puerta que encaje · premarco' + (sinPuerta.length > 1 ? 's ' : ' ') + juntos(sinPuerta));
  lineas.push(...[...grupos].sort((a, b) => a[0].startsWith('sin medidas') - b[0].startsWith('sin medidas') || b[1].length - a[1].length).map(([k, l]) => l.length + ' ' + k + abren(l)));
  const cuenta = fn => puertas.filter(fn).length;
  const izq = cuenta(p => p.mano === 'izq'), der = cuenta(p => p.mano === 'der');
  if (izq || der) lineas.push('Abren a la izquierda: ' + izq + ' · a la derecha: ' + der);
  [['Con condena', p => p.condena], ['Con vidriera', p => p.vidriera], ['Correderas', p => p.tipo === 'corredera'], ['Dobles', p => p.tipo === 'doble'], ['Con paño fijo', p => p.fijo || p.tipo === 'fija']]
    .forEach(([t, fn]) => { const n = cuenta(fn); if (n) lineas.push(t + ': ' + n); });
  if (entrada.length) {
    // «Entrada: 3 de 82 × 203»: del premarco, la puerta que toca; si no, su medida tal cual.
    const cuantas = new Map();
    entrada.forEach(p => {
      const q = p.medida === 'premarco' && hay(p.ancho) && hay(p.alto) ? puertaParaPremarco(p.ancho, p.alto, ajustes) : null;
      const k = q && q.ancho && q.alto ? v(q.ancho.w) + ' × ' + v(q.alto.w)
        : (hay(p.ancho) && hay(p.alto) ? v(p.ancho) + ' × ' + v(p.alto) : hay(p.ancho) ? v(p.ancho) + ' de ancho' : hay(p.alto) ? v(p.alto) + ' de alto' : 'sin medidas') + (p.medida === 'premarco' && (hay(p.ancho) || hay(p.alto)) ? ' (premarco)' : '');
      cuantas.set(k, (cuantas.get(k) || []).concat([p]));
    });
    lineas.push('Entrada: ' + [...cuantas].sort((a, b) => b[1].length - a[1].length).map(([k, l]) => (k === 'sin medidas' ? l.length + ' sin medidas' : l.length + ' de ' + k) + abren(l)).join(', '));
  }
  const titulo = 'Puertas: ' + todas.length + (entrada.length && puertas.length ? ' (' + puertas.length + ' de paso y ' + entrada.length + ' de entrada)' : '');
  return { total: todas.length, paso: puertas.length, entrada: entrada.length, titulo, lineas };
}
// «Entrada», «Entrada 2», «Puerta blindada»…: la puerta de la calle.
export const esDeEntrada = p => /^entrada\b|blindad|acorazad/i.test(String(p.nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim());

// Copia completa de una ficha, con identificadores nuevos dentro (puertas, paredes, elementos, módulos…).
export function duplicarFicha(ficha, trabajoId) {
  const nuevosIds = v => {
    if (Array.isArray(v)) return v.map(nuevosIds);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach(k => { o[k] = k === 'id' ? crypto.randomUUID() : nuevosIds(v[k]); });
      return o;
    }
    return v;
  };
  const f = normalizarFicha(ficha);
  return { id: crypto.randomUUID(), trabajo_id: trabajoId, tipo: f.tipo, subtipo: f.subtipo || null, nombre: (f.nombre || tituloFicha(f)) + ' (copia)',
    datos: nuevosIds(JSON.parse(JSON.stringify(f.datos))), creado_at: new Date().toISOString(), updated_at: null, borrado_at: null };
}

const reciente = (x, ahora) => x.borrado_at && ahora - instante(x.borrado_at) <= DIAS_PAPELERA * DIA;
const conInformacion = f => !!String(f.nombre || '').trim() || tieneInformacion(limpiarDatos(f.datos || {}));

// Lo borrado en los últimos 30 días. Las fichas que se borraron junto con su trabajo van con él.
export function enPapelera(trabajos, fichas, ahora = Date.now()) {
  const ts = trabajos.filter(t => reciente(t, ahora)), porId = new Map(trabajos.map(t => [t.id, t]));
  const fs = fichas.filter(f => {
    if (!reciente(f, ahora) || !conInformacion(f)) return false;
    const t = porId.get(f.trabajo_id);
    return !(t && t.borrado_at && t.borrado_at === f.borrado_at);
  });
  const orden = (a, b) => String(b.borrado_at).localeCompare(String(a.borrado_at));
  return { trabajos: ts.sort(orden), fichas: fs.sort(orden) };
}

// Filas que hay que volver a guardar para recuperar algo de la papelera.
export function restaurar({ tipo, fila }, trabajos, fichas) {
  const vivo = x => ({ ...x, borrado_at: null }), r = [];
  if (tipo === 'trabajo') {
    r.push({ tabla: 'trabajos', fila: vivo(fila) });
    fichas.filter(f => f.trabajo_id === fila.id && f.borrado_at && f.borrado_at === fila.borrado_at).forEach(f => r.push({ tabla: 'fichas', fila: vivo(f) }));
  } else {
    r.push({ tabla: 'fichas', fila: vivo(fila) });
    const t = trabajos.find(x => x.id === fila.trabajo_id);
    if (t && t.borrado_at) r.push({ tabla: 'trabajos', fila: vivo(t) });
  }
  return r;
}

// Momento de lo último tocado en un trabajo. Lo pendiente de subir va siempre primero (Infinity):
// «ahora» no basta si el reloj del móvil va por detrás del de la nube.
export function actividad(trabajo, fichas, cola) {
  const suyas = fichas.filter(f => f.trabajo_id === trabajo.id);
  if (cola.has('trabajos:' + trabajo.id) || suyas.some(f => cola.has('fichas:' + f.id))) return Infinity;
  const t = [trabajo, ...suyas].map(x => x.updated_at || x.creado_at).filter(Boolean).map(instante).filter(n => !isNaN(n));
  return t.length ? Math.max(...t) : 0;
}

// Copias de fotos que se pueden quitar del móvil: ya subidas y de fichas sin tocar en 60 días, o de algo borrado.
// Siguen en la nube: se vuelven a bajar si se abre la ficha.
export function fotosParaLimpiar({ adjuntos, fichas, cola, blobs, ahora = Date.now(), dias = DIAS_FOTOS }) {
  const adj = new Map(adjuntos.map(a => [a.id, a])), fich = new Map(fichas.map(f => [f.id, f]));
  return blobs.filter(id => {
    if (cola.has('adjuntos:' + id)) return false;
    const a = adj.get(id);
    if (!a || a.borrado_at) return true;
    const f = fich.get(a.ficha_id);
    if (!f || cola.has('fichas:' + f.id)) return false;
    const t = instante(f.updated_at || f.creado_at);
    return !isNaN(t) && ahora - t > dias * DIA;
  });
}

// Plantilla de piso: fichas ya creadas y con nombre (así no se descartan aunque sigan vacías).
export function fichasDePlantilla(trabajoId, { puertas, cocina, armarios = {} }) {
  const l = [], con = (tipo, subtipo, nombre) => l.push(Object.assign(fichaNueva(tipo, subtipo, trabajoId), { nombre }));
  if (puertas) con('puerta', null, 'Puertas');
  if (cocina) con('cocina', null, 'Cocina');
  ['corredera', 'abatible', 'vestidor'].forEach(s => {
    const n = armarios[s] || 0, base = s === 'vestidor' ? 'Vestidor' : 'Armario ' + s;
    for (let i = 1; i <= n; i++) con('armario', s, n === 1 ? base : base + ' ' + i);
  });
  return l;
}

// Texto de todo el trabajo: cabecera, recuento de puertas y cada ficha.
export function textoTrabajo({ trabajo, fichas, ajustes, abre = true }) {
  const u = (trabajo && trabajo.unidad) || ajustes.unidad, bloques = [];
  bloques.push(['*' + (trabajo.nombre || 'Trabajo') + '*', [trabajo.cliente, trabajo.direccion].filter(hay).join(' · ')].filter(hay));
  const r = recuentoPuertas(fichas, u, ajustes, { abre });
  if (r.total) bloques.push(['*' + r.titulo + '*', ...r.lineas]);
  fichas.forEach(f => bloques.push(...bloquesResumen({ ficha: normalizarFicha(f), trabajo, ajustes }).slice(1)));
  return bloques.map(b => b.join('\n')).join('\n\n');
}

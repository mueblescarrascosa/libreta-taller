// Cuentas sobre trabajos y fichas: resumen corto, lo que falta, recuento de puertas, duplicar, papelera,
// orden por actividad, limpieza de fotos y plantilla de piso. Sin pantalla: todo se prueba en Node.
import { verMedida } from './unidades.js';
import { tituloFicha, NOMBRE_SUBTIPO } from './util.js';
import { normalizarFicha, tieneInformacion, limpiarDatos, fichaNueva } from './modelo.js';
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

// Recuento de todas las puertas de un trabajo, agrupadas por medida, para el pedido.
export function recuentoPuertas(fichas, unidad) {
  const puertas = fichas.map(normalizarFicha).filter(f => f.tipo === 'puerta').flatMap(f => f.datos.puertas || []);
  const v = mm => verMedida(mm, unidad), grupos = new Map();
  puertas.forEach(p => {
    const k = hay(p.ancho) && hay(p.alto) ? 'de ' + v(p.ancho) + ' × ' + v(p.alto) : hay(p.ancho) ? 'de ' + v(p.ancho) + ' de ancho' : hay(p.alto) ? 'de ' + v(p.alto) + ' de alto' : 'sin medidas';
    grupos.set(k, (grupos.get(k) || 0) + 1);
  });
  const lineas = [...grupos].sort((a, b) => (a[0] === 'sin medidas') - (b[0] === 'sin medidas') || b[1] - a[1]).map(([k, n]) => n + ' ' + k);
  const cuenta = fn => puertas.filter(fn).length;
  const izq = cuenta(p => p.mano === 'izq'), der = cuenta(p => p.mano === 'der');
  if (izq || der) lineas.push('Abren a la izquierda: ' + izq + ' · a la derecha: ' + der);
  [['Con condena', p => p.condena], ['Con vidriera', p => p.vidriera], ['Correderas', p => p.tipo === 'corredera'], ['Dobles', p => p.tipo === 'doble'], ['Fijas', p => p.tipo === 'fija']]
    .forEach(([t, fn]) => { const n = cuenta(fn); if (n) lineas.push(t + ': ' + n); });
  return { total: puertas.length, lineas };
}

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
  return { id: crypto.randomUUID(), trabajo_id: trabajoId, tipo: f.tipo, subtipo: f.subtipo || null, nombre: tituloFicha(f) + ' (copia)',
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
export function textoTrabajo({ trabajo, fichas, ajustes }) {
  const u = (trabajo && trabajo.unidad) || ajustes.unidad, bloques = [];
  bloques.push(['*' + (trabajo.nombre || 'Trabajo') + '*', [trabajo.cliente, trabajo.direccion].filter(hay).join(' · ')].filter(hay));
  const r = recuentoPuertas(fichas, u);
  if (r.total) bloques.push(['*Puertas: ' + r.total + '*', ...r.lineas]);
  fichas.forEach(f => bloques.push(...bloquesResumen({ ficha: normalizarFicha(f), trabajo, ajustes }).slice(1)));
  return bloques.map(b => b.join('\n')).join('\n\n');
}

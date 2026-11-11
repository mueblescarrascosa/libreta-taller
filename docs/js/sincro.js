// Sube la cola y baja lo nuevo. Nunca descarta una medida en silencio: un conflicto en una ficha deja las dos versiones;
// en un trabajo se juntan los cambios dato a dato y, si los dos tocaron el mismo, lo de aquí va a una nota del trabajo.
import { fichaNueva } from './modelo.js';

const ORDEN = ['ajustes', 'trabajos', 'fichas', 'adjuntos'];
const MARGEN_MS = 60000;
const SUFIJO = ' (versión de este dispositivo)';

// Postgres da microsegundos; algunos navegadores solo entienden milisegundos.
export const instante = s => Date.parse(String(s).replace(/(\.\d{3})\d+/, '$1'));

// Compara contenido: sin campos del servidor, sin orden de claves y con las fechas como instantes.
function canon(v, clave) {
  if (Array.isArray(v)) return v.map(x => canon(x));
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k], k); return o; }, {});
  if (typeof v === 'string' && clave && clave.endsWith('_at')) return instante(v);
  return v;
}
function sinServidor(f) {
  const o = Object.assign({}, f);
  delete o.updated_at; delete o.user_id;
  return o;
}
export const huella = f => JSON.stringify(canon(sinServidor(f)));
export const iguales = (a, b) => huella(a) === huella(b);

// Junta un trabajo cambiado aquí (local) y allí (remota), sabiendo cómo estaba antes (previa).
// Cada dato: si solo cambió en un sitio, gana ese cambio; si cambió en los dos y distinto, gana la nube
// y lo de aquí se devuelve en «choques». Sin previa no se sabe qué tocó cada uno: gana la nube en todo lo distinto.
const NOMBRE_DATO = { nombre: 'Nombre', cliente: 'Cliente', direccion: 'Dirección', unidad: 'Unidad', 'datos.telefono': 'Teléfono', 'datos.estado': 'Estado' };
const SERVIDOR = new Set(['id', 'user_id', 'updated_at', 'creado_at']);
const igual = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));
export function juntarTrabajo(previa, local, remota) {
  const fila = Object.assign({}, remota), choques = [];
  const decidir = (clave, P, L, R, poner) => {
    if (igual(L, R)) return;
    if (previa && igual(L, P)) return;                 // aquí no se tocó: se queda lo de la nube
    if (previa && igual(R, P)) return poner(L);        // allí no se tocó: se queda lo de aquí
    if (L !== null && L !== undefined && L !== '') choques.push({ clave, nombre: NOMBRE_DATO[clave] || clave, aqui: L, nube: R });
  };
  const claves = new Set([...Object.keys(local), ...Object.keys(remota)].filter(k => !SERVIDOR.has(k) && k !== 'datos'));
  claves.forEach(k => decidir(k, previa && previa[k], local[k], remota[k], v => { fila[k] = v; }));
  const dP = (previa && previa.datos) || {}, dL = local.datos || {}, dR = remota.datos || {};
  fila.datos = Object.assign({}, dR);
  new Set([...Object.keys(dL), ...Object.keys(dR)]).forEach(k => decidir('datos.' + k, dP[k], dL[k], dR[k], v => { fila.datos[k] = v; }));
  if (!local.datos && !remota.datos) delete fila.datos;
  return { fila, choques };
}
const texto = v => (v === null || v === undefined || v === '' ? 'vacío' : '«' + v + '»');
function notaDeChoques(trabajo, choques) {
  const f = fichaNueva('nota', null, trabajo.id);
  f.nombre = 'Cambios de otro móvil sin juntar';
  f.datos.notas = [{ id: crypto.randomUUID(), texto: 'Este trabajo se cambió en dos móviles a la vez. Se ha quedado lo de la nube; esto es lo que había en el otro:\n' +
    choques.map(c => '- ' + c.nombre + ': ponía ' + texto(c.aqui) + ' (se ha quedado ' + texto(c.nube) + ')').join('\n') }];
  return f;
}

const marcaConMargen =m => (m ? new Date(instante(m) - MARGEN_MS).toISOString() : null);
const masReciente = (a, b) => (!a || instante(b) > instante(a) ? b : a);

export function crearSincro({ almacen, nube }) {
  let enCurso = null, otraVez = false, error = null, conflictos = false;
  const oyentes = [];
  const avisar = hayCambios => oyentes.forEach(f => { try { f(hayCambios); } catch (e) { console.error(e); } });

  async function resolverConflicto(e, fila, remota) {
    conflictos = true;
    // Quien borró aquí lo que otro cambió allí no pierde nada: se queda lo de la nube.
    if (e.tabla === 'fichas' && !fila.borrado_at) return almacen.dividir(remota, SUFIJO);
    if (e.tabla === 'trabajos' && !fila.borrado_at) {
      const { fila: junta, choques } = juntarTrabajo(e.previa || null, fila, remota);
      if (choques.length) await almacen.guardar('fichas', notaDeChoques(remota, choques));
      if (iguales(junta, remota)) return almacen.aceptarRemota(e.tabla, remota);
      await almacen.reencolar(e.tabla, junta, remota);
      otraVez = true; // se sube en la ronda siguiente, ya sobre la versión de la nube
      return;
    }
    return almacen.aceptarRemota(e.tabla, remota);
  }

  // La versión de la nube es nuestra si es la última que confirmamos o si es justo lo que enviamos
  // en un intento cuya respuesta se perdió. Entonces no hay conflicto: solo una base vieja.
  async function esPropia(e, remota) {
    return remota.updated_at === await almacen.getPropia(e.tabla, e.id) || (e.enviado && e.enviado === huella(remota));
  }

  // Ya existe en la nube con otra base: se resuelve sin perder nada de nadie.
  async function contraRemota(e, fila, cuerpo) {
    const remota = await nube.leerFila(e.tabla, e.id);
    if (!remota) {
      // No está (no debería pasar: nunca se borra de verdad). Se vuelve a crear.
      const r = await nube.crear(e.tabla, cuerpo);
      return r.fila ? almacen.confirmarSubida(e.tabla, r.fila, e.v) : undefined;
    }
    if (iguales(remota, fila)) return almacen.confirmarSubida(e.tabla, remota, e.v);
    if (await esPropia(e, remota)) {
      const act = await nube.actualizar(e.tabla, e.id, cuerpo, remota.updated_at);
      return act ? almacen.confirmarSubida(e.tabla, act, e.v) : undefined; // si cambió justo ahora, la siguiente ronda lo verá
    }
    return resolverConflicto(e, fila, remota);
  }

  async function subirEntrada(e) {
    const fila = await almacen.leer(e.tabla, e.id);
    if (!fila) return almacen.quitar('cola', e.clave);
    if (e.tabla === 'adjuntos') {
      const b = await almacen.leer('blobs', e.id);
      if (b && !fila.borrado_at) await nube.subirArchivo(fila.ruta, b.blob);
    }
    const cuerpo = sinServidor(fila);
    await almacen.marcarEnvio(e.clave, huella(cuerpo));
    if (e.base === null) {
      const r = await nube.crear(e.tabla, cuerpo);
      return r.duplicado ? contraRemota(e, fila, cuerpo) : almacen.confirmarSubida(e.tabla, r.fila, e.v);
    }
    const act = await nube.actualizar(e.tabla, e.id, cuerpo, e.base);
    return act ? almacen.confirmarSubida(e.tabla, act, e.v) : contraRemota(e, fila, cuerpo);
  }

  async function subir() {
    for (const tabla of ORDEN) {
      // Se relee la cola de cada tabla porque un conflicto puede añadir fichas nuevas.
      const entradas = (await almacen.todos('cola')).filter(e => e.tabla === tabla);
      for (const e of entradas) {
        try { await subirEntrada(e); }
        catch (err) {
          if (err.tipo === 'datos') { await rechazada(e, err); continue; }
          throw err;
        }
      }
    }
    const nuevas = (await almacen.todos('cola')).filter(e => e.base === null && e.tabla === 'fichas');
    for (const e of nuevas) {
      try { await subirEntrada(e); }
      catch (err) { if (err.tipo !== 'datos') throw err; await rechazada(e, err); }
    }
  }
  // La nube no acepta esta fila: se apunta el motivo para que se vea y se pueda reintentar o descartar.
  async function rechazada(e, err) {
    console.error('Fila rechazada', e.clave, err);
    error = 'datos';
    await almacen.marcarRechazo(e.clave, String(err.message || 'rechazada'));
  }

  async function bajar() {
    let cambios = false;
    for (const tabla of ORDEN) {
      const clave = 'marca:' + tabla;
      let marca = await almacen.getMeta(clave);
      const filas = await nube.cambiosDesde(tabla, marcaConMargen(marca));
      for (const f of filas) {
        const local = await almacen.leer(tabla, f.id);
        if (!local || local.updated_at !== f.updated_at) {
          if (await almacen.aplicarRemota(tabla, f)) cambios = true;
        }
        marca = masReciente(marca, f.updated_at);
      }
      if (marca) await almacen.setMeta(clave, marca);
    }
    return cambios;
  }

  async function ronda() {
    error = null;
    conflictos = false;
    let cambios = false;
    try { await subir(); cambios = await bajar(); }
    catch (err) { error = err.tipo === 'sesion' ? 'sesion' : 'red'; }
    avisar(cambios || conflictos);
  }

  function sincronizar() {
    if (enCurso) { otraVez = true; return enCurso; }
    enCurso = (async () => {
      do { otraVez = false; await ronda(); } while (otraVez);
    })().finally(() => { enCurso = null; });
    return enCurso;
  }

  return {
    sincronizar, bajar,
    pendientes: async () => (await almacen.todos('cola')).length,
    rechazadas: async () => (await almacen.todos('cola')).filter(e => e.rechazo),
    async reintentar(clave) { await almacen.quitarRechazo(clave); return sincronizar(); },
    // Descartar mi cambio: queda lo de la nube; si nunca llegó a subir, desaparece.
    async descartar(clave) {
      const e = (await almacen.todos('cola')).find(x => x.clave === clave);
      if (!e) return;
      const remota = await nube.leerFila(e.tabla, e.id);
      if (remota) await almacen.aceptarRemota(e.tabla, remota);
      else await almacen.descartarNueva(e.tabla, e.id);
      avisar(true);
    },
    ultimoError: () => error,
    alCambiar: fn => { oyentes.push(fn); },
  };
}

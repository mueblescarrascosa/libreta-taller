// Sube la cola y baja lo nuevo. Nunca descarta una medida en silencio: un conflicto en una ficha deja las dos versiones.
const ORDEN = ['trabajos', 'fichas', 'adjuntos'];
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

const marcaConMargen = m => (m ? new Date(instante(m) - MARGEN_MS).toISOString() : null);
const masReciente = (a, b) => (!a || instante(b) > instante(a) ? b : a);

export function crearSincro({ almacen, nube }) {
  let enCurso = null, otraVez = false, error = null, conflictos = false;
  const oyentes = [];
  const avisar = hayCambios => oyentes.forEach(f => { try { f(hayCambios); } catch (e) { console.error(e); } });

  async function resolverConflicto(e, fila, remota) {
    conflictos = true;
    // Quien borró aquí lo que otro cambió allí no pierde nada: se queda lo de la nube.
    if (e.tabla === 'fichas' && !fila.borrado_at) await almacen.dividir(remota, SUFIJO);
    else await almacen.aceptarRemota(e.tabla, remota);
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
          if (err.tipo === 'datos') { console.error('Fila rechazada', e.clave, err); error = 'datos'; continue; }
          throw err;
        }
      }
    }
    const nuevas = (await almacen.todos('cola')).filter(e => e.base === null && e.tabla === 'fichas');
    for (const e of nuevas) {
      try { await subirEntrada(e); }
      catch (err) { if (err.tipo !== 'datos') throw err; error = 'datos'; }
    }
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
    ultimoError: () => error,
    alCambiar: fn => { oyentes.push(fn); },
  };
}

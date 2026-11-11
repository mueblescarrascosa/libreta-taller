// Almacén local (IndexedDB): la app trabaja siempre contra esto; la cola dice qué falta por subir.
const TABLAS = ['ajustes', 'trabajos', 'fichas', 'adjuntos', 'blobs'];
// Versión 2: añade «ajustes». Al subir de versión solo se crea lo que falta; lo que había se conserva.
const VERSION_BASE = 2;

const prom = r => new Promise((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });

function abrirBase(nombre) {
  const r = indexedDB.open(nombre, VERSION_BASE);
  r.onupgradeneeded = () => {
    const db = r.result, hay = n => db.objectStoreNames.contains(n);
    TABLAS.forEach(t => { if (!hay(t)) db.createObjectStore(t, { keyPath: 'id' }); });
    if (!hay('cola')) db.createObjectStore('cola', { keyPath: 'clave' });
    if (!hay('meta')) db.createObjectStore('meta', { keyPath: 'k' });
  };
  return prom(r);
}

export async function abrirAlmacen(nombre = 'medidas-db') {
  const db = await abrirBase(nombre);

  // Ejecuta fn dentro de una transacción; si algo lanza, se deshace entera.
  function tx(stores, fn) {
    return new Promise((ok, mal) => {
      const t = db.transaction(stores, 'readwrite');
      let res, error = null;
      t.oncomplete = () => ok(res);
      t.onabort = () => mal(error || t.error);
      t.onerror = () => {};
      Promise.resolve().then(() => {
        try { fn(t, v => { res = v; }); } catch (e) { error = e; t.abort(); }
      });
    });
  }
  const leer = (store, id) => prom(db.transaction(store).objectStore(store).get(id)).then(v => v === undefined ? null : v);

  return {
    leer,
    todos: store => prom(db.transaction(store).objectStore(store).getAll()),
    claves: store => prom(db.transaction(store).objectStore(store).getAllKeys()),
    poner: (store, obj) => tx([store], t => { t.objectStore(store).put(obj); }),
    quitar: (store, id) => tx([store], t => { t.objectStore(store).delete(id); }),
    getMeta: k => leer('meta', k).then(v => v ? v.v : null),
    setMeta: (k, v) => tx(['meta'], t => { t.objectStore('meta').put({ k, v }); }),

    // Guarda la fila y anota que hay que subirla. La base es la versión de la nube sobre la que trabajaba
    // la pantalla (su updated_at): si la nube cambió después, la subida lo detecta como conflicto.
    // En los trabajos se guarda también cómo estaba antes del cambio (previa), para juntar luego
    // los cambios de dos móviles dato a dato.
    guardar(tabla, fila) {
      const clave = tabla + ':' + fila.id, base = fila.updated_at ?? null;
      return tx([tabla, 'cola'], t => {
        const s = t.objectStore(tabla), c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => {
          const e = g.result;
          if (e) { c.put(Object.assign(e, { v: e.v + 1 })); s.put(fila); return; }
          const gp = s.get(fila.id);
          gp.onsuccess = () => {
            const ant = gp.result, nueva = { clave, tabla, id: fila.id, base, v: 1 };
            if (tabla === 'trabajos' && ant && base && ant.updated_at === base) nueva.previa = ant;
            c.put(nueva); s.put(fila);
          };
        };
      });
    },

    // La nube no acepta esta fila: se apunta el motivo para enseñarlo (sigue en la cola).
    marcarRechazo(clave, motivo) {
      return tx(['cola'], t => {
        const c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => { if (g.result) c.put(Object.assign(g.result, { rechazo: motivo })); };
      });
    },
    quitarRechazo(clave) {
      return tx(['cola'], t => {
        const c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => { if (g.result) { delete g.result.rechazo; c.put(g.result); } };
      });
    },
    // Algo nuevo que nunca llegó a la nube y se descarta: fuera la fila y su entrada.
    descartarNueva(tabla, id) {
      return tx([tabla, 'cola'], t => { t.objectStore(tabla).delete(id); t.objectStore('cola').delete(tabla + ':' + id); });
    },
    // Tras juntar un conflicto: queda la fila juntada, pendiente de subir sobre la versión de la nube.
    reencolar(tabla, fila, remota) {
      const clave = tabla + ':' + fila.id;
      return tx([tabla, 'cola'], t => {
        const c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => {
          const e = g.result || { clave, tabla, id: fila.id, v: 0 };
          delete e.enviado; delete e.rechazo;
          c.put(Object.assign(e, { base: remota.updated_at, previa: remota, v: e.v + 1 }));
          t.objectStore(tabla).put(fila);
        };
      });
    },

    // Lo último enviado de una entrada, para reconocer luego una escritura propia cuya respuesta se perdió.
    marcarEnvio(clave, huella) {
      return tx(['cola'], t => {
        const c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => { if (g.result) c.put(Object.assign(g.result, { enviado: huella })); };
      });
    },

    getPropia: (tabla, id) => leer('meta', 'propia:' + tabla + ':' + id).then(v => v ? v.v : null),

    // Tras subir: si nadie la editó mientras tanto, queda la fila de la nube; si no, sigue pendiente con la base nueva.
    // En los dos casos se recuerda esa versión como propia.
    confirmarSubida(tabla, filaNube, v) {
      const clave = tabla + ':' + filaNube.id;
      return tx([tabla, 'cola', 'meta'], t => {
        t.objectStore('meta').put({ k: 'propia:' + tabla + ':' + filaNube.id, v: filaNube.updated_at });
        const c = t.objectStore('cola'), g = c.get(clave);
        g.onsuccess = () => {
          const e = g.result;
          if (e && e.v !== v) { c.put(Object.assign(e, { base: filaNube.updated_at }, tabla === 'trabajos' ? { previa: filaNube } : {})); return; }
          c.delete(clave);
          t.objectStore(tabla).put(filaNube);
        };
      });
    },

    // Conflicto en una ficha: la versión local actual pasa a una copia nueva y queda la de la nube. Todo o nada.
    dividir(remota, sufijo) {
      const id = crypto.randomUUID(), clave = 'fichas:' + remota.id;
      return tx(['fichas', 'cola'], (t, res) => {
        const s = t.objectStore('fichas'), c = t.objectStore('cola'), g = s.get(remota.id);
        g.onsuccess = () => {
          const local = g.result || remota, nombre = local.nombre.endsWith(sufijo) ? local.nombre : local.nombre + sufijo;
          s.put(Object.assign({}, local, { id, nombre, updated_at: null }));
          c.put({ clave: 'fichas:' + id, tabla: 'fichas', id, base: null, v: 1 });
          s.put(remota);
          c.delete(clave);
          res(id);
        };
      });
    },

    // Conflicto donde gana la nube: queda su versión y la entrada sale de la cola.
    aceptarRemota(tabla, remota) {
      return tx([tabla, 'cola'], t => {
        t.objectStore(tabla).put(remota);
        t.objectStore('cola').delete(tabla + ':' + remota.id);
      });
    },

    // Aplica una fila bajada de la nube, salvo que aquí haya cambios sin subir. Devuelve si la aplicó.
    aplicarRemota(tabla, fila) {
      return tx([tabla, 'cola'], (t, res) => {
        const g = t.objectStore('cola').get(tabla + ':' + fila.id);
        g.onsuccess = () => {
          if (g.result) return res(false);
          t.objectStore(tabla).put(fila);
          res(true);
        };
      });
    },
  };
}

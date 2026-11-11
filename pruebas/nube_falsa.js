// Nube y almacén en memoria para probar la sincronización con varios dispositivos.
let reloj = 0;
const copia = o => JSON.parse(JSON.stringify(o));
const fecha = () => new Date(1800000000000 + (++reloj) * 1000).toISOString().replace('Z', '+00:00');

// Como Postgres: jsonb reordena las claves y las fechas vuelven con otro formato.
function comoPostgres(f) {
  const o = copia(f);
  ['creado_at', 'borrado_at'].forEach(k => { if (o[k]) o[k] = new Date(o[k]).toISOString().replace('Z', '+00:00'); });
  if (o.datos) o.datos = Object.fromEntries(Object.entries(o.datos).sort(([a], [b]) => a < b ? 1 : -1));
  return o;
}

export function crearNubeFalsa() {
  const t = { ajustes: new Map(), trabajos: new Map(), fichas: new Map(), adjuntos: new Map() }, archivos = new Map();
  const n = {
    t, archivos, sinRed: false, perderRespuesta: 0, fallarArchivo: false, marcas: [],
    _ok() { if (n.sinRed) { const e = new Error('red'); e.tipo = 'red'; throw e; } },
    _fin(v) { if (n.perderRespuesta > 0) { n.perderRespuesta--; const e = new Error('respuesta perdida'); e.tipo = 'red'; throw e; } return v; },
    _sello(f) { f.updated_at = fecha(); f.user_id = 'U1'; return f; },
    async crear(tabla, fila) {
      n._ok();
      if (t[tabla].has(fila.id)) return { duplicado: true };
      const f = n._sello(comoPostgres(fila)); t[tabla].set(f.id, f);
      return n._fin({ fila: copia(f) });
    },
    async actualizar(tabla, id, cambios, base) {
      n._ok();
      const f = t[tabla].get(id);
      if (!f || f.updated_at !== base) return null;
      Object.assign(f, comoPostgres(cambios)); n._sello(f);
      return n._fin(copia(f));
    },
    async leerFila(tabla, id) { n._ok(); const f = t[tabla].get(id); return f ? copia(f) : null; },
    async cambiosDesde(tabla, marca) {
      n._ok(); n.marcas.push(marca);
      return [...t[tabla].values()].filter(f => !marca || f.updated_at >= marca).map(copia);
    },
    async subirArchivo(ruta, blob) {
      n._ok();
      if (n.fallarArchivo) { const e = new Error('archivo'); e.tipo = 'red'; throw e; }
      archivos.set(ruta, blob);
    },
    async bajarArchivo(ruta) { n._ok(); return archivos.get(ruta) || null; },
  };
  return n;
}

export function crearAlmacenFalso() {
  const s = { ajustes: new Map(), trabajos: new Map(), fichas: new Map(), adjuntos: new Map(), blobs: new Map(), cola: new Map(), meta: new Map() };
  return {
    s,
    async leer(store, id) { const v = s[store].get(id); return v === undefined ? null : (store === 'blobs' ? v : copia(v)); },
    async todos(store) { return [...s[store].values()].map(v => store === 'blobs' ? v : copia(v)); },
    async poner(store, obj) { s[store].set(obj.id, store === 'blobs' ? obj : copia(obj)); },
    async quitar(store, id) { s[store].delete(id); },
    async getMeta(k) { return s.meta.has(k) ? s.meta.get(k) : null; },
    async setMeta(k, v) { s.meta.set(k, v); },
    async guardar(tabla, fila) {
      const clave = tabla + ':' + fila.id, e = s.cola.get(clave), ant = s[tabla].get(fila.id), base = fila.updated_at ?? null;
      s[tabla].set(fila.id, copia(fila));
      if (e) { e.v++; return; }
      const nueva = { clave, tabla, id: fila.id, base, v: 1 };
      if (tabla === 'trabajos' && ant && base && ant.updated_at === base) nueva.previa = copia(ant);
      s.cola.set(clave, nueva);
    },
    async marcarRechazo(clave, motivo) { const e = s.cola.get(clave); if (e) e.rechazo = motivo; },
    async quitarRechazo(clave) { const e = s.cola.get(clave); if (e) delete e.rechazo; },
    async descartarNueva(tabla, id) { s[tabla].delete(id); s.cola.delete(tabla + ':' + id); },
    async reencolar(tabla, fila, remota) {
      const clave = tabla + ':' + fila.id, e = s.cola.get(clave) || { clave, tabla, id: fila.id, v: 0 };
      delete e.enviado; delete e.rechazo;
      s.cola.set(clave, Object.assign(e, { base: remota.updated_at, previa: copia(remota), v: e.v + 1 }));
      s[tabla].set(fila.id, copia(fila));
    },
    async marcarEnvio(clave, huella) { const e = s.cola.get(clave); if (e) e.enviado = huella; },
    async getPropia(tabla, id) { return s.meta.get('propia:' + tabla + ':' + id) ?? null; },
    async confirmarSubida(tabla, filaNube, v) {
      const clave = tabla + ':' + filaNube.id, e = s.cola.get(clave);
      s.meta.set('propia:' + tabla + ':' + filaNube.id, filaNube.updated_at);
      if (e && e.v !== v) { e.base = filaNube.updated_at; if (tabla === 'trabajos') e.previa = copia(filaNube); return; }
      s.cola.delete(clave); s[tabla].set(filaNube.id, copia(filaNube));
    },
    async dividir(remota, sufijo) {
      const id = crypto.randomUUID(), local = s.fichas.get(remota.id) || remota;
      const nombre = local.nombre.endsWith(sufijo) ? local.nombre : local.nombre + sufijo;
      s.fichas.set(id, Object.assign(copia(local), { id, nombre, updated_at: null }));
      s.cola.set('fichas:' + id, { clave: 'fichas:' + id, tabla: 'fichas', id, base: null, v: 1 });
      s.fichas.set(remota.id, copia(remota)); s.cola.delete('fichas:' + remota.id);
      return id;
    },
    async aceptarRemota(tabla, remota) { s[tabla].set(remota.id, copia(remota)); s.cola.delete(tabla + ':' + remota.id); },
    async aplicarRemota(tabla, fila) {
      if (s.cola.has(tabla + ':' + fila.id)) return false;
      s[tabla].set(fila.id, copia(fila)); return true;
    },
  };
}

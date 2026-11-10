// Acceso a Supabase. La sincronización solo conoce estos métodos.
import { BUCKET } from './config.js';

const TABLA = { ajustes: 'med_ajustes', trabajos: 'med_trabajos', fichas: 'med_fichas', adjuntos: 'med_adjuntos' };
const PAGINA = 500;

// Errores con tipo: 'red' (reintentar luego), 'sesion' (hay que entrar) o 'datos' (esta fila falla).
function comprobar(r) {
  if (!r.error) return r.data;
  const estado = Number(r.status || r.error.status || r.error.statusCode || 0);
  const e = new Error(r.error.message);
  e.codigo = r.error.code;
  e.tipo = !estado ? 'red' : estado === 401 ? 'sesion' : 'datos';
  throw e;
}

export function crearNube(sb) {
  return {
    async entrar(email, pass) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) return { ok: false, error: error.status ? 'Correo o contraseña incorrectos.' : 'Sin conexión. Inténtalo cuando tengas cobertura.' };
      return { ok: true, uid: data.user.id, email: data.user.email };
    },
    async salir() { await sb.auth.signOut({ scope: 'local' }); },
    async crear(tabla, fila) {
      const r = await sb.from(TABLA[tabla]).insert(fila).select().single();
      if (r.error && r.error.code === '23505') return { duplicado: true };
      return { fila: comprobar(r) };
    },
    async actualizar(tabla, id, cambios, base) {
      return comprobar(await sb.from(TABLA[tabla]).update(cambios).eq('id', id).eq('updated_at', base).select().maybeSingle());
    },
    async leerFila(tabla, id) {
      return comprobar(await sb.from(TABLA[tabla]).select().eq('id', id).maybeSingle());
    },
    async cambiosDesde(tabla, marca) {
      const filas = [];
      for (let desde = 0; ; desde += PAGINA) {
        let q = sb.from(TABLA[tabla]).select().order('updated_at').order('id').range(desde, desde + PAGINA - 1);
        if (marca) q = q.gte('updated_at', marca);
        const t = comprobar(await q);
        filas.push(...t);
        if (t.length < PAGINA) return filas;
      }
    },
    async subirArchivo(ruta, blob) {
      comprobar(await sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type, upsert: true }));
    },
    async bajarArchivo(ruta) { return comprobar(await sb.storage.from(BUCKET).download(ruta)); },
  };
}

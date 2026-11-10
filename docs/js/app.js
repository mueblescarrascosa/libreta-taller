// Arranque, rutas y servicios compartidos por las pantallas.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { abrirAlmacen } from './almacen.js';
import { crearNube } from './nube.js';
import { crearSincro } from './sincro.js';
import { h, vivos } from './util.js';
import { mezclarAjustes } from './modelo.js';
import { pintarInicio } from './pantallas/inicio.js';
import { pintarTrabajo } from './pantallas/trabajo.js';
import { pintarFicha, descartarVacio } from './pantallas/ficha.js';
import { pintarAjustes } from './pantallas/ajustes.js';
import { pintarResumen } from './pantallas/resumen.js';

const raiz = document.getElementById('app');
const RETARDO_SINCRO = 1500;

const App = {
  almacen: null, nube: null, sincro: null, uid: null, email: '',
  vaciar: null, // cada pantalla guarda aquí lo que tenga pendiente; se llama al cambiar de pantalla o cerrar la app
  refrescar: null, // repinta la pantalla si llegan cambios de la nube

  alSalir: null, // al dejar la ficha: descarta lo vacío
  _ajustes: mezclarAjustes(null), _filaAjustes: null,

  // Ajustes compartidos entre dispositivos (tabla med_ajustes, una fila por cuenta con id = uid).
  ajustes() { return Object.assign({}, App._ajustes, { paredesM: App._ajustes.paredes_m }); },
  async cargarAjustes() {
    const f = App.uid ? await App.almacen.leer('ajustes', App.uid) : null;
    App._filaAjustes = f;
    if (f) { App._ajustes = mezclarAjustes(f.datos); return; }
    // Aún sin ajustes compartidos: los que tuviera este dispositivo.
    const d = {}, u = await App.almacen.getMeta('unidad'), pm = await App.almacen.getMeta('paredesM');
    if (u) d.unidad = u;
    if (pm !== null) d.paredes_m = pm;
    App._ajustes = mezclarAjustes(d);
  },
  async cambiarAjustes(cambios) {
    const f = App._filaAjustes || { id: App.uid, datos: {}, creado_at: new Date().toISOString(), updated_at: null, borrado_at: null };
    const fila = Object.assign({}, f, { datos: Object.assign({}, f.datos, cambios) });
    App._filaAjustes = fila;
    App._ajustes = mezclarAjustes(fila.datos);
    await App.guardarFila('ajustes', fila);
  },
  cambiarUnidad(u) { return App.cambiarAjustes({ unidad: u }); },
  cambiarParedesM(v) { return App.cambiarAjustes({ paredes_m: v }); },

  async guardarFila(tabla, fila) {
    await App.almacen.guardar(tabla, fila);
    App.pintarEstado();
    clearTimeout(App._t);
    App._t = setTimeout(() => App.sincro.sincronizar(), RETARDO_SINCRO);
  },

  async pintarEstado() {
    const el = document.querySelector('[data-acc="estado"]');
    if (!el) return;
    const n = await App.sincro.pendientes(), err = App.sincro.ultimoError();
    el.textContent = err === 'sesion' ? 'Entra de nuevo' : n ? n + ' por subir' : 'Todo guardado en la nube';
    el.className = 'estado' + (err === 'sesion' || n ? ' pendiente' : '');
  },

  ir(hash) { location.hash = hash; },

  // Monta la cabecera y devuelve el contenedor de la pantalla.
  marco(pantalla, titulo, atras) {
    raiz.replaceChildren();
    const main = h('main', { 'data-pantalla': pantalla });
    raiz.append(
      h('header', {},
        atras ? h('a', { class: 'atras', href: atras, 'aria-label': 'Volver' }, '←') : null,
        h('b', { class: 'titulo' }, titulo),
        h('button', { type: 'button', 'data-acc': 'estado', class: 'estado', onclick: () => App.alTocarEstado() }, ''),
        pantalla === 'ajustes' ? null : h('a', { class: 'engranaje', href: '#/ajustes', 'data-acc': 'ajustes', 'aria-label': 'Ajustes' }, '⚙')),
      main);
    App.pintarEstado();
    return main;
  },

  alTocarEstado() {
    if (App.sincro.ultimoError() === 'sesion') return pintarEntrada();
    App.sincro.sincronizar();
  },

  async salirDeCuenta() {
    await App.nube.salir();
    await App.almacen.setMeta('uid', null);
    App.uid = null;
    pintarEntrada();
  },
};

function nubeSinConexion() {
  const falla = async () => { const e = new Error('sin librería'); e.tipo = 'red'; throw e; };
  return {
    entrar: async () => ({ ok: false, error: 'Sin conexión. Inténtalo cuando tengas cobertura.' }),
    salir: async () => {}, crear: falla, actualizar: falla, leerFila: falla, cambiosDesde: falla, subirArchivo: falla, bajarArchivo: falla,
  };
}

function pintarEntrada(aviso) {
  raiz.replaceChildren();
  const email = h('input', { type: 'email', 'data-acc': 'email', placeholder: 'Correo', autocomplete: 'username' });
  const pass = h('input', { type: 'password', 'data-acc': 'pass', placeholder: 'Contraseña', autocomplete: 'current-password' });
  const msg = h('p', { class: 'aviso' }, aviso || '');
  const form = h('form', { class: 'entrada', onsubmit: async ev => {
    ev.preventDefault();
    msg.textContent = 'Comprobando…';
    const r = await App.nube.entrar(email.value.trim(), pass.value);
    if (!r.ok) { msg.textContent = r.error; return; }
    App.uid = r.uid; App.email = r.email;
    await App.almacen.setMeta('uid', r.uid);
    await App.almacen.setMeta('email', r.email);
    await App.cargarAjustes();
    if (!location.hash) location.hash = '#/';
    await ruta();
    App.sincro.sincronizar();
  } }, h('h1', {}, 'Libreta Taller'), email, pass, h('button', { type: 'submit', class: 'prin', 'data-acc': 'entrar' }, 'Entrar'), msg);
  raiz.append(form);
}

async function ruta() {
  if (!App.uid) return pintarEntrada();
  if (App.vaciar) { const v = App.vaciar; App.vaciar = null; await v(); }
  if (App.alSalir) { const s = App.alSalir; App.alSalir = null; await s(); }
  App.refrescar = null;
  const [, seccion, id] = (location.hash || '#/').split('/');
  if (seccion === 'trabajo') return pintarTrabajo(App, id);
  if (seccion === 'sueltas') return pintarTrabajo(App, null);
  if (seccion === 'ficha') return pintarFicha(App, id);
  if (seccion === 'ajustes') return pintarAjustes(App);
  if (seccion === 'resumen') return pintarResumen(App, id);
  return pintarInicio(App);
}

async function arrancar() {
  App.almacen = await abrirAlmacen();
  App.email = (await App.almacen.getMeta('email')) || '';
  // La cuenta se recuerda aquí para poder abrir la app sin cobertura aunque el token haya caducado.
  App.uid = await App.almacen.getMeta('uid');
  await App.cargarAjustes();
  // Sin la librería (sin cobertura y sin copia guardada) la app abre igual: todo queda pendiente de subir.
  App.nube = window.supabase
    ? crearNube(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'medidas-auth', persistSession: true, autoRefreshToken: true } }))
    : nubeSinConexion();
  App.sincro = crearSincro({ almacen: App.almacen, nube: App.nube });
  App.sincro.alCambiar(async hayCambios => {
    if (hayCambios) await App.cargarAjustes();
    App.pintarEstado();
    if (hayCambios && App.refrescar && !document.activeElement.matches('input,textarea')) App.refrescar();
  });
  window.addEventListener('hashchange', ruta);
  // Lo pendiente se guarda también si la app se cierra o pasa a segundo plano.
  addEventListener('pagehide', () => App.vaciar && App.vaciar());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && App.vaciar) App.vaciar(); });
  window.addEventListener('online', () => App.sincro.sincronizar());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && App.uid) App.sincro.sincronizar(); });
  // Fichas que se quedaron vacías (por ejemplo, si se cerró la app recién creada): fuera.
  if (App.uid) for (const f of vivos(await App.almacen.todos('fichas'))) await descartarVacio(App, f);
  await ruta();
  if (App.uid) App.sincro.sincronizar();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

arrancar();

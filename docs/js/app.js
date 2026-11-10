// Arranque, rutas y servicios compartidos por las pantallas.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { abrirAlmacen } from './almacen.js';
import { crearNube } from './nube.js';
import { crearSincro } from './sincro.js';
import { h } from './util.js';
import { pintarInicio } from './pantallas/inicio.js';
import { pintarTrabajo } from './pantallas/trabajo.js';
import { pintarFicha } from './pantallas/ficha.js';
import { pintarAjustes } from './pantallas/ajustes.js';

const raiz = document.getElementById('app');
const RETARDO_SINCRO = 1500;

const App = {
  almacen: null, nube: null, sincro: null, uid: null, email: '', unidad: 'mm',
  vaciar: null, // cada pantalla guarda aquí lo que tenga pendiente; se llama al cambiar de pantalla o cerrar la app
  refrescar: null, // repinta la pantalla si llegan cambios de la nube

  ajustes() { return { unidad: App.unidad }; },
  async cambiarUnidad(u) { App.unidad = u; await App.almacen.setMeta('unidad', u); },

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
    if (!location.hash) location.hash = '#/';
    await ruta();
    App.sincro.sincronizar();
  } }, h('h1', {}, 'Libreta Taller'), email, pass, h('button', { type: 'submit', class: 'prin', 'data-acc': 'entrar' }, 'Entrar'), msg);
  raiz.append(form);
}

async function ruta() {
  if (!App.uid) return pintarEntrada();
  if (App.vaciar) { const v = App.vaciar; App.vaciar = null; await v(); }
  App.refrescar = null;
  const [, seccion, id] = (location.hash || '#/').split('/');
  if (seccion === 'trabajo') return pintarTrabajo(App, id);
  if (seccion === 'sueltas') return pintarTrabajo(App, null);
  if (seccion === 'ficha') return pintarFicha(App, id);
  if (seccion === 'ajustes') return pintarAjustes(App);
  return pintarInicio(App);
}

async function arrancar() {
  App.almacen = await abrirAlmacen();
  App.unidad = (await App.almacen.getMeta('unidad')) || 'mm';
  App.email = (await App.almacen.getMeta('email')) || '';
  // La cuenta se recuerda aquí para poder abrir la app sin cobertura aunque el token haya caducado.
  App.uid = await App.almacen.getMeta('uid');
  // Sin la librería (sin cobertura y sin copia guardada) la app abre igual: todo queda pendiente de subir.
  App.nube = window.supabase
    ? crearNube(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'medidas-auth', persistSession: true, autoRefreshToken: true } }))
    : nubeSinConexion();
  App.sincro = crearSincro({ almacen: App.almacen, nube: App.nube });
  App.sincro.alCambiar(hayCambios => {
    App.pintarEstado();
    if (hayCambios && App.refrescar && !document.activeElement.matches('input,textarea')) App.refrescar();
  });
  window.addEventListener('hashchange', ruta);
  // Lo pendiente se guarda también si la app se cierra o pasa a segundo plano.
  addEventListener('pagehide', () => App.vaciar && App.vaciar());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && App.vaciar) App.vaciar(); });
  window.addEventListener('online', () => App.sincro.sincronizar());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && App.uid) App.sincro.sincronizar(); });
  await ruta();
  if (App.uid) App.sincro.sincronizar();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

arrancar();

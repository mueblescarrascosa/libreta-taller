// Croquis y fotos de una ficha. El archivo se guarda en el dispositivo y sube con la cola.
import { h, vivos } from '../util.js';
import { abrirBoceto } from '../boceto.js';
import { reducirFoto } from '../imagen.js';
import { leerMedida, verMedida } from '../unidades.js';

const urls = new Map(); // id -> URL del archivo ya cargado

async function urlDe(App, a) {
  if (urls.has(a.id)) return urls.get(a.id);
  let b = await App.almacen.leer('blobs', a.id);
  if (!b) {
    try {
      const blob = await App.nube.bajarArchivo(a.ruta);
      if (!blob) return null;
      b = { id: a.id, blob };
      await App.almacen.poner('blobs', b);
    } catch { return null; }
  }
  const u = URL.createObjectURL(b.blob);
  urls.set(a.id, u);
  return u;
}

// Pregunta cuánto mide una línea de la regla. Devuelve {mm, texto} o null («Sin medida»).
function pedirMedida(unidad) {
  return new Promise(ok => {
    const input = h('input', { 'data-acc': 'cota-valor', inputmode: unidad === 'mm' ? 'numeric' : 'decimal', autocomplete: 'off' });
    const msg = h('div', { class: 'msg-error' });
    const cerrar = r => { capa.remove(); ok(r); };
    const capa = h('div', { class: 'cota-dialogo' }, h('form', { onsubmit: ev => {
      ev.preventDefault();
      const r = leerMedida(input.value, unidad);
      if (r.error || r.mm === null) { msg.textContent = r.error ? (unidad === 'mm' ? 'En milímetros, sin decimales' : 'En centímetros, con un decimal como mucho') : 'Escribe la medida o pulsa «Sin medida»'; return; }
      cerrar({ mm: r.mm, texto: verMedida(r.mm, unidad) });
    } },
    h('b', {}, '¿Cuánto mide esta línea?'),
    h('div', { class: 'med' }, input, h('span', { class: 'ud' }, unidad)), msg,
    h('div', { class: 'botones' },
      h('button', { type: 'button', 'data-acc': 'cota-no', onclick: () => cerrar(null) }, 'Sin medida'),
      h('button', { type: 'submit', class: 'prin', 'data-acc': 'cota-ok' }, 'Aceptar'))));
    // Dentro del editor: si está a pantalla completa, lo que quede fuera no se ve.
    (document.querySelector('.boceto') || document.body).append(capa);
    input.focus();
  });
}

export async function seccionAdjuntos(App, ficha, { unidad = 'mm', anadirCotas = null } = {}) {
  const zona = h('div', { class: 'adjuntos' });
  // Abre el editor preguntando la medida de cada línea de la regla, y pasa esas medidas a la ficha.
  async function dibujar(opciones) {
    const cotas = [];
    const b = await abrirBoceto(Object.assign({ medir: () => pedirMedida(unidad), cotas }, opciones));
    if (b && cotas.length && anadirCotas) await anadirCotas(cotas);
    return b;
  }

  async function guardar(blob, tipo) {
    const id = crypto.randomUUID(), ext = blob.type === 'image/png' ? 'png' : 'jpg';
    await App.almacen.poner('blobs', { id, blob });
    await App.guardarFila('adjuntos', { id, ficha_id: ficha.id, ruta: App.uid + '/' + ficha.id + '/' + id + '.' + ext, tipo, creado_at: new Date().toISOString(), updated_at: null, borrado_at: null });
    pintar();
  }

  function ver(a, url) {
    const visor = h('div', { class: 'visor' },
      h('div', { class: 'barra' },
        h('button', { type: 'button', 'data-acc': 'cerrar-visor', onclick: () => visor.remove() }, 'Cerrar'),
        h('button', { type: 'button', class: 'peligro', 'data-acc': 'borrar-adjunto', onclick: async () => {
          if (!confirm(a.tipo === 'croquis' ? '¿Borrar este croquis?' : '¿Borrar esta foto?')) return;
          a.borrado_at = new Date().toISOString();
          await App.guardarFila('adjuntos', a);
          visor.remove(); pintar();
        } }, 'Borrar')),
      h('img', { src: url, alt: a.tipo }));
    document.body.append(visor);
  }

  async function pintar() {
    const lista = vivos(await App.almacen.todos('adjuntos')).filter(a => a.ficha_id === ficha.id).sort((x, y) => String(x.creado_at).localeCompare(String(y.creado_at)));
    const minis = await Promise.all(lista.map(async a => {
      const u = await urlDe(App, a);
      return h('button', { type: 'button', class: 'mini-img', 'data-acc': 'ver-adjunto', onclick: () => u && ver(a, u) }, u ? h('img', { src: u, alt: a.tipo }) : h('small', {}, 'Se verá con conexión'));
    }));
    zona.replaceChildren(...minis);
  }

  const elegir = (acc, alElegir) => {
    const input = h('input', { type: 'file', accept: 'image/*', 'data-acc': acc, hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files[0];
      input.value = '';
      if (f) await alElegir(f);
    });
    return input;
  };
  const foto = elegir('foto-input', async f => guardar(await reducirFoto(f), 'foto'));
  const cotas = elegir('cotas-input', async f => {
    const b = await dibujar({ fondo: f, foto: true, titulo: 'Cotas sobre la foto' });
    if (b) await guardar(await reducirFoto(b), 'foto');
  });
  foto.setAttribute('capture', 'environment');

  await pintar();
  // El título solo se ve si hay croquis o fotos; los botones van en la barra de abajo de la ficha.
  const titulo = h('h2', {}, 'Croquis y fotos');
  const verTitulo = () => { titulo.hidden = !zona.childElementCount; };
  new MutationObserver(verTitulo).observe(zona, { childList: true }); verTitulo();
  const botones = [
    h('button', { type: 'button', 'data-acc': 'croquis', onclick: async () => { const b = await dibujar({ titulo: 'Croquis' }); if (b) await guardar(b, 'croquis'); } }, '✏️ Croquis'),
    h('button', { type: 'button', 'data-acc': 'foto', onclick: () => foto.click() }, '📷 Foto'),
    h('button', { type: 'button', 'data-acc': 'cotas', onclick: () => cotas.click() }, '📐 Cotas')];
  return { pintar, botones, nodos: [titulo, zona, foto, cotas] };
}

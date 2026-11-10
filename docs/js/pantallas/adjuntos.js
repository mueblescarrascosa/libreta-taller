// Croquis y fotos de una ficha. El archivo se guarda en el dispositivo y sube con la cola.
import { h, vivos } from '../util.js';
import { abrirBoceto } from '../boceto.js';
import { reducirFoto } from '../imagen.js';

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

export async function seccionAdjuntos(App, ficha) {
  const zona = h('div', { class: 'adjuntos' });

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
    const b = await abrirBoceto({ fondo: f, foto: true, titulo: 'Cotas sobre la foto' });
    if (b) await guardar(await reducirFoto(b), 'foto');
  });
  foto.setAttribute('capture', 'environment');

  await pintar();
  return { pintar, nodos: [h('h2', {}, 'Croquis y fotos'), zona,
    h('div', { class: 'tipos' },
      h('button', { type: 'button', 'data-acc': 'croquis', onclick: async () => { const b = await abrirBoceto({ titulo: 'Croquis' }); if (b) await guardar(b, 'croquis'); } }, 'Croquis'),
      h('button', { type: 'button', 'data-acc': 'foto', onclick: () => foto.click() }, 'Foto'),
      h('button', { type: 'button', 'data-acc': 'cotas', onclick: () => cotas.click() }, 'Cotas sobre foto')),
    foto, cotas] };
}

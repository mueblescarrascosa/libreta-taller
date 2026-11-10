// Un trabajo con sus fichas. Sin id, son las notas sueltas.
import { h, segmentado, tituloFicha, vivos, NOMBRE_TIPO, NOMBRE_SUBTIPO } from '../util.js';
import { fichaNueva } from '../modelo.js';

const RETARDO = 300;

function selectorFicha(App, trabajoId) {
  const zona = h('div', { class: 'tipos' });
  const crear = async (tipo, subtipo) => {
    const f = fichaNueva(tipo, subtipo, trabajoId);
    await App.guardarFila('fichas', f);
    App.ir('#/ficha/' + f.id);
  };
  const inicial = () => zona.replaceChildren(...['puerta', 'cocina', 'armario', 'nota'].map(t =>
    h('button', { type: 'button', 'data-acc': 'tipo', 'data-v': t, onclick: () => t === 'armario' ? subtipos() : crear(t, null) }, NOMBRE_TIPO[t])));
  const subtipos = () => zona.replaceChildren(...Object.keys(NOMBRE_SUBTIPO).map(s =>
    h('button', { type: 'button', 'data-acc': 'subtipo', 'data-v': s, onclick: () => crear('armario', s) }, NOMBRE_SUBTIPO[s])));
  inicial();
  return zona;
}

export async function pintarTrabajo(App, id) {
  const trabajo = id ? await App.almacen.leer('trabajos', id) : null;
  if (id && (!trabajo || trabajo.borrado_at)) return App.ir('#/');
  const main = App.marco('trabajo', trabajo ? trabajo.nombre || 'Trabajo' : 'Notas sueltas', '#/');
  const lista = h('div', { class: 'lista' });

  async function cargar() {
    const fichas = vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id).sort((a, b) => String(a.creado_at).localeCompare(String(b.creado_at)));
    lista.replaceChildren(...(fichas.length
      ? fichas.map(f => h('a', { class: 'fila', href: '#/ficha/' + f.id, 'data-acc': 'abrir-ficha' }, h('b', {}, tituloFicha(f))))
      : [h('p', { class: 'vacio' }, 'Todavía no hay fichas.')]));
  }

  if (trabajo) {
    let espera = null;
    const pendiente = () => { clearTimeout(espera); espera = null; return App.guardarFila('trabajos', trabajo); };
    const cambio = () => { clearTimeout(espera); espera = setTimeout(pendiente, RETARDO); };
    App.vaciar = () => (espera ? pendiente() : undefined);
    const campo = (acc, k, ph) => h('input', { 'data-acc': acc, placeholder: ph, value: trabajo[k] || '', oninput: ev => { trabajo[k] = ev.target.value; cambio(); } });
    main.append(h('div', { class: 'tarjeta' },
      campo('nombre', 'nombre', 'Nombre del trabajo'), campo('cliente', 'cliente', 'Cliente'), campo('direccion', 'direccion', 'Dirección'),
      h('label', { class: 'et' }, 'Unidad de este trabajo'),
      segmentado({ acc: 'unidad', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: trabajo.unidad, alCambiar: v => { trabajo.unidad = v; App.guardarFila('trabajos', trabajo); } })));
  }

  main.append(h('h2', {}, 'Nueva ficha'), selectorFicha(App, id), h('h2', {}, 'Fichas'), lista);

  if (trabajo) {
    main.append(h('button', { type: 'button', class: 'peligro', 'data-acc': 'borrar-trabajo', onclick: async () => {
      if (!confirm('¿Borrar el trabajo «' + (trabajo.nombre || 'sin nombre') + '» y todas sus fichas?')) return;
      const ahora = new Date().toISOString();
      App.vaciar = null;
      await App.guardarFila('trabajos', Object.assign(trabajo, { borrado_at: ahora }));
      const fichas = vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id);
      for (const f of fichas) await App.guardarFila('fichas', Object.assign(f, { borrado_at: ahora }));
      App.ir('#/');
    } }, 'Borrar trabajo'));
  }
  App.refrescar = cargar;
  await cargar();
}

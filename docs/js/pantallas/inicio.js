// Lista de trabajos, notas sueltas y buscador.
import { h, segmentado, tituloFicha, vivos } from '../util.js';
import { buscar, trabajoNuevo } from '../modelo.js';

const porFecha = (a, b) => String(b.creado_at).localeCompare(String(a.creado_at));

export async function pintarInicio(App) {
  const main = App.marco('inicio', 'Libreta Taller');
  const lista = h('div', { class: 'lista' }), zonaForm = h('div', {});
  let trabajos = [], fichas = [], consulta = '';

  function pintarLista() {
    const r = buscar(consulta, trabajos, fichas), filas = [];
    r.trabajos.sort(porFecha).forEach(t => filas.push(h('a', { class: 'fila', href: '#/trabajo/' + t.id, 'data-acc': 'abrir-trabajo' },
      h('b', {}, t.nombre || 'Sin nombre'), h('small', {}, [t.cliente, t.direccion].filter(Boolean).join(' · ')))));
    if (consulta.trim()) r.fichas.sort(porFecha).forEach(f => filas.push(h('a', { class: 'fila', href: '#/ficha/' + f.id, 'data-acc': 'abrir-ficha' }, h('b', {}, tituloFicha(f)), h('small', {}, 'Ficha'))));
    lista.replaceChildren(...(filas.length ? filas : [h('p', { class: 'vacio' }, consulta.trim() ? 'Nada encontrado.' : 'Aún no hay trabajos.')]));
  }
  async function cargar() {
    trabajos = await App.almacen.todos('trabajos');
    fichas = await App.almacen.todos('fichas');
    pintarLista();
  }

  function abrirForm() {
    let unidad = App.ajustes().unidad;
    const nombre = h('input', { 'data-acc': 'trabajo-nombre', placeholder: 'Nombre del trabajo' });
    const crear = async ev => {
      ev.preventDefault();
      const t = trabajoNuevo(nombre.value.trim(), unidad);
      await App.guardarFila('trabajos', t);
      App.ir('#/trabajo/' + t.id);
    };
    zonaForm.replaceChildren(h('form', { class: 'tarjeta', onsubmit: crear }, nombre,
      h('label', { class: 'et' }, 'Unidad'),
      segmentado({ acc: 'trabajo-unidad', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: unidad, alCambiar: v => { unidad = v; } }),
      h('button', { type: 'submit', class: 'prin', 'data-acc': 'trabajo-crear' }, 'Crear')));
    nombre.focus();
  }

  main.append(
    h('input', { type: 'search', class: 'buscador', 'data-acc': 'buscar', placeholder: 'Buscar por nombre, cliente o texto', oninput: ev => { consulta = ev.target.value; pintarLista(); } }),
    h('a', { class: 'fila suelta', href: '#/sueltas', 'data-acc': 'sueltas' }, h('b', {}, 'Notas sueltas')),
    h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'nuevo-trabajo', onclick: abrirForm }, '+ Nuevo trabajo'),
    zonaForm, lista);
  App.refrescar = cargar;
  await cargar();
}

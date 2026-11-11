// Cambios que la nube no acepta: qué son, por qué, y reintentar o descartar (queda lo de la nube).
import { h, tituloFicha } from '../util.js';

const QUE = { trabajos: 'Trabajo', fichas: 'Ficha', adjuntos: 'Foto o croquis', ajustes: 'Ajustes' };

async function nombreDe(App, e) {
  const f = await App.almacen.leer(e.tabla, e.id);
  if (!f) return QUE[e.tabla] || e.tabla;
  if (e.tabla === 'trabajos') return 'Trabajo «' + (f.nombre || 'sin nombre') + '»';
  if (e.tabla === 'fichas') return 'Ficha «' + tituloFicha(f) + '»';
  return QUE[e.tabla] || e.tabla;
}

export async function pintarPendientes(App) {
  const main = App.marco('pendientes', 'Sin poder subir', '#/');
  const lista = h('div', { class: 'lista' });

  async function cargar() {
    const rech = await App.sincro.rechazadas();
    const filas = [];
    for (const e of rech) {
      filas.push(h('div', { class: 'fila papelera', 'data-rechazo': e.clave },
        h('div', {}, h('b', {}, await nombreDe(App, e)), h('small', {}, 'La nube no lo acepta: ' + e.rechazo)),
        h('div', { class: 'botones' },
          h('button', { type: 'button', class: 'mini', 'data-acc': 'reintentar', onclick: async () => { await App.sincro.reintentar(e.clave); await cargar(); App.pintarEstado(); } }, 'Reintentar'),
          h('button', { type: 'button', class: 'mini peligro', 'data-acc': 'descartar', onclick: async () => {
            if (!confirm('¿Descartar este cambio? Se queda lo que haya en la nube; si nunca llegó a subirse, desaparece de este móvil.')) return;
            await App.sincro.descartar(e.clave); await cargar(); App.pintarEstado();
          } }, 'Descartar mi cambio'))));
    }
    lista.replaceChildren(...(filas.length ? filas : [h('p', { class: 'vacio' }, 'Todo se ha podido subir.')]));
  }

  main.append(h('p', { class: 'ayuda' }, 'Estos cambios están guardados en este móvil, pero la nube no los acepta. Prueba otra vez y, si sigue igual, apunta el motivo y descártalos.'), lista);
  App.refrescar = cargar;
  await cargar();
}

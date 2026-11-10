// Papelera: lo borrado en los últimos 30 días, para recuperarlo. Nada se borra de verdad de la nube.
import { h, tituloFicha } from '../util.js';
import { enPapelera, restaurar, resumenCorto, DIAS_PAPELERA } from '../trabajos.js';
import { instante } from '../sincro.js';

const fecha = s => new Date(instante(s)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

export async function pintarPapelera(App) {
  const main = App.marco('papelera', 'Papelera', '#/');
  const lista = h('div', { class: 'lista' });

  async function cargar() {
    const trabajos = await App.almacen.todos('trabajos'), fichas = await App.almacen.todos('fichas');
    const r = enPapelera(trabajos, fichas), nombreTrabajo = id => { const t = trabajos.find(x => x.id === id); return t ? t.nombre || 'Trabajo sin nombre' : 'Notas sueltas'; };
    const fila = (tipo, x, titulo, detalle) => h('div', { class: 'fila papelera', 'data-borrado': tipo },
      h('div', {}, h('b', {}, titulo), h('small', {}, detalle + ' · borrado el ' + fecha(x.borrado_at))),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'restaurar', onclick: async () => {
        for (const { tabla, fila: f } of restaurar({ tipo, fila: x }, trabajos, fichas)) await App.guardarFila(tabla, f);
        await cargar();
      } }, 'Recuperar'));
    const filas = [
      ...r.trabajos.map(t => fila('trabajo', t, t.nombre || 'Trabajo sin nombre', 'Trabajo con sus fichas')),
      ...r.fichas.map(f => fila('ficha', f, tituloFicha(f), [resumenCorto(f), 'en ' + nombreTrabajo(f.trabajo_id)].filter(Boolean).join(' · '))),
    ];
    lista.replaceChildren(...(filas.length ? filas : [h('p', { class: 'vacio' }, 'La papelera está vacía.')]));
  }

  main.append(h('p', { class: 'ayuda' }, 'Lo que borres se guarda aquí ' + DIAS_PAPELERA + ' días.'), lista);
  App.refrescar = cargar;
  await cargar();
}

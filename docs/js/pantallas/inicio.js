// Lista de trabajos (el último tocado arriba), notas sueltas, buscador, archivados y papelera.
import { h, segmentado, tituloFicha, vivos } from '../util.js';
import { buscar, trabajoNuevo } from '../modelo.js';
import { actividad, fichasDePlantilla } from '../trabajos.js';
import { NOMBRE_ESTADO, ESTADOS } from './trabajo.js';
import { COPYRIGHT, CREDITO } from '../config.js';

const porFecha = (a, b) => String(b.creado_at).localeCompare(String(a.creado_at));
const ARMARIOS = [['corredera', 'Armario corredera'], ['abatible', 'Armario abatible'], ['vestidor', 'Vestidor']];
const MAX_ARMARIOS = 4;

export async function pintarInicio(App) {
  const main = App.marco('inicio', 'Libreta Taller');
  const lista = h('div', { class: 'lista' }), zonaForm = h('div', {});
  let trabajos = [], fichas = [], cola = new Set(), consulta = '', verArchivados = false;
  // Filtro por estado (se recuerda en este móvil). Con un estado elegido se ven solo esos, también los montados.
  let filtro = null;
  try { filtro = localStorage.getItem('med-filtro-estado') || null; } catch (e) { /* sin almacenamiento */ }
  const zonaFiltro = h('div', { class: 'chips filtro-estado' });
  const estadoDe = t => (App.trabajoDatos && t.datos && t.datos.estado) || null;
  const archivado = t => App.trabajoDatos && t.datos && t.datos.estado === 'montado';

  function filaTrabajo(t) {
    const estado = App.trabajoDatos && t.datos && t.datos.estado ? NOMBRE_ESTADO[t.datos.estado] : null;
    return h('a', { class: 'fila', href: '#/trabajo/' + t.id, 'data-acc': 'abrir-trabajo' },
      h('b', {}, t.nombre || 'Sin nombre'), h('small', {}, [estado, t.cliente, t.direccion].filter(Boolean).join(' · ')));
  }
  function pintarFiltro() {
    const vivosT = trabajos.filter(t => !t.borrado_at), cuenta = k => vivosT.filter(t => estadoDe(t) === k).length;
    const usados = ESTADOS.filter(([k]) => cuenta(k));
    if (!App.trabajoDatos || !usados.length) { zonaFiltro.replaceChildren(); return; }
    if (filtro && !cuenta(filtro)) filtro = null;
    const chip = (k, t) => h('button', { type: 'button', 'data-acc': 'filtro-estado', 'data-v': k || 'todos', class: filtro === k ? 'on' : '',
      onclick: () => { filtro = filtro === k ? null : k; try { localStorage.setItem('med-filtro-estado', filtro || ''); } catch (e) { /* sin almacenamiento */ } pintarFiltro(); pintarLista(); } }, t);
    zonaFiltro.replaceChildren(chip(null, 'Todos'), ...usados.map(([k, t]) => chip(k, t + ' ' + cuenta(k))));
  }
  function pintarLista() {
    const r = buscar(consulta, trabajos, fichas), filas = [];
    if (filtro && !consulta.trim()) r.trabajos = r.trabajos.filter(t => estadoDe(t) === filtro);
    const orden = new Map(r.trabajos.map(t => [t.id, actividad(t, fichas, cola)]));
    const ordenados = r.trabajos.sort((a, b) => (orden.get(b.id) === orden.get(a.id) ? porFecha(a, b) : orden.get(b.id) > orden.get(a.id) ? 1 : -1));
    // Buscando se ve todo; si no, los montados quedan aparte.
    const todo = consulta.trim() || filtro;
    const activos = todo ? ordenados : ordenados.filter(t => !archivado(t)), archivados = todo ? [] : ordenados.filter(archivado);
    activos.forEach(t => filas.push(filaTrabajo(t)));
    if (consulta.trim()) r.fichas.sort(porFecha).forEach(f => filas.push(h('a', { class: 'fila', href: '#/resumen/' + f.id, 'data-acc': 'abrir-ficha' }, h('b', {}, tituloFicha(f)), h('small', {}, 'Ficha'))));
    if (!filas.length) filas.push(h('p', { class: 'vacio' }, consulta.trim() ? 'Nada encontrado.' : 'Aún no hay trabajos.'));
    if (archivados.length) {
      filas.push(h('button', { type: 'button', class: 'ancho', 'data-acc': 'ver-archivados', onclick: () => { verArchivados = !verArchivados; pintarLista(); } },
        (verArchivados ? 'Ocultar' : 'Ver') + ' montados (' + archivados.length + ')'));
      if (verArchivados) archivados.forEach(t => filas.push(filaTrabajo(t)));
    }
    lista.replaceChildren(...filas);
  }
  async function cargar() {
    trabajos = await App.almacen.todos('trabajos');
    fichas = vivos(await App.almacen.todos('fichas'));
    cola = new Set(await App.almacen.claves('cola'));
    pintarFiltro(); pintarLista();
  }

  function abrirForm() {
    let unidad = App.ajustes().unidad;
    const plantilla = { puertas: false, cocina: false, armarios: {} };
    const nombre = h('input', { 'data-acc': 'trabajo-nombre', placeholder: 'Nombre del trabajo' });
    const crear = async ev => {
      ev.preventDefault();
      const t = trabajoNuevo(nombre.value.trim(), unidad);
      if (App.trabajoDatos) t.datos = {};
      await App.guardarFila('trabajos', t);
      for (const f of fichasDePlantilla(t.id, plantilla)) await App.guardarFila('fichas', f);
      App.ir('#/trabajo/' + t.id);
    };
    // Plantilla: tocar Puertas o Cocina las marca; cada toque en un armario suma uno (después de 4 vuelve a 0).
    const chip = (acc, v, texto, alTocar) => {
      const b = h('button', { type: 'button', 'data-acc': acc, 'data-v': v, onclick: () => { b.textContent = alTocar(); b.classList.toggle('on', b.textContent !== texto); } }, texto);
      return b;
    };
    zonaForm.replaceChildren(h('form', { class: 'tarjeta', onsubmit: crear }, nombre,
      h('label', { class: 'et' }, 'Unidad'),
      segmentado({ acc: 'trabajo-unidad', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: unidad, alCambiar: v => { unidad = v; } }),
      h('label', { class: 'et' }, 'Empezar ya con (opcional)'),
      h('div', { class: 'chips' },
        chip('plantilla', 'puertas', 'Puertas', () => { plantilla.puertas = !plantilla.puertas; return plantilla.puertas ? 'Puertas ✓' : 'Puertas'; }),
        chip('plantilla', 'cocina', 'Cocina', () => { plantilla.cocina = !plantilla.cocina; return plantilla.cocina ? 'Cocina ✓' : 'Cocina'; }),
        ARMARIOS.map(([s, t]) => chip('plantilla-mas', s, t, () => {
          const n = ((plantilla.armarios[s] || 0) + 1) % (MAX_ARMARIOS + 1);
          plantilla.armarios[s] = n;
          return n ? t + ' ×' + n : t;
        }))),
      h('button', { type: 'submit', class: 'prin', 'data-acc': 'trabajo-crear' }, 'Crear')));
    nombre.focus();
  }

  main.append(
    h('input', { type: 'search', class: 'buscador', 'data-acc': 'buscar', placeholder: 'Buscar por nombre, cliente o texto', oninput: ev => { consulta = ev.target.value; pintarLista(); } }),
    h('a', { class: 'fila suelta', href: '#/sueltas', 'data-acc': 'sueltas' }, h('b', {}, 'Notas sueltas')),
    h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'nuevo-trabajo', onclick: abrirForm }, '+ Nuevo trabajo'),
    zonaForm, zonaFiltro, lista,
    h('a', { class: 'enlace-papelera', href: '#/papelera', 'data-acc': 'papelera' }, 'Papelera'));
  App.refrescar = cargar;
  main.append(h('small', { class: 'version' }, COPYRIGHT + ' · ' + CREDITO));
  await cargar();
}

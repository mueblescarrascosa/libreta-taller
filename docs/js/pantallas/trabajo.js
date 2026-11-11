// Un trabajo con sus fichas. Sin id, son las notas sueltas.
import { h, segmentado, tituloFicha, vivos, icono, NOMBRE_TIPO, NOMBRE_SUBTIPO } from '../util.js';
import { textoResumen, urlWhatsapp } from '../resumen.js';
import { fichaNueva, avisos, normalizarFicha } from '../modelo.js';
import { unidadDe } from '../unidades.js';
import { resumenCorto, faltan } from '../trabajos.js';

const RETARDO = 300;
export const ESTADOS = [['medir', 'Por medir'], ['medido', 'Medido'], ['enviado', 'Enviado'], ['fabricacion', 'En fabricación'], ['montado', 'Montado']];
export const NOMBRE_ESTADO = Object.fromEntries(ESTADOS);

// Teléfono para llamar (tal cual, sin espacios) y para WhatsApp (con el 34 delante si es un número español sin prefijo).
export const telLlamar = t => String(t || '').replace(/[^\d+]/g, '');
export function telWhatsapp(t) {
  let n = telLlamar(t).replace(/^\+/, '').replace(/^00/, '');
  if (/^[6789]\d{8}$/.test(n)) n = '34' + n;
  return n;
}
export const urlMapa = dir => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dir.trim());

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
  const lista = h('div', { class: 'lista' }), AJ = App.ajustes();

  // Cada ficha con lo que tiene y lo que le falta, para verlo antes de irse de la obra.
  async function cargar() {
    const fichas = vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id).sort((a, b) => String(a.creado_at).localeCompare(String(b.creado_at)));
    const unidad = unidadDe(trabajo, AJ);
    lista.replaceChildren(...(fichas.length
      ? fichas.map(f => {
        const n = normalizarFicha(f), sin = faltan(n), av = avisos(n, unidad, { margen: AJ.margen }).length;
        // Lo que falta, con nombre (en el móvil no se ve el «title»): hasta 3 y «y N más».
        const pend = [...sin.slice(0, 3), sin.length > 3 ? 'y ' + (sin.length - 3) + ' más' : null, av ? (av === 1 ? '1 aviso' : av + ' avisos') : null].filter(Boolean);
        // Tocar la ficha abre su resumen; a la derecha, editarla o mandarla por WhatsApp sin entrar.
        return h('div', { class: 'fila con-botones' },
          h('a', { class: 'fila-enlace', href: '#/resumen/' + f.id, 'data-acc': 'abrir-ficha', 'data-tipo': f.tipo, title: sin.join('\n') },
            h('b', {}, tituloFicha(f)),
            h('small', {}, [f.nombre && f.tipo !== 'armario' ? NOMBRE_TIPO[f.tipo] : null, ...resumenCorto(n).split(' · ')]
              .filter(x => x && !tituloFicha(f).toLowerCase().includes(x.toLowerCase())).join(' · ')),
            pend.length ? h('small', { class: 'pendiente' }, pend.join(' · ')) : null),
          h('span', { class: 'botones-fila' },
            icono(h('a', { class: 'boton-fila', href: '#/ficha/' + f.id, 'data-acc': 'fila-editar' }), 'editar', 'Editar'),
            icono(h('a', { class: 'boton-fila wa', href: '#', target: '_blank', rel: 'noopener', 'data-acc': 'fila-whatsapp',
              onclick: ev => { ev.currentTarget.href = urlWhatsapp(textoResumen({ ficha: n, trabajo, ajustes: AJ })); } }), 'whatsapp', 'Enviar por WhatsApp')));
      })
      : [h('p', { class: 'vacio' }, 'Todavía no hay fichas.')]));
  }

  if (trabajo) {
    let espera = null;
    const pendiente = () => { clearTimeout(espera); espera = null; return App.guardarFila('trabajos', trabajo); };
    const cambio = () => { clearTimeout(espera); espera = setTimeout(pendiente, RETARDO); };
    App.vaciar = () => (espera ? pendiente() : undefined);
    const campo = (acc, k, ph, extra) => h('input', Object.assign({ 'data-acc': acc, placeholder: ph, value: trabajo[k] || '', oninput: ev => { trabajo[k] = ev.target.value; cambio(); if (extra) extra(); } }, {}));
    const mapa = h('a', { class: 'boton-enlace', 'data-acc': 'mapa', target: '_blank', rel: 'noopener' }, 'Abrir en Maps');
    const pintarMapa = () => { const d = String(trabajo.direccion || '').trim(); mapa.hidden = !d; mapa.href = d ? urlMapa(d) : ''; };
    pintarMapa();
    const tarjeta = h('div', { class: 'tarjeta' },
      campo('nombre', 'nombre', 'Nombre del trabajo'), campo('cliente', 'cliente', 'Cliente'),
      h('div', { class: 'con-boton' }, campo('direccion', 'direccion', 'Dirección', pintarMapa), mapa));

    // Teléfono y estado: solo con la columna nueva en la nube (ver config.js).
    if (App.trabajoDatos) {
      if (!trabajo.datos || typeof trabajo.datos !== 'object') trabajo.datos = {};
      const td = trabajo.datos;
      const llamar = h('a', { class: 'boton-enlace', 'data-acc': 'llamar' }, 'Llamar');
      const wa = h('a', { class: 'boton-enlace', 'data-acc': 'whatsapp-cliente', target: '_blank', rel: 'noopener' }, 'WhatsApp');
      const pintarTel = () => { const t = telLlamar(td.telefono); llamar.hidden = wa.hidden = !t; llamar.href = 'tel:' + t; wa.href = 'https://wa.me/' + telWhatsapp(td.telefono); };
      pintarTel();
      const tel = h('input', { 'data-acc': 'telefono', type: 'tel', placeholder: 'Teléfono', value: td.telefono || '', oninput: ev => { td.telefono = ev.target.value; cambio(); pintarTel(); } });
      tarjeta.append(h('div', { class: 'con-boton' }, tel, llamar, wa),
        h('label', { class: 'et' }, 'Estado'),
        h('div', { class: 'seg-varias' }, segmentado({ acc: 'estado-trabajo', opciones: ESTADOS, valor: td.estado || null, permitirVacio: true, alCambiar: v => { td.estado = v; cambio(); } })));
    }
    tarjeta.append(h('label', { class: 'et' }, 'Unidad de este trabajo'),
      segmentado({ acc: 'unidad', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: trabajo.unidad, alCambiar: v => { trabajo.unidad = v; App.guardarFila('trabajos', trabajo); } }));
    main.append(tarjeta);
  }

  main.append(h('h2', {}, 'Nueva ficha'), selectorFicha(App, id), h('h2', {}, 'Fichas'), lista);

  if (trabajo) {
    main.append(h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'resumen-trabajo', onclick: async () => { if (App.vaciar) await App.vaciar(); App.ir('#/resumen-trabajo/' + id); } }, 'Resumen de todo el trabajo'),
      h('button', { type: 'button', class: 'peligro', 'data-acc': 'borrar-trabajo', onclick: async () => {
        if (!confirm('¿Borrar el trabajo «' + (trabajo.nombre || 'sin nombre') + '» y todas sus fichas? Se puede recuperar desde la papelera durante 30 días.')) return;
        const ahora = new Date().toISOString();
        App.vaciar = null;
        // Primero las fichas: un trabajo borrado con fichas vivas se recuperaría solo.
        const fichas = vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id);
        for (const f of fichas) await App.guardarFila('fichas', Object.assign(f, { borrado_at: ahora }));
        await App.guardarFila('trabajos', Object.assign(trabajo, { borrado_at: ahora }));
        App.ir('#/');
      } }, 'Borrar trabajo'));
  }
  App.refrescar = cargar;
  await cargar();
}

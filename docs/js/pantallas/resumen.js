// Resumen de una ficha terminada, o de un trabajo entero: presentación limpia para ver, imprimir o enviar (PDF o texto por WhatsApp).
import { h, tituloFicha, vivos } from '../util.js';
import { verMedida } from '../unidades.js';
import { normalizarFicha, textoTipoPuerta } from '../modelo.js';
const mayus = t => (t ? t[0].toUpperCase() + t.slice(1) : '');
import { bloquesResumen, textoResumen, unidadesDe } from '../resumen.js';
import { recuentoPuertas, textoTrabajo } from '../trabajos.js';
import { geometriaPlanta, svgPlanta } from '../plano-vista.js';
import { generarPdf } from '../pdf.js';

const v = (mm, u) => (mm === null || mm === undefined ? '' : verMedida(mm, u));
const siNo = x => (x === true ? 'Sí' : x === false ? 'No' : '');
const limpio = t => String(t || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const nombreArchivo = t => (limpio(t).slice(0, 150).trim() || 'Medidas') + '.pdf';
// «Piso 1 - Puertas - Juan - C/ Mayor 3 - 11-11-2026»: lo que se ve en el nombre del PDF y en el título al imprimir.
export function tituloLargo(trabajo, parte) {
  const f = new Date(), dd = n => String(n).padStart(2, '0');
  const fecha = dd(f.getDate()) + '-' + dd(f.getMonth() + 1) + '-' + f.getFullYear();
  return [trabajo && trabajo.nombre, parte, trabajo && trabajo.cliente, trabajo && trabajo.direccion, fecha].map(limpio).filter(Boolean).join(' - ');
}

// Convierte «*Pared A* · 3 m» en negrita para la pantalla.
function linea(t) {
  const m = /^\*([^*]+)\*(.*)$/.exec(t);
  return m ? h('p', { class: 'tit' }, h('b', {}, m[1]), m[2]) : h('p', {}, t.replace(/^- /, '• '));
}

const cabecera = trabajo => h('header', {},
  h('h1', {}, trabajo ? trabajo.nombre || 'Trabajo' : 'Nota suelta'),
  trabajo && (trabajo.cliente || trabajo.direccion) ? h('p', {}, [trabajo.cliente, trabajo.direccion].filter(Boolean).join(' · ')) : null,
  h('p', { class: 'fecha' }, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })));

// Lo de una ficha: título, tabla de puertas, planta, el resto en bloques y las fotos.
async function nodosFicha(App, ficha, trabajo, AJ) {
  const d = ficha.datos, { u } = unidadesDe(ficha, trabajo, AJ), nodos = [h('h2', {}, tituloFicha(ficha))];
  if (ficha.tipo === 'puerta') {
    if (d.modelo || d.color) nodos.push(h('p', {}, [d.modelo && 'Modelo: ' + d.modelo, d.color && 'Color: ' + d.color].filter(Boolean).join(' · ')));
    nodos.push(h('table', {}, h('thead', {}, h('tr', {}, ['Puerta', 'Ancho', 'Alto', 'Tabique', 'Tipo', 'Abre', 'Condena', 'Vidriera'].map(t => h('th', {}, t)))),
      h('tbody', {}, (d.puertas || []).map((p, i) => h('tr', {}, [p.nombre || 'Puerta ' + (i + 1), v(p.ancho, u), v(p.alto, u), v(p.tabique, u), mayus(textoTipoPuerta(p, u)),
        p.mano === 'izq' ? 'Izquierda' : p.mano === 'der' ? 'Derecha' : '', siNo(p.condena), siNo(p.vidriera)].map(t => h('td', {}, t)))))),
    h('p', { class: 'nota-ud' }, 'Medidas en ' + u));
  }
  if ((d.paredes || []).length) {
    const g = geometriaPlanta(d, { margen: AJ.margen, unidad: u });
    if (g.paredes.length) nodos.push(h('div', { class: 'planta-resumen' }, svgPlanta(g)));
  }
  // El resto, con los mismos bloques que el texto de WhatsApp (sin la cabecera del trabajo ni el título).
  const bloques = bloquesResumen({ ficha, trabajo, ajustes: AJ }).slice(trabajo ? 1 : 0);
  bloques.forEach((b, i) => {
    let lineas = i === 0 ? b.slice(1) : b;
    if (ficha.tipo === 'puerta' && i === 0) lineas = [];
    if (lineas.length) nodos.push(h('section', {}, lineas.map(linea)));
  });
  const adj = vivos(await App.almacen.todos('adjuntos')).filter(a => a.ficha_id === ficha.id);
  if (adj.length) {
    const fotos = h('div', { class: 'fotos-resumen' });
    for (const a of adj) {
      const b = await App.almacen.leer('blobs', a.id);
      if (b) fotos.append(h('img', { src: URL.createObjectURL(b.blob), alt: a.tipo }));
    }
    if (fotos.childNodes.length) nodos.push(h('h3', {}, 'Croquis y fotos'), fotos);
  }
  return nodos;
}

// Botones de la cabecera del resumen: editar, enviar PDF, descargar PDF, enviar texto e imprimir.
function acciones({ doc, titulo, texto, editar, aviso }) {
  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob), a = h('a', { href: url, download: nombre });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  // soloDescargar: el botón «Descargar PDF»; si no, se comparte y, si el móvil no puede, se descarga.
  const pdf = soloDescargar => async ev => {
    const boton = ev.currentTarget; boton.disabled = true; aviso.textContent = 'Preparando el PDF…';
    try {
      const blob = await generarPdf(doc), nombre = nombreArchivo(titulo);
      const archivo = new File([blob], nombre, { type: 'application/pdf' });
      if (!soloDescargar && navigator.canShare && navigator.canShare({ files: [archivo] })) {
        aviso.textContent = '';
        await navigator.share({ files: [archivo], title: titulo });
      } else {
        descargar(blob, nombre);
        aviso.textContent = soloDescargar ? 'PDF descargado: «' + nombre + '».' : 'PDF descargado: adjúntalo en WhatsApp.';
      }
    } catch (e) {
      aviso.textContent = e && e.name === 'AbortError' ? '' : 'No se ha podido preparar el PDF. Comprueba la conexión la primera vez.';
    } finally { boton.disabled = false; }
  };
  // Al imprimir (o «Guardar como PDF» del navegador) el título de la página da el nombre del archivo y la cabecera de la hoja.
  function imprimir() {
    const antes = document.title;
    let vuelto = false;
    const volver = () => { if (!vuelto) { vuelto = true; document.title = antes; } };
    document.title = titulo;
    window.addEventListener('afterprint', volver, { once: true });
    setTimeout(volver, 3000);
    window.print();
  }
  async function enviarTexto() {
    const t = texto();
    if (navigator.share) {
      try { await navigator.share({ text: t, title: titulo }); } catch (e) { /* cancelado */ }
      return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
  }
  return h('div', { class: 'acciones' },
    h('button', { type: 'button', 'data-acc': 'editar', onclick: editar }, 'Editar'),
    h('button', { type: 'button', class: 'prin', 'data-acc': 'enviar-pdf', onclick: pdf(false) }, 'Enviar PDF'),
    h('button', { type: 'button', 'data-acc': 'descargar-pdf', onclick: pdf(true) }, 'Descargar PDF'),
    h('button', { type: 'button', 'data-acc': 'enviar-texto', onclick: enviarTexto }, 'Enviar texto'),
    h('button', { type: 'button', 'data-acc': 'imprimir', onclick: imprimir }, 'Imprimir'));
}

export async function pintarResumen(App, id) {
  const leida = await App.almacen.leer('fichas', id);
  if (!leida || leida.borrado_at) return App.ir('#/');
  const ficha = normalizarFicha(leida), AJ = App.ajustes();
  const trabajo = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
  const main = App.marco('resumen', 'Resumen', trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas');
  const aviso = h('p', { class: 'aviso-resumen' });
  const doc = h('article', { class: 'resumen-doc' }, cabecera(trabajo), ...(await nodosFicha(App, ficha, trabajo, AJ)), h('footer', {}, 'Libreta Taller'));
  const titulo = tituloLargo(trabajo, tituloFicha(ficha));
  main.append(acciones({ doc, titulo, aviso, texto: () => textoResumen({ ficha, trabajo, ajustes: AJ }), editar: () => App.ir('#/ficha/' + id) }), aviso, doc);
}

// Todo el trabajo: cabecera, recuento de puertas para el pedido y cada ficha en orden.
export async function pintarResumenTrabajo(App, id) {
  const trabajo = await App.almacen.leer('trabajos', id);
  if (!trabajo || trabajo.borrado_at) return App.ir('#/');
  const AJ = App.ajustes(), u = trabajo.unidad || AJ.unidad;
  const fichas = vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id)
    .sort((a, b) => String(a.creado_at).localeCompare(String(b.creado_at))).map(normalizarFicha);
  const main = App.marco('resumen', 'Resumen del trabajo', '#/trabajo/' + id);
  const aviso = h('p', { class: 'aviso-resumen' });
  const doc = h('article', { class: 'resumen-doc' }, cabecera(trabajo));
  const r = recuentoPuertas(fichas, u);
  if (r.total) doc.append(h('section', { class: 'recuento' }, h('p', { class: 'tit' }, h('b', {}, 'Puertas: ' + r.total)), ...r.lineas.map(t => h('p', {}, t))));
  for (const f of fichas) doc.append(h('div', { class: 'ficha-resumen' }, ...(await nodosFicha(App, f, trabajo, AJ))));
  if (!fichas.length) doc.append(h('p', { class: 'vacio' }, 'Este trabajo aún no tiene fichas.'));
  doc.append(h('footer', {}, 'Libreta Taller'));
  main.append(acciones({ doc, titulo: tituloLargo(trabajo.nombre ? trabajo : Object.assign({}, trabajo, { nombre: 'Trabajo' }), 'Medidas'), aviso, texto: () => textoTrabajo({ trabajo, fichas, ajustes: AJ }), editar: () => App.ir('#/trabajo/' + id) }), aviso, doc);
}

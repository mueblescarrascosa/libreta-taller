// Resumen de una ficha terminada: presentación limpia para ver, imprimir o enviar (PDF o texto por WhatsApp).
import { h, tituloFicha, vivos } from '../util.js';
import { verMedida } from '../unidades.js';
import { normalizarFicha } from '../modelo.js';
import { bloquesResumen, textoResumen, unidadesDe } from '../resumen.js';
import { geometriaPlanta, svgPlanta } from '../plano-vista.js';
import { generarPdf } from '../pdf.js';

const v = (mm, u) => (mm === null || mm === undefined ? '' : verMedida(mm, u));
const siNo = x => (x === true ? 'Sí' : x === false ? 'No' : '');
const nombreArchivo = t => (t.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Medidas') + '.pdf';

// Convierte «*Pared A* · 3 m» en negrita para la pantalla.
function linea(t) {
  const m = /^\*([^*]+)\*(.*)$/.exec(t);
  return m ? h('p', { class: 'tit' }, h('b', {}, m[1]), m[2]) : h('p', {}, t.replace(/^- /, '• '));
}

export async function pintarResumen(App, id) {
  const leida = await App.almacen.leer('fichas', id);
  if (!leida || leida.borrado_at) return App.ir('#/');
  const ficha = normalizarFicha(leida), d = ficha.datos, AJ = App.ajustes();
  const trabajo = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
  const { u } = unidadesDe(ficha, trabajo, AJ);
  const main = App.marco('resumen', 'Resumen', '#/ficha/' + id);
  const aviso = h('p', { class: 'aviso-resumen' });

  const doc = h('article', { class: 'resumen-doc' });
  doc.append(h('header', {},
    h('h1', {}, trabajo ? trabajo.nombre || 'Trabajo' : 'Nota suelta'),
    trabajo && (trabajo.cliente || trabajo.direccion) ? h('p', {}, [trabajo.cliente, trabajo.direccion].filter(Boolean).join(' · ')) : null,
    h('p', { class: 'fecha' }, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))),
  h('h2', {}, tituloFicha(ficha)));

  if (ficha.tipo === 'puerta') {
    if (d.modelo || d.color) doc.append(h('p', {}, [d.modelo && 'Modelo: ' + d.modelo, d.color && 'Color: ' + d.color].filter(Boolean).join(' · ')));
    doc.append(h('table', {}, h('thead', {}, h('tr', {}, ['Puerta', 'Ancho', 'Alto', 'Tabique', 'Abre', 'Condena', 'Vidriera'].map(t => h('th', {}, t)))),
      h('tbody', {}, (d.puertas || []).map((p, i) => h('tr', {}, [p.nombre || 'Puerta ' + (i + 1), v(p.ancho, u), v(p.alto, u), v(p.tabique, u),
        p.mano === 'izq' ? 'Izquierda' : p.mano === 'der' ? 'Derecha' : '', siNo(p.condena), siNo(p.vidriera)].map(t => h('td', {}, t)))))),
    h('p', { class: 'nota-ud' }, 'Medidas en ' + u));
  }
  if ((d.paredes || []).length) {
    const g = geometriaPlanta(d, { margen: AJ.margen });
    if (g.paredes.length) doc.append(h('div', { class: 'planta-resumen' }, svgPlanta(g)));
  }
  // El resto, con los mismos bloques que el texto de WhatsApp (sin la cabecera del trabajo ni el título).
  const bloques = bloquesResumen({ ficha, trabajo, ajustes: AJ }).slice(trabajo ? 1 : 0);
  bloques.forEach((b, i) => {
    let lineas = i === 0 ? b.slice(1) : b;
    if (ficha.tipo === 'puerta' && i === 0) lineas = [];
    if (lineas.length) doc.append(h('section', {}, lineas.map(linea)));
  });

  const adj = vivos(await App.almacen.todos('adjuntos')).filter(a => a.ficha_id === id);
  if (adj.length) {
    const fotos = h('div', { class: 'fotos-resumen' });
    for (const a of adj) {
      const b = await App.almacen.leer('blobs', a.id);
      if (b) fotos.append(h('img', { src: URL.createObjectURL(b.blob), alt: a.tipo }));
    }
    if (fotos.childNodes.length) doc.append(h('h3', {}, 'Croquis y fotos'), fotos);
  }
  doc.append(h('footer', {}, 'Libreta Taller'));

  const titulo = [trabajo && trabajo.nombre, tituloFicha(ficha)].filter(Boolean).join(' - ');
  async function enviarPdf(ev) {
    const boton = ev.currentTarget; boton.disabled = true; aviso.textContent = 'Preparando el PDF…';
    try {
      const blob = await generarPdf(doc), nombre = nombreArchivo(titulo);
      const archivo = new File([blob], nombre, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        aviso.textContent = '';
        await navigator.share({ files: [archivo], title: titulo });
      } else {
        const a = h('a', { href: URL.createObjectURL(blob), download: nombre });
        document.body.append(a); a.click(); a.remove();
        aviso.textContent = 'PDF descargado: adjúntalo en WhatsApp.';
      }
    } catch (e) {
      aviso.textContent = e && e.name === 'AbortError' ? '' : 'No se ha podido preparar el PDF. Comprueba la conexión la primera vez.';
    } finally { boton.disabled = false; }
  }
  async function enviarTexto() {
    const texto = textoResumen({ ficha, trabajo, ajustes: AJ });
    if (navigator.share) {
      try { await navigator.share({ text: texto, title: titulo }); } catch (e) { /* cancelado */ }
      return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  }

  main.append(
    h('div', { class: 'acciones' },
      h('button', { type: 'button', 'data-acc': 'editar', onclick: () => App.ir('#/ficha/' + id) }, 'Editar'),
      h('button', { type: 'button', class: 'prin', 'data-acc': 'enviar-pdf', onclick: enviarPdf }, 'Enviar PDF'),
      h('button', { type: 'button', 'data-acc': 'enviar-texto', onclick: enviarTexto }, 'Enviar texto'),
      h('button', { type: 'button', 'data-acc': 'imprimir', onclick: () => window.print() }, 'Imprimir')),
    aviso, doc);
}

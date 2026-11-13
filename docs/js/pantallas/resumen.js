// Resumen de una ficha terminada, o de un trabajo entero: presentación limpia para ver, imprimir o enviar (PDF o texto por WhatsApp).
import { h, tituloFicha, vivos, botonBarra, NOMBRE_TIPO } from '../util.js';
import { verMedida } from '../unidades.js';
import { normalizarFicha, textoTipoPuerta, nombreElemento, extraPilar, tamanoHumos } from '../modelo.js';
import { EMPRESA, COPYRIGHT } from '../config.js';
import { paredesVecinas } from '../modulos.js';
import { escenaPerspectiva, vistaDe, svgPerspectiva } from '../perspectiva.js';
const mayus = t => (t ? t[0].toUpperCase() + t.slice(1) : '');
import { bloquesResumen, textoResumen, unidadesDe, urlWhatsapp } from '../resumen.js';
import { recuentoPuertas, textoTrabajo, ordenFichas } from '../trabajos.js';
import { geometriaPlanta, svgPlanta } from '../plano-vista.js';
import { generarPdf, aclararDibujos } from '../pdf.js';
import { geometriaAlzado, svgAlzado } from '../alzado.js';

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
  h('p', { class: 'empresa' }, EMPRESA),
  h('h1', {}, trabajo ? trabajo.nombre || 'Trabajo' : 'Nota suelta'),
  trabajo && (trabajo.cliente || trabajo.direccion) ? h('p', {}, [trabajo.cliente, trabajo.direccion].filter(Boolean).join(' · ')) : null,
  h('p', { class: 'fecha' }, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })));

// Tomas, desagües, salidas de humos y enchufes en una tabla: dónde va cada uno y a qué altura.
// Es lo que necesita el albañil, el fontanero o el electricista si aún no están sacadas.
const INSTALACIONES = ['humos', 'desague', 'toma', 'agua', 'gas', 'enchufe'];
function tablaInstalaciones(d, u) {
  const filas = [];
  (d.paredes || []).forEach(p => {
    const vec = paredesVecinas(d, p);
    (p.elementos || []).filter(e => INSTALACIONES.includes(e.tipo)).forEach(e => {
      const lado = e.ref === 'der' ? 'der' : 'izq', pared = vec[lado];
      let donde = '';
      if (e.distancia !== null && e.distancia !== undefined) {
        const desde = extraPilar(d, p, e) > 0 ? 'del pilar (' + (lado === 'der' ? 'dcha.' : 'izq.') + ')' : pared ? 'de la pared ' + pared.letra : 'desde la ' + (lado === 'der' ? 'derecha' : 'izquierda');
        donde = 'a ' + verMedida(e.distancia, u) + ' ' + u + ' ' + desde;
      }
      const que = e.tipo === 'humos' && e.humos_forma === 'recirculacion' ? 'Campana de recirculación (sin salida de humos)' : nombreElemento(e) + (e.tipo === 'humos' && tamanoHumos(e) ? ' ' + tamanoHumos(e) : '');
      const alt = e.tipo === 'humos' && e.humos_sale === 'techo' ? 'techo' + (e.separacion != null ? ', a ' + verMedida(e.separacion, u) + ' ' + u + ' de la pared' : '')
        : e.altura !== null && e.altura !== undefined ? verMedida(e.altura, u) + ' ' + u : '';
      filas.push([p.letra, que, donde, alt]);
    });
  });
  if (!filas.length) return null;
  return h('section', { class: 'instalaciones' }, h('h3', {}, 'Tomas e instalaciones'),
    h('table', {}, h('thead', {}, h('tr', {}, ['Pared', 'Qué', 'Dónde (al centro)', 'Altura del suelo'].map(t => h('th', {}, t)))),
      h('tbody', {}, filas.map(f => h('tr', {}, f.map(t => h('td', {}, t)))))));
}

// Puertas en una tabla compacta: ancho × alto juntos, condena y vidriera como C y V, y sin las columnas que nadie usa.
function tablaPuertas(puertas, u, dePremarco) {
  const medida = p => (p.ancho != null || p.alto != null ? [v(p.ancho, u) || '?', v(p.alto, u) || '?'].concat(p.tabique != null ? [v(p.tabique, u)] : []).join(' × ') + (p.medida === 'premarco' ? ' P' : '') : '');
  const cols = [
    ['Puerta', (p, i) => p.nombre || 'Puerta ' + (i + 1)],
    [dePremarco ? 'Premarco' : 'Medida', medida],
    ['Tipo', p => mayus(textoTipoPuerta(p, u))],
    ['Abre', p => (p.mano === 'izq' ? '← Izq.' : p.mano === 'der' ? 'Dcha. →' : '')],
    ['C/V', p => [p.condena ? 'C' : '', p.vidriera ? 'V' : ''].filter(Boolean).join(' ')],
  ].filter(([t, f], k) => k < 2 || puertas.some((p, i) => f(p, i)));
  const leyenda = [(dePremarco ? 'Premarco' : 'Puerta') + ': ancho × alto' + (puertas.some(p => p.tabique != null) ? ' × tabique' : '') + ', en ' + u];
  if (puertas.some(p => p.medida === 'premarco')) leyenda.push('P = medida de premarco');
  if (cols.some(c => c[0] === 'C/V')) leyenda.push('C = condena · V = vidriera');
  return [h('table', { class: 'tabla-puertas' }, h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c[0])))),
    h('tbody', {}, puertas.map((p, i) => h('tr', {}, cols.map(c => h('td', {}, c[1](p, i))))))),
  h('p', { class: 'nota-ud' }, leyenda.join(' · '))];
}

// Qué dibujos van en el resumen (se quitan y se ponen con unos botones; se recuerda en este móvil).
const PARTES = [['planta', 'Planta'], ['frente', 'De frente'], ['perspectiva', 'Perspectiva'], ['instalaciones', 'Instalaciones'], ['fotos', 'Fotos']];
function partesGuardadas() {
  let quitadas = [];
  try { quitadas = JSON.parse(localStorage.getItem('med-resumen-quitar') || '[]'); } catch (e) { /* sin almacenamiento */ }
  return Object.fromEntries(PARTES.map(([k]) => [k, !quitadas.includes(k)]));
}
function guardarPartes(ver) {
  try { localStorage.setItem('med-resumen-quitar', JSON.stringify(PARTES.map(([k]) => k).filter(k => !ver[k]))); } catch (e) { /* sin almacenamiento */ }
}
// Los botones, solo de lo que hay en esas fichas.
async function botonesPartes(App, fichas, ver, alCambiar) {
  const conParedes = fichas.some(f => (f.datos.paredes || []).length);
  const ids = new Set(fichas.map(f => f.id)), conFotos = vivos(await App.almacen.todos('adjuntos')).some(a => ids.has(a.ficha_id));
  const hay = { planta: conParedes, frente: conParedes, perspectiva: conParedes, instalaciones: conParedes, fotos: conFotos };
  const lista = PARTES.filter(([k]) => hay[k]);
  if (!lista.length) return null;
  return h('div', { class: 'elegir-fichas elegir-partes' }, h('small', { class: 'et' }, 'Dibujos que van:'),
    h('div', { class: 'chips' }, lista.map(([k, t]) => h('button', { type: 'button', 'data-acc': 'parte-resumen', 'data-v': k, class: ver[k] ? 'on' : '',
      onclick: async () => { ver[k] = !ver[k]; guardarPartes(ver); await alCambiar(); } }, (ver[k] ? '✓ ' : '') + t))));
}

// Paredes que salen de frente: las elegidas a mano en este móvil; si no, las que tienen muebles o cotas
// (enchufes, tomas, desagües, humos…). Ventanas, puertas y pilares no cuentan.
const SIN_COTA = ['ventana', 'puerta', 'pilar'];
export function paredesConAlgo(d) {
  return (d.paredes || []).filter(p => ['bajos', 'altos', 'cuerpos'].some(k => (p[k] || []).some(m => m.tipo !== 'hueco'))
    || (p.elementos || []).some(e => !SIN_COTA.includes(e.tipo))).map(p => p.letra);
}
function paredesDeFrente(ficha) {
  try { const g = JSON.parse(localStorage.getItem('med-frente-' + ficha.id) || 'null'); if (Array.isArray(g)) return g; } catch (e) { /* sin almacenamiento */ }
  return paredesConAlgo(ficha.datos);
}
function guardarFrente(ficha, letras) {
  try { localStorage.setItem('med-frente-' + ficha.id, JSON.stringify(letras)); } catch (e) { /* sin almacenamiento */ }
}

// Lo de una ficha: título, tabla de puertas, planta, el resto en bloques y las fotos (ver: qué dibujos van).
async function nodosFicha(App, ficha, trabajo, AJ, ver = partesGuardadas()) {
  const d = ficha.datos, { u } = unidadesDe(ficha, trabajo, AJ), nodos = [h('h2', {}, tituloFicha(ficha))];
  if (ficha.tipo === 'puerta') {
    if (d.modelo || d.color) nodos.push(h('p', {}, [d.modelo && 'Modelo: ' + d.modelo, d.color && 'Color: ' + d.color].filter(Boolean).join(' · ')));
    nodos.push(...tablaPuertas(d.puertas || [], u, d.medida === 'premarco'));
  }
  if ((d.paredes || []).length) {
    const g = geometriaPlanta(d, { margen: AJ.margen, unidad: u });
    // Planta y perspectiva van juntas (al imprimir, una al lado de la otra); las paredes de frente, de dos en dos.
    const pareja = h('div', { class: 'dibujos' });
    if (g.paredes.length && ver.planta) pareja.append(h('div', { class: 'planta-resumen' }, svgPlanta(g)));
    // Cada pared de frente.
    const frentes = [];
    if (ver.frente) {
      const dibujos = d.paredes.map(p => [p.letra, geometriaAlzado(d, p, AJ)]).filter(([, ga]) => ga)
        .map(([letra, ga]) => [letra, h('div', { class: 'alzado-resumen' }, h('p', { class: 'tit' }, h('b', {}, 'Pared ' + letra + ' de frente')), svgAlzado(ga, { unidad: u }))]);
      if (dibujos.length) {
        const elegidas = new Set(paredesDeFrente(ficha)), caja = h('div', { class: 'frentes' });
        const pintar = () => caja.replaceChildren(...dibujos.filter(([l]) => elegidas.has(l)).map(([, n]) => n));
        const botones = h('div', { class: 'chips' }, dibujos.map(([l]) => h('button', { type: 'button', 'data-acc': 'frente-pared', 'data-v': l, class: elegidas.has(l) ? 'on' : '',
          onclick: ev => { if (elegidas.has(l)) elegidas.delete(l); else elegidas.add(l); guardarFrente(ficha, [...elegidas]);
            ev.currentTarget.classList.toggle('on', elegidas.has(l)); ev.currentTarget.textContent = (elegidas.has(l) ? '✓ ' : '') + l; pintar(); } }, (elegidas.has(l) ? '✓ ' : '') + l)));
        pintar();
        frentes.push(h('div', { class: 'elegir-fichas elegir-frentes' }, h('small', { class: 'et' }, 'Paredes de frente:'), botones), caja);
      }
    }
    // La perspectiva, desde donde se dejó en la ficha.
    const esc = ver.perspectiva ? escenaPerspectiva(d, { margen: AJ.margen, ajustes: AJ }) : null;
    if (esc) pareja.append(h('div', { class: 'alzado-resumen perspectiva-resumen' }, h('p', { class: 'tit' }, h('b', {}, 'Perspectiva'), ' ', h('small', {}, '(de pie, ojos a 175 cm; alturas orientativas)')), svgPerspectiva(esc, vistaDe(esc, d.vista))));
    if (pareja.childNodes.length) nodos.push(pareja);
    nodos.push(...frentes);
    const t = ver.instalaciones ? tablaInstalaciones(d, u) : null;
    if (t) nodos.push(t);
  }
  // El resto, con los mismos bloques que el texto de WhatsApp (sin la cabecera del trabajo ni el título).
  const bloques = bloquesResumen({ ficha, trabajo, ajustes: AJ }).slice(trabajo ? 1 : 0);
  bloques.forEach((b, i) => {
    let lineas = i === 0 ? b.slice(1) : b;
    if (ficha.tipo === 'puerta' && i === 0) lineas = [];
    if (lineas.length) nodos.push(h('section', {}, lineas.map(linea)));
  });
  const adj = ver.fotos ? vivos(await App.almacen.todos('adjuntos')).filter(a => a.ficha_id === ficha.id) : [];
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

// Botones del resumen, en la barra de arriba: editar, WhatsApp (texto), enviar PDF, descargar PDF e imprimir.
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
    // Ahorro de tinta en los dibujos mientras se imprime.
    const devolver = aclararDibujos(doc), fin = () => { volver(); devolver(); };
    window.addEventListener('afterprint', fin, { once: true });
    setTimeout(fin, 3000);
    window.print();
  }
  // WhatsApp directo con el texto ya escrito (WhatsApp pregunta a quién).
  function enviarTexto() { window.open(urlWhatsapp(texto()), '_blank'); }
  return [
    botonBarra(h('button', { type: 'button', 'data-acc': 'editar', onclick: editar }), 'editar', 'Editar'),
    botonBarra(h('button', { type: 'button', class: 'wa', 'data-acc': 'enviar-texto', onclick: enviarTexto }), 'whatsapp', 'WhatsApp'),
    botonBarra(h('button', { type: 'button', 'data-acc': 'enviar-pdf', onclick: pdf(false) }), 'pdf', 'Enviar PDF'),
    botonBarra(h('button', { type: 'button', 'data-acc': 'descargar-pdf', onclick: pdf(true) }), 'descargar', 'Descargar'),
    botonBarra(h('button', { type: 'button', 'data-acc': 'imprimir', onclick: imprimir }), 'imprimir', 'Imprimir')];
}

export async function pintarResumen(App, id) {
  const leida = await App.almacen.leer('fichas', id);
  if (!leida || leida.borrado_at) return App.ir('#/');
  const ficha = normalizarFicha(leida), AJ = App.ajustes();
  const trabajo = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
  const aviso = h('p', { class: 'aviso-resumen' }), doc = h('article', { class: 'resumen-doc' });
  const titulo = tituloLargo(trabajo, tituloFicha(ficha));
  const main = App.marco('resumen', tituloFicha(ficha), trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas',
    acciones({ doc, titulo, aviso, texto: () => textoResumen({ ficha, trabajo, ajustes: AJ }), editar: () => App.ir('#/ficha/' + id) }));
  const ver = partesGuardadas();
  const pintarDoc = async () => doc.replaceChildren(cabecera(trabajo), ...(await nodosFicha(App, ficha, trabajo, AJ, ver)), h('footer', {}, COPYRIGHT));
  const zona = h('div');
  const pintarBotones = async () => zona.replaceChildren(...[await botonesPartes(App, [ficha], ver, async () => { await pintarBotones(); await pintarDoc(); })].filter(Boolean));
  await pintarBotones(); await pintarDoc();
  main.append(zona, aviso, doc);
}

// Todo el trabajo: cabecera, recuento de puertas para el pedido y cada ficha en orden.
export async function pintarResumenTrabajo(App, id) {
  const trabajo = await App.almacen.leer('trabajos', id);
  if (!trabajo || trabajo.borrado_at) return App.ir('#/');
  const AJ = App.ajustes(), u = trabajo.unidad || AJ.unidad;
  const fichas = ordenFichas(vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === id))
    .map(normalizarFicha);
  const aviso = h('p', { class: 'aviso-resumen' }), doc = h('article', { class: 'resumen-doc' });
  // Qué fichas van (todas al principio): lo marcado es lo que se ve, se imprime y se envía.
  const sel = new Set(fichas.map(f => f.id)), elegidas = () => fichas.filter(f => sel.has(f.id));
  // A dónde abre cada puerta en el recuento: se recuerda en este móvil.
  let abre = true;
  try { abre = localStorage.getItem('med-recuento-abre') !== 'no'; } catch (e) { /* sin almacenamiento */ }
  const main = App.marco('resumen', 'Resumen del trabajo', '#/trabajo/' + id,
    acciones({ doc, titulo: tituloLargo(trabajo.nombre ? trabajo : Object.assign({}, trabajo, { nombre: 'Trabajo' }), 'Medidas'), aviso, texto: () => textoTrabajo({ trabajo, fichas: elegidas(), ajustes: AJ, abre }), editar: () => App.ir('#/trabajo/' + id) }));
  async function pintarDoc() {
    const lista = elegidas(), r = recuentoPuertas(lista, u, AJ, { abre }), partes = [cabecera(trabajo)];
    const botonAbre = () => h('button', { type: 'button', class: 'no-imprimir ver-abre' + (abre ? ' on' : ''), 'data-acc': 'ver-abre', onclick: async () => {
      abre = !abre;
      try { localStorage.setItem('med-recuento-abre', abre ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
      await pintarDoc();
    } }, abre ? '✓ A dónde abren' : 'A dónde abren');
    if (r.total) partes.push(h('section', { class: 'recuento' }, h('p', { class: 'tit' }, h('b', {}, r.titulo), r.paso + r.entrada > 0 ? botonAbre() : null), ...r.lineas.map(t => h('p', {}, t))));
    for (const f of lista) partes.push(h('div', { class: 'ficha-resumen' }, ...(await nodosFicha(App, f, trabajo, AJ, ver))));
    if (!lista.length) partes.push(h('p', { class: 'vacio' }, fichas.length ? 'No has marcado ninguna ficha.' : 'Este trabajo aún no tiene fichas.'));
    partes.push(h('footer', {}, COPYRIGHT));
    doc.replaceChildren(...partes);
  }
  const ver = partesGuardadas(), zonaPartes = h('div');
  const pintarPartes = async () => zonaPartes.replaceChildren(...[await botonesPartes(App, elegidas(), ver, async () => { await pintarPartes(); await pintarDoc(); })].filter(Boolean));
  const zonaSel = h('div', { class: 'elegir-fichas' });
  function pintarSel() {
    const tipos = [...new Set(fichas.map(f => f.tipo))];
    const chip = (acc, v, texto, on, alTocar, tipo) => h('button', { type: 'button', 'data-acc': acc, 'data-v': v, 'data-tipo': tipo || '', class: on ? 'on' : '', onclick: async () => { alTocar(); pintarSel(); await pintarPartes(); await pintarDoc(); } }, texto);
    zonaSel.replaceChildren(
      h('small', { class: 'et' }, 'Qué va en el resumen:'),
      h('div', { class: 'chips' },
        chip('elegir-todo', 'todo', 'Todo', sel.size === fichas.length, () => fichas.forEach(f => sel.add(f.id))),
        ...(tipos.length > 1 ? tipos.map(t => chip('elegir-tipo', t, 'Solo ' + NOMBRE_TIPO[t].toLowerCase(), fichas.every(f => sel.has(f.id) === (f.tipo === t)), () => { sel.clear(); fichas.filter(f => f.tipo === t).forEach(f => sel.add(f.id)); }, t)) : [])),
      h('div', { class: 'chips' }, fichas.map(f => chip('elegir-ficha', f.id, (sel.has(f.id) ? '✓ ' : '') + tituloFicha(f), sel.has(f.id), () => { if (sel.has(f.id)) sel.delete(f.id); else sel.add(f.id); }, f.tipo))));
  }
  if (fichas.length > 1) pintarSel();
  await pintarPartes(); await pintarDoc();
  main.append(zonaSel, zonaPartes, aviso, doc);
}

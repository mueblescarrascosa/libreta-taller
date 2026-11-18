// Resumen de una ficha terminada, o de un trabajo entero: presentación limpia para ver, imprimir o enviar (PDF o texto por WhatsApp).
import { h, reemplazar, tituloFicha, vivos, botonBarra, NOMBRE_TIPO } from '../util.js';
import { verMedida } from '../unidades.js';
import { normalizarFicha, textoTipoPuerta, nombreElemento, extraPilar, tamanoHumos } from '../modelo.js';
import { EMPRESA, COPYRIGHT } from '../config.js';
import { paredesVecinas } from '../modulos.js';
import { escenaPerspectiva, vistaDe, svgPerspectiva, OJOS } from '../perspectiva.js';
const mayus = t => (t ? t[0].toUpperCase() + t.slice(1) : '');
import { bloquesResumen, textoResumen, unidadesDe, urlWhatsapp } from '../resumen.js';
import { recuentoPuertas, textoTrabajo, ordenFichas } from '../trabajos.js';
import { geometriaPlanta, svgPlanta } from '../plano-vista.js';
import { generarPdf, aclararDibujos } from '../pdf.js';
import { geometriaAlzado, svgAlzado, fijarCocinaTipo, alturasCocina } from '../alzado.js';
import { tablerosFichas } from '../material.js';
import { pedidoCascos, pedidoFrentes, pedidoJuntos, textoPedido, MODOS_PEDIDO, MODO_PUERTAS, pedidoPuertas, textoPedidoPuertas } from '../pedido.js';
const ORDEN_PEDIDO = ['Bajos', 'Columnas', 'Altos', 'Remates'];

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
  h('p', { class: 'fecha' }, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    // Al imprimir y en el PDF el copyright va aquí arriba (el pie solo dejaba a veces una hoja con él solo).
    h('span', { class: 'copy-cab' }, ' · ' + COPYRIGHT)));

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
const PARTES = [['planta', 'Planta'], ['frente', 'De frente'], ['perspectiva', 'Perspectiva'], ['instalaciones', 'Instalaciones'], ['fotos', 'Fotos'], ['puntuacion', 'Puntuación']];
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
  const hay = { planta: conParedes, frente: conParedes, perspectiva: conParedes, instalaciones: conParedes, fotos: conFotos, puntuacion: fichas.some(f => f.tipo === 'cocina') };
  const lista = PARTES.filter(([k]) => hay[k]);
  if (!lista.length) return null;
  return h('div', { class: 'elegir-fichas elegir-partes' }, h('small', { class: 'et' }, 'Lo que va (toca para quitar o poner; ✓ = va):'),
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
  if (ficha.tipo === 'cocina') fijarCocinaTipo(alturasCocina(d, AJ));   // las alturas de esta cocina
  let conTabla = false;
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
        const pintar = () => reemplazar(caja, ...dibujos.filter(([l]) => elegidas.has(l)).map(([, n]) => n));
        const botones = h('div', { class: 'chips' }, dibujos.map(([l]) => h('button', { type: 'button', 'data-acc': 'frente-pared', 'data-v': l, class: elegidas.has(l) ? 'on' : '',
          onclick: ev => { if (elegidas.has(l)) elegidas.delete(l); else elegidas.add(l); guardarFrente(ficha, [...elegidas]);
            ev.currentTarget.classList.toggle('on', elegidas.has(l)); ev.currentTarget.textContent = (elegidas.has(l) ? '✓ ' : '') + l; pintar(); } }, (elegidas.has(l) ? '✓ ' : '') + l)));
        pintar();
        frentes.push(h('div', { class: 'elegir-fichas elegir-frentes' }, h('small', { class: 'et' }, 'Paredes de frente:'), botones), caja);
      }
    }
    // La perspectiva, desde donde se dejó en la ficha.
    const esc = ver.perspectiva ? escenaPerspectiva(d, { margen: AJ.margen, ajustes: AJ }) : null;
    if (esc) pareja.append(h('div', { class: 'alzado-resumen perspectiva-resumen' }, h('p', { class: 'tit' }, h('b', {}, 'Perspectiva'), ' ', h('small', {}, '(de pie, ojos a ' + Math.round(((d.vista && d.vista.ojos) || OJOS) / 10) + ' cm; alturas orientativas)')), svgPerspectiva(esc, vistaDe(esc, d.vista))));
    if (pareja.childNodes.length) nodos.push(pareja);
    nodos.push(...frentes);
    const t = ver.instalaciones ? tablaInstalaciones(d, u) : null;
    if (t) { nodos.push(t); conTabla = true; }
  }
  // El resto, con los mismos bloques que el texto de WhatsApp (sin la cabecera del trabajo ni el título).
  // Si ya va la tabla de instalaciones, las tomas no se repiten en el texto de cada pared.
  const bloques = bloquesResumen({ ficha, trabajo, ajustes: AJ, sinInstalaciones: conTabla, conPuntuacion: ver.puntuacion }).slice(trabajo ? 1 : 0);
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
  const ver = partesGuardadas();
  const main = App.marco('resumen', tituloFicha(ficha), trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas',
    acciones({ doc, titulo, aviso, texto: () => textoResumen({ ficha, trabajo, ajustes: AJ, conPuntuacion: ver.puntuacion }), editar: () => App.ir('#/ficha/' + id) }));
  const pintarDoc = async () => reemplazar(doc, cabecera(trabajo), ...(await nodosFicha(App, ficha, trabajo, AJ, ver)), h('footer', {}, COPYRIGHT));
  const zona = h('div');
  const pintarBotones = async () => reemplazar(zona, ...[await botonesPartes(App, [ficha], ver, async () => { await pintarBotones(); await pintarDoc(); })].filter(Boolean));
  await pintarBotones(); await pintarDoc();
  // Cocinas: hoja de pedido de cascos (para el taller) y de frentes (para el proveedor)
  const modos = ficha.tipo === 'cocina' ? MODOS_PEDIDO : ficha.tipo === 'puerta' ? [MODO_PUERTAS] : [];
  const pedidos = modos.length ? h('div', { class: 'elegir-fichas pedidos no-imprimir' }, h('small', { class: 'et' }, 'Hojas de pedido:'),
    h('div', { class: 'chips' }, modos.map(([m, t]) => h('a', { class: 'boton-chip', href: '#/pedido/' + id + '/' + m, 'data-acc': 'pedido-' + m }, t)))) : null;
  main.append(...[zona, pedidos, aviso, doc].filter(Boolean));
}

// Hoja de pedido: de una cocina (#/pedido/<ficha>/<modo>) o de varias cocinas de un trabajo (#/pedido-trabajo/<trabajo>/<modo>/<ids>).
// modo: cascos (taller), frentes (proveedor) o juntos (casco y frentes de cada mueble, por si se piden hechos).
// Arriba se cambia de modo y, en el trabajo, qué cocinas entran; la barra es la del resumen (WhatsApp, PDF, imprimir).
export async function pintarPedido(App, id, modo) {
  const leida = await App.almacen.leer('fichas', id);
  if (!leida || leida.borrado_at) return App.ir('#/');
  const ficha = normalizarFicha(leida), trabajo = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
  return pedidoDe(App, { fichas: [ficha], todas: [ficha], trabajo, modo, volver: '#/resumen/' + id, ruta: m => '#/pedido/' + id + '/' + m });
}
export async function pintarPedidoTrabajo(App, tid, modo, ids) {
  const trabajo = await App.almacen.leer('trabajos', tid);
  if (!trabajo || trabajo.borrado_at) return App.ir('#/');
  const tipo = modo === 'puertas' ? 'puerta' : 'cocina';
  const todas = ordenFichas(vivos(await App.almacen.todos('fichas')).filter(f => f.trabajo_id === tid && f.tipo === tipo)).map(normalizarFicha);
  const elegidas = ids ? new Set(decodeURIComponent(ids).split(',')) : null;
  const fichas = todas.filter(f => !elegidas || elegidas.has(f.id));
  return pedidoDe(App, { fichas, todas, trabajo, modo, volver: '#/resumen-trabajo/' + tid, ruta: (m, lista) => '#/pedido-trabajo/' + tid + '/' + m + '/' + encodeURIComponent((lista || fichas).map(f => f.id).join(',')) });
}
async function pedidoDe(App, { fichas, todas, trabajo, modo, volver, ruta }) {
  const AJ = App.ajustes();
  const esPuertas = modo === 'puertas';
  modo = esPuertas || MODOS_PEDIDO.some(([m]) => m === modo) ? modo : 'cascos';
  const nombre = { cascos: 'Pedido de cascos', frentes: 'Pedido de frentes', juntos: 'Pedido de muebles (casco y frentes)', puertas: 'Pedido de puertas' }[modo];
  const aviso = h('p', { class: 'aviso-resumen' }), doc = h('article', { class: 'resumen-doc pedido-doc' });
  const que = fichas.length === 1 ? tituloFicha(fichas[0]) : fichas.length + (esPuertas ? ' fichas de puertas' : ' cocinas');
  const titulo = tituloLargo(trabajo, nombre + ' - ' + que);
  // «Editar a mano»: la hoja se puede cambiar en pantalla (casos especiales); el PDF, la impresión y el WhatsApp salen como
  // se ha dejado. No se guarda en la ficha: es para este envío.
  let editado = false;
  const texto = () => editado ? doc.innerText.replace(/\n{3,}/g, '\n\n') : (trabajo ? '*' + (trabajo.nombre || 'Trabajo') + '*' + (fichas.length > 1 ? ' · ' + fichas.map(tituloFicha).join(', ') : '') + '\n' : '') + (esPuertas ? textoPedidoPuertas(fichas, AJ) : textoPedido(modo, fichas, AJ));
  const main = App.marco('resumen', nombre, volver, acciones({ doc, titulo, aviso, texto, editar: () => App.ir(fichas.length === 1 ? '#/ficha/' + fichas[0].id : volver) }));
  // Modo y, si hay varias cocinas, cuáles entran
  const botonEditar = h('button', { type: 'button', class: 'mini', 'data-acc': 'editar-pedido', onclick: () => {
    editado = true; doc.contentEditable = 'true'; doc.classList.add('editando');
    if (!doc.querySelector('.notas-pedido')) doc.insertBefore(h('section', { class: 'notas-pedido' }, h('h3', {}, 'Notas'), h('p', {}, 'Escribe aquí lo especial de este pedido…')), doc.querySelector('footer'));
    botonEditar.textContent = '✎ Editando: toca cualquier texto para cambiarlo'; doc.focus();
  } }, '✎ Editar a mano');
  const elegir = h('div', { class: 'elegir-fichas pedidos no-imprimir' }, botonEditar, h('small', { class: 'et' }, 'Qué hoja:'),
    h('div', { class: 'chips' }, (esPuertas ? [MODO_PUERTAS] : MODOS_PEDIDO).map(([m, t]) => h('a', { class: 'boton-chip' + (m === modo ? ' on' : ''), href: ruta(m), 'data-acc': 'modo-pedido', 'data-v': m }, t))));
  if (todas.length > 1) {
    const ids = new Set(fichas.map(f => f.id));
    elegir.append(h('small', { class: 'et' }, (esPuertas ? 'Fichas' : 'Cocinas') + ' que entran (toca para quitar o poner; ✓ = entra):'),
      h('div', { class: 'chips' }, todas.map(f => h('a', { class: 'boton-chip' + (ids.has(f.id) ? ' on' : ''), 'data-acc': 'cocina-pedido', 'data-v': f.id,
        href: ruta(modo, ids.has(f.id) ? fichas.filter(x => x.id !== f.id) : todas.filter(x => ids.has(x.id) || x.id === f.id)) }, (ids.has(f.id) ? '✓ ' : '') + tituloFicha(f)))));
  }
  const celdas = (...c) => h('tr', {}, c.map(x => h('td', {}, String(x))));
  const tabla = (cab, cuerpo) => h('div', { class: 'tabla-scroll' }, h('table', { class: 'tabla-pedido' }, h('thead', {}, h('tr', {}, cab.map(c => h('th', {}, c)))), h('tbody', {}, cuerpo)));
  const partes = [cabecera(trabajo), h('h2', {}, nombre + ' · ' + que)];
  if (!fichas.length) partes.push(h('p', { class: 'vacio' }, esPuertas ? 'No hay ninguna ficha de puertas elegida.' : 'No hay ninguna cocina elegida.'));
  else if (esPuertas) {
    const r = pedidoPuertas(fichas, AJ), cm = mm => (mm === null || mm === undefined ? '?' : String(Math.round(mm) / 10).replace('.', ','));
    partes.push(tabla(['Cant.', 'Tipo', 'Ancho × alto', 'Galce', 'Abren', 'Acabado', 'Notas', 'Dónde'], r.filas.map(f => celdas(f.cant, f.tipo, cm(f.an) + ' × ' + cm(f.al), f.galce ? cm(f.galce) : 'sin apuntar',
      [f.izq ? f.izq + ' izq.' : '', f.der ? f.der + ' dcha.' : ''].filter(Boolean).join(', ') || '—', f.acabado, [f.condena ? f.condena + ' con condena' : '', f.vidriera ? f.vidriera + ' con vidriera' : '', f.nota].filter(Boolean).join('; ') || '—', f.donde.join(', ')))));
    partes.push(h('h3', {}, 'Galces (marcos)'), h('p', {}, r.galces.map(([g, n]) => n + ' de ' + (g === null ? 'galce sin apuntar' : cm(g) + ' cm')).join(' · ')));
    partes.push(h('h3', {}, 'Tapetas y cabezales'), ...r.tapetas.map(([t, g]) => h('p', {}, h('b', {}, 'Tapetas de ' + cm(t) + ' cm: ' + g.largas + ' largas'), ' (4 por puerta) · ', h('b', {}, 'cabezales: ' + g.cabezales + ', en ' + g.tiras + (g.tiras === 1 ? ' tira' : ' tiras')), ' (de cada tira salen 2; en doble bandera, 1)')),
      ...(r.sinTapeta.length ? [h('p', { class: 'aviso-tapetas' }, '⚠ Falta elegir las tapetas (7, 9 o medida especial) en: ' + r.sinTapeta.join(', '))] : []),
      ...(r.sinTipoCorredera.length ? [h('p', { class: 'aviso-tapetas' }, '⚠ Corredera sin decir si es de granero o empotrada (cuento marco y tapetas como empotrada): ' + r.sinTipoCorredera.join(', '))] : []),
      ...(r.filas.some(f => f.tipo === 'Corredera de granero') ? [h('p', {}, 'Las correderas de granero van sin marco ni tapetas.')] : []));
    partes.push(h('p', {}, h('b', {}, 'Total: ' + r.filas.reduce((x, f) => x + f.cant, 0) + ' puertas'), ' · medidas en cm; con premarco, la puerta del catálogo que le toca.'));
  }
  else if (modo === 'frentes') {
    const filas = pedidoFrentes(fichas, AJ);
    [...new Set(filas.map(f => f.acabado))].forEach(a => partes.push(h('h3', {}, 'Acabado: ' + a),
      tabla(['Cant.', 'Pieza', 'Alto', 'Ancho', 'Dónde'], filas.filter(f => f.acabado === a).map(f => celdas(f.cant, f.pieza, f.alto, f.ancho, f.donde.join(', '))))));
    partes.push(h('p', {}, h('b', {}, 'Total: ' + filas.reduce((x, f) => x + f.cant, 0) + ' piezas'), ' · medidas en mm (alto × ancho), con la holgura entre frentes ya descontada.'));
  } else if (modo === 'cascos') {
    const filas = pedidoCascos(fichas, AJ);
    ORDEN_PEDIDO.forEach(g => { const de = filas.filter(f => f.grupo === g); if (de.length) partes.push(h('h3', {}, g), tabla(['Cant.', 'Mueble', 'Ancho', 'Alto', 'Fondo', 'Color', 'Dónde'], de.map(f => celdas(f.cant, f.mueble, f.ancho, f.alto, f.fondo, f.color || '—', f.donde.join(', '))))); });
    partes.push(h('p', {}, h('b', {}, 'Total: ' + filas.reduce((x, f) => x + f.cant, 0) + ' cascos'), ' · medidas en mm (ancho × alto × fondo).'));
  } else {
    const filas = pedidoJuntos(fichas, AJ);
    ORDEN_PEDIDO.forEach(g => { const de = filas.filter(f => f.grupo === g); if (de.length) partes.push(h('h3', {}, g), tabla(['Cant.', 'Mueble', 'Casco (an × al × fo)', 'Frentes (al × an)', 'Acabado', 'Dónde'],
      de.map(f => celdas(f.cant, f.mueble, f.casco ? f.casco.ancho + ' × ' + f.casco.alto + ' × ' + f.casco.fondo + (f.casco.color ? ' · ' + f.casco.color : '') : 'sin casco', f.frentes || '—', f.acabado || '—', f.donde.join(', '))))); });
    partes.push(h('p', {}, h('b', {}, 'Total: ' + filas.reduce((x, f) => x + f.cant, 0) + ' muebles'), ' · medidas en mm.'));
  }
  partes.push(h('small', { class: 'ayuda' }, 'Cada cocina con sus alturas (las de Ajustes o las cambiadas en su ficha). Orientativo: sale de los muebles medidos; compruébalo antes de pedir.'), h('footer', {}, COPYRIGHT));
  reemplazar(doc, ...partes);
  main.append(elegir, aviso, doc);
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
  let abre = true, juntos = true;
  try { abre = localStorage.getItem('med-recuento-abre') !== 'no'; juntos = localStorage.getItem('med-tableros-junto') !== 'no'; } catch (e) { /* sin almacenamiento */ }
  const main = App.marco('resumen', 'Resumen del trabajo', '#/trabajo/' + id,
    acciones({ doc, titulo: tituloLargo(trabajo.nombre ? trabajo : Object.assign({}, trabajo, { nombre: 'Trabajo' }), 'Medidas'), aviso, texto: () => textoTrabajo({ trabajo, fichas: elegidas(), ajustes: AJ, abre, conPuntuacion: ver.puntuacion }), editar: () => App.ir('#/trabajo/' + id) }));
  async function pintarDoc() {
    const lista = elegidas(), r = recuentoPuertas(lista, u, AJ, { abre }), partes = [cabecera(trabajo)];
    const botonAbre = () => h('button', { type: 'button', class: 'no-imprimir ver-abre' + (abre ? ' on' : ''), 'data-acc': 'ver-abre', onclick: async () => {
      abre = !abre;
      try { localStorage.setItem('med-recuento-abre', abre ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
      await pintarDoc();
    } }, abre ? '✓ A dónde abren' : 'A dónde abren');
    if (r.total) partes.push(h('section', { class: 'recuento' }, h('p', { class: 'tit' }, h('b', {}, r.titulo), r.paso + r.entrada > 0 ? botonAbre() : null), ...r.lineas.map(t => h('p', {}, t))));
    for (const f of lista) partes.push(h('div', { class: 'ficha-resumen' }, ...(await nodosFicha(App, f, trabajo, AJ, ver))));
    // Tableros de todo el trabajo: juntos (las piezas de todas las fichas en los mismos tableros) o por ficha.
    const tb = lista.length > 1 ? tablerosFichas(lista) : [];
    if (tb.length) {
      const fila = (t, x) => t.tableros + (t.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207 (' + String(t.m2).replace('.', ',') + ' m² de piezas, aprovecha el ' + t.aprovechamiento + ' %)';
      const chip = (v, txt) => h('button', { type: 'button', 'data-acc': 'tableros-modo', 'data-v': v, class: (juntos === (v === 'junto') ? 'on ' : '') + 'no-imprimir', onclick: async () => {
        juntos = v === 'junto'; try { localStorage.setItem('med-tableros-junto', juntos ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ } await pintarDoc(); } }, txt);
      partes.splice(partes.length, 0, h('section', { class: 'tableros-trabajo', 'data-acc': 'tableros-trabajo' },
        h('p', { class: 'tit' }, h('b', {}, 'Tableros de todo el trabajo'), ' ', h('span', { class: 'chips' }, chip('junto', 'Todo junto'), chip('ficha', 'Por ficha'))),
        ...tb.map(x => juntos
          ? h('p', { 'data-clase': x.clase }, h('b', {}, x.nombre + ': '), fila(x.junto), x.sumaSeparado > x.junto.tableros ? h('span', { class: 'ahorro' }, ' · por separado serían ' + x.sumaSeparado + ': ahorras ' + (x.sumaSeparado - x.junto.tableros)) : null)
          : h('div', { 'data-clase': x.clase }, h('p', {}, h('b', {}, x.nombre)), ...x.separado.map(s => h('p', { class: 'sub' }, tituloFicha(s.ficha) + ': ' + fila(s.t))))),
        h('small', { class: 'ayuda' }, 'Orientativo: piezas colocadas en el tablero con 4 mm de corte y 1 cm de recorte al borde. Todo junto aprovecha los tableros entre fichas.')));
    }
    if (!lista.length) partes.push(h('p', { class: 'vacio' }, fichas.length ? 'No has marcado ninguna ficha.' : 'Este trabajo aún no tiene fichas.'));
    partes.push(h('footer', {}, COPYRIGHT));
    reemplazar(doc, ...partes);
  }
  // Hojas de pedido de las cocinas del trabajo (todas juntas; en la hoja se eligen cuáles)
  const cocinas = fichas.filter(f => f.tipo === 'cocina'), dePuertas = fichas.filter(f => f.tipo === 'puerta');
  const enlaces = [...(cocinas.length ? MODOS_PEDIDO.map(([m, t]) => [m, t, cocinas]) : []), ...(dePuertas.length ? [[MODO_PUERTAS[0], MODO_PUERTAS[1], dePuertas]] : [])];
  const zonaPedidos = enlaces.length ? h('div', { class: 'elegir-fichas pedidos no-imprimir' }, h('small', { class: 'et' }, 'Hojas de pedido del trabajo:'),
    h('div', { class: 'chips' }, enlaces.map(([m, t, l]) => h('a', { class: 'boton-chip', href: '#/pedido-trabajo/' + id + '/' + m + '/' + encodeURIComponent(l.map(f => f.id).join(',')), 'data-acc': 'pedido-trabajo-' + m }, t)))) : null;
  const ver = partesGuardadas(), zonaPartes = h('div');
  const pintarPartes = async () => reemplazar(zonaPartes, ...[await botonesPartes(App, elegidas(), ver, async () => { await pintarPartes(); await pintarDoc(); })].filter(Boolean));
  const zonaSel = h('div', { class: 'elegir-fichas' });
  function pintarSel() {
    const tipos = [...new Set(fichas.map(f => f.tipo))];
    const chip = (acc, v, texto, on, alTocar, tipo) => h('button', { type: 'button', 'data-acc': acc, 'data-v': v, 'data-tipo': tipo || '', class: on ? 'on' : '', onclick: async () => { alTocar(); pintarSel(); await pintarPartes(); await pintarDoc(); } }, texto);
    reemplazar(zonaSel, 
      h('small', { class: 'et' }, 'Qué va en el resumen (toca para quitar o poner; ✓ = va):'),
      h('div', { class: 'chips' },
        chip('elegir-todo', 'todo', 'Todo', sel.size === fichas.length, () => fichas.forEach(f => sel.add(f.id))),
        ...(tipos.length > 1 ? tipos.map(t => chip('elegir-tipo', t, 'Solo ' + NOMBRE_TIPO[t].toLowerCase(), fichas.every(f => sel.has(f.id) === (f.tipo === t)), () => { sel.clear(); fichas.filter(f => f.tipo === t).forEach(f => sel.add(f.id)); }, t)) : [])),
      h('div', { class: 'chips' }, fichas.map(f => chip('elegir-ficha', f.id, (sel.has(f.id) ? '✓ ' : '') + tituloFicha(f), sel.has(f.id), () => { if (sel.has(f.id)) sel.delete(f.id); else sel.add(f.id); }, f.tipo))));
  }
  if (fichas.length > 1) pintarSel();
  await pintarPartes(); await pintarDoc();
  main.append(...[zonaPedidos].filter(Boolean), zonaSel, zonaPartes, aviso, doc);
}

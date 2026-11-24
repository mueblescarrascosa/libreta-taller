// Ajustes compartidos entre dispositivos: unidades, margen de aviso y listas (botones rápidos, usos, lineales…).
import { h, reemplazar, segmentado } from '../util.js';
import { VERSION, COPYRIGHT, CREDITO } from '../config.js';
import { bienvenida, crearEjemplo, letraGrande, GUIA } from '../ayuda.js';
import { AJUSTES_FABRICA, claveDe } from '../modelo.js';
import { leerMedida, verMedida } from '../unidades.js';
import { copiaSeguridad } from '../trabajos.js';
import { PRECIOS_ML, NOMBRE_PRECIO, RECARGO_PCT, PRECIOS_EXTRA, NOMBRE_EXTRA, preciosExtraDe } from '../coste.js';

// Lista editable: quitar, subir, añadir y volver a los valores de fábrica.
// numeros: medidas en mm que se ven y se escriben en cm; si no, pares [clave, texto].
function listaEditable(App, k, titulo, numeros, ayuda) {
  const caja = h('div', { class: 'tarjeta', 'data-lista': k });
  function guardar(nueva) { App.cambiarAjustes({ [k]: nueva }); pintar(); }
  function pintar() {
    const lista = App.ajustes()[k], msg = h('div', { class: 'msg-error' });
    const nuevo = h('input', { 'data-acc': 'nuevo', inputmode: numeros ? 'decimal' : 'text', placeholder: numeros ? 'Medida en cm' : 'Nombre' });
    const anadir = () => {
      const t = nuevo.value.trim();
      if (!t) return;
      if (numeros) {
        const r = leerMedida(t, 'cm');
        if (r.error || !r.mm) { msg.textContent = 'En centímetros, con un decimal como mucho'; return; }
        if (lista.includes(r.mm)) { msg.textContent = 'Ya está en la lista'; return; }
        return guardar(lista.concat([r.mm]));
      }
      let clave = claveDe(t);
      while (lista.some(x => x[0] === clave)) clave += '_2';
      guardar(lista.concat([[clave, t]]));
    };
    nuevo.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); anadir(); } });
    reemplazar(caja, 
      h('div', { class: 'cab' }, h('b', {}, titulo),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'fabrica', onclick: () => guardar(JSON.parse(JSON.stringify(AJUSTES_FABRICA[k]))) }, 'Valores de fábrica')),
      ...(ayuda ? [h('small', { class: 'ayuda' }, ayuda)] : []),
      h('div', { class: 'items' }, lista.map((x, i) => h('div', { class: 'item', 'data-item': numeros ? String(x) : x[0] },
        h('span', {}, numeros ? verMedida(x, 'cm') + ' cm' : x[1]),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { const n = lista.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; guardar(n); } }, '↑'),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar', 'aria-label': 'Quitar', onclick: () => guardar(lista.filter((_, j) => j !== i)) }, '✕')))),
      h('div', { class: 'libre' }, nuevo, h('span', {}), h('button', { type: 'button', 'data-acc': 'anadir', onclick: anadir }, 'Añadir')), msg);
  }
  pintar();
  return caja;
}

// Copia de todo en un archivo: se comparte (móvil) o se descarga (ordenador).
async function descargarCopia(App, msg) {
  if (App.vaciar) await App.vaciar();
  const [trabajos, fichas, adjuntos] = await Promise.all(['trabajos', 'fichas', 'adjuntos'].map(t => App.almacen.todos(t)));
  const ahora = new Date(), copia = copiaSeguridad({ trabajos, fichas, adjuntos, ajustes: App.ajustes(), version: VERSION, ahora: ahora.toISOString() });
  const nombre = 'libreta-taller-copia-' + ahora.toISOString().slice(0, 10) + '.json';
  const archivo = new File([JSON.stringify(copia, null, 2)], nombre, { type: 'application/json' });
  const descargar = () => {
    const a = h('a', { href: URL.createObjectURL(archivo), download: nombre });
    document.body.append(a); a.click(); a.remove();
    msg.textContent = 'Copia descargada: ' + nombre;
  };
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Copia de Libreta Taller' }); msg.textContent = ''; }
    catch (e) { if (e && e.name !== 'AbortError') descargar(); }
  } else descargar();
}

// Un número de los ajustes (mm, entero, 0 o más).
function numeroAjuste(App, clave, etiqueta) {
  const i = h('input', { 'data-acc': clave, inputmode: 'numeric', value: App.ajustes()[clave] });
  i.addEventListener('input', () => { const v = Number(i.value); if (Number.isInteger(v) && v >= 0) App.cambiarAjustes({ [clave]: v }); });
  return h('div', { class: 'campo' }, h('label', { class: 'et' }, etiqueta), i);
}

// Precios del coste estimado: € por metro lineal sin IVA de cada clase de mueble y el recargo por complicación.
function preciosCoste(App) {
  const caja = h('div', { class: 'tarjeta', 'data-acc': 'precios-coste' });
  const num = t => { const x = Number(String(t).replace(',', '.')); return Number.isFinite(x) && x >= 0 ? x : null; };
  const pintar = () => {
    const A = App.ajustes(), P = A.precios_ml;
    reemplazar(caja,
      h('small', { class: 'ayuda' }, 'Para el «Coste estimado» de cada ficha: € por metro lineal, sin IVA. Solo lo ves tú; no sale en el PDF.'),
      ...Object.keys(NOMBRE_PRECIO).map(k => { const i = h('input', { 'data-acc': 'precio-ml', 'data-v': k, inputmode: 'decimal', value: P[k] });
        i.addEventListener('input', () => { const x = num(i.value); if (x !== null) App.cambiarAjustes({ precios_ml: Object.assign({}, App.ajustes().precios_ml, { [k]: x }) }); });
        return h('div', { class: 'campo' }, h('label', { class: 'et' }, NOMBRE_PRECIO[k] + ' (€/m)'), i); }),
      (() => { const i = h('input', { 'data-acc': 'recargo-pct', inputmode: 'decimal', value: A.recargo_pct });
        i.addEventListener('input', () => { const x = num(i.value); if (x !== null && x <= 300) App.cambiarAjustes({ recargo_pct: x }); });
        return h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Recargo por complicación (%)'), i,
          h('small', {}, 'Cajeado por pilar, tubo o contador, pared descuadrada. Se puede cambiar en cada mueble.')); })(),
      h('h5', {}, 'Para «Calcular con la tarifa»'),
      h('small', { class: 'ayuda' }, 'Orientativos, sin IVA: cornisa y tira LED por metro; electrodomésticos por unidad (solo suman en el cálculo, no al pasar a presupuesto). A 0, salen sin precio.'),
      ...Object.keys(NOMBRE_EXTRA).map(k => { const i = h('input', { 'data-acc': 'precio-extra', 'data-v': k, inputmode: 'decimal', value: preciosExtraDe(A)[k] });
        i.addEventListener('input', () => { const x = num(i.value); if (x !== null) App.cambiarAjustes({ precios_extra: Object.assign(preciosExtraDe(App.ajustes()), { [k]: x }) }); });
        return h('div', { class: 'campo' }, h('label', { class: 'et' }, NOMBRE_EXTRA[k] + (k === 'cornisa' || k === 'led' ? '' : ' (€)')), i); }),
      h('button', { type: 'button', 'data-acc': 'precios-fabrica', onclick: async () => { await App.cambiarAjustes({ precios_ml: Object.assign({}, PRECIOS_ML), recargo_pct: RECARGO_PCT, precios_extra: Object.assign({}, PRECIOS_EXTRA) }); pintar(); } }, 'Volver a los de fábrica'));
  };
  pintar();
  return caja;
}

const PESTANAS = [['general', 'General'], ['puertas', 'Puertas'], ['cocina', 'Cocina y armarios'], ['todo', 'Ver todo']];
export async function pintarAjustes(App, pestana) {
  const main = App.marco('ajustes', 'Ajustes', '#/'), A = App.ajustes(), msgCopia = h('small', { class: 'ayuda', 'data-acc': 'msg-copia' });
  const p = PESTANAS.some(x => x[0] === pestana) ? pestana : 'general', ver = k => p === 'todo' || p === k;
  main.append(h('nav', { class: 'chips pestanas', 'data-acc': 'pestanas-ajustes', 'aria-label': 'Apartados de los ajustes' }, PESTANAS.map(([k, t]) =>
    h('button', { type: 'button', 'data-acc': 'pestana', 'data-v': k, class: k === p ? 'on' : '', 'aria-current': k === p ? 'page' : 'false', onclick: () => App.ir('#/ajustes/' + k) }, t))));
  const margen = h('input', { 'data-acc': 'margen', inputmode: 'numeric', value: A.margen });
  margen.addEventListener('input', () => { const v = Number(margen.value); if (Number.isInteger(v) && v > 0) App.cambiarAjustes({ margen: v }); });
  const general = [
    h('small', { class: 'ayuda' }, 'Estos ajustes se comparten entre todos tus dispositivos.'),
    h('div', { class: 'tarjeta' },
      h('label', { class: 'et' }, 'Unidad predeterminada'),
      segmentado({ acc: 'unidad-pred', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: A.unidad, alCambiar: v => App.cambiarUnidad(v) }),
      h('small', {}, 'Se aplica a los trabajos nuevos y a las notas sueltas. Los trabajos ya creados no cambian.'),
      h('label', { class: 'et' }, 'Paredes de cocina y vestidor'),
      segmentado({ acc: 'paredes-m', opciones: [[true, 'En metros'], [false, 'En la unidad del trabajo']], valor: A.paredes_m, alCambiar: v => App.cambiarParedesM(v) }),
      h('label', { class: 'et' }, 'Margen de aviso (mm)'), margen,
      h('small', {}, 'Diferencia a partir de la cual se avisa: anchos de un hueco, cierre de la planta, diagonales.'))];
  const puertas = () => [
    h('h2', {}, 'Puertas'),
    listaEditable(App, 'puerta_anchos', 'Anchos rápidos', true),
    listaEditable(App, 'puerta_altos', 'Altos rápidos', true),
    listaEditable(App, 'puerta_tabiques', 'Tabiques rápidos', true),
    listaEditable(App, 'premarco_anchos', 'Premarco: anchos rápidos', true),
    listaEditable(App, 'premarco_altos', 'Premarco: altos rápidos', true),
    listaEditable(App, 'nombres_puerta', 'Nombres rápidos de puertas', false),
    h('h3', {}, 'Pedido de puertas (según el premarco)'),
    h('small', { class: 'ayuda' }, 'En el resumen del trabajo, cada premarco se junta con la puerta que hay que pedir. Medidas en mm.'),
    listaEditable(App, 'pedido_anchos', 'Anchos de puerta habituales', true),
    listaEditable(App, 'pedido_anchos_extra', 'Anchos «,5» (no todos los fabricantes)', true),
    listaEditable(App, 'pedido_altos', 'Altos de puerta', true),
    h('div', { class: 'tarjeta' },
      numeroAjuste(App, 'holgura_ancho', 'De ancho, el premarco pide (mm de más)'),
      numeroAjuste(App, 'holgura_alto', 'De alto, el premarco pide (mm de más)'),
      numeroAjuste(App, 'rebaje_max', 'Se puede rebajar el premarco como mucho (mm)'),
      h('small', {}, 'Con un premarco que entra justo en una puerta de «,5» se pide esa antes que rebajar.'))];
  const cocina = () => [
    h('h2', {}, 'Cocina y armarios'),
    listaEditable(App, 'modulo_anchos', 'Anchos rápidos de módulos y cuerpos', true),
    listaEditable(App, 'lineales', 'Lineales', false),
    listaEditable(App, 'interiores', 'Interiores de armario', false),
    listaEditable(App, 'colores_casco', 'Colores del interior (cascos)', false),
    listaEditable(App, 'encimera_gruesos', 'Gruesos de encimera', true),
    h('h2', {}, 'Coste estimado'),
    preciosCoste(App),
    h('h2', {}, 'Tomas y enchufes'),
    listaEditable(App, 'usos_toma', 'Tomas: de qué son', false),
    listaEditable(App, 'usos_enchufe', 'Enchufes: de qué son', false)];
  const resto = [
    h('h2', {}, 'Copia de seguridad'),
    h('div', { class: 'tarjeta' },
      h('small', { class: 'ayuda' }, 'Un archivo con todos tus trabajos, fichas, notas, papelera y ajustes (cada ficha con su resumen en texto). Las fotos no van dentro: siguen en la nube. Guárdalo en el ordenador o en tu correo de vez en cuando.'),
      h('button', { type: 'button', 'data-acc': 'copia-seguridad', onclick: () => descargarCopia(App, msgCopia) }, 'Descargar copia de seguridad'), msgCopia),
    h('h2', {}, 'Ayuda'),
    h('div', { class: 'tarjeta botones-ayuda' },
      h('a', { class: 'boton-enlace', href: GUIA, target: '_blank', rel: 'noopener', 'data-acc': 'guia-uso' }, 'Guía de uso de la Libreta'),
      h('button', { type: 'button', 'data-acc': 'ver-bienvenida', onclick: () => bienvenida(App, { forzar: true }) }, 'Ver la bienvenida otra vez'),
      h('button', { type: 'button', 'data-acc': 'crear-ejemplo', onclick: async () => { const t = await crearEjemplo(App); App.ir('#/trabajo/' + t.id); } }, 'Crear un trabajo de ejemplo'),
      h('button', { type: 'button', 'data-acc': 'letra-ajustes', onclick: ev => { const on = letraGrande(!document.documentElement.classList.contains('letra-grande')); ev.currentTarget.textContent = on ? 'Letra normal' : 'Letra grande'; } }, document.documentElement.classList.contains('letra-grande') ? 'Letra normal' : 'Letra grande')),
    h('h2', {}, 'Guía de medidas'),
    h('div', { class: 'tarjeta' }, h('button', { type: 'button', 'data-acc': 'abrir-guia', onclick: () => { location.hash = '#/guia'; } }, 'Guía de medidas de cocina'),
      h('small', { class: 'ayuda' }, 'Alturas, anchos, distancias y soluciones habituales, y la altura de encimera según la estatura.')),
    h('h2', {}, 'Cuenta'),
    h('div', { class: 'tarjeta' },
      h('p', {}, App.email),
      h('button', { type: 'button', 'data-acc': 'sincronizar', onclick: () => App.sincro.sincronizar() }, 'Sincronizar ahora'),
      h('button', { type: 'button', 'data-acc': 'salir', onclick: async () => {
        const n = await App.sincro.pendientes();
        if (n && !confirm('Hay ' + n + ' cambios sin subir. Se quedan en este dispositivo y subirán cuando vuelvas a entrar. ¿Salir?')) return;
        App.salirDeCuenta();
      } }, 'Salir de la cuenta'))];
  main.append(...(ver('general') ? general : []), ...(ver('puertas') ? puertas() : []), ...(ver('cocina') ? cocina() : []), ...(ver('general') ? resto : []),
    h('small', { class: 'version' }, 'Versión ' + VERSION + ' · ' + COPYRIGHT + ' · ' + CREDITO));
}

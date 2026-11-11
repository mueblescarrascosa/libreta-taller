// Ajustes compartidos entre dispositivos: unidades, margen de aviso y listas (botones rápidos, usos, lineales…).
import { h, segmentado } from '../util.js';
import { VERSION, COPYRIGHT, CREDITO } from '../config.js';
import { AJUSTES_FABRICA, claveDe } from '../modelo.js';
import { leerMedida, verMedida } from '../unidades.js';
import { copiaSeguridad } from '../trabajos.js';

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
    caja.replaceChildren(
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

export async function pintarAjustes(App) {
  const main = App.marco('ajustes', 'Ajustes', '#/'), A = App.ajustes(), msgCopia = h('small', { class: 'ayuda', 'data-acc': 'msg-copia' });
  const margen = h('input', { 'data-acc': 'margen', inputmode: 'numeric', value: A.margen });
  margen.addEventListener('input', () => { const v = Number(margen.value); if (Number.isInteger(v) && v > 0) App.cambiarAjustes({ margen: v }); });
  main.append(
    h('small', { class: 'ayuda' }, 'Estos ajustes se comparten entre todos tus dispositivos.'),
    h('div', { class: 'tarjeta' },
      h('label', { class: 'et' }, 'Unidad predeterminada'),
      segmentado({ acc: 'unidad-pred', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: A.unidad, alCambiar: v => App.cambiarUnidad(v) }),
      h('small', {}, 'Se aplica a los trabajos nuevos y a las notas sueltas. Los trabajos ya creados no cambian.'),
      h('label', { class: 'et' }, 'Paredes de cocina y vestidor'),
      segmentado({ acc: 'paredes-m', opciones: [[true, 'En metros'], [false, 'En la unidad del trabajo']], valor: A.paredes_m, alCambiar: v => App.cambiarParedesM(v) }),
      h('label', { class: 'et' }, 'Margen de aviso (mm)'), margen,
      h('small', {}, 'Diferencia a partir de la cual se avisa: anchos de un hueco, cierre de la planta, diagonales.')),
    h('h2', {}, 'Puertas'),
    listaEditable(App, 'puerta_anchos', 'Anchos rápidos', true),
    listaEditable(App, 'puerta_altos', 'Altos rápidos', true),
    listaEditable(App, 'puerta_tabiques', 'Tabiques rápidos', true),
    h('h2', {}, 'Cocina y armarios'),
    listaEditable(App, 'modulo_anchos', 'Anchos rápidos de módulos y cuerpos', true),
    listaEditable(App, 'lineales', 'Lineales', false),
    listaEditable(App, 'interiores', 'Interiores de armario', false),
    h('h2', {}, 'Tomas y enchufes'),
    listaEditable(App, 'usos_toma', 'Tomas: de qué son', false),
    listaEditable(App, 'usos_enchufe', 'Enchufes: de qué son', false),
    h('h2', {}, 'Copia de seguridad'),
    h('div', { class: 'tarjeta' },
      h('small', { class: 'ayuda' }, 'Un archivo con todos tus trabajos, fichas, notas, papelera y ajustes (cada ficha con su resumen en texto). Las fotos no van dentro: siguen en la nube. Guárdalo en el ordenador o en tu correo de vez en cuando.'),
      h('button', { type: 'button', 'data-acc': 'copia-seguridad', onclick: () => descargarCopia(App, msgCopia) }, 'Descargar copia de seguridad'), msgCopia),
    h('h2', {}, 'Cuenta'),
    h('div', { class: 'tarjeta' },
      h('p', {}, App.email),
      h('button', { type: 'button', 'data-acc': 'sincronizar', onclick: () => App.sincro.sincronizar() }, 'Sincronizar ahora'),
      h('button', { type: 'button', 'data-acc': 'salir', onclick: async () => {
        const n = await App.sincro.pendientes();
        if (n && !confirm('Hay ' + n + ' cambios sin subir. Se quedan en este dispositivo y subirán cuando vuelvas a entrar. ¿Salir?')) return;
        App.salirDeCuenta();
      } }, 'Salir de la cuenta')),
    h('small', { class: 'version' }, 'Versión ' + VERSION + ' · ' + COPYRIGHT + ' · ' + CREDITO));
}

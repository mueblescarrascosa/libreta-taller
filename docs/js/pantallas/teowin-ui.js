// Tarjeta «Llevar a TeoWin» de la ficha de cocina: genera la escena .3d y la guarda en la carpeta de escenas de TeoWin.
// Solo en el ordenador donde está TeoWin (Chrome o Edge): la primera vez se elige la carpeta E_107 de TeoWin
// (C:\TeoWin\datos\3d\E_107) y la app la recuerda; de ahí lee las plantillas de los muebles y en su «Escenas» deja la escena.
import { h, reemplazar } from '../util.js';
import { escenaTeowin, plantillasNecesarias, bytesLatin1 } from '../teowin.js';

const CLAVE = 'teowin_carpeta';
export const puedeTeowin = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

// Bytes → texto tal cual (latin1: cada byte, un carácter), como los guarda TeoWin
const latin1 = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return s; };
const hijo = async (dir, nombre, tipo = 'dir') => { try { return tipo === 'dir' ? await dir.getDirectoryHandle(nombre) : await dir.getFileHandle(nombre); } catch (e) { return null; } };
// Acepta la carpeta E_107 o una de encima (TeoWin, datos, 3d): baja hasta la que tiene «Escenas» y el catálogo 19024
async function buscarE107(dir) {
  const es = async x => !!(x && await hijo(x, 'Escenas') && await hijo(x, '19024'));
  if (await es(dir)) return dir;
  for (const ruta of [['E_107'], ['3d', 'E_107'], ['datos', '3d', 'E_107']]) {
    let x = dir;
    for (const n of ruta) { x = x && await hijo(x, n); }
    if (await es(x)) return x;
  }
  return null;
}
async function permiso(dir) {
  const o = { mode: 'readwrite' };
  if ((await dir.queryPermission(o)) === 'granted') return true;
  return (await dir.requestPermission(o)) === 'granted';
}
async function carpeta(App, { elegirOtra = false } = {}) {
  let dir = elegirOtra ? null : await App.almacen.getMeta(CLAVE);
  if (dir && !(await permiso(dir))) dir = null;
  if (!dir) {
    const elegida = await window.showDirectoryPicker({ id: 'teowin', mode: 'readwrite' });
    dir = await buscarE107(elegida);
    if (!dir) throw new Error('En esa carpeta no está TeoWin: elige C:\\TeoWin\\datos\\3d\\E_107 (la que tiene «Escenas» y «19024»).');
    try { await App.almacen.setMeta(CLAVE, dir); } catch (e) { /* si no se puede guardar, se pedirá otra vez */ }
  }
  return dir;
}
async function leerPlantillas(dir, lista) {
  const r = {};
  for (const { cat, fam, cod } of lista) {
    let x = await hijo(dir, cat); x = x && await hijo(x, 'Catalogo'); x = x && await hijo(x, fam);
    const f = x && await hijo(x, cod + '.3d', 'file');
    r[cat + '/' + fam + '/' + cod] = f ? latin1(await (await f.getFile()).arrayBuffer()) : null;
  }
  return r;
}
// Nombre de la escena: el del trabajo y el de la ficha, sin lo que Windows no deja
export const nombreEscena = (trabajo, ficha) => ([trabajo && trabajo.nombre, ficha && ficha.nombre].filter(x => x && String(x).trim()).join(' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Cocina') + ' (Libreta)';

export function tarjetaTeowin({ App, ficha, trabajo, d, guardarYa, plegarCaja }) {
  const t = h('b', {}, 'Llevar a TeoWin'), zona = h('div', { class: 'zona-teowin' });
  const exportar = async (elegirOtra = false) => {
    reemplazar(zona, h('p', { class: 'ayuda' }, 'Preparando la escena…'));
    try {
      await guardarYa();
      const dir = await carpeta(App, { elegirOtra });
      const textos = await leerPlantillas(dir, plantillasNecesarias(d));
      const { texto, avisos } = escenaTeowin(d, (cat, fam, cod) => textos[cat + '/' + fam + '/' + cod]);
      if (!texto) return pintar(avisos);
      const esc = await dir.getDirectoryHandle('Escenas'), nombre = nombreEscena(trabajo, ficha) + '.3d';
      if (await hijo(esc, nombre, 'file') && !confirm('Ya hay una escena «' + nombre + '» en TeoWin. ¿Cambiarla por esta?')) return pintar();
      const w = await (await esc.getFileHandle(nombre, { create: true })).createWritable();
      await w.write(bytesLatin1(texto)); await w.close();
      pintar(avisos, nombre);
    } catch (e) {
      if (e && e.name === 'AbortError') return pintar();
      pintar([(e && e.message) || String(e)], null, true);
    }
  };
  const pintar = (avisos = [], hecho = null, error = false) => {
    if (!puedeTeowin()) return reemplazar(zona, h('small', { class: 'ayuda' }, 'Desde el ordenador donde está TeoWin (con Chrome o Edge): la cocina se guarda como escena para abrirla en TeoWin con sus paredes, ventanas, puertas y muebles del catálogo.'));
    reemplazar(zona,
      h('small', { class: 'ayuda' }, 'Guarda la cocina como escena de TeoWin (paredes, ventanas, puertas y muebles de tu catálogo, con sus medidas). La primera vez, elige la carpeta C:\\TeoWin\\datos\\3d\\E_107. Electrodomésticos y campana, a mano en TeoWin.'),
      hecho ? h('p', { class: 'ok-teowin', 'data-acc': 'teowin-hecho' }, '✓ Guardada en TeoWin como «' + hecho + '». Ábrela desde Escenas.') : null,
      avisos.length ? h('ul', { class: error ? 'aviso-tarifa' : 'ayuda', 'data-acc': 'teowin-avisos' }, ...avisos.map(a => h('li', {}, a))) : null,
      h('div', { class: 'chips' },
        h('button', { type: 'button', class: 'prin', 'data-acc': 'exportar-teowin', onclick: () => exportar(false) }, 'Guardar en TeoWin'),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'teowin-carpeta', onclick: () => exportar(true) }, 'Elegir otra carpeta')));
  };
  pintar();
  return plegarCaja(h('div', { class: 'tarjeta tarjeta-teowin', 'data-acc': 'teowin' }, t, zona), t, 'lat:teowin');
}

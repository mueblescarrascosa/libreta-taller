// Consejos de diseño de una cocina: no son errores de medida (eso son los avisos), son cosas que funcionan mal
// al usarla: placa sin encimera al lado, placa y fregadero juntos, lavavajillas lejos del fregadero, frigo pegado
// a la placa, placa bajo la ventana, columnas en medio de la encimera, campana fuera de la placa, pasillos estrechos…
// Se calculan sobre el alzado de cada pared (x y ancho de cada mueble, en mm). Cada consejo: { campo, texto, porque }.
import { geometriaAlzado } from './alzado.js';
import { paredesVecinas, FONDO_BAJO } from './modulos.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
const cm = mm => verMedida(Math.round(mm), 'cm') + ' cm';
// Medidas de referencia (mm). También salen en la guía.
export const REGLAS = {
  lado_placa: 300, lado_placa_bien: 400,   // encimera a cada lado de la placa
  preparar: 600, preparar_bien: 900,       // encimera entre fregadero y placa
  lavavajillas: 600,                       // lavavajillas como mucho a esto del fregadero
  frigo_placa: 300,                        // separación frigo–placa
  pasillo: 900, pasillo_bien: 1200,        // paso entre muebles enfrentados o hasta la isla
  encimera_libre: 900,                     // encimera de trabajo mínima en total
};
const BASE = ['bajo', 'columna', 'hueco'];
const ENCIMERA = ['bajo', 'cajonero', 'lavavajillas', 'rinconero', 'otro'];   // tipos de bajo que dejan encimera para trabajar
const TOLERA = 15;

// Encimera libre seguida desde x hacia un lado (-1 izquierda, +1 derecha): suma los bajos de trabajo hasta un corte.
function libreHacia(base, q, lado) {
  let total = 0, borde = lado < 0 ? q.x : q.x + q.w, tope = null;
  for (;;) {
    const sig = base.find(b => b !== q && Math.abs((lado < 0 ? b.x + b.w : b.x) - borde) <= TOLERA);
    if (!sig) return { total, tope: tope || 'fin' };
    if (sig.clase !== 'bajo' || !ENCIMERA.includes(sig.tipo)) return { total, tope: sig };
    total += sig.w; borde = lado < 0 ? sig.x : sig.x + sig.w; q = sig;
  }
}
const nombre = q => (q.texto || q.tipo).replace(/ \d.*$/, '');
const pegados = (a, b) => Math.abs(a.x + a.w - b.x) <= TOLERA || Math.abs(b.x + b.w - a.x) <= TOLERA;
const hueco = (a, b) => Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
const solapan = (a, b) => a.x < b.x + b.w - TOLERA && b.x < a.x + a.w - TOLERA;
const tieneBajos = p => (p.bajos || []).some(m => m.tipo !== 'hueco');

export function consejosDiseno(ficha) {
  if (!ficha || ficha.tipo !== 'cocina') return [];
  const d = ficha.datos, l = [];
  const geos = (d.paredes || []).map(p => [p, geometriaAlzado(d, p)]).filter(([, g]) => g);
  const todas = geos.flatMap(([p, g]) => g.piezas.filter(q => BASE.includes(q.clase)).map(q => Object.assign({ pared: p }, q)));
  const de = (tipo, p) => todas.filter(q => q.tipo === tipo && (!p || q.pared === p));

  geos.forEach(([p, g]) => {
    const campo = 'pared.' + p.id, en = ' (pared ' + p.letra + ')';
    const base = g.piezas.filter(q => BASE.includes(q.clase));
    const placas = base.filter(q => q.tipo === 'placa'), fregs = base.filter(q => q.tipo === 'fregadero');
    // 1. Encimera a los lados de la placa.
    placas.forEach(pl => {
      [[-1, 'izquierda'], [1, 'derecha']].forEach(([lado, txt]) => {
        const r = libreHacia(base, pl, lado);
        if (r.total >= REGLAS.lado_placa) return;
        const porque = 'Hace falta sitio para apoyar las ollas y que los mangos no queden fuera; lo cómodo es ' + cm(REGLAS.lado_placa_bien) + ' o más.';
        if (r.total > 0) l.push({ campo, texto: 'Solo ' + cm(r.total) + ' de encimera a la ' + txt + ' de la placa' + en, porque });
        else if (r.tope === 'fin') l.push({ campo, texto: 'Placa pegada a la pared por la ' + txt + en + ': deja al menos ' + cm(REGLAS.lado_placa) + ' de encimera', porque });
        else if (r.tope.clase === 'columna') l.push({ campo, texto: 'Placa pegada a la ' + nombre(r.tope).toLowerCase() + ' por la ' + txt + en + ': deja al menos ' + cm(REGLAS.lado_placa) + ' de encimera', porque: 'El calor estropea el canto de la columna y no hay sitio para apoyar. ' + porque });
        else if (r.tope.tipo !== 'fregadero') l.push({ campo, texto: 'Sin encimera a la ' + txt + ' de la placa' + en, porque });
      });
    });
    // 2. Zona de preparar entre fregadero y placa.
    placas.forEach(pl => fregs.forEach(fr => {
      const h = hueco(pl, fr);
      const porque = 'Es donde se corta y se prepara: lo cómodo son ' + cm(REGLAS.preparar) + ' a ' + cm(REGLAS.preparar_bien) + ' de encimera entre los dos.';
      if (h <= TOLERA) l.push({ campo, texto: 'Placa y fregadero juntos' + en, porque: 'El agua salpica la placa y no queda sitio para preparar. ' + porque });
      else if (h < REGLAS.preparar) l.push({ campo, texto: 'Solo ' + cm(h) + ' entre el fregadero y la placa' + en, porque });
    }));
    // 3. Frigo pegado a la placa.
    base.filter(q => q.tipo === 'columna_frigo').forEach(fg => placas.forEach(pl => {
      if (hueco(fg, pl) < REGLAS.frigo_placa) l.push({ campo, texto: 'El frigo está ' + (pegados(fg, pl) ? 'pegado a la placa' : 'a ' + cm(hueco(fg, pl)) + ' de la placa') + en, porque: 'El calor hace trabajar más al frigo y gasta más. Mejor ' + cm(REGLAS.frigo_placa) + ' o más de encimera entre los dos, o un panel aislante.' });
    }));
    // 4. Lavavajillas pegado al rincón.
    base.filter(q => q.tipo === 'lavavajillas').forEach(lv => {
      if (base.some(q => q.tipo === 'rinconero' && pegados(q, lv))) l.push({ campo, texto: 'Lavavajillas pegado al rincón' + en, porque: 'Con su puerta abierta no se puede abrir el rinconero, y los tiradores pueden chocar. Mejor un bajo o una regleta entre medias.' });
    });
    // 5. Placa debajo de la ventana.
    const ventanas = g.piezas.filter(q => q.clase === 'ventana');
    placas.forEach(pl => { if (ventanas.some(w => solapan(w, pl))) l.push({ campo, texto: 'Placa debajo de la ventana' + en, porque: 'No se puede poner campana, las corrientes apagan el gas y las cortinas o la persiana se manchan y pueden prender.' }); });
    // 6. Columna en medio de la encimera.
    base.filter(q => q.clase === 'columna').forEach(c => {
      const izq = base.find(b => b.clase === 'bajo' && Math.abs(b.x + b.w - c.x) <= TOLERA), der = base.find(b => b.clase === 'bajo' && Math.abs(b.x - (c.x + c.w)) <= TOLERA);
      if (izq && der) l.push({ campo, texto: nombre(c) + ' en medio de la encimera' + en, porque: 'Parte la encimera en dos trozos cortos. Las columnas van mejor al final de un tramo.' });
    });
    // 7. Campana encima de la placa (y no más estrecha).
    const campanas = g.piezas.filter(q => q.clase === 'alto' && q.tipo === 'alto_campana');
    if (placas.length && campanas.length) {
      placas.forEach(pl => {
        const encima = campanas.filter(c => solapan(c, pl));
        if (!encima.length) l.push({ campo, texto: 'El alto de la campana no está encima de la placa' + en, porque: 'La campana tiene que quedar justo encima para recoger el humo.' });
        else if (Math.max(...encima.map(c => c.w)) < pl.w - TOLERA) l.push({ campo, texto: 'Campana de ' + cm(Math.max(...encima.map(c => c.w))) + ' sobre una placa de ' + cm(pl.w) + en, porque: 'La campana debe ser igual o más ancha que la placa para recoger bien los humos.' });
      });
    }
  });

  // 8. Lavavajillas lejos del fregadero (también en otra pared).
  de('lavavajillas').forEach(lv => {
    const fr = de('fregadero');
    if (!fr.length) return;
    const misma = fr.filter(f => f.pared === lv.pared);
    const porque = 'Va junto al fregadero para enjuagar y cargar sin gotear por el suelo, y comparte toma y desagüe.';
    if (!misma.length) l.push({ campo: 'pared.' + lv.pared.id, texto: 'Lavavajillas en la pared ' + lv.pared.letra + ' y fregadero en la ' + [...new Set(fr.map(f => f.pared.letra))].join(', '), porque });
    else {
      const h = Math.min(...misma.map(f => hueco(f, lv)));
      if (h > REGLAS.lavavajillas) l.push({ campo: 'pared.' + lv.pared.id, texto: 'Lavavajillas a ' + cm(h) + ' del fregadero (pared ' + lv.pared.letra + ')', porque });
    }
  });
  // 9. Poca encimera de trabajo en total.
  if (de('placa').length && de('fregadero').length) {
    const libre = todas.filter(q => q.clase === 'bajo' && ENCIMERA.includes(q.tipo)).reduce((s, q) => s + q.w, 0);
    if (libre < REGLAS.encimera_libre) l.push({ campo: 'paredes', texto: 'Poca encimera para trabajar: ' + cm(libre) + ' en total (sin contar placa ni fregadero)', porque: 'Lo mínimo cómodo son ' + cm(REGLAS.encimera_libre) + ' seguidos para preparar.' });
  }
  // 10. Paso entre muebles enfrentados (paredes paralelas: la de enfrente es la vecina de la vecina).
  const vistas = new Set();
  (d.paredes || []).forEach(p => {
    const q = paredesVecinas(d, p).der, r = q && paredesVecinas(d, q).der;
    if (!q || !r || r === p || !hay(q.largo) || !tieneBajos(p) || !tieneBajos(r)) return;
    const clave = [p.letra, r.letra].sort().join('');
    if (vistas.has(clave)) return; vistas.add(clave);
    const paso = q.largo - 2 * FONDO_BAJO;
    if (paso < REGLAS.pasillo) l.push({ campo: 'pared.' + q.id, texto: 'Entre los muebles de ' + p.letra + ' y ' + r.letra + ' quedan unos ' + cm(Math.max(0, paso)) + ' de paso', porque: 'Lo mínimo es ' + cm(REGLAS.pasillo) + ' para abrir el lavavajillas y los cajones y pasar; si cocinan dos, ' + cm(REGLAS.pasillo_bien) + '.' });
  });
  // 11. Paso hasta la isla.
  (d.islas || []).filter(x => x.tipo !== 'peninsula' && hay(x.separacion)).forEach(x => {
    const p = (d.paredes || []).find(w => w.letra === x.pared), paso = x.separacion - (p && tieneBajos(p) ? FONDO_BAJO : 0);
    if (paso < REGLAS.pasillo) l.push({ campo: 'islas', texto: 'Entre la isla y ' + (p && tieneBajos(p) ? 'los muebles de la pared ' + p.letra : 'la pared ' + (x.pared || '')) + ' quedan ' + cm(Math.max(0, paso)) + ' de paso', porque: 'Lo mínimo es ' + cm(REGLAS.pasillo) + '; mejor 100–' + cm(REGLAS.pasillo_bien) + ' si hay lavavajillas o cajones enfrente.' });
  });
  return l;
}

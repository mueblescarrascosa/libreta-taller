// Consejos de diseño de una cocina: no son errores de medida (eso son los avisos), son cosas que funcionan mal
// al usarla. Se calculan sobre el alzado de cada pared (x y ancho de cada mueble, en mm) y sobre los
// electrodomésticos de la ficha: el ancho del MUEBLE no es el del aparato (en un bajo de placa de 80 o 90 va
// normalmente una placa de 60). Cada consejo: { campo, texto, porque, grupo }.
// Todas las medidas de referencia están en MEDIDAS: la guía (pantallas/guia.js) las enseña tal cual.
import { geometriaAlzado, ALTURAS } from './alzado.js';
import { paredesVecinas } from './modulos.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
const cm = mm => verMedida(Math.round(mm), 'cm') + ' cm';

// ── Medidas de referencia (mm) ──
export const MEDIDAS = {
  // Cocina tipo del taller (de alzado.js): zócalo 15 + mueble 70 + encimera 4.
  zocalo: ALTURAS.zocalo, mueble_bajo: ALTURAS.mueble_bajo, grueso_encimera: ALTURAS.grueso_encimera, encimera: ALTURAS.encimera,
  altos_desde: ALTURAS.altos_desde, altos_hasta: ALTURAS.altos_hasta, columna: ALTURAS.columna,
  fondo_bajo: 580, fondo_encimera: 620, fondo_alto: 350,
  // Electrodomésticos: lo habitual si en la ficha no está su ancho.
  placa: 600, campana_sobre_electrica: 650, campana_sobre_gas: 750,
  // Distancias (en planta y a lo largo de la encimera).
  lado_placa: 300, lado_placa_bien: 400,       // encimera libre a cada lado de la placa (aparato)
  preparar: 600, preparar_bien: 900,           // encimera entre fregadero y placa
  lavavajillas: 600,                           // lavavajillas como mucho a esto del fregadero
  frigo_placa: 300,                            // separación frigo–placa
  pasillo: 900, pasillo_bien: 1200,            // paso entre encimeras enfrentadas o hasta la isla
  encimera_libre: 900,                         // encimera de trabajo mínima en total
};
// Grupos de consejos, en el orden en que salen (y el de la guía).
export const GRUPOS = [['placa', 'Placa y campana'], ['agua', 'Fregadero y lavavajillas'], ['frio', 'Frigorífico'], ['encimera', 'Encimera y columnas'], ['paso', 'Pasos y pasillos']];

const BASE = ['bajo', 'columna', 'hueco'];
const ENCIMERA = ['bajo', 'cajonero', 'lavavajillas', 'rinconero', 'otro'];   // bajos que dejan encimera para trabajar
const TOLERA = 15;
const nombre = q => (q.texto || q.tipo).replace(/ \d.*$/, '');
const pegados = (a, b) => Math.abs(a.x + a.w - b.x) <= TOLERA || Math.abs(b.x + b.w - a.x) <= TOLERA;
const separacion = (a, b) => Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
const solapan = (a, b) => a.x < b.x + b.w - TOLERA && b.x < a.x + a.w - TOLERA;
const tieneBajos = p => (p.bajos || []).some(m => m.tipo !== 'hueco');

// Encimera libre seguida hacia un lado (-1 izquierda, +1 derecha): suma los bajos de trabajo hasta un corte.
function libreHacia(base, q, lado) {
  let total = 0, borde = lado < 0 ? q.x : q.x + q.w;
  for (;;) {
    const sig = base.find(b => b !== q && Math.abs((lado < 0 ? b.x + b.w : b.x) - borde) <= TOLERA);
    if (!sig) return { total, tope: 'fin' };
    if (sig.clase !== 'bajo' || !ENCIMERA.includes(sig.tipo)) return { total, tope: sig };
    total += sig.w; borde = lado < 0 ? sig.x : sig.x + sig.w; q = sig;
  }
}

// Electrodomésticos de la ficha (el primero de cada clase): ancho del aparato y tipo.
function aparatos(d) {
  const de = k => (d.electro || []).find(e => e.clave === k) || null;
  const placa = de('placa'), campana = de('campana');
  return {
    placa: hay(placa && placa.ancho) ? placa.ancho : null, gas: !!(placa && placa.tipo === 'gas'),
    campana: hay(campana && campana.ancho) ? campana.ancho : null, campanaTipo: campana ? campana.tipo : null,
  };
}

export function consejosDiseno(ficha) {
  if (!ficha || ficha.tipo !== 'cocina') return [];
  const d = ficha.datos, l = [], M = MEDIDAS, ap = aparatos(d);
  const anchoPlaca = ap.placa || M.placa;
  const geos = (d.paredes || []).map(p => [p, geometriaAlzado(d, p)]).filter(([, g]) => g);
  const todas = geos.flatMap(([p, g]) => g.piezas.filter(q => BASE.includes(q.clase)).map(q => Object.assign({ pared: p }, q)));
  const de = tipo => todas.filter(q => q.tipo === tipo);
  const poner = (grupo, campo, texto, porque) => l.push({ grupo, campo, texto, porque });

  geos.forEach(([p, g]) => {
    const campo = 'pared.' + p.id, en = ' (pared ' + p.letra + ')';
    const base = g.piezas.filter(q => BASE.includes(q.clase));
    const placas = base.filter(q => q.tipo === 'placa'), fregs = base.filter(q => q.tipo === 'fregadero');
    // Lo que el propio mueble de placa deja a cada lado del aparato (un bajo de 80 con placa de 60: 10 cm por lado).
    const margen = pl => Math.max(0, (pl.w - anchoPlaca) / 2);

    // ── Placa y campana ──
    placas.forEach(pl => {
      [[-1, 'izquierda'], [1, 'derecha']].forEach(([lado, txt]) => {
        const r = libreHacia(base, pl, lado), libre = r.total + margen(pl);
        if (libre >= M.lado_placa) return;
        const porque = 'Hace falta sitio para apoyar las ollas y que los mangos no queden fuera: al menos ' + cm(M.lado_placa) + ', mejor ' + cm(M.lado_placa_bien) + '.';
        const queda = libre > 0 ? 'solo ' + cm(libre) + ' de encimera' : 'nada de encimera';
        if (r.tope !== 'fin' && r.tope.clase === 'columna') poner('placa', campo, 'Placa junto a la ' + nombre(r.tope).toLowerCase() + ' por la ' + txt + ': ' + queda + en, 'El calor estropea el canto de la columna. ' + porque);
        else if (r.tope === 'fin' && r.total === 0) poner('placa', campo, 'Placa junto a la pared por la ' + txt + ': ' + queda + en, porque);
        else if (r.tope === 'fin' || r.tope.tipo !== 'fregadero') poner('placa', campo, 'A la ' + txt + ' de la placa, ' + queda + en, porque);
      });
    });
    const ventanas = g.piezas.filter(q => q.clase === 'ventana');
    placas.forEach(pl => {
      if (ventanas.some(w => solapan(w, pl))) poner('placa', campo, 'Placa debajo de la ventana' + en, 'No se puede poner campana' + (ap.gas ? ', las corrientes apagan el gas' : '') + ' y las cortinas o la persiana se manchan y pueden prender.');
    });
    const campanas = g.piezas.filter(q => q.clase === 'alto' && q.tipo === 'alto_campana');
    if (placas.length && campanas.length) {
      placas.forEach(pl => {
        const encima = campanas.filter(c => solapan(c, pl));
        if (!encima.length) { poner('placa', campo, 'El alto de la campana no está encima de la placa' + en, 'La campana tiene que quedar justo encima de la placa para recoger el humo.'); return; }
        // Ancho de la campana: el del aparato si está en la ficha; si no, el de su mueble.
        const anchoCampana = ap.campana || Math.max(...encima.map(c => c.w));
        if (ap.placa && anchoCampana < ap.placa - TOLERA) poner('placa', campo, 'Campana de ' + cm(anchoCampana) + ' para una placa de ' + cm(ap.placa) + en, 'La campana debe ser igual o más ancha que la placa para recoger bien los humos.');
        else if (!ap.placa && pl.w > anchoCampana + TOLERA && pl.w >= 800) poner('placa', campo, 'Mueble de placa de ' + cm(pl.w) + ' con campana de ' + cm(anchoCampana) + en,
          'Bien si la placa es de ' + cm(M.placa) + ' (lo normal en ese mueble); si es más ancha, la campana tiene que ser igual o más ancha. Pon el ancho de la placa en Electrodomésticos y se comprueba.');
      });
    }

    // ── Fregadero ──
    placas.forEach(pl => fregs.forEach(fr => {
      const entre = separacion(pl, fr) + margen(pl);
      const porque = 'Es donde se corta y se prepara: lo cómodo son ' + cm(M.preparar) + ' a ' + cm(M.preparar_bien) + ' de encimera entre los dos.';
      if (pegados(pl, fr) && entre < M.preparar) poner('agua', campo, 'Placa y fregadero juntos' + en, 'El agua salpica la placa y no queda sitio para preparar. ' + porque);
      else if (entre < M.preparar) poner('agua', campo, 'Solo ' + cm(entre) + ' de encimera entre el fregadero y la placa' + en, porque);
    }));
    base.filter(q => q.tipo === 'lavavajillas').forEach(lv => {
      if (base.some(q => q.tipo === 'rinconero' && pegados(q, lv))) poner('agua', campo, 'Lavavajillas pegado al rincón' + en, 'Con su puerta abierta no se puede abrir el rinconero, y los tiradores pueden chocar. Mejor un bajo o una regleta de 5–10 cm entre medias.');
    });

    // ── Frigorífico ──
    base.filter(q => q.tipo === 'columna_frigo').forEach(fg => placas.forEach(pl => {
      const entre = separacion(fg, pl) + margen(pl);
      if (entre < M.frigo_placa) poner('frio', campo, (entre <= 0 ? 'Frigorífico pegado a la placa' : 'Frigorífico a ' + cm(entre) + ' de la placa') + en, 'El calor le hace trabajar más y gasta más' + (ap.gas ? ' (y con gas, más aún)' : '') + '. Mejor ' + cm(M.frigo_placa) + ' o más de encimera entre los dos, o un panel aislante.');
    }));

    // ── Encimera y columnas ──
    base.filter(q => q.clase === 'columna').forEach(c => {
      const izq = base.find(b => b.clase === 'bajo' && Math.abs(b.x + b.w - c.x) <= TOLERA), der = base.find(b => b.clase === 'bajo' && Math.abs(b.x - (c.x + c.w)) <= TOLERA);
      if (izq && der) poner('encimera', campo, nombre(c) + ' en medio de la encimera' + en, 'Parte la encimera en dos trozos cortos. Las columnas van mejor juntas y al final de un tramo.');
    });
  });

  // Lavavajillas lejos del fregadero (también en otra pared).
  de('lavavajillas').forEach(lv => {
    const fr = de('fregadero');
    if (!fr.length) return;
    const misma = fr.filter(f => f.pared === lv.pared), campo = 'pared.' + lv.pared.id;
    const porque = 'Va junto al fregadero: se enjuaga y se carga sin gotear por el suelo, y comparte toma y desagüe.';
    if (!misma.length) poner('agua', campo, 'Lavavajillas en la pared ' + lv.pared.letra + ' y fregadero en la ' + [...new Set(fr.map(f => f.pared.letra))].join(', '), porque);
    else {
      const s = Math.min(...misma.map(f => separacion(f, lv)));
      if (s > M.lavavajillas) poner('agua', campo, 'Lavavajillas a ' + cm(s) + ' del fregadero (pared ' + lv.pared.letra + ')', porque);
    }
  });
  // Poca encimera de trabajo en total.
  if (de('placa').length && de('fregadero').length) {
    const libre = todas.filter(q => q.clase === 'bajo' && ENCIMERA.includes(q.tipo)).reduce((s, q) => s + q.w, 0);
    if (libre < M.encimera_libre) poner('encimera', 'paredes', 'Poca encimera para trabajar: ' + cm(libre) + ' en total (sin placa ni fregadero)', 'Lo mínimo cómodo son ' + cm(M.encimera_libre) + ' seguidos para preparar.');
  }
  // ── Pasos: encimeras enfrentadas (la pared de enfrente es la vecina de la vecina) y hasta la isla ──
  const vistas = new Set(), porquePaso = 'Lo mínimo es ' + cm(M.pasillo) + ' para abrir el lavavajillas y los cajones y pasar; si cocinan dos, ' + cm(M.pasillo_bien) + '.';
  (d.paredes || []).forEach(p => {
    const q = paredesVecinas(d, p).der, r = q && paredesVecinas(d, q).der;
    if (!q || !r || r === p || !hay(q.largo) || !tieneBajos(p) || !tieneBajos(r)) return;
    const clave = [p.letra, r.letra].sort().join('');
    if (vistas.has(clave)) return; vistas.add(clave);
    const paso = q.largo - 2 * M.fondo_encimera;
    if (paso < M.pasillo) poner('paso', 'pared.' + q.id, 'Entre las encimeras de ' + p.letra + ' y ' + r.letra + ' quedan unos ' + cm(Math.max(0, paso)) + ' de paso', porquePaso);
  });
  (d.islas || []).filter(x => x.tipo !== 'peninsula' && hay(x.separacion)).forEach(x => {
    const p = (d.paredes || []).find(w => w.letra === x.pared), conMuebles = p && tieneBajos(p), paso = x.separacion - (conMuebles ? M.fondo_encimera : 0);
    if (paso < M.pasillo) poner('paso', 'islas', 'Entre la isla y ' + (conMuebles ? 'la encimera de la pared ' + p.letra : 'la pared ' + (x.pared || '')) + ' quedan ' + cm(Math.max(0, paso)) + ' de paso', porquePaso);
  });
  const orden = GRUPOS.map(g => g[0]);
  return l.sort((a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo));
}

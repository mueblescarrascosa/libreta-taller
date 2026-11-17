// Consejos de diseño de una cocina: no son errores de medida (eso son los avisos), son cosas que funcionan mal
// al usarla. Se calculan sobre el alzado de cada pared (x y ancho de cada mueble, en mm) y sobre los
// electrodomésticos de la ficha: el ancho del MUEBLE no es el del aparato (en un bajo de placa de 80 o 90 va
// normalmente una placa de 60). Cada consejo: { campo, texto, porque, grupo }.
// Todas las medidas de referencia están en MEDIDAS: la guía (pantallas/guia.js) las enseña tal cual.
import { geometriaAlzado, ALTURAS, campanasPared, placasPared, CAMPANA } from './alzado.js';
import { paredesVecinas } from './modulos.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
const cm = mm => verMedida(Math.round(mm), 'cm') + ' cm';

// ── Medidas de referencia (mm) ──
export const MEDIDAS = {
  // Cocina tipo (de alzado.js, que sigue los ajustes): por defecto zócalo 15 + mueble 70 + encimera 4.
  get zocalo() { return ALTURAS.zocalo; }, get mueble_bajo() { return ALTURAS.mueble_bajo; }, get grueso_encimera() { return ALTURAS.grueso_encimera; }, get encimera() { return ALTURAS.encimera; },
  get altos_desde() { return ALTURAS.altos_desde; }, get altos_hasta() { return ALTURAS.altos_hasta; }, get columna() { return ALTURAS.columna; },
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
  gola: 56,                                    // perfil de gola bajo la encimera (lo que quita de hueco a los electrodomésticos)
  gola_mano: 30,                               // hueco para la mano con gola (2,5–3,5 cm): lo que se descuenta a la puerta
  // Perfiles más vendidos (catálogos de varias marcas): en C, entre cajones, unos 73 × 26 mm; vertical, para columnas, 46–48 de ancho.
  gola_c: 73,                                  // gola en C entre dos frentes (cajonera o puerta + cajón)
  gola_vertical: 47,                           // gola vertical en el lado que abre de una columna
  libre_electro: 850, libre_electro_max: 920,  // hueco libre bajo la encimera para lavavajillas y lavadora: mínimo 85; más de 92, sobra
};
// Grupos de consejos, en el orden en que salen (y el de la guía).
export const GRUPOS = [['placa', 'Placa y campana'], ['agua', 'Fregadero y lavavajillas'], ['frio', 'Frigorífico'], ['encimera', 'Encimera y columnas'], ['paso', 'Pasos y pasillos'], ['armario', 'Armario y vestidor']];

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

// Vestidor: paso entre cuerpos enfrentados (mínimo 80, cómodo 100) y barras de más de 100 cm sin apoyo.
export const VESTIDOR = { fondo: 600, paso: 800, paso_bien: 1000, paso_un_lado: 700, barra_max: 1000 };
function consejosVestidor(d) {
  const l = [], V = VESTIDOR, cuerpos = p => (p.cuerpos || []).length > 0;
  const vistas = new Set();
  (d.paredes || []).forEach(p => {
    const q = paredesVecinas(d, p).der, r = q && paredesVecinas(d, q).der;
    if (!q || !r || r === p || !hay(q.largo) || !cuerpos(p) || !cuerpos(r)) return;
    const clave = [p.letra, r.letra].sort().join('');
    if (vistas.has(clave)) return; vistas.add(clave);
    const paso = q.largo - 2 * V.fondo;
    if (paso < V.paso) l.push({ grupo: 'paso', campo: 'pared.' + q.id, texto: 'Entre los cuerpos de ' + p.letra + ' y ' + r.letra + ' quedan unos ' + cm(Math.max(0, paso)) + ' de paso',
      porque: 'Con muebles a los dos lados hacen falta ' + cm(V.paso) + ' como mínimo para abrir cajones y vestirse; cómodo, ' + cm(V.paso_bien) + '.' });
  });
  (d.paredes || []).forEach(p => (p.cuerpos || []).forEach((c, i) => {
    const barra = c.interior === 'barra' || c.interior === 'doble_barra' || c.interior2 === 'barra';
    if (barra && hay(c.ancho) && c.ancho > V.barra_max) l.push({ grupo: 'armario', campo: 'pared.' + p.id, texto: 'Cuerpo ' + (i + 1) + ' de la pared ' + p.letra + ': barra de ' + cm(c.ancho) + ' sin apoyo',
      porque: 'Una barra de más de ' + cm(V.barra_max) + ' se comba con el peso: pon un soporte central o divide el cuerpo.' });
  }));
  return l;
}

// Armario empotrado (corredera, abatible…): fondo para colgar, barras largas y puertas u hojas demasiado anchas.
export const ARMARIO = { fondo_colgar: 550, guias_corredera: 90, hoja_max: 600, corredera_max: 1000, barra_max: 1000 };
function consejosArmario(d, sub) {
  const l = [], A = ARMARIO, cuerpos = d.cuerpos || [], ancho = [d.ancho_medio, d.ancho_arriba, d.ancho_abajo].find(v => hay(v) && v > 0);
  const esBarra = c => c.interior === 'barra' || c.interior === 'doble_barra' || c.interior2 === 'barra';
  if (hay(d.fondo) && d.fondo > 0 && (!cuerpos.length || cuerpos.some(esBarra))) {
    const util = d.fondo - (sub === 'corredera' ? A.guias_corredera : 0);
    if (util < A.fondo_colgar) l.push({ grupo: 'armario', campo: 'fondo', texto: 'Con ' + cm(d.fondo) + ' de fondo' + (sub === 'corredera' ? ' y puertas correderas' : '') + ' la percha no cabe de frente',
      porque: 'Una percha necesita unos ' + cm(A.fondo_colgar) + (sub === 'corredera' ? ', y las guías de las correderas comen 8–9 cm' : '') + '. Con menos: barra extraíble de fondo, perchero abatible o ropa doblada.' });
  }
  cuerpos.forEach((c, i) => {
    if (esBarra(c) && hay(c.ancho) && c.ancho > A.barra_max) l.push({ grupo: 'armario', campo: 'cuerpo.' + c.id, texto: 'Cuerpo ' + (i + 1) + ': barra de ' + cm(c.ancho) + ' sin apoyo',
      porque: 'Una barra de más de ' + cm(A.barra_max) + ' se comba con el peso: pon un soporte central o divide el cuerpo.' });
  });
  if (ancho && sub === 'abatible' && d.puertas > 0 && ancho / d.puertas > A.hoja_max) l.push({ grupo: 'armario', campo: 'puertas', texto: 'Puertas de unos ' + cm(Math.round(ancho / d.puertas)) + ' de ancho',
    porque: 'Una puerta abatible de más de ' + cm(A.hoja_max) + ' pesa, descuelga las bisagras y necesita mucho sitio para abrir: mejor una puerta más.' });
  if (ancho && sub === 'corredera' && d.hojas > 0 && ancho / d.hojas > A.corredera_max) l.push({ grupo: 'armario', campo: 'hojas', texto: 'Hojas correderas de unos ' + cm(Math.round(ancho / d.hojas)),
    porque: 'Las hojas de más de ' + cm(A.corredera_max) + ' pesan y se descuadran: mejor una hoja más (lo normal, de 60 a 100 cm).' });
  return l;
}

export function consejosDiseno(ficha) {
  if (ficha && ficha.subtipo === 'vestidor') return consejosVestidor(ficha.datos || {});
  if (ficha && ficha.tipo === 'armario') return consejosArmario(ficha.datos || {}, ficha.subtipo);
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
    // El tamaño de la placa elegido en el propio mueble manda sobre el de Electrodomésticos.
    const sobre = placasPared(p, d), deMueble = pl => sobre.find(q => q.mueble && Math.abs((q.desde + q.hasta) / 2 - (pl.x + pl.w / 2)) < 1);
    const placaDicha = pl => { const q = deMueble(pl); return q && hay(q.mueble.placa_ancho) ? q.ancho : ap.placa; };
    const margen = pl => Math.max(0, (pl.w - (placaDicha(pl) || anchoPlaca)) / 2);

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
        const anchoCampana = ap.campana || Math.max(...encima.map(c => c.w)), dicha = placaDicha(pl);
        if (dicha && anchoCampana < dicha - TOLERA) poner('placa', campo, 'Campana de ' + cm(anchoCampana) + ' para una placa de ' + cm(dicha) + en, 'La campana debe ser igual o más ancha que la placa para recoger bien los humos.');
        else if (!dicha && pl.w > anchoCampana + TOLERA && pl.w >= 800) poner('placa', campo, 'Mueble de placa de ' + cm(pl.w) + ' con campana de ' + cm(anchoCampana) + en,
          'Bien si la placa es de ' + cm(M.placa) + ' (lo normal en ese mueble); si es más ancha, la campana tiene que ser igual o más ancha. Pon el ancho de la placa en Electrodomésticos y se comprueba.');
      });
    }

    // Campana decorativa (en su hueco o sobre la placa) más estrecha que la placa que tiene debajo.
    campanasPared(p, d).forEach(x => {
      const pl = sobre.find(q => q.desde < x.hasta && q.hasta > x.desde);
      if (pl && x.ancho < pl.ancho - TOLERA) poner('placa', campo, 'Campana de ' + cm(x.ancho) + ' para una placa de ' + cm(pl.ancho) + en, 'La campana debe ser igual o más ancha que la placa para recoger bien los humos.');
    });

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

  // Frigo integrable que no cabe en la columna, y lavavajillas que no casa con el hueco de la cocina tipo.
  const frigo = (d.electro || []).find(e => e.clave === 'frigo' && e.tipo === 'integrable' && hay(e.alto));
  if (frigo && de('columna_frigo').length && M.zocalo + frigo.alto + 20 > M.columna)
    poner('frio', 'electro', 'Frigo integrable de ' + cm(frigo.alto) + ': no cabe en la columna (' + cm(M.columna - M.zocalo) + ' sobre el zócalo)', 'Mira un frigo de hueco más bajo (178, 158…) o sube la columna.');
  // Hueco libre para lavavajillas y lavadora integrables: zócalo + mueble, menos la gola si la lleva. Mínimo 85 cm.
  const lavadora = (d.electro || []).find(e => e.clave === 'lavadora' && e.tipo === 'integrable');
  if (de('lavavajillas').length || lavadora) {
    const conGola = (d.acabados || {}).tirador === 'gola', gola = conGola ? M.gola : 0, libre = M.zocalo + M.mueble_bajo - gola;
    const quien = de('lavavajillas').length ? (lavadora ? 'el lavavajillas y la lavadora' : 'el lavavajillas') : 'la lavadora';
    const cuenta = cm(M.zocalo) + ' + ' + cm(M.mueble_bajo) + (gola ? ' − gola ' + cm(gola) : '');
    const ap = (d.electro || []).find(e => (e.clave === 'lavavajillas' || e.clave === 'lavadora') && hay(e.alto) && e.alto > libre);
    if (ap) poner('agua', 'electro', (ap.clave === 'lavadora' ? 'La lavadora' : 'El lavavajillas') + ' de ' + cm(ap.alto) + ' no cabe: quedan ' + cm(libre) + ' (' + cuenta + ')', 'El hueco libre es zócalo + mueble' + (gola ? ' menos la gola' : '') + '.');
    else if (libre < M.libre_electro) {
      // Lo que sí llega a 85, con los zócalos y muebles de siempre.
      const vale = [[150, 800], [100, 800], [150, 700]].filter(([z, m]) => z + m - gola >= M.libre_electro).map(([z, m]) => 'zócalo ' + cm(z) + ' y mueble ' + cm(m) + ' (quedan ' + cm(z + m - gola) + ')');
      const opciones = [];
      if (vale.length) opciones.push(vale[0]);
      if (conGola && M.zocalo + M.mueble_bajo >= M.libre_electro) opciones.push('sin gola en ese frente: tirador o uñero (quedan ' + cm(M.zocalo + M.mueble_bajo) + ')');
      poner('agua', 'electro', 'Para ' + quien + ' quedan ' + cm(libre) + ' libres (' + cuenta + '): menos de 85', 'Hacen falta 85 cm libres bajo la encimera. ' + (opciones.length ? 'Opciones: ' + opciones.join('; o ') + '.' : 'Sube el zócalo o el mueble en esa zona.'));
    } else if (libre > M.libre_electro_max) poner('agua', 'electro', 'Para ' + quien + ' quedan ' + cm(libre) + ' (' + cuenta + '): sobra hueco por encima',
      'Llegan hasta unos 92 con las patas. Lo que sobre, con una pieza lacada del color de las puertas' + (conGola ? '' : ' o con la gola') + '.');
  }
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
  // Campana decorativa: separación con los altos o columnas de al lado (mínimo 5 cm, mejor 10) para montarla, limpiarla y
  // que el vapor y el calor no estropeen los muebles. Contra la pared no cuenta.
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => campanasPared(p, d).forEach(x => {
    [['izquierda', x.izq, x.izqPared], ['derecha', x.der, x.derPared]].forEach(([t, v, pared]) => {
      if (v === null || pared || v >= CAMPANA.margen_min) return;
      poner('placa', 'pared.' + p.id, 'La campana de la pared ' + p.letra + ' queda a ' + cm(Math.max(0, v)) + ' del mueble de la ' + t,
        'Deja al menos ' + cm(CAMPANA.margen_min) + ' (mejor ' + cm(CAMPANA.margen_bien) + ') entre una campana decorativa y los altos: para montarla y limpiarla, y para que el vapor y el calor no estropeen los muebles.' + (x.hueco ? ' Elige una campana más pequeña o un hueco más ancho.' : ' Deja un hueco más ancho encima de la placa o pon una campana más pequeña en el mueble «Campana decorativa».'));
    });
  }));
  const orden = GRUPOS.map(g => g[0]);
  return l.sort((a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo));
}

// Consejos de diseño de una cocina: no son errores de medida (eso son los avisos), son cosas que funcionan mal
// al usarla. Se calculan sobre el alzado de cada pared (x y ancho de cada mueble, en mm) y sobre los
// electrodomésticos de la ficha: el ancho del MUEBLE no es el del aparato (en un bajo de placa de 80 o 90 va
// normalmente una placa de 60). Cada consejo: { campo, texto, porque, grupo }.
// Todas las medidas de referencia están en MEDIDAS: la guía (pantallas/guia.js) las enseña tal cual.
import { geometriaAlzado, ALTURAS, campanasPared, placasPared, CAMPANA, TUBO } from './alzado.js';
import { paredesVecinas } from './modulos.js';
import { geometriaPlanta } from './plano-vista.js';
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
  // Fuentes: AMC (Asociación de Mobiliario de Cocina, «Guía técnica de consejos»), NKBA (Kitchen Planning Guidelines),
  // Brico Dépôt, Santos, Leroy Merlin.
  lado_placa: 300, lado_placa_bien: 500,       // encimera libre a cada lado de la placa (NKBA 30–38 mínimo; AMC y Brico 50)
  preparar: 600, preparar_bien: 900,           // encimera entre fregadero y placa
  lavavajillas: 600,                           // lavavajillas como mucho a esto del fregadero
  frigo_placa: 300,                            // separación frigo–placa
  pasillo: 1000, pasillo_bien: 1200,           // paso entre encimeras enfrentadas (AMC: 120 entre dos filas; NKBA 107)
  isla_paso: 900, isla_paso_bien: 1100,        // alrededor de la isla o península (AMC y Leroy 90; 100–120 recomendado)
  triangulo_lado: 2700, triangulo_suma: 7900,  // triángulo fregadero–placa–frigo: cada lado hasta 2,70 y en total 7,90 (NKBA; AMC ≥ 1,20)
  electro_pared: 100,                          // frigorífico libre contra una pared: 10 para abrir la puerta (AMC)
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

// Placas de una pared (la del mueble de placa y la puesta bajo una campana) y la encimera libre a cada lado del aparato:
// lo que el propio mueble de placa deja a los lados (un bajo de 80 con placa de 60: 10 cm por lado) más los bajos de trabajo
// seguidos hasta un corte (columna, fregadero, hueco o el final). El tamaño de la placa del mueble manda sobre Electrodomésticos.
function airePlacas(d, p, g, ap = aparatos(d), anchoPlaca = ap.placa || MEDIDAS.placa) {
    const base = g.piezas.filter(q => BASE.includes(q.clase)), placas = base.filter(q => q.tipo === 'placa');
    // Lo que el propio mueble de placa deja a cada lado del aparato (un bajo de 80 con placa de 60: 10 cm por lado).
    // El tamaño de la placa elegido en el propio mueble manda sobre el de Electrodomésticos.
    const sobre = placasPared(p, d), deMueble = pl => sobre.find(q => q.mueble && Math.abs((q.desde + q.hasta) / 2 - (pl.x + pl.w / 2)) < 1);
    const placaDicha = pl => { const q = deMueble(pl); return q && hay(q.mueble.placa_ancho) ? q.ancho : ap.placa; };
    const margen = pl => (pl.suelta ? 0 : Math.max(0, (pl.w - (placaDicha(pl) || anchoPlaca)) / 2));
    // La placa puesta bajo una campana sin mueble de placa (encima de dos cajoneras…) cuenta como las demás.
    const sueltas = sobre.filter(q => q.campana).map(q => ({ x: q.desde, w: q.ancho, tipo: 'placa', clase: 'bajo', suelta: true }));
    const todasPlacas = placas.concat(sueltas);
    // Encimera libre a un lado de la placa: la suelta empieza dentro de un bajo (lo que queda de él cuenta).
    const libreDe = (pl, lado) => {
      if (!pl.suelta) { const r = libreHacia(base, pl, lado); return { total: r.total, tope: r.tope, libre: r.total + margen(pl) }; }
      const e = lado < 0 ? pl.x : pl.x + pl.w, b = base.find(q => (lado < 0 ? q.x < e && q.x + q.w >= e : q.x <= e && q.x + q.w > e));
      if (!b) return { total: 0, tope: 'fin', libre: 0 };
      if (b.clase !== 'bajo' || !ENCIMERA.includes(b.tipo)) return { total: 0, tope: b, libre: 0 };
      const r = libreHacia(base, b, lado), parte = lado < 0 ? e - b.x : b.x + b.w - e;
      return { total: parte + r.total, tope: r.tope, libre: parte + r.total };
    };

    return { sobre, placaDicha, margen, todasPlacas, libreDe };
}

// Para la ficha: cuánta encimera queda a cada lado de cada placa de la pared, hasta el siguiente mueble.
// [{ mueble (el de placa o el alto de la campana), ancho (placa), izq: { libre, hasta }, der: { libre, hasta } }]
export function airePlaca(d, p) {
  const g = geometriaAlzado(d, p);
  if (!g) return [];
  const { sobre, todasPlacas, libreDe } = airePlacas(d, p, g);
  const hasta = r => (r.tope === 'fin' ? 'la pared' : r.tope.tipo === 'fregadero' ? 'el fregadero' : 'la ' + nombre(r.tope).toLowerCase());
  return todasPlacas.map(pl => {
    const q = pl.suelta ? sobre.find(s => s.campana && Math.abs(s.desde - pl.x) < 1) : sobre.find(s => s.mueble && Math.abs((s.desde + s.hasta) / 2 - (pl.x + pl.w / 2)) < 1);
    const lado = l => { const r = libreDe(pl, l); return { libre: Math.round(r.libre), hasta: r.tope === 'fin' && r.total === 0 && r.libre === 0 ? 'la pared' : hasta(r) }; };
    return { mueble: q ? q.mueble || q.campana : null, ancho: q ? q.ancho : pl.w, izq: lado(-1), der: lado(1) };
  });
}
// «Placa de 60: 30 cm de encimera a la izquierda (hasta la columna) y 70 cm a la derecha (hasta el fregadero)».
export function textoAirePlaca(x) {
  const lado = (r, t) => (r.libre < MEDIDAS.lado_placa ? '⚠ ' : '') + cm(r.libre) + ' a la ' + t + ' (hasta ' + r.hasta + ')';
  return 'Placa de ' + cm(x.ancho) + ': encimera libre ' + lado(x.izq, 'izquierda') + ' y ' + lado(x.der, 'derecha') + '. Para apoyar ollas: al menos ' + cm(MEDIDAS.lado_placa) + ', mejor ' + cm(MEDIDAS.lado_placa_bien) + ' por lado.';
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
  const libreFrigo = (d.electro || []).some(e => e.clave === 'frigo' && ['libre', 'americano'].includes(e.tipo));

  geos.forEach(([p, g]) => {
    const campo = 'pared.' + p.id, en = ' (pared ' + p.letra + ')';
    const base = g.piezas.filter(q => BASE.includes(q.clase));
    const placas = base.filter(q => q.tipo === 'placa'), fregs = base.filter(q => q.tipo === 'fregadero');
    const { sobre, placaDicha, margen, todasPlacas, libreDe } = airePlacas(d, p, g, ap, anchoPlaca);
    // ── Placa y campana ──
    todasPlacas.forEach(pl => {
      [[-1, 'izquierda'], [1, 'derecha']].forEach(([lado, txt]) => {
        const r = libreDe(pl, lado), libre = r.libre;
        if (libre >= M.lado_placa) return;
        const porque = 'Hace falta sitio para apoyar las ollas y que los mangos no queden fuera: al menos ' + cm(M.lado_placa) + ', mejor ' + cm(M.lado_placa_bien) + '.';
        const queda = libre > 0 ? 'solo ' + cm(libre) + ' de encimera' : 'nada de encimera';
        if (r.tope !== 'fin' && r.tope.clase === 'columna') poner('placa', campo, 'Placa junto a la ' + nombre(r.tope).toLowerCase() + ' por la ' + txt + ': ' + queda + en, 'El calor estropea el canto de la columna. ' + porque);
        else if (r.tope === 'fin' && r.total === 0) poner('placa', campo, 'Placa junto a la pared por la ' + txt + ': ' + queda + en, porque);
        else if (r.tope === 'fin' || r.tope.tipo !== 'fregadero') poner('placa', campo, 'A la ' + txt + ' de la placa, ' + queda + en, porque);
      });
    });
    const ventanas = g.piezas.filter(q => q.clase === 'ventana');
    todasPlacas.forEach(pl => {
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

    // Tubo de humos: si la salida no queda encima del aparato (más de 10 cm a un lado), lleva codos y hay que cajearlo.
    (g.tubos || []).forEach(t => {
      const q = t.de === 'campana' ? 'de la campana' : 'de la placa extractora';
      if (!t.salida) { if (t.de === 'placa') poner('placa', campo, 'Falta la salida de humos de la placa extractora' + en, 'Con salida a la calle hace falta un agujero a ras de suelo, por detrás del zócalo. Apúntalo como «Salida de humos» con su altura.'); return; }
      const m = verMedida(Math.ceil(t.tubo / 100) * 100, 'm') + ' m', codos = t.codos + (t.codos === 1 ? ' codo' : ' codos');
      if (t.cajear) poner('placa', campo, (t.de === 'campana' ? 'Hay que cajear el tubo de la campana' : 'Tubo de la placa extractora con codos') + en + ': unos ' + m + ' y ' + codos,
        'La salida de humos queda ' + cm(Math.abs(t.dx)) + ' a la ' + (t.dx < 0 ? 'izquierda' : 'derecha') + ' del centro ' + q + ' (más de ' + cm(TUBO.tolera) + '): el tubo no ' + (t.de === 'campana' ? 'sube' : 'va') + ' derecho. Mueve el aparato o la salida, o cuenta con el tubo, los codos' + (t.de === 'campana' ? ' y el cajeado.' : '.'));
      if (t.baja) poner('placa', campo, 'La salida de humos está más baja que la campana' + en, 'El tubo empieza a unos ' + cm(t.z0) + ' del suelo: la salida debería quedar por encima.');
      if (t.alta) poner('placa', campo, 'Salida de humos alta para una placa extractora' + en, 'La placa extractora saca el aire por abajo: lo normal es una salida a ras de suelo, por detrás del zócalo.');
    });

    // ── Fregadero ──
    todasPlacas.forEach(pl => fregs.forEach(fr => {
      const entre = separacion(pl, fr) + margen(pl);
      const porque = 'Es donde se corta y se prepara: lo cómodo son ' + cm(M.preparar) + ' a ' + cm(M.preparar_bien) + ' de encimera entre los dos.';
      if (pegados(pl, fr) && entre < M.preparar) poner('agua', campo, 'Placa y fregadero juntos' + en, 'El agua salpica la placa y no queda sitio para preparar. ' + porque);
      else if (entre < M.preparar) poner('agua', campo, 'Solo ' + cm(entre) + ' de encimera entre el fregadero y la placa' + en, porque);
    }));
    base.filter(q => q.tipo === 'lavavajillas').forEach(lv => {
      if (base.some(q => q.tipo === 'rinconero' && pegados(q, lv))) poner('agua', campo, 'Lavavajillas pegado al rincón' + en, 'Con su puerta abierta no se puede abrir el rinconero, y los tiradores pueden chocar. Mejor un bajo o una regleta de 5–10 cm entre medias.');
    });

    // ── Frigorífico ──
    base.filter(q => q.tipo === 'columna_frigo').forEach(fg => todasPlacas.forEach(pl => {
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
  // (La placa puesta bajo una campana, sobre cajoneras, ocupa encimera.)
  const sueltasTodas = (d.paredes || []).filter(p => hay(p.largo)).flatMap(p => placasPared(p, d).filter(q => q.campana));
  if ((de('placa').length || sueltasTodas.length) && de('fregadero').length) {
    const libre = todas.filter(q => q.clase === 'bajo' && ENCIMERA.includes(q.tipo)).reduce((s, q) => s + q.w, 0) - sueltasTodas.reduce((s, q) => s + q.ancho, 0);
    if (libre < M.encimera_libre) poner('encimera', 'paredes', 'Poca encimera para trabajar: ' + cm(libre) + ' en total (sin placa ni fregadero)', 'Lo mínimo cómodo son ' + cm(M.encimera_libre) + ' seguidos para preparar.');
  }
  // ── Triángulo de trabajo (fregadero, placa y frigorífico): que no haya que andar de más. Con la planta dibujada a
  // escala, en línea recta entre los centros; sin ella, solo si los tres están en la misma pared (a lo largo).
  const centro = q => (q ? q.x + q.w / 2 : null);
  const tres = [de('fregadero')[0], de('placa')[0] || null, de('columna_frigo')[0]];
  if (tres.every(Boolean)) {
    let lados = null;
    if (tres.every(q => q.pared === tres[0].pared)) lados = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => Math.abs(centro(tres[a]) - centro(tres[b])));
    else {
      let pl = null; try { pl = geometriaPlanta(d); } catch (e) { pl = null; }
      if (pl && pl.aEscala && pl.modulos) {
        const w0 = pl.paredes.find(w => w.largo > 0), k = w0 ? Math.hypot(w0.b.x - w0.a.x, w0.b.y - w0.a.y) / w0.largo : null;
        const c = tipo => { const m = pl.modulos.find(x => x.tipo === tipo && !x.alto && !x.sinTexto); return m ? { x: m.rect.reduce((s, p) => s + p.x, 0) / 4, y: m.rect.reduce((s, p) => s + p.y, 0) / 4 } : null; };
        const P = ['fregadero', 'placa', 'columna_frigo'].map(c);
        if (k && P.every(Boolean)) lados = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y) / k);
      }
    }
    if (lados) {
      const nom = ['fregadero y placa', 'placa y frigorífico', 'fregadero y frigorífico'], porque = 'Fregadero, placa y frigorífico forman el triángulo de trabajo: cada lado de 1,20 a ' + cm(M.triangulo_lado) + ' y en total menos de ' + verMedida(M.triangulo_suma, 'm') + ' m, para no andar de más (NKBA y AMC).';
      lados.forEach((x, i) => { if (x > M.triangulo_lado) poner('paso', 'paredes', 'Triángulo de trabajo largo: ' + verMedida(Math.round(x / 10) * 10, 'm') + ' m entre ' + nom[i], porque); });
      const suma = lados.reduce((s, x) => s + x, 0);
      if (suma > M.triangulo_suma) poner('paso', 'paredes', 'Triángulo de trabajo de ' + verMedida(Math.round(suma / 10) * 10, 'm') + ' m en total', porque);
    }
  }
  // ── Frigorífico de libre instalación pegado a una pared: no abre bien la puerta ──
  geos.forEach(([p, g]) => {
    g.piezas.filter(q => q.tipo === 'columna_frigo' && BASE.includes(q.clase)).forEach(q => {
      if (!libreFrigo) return;
      const izq = q.x, der = p.largo - (q.x + q.w);
      if (Math.min(izq, der) < M.electro_pared) poner('frio', 'pared.' + p.id, 'Frigorífico pegado a la pared (pared ' + p.letra + '): ' + cm(Math.max(0, Math.round(Math.min(izq, der)))) + ' de hueco',
        'Un frigorífico de libre instalación junto a una pared necesita unos ' + cm(M.electro_pared) + ' para que la puerta abra del todo y salgan los cajones (AMC). Deja una regleta de ese ancho.');
    });
  });
  // ── Pasos: encimeras enfrentadas (la pared de enfrente es la vecina de la vecina) y hasta la isla ──
  const vistas = new Set(), porquePaso = 'Lo mínimo es ' + cm(M.pasillo) + ' para abrir el lavavajillas y los cajones y pasar; si cocinan dos, ' + cm(M.pasillo_bien) + '.';
  // Solo si de verdad están enfrentadas (en U): con la planta dibujada, las dos paredes van en sentidos contrarios.
  // En un escalón (la del medio corta y las otras dos seguidas) no hay pasillo entre ellas.
  let planta = null;
  try { planta = geometriaPlanta(d); } catch (e) { planta = null; }
  const sentido = l => { const w = planta && planta.paredes.find(x => x.letra === l); if (!w) return null; const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y, n = Math.hypot(dx, dy); return n ? { x: dx / n, y: dy / n } : null; };
  const enfrentadas = (p, r) => { const a = sentido(p.letra), b = sentido(r.letra); return !a || !b || a.x * b.x + a.y * b.y < -0.7; };
  (d.paredes || []).forEach(p => {
    const q = paredesVecinas(d, p).der, r = q && paredesVecinas(d, q).der;
    if (!q || !r || r === p || !hay(q.largo) || !tieneBajos(p) || !tieneBajos(r) || !enfrentadas(p, r)) return;
    const clave = [p.letra, r.letra].sort().join('');
    if (vistas.has(clave)) return; vistas.add(clave);
    const paso = q.largo - 2 * M.fondo_encimera;
    if (paso < M.pasillo) poner('paso', 'pared.' + q.id, 'Entre las encimeras de ' + p.letra + ' y ' + r.letra + ' quedan unos ' + cm(Math.max(0, paso)) + ' de paso', porquePaso);
  });
  (d.islas || []).filter(x => x.tipo !== 'peninsula' && hay(x.separacion)).forEach(x => {
    const p = (d.paredes || []).find(w => w.letra === x.pared), conMuebles = p && tieneBajos(p), paso = x.separacion - (conMuebles ? M.fondo_encimera : 0);
    if (paso < M.isla_paso) poner('paso', 'islas', 'Entre la isla y ' + (conMuebles ? 'la encimera de la pared ' + p.letra : 'la pared ' + (x.pared || '')) + ' quedan ' + cm(Math.max(0, paso)) + ' de paso', 'Alrededor de la isla, al menos ' + cm(M.isla_paso) + ' para pasar; ' + cm(M.isla_paso_bien) + ' o más si se trabaja en ella o cocinan dos.');
  });
  // Campana decorativa: separación con los altos o columnas de al lado (mínimo 5 cm, mejor 10) para montarla, limpiarla y
  // que el vapor y el calor no estropeen los muebles. Contra la pared no cuenta.
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => campanasPared(p, d).forEach(x => {
    if ((x.pisan || []).length) {
      poner('placa', 'pared.' + p.id, 'Hay muebles encima de la placa de la pared ' + p.letra + ': pisan la campana',
        'Encima de la placa va la campana (salvo que la placa lleve el extractor): deja en los altos un hueco de al menos ' + cm(x.ancho + 2 * CAMPANA.margen_min) + ' (mejor ' + cm(x.ancho + 2 * CAMPANA.margen_bien) + '), la campana y su margen a cada lado. O pon un «Alto campana» con la campana dentro, o una placa con extractor.');
      return;
    }
    [['izquierda', x.izq, x.izqPared], ['derecha', x.der, x.derPared]].forEach(([t, v, pared]) => {
      if (v === null || pared || v >= CAMPANA.margen_min) return;
      poner('placa', 'pared.' + p.id, 'La campana de la pared ' + p.letra + ' queda a ' + cm(Math.max(0, v)) + ' del mueble de la ' + t,
        'Deja al menos ' + cm(CAMPANA.margen_min) + ' (mejor ' + cm(CAMPANA.margen_bien) + ') entre una campana decorativa y los altos: para montarla y limpiarla, y para que el vapor y el calor no estropeen los muebles.' + (x.hueco ? ' Elige una campana más pequeña o un hueco más ancho.' : ' Deja un hueco más ancho encima de la placa o pon una campana más pequeña en el mueble «Campana decorativa».'));
    });
  }));
  const orden = GRUPOS.map(g => g[0]);
  return l.sort((a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo));
}

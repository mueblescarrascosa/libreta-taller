// Alzados: cada pared vista de frente (en 2D), con la altura de la habitación, los muebles a su altura,
// ventanas, puertas, pilares, azulejo y las tomas en su punto, con la altura al lado.
// Las alturas de los muebles son orientativas (las de una cocina normal); lo medido manda.
import { camposDeElemento, extraPilar, pilarDeVecina } from './modelo.js';
import { situarMuebles, situarCuerpos, paredesVecinas, esColumna, nombreModulo, medidasModulo, interioresDe, textoInteriores, piezasInterior } from './modulos.js';
import { verMedida } from './unidades.js';
import { corta } from './plano-vista.js';
import { encajarRotulo, textoRotulo, fondoRotulo } from './rotulos.js';
import { frenteModulo, frenteCuerpo, puertasCuerpo, frenteFrigoLibre, varianteDe, varianteAlto } from './frentes.js';

const hay = v => v !== null && v !== undefined;
// Alturas orientativas (mm desde el suelo).
// Cocina tipo del taller: zócalo 15 + mueble 70 + encimera 4 = 89 cm; altos de 70 desde 145 (56 cm sobre la encimera) hasta 215, como las columnas.
// La guía de medidas y los consejos de diseño leen de aquí.
export const ALTURAS = { techo: 2500, zocalo: 150, mueble_bajo: 700, encimera: 890, grueso_encimera: 40, altos_desde: 1450, altos_hasta: 2150, columna: 2150, frigo: 1850 };
// La cocina tipo de los ajustes (cocina_tipo: zócalo, mueble, grueso, alto de los altos y su separación de la encimera).
export function fijarCocinaTipo(ct) {
  if (!ct) return ALTURAS;
  const encimera = ct.zocalo + ct.mueble + ct.grueso, desde = encimera + ct.separacion, hasta = desde + ct.alto_alto;
  return Object.assign(ALTURAS, { zocalo: ct.zocalo, mueble_bajo: ct.mueble, grueso_encimera: ct.grueso, encimera, altos_desde: desde, altos_hasta: hasta, columna: hasta, frigo: Math.min(1850, hasta - 300) });
}
// Alturas de una cocina: las de la cocina tipo de Ajustes y, encima, las que se hayan cambiado en la propia ficha.
// «desde»: a qué altura del suelo va el mueble alto (si se pone, manda sobre la separación).
// Si no se ha dicho ni la separación ni el «desde» en la cocina, los altos se suben o bajan lo justo para que la columna
// (que llega hasta arriba de los altos) quede en números redondos (casco de 0 o 5 cm): lo más cerca y lo más cómodo
// (separación entre 54 y 62 cm de la encimera; a igual distancia, más bajo, que se llega mejor).
export const CAMPOS_ALTURA = [['zocalo', 'Zócalo'], ['mueble', 'Alto del mueble bajo (casco)'], ['grueso', 'Grueso de la encimera'], ['alto_alto', 'Alto de los altos'], ['separacion', 'De la encimera a los altos'], ['desde', 'Altos desde el suelo']];
export const SEPARACION_COMODA = [540, 620], REDONDEO_COLUMNA = 50;
export function alturasCocina(d, ajustes) {
  const base = Object.assign({}, (ajustes && ajustes.cocina_tipo) || { zocalo: 150, mueble: 700, grueso: 40, alto_alto: 700, separacion: 560 });
  const propias = (d && d.alturas) || {}, dicho = k => Number.isFinite(propias[k]) && propias[k] > 0;
  CAMPOS_ALTURA.forEach(([k]) => { if (k !== 'desde' && dicho(k)) base[k] = propias[k]; });
  const encimera = base.zocalo + base.mueble + base.grueso;
  base.redondeada = false;
  if (dicho('desde')) base.separacion = propias.desde - encimera;
  else if (!dicho('separacion')) {
    const casco = encimera + base.separacion + base.alto_alto - base.zocalo, R = REDONDEO_COLUMNA;
    if (casco % R) {
      const abajo = Math.floor(casco / R) * R, arriba = abajo + R;
      const sep = c => base.separacion + (c - casco), comoda = c => sep(c) >= SEPARACION_COMODA[0] && sep(c) <= SEPARACION_COMODA[1];
      const opciones = [abajo, arriba].sort((x, y) => (comoda(y) - comoda(x)) || (Math.abs(x - casco) - Math.abs(y - casco)) || (x - y));
      base.separacion = sep(opciones[0]); base.redondeada = true;
    }
  }
  return base;
}
const PUNTOS = ['humos', 'desague', 'toma', 'agua', 'gas', 'enchufe', 'otro'];

// El frigorífico, si es de libre instalación: 'libre' o 'americano' (de los electrodomésticos de la cocina); si no, null.
// Dónde acaba el frigo por arriba (y empieza el alto de encima): con su alto en Electrodomésticos, el integrable
// va sobre el zócalo y lleva 2 cm de holgura; si no, el de la cocina tipo.
// Campana decorativa (piramidal) sobre cada placa que no tiene un alto encima: si en los electrodomésticos la campana es
// decorativa o no se ha dicho el tipo (las extraíbles e integradas van en el «Alto campana»). Ancho: el elegido en el
// mueble, el de Electrodomésticos o 60. Medidas en mm: 65 cm sobre la encimera, base de 7, pirámide de 33 y chimenea de 26 hasta el techo.
export const CAMPANA = { sobre: 650, base: 70, piramide: 330, chimenea: 260, fondo: 500, fondo_chimenea: 240, margen_min: 50, margen_bien: 100 };
// Tubo de humos: la campana va sobre los 150 cm y tiene unos 30 cm de alto hasta donde empieza el tubo. Si la salida queda
// a más de 10 cm a un lado del centro, el tubo no sube derecho: lleva codos y hay que cajearlo. La placa extractora con
// salida a la calle lleva el tubo a ras de suelo, por detrás del zócalo, con unos 30 cm hasta la pared.
export const TUBO = { hasta_tubo: 300, tolera: 100, suelo: 75, fondo_placa: 300, alta_placa: 400 };
// Tamaño de la placa y de la campana: el elegido en el mueble; si no, el de Electrodomésticos; si no, 60.
export const ANCHO_PLACA = 600, ANCHO_CAMPANA = 600;
const electroDe = (d, clave) => ((d && d.electro) || []).find(e => e.clave === clave);
export function anchoPlaca(m, d) { const e = electroDe(d, 'placa'); return m && hay(m.placa_ancho) ? m.placa_ancho : e && hay(e.ancho) ? e.ancho : ANCHO_PLACA; }
export function anchoCampana(m, d) { const e = electroDe(d, 'campana'); return m && hay(m.campana_ancho) ? m.campana_ancho : e && hay(e.ancho) ? e.ancho : ANCHO_CAMPANA; }
// Placas sobre la encimera (mm desde la izquierda de la pared): la del mueble de placa, centrada en él, y debajo de cada
// campana (alto «Campana decorativa» o «Alto campana») que no tenga un mueble de placa debajo, centrada con la campana:
// así se ve la placa puesta encima de dos cajoneras. Solo si debajo hay bajos (no columnas ni huecos).
export function placasPared(pared, d, sit = situarMuebles(pared, d)) {
  const pisa = (a, b) => a.desde < b.hasta - 50 && a.hasta > b.desde + 50;
  const deMueble = sit.bajos.filter(b => b.m.tipo === 'placa').map(({ m, desde, hasta }) => {
    const w = Math.max(0, Math.min(anchoPlaca(m, d), hasta - desde)), x = (desde + hasta - w) / 2;
    return { mueble: m, desde: x, hasta: x + w, ancho: w };
  });
  const bajoCampana = sit.altos.filter(a => (a.m.tipo === 'campana_deco' || a.m.tipo === 'alto_campana') && !deMueble.some(p => pisa(p, a))).map(({ m, desde, hasta }) => {
    const w = anchoPlaca(m, d), cx = (desde + hasta) / 2;
    const debajo = sit.bajos.filter(b => b.desde <= cx && b.hasta >= cx);   // en la junta de dos cajoneras, las dos
    if (!debajo.length || debajo.some(b => b.m.tipo === 'hueco' || esColumna(b.m))) return null;
    // Encima del fregadero no se pone (sería un error de la cocina, no una placa).
    if (sit.bajos.some(b => b.m.tipo === 'fregadero' && b.desde < cx + w / 2 - 50 && b.hasta > cx - w / 2 + 50)) return null;
    return { campana: m, desde: cx - w / 2, hasta: cx + w / 2, ancho: w };
  }).filter(Boolean);
  return deMueble.concat(bajoCampana).filter(p => p.ancho > 0);
}
// Centro de cada campana (decorativa, sobre la placa o «Alto campana») medido desde la punta de la pared que quede más
// cerca, para marcar la salida de humos y colgarla: { x, dist, lado: 'izq'|'der', letra (pared de esa esquina), mueble }.
export function centrosCampana(pared, d, sit = situarMuebles(pared, d)) {
  const L = hay(pared.largo) ? pared.largo : null, v = paredesVecinas(d, pared);
  const lista = campanasPared(pared, d, sit).map(c => ({ x: (c.desde + c.hasta) / 2, mueble: c.alto || c.placa }))
    .concat(sit.altos.filter(a => a.m.tipo === 'alto_campana').map(a => ({ x: (a.desde + a.hasta) / 2, mueble: a.m })));
  return lista.map(c => {
    const der = L !== null && L - c.x < c.x, vec = v[der ? 'der' : 'izq'];
    return Object.assign(c, { lado: der ? 'der' : 'izq', dist: Math.round(der ? L - c.x : c.x), letra: vec && vec.letra ? vec.letra : null });
  });
}
// «Centro de la campana a 145 cm de la pared B» (o «del lado izquierdo» si no hay pared al lado).
export function textoCentroCampana(c) {
  return 'Centro de la campana a ' + verMedida(c.dist, 'cm') + ' cm ' + (c.letra ? 'de la pared ' + c.letra + ' (' + (c.lado === 'der' ? 'derecha' : 'izquierda') + ')' : 'del lado ' + (c.lado === 'der' ? 'derecho' : 'izquierdo'));
}
// También donde se haya puesto el alto «Campana piramidal» (con su ancho), sea cual sea el tipo de campana.
export function campanasPared(pared, d, sit = situarMuebles(pared, d)) {
  const c = (d.electro || []).find(e => e.clave === 'campana');
  // En el hueco del alto «Campana piramidal», la campana centrada con su ancho (el del mueble, el de electrodomésticos o 60).
  // En el mueble se puede elegir el tamaño de la campana (60, 90, 120) y su tipo (piramidal o recta).
  const anchoEn = (hueco, m) => Math.min(anchoCampana(m, d), hueco);
  const puestas = sit.altos.filter(a => a.m.tipo === 'campana_deco').map(a => { const w = anchoEn(a.hasta - a.desde, a.m), x = (a.desde + a.hasta - w) / 2; return { alto: a.m, desde: x, hasta: x + w, ancho: w, hueco: a.hasta - a.desde, tipo: a.m.campana_tipo || 'piramidal' }; });
  const sobrePlaca = c && c.tipo && c.tipo !== 'decorativa' ? [] : sit.bajos.filter(({ m, desde, hasta }) => m.tipo === 'placa' && !m.extractor && !sit.altos.some(a => (a.m.tipo === 'campana_deco' || a.m.tipo === 'alto_campana') && a.desde < hasta - 50 && a.hasta > desde + 50))
    .map(({ m, desde, hasta }) => { const w = anchoCampana(m, d), x = (desde + hasta - w) / 2; return { placa: m, desde: x, hasta: x + w, ancho: w, tipo: 'piramidal' }; });
  // Lo que queda a cada lado hasta el siguiente alto o columna (o la pared). Negativo: ese mueble pisa la campana.
  // «pisan»: los altos o columnas que se meten en el sitio de la campana (no puede haber ninguno).
  const L = hay(pared.largo) ? pared.largo : Infinity, ocupan = sit.altos.filter(a => a.m.tipo !== 'hueco' && a.m.tipo !== 'campana_deco').concat(sit.bajos.filter(b => esColumna(b.m)));
  return puestas.concat(sobrePlaca).map(x => {
    const aIzq = ocupan.filter(o => o.desde < x.desde - 1), aDer = ocupan.filter(o => o.hasta > x.hasta + 1);
    const izq = aIzq.reduce((m, o) => Math.max(m, o.hasta), 0), der = aDer.reduce((m, o) => Math.min(m, o.desde), L);
    const pisan = ocupan.filter(o => o.desde < x.hasta - 1 && o.hasta > x.desde + 1).map(o => o.m);
    return Object.assign(x, { izq: Math.round(x.desde - izq), der: isFinite(der) ? Math.round(der - x.hasta) : null, izqPared: !aIzq.length, derPared: !aDer.length, pisan });
  });
}
// Texto para la ficha: «Campana de 60 en un hueco de 90: quedan 15 cm a la izquierda y 15 cm a la derecha».
export function textoHolgurasCampana(x) {
  const cm = mm => Math.round(mm / 10) + ' cm', lado = (v, pared, t) => (v === null ? '' : v < 0 ? '⚠ el mueble de la ' + t + ' la pisa ' + cm(-v) : (!pared && v < CAMPANA.margen_min ? '⚠ ' : '') + cm(v) + ' a la ' + t + (pared ? ' hasta la pared' : ' hasta el mueble'));
  const pisa = (x.pisan || []).length > 0;
  const t = 'Campana ' + (x.tipo === 'recta' ? 'recta' : 'piramidal') + ' de ' + cm(x.ancho) + (x.hueco ? ' en un hueco de ' + cm(x.hueco) : ' encima de la placa') + ': ' + (pisa ? '' : 'quedan ')
    + [lado(x.izq, x.izqPared, 'izquierda'), lado(x.der, x.derPared, 'derecha')].filter(Boolean).join(' y ') + '.';
  return pisa ? t.replace(/ y ⚠ el mueble de la derecha/, ' y el de la derecha') + ' Deja en los altos un hueco de ' + cm(x.ancho + 2 * CAMPANA.margen_bien) + ' (la campana y ' + cm(CAMPANA.margen_bien) + ' a cada lado).' : t;
}

// Cuánto tubo y cuántos codos hacen falta desde el aparato (x, z0: donde empieza el tubo) hasta la salida de humos más
// cercana en x: { de, x, z0, salida, dx, tubo (mm), codos, cajear, sinAltura, alta, camino: [[x, z]…] para el alzado }.
export function tuboHumos(a, salidas, techo) {
  if (!salidas.length) return Object.assign({}, a, { salida: null });
  const s = salidas.reduce((m, q) => (Math.abs(q.x - a.x) < Math.abs(m.x - a.x) ? q : m)), dx = Math.round(s.x - a.x), lado = Math.abs(dx) > TUBO.tolera;
  const r = Object.assign({}, a, { salida: s, dx, cajear: lado, sinAltura: !s.techo && s.y === null });
  if (a.de === 'campana') {
    const arriba = s.techo ? techo : s.y === null ? a.z0 : s.y, sube = Math.max(0, arriba - a.z0);
    r.baja = !s.techo && s.y !== null && s.y < a.z0 - 50;
    r.tubo = sube + (lado ? Math.abs(dx) : 0) + (r.baja ? a.z0 - s.y : 0);
    r.codos = s.techo ? (lado ? 2 : 0) : lado ? 2 : 1;
    const zh = s.techo ? Math.max(a.z0, techo - 150) : arriba;
    r.camino = s.techo ? (lado ? [[a.x, a.z0], [a.x, zh], [s.x, zh], [s.x, techo]] : [[a.x, a.z0], [a.x, techo]]) : [[a.x, a.z0], [a.x, zh], [s.x, zh]];
  } else {
    // Placa extractora: baja por dentro del mueble (va con la placa), sigue por detrás del zócalo y entra en la pared.
    const y = s.techo ? techo : s.y === null ? a.z0 : s.y, sube = Math.max(0, y - a.z0);
    r.alta = s.techo || (s.y !== null && s.y > TUBO.alta_placa);
    r.tubo = TUBO.fondo_placa + (lado ? Math.abs(dx) : 0) + (sube > 100 ? sube : 0);
    r.codos = (lado ? 2 : 0) + (sube > 100 ? (lado ? 1 : 2) : 0);
    r.camino = [[a.x, ALTURAS.encimera - 100], [a.x, a.z0], [s.x, a.z0]].concat(sube > 100 ? [[s.x, y]] : []);
  }
  return r;
}
// «Tubo de la campana: unos 1,2 m y 2 codos. Hay que cajearlo: la salida queda 40 cm a la derecha del centro.»
export function textoTubo(t) {
  const quien = t.de === 'campana' ? 'Tubo de la campana' : 'Tubo de la placa extractora (a ras de suelo, por detrás del zócalo)';
  if (!t.salida) return quien + ': falta apuntar la salida de humos en esta pared.';
  const m = Math.ceil(t.tubo / 100) * 100, codos = t.codos === 0 ? 'sin codos' : t.codos + (t.codos === 1 ? ' codo' : ' codos');
  let x = quien + ': unos ' + verMedida(m, 'm') + ' m y ' + codos + (t.salida.techo ? ' (sale por el techo)' : '') + '.';
  if (t.cajear) x += ' ' + (t.de === 'campana' ? 'Hay que cajearlo: l' : 'L') + 'a salida queda ' + verMedida(Math.abs(t.dx), 'cm') + ' cm a la ' + (t.dx < 0 ? 'izquierda' : 'derecha') + ' del centro.';
  if (t.baja) x += ' ⚠ La salida está más baja que donde empieza el tubo.';
  if (t.alta) x += ' ⚠ La salida está alta para una placa extractora: suele ir a ras de suelo.';
  if (t.sinAltura) x += ' (Sin la altura de la salida: falta lo que sube o baja.)';
  return x;
}

export function techoFrigo(d) {
  const f = ((d && d.electro) || []).find(e => e.clave === 'frigo' && hay(e.alto) && e.alto > 0);
  if (!f) return ALTURAS.frigo;
  return Math.min(ALTURAS.columna, (f.tipo === 'integrable' ? ALTURAS.zocalo : 0) + f.alto + 20);
}
// Frigorífico libre o americano (sin mueble): lo que diga la columna; si no, lo de Electrodomésticos.
export const frigoLibre = (d, m) => { if (m && m.instalacion) return m.instalacion === 'integrable' ? null : m.instalacion; const f = (d.electro || []).find(e => e.clave === 'frigo' && (e.tipo === 'libre' || e.tipo === 'americano')); return f ? f.tipo : null; };

export function geometriaAlzado(d, pared, ajustes = null) {
  const L = pared.largo;
  if (!hay(L) || L <= 0) return null;
  const techo = hay(d.alto_techo) && d.alto_techo > 0 ? d.alto_techo : ALTURAS.techo;
  const arriba = Math.min(ALTURAS.altos_hasta, techo), col = Math.min(ALTURAS.columna, techo);
  const g = { letra: pared.letra, largo: L, techo, techoMedido: hay(d.alto_techo), piezas: [], puntos: [] };
  const pieza = (clase, x, y, w, h, texto, tipo) => { if (w > 0 && h > 0) g.piezas.push({ clase, tipo: tipo || clase, x, y, w, h, texto: texto || '' }); };
  // Puertas, cajones, tiradores y electrodomésticos de un mueble (frentes.js), en su sitio.
  const frente = (lista, x, alto = false) => lista.forEach(q => pieza('f_' + q.k + (alto && q.k === 'hoja' ? '_alto' : ''), x + q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0));

  // Azulejo de la pared: toda o en franja (las zonas van con los elementos).
  if (pared.azulejo === 'toda') pieza('azulejo', 0, 0, L, techo);
  if (pared.azulejo === 'franja' && (hay(pared.azulejo_desde) || pared.azulejo_techo || hay(pared.azulejo_hasta))) {
    const y0 = pared.azulejo_desde || 0, y1 = pared.azulejo_techo ? techo : hay(pared.azulejo_hasta) ? pared.azulejo_hasta : techo;
    pieza('azulejo', 0, y0, L, y1 - y0);
  }

  // Muebles: bajos con zócalo y encimera; columnas hasta arriba (la de frigo, hasta su alto si lo lleva); altos.
  const sit = situarMuebles(pared, d), frigosConAlto = new Set(sit.altos.filter(a => a.m.tipo === 'alto_frigo').map(a => a.desde));
  const bajo = (x, w, texto, tipo, variante) => {
    pieza('zocalo', x, 0, w, ALTURAS.zocalo);
    pieza('bajo', x, ALTURAS.zocalo, w, ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, texto, tipo);
    frente(frenteModulo(tipo, w, ALTURAS.zocalo, ALTURAS.encimera - ALTURAS.grueso_encimera, { variante }), x);
    pieza('encimera', x, ALTURAS.encimera - ALTURAS.grueso_encimera, w, ALTURAS.grueso_encimera);
  };
  if (sit.entran.izq) bajo(0, sit.entran.izq, '', 'rinconero');
  if (sit.entran.der) bajo(L - sit.entran.der, sit.entran.der, '', 'rinconero');
  sit.bajos.forEach(({ m, desde, hasta }) => {
    const texto = (m.tipo === 'rinconero' ? 'Rinc.' : nombreModulo(m)) + ' ' + medidasModulo(m);
    if (m.tipo === 'hueco') return pieza('hueco', desde, 0, hasta - desde, ALTURAS.encimera, texto);
    if (esColumna(m)) {
      const h = m.tipo === 'columna_frigo' && frigosConAlto.has(desde) ? Math.min(techoFrigo(d), col) : col;
      pieza('columna', desde, 0, hasta - desde, h, texto, m.tipo);
      return frente(m.tipo === 'columna_frigo' && frigoLibre(d, m) ? frenteFrigoLibre(hasta - desde, frigoLibre(d, m) === 'americano') : frenteModulo(m.tipo, hasta - desde, 0, h, { columna: true, variante: varianteDe(m) }), desde);
    }
    bajo(desde, hasta - desde, texto, m.tipo, varianteDe(m, d));
  });
  sit.altos.forEach(({ m, desde, hasta }) => {
    if (m.tipo === 'hueco' || m.tipo === 'campana_deco') return;
    const y0 = m.tipo === 'alto_frigo' ? techoFrigo(d) : ALTURAS.altos_desde;
    pieza('alto', desde, y0, hasta - desde, arriba - y0, nombreModulo(m) + ' ' + medidasModulo(m), m.tipo);
    frente(frenteModulo(m.tipo, hasta - desde, y0, arriba, { variante: varianteAlto(m, d) }), desde, true);
  });
  campanasPared(pared, d, sit).forEach(c => {
    const z = ALTURAS.encimera + CAMPANA.sobre, zp = z + CAMPANA.base, zc = zp + CAMPANA.piramide;
    pieza('f_campana', c.desde, z, c.ancho, CAMPANA.base, '', 'campana');
    if (c.tipo === 'recta') pieza('f_campana', c.desde, zp, c.ancho, CAMPANA.piramide, '', 'campana');
    else g.piezas.push({ clase: 'f_campana', tipo: 'campana', x: c.desde, y: zp, w: c.ancho, h: CAMPANA.piramide, trap: CAMPANA.chimenea, texto: '' });
    if (techo > zc) pieza('f_campana', (c.desde + c.hasta - CAMPANA.chimenea) / 2, zc, CAMPANA.chimenea, techo - zc, '', 'campana');
  });

  // Placas: una franja oscura sobre la encimera, de su ancho (también la de debajo de la campana, sobre cajoneras).
  placasPared(pared, d, sit).forEach(q => pieza('f_placa', q.desde, ALTURAS.encimera, q.ancho, 25, '', 'placa'));
  // Centro de cada campana: raya de ejes y cota desde la punta de la pared más cercana, a media altura entre la encimera y la campana.
  g.centrosCampana = centrosCampana(pared, d, sit).map(c => ({ x: c.x, desde: c.lado === 'der' ? L : 0, y: ALTURAS.encimera + CAMPANA.sobre / 2, texto: 'centro a ' + verMedida(c.dist, 'cm') + (c.letra ? ' de ' + c.letra : ''), dist: c.dist, mueble: c.mueble }));
  const placasExtractoras = sit.bajos.filter(b => b.m.tipo === 'placa' && b.m.extractor === 'exterior').map(b => ({ x: (b.desde + b.hasta) / 2, mueble: b.m }));

  // Cuerpos del vestidor, de izquierda a derecha, con su interior dibujado (barras, estantes, cajones…);
  // en las puntas, lo que entra del cuerpo de rincón de la pared de al lado (con su interior, sin rótulo).
  const cuerpo = (cu, xc, w, texto) => {
    pieza('cuerpo', xc, 0, w, col, texto);
    frente(frenteCuerpo(w, col).concat(puertasCuerpo(w, col, cu && cu.puertas)), xc);
    piezasInterior(cu, col).forEach(q => {
      if (q.tipo === 'barra') pieza('int_barra', xc + 40, q.z - 12, w - 80, 24);
      if (q.tipo === 'estante') pieza('int_estante', xc + 15, q.z - 9, w - 30, 18);
      if (q.tipo === 'zapato') pieza('int_zapato', xc + 25, q.z - 8, w - 50, 16);
      if (q.tipo === 'cajon') pieza('int_cajon', xc + 30, q.z0, w - 60, q.z1 - q.z0);
      if (q.tipo === 'pantalonero') { const wp = Math.min(q.ancho || w - 80, w - 40); pieza('int_pantalonero', xc + (w - wp) / 2, q.z0, wp, q.z1 - q.z0); }
    });
  };
  const sc = situarCuerpos(pared, d);
  if (sc.entran.izq) cuerpo(sc.entran.cIzq, 0, sc.entran.izq, '');
  if (sc.entran.der) cuerpo(sc.entran.cDer, L - sc.entran.der, sc.entran.der, '');
  sc.cuerpos.forEach(({ c: cu, desde, hasta }) => {
    const ti = textoInteriores(cu, ajustes), n = (pared.cuerpos || []).indexOf(cu) + 1;
    cuerpo(cu, desde, hasta - desde, 'C' + n + (cu.rincon ? ' rincón' : '') + (ti ? ' ' + ti : ''));
  });

  // Elementos de la pared, en su sitio (con el pilar si se midió desde él).
  (pared.elementos || []).forEach(e => {
    if (!hay(e.distancia)) return;
    const c = camposDeElemento(e.tipo), dist = e.distancia + extraPilar(d, pared, e), ancho = c.ancho && hay(e.ancho) ? e.ancho : 0;
    const x = e.ref === 'der' ? L - dist - (c.punto === 'centro' ? 0 : ancho) : dist;
    if (e.tipo === 'pilar') return pieza('pilar', x, 0, ancho, techo, 'Pilar');
    if (e.tipo === 'puerta') return pieza('puerta', x, e.altura || 0, ancho, hay(e.alto) ? e.alto : 2030, 'Puerta');
    if (e.tipo === 'ventana') {
      const y0 = hay(e.altura) ? e.altura : 1000;
      return pieza('ventana', x, y0, ancho, hay(e.alto) ? e.alto : Math.min(1000, techo - y0), 'Ventana');
    }
    if (e.tipo === 'zona') {
      const y0 = e.altura || 0, h = e.techo ? techo - y0 : hay(e.alto) ? e.alto : 0;
      return pieza('azulejo', x, y0, ancho, h, e.nombre ? 'Az. ' + e.nombre : '');
    }
    if (e.tipo === 'humos' && e.humos_sale === 'techo') return g.puntos.push({ tipo: e.tipo, x, y: techo, texto: corta(e), techo: true, dato: e });
    if (PUNTOS.includes(e.tipo)) g.puntos.push({ tipo: e.tipo, x, y: hay(e.altura) ? e.altura : null, texto: corta(e), dato: e });
  });
  // Pilar de la pared de al lado en esta esquina: también se ve aquí, con lo que sobresale allí.
  ['izq', 'der'].forEach(lado => {
    const v = pilarDeVecina(d, pared, lado);
    if (v) pieza('pilar', lado === 'izq' ? 0 : L - v.fondo, 0, v.fondo, techo, 'Pilar ' + v.de, 'pilar_vecino');
  });
  // Tubo de humos de cada campana y de cada placa extractora con salida a la calle, hasta la salida más cercana.
  const salidas = g.puntos.filter(q => q.tipo === 'humos' && !(q.dato && q.dato.humos_forma === 'recirculacion'));
  g.tubos = g.centrosCampana.map(c => tuboHumos({ de: 'campana', x: c.x, z0: (c.mueble && c.mueble.tipo === 'alto_campana' ? ALTURAS.altos_desde : ALTURAS.encimera + CAMPANA.sobre) + TUBO.hasta_tubo, mueble: c.mueble }, salidas, techo))
    .concat(placasExtractoras.map(c => tuboHumos({ de: 'placa', x: c.x, z0: TUBO.suelo, mueble: c.mueble }, salidas, techo)));
  return g;
}

// Nombres cortos para la fila de nombres cuando el largo no cabe.
const CORTOS = [['Columna frigo', 'Col. frigo'], ['Columna H/MO', 'Col. H/MO'], ['Alto sobre frigo', 'Alto s/frigo'], ['Alto campana', 'Campana'], ['Alto micro', 'Micro'],
  ['Lavavajillas', 'Lavavaj.'], ['Fregadero', 'Freg.'], ['Cajonero', 'Cajon.'], ['Escobero', 'Escob.'], ['Despensero', 'Desp.'], ['Placa extractora con horno', 'Placa extr.+horno'], ['Placa con horno', 'Placa+horno'], ['Placa extractora', 'Placa extr.']];
export const acortar = t => CORTOS.reduce((x, [a, b]) => x.replace(a, b), String(t));

// Dibujo SVG del alzado. Solo en el navegador.
export function svgAlzado(g, { unidad = 'cm' } = {}) {
  const NS = 'http://www.w3.org/2000/svg', el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const s = Math.max(g.largo, g.techo) / 120, pad = s * 12, Y = y => g.techo - y;
  // Los nombres de los muebles van fuera del dibujo, cada uno alineado con su mueble: los de bajos, columnas y cuerpos
  // en una fila debajo del suelo; los de los altos, en una fila encima del techo. Así los frentes se ven limpios.
  const FUERA = ['bajo', 'columna', 'cuerpo', 'hueco', 'alto'], hueco_ = s * 2, banda = s * 22;
  const hayAbajo = g.piezas.some(p => p.texto && FUERA.includes(p.clase) && p.clase !== 'alto'), hayArriba = g.piezas.some(p => p.texto && p.clase === 'alto');
  const extraAbajo = hayAbajo ? hueco_ + banda : 0, extraArriba = hayArriba ? hueco_ + banda : 0;
  const svg = el('svg', { class: 'alzado', role: 'img', 'aria-label': 'Alzado de la pared ' + g.letra, 'data-acc': 'alzado',
    viewBox: `${-pad * 1.4} ${-pad - extraArriba} ${g.largo + pad * 2.4} ${g.techo + pad * 2.2 + extraAbajo + extraArriba}` });
  const texto = (x, y, t, o) => svg.append(el('text', Object.assign({ x, y, 'font-size': s * 3.4, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': s * 0.8 }, o), t));
  const caja = (p, o) => svg.append(el('rect', Object.assign({ x: p.x, y: Y(p.y + p.h), width: p.w, height: p.h, 'data-pieza': p.clase }, o)));
  // La pared.
  svg.append(el('rect', { x: 0, y: 0, width: g.largo, height: g.techo, fill: '#fff', stroke: '#1f2937', 'stroke-width': s * 0.8 }));
  const ESTILO = {
    azulejo: { fill: '#99f6e4', 'fill-opacity': 0.35, stroke: '#0f766e', 'stroke-width': s * 0.25, 'stroke-dasharray': s + ' ' + s * 0.6 },
    pilar: { fill: '#d1d5db', stroke: '#6b7280', 'stroke-width': s * 0.4 },
    zocalo: { fill: '#e7d8c9', stroke: '#92400e', 'stroke-width': s * 0.3 },
    bajo: { fill: '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.4 },
    encimera: { fill: '#57534e', stroke: 'none' },
    columna: { fill: '#e7d8c9', stroke: '#92400e', 'stroke-width': s * 0.4 },
    cuerpo: { fill: '#f5ede4', stroke: '#92400e', 'stroke-width': s * 0.4 },
    int_barra: { fill: '#57534e', stroke: 'none' },
    int_estante: { fill: '#c08a4a', stroke: 'none' },
    int_zapato: { fill: '#a8a29e', stroke: 'none' },
    int_cajon: { fill: '#fde68a', stroke: '#92400e', 'stroke-width': s * 0.3 },
    int_pantalonero: { fill: '#fef3c7', stroke: '#78350f', 'stroke-width': s * 0.25, 'stroke-dasharray': s * 0.8 + ' ' + s * 0.5 },
    hueco: { fill: 'none', stroke: '#a8a29e', 'stroke-width': s * 0.3, 'stroke-dasharray': s + ' ' + s },
    // Frentes: puertas y cajones un poco más claros que el mueble, tiradores y electrodomésticos oscuros.
    f_zocalo: { fill: '#d6c3ae', stroke: '#92400e', 'stroke-width': s * 0.2 },
    f_tablero: { fill: '#e2cdb5', stroke: '#92400e', 'stroke-width': s * 0.2 },
    f_hoja: { fill: '#fbf6f0', stroke: '#92400e', 'stroke-width': s * 0.25 },
    f_hoja_alto: { fill: '#dbeafe', stroke: '#1d4ed8', 'stroke-width': s * 0.25 },
    f_acero: { fill: '#e2e8f0', stroke: '#64748b', 'stroke-width': s * 0.3 },
    f_tirador: { fill: '#57534e', stroke: 'none' },
    f_electro: { fill: '#3f3f46', stroke: '#18181b', 'stroke-width': s * 0.25 },
    f_cristal: { fill: '#52525b', stroke: '#a1a1aa', 'stroke-width': s * 0.2 },
    f_campana: { fill: '#a1a1aa', stroke: '#52525b', 'stroke-width': s * 0.25 },
    f_placa: { fill: '#1f2328', stroke: '#0b0d10', 'stroke-width': s * 0.2 },
    alto: { fill: '#bfdbfe', stroke: '#1d4ed8', 'stroke-width': s * 0.4 },
    ventana: { fill: '#e0f2fe', stroke: '#0284c7', 'stroke-width': s * 0.5 },
    puerta: { fill: '#fef3c7', stroke: '#92400e', 'stroke-width': s * 0.5 },
  };
  const orden = ['azulejo', 'pilar', 'ventana', 'puerta', 'zocalo', 'bajo', 'encimera', 'columna', 'cuerpo', 'int_estante', 'int_zapato', 'int_cajon', 'int_pantalonero', 'int_barra', 'hueco', 'alto', 'f_zocalo', 'f_tablero', 'f_hoja', 'f_hoja_alto', 'f_acero', 'f_electro', 'f_cristal', 'f_campana', 'f_placa', 'f_tirador'];
  const rotulos = [];
  orden.forEach(clase => g.piezas.filter(p => p.clase === clase).forEach(p => {
    if (p.trap) svg.append(el('polygon', Object.assign({ points: [[p.x, p.y], [p.x + p.w, p.y], [p.x + (p.w + p.trap) / 2, p.y + p.h], [p.x + (p.w - p.trap) / 2, p.y + p.h]].map(([x, y]) => x + ',' + Y(y)).join(' '), 'data-pieza': p.clase }, ESTILO[clase])));
    else caja(p, ESTILO[clase]);
    if (clase === 'ventana') svg.append(el('path', { d: `M${p.x} ${Y(p.y)} L${p.x + p.w} ${Y(p.y + p.h)} M${p.x} ${Y(p.y + p.h)} L${p.x + p.w} ${Y(p.y)}`, stroke: '#7dd3fc', 'stroke-width': s * 0.25, fill: 'none' }));
    if (p.texto) rotulos.push([p, clase]);
  }));
  // Rótulos: los de los muebles en su fila de fuera (debajo del suelo o encima del techo), en el ancho de su mueble;
  // los de ventanas, puertas, pilares y azulejo, dentro de su pieza. Sin pisarse: en horizontal, girados, en dos líneas
  // o con letra menor. Cada fila lleva unas rayitas finas en los bordes de los muebles para ver a cuál va cada nombre.
  const ocupados = [];
  const fila = (y0, y1) => rotulos.filter(([p, c]) => FUERA.includes(c) && (c === 'alto') === (y1 <= 0)).forEach(([p]) => [p.x, p.x + p.w].forEach(x =>
    svg.append(el('line', { x1: x, y1: y0, x2: x, y2: y1, stroke: '#d6c3ae', 'stroke-width': s * 0.25, 'data-separa': '' }))));
  if (hayAbajo) fila(g.techo + hueco_, g.techo + hueco_ + banda);
  if (hayArriba) fila(-hueco_ - banda, -hueco_);
  rotulos.forEach(([p, clase]) => {
    const color = clase === 'alto' ? '#1e3a8a' : clase === 'ventana' ? '#075985' : clase === 'azulejo' ? '#0f766e' : '#78350f';
    const fuera = FUERA.includes(clase), tamanos = [3.4, 3, 2.6, 2.2].map(k => k * s);
    const hueco = !fuera ? { x0: p.x, x1: p.x + p.w, y0: Y(p.y + p.h), y1: Y(p.y) }
      : clase === 'alto' ? { x0: p.x, x1: p.x + p.w, y0: -hueco_ - banda, y1: -hueco_ } : { x0: p.x, x1: p.x + p.w, y0: g.techo + hueco_, y1: g.techo + hueco_ + banda };
    // Si el nombre largo no cabe con letra normal, el corto («Col. frigo 60») antes de girarlo o encogerlo.
    const corto = acortar(p.texto), normales = tamanos.slice(0, 3);
    // En las filas de nombres, derecho siempre que se pueda (largo o corto); girado solo si no cabe de ninguna forma.
    const r = (fuera && (encajarRotulo(p.texto, hueco, { tamanos: normales, puestos: ocupados, derecho: true, soloDerecho: true })
        || encajarRotulo(corto, hueco, { tamanos, puestos: ocupados, derecho: true, soloDerecho: true })))
      || encajarRotulo(p.texto, hueco, { tamanos: normales, puestos: ocupados }) || (corto !== p.texto && encajarRotulo(corto, hueco, { tamanos, puestos: ocupados }))
      || encajarRotulo(p.texto, hueco, { tamanos, puestos: ocupados }) || encajarRotulo(corto, hueco, { tamanos: [2.2 * s], margen: 1.2 })
      || { tam: 2.2 * s, girar: p.w < p.h, lineas: [String(p.texto)], cx: p.x + p.w / 2, cy: Y(p.y + p.h / 2), caja: null };
    if (r.caja) ocupados.push(r.caja);
    svg.append(fondoRotulo(el, r, r.tam), textoRotulo(el, r, { fill: color }));
  });
  // Tomas, enchufes, desagües y humos: un punto en su altura, con lo que es y la altura.
  const COLOR = { humos: '#7c3aed', desague: '#0891b2', toma: '#2563eb', agua: '#2563eb', gas: '#ea580c', enchufe: '#dc2626', otro: '#111827' };
  // Si un rótulo pisa a otro, sube un escalón y una rayita lo une a su punto.
  const puestos = [], pisa = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  // Los desagües (abajo, tras los bajos) llevan el nombre debajo del punto; el resto, encima. Primero se colocan todos,
  // luego se dibujan las rayitas y al final los nombres con su fondo: ninguna raya tacha el nombre de otra toma.
  const colocados = [];
  // Tampoco pisan los nombres de dentro (pilar, ventana…) ni el punto de otra toma.
  puestos.push(...ocupados, ...g.puntos.map(q => { const py = Y(q.y === null ? 0 : q.y); return { x: q.x - s * 2, y: py - s * 2, w: s * 4, h: s * 4 }; }));
  g.puntos.forEach(q => {
    const col = COLOR[q.tipo] || '#111827', y = q.y === null ? 0 : q.y, py = Y(y);
    const t = q.techo ? q.texto : q.texto + ' ' + (q.y === null ? '(sin altura)' : verMedida(q.y, unidad)), tam = 3, w = t.length * s * tam * 0.58, hh = s * tam * 1.3;
    const abajo = q.techo || q.tipo === 'desague', dir = abajo ? 1 : -1;
    let paso = 0, caja;
    do { caja = { x: q.x - w / 2, y: (abajo ? py + s * 2.5 : py - s * 4 - hh / 2) + dir * paso * hh, w, h: hh }; paso++; } while (paso < 12 && puestos.some(b => pisa(caja, b)));
    puestos.push(caja);
    colocados.push({ q, col, py, t, tam, hh, caja, paso, abajo });
  });
  colocados.forEach(({ q, col, py, hh, caja, paso, abajo }) => {
    if (paso > 1) svg.append(el('line', { x1: q.x, y1: abajo ? py + s * 1.5 : py - s * 1.5, x2: q.x, y2: abajo ? caja.y : caja.y + hh, stroke: col, 'stroke-width': s * 0.3, opacity: 0.7 }));
  });
  colocados.forEach(({ q, col, py }) => svg.append(el('circle', { cx: q.x, cy: py, r: s * 1.5, fill: q.y === null ? '#fff' : col, stroke: col, 'stroke-width': s * 0.5, 'data-punto': q.tipo })));
  colocados.forEach(({ q, col, t, tam, hh, caja }) => {
    // Con fondo blanco: las puertas y los tiradores pasan por detrás y no tachan el nombre.
    svg.append(fondoRotulo(el, { caja }, s * tam));
    texto(q.x, caja.y + hh / 2, t, { fill: col, 'font-size': s * tam, 'data-rotulo-punto': q.tipo, stroke: 'none' });
  });
  // Tubo de humos: raya de trazos gris hasta la salida.
  (g.tubos || []).filter(t => t.camino).forEach(t => svg.append(el('polyline', { points: t.camino.map(([x, z]) => x + ',' + Y(z)).join(' '), fill: 'none', stroke: '#57534e', 'stroke-width': s * 0.6, 'stroke-dasharray': s * 1.2 + ' ' + s * 0.7, 'stroke-linejoin': 'round', 'data-tubo': t.de })));
  // Centro de la campana: eje de puntos de la encimera a la campana y la cota desde la pared más cercana.
  (g.centrosCampana || []).forEach(c => {
    const col = '#7c3aed', y = Y(c.y), z0 = Y(ALTURAS.encimera), z1 = Y(ALTURAS.encimera + CAMPANA.sobre), t = s * 1.2;
    svg.append(el('line', { x1: c.x, y1: z0, x2: c.x, y2: z1, stroke: col, 'stroke-width': s * 0.3, 'stroke-dasharray': s * 1.5 + ' ' + s * 0.8, 'data-eje-campana': '' }));
    svg.append(el('line', { x1: c.desde, y1: y, x2: c.x, y2: y, stroke: col, 'stroke-width': s * 0.35 }));
    [c.desde, c.x].forEach(x => svg.append(el('line', { x1: x, y1: y - t, x2: x, y2: y + t, stroke: col, 'stroke-width': s * 0.35 })));
    const tam = 3, w = c.texto.length * s * tam * 0.58, hh = s * tam * 1.3, cx = (c.desde + c.x) / 2;
    svg.append(fondoRotulo(el, { caja: { x: cx - w / 2, y: y - hh - s * 0.6, w, h: hh } }, s * tam));
    texto(cx, y - hh / 2 - s * 0.6, c.texto, { fill: col, 'font-size': s * tam, 'font-weight': 700, stroke: 'none', 'data-cota-campana': '' });
  });
  // Cotas generales: largo abajo (debajo de la fila de nombres) y altura del techo a la izquierda.
  texto(g.largo / 2, g.techo + extraAbajo + pad * 0.6, g.letra + ' · ' + verMedida(g.largo, 'm') + ' m', { 'font-weight': 700, 'font-size': s * 4 });
  const tTecho = (g.techoMedido ? '' : '≈ ') + verMedida(g.techo, 'm') + ' m';
  texto(-pad * 0.7, g.techo / 2, tTecho, { 'font-size': s * 3.6, transform: `rotate(-90 ${-pad * 0.7} ${g.techo / 2})`, fill: g.techoMedido ? '#111827' : '#b45309' });
  return svg;
}

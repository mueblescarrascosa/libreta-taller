// Material para pedir, sacado de lo medido: encimera (piezas, uniones en las esquinas y huecos), lineales en metros
// y herrajes (bisagras, guías, tiradores, patas, barras…). Orientativo: lo medido y lo pedido mandan.
import { situarMuebles, situarCuerpos, esColumna, piezasInterior, paredesVecinas, esLibre, cuadreBajos, cuadreAltos } from './modulos.js';
import { frenteModulo, puertasCuerpo, varianteDe } from './frentes.js';
import { ALTURAS } from './alzado.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
export const ENCIMERA = { fondo: 620, largo_max: 3000 };

// Zócalo: va por el frente de los muebles (bajos y columnas seguidos, sin huecos). En una esquina donde se juntan dos
// tramos, sus frentes se cruzan a un fondo de mueble de la esquina: cada uno descuenta ese fondo (60). En un rincón en
// chaflán el frente es la diagonal. Islas: todo alrededor; península: los dos lados largos y la punta.
export const FONDO_ZOCALO = 600;
export function zocaloFrente(d) {
  const paredes = (d.paredes || []).filter(p => hay(p.largo)), corridas = new Map();
  paredes.forEach(p => {
    const sit = situarMuebles(p, d), trozos = [];
    if (sit.entran.izq) trozos.push([0, sit.entran.izq]);
    sit.bajos.forEach(b => { if (b.m.tipo !== 'hueco') trozos.push([b.desde, b.hasta]); });
    if (sit.entran.der) trozos.push([p.largo - sit.entran.der, p.largo]);
    trozos.sort((a, b) => a[0] - b[0]);
    const r = [];
    trozos.forEach(([a, b]) => { const u = r[r.length - 1]; if (u && a - u[1] < 5) u[1] = Math.max(u[1], b); else r.push([a, b]); });
    corridas.set(p, r);
  });
  let total = 0;
  paredes.forEach(p => {
    const v = paredesVecinas(d, p), r = corridas.get(p);
    const llegaFin = q => q && (corridas.get(q) || []).some(([, b]) => q.largo - b < 5), llegaIni = q => q && (corridas.get(q) || []).some(([a]) => a < 5);
    r.forEach(([a, b]) => {
      let l = b - a;
      if (a < 5 && llegaFin(v.izq)) l -= FONDO_ZOCALO;
      if (p.largo - b < 5 && llegaIni(v.der)) l -= FONDO_ZOCALO;
      total += Math.max(0, l);
    });
    // Rinconero en chaflán al final de la pared (gira a la derecha): la diagonal en vez de los dos trozos en L.
    const sit = situarMuebles(p, d), ult = sit.bajos[sit.bajos.length - 1];
    if (ult && ult.m.tipo === 'rinconero' && ult.m.forma === 'chaflan' && p.largo - ult.hasta < 5 && hay(ult.m.lado2)) {
      const x = Math.max(0, ult.m.ancho - FONDO_ZOCALO), y = Math.max(0, ult.m.lado2 - FONDO_ZOCALO);
      total += Math.hypot(x, y) - x - y;
    }
  });
  (d.islas || []).forEach(x => { if (hay(x.largo) && hay(x.fondo)) total += x.tipo === 'peninsula' ? 2 * x.largo + x.fondo : 2 * (x.largo + x.fondo); });
  return Math.round(total);
}

// Tramos de encimera de una pared: los bajos seguidos (sin columnas ni huecos), con lo que entra del rinconero de al lado.
function tramosPared(p, d) {
  if (!hay(p.largo)) return [];
  const sit = situarMuebles(p, d), trozos = [];
  if (sit.entran.izq) trozos.push({ desde: 0, hasta: sit.entran.izq, m: null });
  sit.bajos.forEach(b => { if (b.m.tipo !== 'hueco' && !esColumna(b.m)) trozos.push({ desde: b.desde, hasta: b.hasta, m: b.m }); });
  if (sit.entran.der) trozos.push({ desde: p.largo - sit.entran.der, hasta: p.largo, m: null });
  trozos.sort((a, b) => a.desde - b.desde);
  const tramos = [];
  trozos.forEach(t => {
    const u = tramos[tramos.length - 1];
    if (u && t.desde - u.hasta < 5) { u.hasta = Math.max(u.hasta, t.hasta); if (t.m) u.muebles.push(t.m); }
    else tramos.push({ desde: t.desde, hasta: t.hasta, muebles: t.m ? [t.m] : [] });
  });
  return tramos;
}

  // Cuántos tableros hacen falta para unas piezas (mm), colocándolas por filas (como se corta en la seccionadora):
  // tablero de 2800×2070 por defecto, 4 mm de corte entre piezas y 10 mm de recorte en cada borde; las piezas se pueden
  // girar. Una pieza más grande que el tablero se parte en trozos iguales (y se avisa). OJO: la misma cuenta está en
  // presupuestos (cocinas/armarios.js, ARM.empaquetar); si se cambia una, cambiar la otra (prueba test_tableros_iguales.js). Se prueba cortando las filas a lo
  // largo y a lo ancho del tablero, y vale la que gasta menos. Es una estimación buena para pedir material: el despiece
  // real de la seccionadora puede aprovechar algo más.
export function empaquetar(piezas, op) {
    op = op || {};
    var L = op.largo || 2800, A = op.ancho || 2070, r = op.recorte === undefined ? 10 : op.recorte, k = op.corte === undefined ? 4 : op.corte;
    var a = filas(piezas, L - 2 * r, A - 2 * r, k), b = filas(piezas, A - 2 * r, L - 2 * r, k), m = b.tableros < a.tableros ? b : a;
    m.aprovechamiento = m.tableros ? Math.round(m.area / (m.tableros * L * A) * 100) : 0;
    m.m2 = Math.round(m.area / 1e4) / 100;
    delete m.area;
    return m;
  }
function filas(piezas, W, H, k) {
    var mayor = Math.max(W, H), menor = Math.min(W, H), items = [], partidas = 0, area = 0;
    (piezas || []).forEach(function (p) {
      var a = Math.max(p.an, p.al), b = Math.min(p.an, p.al), n = Math.max(0, Math.round(p.cant || 1));
      if (!(a > 0 && b > 0) || !n) return;
      area += n * p.an * p.al;
      var ta = Math.ceil(a / mayor), tb = Math.ceil(b / menor);
      if (ta * tb > 1) { partidas += n; a = a / ta; b = b / tb; var x = Math.max(a, b); b = Math.min(a, b); a = x; }
      for (var i = 0; i < n * ta * tb; i++) items.push([a, b]);
    });
    // De mayor a menor por su lado corto (el alto de la fila) y luego por el largo.
    items.sort(function (x, y) { return y[1] - x[1] || y[0] - x[0]; });
    var tableros = [];
    // Orientaciones de una pieza: [a lo largo de la fila, alto]; primero tumbada.
    var orient = function (it) { return [[it[0], it[1]], [it[1], it[0]]].filter(function (o) { return o[0] <= W && o[1] <= H; }); };
    items.forEach(function (it) {
      var os = orient(it), puesto = false;
      for (var t = 0; t < tableros.length && !puesto; t++) {
        var T = tableros[t];
        for (var f = 0; f < T.filas.length && !puesto; f++) {
          var F = T.filas[f];
          for (var j = 0; j < os.length && !puesto; j++) if (os[j][1] <= F.alto && F.usado + os[j][0] <= W) { F.usado += os[j][0] + k; puesto = true; }
        }
        for (var j2 = 0; j2 < os.length && !puesto; j2++) if (T.alto + os[j2][1] <= H) { T.filas.push({ alto: os[j2][1], usado: os[j2][0] + k }); T.alto += os[j2][1] + k; puesto = true; }
      }
      if (!puesto && os.length) tableros.push({ alto: os[0][1] + k, filas: [{ alto: os[0][1], usado: os[0][0] + k }] });
    });
    return { tableros: tableros.length, area: area, partidas: partidas };
  }

// Apunta piezas de tablero (mm) en una lista: pz(ancho, alto, cuántas); las de medida 0 no cuentan.
const apuntar = piezas => (an, al, cant = 1) => { if (an > 0 && al > 0) piezas.push({ an: Math.round(an), al: Math.round(al), cant }); };

// Cascos de los muebles de cocina (tablero de 16): bajos con 2 costados, suelo, 2 travesaños y un estante si son de
// puertas; columnas con costados, techo, suelo y estantes; altos con costados, techo, suelo y estante. El lavavajillas,
// los huecos y la campana piramidal no llevan casco.
export const CASCO = { grueso: 16, fondo_bajo: 560, fondo_alto: 330, travesano: 100 };
export function piezasCascoCocina(d) {
  const piezas = [], C = CASCO, g2 = 2 * C.grueso, pz = apuntar(piezas);
  const bajoAlto = ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, colAlto = ALTURAS.columna - ALTURAS.zocalo, altoAlto = ALTURAS.altos_hasta - ALTURAS.altos_desde;
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(({ m, desde, hasta }) => {
      const w = hasta - desde;
      if (['hueco', 'otro', 'lavavajillas', 'lavadora'].includes(m.tipo) || (m.tipo === 'columna_frigo' && esLibre(m, d))) return;
      if (esColumna(m)) { pz(C.fondo_bajo, colAlto, 2); pz(w - g2, C.fondo_bajo, 2); pz(w - g2 - 2, C.fondo_bajo - 20, m.tipo === 'columna_hmo' ? 1 : 2); return; }
      pz(C.fondo_bajo, bajoAlto, 2); pz(w - g2, C.fondo_bajo); pz(w - g2, C.travesano, 2);
      if (m.tipo === 'bajo' || m.tipo === 'fregadero') pz(w - g2 - 2, C.fondo_bajo - 20);
    });
    sit.altos.forEach(({ m, desde, hasta }) => {
      const w = hasta - desde;
      if (['hueco', 'otro', 'campana_deco'].includes(m.tipo)) return;
      const h = m.tipo === 'alto_frigo' ? 400 : altoAlto;
      pz(C.fondo_alto, h, 2); pz(w - g2, C.fondo_alto, 2);
      if (h > 500 && (m.tipo === 'alto' || m.tipo === 'alto_abierto')) pz(w - g2 - 2, C.fondo_alto - 20);
    });
  });
  return piezas;
}

// ── Remates de la cocina: costados vistos, regletas y cierres a techo ──
// Se calculan de las medidas; en «Acabados → Remates» se elige si van y de qué material: como los frentes (cuentan en
// los tableros y el pedido de frentes), como el casco (con los cascos) u otro material (aparte, con su nombre).
// Medidas en mm: alto × ancho (en los costados, el ancho es el fondo).
export const TIPOS_REMATE = [['costados', 'Costados vistos'], ['regletas', 'Regletas'], ['techo', 'Cierres a techo']];
export const MATERIALES_REMATE = [['frentes', 'Como los frentes'], ['casco', 'Como el casco'], ['otro', 'Otro material']];
export const REGLETA_MAX = 150, CIERRE_MIN = 20, LARGO_TABLERO = 2700;
// Lo elegido para cada tipo (por defecto: costados y regletas sí, como los frentes; cierre a techo no)
export function opcionRemate(d, tipo) {
  const r = (d.remates || {})[tipo] || {};
  return { usar: r.usar ?? (tipo !== 'techo'), material: r.material || 'frentes', otro: r.otro || '' };
}
export function rematesCocina(d, { todos = false } = {}) {
  const l = [], frenteBajo = ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, costadoBajo = ALTURAS.encimera - ALTURAS.grueso_encimera;
  const altoAlto = ALTURAS.altos_hasta - ALTURAS.altos_desde, techo = hay(d.alto_techo) && d.alto_techo > 0 ? d.alto_techo : ALTURAS.techo;
  const poner = (tipo, pieza, alto, ancho, donde, deAltos) => { if (alto > 0 && ancho > 0) l.push({ tipo, pieza, alto: Math.round(alto), ancho: Math.round(ancho), donde, deAltos, cant: 1 }); };
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => {
    const sit = situarMuebles(p, d), L = p.largo;
    // Bajos: lo que sobra al final. Hasta 15 cm, regleta; más, queda abierto y se ve el costado del último mueble.
    if (sit.bajos.length) {
      const fin = sit.bajos[sit.bajos.length - 1], resto = L - fin.hasta;
      if (resto > 2 && resto <= REGLETA_MAX) poner('regletas', 'Regleta de bajos', frenteBajo, resto, p.letra, false);
      else if (resto > REGLETA_MAX) poner('costados', esColumna(fin.m) ? 'Costado de columna' : 'Costado de bajo', esColumna(fin.m) ? ALTURAS.columna : costadoBajo, CASCO.fondo_bajo + 20, p.letra, esColumna(fin.m));
    }
    // Altos (y columnas, que llegan a la misma altura): lo mismo arriba
    const arriba = sit.altos.concat(sit.bajos.filter(b => esColumna(b.m))).sort((a, b) => a.hasta - b.hasta);
    if (sit.altos.length) {
      const fin = arriba[arriba.length - 1], resto = L - fin.hasta;
      if (resto > 2 && resto <= REGLETA_MAX) poner('regletas', 'Regleta de altos', altoAlto, resto, p.letra, true);
      else if (resto > REGLETA_MAX && !esColumna(fin.m)) poner('costados', 'Costado de alto', altoAlto, CASCO.fondo_alto + 20, p.letra, true);
    }
    // Cierre a techo: encima de altos y columnas, del alto que falte hasta el techo (en tiras de como mucho 2,70 m)
    const cierre = techo - ALTURAS.altos_hasta;
    if (arriba.length && cierre >= CIERRE_MIN) {
      let largo = arriba.reduce((sm, a) => sm + (a.hasta - a.desde), 0);
      while (largo > 0) { const t = Math.min(largo, LARGO_TABLERO); poner('techo', 'Cierre a techo', cierre, t, p.letra, true); largo -= t; }
    }
  });
  // Islas y penínsulas: costados (dos la isla, uno la península) y la trasera vista
  (d.islas || []).forEach((x, i) => {
    if (!hay(x.largo) || !hay(x.fondo)) return;
    const nom = x.tipo === 'peninsula' ? 'península' : 'isla' + ((d.islas || []).length > 1 ? ' ' + (i + 1) : '');
    for (let k = 0; k < (x.tipo === 'peninsula' ? 1 : 2); k++) poner('costados', 'Costado de ' + (x.tipo === 'peninsula' ? 'península' : 'isla'), costadoBajo, x.fondo, nom, false);
    poner('costados', 'Trasera de ' + (x.tipo === 'peninsula' ? 'península' : 'isla'), costadoBajo, x.largo, nom, false);
  });
  if (todos) return l;
  return l.filter(r => opcionRemate(d, r.tipo).usar).map(r => Object.assign(r, opcionRemate(d, r.tipo)));
}
// Texto de un remate para el resumen: «2 costados vistos (como los frentes)»
export function textoRemates(d) {
  const l = rematesCocina(d);
  if (!l.length) return [];
  const mat = r => (r.material === 'otro' ? (r.otro || 'otro material') : r.material === 'casco' ? 'como el casco' : 'como los frentes');
  const NOMBRE = { costados: ['costado visto', 'costados vistos'], regletas: ['regleta', 'regletas'], techo: ['cierre a techo', 'cierres a techo'] };
  return ['Remates: ' + TIPOS_REMATE.map(([k]) => { const de = l.filter(r => r.tipo === k); return de.length ? de.length + ' ' + NOMBRE[k][de.length > 1 ? 1 : 0] + ' (' + mat(de[0]) + ')' : null; }).filter(Boolean).join(', ')]
    .concat(l.map(r => '- ' + r.pieza + ' ' + verMedida(r.alto, 'cm') + ' × ' + verMedida(r.ancho, 'cm') + ' cm (' + r.donde + ')'));
}

export function materialCocina(d) {
  const paredes = (d.paredes || []).filter(p => hay(p.largo));
  const porPared = new Map(paredes.map(p => [p, tramosPared(p, d)]));
  const piezas = [], uniones = [], huecos = [];
  paredes.forEach(p => {
    const v = paredesVecinas(d, p), izq = v.izq && porPared.get(v.izq);
    porPared.get(p).forEach(t => {
      let desde = t.desde, nota = '';
      // En la esquina de la izquierda, si la encimera de la pared de al lado llega hasta ella, esta empieza en su canto.
      if (t.desde < 5 && izq && izq.some(x => v.izq.largo - x.hasta < 5)) { desde = ENCIMERA.fondo; nota = 'desde el canto de la de ' + v.izq.letra; uniones.push(v.izq.letra + '-' + p.letra); }
      const largo = t.hasta - desde;
      if (largo <= 0) return;
      piezas.push({ pared: p.letra, largo, fondo: ENCIMERA.fondo, nota, larga: largo > ENCIMERA.largo_max });
      t.muebles.forEach(m => { if (m.tipo === 'placa' || m.tipo === 'fregadero') huecos.push({ que: m.tipo, ancho: m.ancho, pared: p.letra }); });
    });
  });
  (d.islas || []).forEach((x, i) => { if (hay(x.largo) && hay(x.fondo)) piezas.push({ pared: x.tipo === 'peninsula' ? 'península' : 'isla' + ((d.islas || []).length > 1 ? ' ' + (i + 1) : ''), largo: x.largo, fondo: x.fondo + 20, nota: '', larga: x.largo > ENCIMERA.largo_max }); });

  // Lineales: cornisa y LED bajo los altos (cornisa también sobre columnas); el zócalo, por el frente de los muebles.
  let arriba = 0, bajoAltos = 0;
  paredes.forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(b => { if (esColumna(b.m)) arriba += b.hasta - b.desde; });
    sit.altos.forEach(a => { if (a.m.tipo !== 'hueco') { arriba += a.hasta - a.desde; bajoAltos += a.hasta - a.desde; } });
  });
  const zocalo = zocaloFrente(d);

  // Herrajes, de los frentes de cada mueble.
  const h = { puertas: 0, bisagras: 0, cajones: 0, tiradores: 0, patas: 0, lavavajillas: 0 }, frentes = [];
  paredes.forEach(p => {
    const sit = situarMuebles(p, d);
    const contar = (tipo, ancho, z0, z1, opc = {}) => {
      const f = frenteModulo(tipo, ancho, z0, z1, opc);
      f.forEach((q, i) => {
        if (q.k === 'tirador') h.tiradores++;
        if (q.k !== 'hoja') return;
        frentes.push({ an: Math.round(q.x1 - q.x0), al: Math.round(q.z1 - q.z0), cant: 1 });
        if (tipo === 'lavavajillas' || tipo === 'lavadora') { h.lavavajillas++; return; }
        const t = f[i + 1], cajon = t && t.k === 'tirador' && t.x1 - t.x0 > t.z1 - t.z0;
        if (cajon) h.cajones++;
        else { h.puertas++; const alto = q.z1 - q.z0; h.bisagras += alto <= 900 ? 2 : alto <= 1600 ? 3 : 4; }
      });
    };
    sit.bajos.forEach(b => {
      if (b.m.tipo === 'hueco') return;
      const w = b.hasta - b.desde;
      h.patas += 4;
      if (b.m.tipo === 'columna_frigo' && esLibre(b.m, d)) return;   // frigorífico libre: sin mueble ni puertas
      if (esColumna(b.m)) contar(b.m.tipo, w, 0, ALTURAS.columna, { columna: true, variante: varianteDe(b.m, d) });
      else contar(b.m.tipo, w, ALTURAS.zocalo, ALTURAS.encimera - ALTURAS.grueso_encimera, { variante: varianteDe(b.m, d) });
    });
    sit.altos.forEach(a => { if (a.m.tipo !== 'hueco') contar(a.m.tipo, a.hasta - a.desde, ALTURAS.altos_desde, ALTURAS.altos_hasta); });
  });
  // Los remates no cuentan como frentes ni como cascos (el presupuesto los cuenta aparte), pero sí en sus tableros.
  const cascos = piezasCascoCocina(d), remates = rematesCocina(d), rematesFrentes = [], rematesCasco = [], otros = [];
  remates.forEach(r => { const q = { an: r.ancho, al: r.alto, cant: 1, remate: r.tipo }; (r.material === 'casco' ? rematesCasco : r.material === 'otro' ? otros : rematesFrentes).push(q); });
  return { piezas, uniones, huecos, lineales: { zocalo, cornisa: arriba, led: bajoAltos }, herrajes: h, frentes, tablerosFrentes: empaquetar(frentes.concat(rematesFrentes)), cascos, tablerosCascos: empaquetar(cascos.concat(rematesCasco)),
    remates, rematesFrentes, rematesCasco, otros, tablerosOtros: otros.length ? empaquetar(otros) : null };
}

// Vestidor: barras (metros y soportes), estantes, cajones y patas de los cuerpos.
export function materialVestidor(d) {
  const r = { barras: 0, barras_mm: 0, estantes: 0, cajones: 0, zapateros: 0, pantaloneros: 0, patas: 0, puertas: 0, bisagras: 0, correderas: 0, tiradores: 0 };
  // Piezas de tablero (mm) del casco y de las puertas: costados (uno más que cuerpos en cada pared), techo y suelo,
  // estantes y zapateros, zócalo y hojas. Fondo de 60 cm y alto de las columnas.
  const piezas = [], F = 600, A = ALTURAS.columna, pz = apuntar(piezas);
  (d.paredes || []).forEach(p => {
    const sc = situarCuerpos(p, d);
    if (sc.cuerpos.length) pz(F, A, sc.cuerpos.length + 1);
    sc.cuerpos.forEach(({ c, desde, hasta }) => {
      const w = hasta - desde;
      pz(w, F, 2); pz(w, 80);
      r.patas += 4;
      puertasCuerpo(w, ALTURAS.columna, c.puertas).forEach(q => {
        if (q.k === 'hoja') pz(q.x1 - q.x0, q.z1 - q.z0);
        if (q.k === 'tirador') r.tiradores++;
        if (q.pieza === 'puerta') { r.puertas++; r.bisagras += 4; }
        if (q.pieza === 'corredera') r.correderas++;
      });
      piezasInterior(c, ALTURAS.columna).forEach(q => {
        if (q.tipo === 'barra') { r.barras++; r.barras_mm += w - 40; }
        if (q.tipo === 'estante') { r.estantes++; pz(w - 40, F - 20); }
        if (q.tipo === 'cajon') r.cajones++;
        if (q.tipo === 'zapato') { r.zapateros++; pz(w - 40, F - 20); }
        if (q.tipo === 'pantalonero') r.pantaloneros++;
      });
    });
  });
  r.tableros = empaquetar(piezas);
  r.piezas = piezas;
  return r;
}

// Armario empotrado (corredera o abatible): casco y puertas en tableros de 2800×2070, con las medidas del hueco.
// Costados (uno más que cuerpos), techo y suelo de cada cuerpo, estantes y zapateros, rodapié y hojas.
export function materialArmario(d, subtipo) {
  const v = x => (hay(x) && x > 0 ? x : null);
  const A = v(d.ancho_medio) || v(d.ancho_arriba) || v(d.ancho_abajo), H = [v(d.alto_izq), v(d.alto_der)].filter(Boolean).reduce((m, x) => Math.min(m, x), Infinity);
  const F = v(d.fondo) || 600, rod = v(d.rodapie_alto) || 0;
  if (!A || !isFinite(H)) return null;
  const cuerpos = (d.cuerpos || []).length ? d.cuerpos : [{ ancho: A }], sinAncho = cuerpos.filter(c => !v(c.ancho)).length;
  const resto = Math.max(0, A - cuerpos.reduce((s, c) => s + (v(c.ancho) || 0), 0));
  const piezas = [], pz = apuntar(piezas);
  pz(F, H, cuerpos.length + 1);
  cuerpos.forEach(c => {
    const w = v(c.ancho) || (sinAncho ? resto / sinAncho : 0);
    pz(w, F, 2);
    piezasInterior(c, H - rod).forEach(q => { if (q.tipo === 'estante' || q.tipo === 'zapato') pz(w - 40, F - 20); });
  });
  if (rod) pz(A, rod);
  const altoHoja = H - rod - 10;
  if (subtipo === 'corredera') { const n = v(d.hojas) || 2; pz(A / n + 30, altoHoja, n); }
  if (subtipo === 'abatible') { const n = v(d.puertas) || Math.max(1, Math.ceil(A / 500)); pz(A / n, altoHoja, n); }
  return Object.assign(empaquetar(piezas), { piezas });
}

// Piezas de tablero de una ficha por clase: cascos y frentes de cocina; casco y puertas de armarios y vestidores.
export const CLASES_TABLERO = [['cascos', 'Cascos de cocina'], ['frentes', 'Frentes de cocina (si son de fabricación propia)'], ['armarios', 'Armarios y vestidores (casco y puertas)']];
export function piezasTableroFicha(ficha) {
  const d = ficha.datos || {}, r = { cascos: [], frentes: [], armarios: [] };
  if (ficha.tipo === 'cocina') { const m = materialCocina(d); r.cascos = m.cascos.concat(m.rematesCasco); r.frentes = m.frentes.concat(m.rematesFrentes); }
  else if (ficha.subtipo === 'vestidor') r.armarios = materialVestidor(d).piezas;
  else if (ficha.tipo === 'armario') { const a = materialArmario(d, ficha.subtipo); r.armarios = a ? a.piezas : []; }
  return r;
}
// Varias fichas: cada clase con todas sus piezas juntas en los mismos tableros (se aprovechan mejor) y lo que saldría
// contando cada ficha por separado.
export function tablerosFichas(fichas) {
  const porFicha = fichas.map(f => ({ ficha: f, piezas: piezasTableroFicha(f) }));
  return CLASES_TABLERO.map(([k, nombre]) => {
    const todas = [].concat(...porFicha.map(x => x.piezas[k]));
    if (!todas.length) return null;
    const junto = empaquetar(todas);
    const separado = porFicha.filter(x => x.piezas[k].length).map(x => ({ ficha: x.ficha, t: empaquetar(x.piezas[k]) }));
    return { clase: k, nombre, junto, separado, sumaSeparado: separado.reduce((s, x) => s + x.t.tableros, 0) };
  }).filter(Boolean);
}

// Líneas de texto del material (para la ficha, el resumen, el PDF y WhatsApp). lineales: los que tiene la cocina (acabados).
export function textoMaterial(ficha, unidad = 'cm', ajustes = null) {
  const d = ficha.datos, l = [], m = mm => verMedida(Math.round(mm / 10) * 10, 'm') + ' m', v = mm => verMedida(mm, unidad) + ' ' + unidad;
  if (ficha.tipo === 'cocina') {
    const r = materialCocina(d);
    if (r.piezas.length) {
      const total = r.piezas.reduce((s, q) => s + q.largo, 0);
      l.push('Encimera: ' + r.piezas.length + (r.piezas.length > 1 ? ' piezas, ' : ' pieza, ') + m(total) + ' en total');
      r.piezas.forEach(q => l.push('- ' + (/^(isla|pen)/.test(q.pared) ? q.pared[0].toUpperCase() + q.pared.slice(1) : 'Pared ' + q.pared) + ': ' + v(q.largo) + ' × ' + v(q.fondo) + (q.nota ? ' (' + q.nota + ')' : '') + (q.larga ? ' · pasa de ' + m(ENCIMERA.largo_max) + ': puede llevar junta' : '')));
      if (r.uniones.length) l.push('- Uniones en esquina: ' + r.uniones.join(', '));
      r.huecos.forEach(q => l.push('- Hueco de ' + (q.que === 'placa' ? 'placa' : 'fregadero') + ' (mueble de ' + v(q.ancho) + ', pared ' + q.pared + ')'));
    }
    if (r.cascos.length) { const t = r.tablerosCascos;
      l.push('Cascos: ' + r.cascos.reduce((s, q) => s + q.cant, 0) + ' piezas, ' + String(t.m2).replace('.', ',') + ' m² → ' + t.tableros + (t.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207 (aprovecha el ' + t.aprovechamiento + ' %)'); }
    // Frentes de fabricación propia: puertas y cajones colocados en tableros de 2800×2070.
    if (r.frentes.length) { const t = r.tablerosFrentes;
      l.push('Frentes (si son de fabricación propia): ' + r.frentes.length + ' piezas' + (r.rematesFrentes.length ? ' y ' + r.rematesFrentes.length + (r.rematesFrentes.length > 1 ? ' remates' : ' remate') : '') + ', ' + String(t.m2).replace('.', ',') + ' m² → ' + t.tableros + (t.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207 (aprovecha el ' + t.aprovechamiento + ' %)'); }
    if (r.otros.length) { const t = r.tablerosOtros, nom = [...new Set(r.remates.filter(x => x.material === 'otro').map(x => x.otro || 'otro material'))].join(', ');
      l.push('Remates en ' + nom + ': ' + r.otros.length + (r.otros.length === 1 ? ' pieza, ' : ' piezas, ') + String(t.m2).replace('.', ',') + ' m² → ' + t.tableros + (t.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207'); }
    textoRemates(d).forEach(t => l.push(t));
    const lin = (d.acabados && d.acabados.lineales || []).map(x => x.tipo);
    if (r.lineales.zocalo) l.push('Zócalo: ' + m(r.lineales.zocalo));
    if (lin.includes('cornisa') && r.lineales.cornisa) l.push('Cornisa: ' + m(r.lineales.cornisa));
    if (lin.includes('led') && r.lineales.led) l.push('Tira LED (bajo los altos): ' + m(r.lineales.led));
    const h = r.herrajes, t = [];
    if (h.puertas) t.push(h.puertas + (h.puertas > 1 ? ' puertas (' : ' puerta (') + h.bisagras + ' bisagras)');
    if (h.cajones) t.push(h.cajones + (h.cajones > 1 ? ' cajones (guías)' : ' cajón (guías)'));
    if (h.tiradores) t.push(h.tiradores + ' tiradores');
    if (h.lavavajillas) t.push(h.lavavajillas + (h.lavavajillas > 1 ? ' paneles' : ' panel') + ' de lavavajillas o lavadora integrable');
    if (h.patas) t.push(h.patas + ' patas');
    if (t.length) l.push('Herrajes: ' + t.join(', '));
  }
  if (ficha.tipo === 'armario' && ficha.subtipo !== 'vestidor') {
    const tb = materialArmario(d, ficha.subtipo);
    if (tb && tb.tableros) l.push('Tableros de casco y puertas (orientativo): ' + tb.tableros + (tb.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207 (' + String(tb.m2).replace('.', ',') + ' m² de piezas, aprovecha el ' + tb.aprovechamiento + ' %)');
  }
  if (ficha.subtipo === 'vestidor') {
    const r = materialVestidor(d), t = [];
    if (r.barras) t.push(r.barras + (r.barras > 1 ? ' barras (' : ' barra (') + m(r.barras_mm) + ', ' + r.barras * 2 + ' soportes)');
    if (r.estantes) t.push(r.estantes + ' estantes');
    if (r.cajones) t.push(r.cajones + ' cajones (guías)');
    if (r.zapateros) t.push(r.zapateros + ' zapateros');
    if (r.pantaloneros) t.push(r.pantaloneros + (r.pantaloneros > 1 ? ' pantaloneros' : ' pantalonero'));
    if (r.puertas) t.push(r.puertas + (r.puertas > 1 ? ' puertas (' : ' puerta (') + r.bisagras + ' bisagras)');
    if (r.correderas) t.push(r.correderas + ' hojas correderas (con su kit)');
    if (r.tiradores) t.push(r.tiradores + ' tiradores');
    if (r.patas) t.push(r.patas + ' patas');
    if (t.length) l.push('Herrajes: ' + t.join(', '));
    const tb = r.tableros;
    if (tb && tb.tableros) l.push('Tableros de casco y puertas (orientativo): ' + tb.tableros + (tb.tableros === 1 ? ' tablero' : ' tableros') + ' de 280×207 (' + String(tb.m2).replace('.', ',') + ' m² de piezas, aprovecha el ' + tb.aprovechamiento + ' %)');
  }
  return l;
}

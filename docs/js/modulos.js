// Módulos de cocina (bajos y altos, de izquierda a derecha), cuerpos de armario y lineales de los acabados.
import { verMedida } from './unidades.js';

const id = () => crypto.randomUUID();
const hay = v => v !== null && v !== undefined;

export const TIPOS_MODULO = {
  bajos: ['bajo', 'fregadero', 'placa', 'cajonero', 'lavavajillas', 'lavadora', 'rinconero', 'columna_hmo', 'columna_frigo', 'escobero', 'despensero', 'hueco', 'otro'],
  altos: ['alto', 'alto_abierto', 'alto_campana', 'campana_deco', 'alto_micro', 'alto_frigo', 'hueco', 'otro'],
};
// Para elegir: en grupos (bajos, columnas y lo demás; los altos aparte)
export const GRUPOS_MODULO = {
  bajos: [['Bajos', ['bajo', 'fregadero', 'placa', 'cajonero', 'lavavajillas', 'lavadora', 'rinconero']], ['Columnas', ['columna_hmo', 'columna_frigo', 'escobero', 'despensero']], ['Otros', ['hueco', 'otro']]],
  altos: [['Altos', ['alto', 'alto_abierto', 'alto_campana', 'campana_deco', 'alto_micro', 'alto_frigo']], ['Otros', ['hueco', 'otro']]],
};
export const NOMBRE_MODULO = {
  bajo: 'Bajo', fregadero: 'Fregadero', placa: 'Placa', cajonero: 'Cajonero', lavavajillas: 'Lavavajillas', lavadora: 'Lavadora', rinconero: 'Rinconero',
  columna_hmo: 'Columna H/MO', columna_frigo: 'Columna frigo', escobero: 'Escobero', despensero: 'Despensero', hueco: 'Hueco',
  alto: 'Alto', alto_abierto: 'Alto abierto', alto_campana: 'Alto campana', campana_deco: 'Campana decorativa', alto_micro: 'Alto micro', alto_frigo: 'Alto sobre frigo', otro: 'Otro',
};
const COLUMNAS = ['columna_hmo', 'columna_frigo', 'escobero', 'despensero'];
export const esColumna = m => COLUMNAS.includes(m.tipo);
// Lavavajillas, lavadora y frigorífico: integrable (con la puerta del mueble) o de libre instalación (sin puerta).
// Lo que diga el mueble; si no se ha contestado, lo de Electrodomésticos; si tampoco, null (se cuenta como integrable).
const CLAVE_INSTALACION = { lavavajillas: 'lavavajillas', lavadora: 'lavadora', columna_frigo: 'frigo' };
export const tieneInstalacion = m => !!(m && CLAVE_INSTALACION[m.tipo]);
export function instalacionDe(m, d) {
  const k = m && CLAVE_INSTALACION[m.tipo];
  if (!k) return null;
  if (m.instalacion) return m.instalacion;
  const e = ((d && d.electro) || []).find(x => x.clave === k);
  return e && e.tipo ? e.tipo : null;
}
export const esLibre = (m, d) => ['libre', 'americano'].includes(instalacionDe(m, d));
// Nombre corto para los botones (en el resumen y la planta sigue el completo).
export const CORTO_MODULO = { alto_abierto: 'Abierto', campana_deco: 'Campana deco.', columna_hmo: 'Col. H/MO', columna_frigo: 'Col. frigo', escobero: 'Escobero', despensero: 'Despensero', lavavajillas: 'Lavavaj.', alto_campana: 'Alto campana', alto_micro: 'Alto micro', alto_frigo: 'Alto s/frigo' };

// Anchos habituales en España (mm) por tipo de mueble; los demás usan la lista general de Ajustes. Siempre se puede escribir otro.
const ANCHOS_TIPO = {
  fregadero: [500, 600, 800, 900, 1000, 1200], placa: [600, 800, 900, 1000, 1200], cajonero: [400, 450, 500, 600, 800, 900, 1000, 1200],
  lavavajillas: [450, 600], lavadora: [600], columna_hmo: [600], columna_frigo: [600, 700, 920], escobero: [300, 400, 450, 500, 600], despensero: [300, 400, 450, 500, 600],
  alto_campana: [600, 900], campana_deco: [600, 900, 1200], alto_micro: [500, 600], alto_frigo: [600, 700, 920],
};
// Rinconero: en L o chaflán, de 93 a 103 por lado; recto, de 90, 100 o 120 de largo y 60 de fondo.
export const FORMAS_RINCONERO = [['L', 'En L'], ['chaflan', 'Chaflán'], ['recto', 'Recto']];
export const LADOS_RINCONERO = [930, 950, 980, 1000, 1030];
const LARGOS_RINCONERO_RECTO = [900, 1000, 1200];
export const FONDO_BAJO = 600;
export function anchosDe(m, general) {
  if (m.tipo === 'rinconero') return m.forma === 'recto' ? LARGOS_RINCONERO_RECTO : LADOS_RINCONERO;
  return ANCHOS_TIPO[m.tipo] || general;
}

export const moduloNuevo = tipo => (tipo === 'rinconero' ? { id: id(), tipo, ancho: null, nombre: '', forma: 'L', lado2: null, gira: 'der' } : { id: id(), tipo, ancho: null, nombre: '' });
export const lineaNueva = tipo => ({ id: id(), tipo, modelo: '', nombre: '' });

export function nombreModulo(m) {
  if (m.tipo === 'otro') return m.nombre || 'Otro';
  if (m.tipo === 'rinconero') return m.forma === 'recto' ? 'Rinconero recto' : m.forma === 'chaflan' ? 'Rinconero chaflán' : 'Rinconero en L';
  if (m.tipo === 'placa' && m.extractor) return m.horno ? 'Placa extractora con horno' : 'Placa extractora';
  if (m.tipo === 'placa' && m.horno) return 'Placa con horno';
  return NOMBRE_MODULO[m.tipo] || m.tipo;
}
// Las medidas de un módulo para listas y textos: «60», «100×95» en rinconeros en L o chaflán.
export function medidasModulo(m) {
  if (!hay(m.ancho)) return '';
  const a = verMedida(m.ancho, 'cm');
  return m.tipo === 'rinconero' && m.forma !== 'recto' && hay(m.lado2) ? a + '×' + verMedida(m.lado2, 'cm') : a;
}
export const textoModulo = m => nombreModulo(m) + (hay(m.ancho) ? ' ' + medidasModulo(m) : '');

// Lo que un rinconero ocupa en la pared donde sigue: el otro lado (en L o chaflán) o el fondo (recto).
const ocupaVecina = m => (m.forma === 'recto' ? FONDO_BAJO : hay(m.lado2) ? m.lado2 : null);
// Rinconeros de las paredes de al lado que entran en esta: cuánto ocupan en su punta izquierda y en la derecha.
export function rinconerosQueEntran(datos, p) {
  const r = { izq: 0, der: 0 }, lista = (datos && datos.paredes) || [], i = lista.indexOf(p);
  if (i < 0) return r;
  const cerrada = !!(datos.plano && datos.plano.cerrada);
  const ant = i > 0 ? lista[i - 1] : cerrada && lista.length > 1 ? lista[lista.length - 1] : null;
  const sig = i < lista.length - 1 ? lista[i + 1] : cerrada && lista.length > 1 ? lista[0] : null;
  (ant && ant.bajos || []).forEach(m => { if (m.tipo === 'rinconero' && m.gira !== 'izq') r.izq += ocupaVecina(m) || 0; });
  (sig && sig.bajos || []).forEach(m => { if (m.tipo === 'rinconero' && m.gira === 'izq') r.der += ocupaVecina(m) || 0; });
  return r;
}
// Las paredes donde puede seguir un rinconero de esta pared: la anterior (izquierda) y la siguiente (derecha).
export function paredesVecinas(datos, p) {
  const lista = (datos && datos.paredes) || [], i = lista.indexOf(p), cerrada = !!(datos && datos.plano && datos.plano.cerrada);
  return { izq: i > 0 ? lista[i - 1] : cerrada && lista.length > 1 ? lista[lista.length - 1] : null,
    der: i >= 0 && i < lista.length - 1 ? lista[i + 1] : cerrada && lista.length > 1 ? lista[0] : null };
}
const buscar = (lista, clave) => { const x = (lista || []).find(p => p[0] === clave); return x ? x[1] : null; };
export const nombreLineal = (l, ajustes) => (l.tipo === 'otro' ? l.nombre || 'Otro' : l.nombre || buscar(ajustes.lineales, l.tipo) || l.tipo);
export const nombreInterior = (clave, ajustes) => buscar(ajustes && ajustes.interiores, clave) || String(clave).replace(/_/g, ' ');

// ── Interiores de un cuerpo de armario: uno o dos (barra y cajonera, pantalonero y estantes…).
// La doble barra va sola: ocupa arriba y en medio.
export const INTERIOR_SOLO = ['doble_barra'];
export const interioresDe = c => (c ? [c.interior, c.interior2].filter(Boolean) : []);
export function elegirInterior(c, v) {
  let l = interioresDe(c);
  if (l.includes(v)) l = l.filter(x => x !== v);
  else if (INTERIOR_SOLO.includes(v)) l = [v];
  else { l = l.filter(x => !INTERIOR_SOLO.includes(x)); l = l.length >= 2 ? [l[0], v] : l.concat([v]); }
  c.interior = l[0] || null; c.interior2 = l[1] || null;
  return c;
}
export const textoInteriores = (c, ajustes) => interioresDe(c).map(k => (k === 'otro' ? c.nombre || 'otro' : nombreInterior(k, ajustes).toLowerCase())).join(' + ');
// Lo que se dibuja dentro de un cuerpo de alto H (mm desde el suelo). Con dos interiores, lo de abajo (cajonera, zapatero)
// va hasta 1 m y lo otro encima; si ninguno es «de abajo», el primero arriba.
const DE_ABAJO = /cajon|zapat/;
export const anchoPantalonero = k => (/pantal/.test(k || '') ? (/doble/.test(k) ? 800 : 400) : null);
const clase = k => (/doble_barra/.test(k) ? 'doble_barra' : /pantal/.test(k) ? 'pantalonero' : /barra/.test(k) ? 'barra' : /estante|balda/.test(k) ? 'estantes'
  : /cajon/.test(k) ? 'cajonera' : /zapat/.test(k) ? 'zapatero' : null);
export function piezasInterior(c, H) {
  const l = interioresDe(c);
  if (!l.length || !(H > 0)) return [];
  let zonas;
  if (l.length === 1) zonas = [[l[0], 0, H]];
  else {
    // Abajo va el pantalonero siempre; si no lo hay, la cajonera o el zapatero.
    const peso = k => (/pantal/.test(k) ? 2 : DE_ABAJO.test(k) ? 1 : 0);
    const abajo = peso(l[1]) >= peso(l[0]) ? 1 : 0, corte = Math.min(1000, H / 2);
    zonas = [[l[1 - abajo], corte, H], [l[abajo], 0, corte]];
  }
  const r = [];
  zonas.forEach(([k, z0, z1]) => {
    const t = clase(k);
    if (t === 'barra') r.push({ tipo: 'barra', z: z1 - 120 });
    if (t === 'doble_barra') r.push({ tipo: 'barra', z: z1 - 120 }, { tipo: 'barra', z: Math.round(z0 + (z1 - z0) / 2 - 80) });
    if (t === 'estantes') for (let z = z0 + 350; z < z1 - 100; z += 350) r.push({ tipo: 'estante', z });
    if (t === 'cajonera') {
      const top = Math.min(z1, z0 + 900), hh = (top - z0) / 3;
      for (let i = 0; i < 3; i++) r.push({ tipo: 'cajon', z0: Math.round(z0 + i * hh + 15), z1: Math.round(z0 + (i + 1) * hh - 15) });
      if (top < z1 - 100) r.push({ tipo: 'estante', z: top });
    }
    if (t === 'zapatero') for (let z = z0 + 150; z < Math.min(z1, z0 + 1100) - 100; z += 250) r.push({ tipo: 'zapato', z });
    // Pantalonero: siempre abajo de su zona, de 40 cm de ancho (el doble, 80); si queda sitio encima, un estante.
    if (t === 'pantalonero') {
      const alto = Math.min(900, z1 - z0 - 150);
      if (alto > 0) r.push({ tipo: 'pantalonero', z0: z0 + 100, z1: z0 + 100 + alto, ancho: anchoPantalonero(k) });
      if (alto > 0 && z1 - (z0 + 100 + alto) > 450) r.push({ tipo: 'estante', z: z0 + 130 + alto });
    }
  });
  return r;
}

const suma = lista => (lista || []).reduce((s, m) => s + (hay(m.ancho) ? m.ancho : 0), 0);
const resto = (largo, s) => (hay(largo) ? largo - s : null);

// Lo que ocupan los bajos en una pared (con lo que entran los rinconeros de las de al lado) y lo que queda (negativo: se pasa).
// Si la fila toca un pilar (de la pared o de la de al lado, en esa esquina), lo dice: hay que cajear, y el cuadre es hasta la pared siguiente.
export function cuadreBajos(p, datos) {
  const sit = situarMuebles(p, datos), fijos = sit.remates.filter(r => r.fila !== 'altos' && r.fila !== 'sobre' && !(r.desde >= (sit.bajos.length ? sit.bajos[sit.bajos.length - 1].hasta : 0) - 1)).reduce((a, r) => a + r.ancho, 0);
  const e = rinconerosQueEntran(datos, p), s = suma(p.bajos) + e.izq + e.der + fijos, c = { suma: s, resto: resto(p.largo, s) }, rg = medidasRemates(datos).regleta;
  if (fijos) c.remates = fijos;
  if (rg) c.regleta = rg;
  const L = p.largo, ocupa = [];
  if (e.izq + suma(p.bajos) > 0) ocupa.push([0, e.izq + suma(p.bajos)]);
  if (e.der && hay(L)) ocupa.push([L - e.der, L]);
  // Si un mueble choca con un pilar se cajea, siempre con 1 cm de holgura en ancho y en fondo
  const pilar = tramosPilar(datos, p).find(([a, b]) => ocupa.some(([x, y]) => x < b - 1 && a < y - 1));
  if (pilar) { const v = paredesVecinas(datos, p).der; Object.assign(c, { choca: true, hasta: v ? v.letra : null, cajeado: { ancho: pilar[1] - pilar[0] + HOLGURA_PILAR, fondo: hay(pilar[2]) ? pilar[2] + HOLGURA_PILAR : null } }); }
  return c;
}
// Lo que ocupan los pilares a lo largo de una pared (mm desde la izquierda): los suyos y lo que sobresalen los de las
// paredes de al lado pegados a esta esquina.
const PEGADO = 50;
function tramosPilar(datos, p) {
  const L = p.largo, r = [], pilares = q => (q.elementos || []).filter(x => x.tipo === 'pilar' && hay(x.distancia) && hay(x.ancho));
  pilares(p).forEach(x => {
    const a = x.ref === 'der' ? (hay(L) ? L - x.distancia - x.ancho : null) : x.distancia;
    if (a !== null) r.push([a, a + x.ancho, hay(x.fondo) ? x.fondo : null]);
  });
  const enPunta = (q, lado) => pilares(q).find(x => hay(x.fondo) && ((x.ref === 'der') === (lado === 'der') ? x.distancia <= PEGADO : hay(q.largo) && q.largo - x.distancia - x.ancho <= PEGADO));
  const v = paredesVecinas(datos, p);
  const pi = v.izq && v.izq !== p && enPunta(v.izq, 'der'), pd = v.der && v.der !== p && enPunta(v.der, 'izq');
  if (pi) r.push([0, pi.fondo, hay(pi.ancho) ? pi.ancho : null]);
  if (pd && hay(L)) r.push([L - pd.fondo, L, hay(pd.ancho) ? pd.ancho : null]);
  return r;
}
// Arriba ocupan los altos y también las columnas de abajo, que llegan hasta arriba. El alto sobre frigo va encima de su columna: no suma.
export function cuadreAltos(p, datos) {
  const sit = situarMuebles(p, datos || {}), fin = sit.altos.length ? sit.altos[sit.altos.length - 1].hasta : 0;
  // Arriba también ocupan las regletas y costados de las columnas (llegan hasta arriba)
  const fin2 = Math.max(fin, ...sit.bajos.filter(b => esColumna(b.m)).map(b => b.hasta));
  const fijos = sit.remates.filter(r => (r.fila === 'altos' || r.fila === 'columna' || r.fila === 'sobre') && r.desde < fin2 - 1).reduce((a, r) => a + r.ancho, 0);
  const zonas = (sit.zonas || []).filter(z => z.der || sit.altos.some(a => a.desde >= z.hasta - 1)).reduce((a, z) => a + (z.hasta - z.desde), 0);
  const s = sit.altos.filter(a => a.m.tipo !== 'alto_frigo').reduce((a, b) => a + (b.hasta - b.desde), 0) + suma((p.bajos || []).filter(esColumna)) + fijos + zonas;
  const c = { suma: s, resto: resto(p.largo, s) }, rg = medidasRemates(datos || {}).regleta;
  if (fijos) c.remates = fijos;
  if (rg) c.regleta = rg;
  return c;
}

// ── Remates en la medida ──
// Regleta contra la pared (mínimo 4 cm: que abran bien las bisagras de 110° con el tirador) y costado de 2 cm en cada
// extremo libre (sin mueble al lado ni pared) y en las columnas que quedan junto a un bajo (por encima de la encimera se
// ve su lado). Ocupan su sitio: los muebles se colocan contándolos. Se quitan o cambian en «Acabados → Remates».
export const REGLETA_PARED = 40, GRUESO_COSTADO = 20, REGLETA_HASTA = 150, HOLGURA_PILAR = 10;
// porDefecto: las pruebas anteriores a 1.34 (pensadas sin remates en la medida) lo apagan; en la app siempre está.
export const REMATES = { porDefecto: true };
export function medidasRemates(datos) {
  const r = (datos && datos.remates) || {}, usa = k => (r[k] && typeof r[k].usar === 'boolean' ? r[k].usar : REMATES.porDefecto);
  return { regleta: usa('regletas') ? (r.regleta_mm > 0 ? r.regleta_mm : REGLETA_PARED) : 0, costado: usa('costados') ? (r.costado_mm > 0 ? r.costado_mm : GRUESO_COSTADO) : 0,
    // Costado de la columna junto a un bajo: hasta el suelo (ocupa su sitio también abajo) o solo sobre la encimera (los bajos van pegados a la columna)
    columnaSobre: r.costado_columna === 'encimera' };
}

// Sitio de la campana decorativa en los altos: sobre cada mueble de placa sin extractor, centrado, del ancho de la
// campana (la del mueble, la de Electrodomésticos o 60) y 10 cm más a cada lado. No si la campana es extraíble o
// integrada, ni si en los altos ya hay una «Campana decorativa» o un «Alto campana» (manda lo puesto a mano).
export const MARGEN_CAMPANA = 100;
function zonasCampana(bajos, altos, datos) {
  const c = ((datos && datos.electro) || []).find(e => e.clave === 'campana');
  if (!altos.length || (c && c.tipo && c.tipo !== 'decorativa') || altos.some(m => m.tipo === 'campana_deco' || m.tipo === 'alto_campana')) return [];
  return bajos.filter(b => b.m.tipo === 'placa' && !b.m.extractor).map(b => {
    const w = hay(b.m.campana_ancho) ? b.m.campana_ancho : c && hay(c.ancho) ? c.ancho : 600, x = (b.desde + b.hasta) / 2;
    return { desde: x - w / 2 - MARGEN_CAMPANA, hasta: x + w / 2 + MARGEN_CAMPANA, placa: b.m };
  });
}
// Arriba, lo que deja ver el lado del alto de al lado: campana decorativa o hueco. FONDO_ALTO_VISTO: el fondo del alto con su puerta.
const abiertoArriba = m => m.tipo === 'hueco' || m.tipo === 'campana_deco';
export const FONDO_ALTO_VISTO = 350;
// Dónde va cada mueble a lo largo de la pared (mm desde la izquierda). Los bajos, seguidos desde lo que ocupe un rinconero
// de la pared anterior (o desde la regleta de la pared); los altos, seguidos pero saltando las columnas, salvo el alto
// sobre frigo, que va encima de la suya. remates: las regletas y costados con su sitio ({ tipo, fila, desde, hasta }).
export function situarMuebles(p, datos) {
  const e = rinconerosQueEntran(datos, p), bajos = [], altos = [], columnas = [], remates = [], R = medidasRemates(datos);
  const L = hay(p.largo) ? p.largo : null, lista = (p.bajos || []).filter(m => hay(m.ancho)), filaDe = m => (esColumna(m) ? 'columna' : 'bajos');
  const poner = (tipo, fila, desde, ancho) => { if (ancho > 0) remates.push({ tipo, fila, desde, hasta: desde + ancho, ancho }); };
  let s = e.izq;
  // Regleta a la pared de la izquierda (no si entra un rinconero de la pared de al lado ni si empieza con el rinconero)
  if (lista.length && !e.izq && R.regleta && lista[0].tipo !== 'rinconero') { poner('regleta', filaDe(lista[0]), s, R.regleta); s += R.regleta; }
  const inicio = s;
  lista.forEach((m, i) => {
    // Costado entre una columna y un bajo: del lado de la columna que se ve sobre la encimera
    const ant = lista[i - 1];
    // (el costado llega hasta arriba: los altos de al lado empiezan después de él)
    let antes = 0;
    if (ant && R.costado && esColumna(m) !== esColumna(ant) && ant.tipo !== 'hueco' && m.tipo !== 'hueco') {
      if (R.columnaSobre) poner('costado', 'sobre', esColumna(ant) ? s : s - R.costado, R.costado);
      else { poner('costado', 'columna', s, R.costado); s += R.costado; }
      if (esColumna(ant) && columnas.length) columnas[columnas.length - 1].ocupaHasta += R.costado; else antes = R.costado;
    }
    bajos.push({ m, desde: s, hasta: s + m.ancho });
    if (esColumna(m)) columnas.push({ m, desde: s, hasta: s + m.ancho, usada: false, ocupaDesde: s - antes, ocupaHasta: s + m.ancho });
    s += m.ancho;
  });
  // Al final: si llega a la pared (sobran hasta 15 cm), regleta con lo que quede; si no, costado del último mueble
  const ultimo = lista[lista.length - 1];
  if (ultimo && L !== null && ultimo.tipo !== 'rinconero' && ultimo.tipo !== 'hueco') {
    const queda = L - e.der - s;
    if (queda > 0 && queda <= REGLETA_HASTA && R.regleta) poner('regleta', filaDe(ultimo), s, queda);
    else if (queda > REGLETA_HASTA && R.costado) poner('costado', filaDe(ultimo), s, R.costado);
  }
  // Altos: también con su regleta a la pared si no empieza una columna en ese lado
  s = 0;
  const conAltos = (p.altos || []).some(m => hay(m.ancho));
  // Entre un alto y una campana decorativa o un hueco se ve el lado del alto: costado. Si el hueco es el de un pilar tan
  // hondo como el alto (o más), el pilar lo tapa y hace de pared: regleta.
  const listaA = (p.altos || []).filter(m => hay(m.ancho)), pilares = tramosPilar(datos || {}, p);
  const tapaPilar = (a, b) => pilares.some(([x, y, f]) => x < b - 1 && a < y - 1 && hay(f) && f >= FONDO_ALTO_VISTO);
  if (conAltos && R.regleta && !columnas.some(c => c.desde <= inicio) && listaA.length && !abiertoArriba(listaA[0])) { poner('regleta', 'altos', 0, R.regleta); s = R.regleta; }
  // Campana decorativa sobre el mueble de placa: su sitio en los altos se reserva solo, centrado con la placa, con 10 cm
  // a cada lado (y el costado de los altos de al lado). Un hueco puesto a mano en ese sitio sobra: se quita. Si en los
  // altos hay un «Campana decorativa» o un «Alto campana», manda lo puesto a mano.
  const zonas = zonasCampana(bajos, listaA, datos);
  const enZona = (a, b) => zonas.some(z => a < z.hasta && b > z.desde);
  const obstaculos = columnas.concat(zonas.map(z => ({ ocupaDesde: z.desde - R.costado, ocupaHasta: z.hasta + R.costado, zona: z })));
  let previo = null;
  for (const m of p.altos || []) {
    if (!hay(m.ancho)) break;
    if (m.tipo === 'hueco' && enZona(s, s + m.ancho)) continue;
    if (previo && R.costado && previo.hasta === s && abiertoArriba(previo.m) !== abiertoArriba(m) && m.tipo !== 'alto_frigo') {
      const hueco = abiertoArriba(m) ? [s, s + m.ancho, m] : [previo.desde, previo.hasta, previo.m];
      // Pilar tan hondo como el alto: hace de pared, regleta para que abra la puerta; si no, costado
      const pared = hueco[2].tipo === 'hueco' && tapaPilar(hueco[0], hueco[1]), w = pared ? R.regleta : R.costado;
      if (w) { poner(pared ? 'regleta' : 'costado', 'altos', s, w); s += w; }
    }
    if (m.tipo === 'alto_frigo') {
      const c = columnas.find(c => c.m.tipo === 'columna_frigo' && !c.usada && c.hasta > s);
      if (c) { c.usada = true; altos.push(previo = { m, desde: c.desde, hasta: c.desde + m.ancho }); s = Math.max(s, c.desde + m.ancho); continue; }
    }
    let choca;
    const s0 = s;
    while ((choca = obstaculos.find(c => s < c.ocupaHasta && s + m.ancho > c.ocupaDesde))) {
      if (choca.zona && R.costado && previo && !abiertoArriba(previo.m) && previo.hasta <= choca.zona.desde) choca.zona.izq = previo;
      s = choca.ocupaHasta;
      if (choca.zona) choca.zona.der = true;
    }
    // Si saltando la columna se sale de la pared, no cabe: se queda donde iba (el cuadre dice cuánto te pasas)
    if (L !== null && s !== s0 && s + m.ancho > L + 1) s = s0;
    altos.push(previo = { m, desde: s, hasta: s + m.ancho });
    s += m.ancho;
  }
  // Costados a los lados de la campana: el del alto de la izquierda (pegado a él) y el de la derecha (antes del alto)
  zonas.forEach(z => {
    const izq = z.izq || [...altos].reverse().find(a => a.hasta <= z.desde + 1 && a.hasta > z.desde - 600);
    // (si es el último alto, ya lleva el costado de final de fila)
    if (izq && R.costado && !abiertoArriba(izq.m) && izq !== altos[altos.length - 1]) poner('costado', 'altos', izq.hasta, R.costado);
    if (z.der && R.costado && altos.some(a => a.desde >= z.hasta - 1)) poner('costado', 'altos', z.hasta, R.costado);
  });
  const finAlto = altos.length ? altos[altos.length - 1].hasta : 0, columnaDetras = columnas.some(c => c.ocupaHasta >= finAlto - 1);
  if (altos.length && L !== null && !columnaDetras && !abiertoArriba(altos[altos.length - 1].m)) {
    const queda = L - finAlto;
    if (queda > 0 && queda <= REGLETA_HASTA && R.regleta) poner('regleta', 'altos', finAlto, queda);
    else if (queda > REGLETA_HASTA && R.costado) poner('costado', 'altos', finAlto, R.costado);
  }
  return { bajos, altos, entran: e, remates, zonas };
}
// Cuerpos de armario contra el hueco más estrecho de los medidos.
export function cuadreCuerpos(d) {
  const anchos = [d.ancho_arriba, d.ancho_medio, d.ancho_abajo].filter(hay), s = suma(d.cuerpos);
  return { suma: s, resto: anchos.length ? Math.min(...anchos) - s : null };
}

// ── Cuerpos de rincón del vestidor ──
// En L o en chaflán: ocupan su ancho en esta pared y «lado2» en la de al lado (la de «gira»). Recto (rincón ciego):
// llega a la esquina y en la otra pared ocupa su fondo (60). Como el rinconero de la cocina.
export const FORMAS_RINCON_CUERPO = [['L', 'En L'], ['recto', 'Recto (ciego)'], ['chaflan', 'Chaflán']];
export const LADOS_RINCON_CUERPO = [900, 1000, 1100, 1200];
export const FONDO_CUERPO = 600;
// En L y en chaflán el interior es de estantes o barra.
export const INTERIOR_RINCON = ['barra', 'estantes', 'otro'];
const ocupaCuerpo = c => (c.rincon === 'recto' ? FONDO_CUERPO : hay(c.lado2) ? c.lado2 : null);
export function cuerposQueEntran(datos, p) {
  const r = { izq: 0, der: 0, cIzq: null, cDer: null }, v = paredesVecinas(datos, p);
  (v.izq && v.izq !== p ? v.izq.cuerpos || [] : []).forEach(c => { if (c.rincon && c.gira !== 'izq' && ocupaCuerpo(c)) { r.izq += ocupaCuerpo(c); r.cIzq = c; } });
  (v.der && v.der !== p ? v.der.cuerpos || [] : []).forEach(c => { if (c.rincon && c.gira === 'izq' && ocupaCuerpo(c)) { r.der += ocupaCuerpo(c); r.cDer = c; } });
  return r;
}
// Dónde va cada cuerpo a lo largo de la pared (mm desde la izquierda), seguidos desde lo que entre del rincón de la anterior.
export function situarCuerpos(p, datos) {
  const e = cuerposQueEntran(datos, p), lista = [];
  let s = e.izq;
  for (const c of p.cuerpos || []) {
    if (!hay(c.ancho) || c.ancho <= 0) break;
    lista.push({ c, desde: s, hasta: s + c.ancho });
    s += c.ancho;
  }
  return { cuerpos: lista, entran: e };
}
export function textoRincon(c) {
  if (!c || !c.rincon) return '';
  const m = hay(c.ancho) ? verMedida(c.ancho, 'cm') + (c.rincon !== 'recto' && hay(c.lado2) ? '×' + verMedida(c.lado2, 'cm') : '') : '';
  return 'rincón ' + (c.rincon === 'recto' ? 'recto' : c.rincon === 'chaflan' ? 'en chaflán' : 'en L') + (m ? ' ' + m : '');
}

// Cuerpos de una pared (vestidor) contra su largo, con lo que entre de los rincones de las paredes de al lado.
export function cuadreCuerposPared(p, datos = null) {
  const e = datos ? cuerposQueEntran(datos, p) : { izq: 0, der: 0 }, s = suma(p.cuerpos) + e.izq + e.der;
  return { suma: s, resto: resto(p.largo, s) };
}

// Texto del cuadre para enseñar debajo de cada fila: «quedan 23 cm» o «te pasas 5 cm».
export function textoCuadre(c, unidad) {
  if (!hay(c.resto) || !c.suma) return '';
  const n = v => verMedida(Math.abs(v), unidad) + ' ' + unidad;
  if (c.choca) {
    const con = c.hasta ? ' la pared ' + c.hasta : '';
    const t = c.resto === 0 ? 'cuadra justo' + (con ? ' con' + con : '') : c.resto > 0 ? 'te falta ' + n(c.resto) + (con ? ' para' + con : '') : 'te pasas ' + n(c.resto) + (con ? ' de' + con : '');
    const cj = c.cajeado ? ': cajear ' + n(c.cajeado.ancho) + (hay(c.cajeado.fondo) ? ' × ' + n(c.cajeado.fondo) + ' de fondo' : '') + ' (con 1 cm de holgura)' : ' (cajear)';
    return 'Choca con el pilar' + cj + ' · ' + t;
  }
  const inc = c.remates ? ' (con ' + n(c.remates) + ' de regleta y costados)' : '';
  if (c.resto === 0) return 'Cuadra justo' + inc + (c.regleta ? ' · ⚠ falta la regleta a la pared (' + n(c.regleta) + ')' : '');
  if (c.resto < 0) return 'Te pasas ' + n(c.resto) + inc;
  if (c.regleta && c.resto <= REGLETA_HASTA) return 'Quedan ' + n(c.resto) + ': regleta a la pared' + (c.resto < c.regleta ? ' · ⚠ corta: mejor ' + n(c.regleta) + ' para que abran bien las puertas' : '') + inc;
  return 'Quedan ' + n(c.resto) + inc;
}

// Avisos: pasarse del largo de la pared o del hueco. Quedarse corto no es aviso (se enseña como «quedan»).
export function avisosModulos(ficha, unidad) {
  const l = [], d = ficha.datos, pasa = (campo, que, c) => {
    if (hay(c.resto) && c.resto < 0) l.push({ campo, texto: que + ': ' + (c.choca ? textoCuadre(c, unidad).replace('Choca', 'choca') : 'te pasas ' + verMedida(-c.resto, unidad) + ' ' + unidad) });
  };
  (d.paredes || []).forEach(p => {
    pasa('pared.' + p.id, 'Bajos de la pared ' + p.letra, cuadreBajos(p, d));
    pasa('pared.' + p.id, 'Altos de la pared ' + p.letra, cuadreAltos(p, d));
    pasa('pared.' + p.id, 'Cuerpos de la pared ' + p.letra, cuadreCuerposPared(p, d));
    (p.cuerpos || []).forEach((c, i) => avisoPantalonero(l, 'pared.' + p.id, 'Cuerpo ' + (i + 1) + ' de la pared ' + p.letra, c, unidad));
  });
  if (ficha.tipo === 'armario') {
    pasa('cuerpos', 'Los cuerpos', cuadreCuerpos(d));
    (d.cuerpos || []).forEach((c, i) => avisoPantalonero(l, 'cuerpos', 'Cuerpo ' + (i + 1), c, unidad));
  }
  return l;
}
// El pantalonero mide 40 cm (el doble, 80): si el cuerpo es más estrecho, no cabe.
function avisoPantalonero(l, campo, que, c, unidad) {
  const k = interioresDe(c).find(x => anchoPantalonero(x)), a = k && anchoPantalonero(k);
  if (a && hay(c.ancho) && c.ancho < a) l.push({ campo, texto: que + ': el ' + (/doble/.test(k) ? 'pantalonero doble' : 'pantalonero') + ' mide ' + verMedida(a, unidad) + ' ' + unidad + ' y el cuerpo ' + verMedida(c.ancho, unidad) + ' ' + unidad });
}

export const acabadosNuevos = () => ({ bitono: null, modelo: '', color: '', modelo_altos: '', color_altos: '', modelo_bajos: '', color_bajos: '', casco: '', encimera: { material: '', modelo: '', color: '', grueso: null }, lineales: [] });
// Materiales de encimera (fijos).
// Los laminados son los de la tarifa de presupuestos (se pasan como tableros); piedra y madera, a precio del marmolista.
export const MATERIALES_ENCIMERA = ['Hidrófuga Egger', 'Egger Perfsense', 'Egger Porsinc', 'Hidrófuga 19 mm', 'Topform', 'Silestone', 'Porcelánico', 'Granito', 'Madera'];

// Electrodomésticos de la cocina: qué son, de qué tipo, su ancho (cm) y el modelo si se sabe.
export const ELECTRO = [
  ['frigo', 'Frigorífico', [['integrable', 'Integrable'], ['libre', 'Libre'], ['americano', 'Americano']]],
  ['horno', 'Horno', [['columna', 'En columna'], ['bajo', 'Bajo encimera']]],
  ['microondas', 'Microondas', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['placa', 'Placa', [['induccion', 'Inducción'], ['vitro', 'Vitro'], ['gas', 'Gas']]],
  ['campana', 'Campana', [['decorativa', 'Decorativa'], ['extraible', 'Extraíble'], ['integrada', 'Integrada'], ['techo', 'De techo'], ['isla', 'De isla']]],
  ['lavavajillas', 'Lavavajillas', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['lavadora', 'Lavadora', [['integrable', 'Integrable'], ['libre', 'Libre']]],
  ['otro', 'Otro', []],
];
// Medidas habituales (mm, estándar europeo): anchos y altos del aparato o de su hueco.
export const ANCHOS_ELECTRO = { frigo: [600, 700, 920], horno: [600], microondas: [600, 500], placa: [300, 600, 700, 800, 900], campana: [600, 900, 1200], lavavajillas: [450, 600], lavadora: [600] };
export const ALTOS_ELECTRO = { frigo: [1220, 1400, 1580, 1780, 1940, 1850, 2010], horno: [600, 450], microondas: [380, 450], lavavajillas: [820, 865] };
export const datosElectro = clave => ELECTRO.find(e => e[0] === clave) || ['otro', 'Otro', []];
export const electroNuevo = clave => ({ id: id(), clave, tipo: null, ancho: null, alto: null, modelo: '', nombre: '' });
export const nombreElectro = e => (e.clave === 'otro' ? e.nombre || 'Otro' : datosElectro(e.clave)[1]);
export function textoElectro(e) {
  const tipo = (datosElectro(e.clave)[2].find(t => t[0] === e.tipo) || [])[1];
  const medida = hay(e.ancho) && hay(e.alto) ? verMedida(e.ancho, 'cm') + ' × ' + verMedida(e.alto, 'cm') + ' cm (ancho × alto)' : hay(e.ancho) ? verMedida(e.ancho, 'cm') + ' cm' : hay(e.alto) ? 'alto ' + verMedida(e.alto, 'cm') + ' cm' : null;
  const color = e.color && (COLORES_ELECTRO.find(c => c[0] === e.color) || [])[1];
  const partes = [tipo && tipo.toLowerCase(), color && color.toLowerCase(), medida, e.modelo && e.modelo.trim()].filter(Boolean);
  return nombreElectro(e) + (partes.length ? ': ' + partes.join(' · ') : '');
}

// ── Electrodomésticos que se rellenan solos según los muebles ──
// Color de cada electrodoméstico (también los de libre instalación)
export const COLORES_ELECTRO = [['inox', 'Inox'], ['negro', 'Negro'], ['blanco', 'Blanco']];
// Lo que piden los muebles puestos: placa (con su tamaño), campana (si la placa no lleva extractor), horno y micro de la
// columna, horno bajo la placa, micro del alto de micro, frigorífico (integrable, libre o americano), lavavajillas y lavadora.
export function electrosDeMuebles(d) {
  const pide = new Map(), poner = (clave, datos) => { if (!pide.has(clave)) pide.set(clave, datos); };
  const todos = (d.paredes || []).flatMap(p => (p.bajos || []).concat(p.altos || []));
  todos.forEach(m => {
    if (m.tipo === 'placa') {
      poner('placa', { tipo: m.placa_tipo || null, ancho: m.placa_ancho || null });
      if (!m.extractor) poner('campana', { tipo: todos.some(x => x.tipo === 'alto_campana') ? 'extraible' : 'decorativa', ancho: m.campana_ancho || null });
      if (m.horno) poner('horno', { tipo: 'bajo' });
    }
    if (m.tipo === 'campana_deco') poner('campana', { tipo: 'decorativa', ancho: m.campana_ancho || null });
    if ((m.tipo === 'campana_deco' || m.tipo === 'alto_campana') && !todos.some(x => x.tipo === 'placa')) poner('placa', { tipo: m.placa_tipo || null, ancho: m.placa_ancho || null });
    if (m.tipo === 'alto_campana') poner('campana', { tipo: 'extraible' });
    if (m.tipo === 'columna_hmo') { poner('horno', { tipo: 'columna' }); poner('microondas', { tipo: 'integrable' }); }
    if (m.tipo === 'alto_micro') poner('microondas', { tipo: 'integrable' });
    if (m.tipo === 'columna_frigo') poner('frigo', { tipo: m.instalacion || null, ancho: m.instalacion === 'americano' ? 920 : null });
    if (m.tipo === 'lavavajillas') poner('lavavajillas', { tipo: m.instalacion || null, ancho: m.ancho || null });
    if (m.tipo === 'lavadora') poner('lavadora', { tipo: m.instalacion || null });
  });
  return pide;
}
// Pone los que faltan (marcados «auto»), pone al día los «auto» que no se han tocado a mano y quita los «auto» que ya no
// pide ningún mueble (si no tienen modelo apuntado). Lo que se escribe a mano manda. Devuelve true si ha cambiado algo.
export function sincronizarElectros(d) {
  if (!d.electro) d.electro = [];
  const pide = electrosDeMuebles(d);
  let cambio = false;
  pide.forEach((datos, clave) => {
    const e = d.electro.find(x => x.clave === clave);
    if (!e) { d.electro.push(Object.assign(electroNuevo(clave), datos, { auto: true, color: colorElectroComun(d) })); cambio = true; return; }
    if (!e.auto) return;
    // Los puestos solos copian al mueble, también cuando el mueble deja de decirlo (vuelve a vacío)
    Object.entries(datos).forEach(([k, v]) => { if (e[k] !== v) { e[k] = v; cambio = true; } });
  });
  const antes = d.electro.length;
  d.electro = d.electro.filter(e => !e.auto || pide.has(e.clave) || (e.modelo && e.modelo.trim()));
  return cambio || d.electro.length !== antes;
}
// Si ya hay alguno con color, los nuevos salen del mismo (lo normal es que vayan a juego)
export const colorElectroComun = d => ((d.electro || []).find(e => e.color) || {}).color || null;

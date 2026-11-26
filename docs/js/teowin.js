// Exportar una cocina a TeoWin: una escena .3d (texto) con las paredes, ventanas, puertas y muebles en su sitio.
// Cada mueble es la plantilla del catálogo de TeoWin (19024, Muebles Carrascosa) con su ancho, alto y fondo: TeoWin lo
// recalcula al abrir la escena. Las plantillas no van en la app (son del catálogo): se leen de la carpeta de TeoWin del
// ordenador (E_107), así que solo se puede exportar desde el ordenador donde está TeoWin.
// Coordenadas: las de la planta en mm; x igual, la y de la planta es la z de TeoWin y la altura, su y.
// Un mueble con giro a: su ancho va por (cos a, −sen a) y su fondo por (sen a, cos a), que es el «dentro» de la Libreta.
import { geometriaPlanta } from './plano-vista.js';
import { ALTURAS, desdeAlto, altoColumna, hastaAltos, topeColumnas, frigoLibre, techoFrigo } from './alzado.js';
import { PUENTE, placaConHorno } from './modulos.js';
import { CABECERA } from './teowin-cabecera.js';
const hay = v => v !== null && v !== undefined;

export const CAT_MUEBLES = '19024', CAT_HUECOS = '522';
// Qué plantilla lleva cada mueble de la Libreta: [familia, código]. Si no hay, no se pone y se avisa.
const ancho = m => m.ancho || 600;
export const PLANTILLA_MUEBLE = {
  bajo: m => (ancho(m) <= 600 ? ['B80S', 'B1'] : ['B80S', 'B2']),
  fregadero: m => (ancho(m) <= 600 ? ['B80F', 'SF'] : ['B80F', 'SF2']),
  placa: m => (placaConHorno(m) ? ['B80SP', 'BHCA'] : ['B80SP', 'SPCCCA']),
  cajonero: () => ['80BCF', 'BCCCA'],
  rinconero: () => ['B80R', 'RB'],
  columna_hmo: () => ['220HM', 'CHM'],
  columna_frigo: () => ['225S', 'CD2P'],
  columna_electro: () => ['225S', 'CL2P'],
  columna_desayuno: () => ['225S', 'CL2P'],
  escobero: () => ['225S', 'CL1PE'],
  despensero: () => ['225S', 'CL2P'],
  semicolumna: () => ['225S', 'CL2P'],
  alto: m => (ancho(m) <= 600 ? ['A90S', 'A1'] : ['A90S', 'A2']),
  alto_abierto: m => (ancho(m) <= 600 ? ['A90S', 'A1'] : ['A90S', 'A2']),
  alto_campana: m => (ancho(m) <= 600 ? ['A90S', 'A1'] : ['A90S', 'A2']),
  alto_micro: () => ['A90S', 'A1'],
  alto_frigo: m => (ancho(m) <= 600 ? ['A90S', 'A1'] : ['A90S', 'A2']),
};
export const PLANTILLA_REMATE = { regleta: ['CRE', 'R'], costado: ['CRENV', 'PLCI'] };
export const PLANTILLA_HUECO = { ventana: w => (w < 700 ? ['PRACT', '1HOJAD-RE'] : ['PRACT', '2HPRACTICA-RE']), puerta: () => ['PMADE', 'PMADERAT5I'] };
// Sin plantilla (electrodomésticos y lo que no es mueble): se avisa para ponerlo a mano en TeoWin
const SIN_MUEBLE = { lavavajillas: 'lavavajillas', lavadora: 'lavadora', campana_deco: 'campana decorativa', hueco: null, otro: null };

const r3 = v => Math.round(v * 1000) / 1000;
const GRADOS = a => { const g = r3(a); return g === 0 ? 0 : g; };
// Ángulo de TeoWin de una dirección (ux, uz) del plano
const anguloDe = (ux, uz) => { let a = Math.atan2(-uz, ux) * 180 / Math.PI; if (a < 0) a += 360; return GRADOS(a) % 360; };

// Lo que hace falta leer de la carpeta de TeoWin: [{ cat, fam, cod }] sin repetir
export function plantillasNecesarias(d) {
  const r = new Map(), poner = (cat, [fam, cod]) => r.set(cat + '/' + fam + '/' + cod, { cat, fam, cod });
  const plan = planTeowin(d);
  plan.muebles.forEach(m => poner(m.plantilla[2] || CAT_MUEBLES, m.plantilla));
  plan.huecos.forEach(h => poner(CAT_HUECOS, h.plantilla));
  return [...r.values()];
}

// Dónde va cada cosa (sin leer plantillas): paredes, huecos y muebles con su posición, giro y medidas; y avisos.
export function planTeowin(d) {
  const geo = geometriaPlanta(d, { unidad: 'cm' });
  const avisos = [];
  if (!geo.paredes.length) return { paredes: [], huecos: [], muebles: [], avisos: ['La cocina no tiene planta: dibuja las paredes primero.'], vacia: true };
  // mm por unidad de la planta (la planta va a escala: largo de la pared / largo dibujado)
  const ks = geo.paredes.filter(p => hay(p.largo) && p.largo > 0).map(p => p.largo / (Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) || 1)).sort((a, b) => a - b);
  const k = ks.length ? ks[Math.floor(ks.length / 2)] : null;
  if (!k) return { paredes: [], huecos: [], muebles: [], avisos: ['Faltan los largos de las paredes.'], vacia: true };
  const P = p => ({ x: p.x * k, z: p.y * k });
  const techo = hay(d.alto_techo) && d.alto_techo > 0 ? d.alto_techo : ALTURAS.techo;
  // Origen en la primera esquina (TeoWin centra mejor la vista cerca del 0)
  const o = P(geo.paredes[0].a), Q = p => { const q = P(p); return { x: r3(q.x - o.x), z: r3(q.z - o.z) }; };
  const paredes = geo.paredes.map(p => {
    const a = Q(p.a), b = Q(p.b), L = Math.hypot(b.x - a.x, b.z - a.z) || 1, u = { x: (b.x - a.x) / L, z: (b.z - a.z) / L };
    return { letra: p.letra, a, b, L: r3(L), u, ang: anguloDe(u.x, u.z), alto: techo };
  });
  const paredDe = l => paredes.find(p => p.letra === l), datoPared = l => (d.paredes || []).find(p => p.letra === l);
  // Ventanas y puertas, dentro de su pared (posición a lo largo y altura)
  const huecos = [];
  geo.elementos.filter(e => (e.tipo === 'ventana' || e.tipo === 'puerta') && e.a && e.b).forEach(e => {
    const pa = paredDe(e.pared); if (!pa) return;
    const a = Q(e.a), b = Q(e.b), s0 = Math.min((a.x - pa.a.x) * pa.u.x + (a.z - pa.a.z) * pa.u.z, (b.x - pa.a.x) * pa.u.x + (b.z - pa.a.z) * pa.u.z);
    const w = Math.hypot(b.x - a.x, b.z - a.z), dt = e.dato || {};
    const y = e.tipo === 'ventana' ? (hay(dt.altura) ? dt.altura : 1000) : (dt.altura || 0);
    const h = e.tipo === 'ventana' ? Math.min(techo - y, hay(dt.alto) ? dt.alto : Math.min(1000, techo - y)) : Math.min(techo - y, hay(dt.alto) ? dt.alto : 2030);
    // Lo que se sale de la pared se recorta: TeoWin no dibuja la pared si el hueco es más grande que ella
    const i0 = Math.max(0, s0), i1 = Math.min(pa.L, s0 + w);
    if (i1 - i0 < w - 1) avisos.push(`La ${e.tipo} de la pared ${e.pared} se sale de la pared (a ${Math.round(s0 / 10)} cm, de ${Math.round(w / 10)} cm, en una pared de ${Math.round(pa.L / 10)}): va recortada; revisa sus medidas en la ficha.`);
    if (i1 - i0 < 100) return;
    huecos.push({ tipo: e.tipo, pared: e.pared, s: r3(i0), y: r3(y), L: r3(i1 - i0), H: r3(h), plantilla: PLANTILLA_HUECO[e.tipo](i1 - i0) });
  });
  const muebles = [], falta = {};
  const encimera = ALTURAS.encimera, Hz = ALTURAS.zocalo;
  // Un mueble por un rectángulo de la planta: r[0]→r[1] el ancho (a lo largo de la pared) y r[0]→r[3] el fondo.
  const poner = (r, y, H, plantilla, nombre, extra = {}) => {
    const a = Q(r[0]), b = Q(r[1]), c = Q(r[3]), L = Math.hypot(b.x - a.x, b.z - a.z), F = Math.hypot(c.x - a.x, c.z - a.z);
    if (L < 5 || H < 5) return;
    muebles.push(Object.assign({ x: a.x, y: r3(y), z: a.z, ang: anguloDe((b.x - a.x) / L, (b.z - a.z) / L), L: r3(L), H: r3(H), P: r3(F), plantilla, nombre }, extra));
  };
  geo.modulos.filter(m => m.rect && !m.sinTexto && m.tipo !== 'cuerpo').forEach(m => {
    const dato = m.dato || m;
    if (m.tipo in SIN_MUEBLE) { if (SIN_MUEBLE[m.tipo]) falta[SIN_MUEBLE[m.tipo]] = (falta[SIN_MUEBLE[m.tipo]] || 0) + 1; return; }
    const f = PLANTILLA_MUEBLE[m.tipo];
    if (!f) { falta[m.nombre || m.tipo] = (falta[m.nombre || m.tipo] || 0) + 1; return; }
    if (m.chaflan) { falta['rinconero en chaflán'] = (falta['rinconero en chaflán'] || 0) + 1; return; }
    const pd = datoPared(m.pared);
    if (m.tipo === 'rinconero' && !m.alto) {
      // Recto (RB): tal cual, la puerta a la izquierda y el ciego (L2) a la derecha; con la esquina a la izquierda se le da la vuelta (darLaVuelta).
      // En L (RBA de Cincocina, de 90 o 100): la esquina en su origen, L por una pared y P por la otra; con la esquina al final, va en la pared de al lado.
      const izq = (dato.gira || 'der') === 'izq';
      if (dato.forma === 'recto') return poner(m.rect, 0, ALTURAS.mueble_bajo, ['B80R', 'RB'], m.nombre, { inv: izq });
      const a = Q(m.rect[0]), b = Q(m.rect[1]), c = Q(m.rect[3]), L = Math.hypot(b.x - a.x, b.z - a.z) || 1, u = { x: (b.x - a.x) / L, z: (b.z - a.z) / L };
      const F = Math.hypot(c.x - a.x, c.z - a.z) || 1, dn = { x: (c.x - a.x) / F, z: (c.z - a.z) / F }, otro = hay(dato.lado2) ? dato.lado2 : L;
      if (izq) muebles.push({ x: a.x, y: 0, z: a.z, ang: anguloDe(u.x, u.z), L: r3(L), H: ALTURAS.mueble_bajo, P: r3(otro), plantilla: ['B80R', 'RBA'], nombre: m.nombre });
      else muebles.push({ x: b.x, y: 0, z: b.z, ang: anguloDe(dn.x, dn.z), L: r3(otro), H: ALTURAS.mueble_bajo, P: r3(L), plantilla: ['B80R', 'RBA'], nombre: m.nombre });
      return;
    }
    if (m.tipo === 'columna_frigo' && frigoLibre(d, m.dato)) { falta['frigorífico libre'] = (falta['frigorífico libre'] || 0) + 1; return; }
    if (m.altillo) { const top = Math.min(topeColumnas(pd, d), techo); return poner(m.rect, PUENTE.desde, top - PUENTE.desde, f(dato), m.nombre); }
    if (m.alto) { const y0 = desdeAlto(dato, d), y1 = Math.min(hastaAltos(pd), techo); return poner(m.rect, y0, y1 - y0, f(dato), m.nombre); }
    if (m.columna) {
      const conAlto = m.tipo === 'columna_frigo' && geo.modulos.some(a => a.alto && a.tipo === 'alto_frigo' && a.pared === m.pared);
      const top = conAlto ? Math.min(techoFrigo(d), techo) : altoColumna(dato, Math.min(topeColumnas(pd, d), techo));
      return poner(m.rect, 0, top - Hz, f(dato), m.nombre);   // la columna lleva su zócalo (Hz) debajo
    }
    poner(m.rect, 0, ALTURAS.mueble_bajo, f(dato), m.nombre);   // el bajo lleva su zócalo y su encimera
  });
  // Regletas y costados, cada uno a su altura
  (geo.remates || []).forEach(r => {
    const pd = datoPared(r.pared), cp = Math.min(topeColumnas(pd, d), techo), tope = r.tope ? Math.min(r.tope, cp) : cp, arriba = Math.min(hastaAltos(pd), techo);
    const [z0, z1] = r.fila === 'altillos' ? [PUENTE.desde, cp] : r.fila === 'altos' ? [ALTURAS.altos_desde, Math.min(r.tope || arriba, arriba)] : r.fila === 'columna' ? [Hz, tope] : r.fila === 'sobre' ? [encimera, tope] : [Hz, encimera - ALTURAS.grueso_encimera];
    if (z1 <= z0) return;
    const pl = PLANTILLA_REMATE[r.tipo]; if (!pl) return;
    if (r.tipo === 'costado') {
      // El costado de TeoWin se dibuja hacia la izquierda de su punto: va en la punta derecha, con su grueso
      const ra = Q(r.rect[0]), rb = Q(r.rect[1]), rc = Q(r.rect[3]), L = Math.hypot(rb.x - ra.x, rb.z - ra.z) || 1;
      muebles.push({ x: rb.x, y: r3(z0), z: rb.z, ang: anguloDe((rb.x - ra.x) / L, (rb.z - ra.z) / L), L: r3(L), H: r3(z1 - z0), P: r3(Math.hypot(rc.x - ra.x, rc.z - ra.z)), plantilla: pl, nombre: 'Costado' });
      return;
    }
    // La regleta de TeoWin va desde la pared, con el fondo del mueble, y se dibuja en sus últimos 2 cm (por delante)
    const f = r.fila === 'altos' ? 350 : 600, a = Q(r.rect[0]), b = Q(r.rect[1]), c = Q(r.rect[3]), L = Math.hypot(b.x - a.x, b.z - a.z), t = Math.hypot(c.x - a.x, c.z - a.z) || 1;
    if (L < 1) return;
    const v = { x: (c.x - a.x) / t, z: (c.z - a.z) / t }, atras = f - t;
    muebles.push({ x: r3(a.x - v.x * atras), y: r3(z0), z: r3(a.z - v.z * atras), ang: anguloDe((b.x - a.x) / L, (b.z - a.z) / L), L: r3(L), H: r3(z1 - z0), P: f, plantilla: pl, nombre: 'Regleta' });
  });
  // Islas y penínsulas: bajos de 90 como mucho, con los frentes hacia la cocina (como en la perspectiva)
  (geo.islas || []).forEach(x => {
    const q = x.rect, r = x.tipo === 'peninsula' ? [q[3], q[0], q[1], q[2]] : [q[2], q[3], q[0], q[1]];
    const A = r[0], B = r[1], D = r[3], w = Math.hypot(B.x - A.x, B.y - A.y) * k, n = Math.max(1, Math.ceil(w / 900));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, en = (t, s) => ({ x: A.x + (B.x - A.x) * t + (D.x - A.x) * s, y: A.y + (B.y - A.y) * t + (D.y - A.y) * s });
      const ri = [en(t0, 0), en(t1, 0), en(t1, 1), en(t0, 1)];
      poner(ri, 0, ALTURAS.mueble_bajo, (w / n) <= 600 ? ['B80S', 'B1'] : ['B80S', 'B2'], x.nombre);
    }
    if (x.vuelo) avisos.push('El vuelo de la ' + (x.tipo === 'peninsula' ? 'península' : 'isla') + ' para sentarse no va: alarga la encimera en TeoWin.');
  });
  Object.entries(falta).forEach(([n, c]) => avisos.push((c > 1 ? c + ' × ' : '') + n + ': ponlo a mano en TeoWin (no es un mueble del catálogo).'));
  if (geo.sinSituar.length) avisos.push(geo.sinSituar.length + ' elemento' + (geo.sinSituar.length > 1 ? 's' : '') + ' sin situar en la planta no van.');
  return { paredes, huecos, muebles, avisos, techo, Hz, grueso: ALTURAS.grueso_encimera };
}

// El rinconero recto dado la vuelta, como lo guarda TeoWin al pulsar «simétrico» (no basta la marca file_inv: reescribe
// la puerta, el ciego y los recortes de la encimera al otro lado). Sacado de comparar tus rinconeros normales y dados la vuelta.
export function darLaVuelta(texto) {
  const Lt = Number((String(texto).match(/^\tuse L\s*=(\S+)/m) || [])[1]) || 900;
  const x = e => (e === '0' ? 'L' : e === 'L' ? '0' : e === 'L-L2' ? 'L2' : e);
  return String(texto).split('\n').map(l => {
    if (/^\tsimetric /.test(l) && !/file_inv/.test(l)) return l.replace(/\s*$/, ' file_inv ');
    l = l.replace('obj"abat.d"', 'obj"abat.i"')
      .replace('virtual(DTOPAI,DTOPAINF+HOLZOCINF,P-REBFR)(L-L2,', 'virtual(L2,DTOPAINF+HOLZOCINF,P-REBFR)(L-L2,')
      .replace(/\bautopL\b/, 'autopR')
      .replace('virtual(L-L2,0,P-10)(L2,H,GF)', 'virtual(0,0,P)(L2,H,GF)')
      .replace('virtual(L-L2+GF+10,0,P+GF)(P2,H,GF)', 'virtual(L2-GF,0,P+GF)(P2,H,GF)')
      .replace('virtual(L-L2+GF+20,0,P+20)(40,H,GF)', 'virtual(L2+GF-20,0,P+20)(40,H,GF)');
    // Contornos (hueco de la planta y encimera): la x al otro lado
    return l.replace(/camino\((R|F)\)\(0,0\)\(([-\d.]+),([-\d.]+),([-\d.]+)\)(\s*)fcamino\(([^,]+),/, (m, t, a, b, c, sp, e) => `camino(${t})(0,0)(${Math.round((Lt - Number(a)) * 1000) / 1000},${b},${c})${sp}fcamino(${x(e)},`);
  }).join('\n');
}

// --- Escritura del .3d ---
const LOCALES = ['L2', 'P2', 'Ang', 'R', 'Ang2', 'H2', 'L3', 'H3', 'P3', 'R2', 'R3'];
const locales = (L, H, P) => [`use L  =${L}`, `use H  =${H}`, `use P  =${P}`, `local L=${L}`, `local H=${H}`, `local P=${P}`, ...LOCALES.map(v => `local ${v}=0`)];
const sangrar = (lineas, n) => lineas.map(l => (l ? '\t'.repeat(n) + l : l));

// La plantilla de un mueble (texto de su .3d) puesta en la escena: con su sitio, su giro y sus medidas.
// inv: el mueble dado la vuelta (como «file_inv» de TeoWin). Devuelve { lineas, clave } (clave: la del objeto, para los huecos).
export function muebleDePlantilla(texto, { x, y, z, ang, L, H, P, inv = false }, ids, { escena = true } = {}) {
  let p = String(texto).replace(/\r/g, '').split('\n');
  const i = p.findIndex(l => /^obj"/.test(l));
  if (i < 0) return null;
  p = p.slice(i);
  while (p.length && !p[p.length - 1].trim()) p.pop();
  p = p.map(l => l.replace(/idClaveUnica\(\d+\)/, () => 'idClaveUnica(' + ids.clave++ + ')'));
  const medida = (v, n) => { if (v == null) return; const re = new RegExp('^\\tuse ' + n + '\\s*='); p = p.map(l => (re.test(l) ? '\tuse ' + n + '  =' + v : l)); };
  medida(L, 'L'); medida(H, 'H'); medida(P, 'P');
  if (inv) {
    const k = p.findIndex(l => /^\t[a-zA-Z]/.test(l) && /\bsimetric\b/.test(l));
    if (k >= 0 && !/\bfile_inv\b/.test(p[k])) p[k] = p[k].replace(/\s*$/, ' file_inv ');
  }
  let j = p.findIndex(l => /^\tidClaveUnica/.test(l)), clave;
  if (j < 0) {
    j = p.findIndex(l => /^\tidJ\(/.test(l)); if (j < 0) j = 2;
    clave = ids.clave++; p.splice(j, 0, `\tidClaveUnica(${clave})`);
  } else clave = Number(p[j].match(/\d+/)[0]);
  p.splice(j, 0, `\tpos(${x},${y},${z})`, ...(ang ? [`\tang(0,${ang},0)`] : []), ...(escena ? [`\tidEscena(${ids.escena++})`] : []));
  return { lineas: p, clave };
}

// La cara de dentro de la pared con el agujero de cada ventana y puerta (el XML que guarda TeoWin en «CAD»): cada hueco
// va enlazado a su objeto (IDOBJ); la pintura lleva las ventanas como agujeros y las puertas como muescas desde el suelo.
const punto = (x, y) => `<POINT><X>${r3(x)}</X><Y>${r3(y)}</Y></POINT>`;
const region = (pts, agujeros = []) => `<REGIO><NVERTEXS>${pts.length}</NVERTEXS>${pts.map(([x, y]) => punto(x, y)).join('')}<NFORATS>${agujeros.length}</NFORATS>${agujeros.join('')}</REGIO>`;
const regionEx = (pts, agujeros) => `<REGIO_EX><NBLOBS>1</NBLOBS>${region(pts, agujeros)}</REGIO_EX>`;
export function cadPared(L, alto, huecos, ids) {
  const sec = () => ids.seccion++;
  // La puerta: el hueco, dentro del marco (7,5 cm por los lados y arriba), como las que pone TeoWin
  const rect = h => (h.tipo === 'puerta' ? { x0: h.s + 75, x1: h.s + h.L - 75, y0: 0, y1: Math.min(alto, h.y + h.H - 75) } : { x0: h.s, x1: h.s + h.L, y0: h.y, y1: Math.min(alto, h.y + h.H) });
  const subs = huecos.map(h => {
    const q = rect(h), et = h.tipo === 'puerta' ? 'PORTA' : 'FINESTRA';
    return `<${et}><PORTA_FINESTRA><PORTA_FINESTRA_MATERIAL></PORTA_FINESTRA_MATERIAL><PORTA_FINESTRA_MARGE>50</PORTA_FINESTRA_MARGE><PORTA_FINESTRA_APERTURA>0</PORTA_FINESTRA_APERTURA><PORTA_FINESTRA_MA>${h.tipo === 'puerta' ? 1 : 0}</PORTA_FINESTRA_MA><PORTA_FINESTRA_IDOBJ>${h.clave}</PORTA_FINESTRA_IDOBJ><FORAT><SECCIO><ID>${sec()}</ID><INFOTEMPLATE>0</INFOTEMPLATE><NSUBSECCIONS>0</NSUBSECCIONS>${regionEx([[q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1], [q.x0, q.y0], [q.x1, q.y0]], [])}</SECCIO></FORAT></PORTA_FINESTRA></${et}>`;
  });
  // Contorno: abajo a la derecha, sube, cruza por arriba, baja y vuelve por el suelo con las muescas de las puertas
  const pts = [[L, 0], [L, alto], [0, alto], [0, 0]];
  huecos.filter(h => h.tipo === 'puerta').map(rect).sort((a, b) => a.x0 - b.x0).forEach(q => pts.push([q.x0, 0], [q.x0, q.y1], [q.x1, q.y1], [q.x1, 0]));
  pts.push([L, 0]);
  const agujeros = huecos.filter(h => h.tipo !== 'puerta').map(rect).map(q => region([[q.x1, q.y1], [q.x0, q.y1], [q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1]]));
  const xml = `<cad><PINTURA><RED>0.925</RED><GREEN>0.918</GREEN><BLUE>0.91</BLUE><ALPHA>1</ALPHA><SECCIO><ID>${sec()}</ID><INFOTEMPLATE>2</INFOTEMPLATE><NSUBSECCIONS>${subs.length}</NSUBSECCIONS>${subs.join('')}${regionEx(pts, agujeros)}</SECCIO></PINTURA></cad>`;
  return `CAD"1/1""${xml.length}""${xml}"`;
}

function pared(pa, huecosTxt, cad, ids, n, G = 100) {
  const { a, L, u, ang, alto } = pa, nx = u.z, nz = -u.x;   // hacia fuera
  const ex = r3(a.x - u.x * G + nx * G), ez = r3(a.z - u.z * G + nz * G), A = ang ? [`ang(0,${ang},0)`] : [];
  const cab = (nombre, objeti, marca, x, z, extra = []) => [`obj"${nombre}"`, '{', ...extra, '\tud 1.00', `\tobjeti"${objeti}"`, `\t${marca}`, '\tFactorOrig(1.000000)', `\tpos(${x},0,${z})`, ...A.map(l => '\t' + l), `\tidClaveUnica(${ids.clave++})`];
  return [`obj"#${n}"`, '{', '\tIDCatalogo"1"', '\tud 1.00', '\tobjeti"PA"', '\twall notirasombras ', '\tFactorOrig(1.000000)', `\tidEscena(${ids.escena++})`, `\tidClaveUnica(${ids.clave++})`, '\tidJ(2) idJT"1.2" maxIdJ(0) ', ...sangrar(locales(900, 900, 350), 1), '',
    ...sangrar([...cab('interior', 'PAI', 'wallint walluini wallend notirasombras ', a.x, a.z, ['\tIDCatalogo"465"']), '\tidJ(3) idJT"1.3" maxIdJ(1) ', '',
      `\teti"PAI" mat"" color(0.875,0.875,0.875) transp(1) \t\t\tfaceset(0,0,0)(${L},${alto},0)(0,0,0) bald(0,0,0)(500,500,0)(0,90,1)\t\t\t${cad}`, '\t\tidJ(1) idJT"1.3.1" maxIdJ(20)  ', '',
      ...sangrar(huecosTxt, 1), '}', '',
      ...cab('exterior', 'PAE', 'wallext walluini wallend notirasombras ', ex, ez), '\tidJ(4) idJT"1.4" maxIdJ(1) ', '',
      `\teti"PAE" mat"ladrillo" color(1,1,1) transp(1) \t\t\tface(0,0,0)(${r3(L + 2 * G)},${alto},0) `, '\t\tidJ(1) idJT"1.4.1" maxIdJ(0)  ', '', '}', '',
      ...cab('superior', 'PAS', 'notirasombras ', a.x, a.z), '\tidJ(5) idJT"1.5" maxIdJ(1) ', '',
      `\teti"PAS"  auxdim(${r3(L + 2 * G)},0,${G}) mat"" color(0.88,0.88,0.88) transp(1) \tpoly(0,${alto},0)(${L},${alto},0)(${r3(L + G)},${alto},-${G})(-${G},${alto},-${G})`, '\t\tidJ(1) idJT"1.5.1" maxIdJ(0)  ', '', '}'], 1), '}', ''];
}

// Cámara: desde fuera, por el lado abierto de la planta (o por debajo), mirando al centro a 1,46 m
function vistaDe(plan) {
  const xs = plan.paredes.flatMap(p => [p.a.x, p.b.x]), zs = plan.paredes.flatMap(p => [p.a.z, p.b.z]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // Hacia dónde mirar: hacia la pared con más muebles (su «dentro» al revés); si no, hacia −z
  const cuenta = {}; plan.muebles.forEach(m => { const k = m.ang; cuenta[k] = (cuenta[k] || 0) + 1; });
  const ang = Number(Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0] || 0) * Math.PI / 180;
  const dentro = { x: Math.sin(ang), z: Math.cos(ang) }, lejos = 1.6 * Math.max(x1 - x0, z1 - z0, 2500);
  const ojo = { x: cx + dentro.x * lejos, z: cz + dentro.z * lejos }, f = v => v.toFixed(2);
  const giro = ((Math.atan2(dentro.x, dentro.z) * 180 / Math.PI) + 360) % 360;
  return `vista  (${f(ojo.x)},1700.00,${f(ojo.z)})(${f(cx)},1460.00,${f(cz)})(0.00,1.00,0.00)(30.00)(5,129,17,2,1792,991)(${f(giro)},0.000000)1`;
}

// La escena entera. leer(cat, fam, cod) → texto de la plantilla (o null si no está). Devuelve { texto, avisos, plan }.
export function escenaTeowin(d, leer, { fecha = new Date() } = {}) {
  const plan = planTeowin(d), avisos = plan.avisos.slice();
  if (plan.vacia) return { texto: null, avisos, plan };
  const ids = { clave: 100000, escena: 100, seccion: 5000 };
  const sello = fecha.getFullYear() + [fecha.getMonth() + 1, fecha.getDate(), fecha.getHours(), fecha.getMinutes(), fecha.getSeconds()].map(v => String(v).padStart(2, '0')).join('');
  let cab = CABECERA.replace('@@VISTA@@', vistaDe(plan));
  // Zócalo y grueso de la encimera de los catálogos de muebles (19024, Cincocina)
  [CAT_MUEBLES].forEach(c => {
    const i = cab.indexOf('//PARAMETROS GLOBALES ' + c + '\n'), j = cab.indexOf('//FIN PARAMETROS GLOBALES ' + c + '\n');
    if (i < 0 || j < i) return;
    const bloque = cab.slice(i, j).replace(/globalParam Hz {2}= "\d+"/, `globalParam Hz  = "${Math.round(plan.Hz)}"`).replace(/globalParam He {2}= "\d+"/, `globalParam He  = "${Math.round(plan.grueso)}"`);
    cab = cab.slice(0, i) + bloque + cab.slice(j);
  });
  const lineas = cab.split('\n');
  lineas.splice(2, 0, 'metai s ' + sello + 'LIBRETA');
  const noEsta = new Set();
  const plantilla = (cat, [fam, cod]) => { const t = leer(cat, fam, cod); if (!t) noEsta.add(fam + '/' + cod); return t; };
  plan.paredes.forEach((pa, i) => {
    // Ventanas y puertas dentro de la cara de dentro de su pared (en sus coordenadas: a lo largo, altura y 10 cm hacia fuera)
    const puestos = [], hs = plan.huecos.filter(h => h.pared === pa.letra).flatMap(h => {
      const t = plantilla(CAT_HUECOS, h.plantilla); if (!t) return [];
      const q = muebleDePlantilla(t, { x: h.s, y: h.y, z: -100, ang: 0, L: h.L, H: h.H, P: 100 }, ids, { escena: false });
      if (!q) return [];
      puestos.push(Object.assign({ clave: q.clave }, h));
      return [...q.lineas, ''];
    });
    lineas.push(...sangrar(pared(pa, hs, cadPared(pa.L, pa.alto, puestos, ids), ids, i + 1), 1));
  });
  plan.muebles.forEach(m => {
    let t = plantilla(m.plantilla[2] || CAT_MUEBLES, m.plantilla); if (!t) return;
    if (m.inv && m.plantilla[1] === 'RB') t = darLaVuelta(t);
    const q = muebleDePlantilla(t, m, ids);
    if (q) lineas.push(...sangrar(q.lineas, 1), '');
  });
  lineas.push('}', '');
  if (noEsta.size) avisos.unshift('No están en tu catálogo de TeoWin: ' + [...noEsta].join(', ') + '.');
  return { texto: lineas.join('\n'), avisos, plan };
}

// Texto → bytes en latin1 (como guarda TeoWin); lo que no cabe, «?»
export function bytesLatin1(texto) {
  const b = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); b[i] = c < 256 ? c : 63; }
  return b;
}

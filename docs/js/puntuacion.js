// Puntuación de una cocina (0–100): almacenaje, usabilidad y la nota total (la media de las dos).
// Almacenaje: «metros útiles» de cada mueble (un metro de cajones guarda más que uno de puertas; una despensa, mucho más),
// repartidos entre los metros de cocina. Usabilidad: parte de 100 y resta por cada consejo de diseño de placa, agua,
// frío, encimera y pasos (lo que funcionaría mal al usarla). Es orientativa: sirve para comparar propuestas.
import { situarMuebles, esColumna, cuadreAltos, moduloNuevo, nombreModulo, placaConHorno, paredesVecinas, FONDO_BAJO, medidasRemates } from './modulos.js';
import { consejosDiseno } from './consejos.js';
import { varianteDe } from './frentes.js';
import { avisosObra } from './avisos-obra.js';
import { geometriaAlzado, ALTURAS } from './alzado.js';
import { parejasEstrechas, PASO_ANCHO } from './relleno.js';
// Instalaciones que se quedan sin su mueble (desagüe y agua del fregadero, humos de la placa, enchufes): sin números,
// para comparar antes y después de un cambio.
const INSTALACION = /Desagüe|Toma de agua|salida de humos|Salida de humos|Enchufe/;
// Muebles que tapan una ventana o chocan con una puerta: un cambio no puede añadir ninguno.
const CHOQUE = /tapa la ventana|choca con la puerta|por debajo de la encimera/;
const choques = f => avisosObra(f, 'mm').filter(a => CHOQUE.test(a.texto)).length + altosMal(f);
// Altos encima del sitio de la campana (con sus márgenes) o que se salen de la pared: cuentan como choques.
const pisa = (a, b, x, y) => a < y - 1 && b > x + 1;
function altosMal(f) {
  let n = 0;
  (f.datos.paredes || []).forEach(p => {
    if (!(p.altos || []).length) return;
    const sit = situarMuebles(p, f.datos), zs = (sit.zonas || []).filter(z => !z.mueble);
    sit.altos.forEach(a => { if (a.m.tipo === 'hueco') return; if (zs.some(z => pisa(a.desde, a.hasta, z.desde, z.hasta)) || (hay(p.largo) && a.hasta > p.largo + 1)) n++; });
  });
  return n;
}
// Altos simétricos para una pared con bajos y sin altos: uno encima de cada bajo y de su mismo ancho (redondeado a 5 cm),
// sin columnas, ni el sitio de la campana, ni ventanas o puertas a la altura de los altos; huecos donde no va alto.
export function altosSimetricos(p, datos) {
  const sit = situarMuebles(p, datos);
  // El sitio de la campana se reserva cuando hay algún alto: se mira con uno de prueba.
  const prueba = Object.assign({}, p, { altos: [Object.assign(moduloNuevo('alto'), { ancho: 300 })] }), sp = situarMuebles(prueba, datos), zonas = (sp.zonas || []).filter(z => !z.mueble);
  const g = geometriaAlzado(datos, p), tapas = g ? g.piezas.filter(q => (q.clase === 'ventana' || q.clase === 'puerta') && q.y + q.h > ALTURAS.altos_desde && q.y < ALTURAS.altos_hasta).map(q => [q.x, q.x + q.w]) : [];
  const libres = [];
  sit.bajos.forEach(b => {
    if (esColumna(b.m) || b.m.tipo === 'hueco' || b.m.tipo === 'rinconero') return;
    let x = b.desde, y = b.hasta;
    // Quitar la campana y su margen (y el costado de 2 cm) por el lado que pise
    zonas.forEach(z => { if (pisa(x, y, z.desde - 20, z.hasta + 20)) { if (z.desde - 20 - x >= y - (z.hasta + 20)) y = Math.min(y, z.desde - 20); else x = Math.max(x, z.hasta + 20); } });
    if (tapas.some(([a, c]) => pisa(x, y, a, c))) return;
    const w = Math.floor((y - x) / 50) * 50;
    if (w >= 300) libres.push({ desde: b.hasta === y ? y - w : x, ancho: w });
  });
  if (!libres.length) return null;
  // La fila de altos: los huecos que hagan falta para que cada alto quede sobre su bajo (la campana se salta sola).
  // Empieza donde empezaría el primer alto (tras la regleta, o tras una columna), no donde el primer bajo (que puede
  // empezar más allá, tras el rincón de la pared de al lado).
  const inicio = sp.altos.length ? Math.min(sp.altos[0].desde, ...libres.map(l => l.desde)) : 0;
  const fila = elegidos => {
    const lista = [];
    let s = inicio;
    elegidos.forEach(l => {
      const gap = l.desde - s, enCampana = zonas.some(z => pisa(s, l.desde, z.desde - 20, z.hasta + 20));
      if (gap >= 100 && !enCampana) lista.push(Object.assign(moduloNuevo('hueco'), { ancho: Math.round(gap / 10) * 10 }));
      lista.push(Object.assign(moduloNuevo('alto'), { ancho: l.ancho }));
      s = l.desde + l.ancho;
    });
    return lista;
  };
  return { libres, fila, lista: fila(libres) };
}
// Bajos para una pared vacía: de 60 (y uno más estrecho con lo que sobre, de 30 a 50), en los tramos libres de la pared
// sin puertas, pilares ni ventanas que bajen de la encimera; huecos donde no van.
function bajosParaVacia(p, datos) {
  if (!hay(p.largo) || p.largo < 600) return null;
  const prueba = Object.assign({}, p, { bajos: [Object.assign(moduloNuevo('bajo'), { ancho: 300 })], altos: [] }), sp = situarMuebles(prueba, datos);
  // En una esquina donde la pared de al lado ya tiene bajos, su fondo (60) es suyo: aquí se empieza o se acaba antes
  const vec = paredesVecinas(datos, p), bajosEn = (q, fin) => { if (!q || !hay(q.largo)) return false; const s2 = situarMuebles(q, datos); return s2.bajos.some(b => b.m.tipo !== 'hueco' && (fin ? b.hasta >= q.largo - 100 : b.desde <= 100)); };
  const inicio = Math.max(sp.bajos.length ? sp.bajos[0].desde : 0, bajosEn(vec.izq, true) ? FONDO_BAJO : 0), fin = p.largo - (bajosEn(vec.der, false) ? FONDO_BAJO : 40);
  const g = geometriaAlzado(datos, p), estorbos = g ? g.piezas.filter(q => q.clase === 'puerta' || q.clase === 'pilar' || (q.clase === 'ventana' && q.y < ALTURAS.encimera)).map(q => [q.x, q.x + q.w]).sort((a, b) => a[0] - b[0]) : [];
  const tramos = [];
  let x = inicio;
  estorbos.forEach(([a, b]) => { if (a > x) tramos.push([x, Math.min(a, fin)]); x = Math.max(x, b); });
  if (fin > x) tramos.push([x, fin]);
  const lista = [];
  let s = inicio, n = 0;
  tramos.forEach(([a, b]) => {
    const anchos = [];
    let len = b - a;
    while (len >= 600) { anchos.push(600); len -= 600; }
    // Lo que sobra, de 5 en 5 cm: un bajo más si llega a 30; si no, el último se ensancha
    if (len >= 300) anchos.push(Math.floor(len / PASO_ANCHO) * PASO_ANCHO);
    else if (len >= PASO_ANCHO && anchos.length) anchos[anchos.length - 1] += Math.floor(len / PASO_ANCHO) * PASO_ANCHO;
    if (!anchos.length) return;
    if (a - s >= 100) lista.push(Object.assign(moduloNuevo('hueco'), { ancho: Math.round((a - s) / 10) * 10 }));
    anchos.forEach(w => { lista.push(Object.assign(moduloNuevo('bajo'), { ancho: w })); n++; });
    s = a + anchos.reduce((t, w) => t + w, 0);
  });
  return n ? { lista, n } : null;
}
// ── Altos en su sitio ──
// Lo que hace falta saber de una pared para poner altos: dónde empieza la fila (tras la regleta o una columna), dónde
// acaba, el sitio de la campana, ventanas y puertas a la altura de los altos, columnas, los altos que ya hay y las
// esquinas tapadas por los altos de la pared de al lado (su fondo).
const FONDO_ALTO = 350, FONDO_COLUMNA = 600;
function contextoAltos(datos, ip) {
  // Un alto de prueba muy estrecho, para saber dónde empieza la fila (uno ancho saltaría la campana del principio)
  const p = datos.paredes[ip], uno = Object.assign(moduloNuevo('alto'), { ancho: 50 });
  const sp = situarMuebles(Object.assign({}, p, { altos: [uno] }), datos), sit = situarMuebles(p, datos);
  const zonas = (sp.zonas || []).filter(z => !z.mueble).map(z => [z.desde - 20, z.hasta + 20]);
  const g = geometriaAlzado(datos, p), tapas = g ? g.piezas.filter(q => (q.clase === 'ventana' || q.clase === 'puerta') && q.y + q.h > ALTURAS.altos_desde && q.y < ALTURAS.altos_hasta).map(q => [q.x, q.x + q.w]) : [];
  const columnas = sit.bajos.filter(b => esColumna(b.m)).map(b => [b.desde, b.hasta]);
  const ya = sit.altos.filter(a => a.m.tipo !== 'hueco').map(a => [a.desde, a.hasta]);
  const ps = datos.paredes, ant = ps[ip - 1], sig = ps[ip + 1];
  // Lo que la pared de al lado tiene en la esquina común: sus altos (tapan su fondo, 35) o una columna (60, hasta arriba)
  const enEsquina = (q, fin) => {
    if (!q || !hay(q.largo)) return 0;
    const s2 = situarMuebles(q, datos), cerca = a => (fin ? a.hasta >= q.largo - 100 : a.desde <= 100);
    if (s2.bajos.some(b => esColumna(b.m) && cerca(b))) return FONDO_COLUMNA;
    return s2.altos.some(a => a.m.tipo !== 'hueco' && cerca(a)) ? FONDO_ALTO : 0;
  };
  // Si los bajos llegan a la pared, los altos también (sin regleta al final)
  const finBajos = Math.max(0, ...sit.bajos.map(b => b.hasta));
  // Dónde empieza la fila: tras la regleta a la pared, salvo si empieza una columna (no se mira con el alto de prueba: si
  // cae detrás de la campana, la colocación lo empuja hasta lo que venga después y parecería que la fila empieza ahí)
  const R = medidasRemates(datos), ini0 = sit.bajos.length ? sit.bajos[0].desde : 0;
  const arranque = R.regleta && !sit.bajos.some(b => esColumna(b.m) && b.desde <= ini0 + 1) ? R.regleta : 0, fin = hay(p.largo) ? (finBajos >= p.largo - 1 ? p.largo : p.largo - 40) : arranque;
  // Donde entra el rinconero de la pared de al lado, la esquina es suya (allí van sus altos o su estantería)
  const eIni = Math.max(enEsquina(ant, true), sit.entran ? sit.entran.izq || 0 : 0), eFin = Math.max(enEsquina(sig, false), sit.entran ? sit.entran.der || 0 : 0);
  return { p, sit, zonas, tapas, columnas, ya, arranque, inicio: Math.max(arranque, eIni), fin: eFin ? Math.min(fin, p.largo - eFin) : fin,
    especial: (p.altos || []).some(m => ['alto_frigo', 'alto_campana'].includes(m.tipo)) };
}
// La fila de altos de la pared con los que ya tiene y los nuevos ({desde, ancho, tipo}), cada uno en su sitio: huecos
// donde no va nada; la campana y las columnas se saltan solas.
export function filaCon(datos, ip, nuevos) {
  const c = contextoAltos(datos, ip); if (c.especial) return null;
  const items = c.sit.altos.filter(a => a.m.tipo !== 'hueco').map(a => ({ desde: a.desde, m: a.m }))
    .concat(nuevos.map(x => ({ desde: x.desde, m: Object.assign(moduloNuevo(x.tipo || 'alto'), { ancho: x.ancho }, x.id ? { id: x.id } : {}) }))).sort((a, b) => a.desde - b.desde);
  const lista = [], hueco = w => { if (w >= 100) lista.push(Object.assign(moduloNuevo('hueco'), { ancho: Math.round(w / 10) * 10 })); };
  let s = c.arranque;
  items.forEach(it => {
    // Lo que se salta solo (campana, columna) entre el último y este: hueco hasta ahí y se sigue detrás
    c.zonas.concat(c.columnas).filter(([a, b]) => a >= s - 1 && b <= it.desde + 1).sort((x, y) => x[0] - y[0]).forEach(([a, b]) => { hueco(a - s); s = b; });
    hueco(it.desde - s);
    lista.push(it.m); s = Math.max(s, it.desde) + it.m.ancho;
  });
  // Detrás de la campana, la colocación junta los altos con lo que venga después (una columna o la pared): para que se
  // queden donde se quieren (y no se vayan, por ejemplo, delante de una ventana), un hueco hasta ahí.
  const ultimoIt = items[items.length - 1];
  if (ultimoIt && c.zonas.some(([, b]) => b <= ultimoIt.desde + 1) && hay(c.p.largo)) {
    const tope = Math.min(c.p.largo, ...c.columnas.filter(([a]) => a >= s - 1).map(([a]) => a));
    if (tope - s >= 100) {
      const tras = Object.assign(moduloNuevo('hueco'), { ancho: Math.round((tope - s) / 10) * 10 }); lista.push(tras);
      for (let k = 0; k < 4; k++) {
        const al = situarMuebles(Object.assign({}, c.p, { altos: lista }), datos).altos, a = al.find(q => q.m === ultimoIt.m);
        const corre = a ? Math.round(a.desde - ultimoIt.desde) : 0;
        if (corre > 0) tras.ancho += corre; else if (corre < 0 && tras.ancho + corre >= 10) tras.ancho += corre; else break;
      }
    }
  }
  // Ajuste fino: los costados y regletas que mete la colocación corren los altos unos cm; se corrige con el hueco o la
  // estantería de delante hasta que cada uno quede donde se quería (a menos de 5 mm).
  for (let vuelta = 0; vuelta < items.length * 2; vuelta++) {
    const al = situarMuebles(Object.assign({}, c.p, { altos: lista }), datos).altos;
    const it = items.find(x => { const a = al.find(q => q.m === x.m); return a && Math.abs(x.desde - a.desde) >= 5; });
    if (!it) break;
    const diff = Math.round(it.desde - al.find(q => q.m === it.m).desde), i = lista.indexOf(it.m), prev = lista[i - 1];
    if (prev && prev.tipo === 'hueco' && prev.ancho + diff >= 10) prev.ancho += diff;
    else if (prev && prev.tipo === 'alto_abierto' && prev.ancho + diff >= 200) prev.ancho += diff;
    else if (diff >= 10) lista.splice(i, 0, Object.assign(moduloNuevo('hueco'), { ancho: diff }));
    else break;
  }
  return lista;
}
// ¿Cada alto nuevo ha quedado donde se quería (a 6 cm como mucho)?
function enSuSitio(datos, ip, nuevos) {
  const al = situarMuebles(datos.paredes[ip], datos).altos;
  return nuevos.every(x => al.some(a => a.m.ancho === x.ancho && Math.abs(a.desde - x.desde) <= 60));
}
// Un alto encima de cada bajo que aún no tenga (de su ancho, a 5 cm), sin la campana ni ventanas o puertas.
export function nuevosSimetricos(datos, ip) {
  const c = contextoAltos(datos, ip), r = [];
  c.sit.bajos.forEach(b => {
    if (esColumna(b.m) || b.m.tipo === 'hueco' || b.m.tipo === 'rinconero') return;
    let x = b.desde, y = b.hasta;
    if (c.ya.some(([a, z]) => pisa(x, y, a, z))) return;
    c.zonas.forEach(([a, z]) => { if (pisa(x, y, a, z)) { if (a - x >= y - z) y = Math.min(y, a); else x = Math.max(x, z); } });
    x = Math.max(x, c.inicio); y = Math.min(y, c.fin);
    if (c.tapas.some(([a, z]) => pisa(x, y, a, z))) return;
    const w = Math.floor((y - x) / 50) * 50;
    if (w >= 300) r.push({ id: 'alto-' + b.m.id, desde: b.hasta === y ? y - w : x, ancho: w, tipo: 'alto', sobre: b.m.tipo, sobreAncho: b.m.ancho });
  });
  return r;
}
const textoAlto = x => 'un alto de ' + Math.round(x.ancho / 10) + (x.sobre === 'fregadero' ? ' encima del fregadero (escurreplatos)' : ' encima del ' + nombreModulo({ tipo: x.sobre }).toLowerCase() + ' de ' + Math.round(x.sobreAncho / 10));
// Hasta la esquina: lo libre arriba que llega al principio o al final de la pared (sin altos, ni campana, ni columnas,
// ni ventanas o puertas, ni los altos simétricos que faltan): altos de catálogo pegados a los demás y, en el rincón,
// una estantería abierta con lo que sobre (de 20 cm o más).
const ANCHOS_ALTO = [900, 800, 600, 500, 400, 300];
export function altosEsquina(datos, ip) {
  const c = contextoAltos(datos, ip); if (c.especial || !hay(c.p.largo)) return [];
  const sim = nuevosSimetricos(datos, ip).map(x => [x.desde, x.desde + x.ancho]);
  const fila = c.ya.concat(sim).map(o => o.concat(['alto']));
  const ocup = fila.concat(c.zonas.map(z => z.concat(['alto'])), c.columnas, c.tapas).filter(([a, b]) => b > c.inicio && a < c.fin).sort((x, y) => x[0] - y[0]);
  if (!ocup.length) return [];   // sin nada arriba: no es «hasta la esquina», es la pared libre
  const ultimo = ocup.reduce((m, o) => (o[1] > m[1] ? o : m), ocup[0]);
  // Solo para seguir una fila de altos (no al lado de una puerta, una ventana o una columna)
  const r = [], tramos = [[c.inicio, ocup[0][0], 'izq', ocup[0][2] === 'alto'], [ultimo[1], c.fin, 'der', ultimo[2] === 'alto']];
  tramos.forEach(([a, b, lado, sigue]) => {
    if (!sigue) return;
    const len = b - a; if (len < 200) return;
    // Lo que hay debajo pegado a la fila (bajos que no son rinconero): ahí, altos; lo demás (sobre el rinconero o sin
    // nada debajo), la estantería abierta. Como se haría a mano: «estantería 76, alto 40, alto 80…».
    const bajosDebajo = c.sit.bajos.filter(q => q.m.tipo !== 'rinconero' && q.m.tipo !== 'hueco' && !esColumna(q.m) && q.hasta > a + 1 && q.desde < b - 1);
    let cubrir = 0;
    if (bajosDebajo.length) cubrir = lado === 'izq' ? b - Math.max(a, Math.min(...bajosDebajo.map(q => q.desde))) : Math.min(b, Math.max(...bajosDebajo.map(q => q.hasta))) - a;
    const altos = [];
    if (cubrir > 0) {
      // De catálogo, el más justo que lo cubra (de 40 como poco: uno de 30 encima de un panero queda pobre)
      let quedan = cubrir;
      while (quedan > 0) { const w = quedan >= 900 ? 900 : [400, 450, 500, 600, 800, 900].find(x => x >= quedan); altos.push(w); quedan -= w; }
    }
    let usado = altos.reduce((t, x) => t + x, 0);
    if (usado > len) { altos.length = 0; usado = 0; }
    let resto = len - usado;
    // La estantería, con lo que sobre (a medida), de 90 como mucho: si sobra más, altos de catálogo pegados a ella
    const masAltos = [];
    while (resto > 900 + 200) { const w = ANCHOS_ALTO.find(x => x <= resto - 200 && x <= 900) || 300; masAltos.push(w); resto -= w; }
    const est = resto >= 200 ? Math.floor(resto / 10) * 10 : 0;
    const todosAltos = lado === 'izq' ? masAltos.concat(altos) : altos.concat(masAltos);
    const piezas = lado === 'izq' ? (est ? [['alto_abierto', est]] : []).concat(todosAltos.map(w => ['alto', w])) : todosAltos.map(w => ['alto', w]).concat(est ? [['alto_abierto', est]] : []);
    if (!piezas.length) return;
    let x = lado === 'izq' ? b - piezas.reduce((t, q) => t + q[1], 0) : a;
    piezas.forEach(([tipo, w], k) => { r.push({ id: 'esq-' + c.p.id + '-' + lado + k, desde: x, ancho: w, tipo }); x += w; });
  });
  return r;
}
const textoEsquina = l => 'hasta la esquina, ' + l.map(x => (x.tipo === 'alto_abierto' ? 'estantería abierta de ' : 'alto de ') + Math.round(x.ancho / 10)).join(', ');

const fueraDeSitio = f => new Set(avisosObra(f, 'mm').map(a => a.texto).filter(t => INSTALACION.test(t)).map(t => t.replace(/\d+([.,]\d+)?/g, '#')));

const hay = v => v !== null && v !== undefined && v !== '';
// Metros útiles por metro de ancho de cada mueble
export const UTIL = {
  cajonero: 1.3, bajo: 1.0, fregadero: 0.5, placa: 0.8, rinconero: 0.9, lavavajillas: 0, lavadora: 0, hueco: 0, otro: 0.5,
  despensero: 3.0, escobero: 2.0, columna_hmo: 0.8, columna_frigo: 0.3, columna_electro: 0.6, semicolumna: 1.6,
  alto: 0.8, alto_abierto: 0.5, alto_micro: 0.3, alto_campana: 0.3, alto_frigo: 0.3, campana_deco: 0,
};
// Cómo es el frente de un bajo: «cajones», «mixto» (cajón y puerta) o «puertas». Sin modelo elegido, el que se dibuja:
// cajonero y placa sin horno, cajones.
const ELECTRO_V = /SOPORTE|HORNO|H\/MO|ELECTRODOM/;
function frenteDe(m, d) {
  const v = varianteDe(m, d) || (m.tipo === 'cajonero' || (m.tipo === 'placa' && !m.horno) ? '4 GAVETEROS' : 'PUERTAS');
  if (ELECTRO_V.test(v) || !/GAVETERO|CACER/.test(v)) return 'puertas';
  return /PUERTA/.test(v) ? 'mixto' : 'cajones';
}
const BAJO_BASE = { bajo: 1.0, cajonero: 1.0, placa: 0.8, fregadero: 0.5 };
export const DENSIDAD_BUENA = 2.0;   // metros útiles por metro de cocina que dan 100 en almacenaje
const RESTA_CONSEJO = 9;
const GRUPOS_USO = ['placa', 'agua', 'frio', 'encimera', 'paso'];
const m1 = v => Math.round(v / 100) / 10;   // mm → metros con un decimal

function utilDe(m, ancho, d) {
  if (placaConHorno(m)) return 0.2 * ancho;
  if (m.tipo === 'rinconero') return (m.forma === 'recto' ? 0.5 : 0.9) * ancho;
  const v = varianteDe(m, d) || '';
  // Bajos: los cajones guardan un 30 % más que las puertas (con cajón y puerta, la mitad)
  if (m.tipo in BAJO_BASE) { const f = frenteDe(m, d); return (BAJO_BASE[m.tipo] + (f === 'cajones' ? 0.3 : f === 'mixto' ? 0.15 : 0)) * ancho; }
  if (m.tipo === 'semicolumna') return (v === '4-5 CACEROLEROS' ? 1.9 : v === 'HORNO + 1 PUERTA' ? 0.8 : v.startsWith('HORNO/MICRO') ? 0.6 : UTIL.semicolumna) * ancho;
  if (m.tipo === 'columna_hmo') return (/\+ PUERTA$/.test(v) ? 0.8 : 0.9) * ancho;   // con caceroleros abajo, algo más
  if (m.tipo === 'alto' && /DECORATIVO/.test(v)) return UTIL.alto_abierto * ancho;
  return (UTIL[m.tipo] ?? 0.5) * ancho;
}

export function puntuarCocina(ficha) {
  const d = (ficha && ficha.datos) || {};
  if (!ficha || ficha.tipo !== 'cocina') return null;
  const paredes = (d.paredes || []).filter(p => hay(p.largo) && ((p.bajos || []).length || (p.altos || []).length));
  if (!paredes.length) return null;
  let util = 0, largo = 0, cajones = 0, puertasBajas = 0, altos = 0, columnas = 0;
  paredes.forEach(p => {
    const sit = situarMuebles(p, d);
    const ocupado = sit.bajos.filter(b => b.m.tipo !== 'hueco').reduce((a, b) => a + (b.hasta - b.desde), 0);
    largo += ocupado || sit.altos.reduce((a, b) => a + (b.hasta - b.desde), 0);
    sit.bajos.forEach(({ m, desde, hasta }) => {
      const w = hasta - desde, u = utilDe(m, w, d); util += u;
      if (esColumna(m)) { if (m.tipo === 'despensero' || m.tipo === 'escobero') columnas += w; }
      else if (m.tipo in BAJO_BASE && !placaConHorno(m) && frenteDe(m, d) === 'cajones') cajones += w;
      else if (['bajo', 'fregadero', 'rinconero', 'placa'].includes(m.tipo)) puertasBajas += w;
    });
    sit.altos.forEach(({ m, desde, hasta }) => { const w = hasta - desde; util += utilDe(m, w, d); if (m.tipo === 'alto') altos += w; });
  });
  // Islas y penínsulas: muebles por debajo (como bajos de puertas)
  (d.islas || []).forEach(x => { if (hay(x.largo)) { util += x.largo * 1.0; largo += x.largo; } });
  if (!largo) return null;
  const densidad = util / largo, nAlm = Math.max(0, Math.min(100, Math.round((densidad / DENSIDAD_BUENA) * 100)));
  const detAlm = [
    cajones ? m1(cajones) + ' m de cajones' : null, puertasBajas ? m1(puertasBajas) + ' m de bajos de puertas' : null,
    altos ? m1(altos) + ' m de altos' : null, columnas ? m1(columnas) + ' m de despensa o escobero' : null,
  ].filter(Boolean);
  const mejoras = [];
  if (puertasBajas >= 600) mejoras.push('Cambiar bajos de puertas por cajoneros: se guarda más y se ve todo');
  if (!altos) mejoras.push('Sin altos: si hay pared libre, unos altos suben mucho el almacenaje');
  if (!columnas && largo >= 3000) mejoras.push('Una columna despensa guarda como tres bajos');
  // Usabilidad: los consejos que afectan al uso de cada día
  const consejos = consejosDiseno(ficha).filter(c => GRUPOS_USO.includes(c.grupo));
  const nUso = Math.max(0, 100 - RESTA_CONSEJO * consejos.length);
  return {
    almacenaje: { nota: nAlm, detalle: detAlm, mejoras },
    usabilidad: { nota: nUso, detalle: consejos.map(c => c.texto) },
    total: Math.round((nAlm + nUso) / 2),
  };
}

// «Puntuación 78/100 · almacenaje 70 · usabilidad 86» y, debajo, el detalle
export function textoPuntuacion(p) {
  if (!p) return [];
  const l = ['Puntuación de la cocina: ' + p.total + '/100 (almacenaje ' + p.almacenaje.nota + ', usabilidad ' + p.usabilidad.nota + ')'];
  if (p.almacenaje.detalle.length) l.push('- Almacenaje: ' + p.almacenaje.detalle.join(', '));
  p.almacenaje.mejoras.forEach(t => l.push('- Para guardar más: ' + t));
  if (p.usabilidad.detalle.length) l.push('- A mejorar en el uso: ' + p.usabilidad.detalle.slice(0, 5).join('; '));
  else l.push('- Uso: sin nada que mejorar con lo que hay puesto');
  return l;
}

// ── La mejor combinación posible, respetando los electrodomésticos ──
// Prueba, de uno en uno, los cambios que no tocan electrodomésticos (placa, fregadero, lavavajillas, columnas, campana…):
// un bajo de puertas a cajonero, mover un bajo o cajonero a otro sitio de su pared y poner altos donde haya pared libre
// (de 30 a 90 cm). Se queda con el que más sube la nota y repite mientras mejore. No cambia la ficha: devuelve la copia.
// Descarta los cambios que alejan el fregadero de su desagüe o toma, la placa de su salida de humos o un mueble de su enchufe.
const MOVIBLES = ['bajo', 'cajonero'];
const copiar = o => JSON.parse(JSON.stringify(o));
export function mejorCocina(ficha, { pasos = 12 } = {}) {
  const p0 = puntuarCocina(ficha);
  if (!p0) return null;
  let actual = copiar(ficha), nota = p0.total;
  const malAntes = fueraDeSitio(ficha), choquesAntes = choques(ficha);   // un cambio no puede dejar una toma, el desagüe o un enchufe lejos de su mueble
  const cambios = [], hechos = [], estado = {};
  // Primero, juntar las cajoneras (o bajos) estrechos con el de al lado: una de 30 junto a una de 40 es una de 70
  (actual.datos.paredes || []).forEach(p => parejasEstrechas(p.bajos || []).forEach(j => {
    const a = p.bajos[j.i], b = p.bajos[j.i + 1], op = { op: 'juntar', pared: p.id, a: a.id, b: b.id, ancho: j.ancho, tipo: j.tipo };
    hechos.push({ texto: 'Pared ' + p.letra + ': juntar el ' + nombreModulo(a).toLowerCase() + ' de ' + Math.round(a.ancho / 10) + ' y el ' + nombreModulo(b).toLowerCase() + ' de ' + Math.round(b.ancho / 10) + ' en un ' + nombreModulo({ tipo: j.tipo }).toLowerCase() + ' de ' + Math.round(j.ancho / 10), op });
  }));
  if (hechos.length) { actual = aplicarCambios(actual, hechos.map(x => x.op)); nota = Math.max(nota, (puntuarCocina(actual) || { total: nota }).total); }
  for (let paso = 0; paso < pasos; paso++) {
    let mejor = null;
    // Los simétricos ganan a otros altos de la misma pared mientras suban la nota.
    const probar = (nueva, texto, simetrico, op) => {
      const pa = texto.split(':')[0], ea = / alto/.test(texto) ? (estado[pa] = estado[pa] || { tapa: 0, nota: 0 }) : null;
      if ([...fueraDeSitio(nueva)].some(t => !malAntes.has(t)) || choques(nueva) > choquesAntes) { if (ea) ea.tapa++; return; }
      const pu = puntuarCocina(nueva); if (!pu || pu.total <= nota) { if (ea) ea.nota++; return; }
      if (mejor && mejor.simetrico && /alto/.test(texto) && texto.split(':')[0] === mejor.texto.split(':')[0] && !simetrico) return;
      if (!mejor || pu.total > mejor.nota || (simetrico && !mejor.simetrico && texto.split(':')[0] === mejor.texto.split(':')[0])) mejor = { ficha: nueva, nota: pu.total, texto, simetrico, op };
    };
    (actual.datos.paredes || []).forEach((p, ip) => {
      // Bajo de puertas → cajonero
      (p.bajos || []).forEach((m, i) => {
        if (m.tipo !== 'bajo' || (m.variante && m.variante !== 'PUERTAS')) return;
        const n = copiar(actual); n.datos.paredes[ip].bajos[i].tipo = 'cajonero'; n.datos.paredes[ip].bajos[i].variante = null;
        probar(n, 'Pared ' + p.letra + ': el bajo de ' + Math.round(m.ancho / 10) + ' del puesto ' + (i + 1) + ' a cajonero', false, { op: 'cajonero', pared: p.id, id: m.id });
      });
      // Mover un bajo o cajonero a otro sitio de la misma pared
      (p.bajos || []).forEach((m, i) => {
        if (!MOVIBLES.includes(m.tipo)) return;
        for (let j = 0; j < p.bajos.length; j++) {
          if (j === i) continue;
          const n = copiar(actual), l = n.datos.paredes[ip].bajos, [x] = l.splice(i, 1);
          l.splice(j, 0, x);
          probar(n, 'Pared ' + p.letra + ': mover el ' + nombreModulo(m).toLowerCase() + ' de ' + Math.round(m.ancho / 10) + ' al puesto ' + (j + 1), false, { op: 'mover', pared: p.id, id: m.id, a: j });
        }
      });
      // Altos donde quede pared libre arriba (en paredes con bajos o con altos). Cada alto nuevo va en su sitio, entre los
      // que ya hay: encima de un bajo que no tenga alto y de su ancho (simétrico; sobre el fregadero, el escurreplatos), y
      // hasta la esquina, altos de catálogo y una estantería abierta en el rincón.
      const c = cuadreAltos(p, actual.datos);
      if (((p.altos || []).length || (p.bajos || []).length) && c.resto >= 300) {
        const ponerEn = (nuevos, texto, simetrico) => {
          const lista = filaCon(actual.datos, ip, nuevos); if (!lista) return;
          const n = copiar(actual); n.datos.paredes[ip].altos = lista;
          if (!enSuSitio(n.datos, ip, nuevos)) return;
          probar(n, texto, simetrico, { op: 'altosEn', pared: p.id, nuevos: copiar(nuevos) });
        };
        const sim = nuevosSimetricos(actual.datos, ip);
        if (sim.length) {
          ponerEn(sim, 'Pared ' + p.letra + ': ' + (sim.length > 1 ? sim.length + ' altos encima de los bajos, del mismo ancho' : textoAlto(sim[0])), true);
          if (sim.length > 1) sim.forEach(x => ponerEn([x], 'Pared ' + p.letra + ': ' + textoAlto(x), true));
        }
        // Sin altos ni simétricos posibles: los de siempre (uno al principio, o iguales llenando lo libre)
        const ponerAltos = (lista, texto) => { const n = copiar(actual); n.datos.paredes[ip].altos = lista; probar(n, texto, false, { op: 'altos', pared: p.id, altos: copiar(lista) }); };
        if (!(p.altos || []).length && !sim.length) {
          for (let w = Math.min(900, Math.floor(c.resto / 50) * 50); w >= 300; w -= 100) ponerAltos([Object.assign(moduloNuevo('alto'), { ancho: w })], 'Pared ' + p.letra + ': un alto de ' + Math.round(w / 10) + ' en la pared libre');
          const nn = Math.ceil(c.resto / 900), wl = Math.floor(c.resto / nn / 50) * 50;
          if (nn > 1 && wl >= 300) ponerAltos(Array.from({ length: nn }, () => Object.assign(moduloNuevo('alto'), { ancho: wl })), 'Pared ' + p.letra + ': ' + nn + ' altos de ' + Math.round(wl / 10) + ' en la pared libre');
        }
      }
    });
    if (!mejor) break;
    actual = mejor.ficha; nota = mejor.nota; cambios.push(mejor.texto); hechos.push({ texto: mejor.texto, op: mejor.op });
  }
  // Paredes vacías: bajos (y sus altos simétricos encima), como cambio a elegir, sin marcar (no suben la nota: más
  // metros de cocina con muebles normales). Al final, sobre la mejor encontrada.
  (actual.datos.paredes || []).forEach((p, ip) => {
    if ((p.bajos || []).length || (p.altos || []).length) return;
    const b = bajosParaVacia(p, actual.datos); if (!b) return;
    const n = copiar(actual); n.datos.paredes[ip].bajos = b.lista;
    if (choques(n) > choquesAntes) return;
    const sim = altosSimetricos(n.datos.paredes[ip], n.datos), n2 = copiar(n);
    if (sim) n2.datos.paredes[ip].altos = sim.lista;
    const conAltos = sim && choques(n2) <= choquesAntes, op = { op: 'bajos', pared: p.id, bajos: copiar(b.lista), altos: conAltos ? copiar(sim.lista) : [] };
    hechos.push({ texto: 'Pared ' + p.letra + ' (vacía): ' + b.n + (b.n > 1 ? ' bajos' : ' bajo') + (conAltos ? ' y sus altos encima' : '') + ' (opcional)', op, marcado: false });
  });
  // Hasta la esquina: después de los altos sobre los bajos (que mandan), pared a pared sobre una copia, para que dos
  // paredes no se pisen la misma esquina. Se propone marcado (no siempre sube la nota).
  let conEsquinas = copiar(actual);
  (conEsquinas.datos.paredes || []).forEach((p, ip) => {
    if (!(p.bajos || []).length && !(p.altos || []).length) return;
    const esq = altosEsquina(conEsquinas.datos, ip); if (!esq.length) return;
    const lista = filaCon(conEsquinas.datos, ip, esq); if (!lista) return;
    const n = copiar(conEsquinas); n.datos.paredes[ip].altos = lista;
    if (!enSuSitio(n.datos, ip, esq) || choques(n) > choquesAntes) return;
    conEsquinas = n;
    hechos.push({ texto: 'Pared ' + p.letra + ': ' + textoEsquina(esq), op: { op: 'altosEn', pared: p.id, nuevos: copiar(esq) } });
  });
  // Por qué no hay altos en una pared que no los tiene ni se le han propuesto
  const motivos = [];
  (actual.datos.paredes || []).forEach(p => {
    if ((p.altos || []).length || !hay(p.largo) || hechos.some(x => x.op && x.op.pared === p.id && (x.op.op === 'altos' || x.op.op === 'altosEn' || x.op.op === 'bajos'))) return;
    const pa = 'Pared ' + p.letra, e = estado[pa];
    if (!(p.bajos || []).length) { motivos.push(pa + ': no tiene muebles (no se le ha encontrado sitio libre para bajos)'); return; }
    if (cuadreAltos(p, actual.datos).resto < 300) motivos.push(pa + ': no queda sitio libre arriba para altos');
    else if (e && e.tapa && !e.nota) motivos.push(pa + ': los altos taparían una ventana, una puerta o la campana');
    else if (e && e.nota) motivos.push(pa + ': unos altos no suben la nota');
    else motivos.push(pa + ': no se le encuentran altos que quepan sobre los bajos');
  });
  // La mejor: con todos los cambios marcados (también los de hasta la esquina)
  const final = aplicarCambios(ficha, hechos.filter(x => x.marcado !== false).map(x => x.op));
  return { antes: p0, despues: puntuarCocina(final), cambios: hechos.filter(x => x.marcado !== false).map(x => x.texto), pasos: hechos, motivos, ficha: final };
}

// Aplica a una copia de la ficha solo los cambios elegidos (los de «pasos» de mejorCocina), en su orden. Uno que ya no
// se puede hacer (su mueble no está) se salta.
export function aplicarCambios(ficha, ops) {
  const n = copiar(ficha), paredDe = id => (n.datos.paredes || []).find(p => p.id === id);
  ops.forEach(o => {
    const p = o && paredDe(o.pared); if (!p) return;
    if (o.op === 'juntar') { const i = (p.bajos || []).findIndex(x => x.id === o.a), j = (p.bajos || []).findIndex(x => x.id === o.b); if (i >= 0 && j === i + 1) { Object.assign(p.bajos[i], { ancho: o.ancho, tipo: o.tipo, variante: null }); p.bajos.splice(j, 1); } }
    if (o.op === 'cajonero') { const m = (p.bajos || []).find(x => x.id === o.id); if (m) { m.tipo = 'cajonero'; m.variante = null; } }
    if (o.op === 'mover') { const i = (p.bajos || []).findIndex(x => x.id === o.id); if (i >= 0) { const [x] = p.bajos.splice(i, 1); p.bajos.splice(Math.min(o.a, p.bajos.length), 0, x); } }
    if (o.op === 'altos') p.altos = (p.altos || []).concat(copiar(o.altos));
    if (o.op === 'altosEn') { const l = filaCon(n.datos, n.datos.paredes.indexOf(p), o.nuevos); if (l) p.altos = l; }
    if (o.op === 'bajos') { p.bajos = (p.bajos || []).concat(copiar(o.bajos)); p.altos = (p.altos || []).concat(copiar(o.altos || [])); }
  });
  return n;
}

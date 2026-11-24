// Puntuación de una cocina (0–100): almacenaje, usabilidad y la nota total (la media de las dos).
// Almacenaje: «metros útiles» de cada mueble (un metro de cajones guarda más que uno de puertas; una despensa, mucho más),
// repartidos entre los metros de cocina. Usabilidad: parte de 100 y resta por cada consejo de diseño de placa, agua,
// frío, encimera y pasos (lo que funcionaría mal al usarla). Es orientativa: sirve para comparar propuestas.
import { situarMuebles, esColumna, cuadreAltos, moduloNuevo, nombreModulo, placaConHorno } from './modulos.js';
import { consejosDiseno } from './consejos.js';
import { varianteDe } from './frentes.js';
import { avisosObra } from './avisos-obra.js';
import { geometriaAlzado, ALTURAS } from './alzado.js';
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
function altosSimetricos(p, datos) {
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
  const inicio = sp.bajos.length ? sp.bajos[0].desde : 0, fin = p.largo - 40;
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
    if (len >= 300) anchos.push(Math.floor(len / 100) * 100);
    if (!anchos.length) return;
    if (a - s >= 100) lista.push(Object.assign(moduloNuevo('hueco'), { ancho: Math.round((a - s) / 10) * 10 }));
    anchos.forEach(w => { lista.push(Object.assign(moduloNuevo('bajo'), { ancho: w })); n++; });
    s = a + anchos.reduce((t, w) => t + w, 0);
  });
  return n ? { lista, n } : null;
}
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
  for (let paso = 0; paso < pasos; paso++) {
    let mejor = null;
    // Los simétricos ganan a otros altos de la misma pared mientras suban la nota.
    const probar = (nueva, texto, simetrico, op) => {
      const pa = texto.split(':')[0], ea = / alto/.test(texto) ? (estado[pa] = estado[pa] || { tapa: 0, nota: 0 }) : null;
      if ([...fueraDeSitio(nueva)].some(t => !malAntes.has(t)) || choques(nueva) > choquesAntes) { if (ea) ea.tapa++; return; }
      const pu = puntuarCocina(nueva); if (!pu || pu.total <= nota) { if (ea) ea.nota++; return; }
      if (mejor && mejor.simetrico && /alto/.test(texto) && texto.split(':')[0] === mejor.texto.split(':')[0] && !simetrico) return;
      if (!mejor || pu.total > mejor.nota || (simetrico && texto.split(':')[0] === mejor.texto.split(':')[0])) mejor = { ficha: nueva, nota: pu.total, texto, simetrico, op };
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
      // Altos donde quede pared libre arriba: en las paredes con altos y en las que tienen bajos y aún ningún alto
      const c = cuadreAltos(p, actual.datos);
      if (((p.altos || []).length || (p.bajos || []).length) && c.resto >= 300) {
        // Pared sin altos: primero, altos simétricos (uno sobre cada bajo, de su ancho). Si valen, se prefieren.
        const sim = !(p.altos || []).length ? altosSimetricos(p, actual.datos) : null;
        const ponerAltos = (lista, texto, simetrico) => { const n = copiar(actual); n.datos.paredes[ip].altos = lista; probar(n, texto, simetrico, { op: 'altos', pared: p.id, altos: copiar(lista) }); };
        if (sim) {
          const k = sim.libres.length;
          ponerAltos(sim.lista, 'Pared ' + p.letra + ': ' + k + (k > 1 ? ' altos' : ' alto') + ' encima de los bajos, del mismo ancho', true);
          // Si todos juntos no valen (uno tapa algo), cada uno por su cuenta
          if (k > 1) sim.libres.forEach(l => ponerAltos(sim.fila([l]), 'Pared ' + p.letra + ': un alto de ' + Math.round(l.ancho / 10) + ' encima del bajo de ' + Math.round(l.ancho / 10), true));
        }
        // Además (por si los simétricos no valen), los de siempre: altos iguales llenando lo libre, o uno al principio
        const nn = Math.ceil(c.resto / 900), wl = Math.floor(c.resto / nn / 50) * 50;
        if (!(p.altos || []).length) for (let w = Math.min(900, Math.floor(c.resto / 50) * 50); w >= 300; w -= 100) ponerAltos([Object.assign(moduloNuevo('alto'), { ancho: w })], 'Pared ' + p.letra + ': un alto de ' + Math.round(w / 10) + ' en la pared libre', false);
        if (!(p.altos || []).length && nn > 1 && wl >= 300) {
          const n = copiar(actual);
          for (let k = 0; k < nn; k++) n.datos.paredes[ip].altos.push(Object.assign(moduloNuevo('alto'), { ancho: wl }));
          probar(n, 'Pared ' + p.letra + ': ' + nn + ' altos de ' + Math.round(wl / 10) + ' en la pared libre', false, { op: 'altos', pared: p.id, altos: copiar(n.datos.paredes[ip].altos.slice(-nn)) });
        }
        // Con altos ya puestos: el siguiente, solo encima de un bajo (no sobre el suelo libre): del ancho de ese bajo
        // (simétrico) o, si no cabe o tapa algo, del más ancho que quepa sobre él.
        if ((p.altos || []).length) {
          const sa = situarMuebles(p, actual.datos), fin = Math.max(...sa.altos.map(a => a.hasta)), zs = (sa.zonas || []).filter(z => !z.mueble);
          const b = sa.bajos.filter(x => !esColumna(x.m) && x.m.tipo !== 'hueco' && x.m.tipo !== 'rinconero' && x.hasta > fin + 250 && !zs.some(z => pisa(x.desde, x.hasta, z.desde, z.hasta))).sort((x, y) => x.desde - y.desde)[0];
          if (b) {
            const nuevo = w => { const n = copiar(actual); n.datos.paredes[ip].altos.push(Object.assign(moduloNuevo('alto'), { ancho: w })); return n; };
            if (b.m.ancho >= 300 && b.m.ancho <= c.resto) {
              const n = nuevo(b.m.ancho);
              probar(n, 'Pared ' + p.letra + ': un alto de ' + Math.round(b.m.ancho / 10) + ' encima del bajo de ' + Math.round(b.m.ancho / 10), true, { op: 'altos', pared: p.id, altos: copiar(n.datos.paredes[ip].altos.slice(-1)) });
            }
            for (let w = Math.min(900, Math.floor(Math.min(c.resto, b.hasta - Math.max(fin, b.desde)) / 50) * 50); w >= 300; w -= 100) {
              if (w === b.m.ancho) continue;
              const n = nuevo(w);
              probar(n, 'Pared ' + p.letra + ': un alto de ' + Math.round(w / 10) + ' encima del bajo de ' + Math.round(b.m.ancho / 10), false, { op: 'altos', pared: p.id, altos: copiar(n.datos.paredes[ip].altos.slice(-1)) });
            }
          }
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
  // Por qué no hay altos en una pared que no los tiene ni se le han propuesto
  const motivos = [];
  (actual.datos.paredes || []).forEach(p => {
    if ((p.altos || []).length || !hay(p.largo) || hechos.some(x => x.op && x.op.pared === p.id && (x.op.op === 'altos' || x.op.op === 'bajos'))) return;
    const pa = 'Pared ' + p.letra, e = estado[pa];
    if (!(p.bajos || []).length) { motivos.push(pa + ': no tiene muebles (no se le ha encontrado sitio libre para bajos)'); return; }
    if (cuadreAltos(p, actual.datos).resto < 300) motivos.push(pa + ': no queda sitio libre arriba para altos');
    else if (e && e.tapa && !e.nota) motivos.push(pa + ': los altos taparían una ventana, una puerta o la campana');
    else if (e && e.nota) motivos.push(pa + ': unos altos no suben la nota');
    else motivos.push(pa + ': no se le encuentran altos que quepan sobre los bajos');
  });
  return { antes: p0, despues: puntuarCocina(actual), cambios, pasos: hechos, motivos, ficha: actual };
}

// Aplica a una copia de la ficha solo los cambios elegidos (los de «pasos» de mejorCocina), en su orden. Uno que ya no
// se puede hacer (su mueble no está) se salta.
export function aplicarCambios(ficha, ops) {
  const n = copiar(ficha), paredDe = id => (n.datos.paredes || []).find(p => p.id === id);
  ops.forEach(o => {
    const p = o && paredDe(o.pared); if (!p) return;
    if (o.op === 'cajonero') { const m = (p.bajos || []).find(x => x.id === o.id); if (m) { m.tipo = 'cajonero'; m.variante = null; } }
    if (o.op === 'mover') { const i = (p.bajos || []).findIndex(x => x.id === o.id); if (i >= 0) { const [x] = p.bajos.splice(i, 1); p.bajos.splice(Math.min(o.a, p.bajos.length), 0, x); } }
    if (o.op === 'altos') p.altos = (p.altos || []).concat(copiar(o.altos));
    if (o.op === 'bajos') { p.bajos = (p.bajos || []).concat(copiar(o.bajos)); p.altos = (p.altos || []).concat(copiar(o.altos || [])); }
  });
  return n;
}

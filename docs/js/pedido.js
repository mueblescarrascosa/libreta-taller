// Hojas de pedido de una o varias cocinas (las de un trabajo, o las que se elijan), a partir de los muebles medidos:
// - cascos (para el taller): cada mueble con su alto × ancho × fondo y el color del casco, juntando los iguales;
// - frentes (para el proveedor): puertas, cajones y frentes de electrodoméstico con alto × ancho y su acabado;
// - juntos (mueble completo, por si se piden hechos): cada mueble con su casco y sus frentes en la misma fila.
// Medidas en mm. Las alturas son las de cada cocina (Ajustes o lo cambiado en su ficha): se fijan antes de cada una.
import { situarMuebles, esColumna, esLibre, nombreModulo } from './modulos.js';
import { frenteModulo, varianteDe } from './frentes.js';
import { ALTURAS, fijarCocinaTipo, alturasCocina } from './alzado.js';
import { CASCO, rematesCocina } from './material.js';
import { tituloFicha } from './util.js';
import { normalizarFicha, anchoPuerta } from './modelo.js';
import { puertaParaPremarco, esDeEntrada } from './trabajos.js';

const hay = v => v !== null && v !== undefined && v !== '';
export const MODOS_PEDIDO = [['cascos', 'Cascos (taller)'], ['frentes', 'Frentes (proveedor)'], ['juntos', 'Cascos y frentes juntos (muebles hechos)']];
export const MODO_PUERTAS = ['puertas', 'Puertas de paso'];
// Junta las filas iguales sumando cantidades y apuntando dónde va cada una («A», o «Cocina: A» si hay varias cocinas)
export const juntar = (filas, clave) => {
  const m = new Map();
  filas.forEach(f => { const k = clave(f); if (m.has(k)) { const g = m.get(k); g.cant += f.cant; if (f.donde && !g.donde.includes(f.donde)) g.donde.push(f.donde); } else m.set(k, Object.assign({}, f, { donde: f.donde ? [f.donde] : [] })); });
  return [...m.values()];
};

// Acabado de los frentes: el general o, si es bitono, el de altos o el de bajos (las columnas van con los altos)
export function acabadoFrente(d, deAltos) {
  const ac = d.acabados || {}, j = (...x) => x.filter(Boolean).join(' ');
  if (ac.bitono) return (deAltos ? j(ac.modelo_altos, ac.color_altos) : j(ac.modelo_bajos, ac.color_bajos)) || 'sin apuntar';
  return j(ac.modelo, ac.color) || 'sin apuntar';
}

// Los muebles de una cocina, uno a uno, con su casco (o null si no lleva) y sus frentes
function mueblesDe(d, etiqueta) {
  const lista = [], bajo = ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, col = ALTURAS.columna - ALTURAS.zocalo, alto = ALTURAS.altos_hasta - ALTURAS.altos_desde;
  const casco = (d.acabados || {}).casco || '';
  const frentesDe = (m, ancho, z0, z1, opc, deAltos) => {
    const f = frenteModulo(m.tipo, ancho, z0, z1, opc), r = [];
    f.forEach((q, i) => {
      if (q.k !== 'hoja') return;
      const t = f[i + 1], cajon = !q.soloCuenta && t && t.k === 'tirador' && t.x1 - t.x0 > t.z1 - t.z0;
      r.push({ pieza: m.tipo === 'lavavajillas' || m.tipo === 'lavadora' ? 'Frente de ' + nombreModulo(m).toLowerCase() : cajon ? 'Cajón' : m.tipo === 'rinconero' ? 'Puerta de rincón' : 'Puerta', alto: Math.round(q.z1 - q.z0), ancho: Math.round(q.real ?? (q.x1 - q.x0)), acabado: acabadoFrente(d, deAltos) });
    });
    return r;
  };
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => {
    const sit = situarMuebles(p, d), donde = (etiqueta ? etiqueta + ': ' : '') + p.letra;
    sit.bajos.forEach(({ m, desde, hasta }) => {
      if (m.tipo === 'hueco' || (m.tipo === 'columna_frigo' && esLibre(m, d))) return;
      const w = Math.round(hasta - desde), c = esColumna(m), sinCasco = ['lavavajillas', 'lavadora'].includes(m.tipo);
      const libre = (m.tipo === 'lavavajillas' || m.tipo === 'lavadora') && esLibre(m, d);
      lista.push({ grupo: c ? 'Columnas' : 'Bajos', mueble: nombreModulo(m), donde, casco: sinCasco ? null : { ancho: w, alto: c ? col : bajo, fondo: CASCO.fondo_bajo, color: casco },
        frentes: libre ? [] : c ? frentesDe(m, w, 0, ALTURAS.columna, { columna: true, variante: varianteDe(m, d), zocalo: ALTURAS.zocalo }, true) : frentesDe(m, w, ALTURAS.zocalo, ALTURAS.encimera - ALTURAS.grueso_encimera, { variante: varianteDe(m, d), rincon: m.tipo === 'rinconero' ? m : null }, false) });
    });
    sit.altos.forEach(({ m, desde, hasta }) => {
      if (m.tipo === 'hueco') return;
      const w = Math.round(hasta - desde);
      lista.push({ grupo: 'Altos', mueble: nombreModulo(m), donde, casco: m.tipo === 'campana_deco' ? null : { ancho: w, alto: m.tipo === 'alto_frigo' ? 400 : alto, fondo: CASCO.fondo_alto, color: casco },
        frentes: frentesDe(m, w, ALTURAS.altos_desde, ALTURAS.altos_hasta, {}, true) });
    });
  });
  // Remates (costados vistos, regletas y cierres a techo), con el material elegido: como el casco van con los cascos
  // (de su grueso); como los frentes o de otro material, con los frentes.
  rematesCocina(d).forEach(r => {
    const donde = (etiqueta ? etiqueta + ': ' : '') + r.donde;
    lista.push({ grupo: 'Remates', mueble: r.pieza, donde, casco: r.material === 'casco' ? { ancho: r.ancho, alto: r.alto, fondo: CASCO.grueso, color: casco } : null,
      frentes: r.material === 'casco' ? [] : [{ pieza: r.pieza, alto: r.alto, ancho: r.ancho, acabado: r.material === 'otro' ? (r.otro || 'otro material') : acabadoFrente(d, r.deAltos) }] });
  });
  return lista;
}

// Fichas de cocina → muebles, cada una con sus alturas. ajustes: los de la app (para las alturas de cada cocina).
function mueblesDeFichas(fichas, ajustes) {
  const varias = fichas.length > 1, todos = [];
  fichas.forEach(f => { fijarCocinaTipo(alturasCocina(f.datos, ajustes)); todos.push(...mueblesDe(f.datos, varias ? tituloFicha(f) : '')); });
  if (ajustes) fijarCocinaTipo(ajustes.cocina_tipo);
  return todos;
}
const ORDEN = ['Bajos', 'Columnas', 'Altos', 'Remates'];
const textoFrentes = fr => juntar(fr.map(x => Object.assign({ cant: 1 }, x)), x => [x.pieza, x.alto, x.ancho].join('|')).map(x => x.cant + ' ' + (x.cant > 1 ? x.pieza.replace(/^Puerta$/, 'puertas').replace(/^Cajón$/, 'cajones').toLowerCase() : x.pieza.toLowerCase()) + ' ' + x.alto + '×' + x.ancho).join(', ');

export function pedidoCascos(fichas, ajustes) {
  const filas = mueblesDeFichas(fichas, ajustes).filter(m => m.casco).map(m => ({ grupo: m.grupo, mueble: m.mueble, ancho: m.casco.ancho, alto: m.casco.alto, fondo: m.casco.fondo, color: m.casco.color, cant: 1, donde: m.donde }));
  return juntar(filas, f => [f.grupo, f.mueble, f.ancho, f.alto, f.fondo, f.color].join('|')).sort((a, b) => ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo) || b.ancho - a.ancho);
}
export function pedidoFrentes(fichas, ajustes) {
  const filas = mueblesDeFichas(fichas, ajustes).flatMap(m => m.frentes.map(x => Object.assign({ cant: 1, donde: m.donde }, x)));
  return juntar(filas, f => [f.acabado, f.pieza, f.alto, f.ancho].join('|')).sort((a, b) => a.acabado.localeCompare(b.acabado, 'es') || a.pieza.localeCompare(b.pieza, 'es') || b.alto - a.alto || b.ancho - a.ancho);
}
// Muebles completos: casco y frentes en la misma fila; iguales si coinciden mueble, casco, frentes y acabado
export function pedidoJuntos(fichas, ajustes) {
  const filas = mueblesDeFichas(fichas, ajustes).map(m => ({ grupo: m.grupo, mueble: m.mueble, casco: m.casco, frentes: textoFrentes(m.frentes), acabado: m.frentes.length ? m.frentes[0].acabado : '', cant: 1, donde: m.donde }));
  return juntar(filas, f => [f.grupo, f.mueble, f.casco ? [f.casco.ancho, f.casco.alto, f.casco.fondo, f.casco.color].join('x') : '-', f.frentes, f.acabado].join('|'))
    .sort((a, b) => ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo) || (b.casco ? b.casco.ancho : 0) - (a.casco ? a.casco.ancho : 0));
}

// Textos para WhatsApp
export function textoPedido(modo, fichas, ajustes) {
  const l = [];
  if (modo === 'cascos') {
    const filas = pedidoCascos(fichas, ajustes);
    if (!filas.length) return 'Sin muebles medidos.';
    l.push('*Pedido de cascos*', 'Medidas en mm: ancho × alto × fondo');
    let g = null;
    filas.forEach(f => { if (f.grupo !== g) { g = f.grupo; l.push('', '*' + g + '*'); } l.push(f.cant + ' × ' + f.mueble + ' ' + f.ancho + ' × ' + f.alto + ' × ' + f.fondo + (f.color ? ' · ' + f.color : '') + ' (' + f.donde.join(', ') + ')'); });
    l.push('', 'Total: ' + filas.reduce((s, f) => s + f.cant, 0) + ' cascos');
  } else if (modo === 'frentes') {
    const filas = pedidoFrentes(fichas, ajustes);
    if (!filas.length) return 'Sin frentes que pedir.';
    l.push('*Pedido de frentes*', 'Medidas en mm: alto × ancho');
    let a = null;
    filas.forEach(f => { if (f.acabado !== a) { a = f.acabado; l.push('', '*' + a + '*'); } l.push(f.cant + ' × ' + f.pieza + ' ' + f.alto + ' × ' + f.ancho); });
    l.push('', 'Total: ' + filas.reduce((s, f) => s + f.cant, 0) + ' piezas');
  } else {
    const filas = pedidoJuntos(fichas, ajustes);
    if (!filas.length) return 'Sin muebles medidos.';
    l.push('*Pedido de muebles (casco y frentes)*', 'Medidas en mm: casco ancho × alto × fondo; frentes alto × ancho');
    let g = null;
    filas.forEach(f => {
      if (f.grupo !== g) { g = f.grupo; l.push('', '*' + g + '*'); }
      l.push(f.cant + ' × ' + f.mueble + (f.casco ? ' ' + f.casco.ancho + ' × ' + f.casco.alto + ' × ' + f.casco.fondo + (f.casco.color ? ' · casco ' + f.casco.color : '') : ' (sin casco)') + (f.frentes ? ' · frentes: ' + f.frentes + ' · ' + f.acabado : '') + ' (' + f.donde.join(', ') + ')');
    });
    l.push('', 'Total: ' + filas.reduce((s, f) => s + f.cant, 0) + ' muebles');
  }
  return l.join('\n');
}

// ── Puertas de paso: la puerta que se pide (del premarco, la del catálogo que le toca; si no, la medida apuntada), su tipo
// y el galce (grueso del tabique), con cuántas abren a cada lado, condena y vidriera. Tapetas: de 7, 9 o a medida (se
// elige en la ficha de puertas): por puerta, 4 largas (2 por cara) y 2 cabezales (1 por cara). Los cabezales van aparte:
// de una tira de cabezal salen 2, así que va 1 tira por puerta; en doble bandera (más ancha), 1 cabezal por tira: 2 tiras.
// Las correderas de granero van por fuera: sin marco (galce) ni tapetas.
export const TAPETAS = [[70, '7 cm'], [90, '9 cm'], ['especial', 'Medida especial']];
export const anchoTapeta = d => (d.tapeta === 'especial' ? (d.tapeta_mm > 0 ? d.tapeta_mm : null) : d.tapeta || null);
export function pedidoPuertas(fichas, ajustes) {
  const filas = [], tapetas = new Map(), sinTapeta = [], galces = new Map(), sinTipoCorredera = [];
  fichas.map(normalizarFicha).filter(f => f.tipo === 'puerta').forEach(f => {
    const d = f.datos, acabado = [d.modelo, d.color].filter(Boolean).join(' ') || 'sin apuntar', t = anchoTapeta(d);
    (d.puertas || []).forEach(p0 => {
      const p = p0.fijo ? Object.assign({}, p0, { ancho: anchoPuerta(p0) }) : p0, premarco = d.medida === 'premarco';
      let an = p.ancho, al = p.alto, nota = '';
      if (premarco && hay(p.ancho) && hay(p.alto) && p.tipo !== 'doble' && p.tipo !== 'corredera') {
        const q = puertaParaPremarco(p.ancho, p.alto, ajustes);
        if (q.ancho && q.alto) { an = q.ancho.w; al = q.alto.w; nota = [q.ancho.rebaje ? 'rebajar ' + q.ancho.rebaje + ' de ancho' : '', q.alto.rebaje ? 'rebajar ' + q.alto.rebaje + ' de alto' : ''].filter(Boolean).join(' y '); }
        else nota = 'sin puerta de serie que encaje';
      }
      const tipo = esDeEntrada(p) ? 'Entrada' : p.tipo === 'corredera' ? (p.corredera === 'granero' ? 'Corredera de granero' : p.corredera === 'empotrada' ? 'Corredera empotrada' : 'Corredera') : p.tipo === 'doble' ? 'Doble' : 'Abatible';
      filas.push({ an, al, tipo, galce: hay(p.tabique) ? p.tabique : null, acabado, izq: p.mano === 'izq' ? 1 : 0, der: p.mano === 'der' ? 1 : 0,
        condena: p.condena ? 1 : 0, vidriera: p.vidriera ? 1 : 0, nota, cant: 1, donde: tituloFicha(f) + (p.nombre ? ': ' + p.nombre : '') });
      if (tipo === 'Entrada') return;
      if (tipo === 'Corredera') sinTipoCorredera.push(tituloFicha(f) + (p.nombre ? ': ' + p.nombre : ''));
      if (tipo === 'Corredera de granero') return;   // va por fuera: ni marco ni tapetas
      galces.set(hay(p.tabique) ? p.tabique : null, (galces.get(hay(p.tabique) ? p.tabique : null) || 0) + 1);
      if (!t) { sinTapeta.push(tituloFicha(f)); return; }
      const g = tapetas.get(t) || { largas: 0, cabezales: 0, tiras: 0 };
      g.largas += 4; g.cabezales += 2; g.tiras += p.tipo === 'doble' ? 2 : 1;
      tapetas.set(t, g);
    });
  });
  const m = new Map();
  filas.forEach(f => {
    const k = [f.tipo, f.an, f.al, f.galce, f.acabado, f.nota].join('|'), g = m.get(k);
    if (g) { ['cant', 'izq', 'der', 'condena', 'vidriera'].forEach(c => (g[c] += f[c])); if (!g.donde.includes(f.donde)) g.donde.push(f.donde); }
    else m.set(k, Object.assign({}, f, { donde: [f.donde] }));
  });
  const orden = ['Abatible', 'Doble', 'Corredera empotrada', 'Corredera', 'Corredera de granero', 'Entrada'];
  return { filas: [...m.values()].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo) || (b.an || 0) - (a.an || 0)), tapetas: [...tapetas], sinTapeta: [...new Set(sinTapeta)], sinTipoCorredera,
    galces: [...galces].sort((a, b) => (a[0] === null) - (b[0] === null) || (a[0] || 0) - (b[0] || 0)) };
}
const cmT = mm => String(Math.round(mm) / 10).replace('.', ',');
export function textoPedidoPuertas(fichas, ajustes) {
  const r = pedidoPuertas(fichas, ajustes);
  if (!r.filas.length) return 'Sin puertas medidas.';
  const l = ['*Pedido de puertas*', 'Medidas en cm: ancho × alto · galce'];
  r.filas.forEach(f => {
    const extra = [f.izq || f.der ? [f.izq ? f.izq + ' izq.' : '', f.der ? f.der + ' dcha.' : ''].filter(Boolean).join(', ') : '', f.condena ? f.condena + ' con condena' : '', f.vidriera ? f.vidriera + ' con vidriera' : '', f.nota].filter(Boolean);
    l.push(f.cant + ' × ' + f.tipo + ' ' + (hay(f.an) ? cmT(f.an) : '?') + ' × ' + (hay(f.al) ? cmT(f.al) : '?') + (hay(f.galce) ? ' · galce ' + cmT(f.galce) : ' · galce sin apuntar') + ' · ' + f.acabado + (extra.length ? ' (' + extra.join('; ') + ')' : ''));
  });
  l.push('', '*Galces (marcos)*', r.galces.map(([g, n]) => n + ' de ' + (g === null ? 'galce sin apuntar' : cmT(g) + ' cm')).join(' · '));
  l.push('', '*Tapetas y cabezales*');
  r.tapetas.forEach(([t, g]) => l.push('Tapetas de ' + cmT(t) + ' cm: ' + g.largas + ' largas (4 por puerta) · cabezales: ' + g.cabezales + ', en ' + g.tiras + (g.tiras === 1 ? ' tira' : ' tiras') + ' (de cada tira salen 2; en doble bandera, 1)'));
  if (r.sinTapeta.length) l.push('⚠ Falta elegir las tapetas (7, 9 o medida especial) en: ' + r.sinTapeta.join(', '));
  if (r.sinTipoCorredera.length) l.push('⚠ Corredera sin decir si es de granero o empotrada (cuento marco y tapetas como empotrada): ' + r.sinTipoCorredera.join(', '));
  if (r.filas.some(f => f.tipo === 'Corredera de granero')) l.push('Las correderas de granero van sin marco ni tapetas.');
  l.push('', 'Total: ' + r.filas.reduce((x, f) => x + f.cant, 0) + ' puertas');
  return l.join('\n');
}

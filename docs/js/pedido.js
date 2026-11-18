// Hojas de pedido de una cocina, a partir de los muebles medidos:
// - cascos (para el taller): cada mueble con su alto × ancho × fondo y el color del casco, juntando los iguales;
// - frentes (para el proveedor): puertas, cajones y frentes de electrodoméstico con alto × ancho y su acabado, juntando los iguales.
// Medidas en mm. Los altos salen de la cocina tipo (Ajustes) o de las alturas propias de la cocina (Acabados).
import { situarMuebles, esColumna, esLibre, nombreModulo } from './modulos.js';
import { frenteModulo, varianteDe } from './frentes.js';
import { ALTURAS } from './alzado.js';
import { CASCO } from './material.js';

const hay = v => v !== null && v !== undefined && v !== '';
const juntar = (filas, clave) => {
  const m = new Map();
  filas.forEach(f => { const k = clave(f); if (m.has(k)) { const g = m.get(k); g.cant += f.cant; if (f.pared && !g.paredes.includes(f.pared)) g.paredes.push(f.pared); } else m.set(k, Object.assign({}, f, { paredes: f.pared ? [f.pared] : [] })); });
  return [...m.values()];
};

// Cascos: bajos, columnas y altos (sin lavavajillas, lavadora, huecos, campana decorativa ni frigorífico libre)
export function pedidoCascos(d) {
  const filas = [], bajo = ALTURAS.encimera - ALTURAS.grueso_encimera - ALTURAS.zocalo, col = ALTURAS.columna - ALTURAS.zocalo, alto = ALTURAS.altos_hasta - ALTURAS.altos_desde;
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(({ m, desde, hasta }) => {
      if (['hueco', 'lavavajillas', 'lavadora'].includes(m.tipo) || (m.tipo === 'columna_frigo' && esLibre(m, d))) return;
      const c = esColumna(m);
      filas.push({ grupo: c ? 'Columnas' : 'Bajos', mueble: nombreModulo(m), ancho: Math.round(hasta - desde), alto: c ? col : bajo, fondo: CASCO.fondo_bajo, cant: 1, pared: p.letra });
    });
    sit.altos.forEach(({ m, desde, hasta }) => {
      if (['hueco', 'campana_deco'].includes(m.tipo)) return;
      filas.push({ grupo: 'Altos', mueble: nombreModulo(m), ancho: Math.round(hasta - desde), alto: m.tipo === 'alto_frigo' ? 400 : alto, fondo: CASCO.fondo_alto, cant: 1, pared: p.letra });
    });
  });
  const orden = ['Bajos', 'Columnas', 'Altos'];
  return juntar(filas, f => [f.grupo, f.mueble, f.ancho, f.alto, f.fondo].join('|')).sort((a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo) || b.ancho - a.ancho);
}

// Acabado de los frentes: el general o, si es bitono, el de altos o el de bajos (las columnas van con los altos)
export function acabadoFrente(d, deAltos) {
  const ac = d.acabados || {}, j = (...x) => x.filter(Boolean).join(' ');
  if (ac.bitono) return (deAltos ? j(ac.modelo_altos, ac.color_altos) : j(ac.modelo_bajos, ac.color_bajos)) || 'sin apuntar';
  return j(ac.modelo, ac.color) || 'sin apuntar';
}

// Frentes: puertas, cajones y frentes de lavavajillas o lavadora integrables
export function pedidoFrentes(d) {
  const filas = [];
  (d.paredes || []).filter(p => hay(p.largo)).forEach(p => {
    const sit = situarMuebles(p, d);
    const anotar = (m, ancho, z0, z1, opc, deAltos) => {
      const f = frenteModulo(m.tipo, ancho, z0, z1, opc);
      f.forEach((q, i) => {
        if (q.k !== 'hoja') return;
        const t = f[i + 1], cajon = t && t.k === 'tirador' && t.x1 - t.x0 > t.z1 - t.z0;
        const pieza = m.tipo === 'lavavajillas' || m.tipo === 'lavadora' ? 'Frente de ' + nombreModulo(m).toLowerCase() : cajon ? 'Cajón' : 'Puerta';
        filas.push({ pieza, alto: Math.round(q.z1 - q.z0), ancho: Math.round(q.x1 - q.x0), acabado: acabadoFrente(d, deAltos), cant: 1, pared: p.letra });
      });
    };
    sit.bajos.forEach(({ m, desde, hasta }) => {
      if (m.tipo === 'hueco' || (m.tipo === 'columna_frigo' && esLibre(m, d)) || ((m.tipo === 'lavavajillas' || m.tipo === 'lavadora') && esLibre(m, d))) return;
      if (esColumna(m)) anotar(m, hasta - desde, 0, ALTURAS.columna, { columna: true, variante: varianteDe(m, d) }, true);
      else anotar(m, hasta - desde, ALTURAS.zocalo, ALTURAS.encimera - ALTURAS.grueso_encimera, { variante: varianteDe(m, d) }, false);
    });
    sit.altos.forEach(({ m, desde, hasta }) => { if (m.tipo !== 'hueco') anotar(m, hasta - desde, ALTURAS.altos_desde, ALTURAS.altos_hasta, {}, true); });
  });
  return juntar(filas, f => [f.acabado, f.pieza, f.alto, f.ancho].join('|')).sort((a, b) => a.acabado.localeCompare(b.acabado, 'es') || a.pieza.localeCompare(b.pieza, 'es') || b.alto - a.alto || b.ancho - a.ancho);
}

// Texto para WhatsApp: «2 × Bajo 600 × 700 × 560 (A, B)»
export function textoPedidoCascos(d, casco) {
  const filas = pedidoCascos(d);
  if (!filas.length) return 'Sin muebles medidos.';
  const l = ['*Pedido de cascos*' + (casco ? ' · color ' + casco : ''), 'Medidas en mm: ancho × alto × fondo'];
  let g = null;
  filas.forEach(f => { if (f.grupo !== g) { g = f.grupo; l.push('', '*' + g + '*'); } l.push(f.cant + ' × ' + f.mueble + ' ' + f.ancho + ' × ' + f.alto + ' × ' + f.fondo + ' (pared ' + f.paredes.join(', ') + ')'); });
  return l.join('\n');
}
export function textoPedidoFrentes(d) {
  const filas = pedidoFrentes(d);
  if (!filas.length) return 'Sin frentes que pedir.';
  const l = ['*Pedido de frentes*', 'Medidas en mm: alto × ancho'];
  let a = null;
  filas.forEach(f => { if (f.acabado !== a) { a = f.acabado; l.push('', '*' + a + '*'); } l.push(f.cant + ' × ' + f.pieza + ' ' + f.alto + ' × ' + f.ancho); });
  l.push('', 'Total: ' + filas.reduce((s, f) => s + f.cant, 0) + ' piezas');
  return l.join('\n');
}

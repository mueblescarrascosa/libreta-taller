// Puntuación de una cocina (0–100): almacenaje, usabilidad y la nota total (la media de las dos).
// Almacenaje: «metros útiles» de cada mueble (un metro de cajones guarda más que uno de puertas; una despensa, mucho más),
// repartidos entre los metros de cocina. Usabilidad: parte de 100 y resta por cada consejo de diseño de placa, agua,
// frío, encimera y pasos (lo que funcionaría mal al usarla). Es orientativa: sirve para comparar propuestas.
import { situarMuebles, esColumna } from './modulos.js';
import { consejosDiseno } from './consejos.js';
import { varianteDe } from './frentes.js';

const hay = v => v !== null && v !== undefined && v !== '';
// Metros útiles por metro de ancho de cada mueble
export const UTIL = {
  cajonero: 1.3, bajo: 1.0, fregadero: 0.5, placa: 0.8, rinconero: 0.9, lavavajillas: 0, lavadora: 0, hueco: 0, otro: 0.5,
  despensero: 3.0, escobero: 2.0, columna_hmo: 0.8, columna_frigo: 0.3,
  alto: 0.8, alto_abierto: 0.5, alto_micro: 0.3, alto_campana: 0.3, alto_frigo: 0.3, campana_deco: 0,
};
const CON_CAJONES = /GAVETERO|CACEROLERO/;
export const DENSIDAD_BUENA = 2.0;   // metros útiles por metro de cocina que dan 100 en almacenaje
const RESTA_CONSEJO = 9;
const GRUPOS_USO = ['placa', 'agua', 'frio', 'encimera', 'paso'];
const m1 = v => Math.round(v / 100) / 10;   // mm → metros con un decimal

function utilDe(m, ancho, d) {
  if (m.tipo === 'placa' && m.horno) return 0.2 * ancho;
  if (m.tipo === 'rinconero') return (m.forma === 'recto' ? 0.5 : 0.9) * ancho;
  const v = varianteDe(m, d);
  if (v && CON_CAJONES.test(v) && ['bajo', 'placa', 'fregadero', 'cajonero'].includes(m.tipo)) return 1.3 * ancho;
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
      else if (u >= 1.3 * w - 1) cajones += w;
      else if (['bajo', 'fregadero', 'rinconero'].includes(m.tipo)) puertasBajas += w;
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

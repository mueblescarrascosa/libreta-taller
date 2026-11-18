// Frentes de los muebles: puertas, cajones, tiradores y electrodomésticos, para los dibujos (de frente y perspectiva).
// Todo en mm: x de 0 al ancho del mueble (de izquierda a derecha, mirándolo) y z desde el suelo.
// Cada trozo: { k, x0, x1, z0, z1 } con k = hoja (puerta o cajón), tirador, electro (horno, micro), cristal, campana, zocalo, tablero.
// Medidas orientativas: lo medido manda.
import { esLibre, altoHorno, LAVAVAJILLAS_ALTO, MICRO_LIBRE } from './modulos.js';
export const RINCON_FONDO = 600;   // lo que tapa del rincón el mueble de la otra pared
export const FRENTE = { zocalo: 100, holgura: 3, dos_puertas: 700, hmo_desde: 660, hmo_alto: 1000, horno: 600, cajones: 4 };

const TIRADOR = 120, GRUESO_T = 14;

// Puertas de un hueco (x0-x1, z0-z1): dos si es ancho (70 cm o más), una si no. tirador: 'arriba' (bajos), 'abajo' (altos), 'medio'.
function puertas(r, x0, x1, z0, z1, tirador, una = false) {
  const g = FRENTE.holgura, ancho = x1 - x0, alto = z1 - z0;
  if (ancho <= 2 * g || alto <= 2 * g) return;
  const hojas = !una && ancho >= FRENTE.dos_puertas ? [[x0, x0 + ancho / 2, 'der'], [x0 + ancho / 2, x1, 'izq']] : [[x0, x1, 'izq']];
  hojas.forEach(([a, b, abre]) => {
    r.push({ k: 'hoja', x0: a + g, x1: b - g, z0: z0 + g, z1: z1 - g });
    const tx = abre === 'der' ? b - g - 40 - GRUESO_T : a + g + 40, largo = Math.min(TIRADOR, alto / 3);
    const tz = tirador === 'abajo' ? z0 + g + 50 : tirador === 'medio' ? z0 + alto / 2 - largo / 2 : z1 - g - 50 - largo;
    r.push({ k: 'tirador', x0: tx, x1: tx + GRUESO_T, z0: tz, z1: tz + largo });
  });
}
// Cajones de abajo arriba, con el tirador horizontal arriba en el centro. n: cuántos iguales, o una lista de pesos
// (cacerolero 2, gavetero 1: «1 gavetero 2 caceroleros» = [2, 2, 1]).
function cajones(r, x0, x1, z0, z1, n) {
  const pesos = Array.isArray(n) ? n : Array(n).fill(1), total = pesos.reduce((s, p) => s + p, 0);
  const g = FRENTE.holgura, w = Math.min(TIRADOR * 1.5, (x1 - x0) / 2);
  let a = z0;
  for (let i = 0; i < pesos.length; i++) {
    const b = a + (z1 - z0) * pesos[i] / total;
    r.push({ k: 'hoja', x0: x0 + g, x1: x1 - g, z0: a + g, z1: b - g });
    const tz = b - g - 40 - GRUESO_T, cx = (x0 + x1) / 2;
    r.push({ k: 'tirador', x0: cx - w / 2, x1: cx + w / 2, z0: tz, z1: tz + GRUESO_T });
    a = b;
  }
}
// Cajones de cada modelo del catálogo de presupuestos (de abajo arriba).
const CAJONES_DE = { '4 GAVETEROS': 4, '5 GAVETEROS': 5, '2 CACEROLEROS': [1, 1], '1 GAVETERO 2 CACEROLEROS': [2, 2, 1], '2 GAVETEROS 1 CACEROLERO': [2, 1, 1] };

// Horno (con su cristal) y microondas (con su ventana) en un hueco de x 0-ancho, de z0 a z1.
function horno(r, ancho, z0, z1) {
  const m = 25;
  r.push({ k: 'electro', x0: m, x1: ancho - m, z0: z0 + 5, z1: z1 - 5 }, { k: 'cristal', x0: m + 60, x1: ancho - m - 60, z0: z0 + 60, z1: Math.max(z0 + 80, z1 - 140) });
}
function micro(r, ancho, z0, z1) {
  const m = 25;
  r.push({ k: 'electro', x0: m, x1: ancho - m, z0: z0 + 5, z1: z1 - 5 }, { k: 'cristal', x0: m + 40, x1: ancho * 0.62, z0: z0 + 50, z1: z1 - 50 });
}
const ALTO_MICRO = 400;
// El frente de un mueble de cocina (tipo de módulo) de ancho «ancho», que va de z0 a z1 (con el zócalo ya fuera en los bajos).
// columna: si es una columna (empieza en el suelo y lleva su zócalo).
// variante: el modelo elegido para el presupuesto (cajones, especiero, soporte de horno, H/MO con puerta…), si lo hay.
// modulo: el mueble, para lo que no va en la variante (alto del horno, qué electrodoméstico lleva la columna abajo y arriba).
export function frenteModulo(tipo, ancho, z0, z1, { columna = false, variante = null, rincon = null, zocalo = FRENTE.zocalo, modulo = null } = {}) {
  const r = [];
  if (!(ancho > 0) || !(z1 > z0) || tipo === 'hueco' || tipo === 'otro') return r;
  let base = z0;
  // El zócalo de la columna, el mismo de los bajos (el de la cocina): quien llama pasa ALTURAS.zocalo
  if (columna) { r.push({ k: 'zocalo', x0: 0, x1: ancho, z0, z1: z0 + zocalo }); base = z0 + zocalo; }
  // Bajos con un modelo elegido que cambia el frente.
  if (variante && ['bajo', 'cajonero', 'placa', 'fregadero'].includes(tipo)) {
    if (CAJONES_DE[variante]) { cajones(r, 0, ancho, base, z1, CAJONES_DE[variante]); return r; }
    if (variante === '1 GAVETERO 1 PUERTA') { const c = base + (z1 - base) * 0.78; puertas(r, 0, ancho, base, c, 'arriba'); cajones(r, 0, ancho, c, z1, 1); return r; }
    if (variante === 'ESPECIERO' || variante === 'PANERO') { puertas(r, 0, ancho, base, z1, 'medio'); return r; }
    if (variante.startsWith('SOPORTE HORNO')) {
      // Con cajón: el horno (de 45 o 60) arriba y el cajón llena lo que queda debajo
      const e0 = variante.includes('GAVETERO') ? Math.max(base + 60, z1 - altoHorno(modulo) - 10) : base;
      if (e0 > base) cajones(r, 0, ancho, base, e0, 1);
      r.push({ k: 'electro', x0: 25, x1: ancho - 25, z0: e0 + 5, z1: z1 - 5 }, { k: 'cristal', x0: 85, x1: ancho - 85, z0: e0 + 60, z1: z1 - 140 });
      return r;
    }
  }
  switch (tipo) {
    case 'cajonero': cajones(r, 0, ancho, base, z1, FRENTE.cajones); break;
    case 'placa': cajones(r, 0, ancho, base, z1, [2, 2, 1]); break;
    case 'lavavajillas': case 'lavadora': {
      const g = FRENTE.holgura;
      if (variante === 'LIBRE') {
        // De libre instalación: el aparato, sin puerta del mueble (la lavadora, con su ojo de buey).
        r.push({ k: 'acero', x0: 10, x1: ancho - 10, z0: base + 5, z1: z1 - 5 }, { k: 'electro', x0: 10, x1: ancho - 10, z0: z1 - 75, z1: z1 - 5 });
        if (tipo === 'lavadora') r.push({ k: 'cristal', x0: ancho / 2 - 150, x1: ancho / 2 + 150, z0: base + 140, z1: base + 440 });
        break;
      }
      r.push({ k: 'hoja', x0: g, x1: ancho - g, z0: base + g, z1: z1 - g });
      r.push({ k: 'tirador', x0: ancho / 2 - TIRADOR * 0.75, x1: ancho / 2 + TIRADOR * 0.75, z0: z1 - g - 40 - GRUESO_T, z1: z1 - g - 40 });
      break;
    }
    case 'columna_hmo': {
      // Horno y micro: un conjunto desde los 66 cm (horno de 45 o 60 abajo, micro encima); puertas debajo y encima.
      // «Puerta + electrodoméstico + …»: un solo aparato (el horno).
      const solo = (variante || '').includes('ELECTRODOM'), e0 = Math.max(base, FRENTE.hmo_desde), hz = Math.min(z1, e0 + altoHorno(modulo)), e1 = solo ? hz : Math.min(z1, hz + ALTO_MICRO);
      if (e0 > base + 50) { if (variante && variante.endsWith('+ PUERTA')) puertas(r, 0, ancho, base, e0, 'arriba'); else cajones(r, 0, ancho, base, e0, 2); }
      horno(r, ancho, e0, hz);
      if (e1 > hz + 50) micro(r, ancho, hz, e1);
      if (z1 > e1 + 50) puertas(r, 0, ancho, e1, z1, 'abajo');
      break;
    }
    case 'columna_electro': {
      // Abajo el electrodoméstico: el lavavajillas subido (frente fijo hasta los 28 cm y 85 de hueco); lo demás desde el
      // zócalo, del alto de un bajo. Arriba: horno y micro, uno de los dos con puerta encima, o solo puertas.
      const abajo = (modulo && modulo.abajo) || 'lavavajillas', arriba = (modulo && modulo.arriba) || 'puertas', g = FRENTE.holgura;
      let e = base;
      if (abajo === 'lavavajillas') {
        const a = Math.max(base + 50, LAVAVAJILLAS_ALTO.desde);
        r.push({ k: 'hoja', x0: g, x1: ancho - g, z0: base + g, z1: a - g });
        e = Math.min(z1, a + LAVAVAJILLAS_ALTO.hueco);
      } else e = Math.min(z1, base + 720);
      if (abajo === 'vinoteca') r.push({ k: 'electro', x0: 15, x1: ancho - 15, z0: base + 5, z1: e - 5 }, { k: 'cristal', x0: 60, x1: ancho - 60, z0: base + 60, z1: e - 90 });
      else {
        const a = abajo === 'lavavajillas' ? Math.max(base + 50, LAVAVAJILLAS_ALTO.desde) : base;
        r.push({ k: 'hoja', x0: g, x1: ancho - g, z0: a + g, z1: e - g });
        r.push({ k: 'tirador', x0: ancho / 2 - TIRADOR * 0.75, x1: ancho / 2 + TIRADOR * 0.75, z0: e - g - 40 - GRUESO_T, z1: e - g - 40 });
      }
      let s = e;
      if (arriba === 'hmo' || arriba === 'horno') { const hz = Math.min(z1, s + altoHorno(modulo)); horno(r, ancho, s, hz); s = hz; }
      if ((arriba === 'hmo' || arriba === 'micro') && z1 > s + 200) { const mz = Math.min(z1, s + ALTO_MICRO); micro(r, ancho, s, mz); s = mz; }
      if (z1 > s + 50) puertas(r, 0, ancho, s, z1, 'abajo');
      break;
    }
    case 'semicolumna': {
      // Semicolumna de 140: puertas, caceroleros, horno arriba con puerta debajo, o horno y micro con un cacerolero debajo.
      const v = variante || 'PUERTAS', h = altoHorno(modulo);
      if (v === '4-5 CACEROLEROS') { cajones(r, 0, ancho, base, z1, 4); break; }
      if (v === 'HORNO + 1 PUERTA') { const e0 = Math.max(base + 50, z1 - h - 10); horno(r, ancho, e0, z1 - 10); puertas(r, 0, ancho, base, e0, 'arriba'); break; }
      if (v === 'HORNO/MICROONDAS + 1 CACEROLERO') {
        const m0 = Math.max(base + 100, z1 - ALTO_MICRO - 10), e0 = Math.max(base + 50, m0 - h);
        micro(r, ancho, m0, z1 - 10); horno(r, ancho, e0, m0); cajones(r, 0, ancho, base, e0, 1); break;
      }
      puertas(r, 0, ancho, base, z1, 'medio');
      break;
    }
    case 'columna_frigo': {
      // Frigorífico integrado: congelador abajo, frigo encima y, si queda, un altillo arriba.
      const top = Math.min(z1, 1850), corte = base + Math.min(700, (top - base) * 0.4);
      puertas(r, 0, ancho, base, corte, 'arriba');
      puertas(r, 0, ancho, corte, top, 'abajo');
      if (z1 > top + 50) puertas(r, 0, ancho, top, z1, 'abajo');
      break;
    }
    case 'escobero': case 'despensero': {
      const top = z1 - base > 1900 ? base + 1750 : z1;
      puertas(r, 0, ancho, base, top, 'medio');
      if (z1 > top + 50) puertas(r, 0, ancho, top, z1, 'abajo');
      break;
    }
    case 'alto_campana': {
      if (variante === 'CAMPANA INTEGRABLE') {
        // Integrable: la puerta llega hasta abajo; de la campana solo se ve una ranura debajo.
        r.push({ k: 'campana', x0: 15, x1: ancho - 15, z0, z1: z0 + 22 });
        puertas(r, 0, ancho, z0 + 22, z1, 'abajo');
      } else {
        // Extraíble: visera de acero abajo, con su tirador, y la puerta encima.
        const c = Math.min(110, (z1 - z0) / 3);
        r.push({ k: 'acero', x0: 8, x1: ancho - 8, z0, z1: z0 + c }, { k: 'tirador', x0: ancho * 0.35, x1: ancho * 0.65, z0: z0 + 16, z1: z0 + 28 });
        puertas(r, 0, ancho, z0 + c, z1, 'abajo');
      }
      break;
    }
    case 'campana_deco': break;   // sin mueble: la pirámide la dibujan el alzado y la perspectiva
    case 'alto_micro': {
      const c = Math.min(380, (z1 - z0) * 0.6);
      if (ancho <= 550) {
        // De 50: hueco abierto con el microondas de libre instalación (46 × 29) dentro, y la puerta encima
        const w = Math.min(MICRO_LIBRE.ancho, ancho - 30), x0 = (ancho - w) / 2, a = Math.min(MICRO_LIBRE.alto, c - 30);
        r.push({ k: 'acero', x0, x1: x0 + w, z0: z0 + 15, z1: z0 + 15 + a }, { k: 'cristal', x0: x0 + 25, x1: x0 + w * 0.65, z0: z0 + 45, z1: z0 + a - 15 });
        if (z1 > z0 + c + 50) puertas(r, 0, ancho, z0 + c, z1, 'abajo');
        break;
      }
      r.push({ k: 'electro', x0: 25, x1: ancho - 25, z0: z0 + 5, z1: z0 + c - 5 });
      r.push({ k: 'cristal', x0: 65, x1: ancho * 0.62, z0: z0 + 50, z1: z0 + c - 50 });
      if (z1 > z0 + c + 50) puertas(r, 0, ancho, z0 + c, z1, 'abajo');
      break;
    }
    case 'alto': case 'alto_frigo':
      puertas(r, 0, ancho, base, z1, 'abajo'); break;
    case 'alto_abierto': {
      // Sin puerta: se ven las dos baldas.
      const h = z1 - z0;
      [1 / 3, 2 / 3].forEach(f => r.push({ k: 'tablero', x0: 0, x1: ancho, z0: z0 + h * f - 10, z1: z0 + h * f + 10 }));
      break;
    }
    case 'rinconero': {
      // En el rincón, el mueble de la otra pared tapa su fondo (60): solo se ve lo que queda.
      //  · En L: una puerta en esta cara (lado − 60) y otra en la otra cara (lado2 − 60; solo cuenta, no se dibuja aquí).
      //  · Recto (ciego): puerta solo en la parte que se ve (largo − 60); lo tapado no lleva.
      //  · Chaflán: una puerta en la diagonal, de (lado − 60) × √2.
      const F = RINCON_FONDO, forma = (rincon && rincon.forma) || 'L', esquinaIzq = rincon && rincon.gira === 'izq', g = FRENTE.holgura;
      if (forma === 'chaflan') {
        const diag = Math.round(Math.max(0, ancho - F) * Math.SQRT2);
        puertas(r, 0, ancho, base, z1, 'arriba', true);
        r.filter(q => q.k === 'hoja').forEach(q => (q.real = diag - 2 * g));
        break;
      }
      const vis = Math.max(0, ancho - F), x0 = esquinaIzq ? F : 0;
      if (vis > 2 * g) puertas(r, x0, x0 + vis, base, z1, 'arriba', true);
      if (forma === 'L' && rincon && rincon.lado2 > F) r.push({ k: 'hoja', x0: 0, x1: rincon.lado2 - F - 2 * g, z0: base + g, z1: z1 - g, soloCuenta: true, otraCara: true });
      break;
    }
    default: // bajo, fregadero…
      puertas(r, 0, ancho, base, z1, 'arriba');
  }
  return r;
}

// Cuerpo de vestidor (abierto): laterales y techo de tablero y su zócalo, para que se vea el mueble y no solo una caja.
export function frenteCuerpo(ancho, alto) {
  const t = 19, z = 80;
  if (!(ancho > 2 * t) || !(alto > z + t)) return [];
  return [{ k: 'zocalo', x0: t, x1: ancho - t, z0: 0, z1: z }, { k: 'tablero', x0: 0, x1: t, z0: 0, z1: alto },
    { k: 'tablero', x0: ancho - t, x1: ancho, z0: 0, z1: alto }, { k: 'tablero', x0: t, x1: ancho - t, z0: alto - t, z1: alto },
    { k: 'tablero', x0: t, x1: ancho - t, z0: z, z1: z + t }];
}

// Puertas de un cuerpo de vestidor (si las lleva): abatibles (de 60 cm como mucho cada una) o correderas (2 hojas, 3 si pasa de 1,5 m).
// Van por delante del interior, entre los laterales y del zócalo al techo del cuerpo.
export function puertasCuerpo(ancho, alto, tipo) {
  const r = [], t = 19, z0 = 80 + FRENTE.holgura, x0 = t, x1 = ancho - t;
  if (!tipo || !(ancho > 2 * t)) return r;
  if (tipo === 'corredera') {
    const n = ancho > 1500 ? 3 : 2, w = (x1 - x0) / n, solape = 30;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w - (i ? solape / 2 : 0), b = x0 + (i + 1) * w + (i < n - 1 ? solape / 2 : 0);
      r.push({ k: 'hoja', x0: a, x1: b, z0, z1: alto - t, pieza: 'corredera' });
      const tx = i === 0 ? b - 50 - GRUESO_T : a + 50;
      r.push({ k: 'tirador', x0: tx, x1: tx + GRUESO_T, z0: alto / 2 - 150, z1: alto / 2 + 150 });
    }
    return r;
  }
  const n = Math.max(1, Math.ceil((x1 - x0) / 600)), w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w, b = a + w, g = FRENTE.holgura, abre = i % 2 ? 'izq' : 'der';
    r.push({ k: 'hoja', x0: a + g, x1: b - g, z0, z1: alto - t - g, pieza: 'puerta' });
    const tx = abre === 'der' ? b - g - 40 - GRUESO_T : a + g + 40;
    r.push({ k: 'tirador', x0: tx, x1: tx + GRUESO_T, z0: 950, z1: 950 + TIRADOR * 1.5 });
  }
  return r;
}

// Frigorífico de libre instalación (sin puerta de mueble): una o, si es americano, dos puertas de acero.
export function frenteFrigoLibre(ancho, americano) {
  const r = [], alto = 1850, m = 15;
  if (americano) {
    r.push({ k: 'acero', x0: m, x1: ancho / 2 - 3, z0: 20, z1: alto }, { k: 'acero', x0: ancho / 2 + 3, x1: ancho - m, z0: 20, z1: alto });
    r.push({ k: 'tirador', x0: ancho / 2 - 40, x1: ancho / 2 - 26, z0: 900, z1: 1500 }, { k: 'tirador', x0: ancho / 2 + 26, x1: ancho / 2 + 40, z0: 900, z1: 1500 });
  } else {
    r.push({ k: 'acero', x0: m, x1: ancho - m, z0: 20, z1: 650 }, { k: 'acero', x0: m, x1: ancho - m, z0: 660, z1: alto });
    r.push({ k: 'tirador', x0: m + 30, x1: m + 44, z0: 400, z1: 620 }, { k: 'tirador', x0: m + 30, x1: m + 44, z0: 700, z1: 1100 });
  }
  return r;
}

// Variante con la que se dibuja un mueble: la elegida o, en la placa con horno debajo, el soporte de horno.
// Variante de un alto de campana: la elegida o, si no, la que pide la campana de los electrodomésticos.
export function varianteAlto(m, d) {
  if (!m || m.tipo !== 'alto_campana') return null;
  if (m.variante) return m.variante;
  const c = ((d && d.electro) || []).find(e => e.clave === 'campana');
  return c && c.tipo === 'integrada' ? 'CAMPANA INTEGRABLE' : 'CAMPANA EXTRAÍBLE';
}
// Lavavajillas o lavadora de libre instalación: 'LIBRE' (se dibuja el aparato y no hay puerta).
export const varianteDe = (m, d) => (m && (m.tipo === 'lavavajillas' || m.tipo === 'lavadora') && esLibre(m, d) ? 'LIBRE' : varianteBase(m));
const varianteBase = m => (m ? m.variante || (m.tipo === 'placa' && m.horno ? 'SOPORTE HORNO Y 1 GAVETERO' : null) : null);

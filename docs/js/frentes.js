// Frentes de los muebles: puertas, cajones, tiradores y electrodomésticos, para los dibujos (de frente y perspectiva).
// Todo en mm: x de 0 al ancho del mueble (de izquierda a derecha, mirándolo) y z desde el suelo.
// Cada trozo: { k, x0, x1, z0, z1 } con k = hoja (puerta o cajón), tirador, electro (horno, micro), cristal, campana, zocalo, tablero.
// Medidas orientativas: lo medido manda.
export const FRENTE = { zocalo: 100, holgura: 3, dos_puertas: 700, hmo_desde: 660, hmo_alto: 1000, horno: 600, cajones: 4 };

const TIRADOR = 120, GRUESO_T = 14;

// Puertas de un hueco (x0-x1, z0-z1): dos si es ancho (70 cm o más), una si no. tirador: 'arriba' (bajos), 'abajo' (altos), 'medio'.
function puertas(r, x0, x1, z0, z1, tirador) {
  const g = FRENTE.holgura, ancho = x1 - x0, alto = z1 - z0;
  if (ancho <= 2 * g || alto <= 2 * g) return;
  const hojas = ancho >= FRENTE.dos_puertas ? [[x0, x0 + ancho / 2, 'der'], [x0 + ancho / 2, x1, 'izq']] : [[x0, x1, 'izq']];
  hojas.forEach(([a, b, abre]) => {
    r.push({ k: 'hoja', x0: a + g, x1: b - g, z0: z0 + g, z1: z1 - g });
    const tx = abre === 'der' ? b - g - 40 - GRUESO_T : a + g + 40, largo = Math.min(TIRADOR, alto / 3);
    const tz = tirador === 'abajo' ? z0 + g + 50 : tirador === 'medio' ? z0 + alto / 2 - largo / 2 : z1 - g - 50 - largo;
    r.push({ k: 'tirador', x0: tx, x1: tx + GRUESO_T, z0: tz, z1: tz + largo });
  });
}
// Cajones: n frentes iguales, de abajo arriba, con el tirador horizontal arriba en el centro.
function cajones(r, x0, x1, z0, z1, n) {
  const g = FRENTE.holgura, h = (z1 - z0) / n, w = Math.min(TIRADOR * 1.5, (x1 - x0) / 2);
  for (let i = 0; i < n; i++) {
    const a = z0 + i * h, b = a + h;
    r.push({ k: 'hoja', x0: x0 + g, x1: x1 - g, z0: a + g, z1: b - g });
    const tz = b - g - 40 - GRUESO_T, cx = (x0 + x1) / 2;
    r.push({ k: 'tirador', x0: cx - w / 2, x1: cx + w / 2, z0: tz, z1: tz + GRUESO_T });
  }
}

// El frente de un mueble de cocina (tipo de módulo) de ancho «ancho», que va de z0 a z1 (con el zócalo ya fuera en los bajos).
// columna: si es una columna (empieza en el suelo y lleva su zócalo).
export function frenteModulo(tipo, ancho, z0, z1, { columna = false } = {}) {
  const r = [];
  if (!(ancho > 0) || !(z1 > z0) || tipo === 'hueco' || tipo === 'otro') return r;
  let base = z0;
  if (columna) { r.push({ k: 'zocalo', x0: 0, x1: ancho, z0, z1: z0 + FRENTE.zocalo }); base = z0 + FRENTE.zocalo; }
  switch (tipo) {
    case 'cajonero': cajones(r, 0, ancho, base, z1, FRENTE.cajones); break;
    case 'placa': cajones(r, 0, ancho, base, z1, 3); break;
    case 'lavavajillas': {
      const g = FRENTE.holgura;
      r.push({ k: 'hoja', x0: g, x1: ancho - g, z0: base + g, z1: z1 - g });
      r.push({ k: 'tirador', x0: ancho / 2 - TIRADOR * 0.75, x1: ancho / 2 + TIRADOR * 0.75, z0: z1 - g - 40 - GRUESO_T, z1: z1 - g - 40 });
      break;
    }
    case 'columna_hmo': {
      // Horno y micro: un conjunto desde los 66 cm, de 1 m de alto (horno abajo, micro encima); puertas debajo y encima.
      const e0 = Math.max(base, FRENTE.hmo_desde), e1 = Math.min(z1, e0 + FRENTE.hmo_alto), hz = Math.min(e1, e0 + FRENTE.horno);
      if (e0 > base + 50) cajones(r, 0, ancho, base, e0, 2);
      const m = 25;
      r.push({ k: 'electro', x0: m, x1: ancho - m, z0: e0 + 5, z1: hz - 5 });
      r.push({ k: 'cristal', x0: m + 60, x1: ancho - m - 60, z0: e0 + 60, z1: hz - 140 });
      if (e1 > hz + 50) {
        r.push({ k: 'electro', x0: m, x1: ancho - m, z0: hz + 5, z1: e1 - 5 });
        r.push({ k: 'cristal', x0: m + 40, x1: ancho * 0.62, z0: hz + 50, z1: e1 - 50 });
      }
      if (z1 > e1 + 50) puertas(r, 0, ancho, e1, z1, 'abajo');
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
      // La campana integrada: una franja abajo; encima, la puerta.
      const c = Math.min(120, (z1 - z0) / 3);
      r.push({ k: 'campana', x0: 10, x1: ancho - 10, z0, z1: z0 + c });
      puertas(r, 0, ancho, z0 + c, z1, 'abajo');
      break;
    }
    case 'alto_micro': {
      const c = Math.min(380, (z1 - z0) * 0.6);
      r.push({ k: 'electro', x0: 25, x1: ancho - 25, z0: z0 + 5, z1: z0 + c - 5 });
      r.push({ k: 'cristal', x0: 65, x1: ancho * 0.62, z0: z0 + 50, z1: z0 + c - 50 });
      if (z1 > z0 + c + 50) puertas(r, 0, ancho, z0 + c, z1, 'abajo');
      break;
    }
    case 'alto': case 'alto_frigo':
      puertas(r, 0, ancho, base, z1, 'abajo'); break;
    default: // bajo, fregadero, rinconero…
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

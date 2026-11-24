// Relleno de bajos con medidas de verdad: anchos acabados en 0 o 5 cm; lo que sobre o falte lo absorben cajoneras y
// bajos de puertas (que se hacen a medida), nunca especieros, paneros ni electrodomésticos (medidas fijas).
// Cajoneras de 40 o más: con 30 o 35 cm, bajo de puertas; y una de 30 junto a una de 40 es una de 70.
export const PASO_ANCHO = 50;
// Anchos de catálogo (los de siempre): cuestan menos que los a medida
export const ANCHOS_NORMALES = [300, 400, 450, 500, 600, 800, 900];
export const ANCHO_MIN = { bajo: 300, cajonero: 400 };
export const ANCHO_MAX = { bajo: 1000, cajonero: 1200, placa: 1200, fregadero: 1200 };
// Muebles que se pueden ensanchar para tapar lo que sobra (a medida, de 5 en 5)
export const ENSANCHABLES = ['bajo', 'cajonero', 'placa', 'fregadero'];

// Rellenar L mm (de 5 en 5 cm): los menos muebles, mejor de catálogo, sin pasar de 90 si se puede y de anchos parecidos.
// tipo: 'cajonero' (junto a la placa) o 'bajo'; si es cajonero y con cajoneras no sale, entra algún bajo de puertas.
// Devuelve { piezas: [{ tipo, ancho }], sobra } (sobra < 5 cm, o L entera si no cabe nada).
export function rellenar(L, tipo = 'bajo') {
  const n = Math.floor(L / PASO_ANCHO), opciones = [];
  for (let w = ANCHO_MIN.bajo; w <= ANCHO_MAX.cajonero; w += PASO_ANCHO) {
    // Con cajoneras: de 40 a 120; los de 30 y 35, de puertas
    const t = tipo === 'cajonero' ? (w >= ANCHO_MIN.cajonero ? 'cajonero' : 'bajo') : (w <= ANCHO_MAX.bajo ? 'bajo' : 'cajonero');
    const coste = 1 + (ANCHOS_NORMALES.includes(w) ? 0 : 0.25) + (w > 900 ? 1.2 : 0) + (t !== tipo ? 0.4 : 0);
    opciones.push({ k: w / PASO_ANCHO, w, t, coste });
  }
  const mejor = new Array(n + 1).fill(null); mejor[0] = { c: 0, l: [] };
  for (let s = 0; s < n; s++) {
    const b = mejor[s]; if (!b) continue;
    opciones.forEach(o => {
      const t = s + o.k; if (t > n) return;
      // Anchos parecidos: un poco de coste por la diferencia con el anterior
      const prev = b.l[b.l.length - 1], c = b.c + o.coste + (prev ? Math.abs(prev.ancho - o.w) / 3000 : 0);
      if (!mejor[t] || c < mejor[t].c - 1e-9) mejor[t] = { c, l: b.l.concat([{ tipo: o.t, ancho: o.w }]) };
    });
  }
  let k = n; while (k > 0 && !mejor[k]) k--;
  const piezas = mejor[k] ? mejor[k].l : [];
  // Ordenados de ancho a estrecho no: se dejan como salen (el más ancho primero suele quedar mejor junto a la placa)
  return { piezas, sobra: L - k * PASO_ANCHO };
}

// Juntar en una fila de bajos los cajoneros (o bajos de puertas) seguidos donde uno es estrecho (30–35): «30 + 40 → 70».
// Devuelve [{ i, ancho, tipo }] con el índice del primero de cada pareja a juntar.
export function parejasEstrechas(bajos) {
  const r = [];
  for (let i = 0; i + 1 < bajos.length; i++) {
    const a = bajos[i], b = bajos[i + 1];
    if (!['bajo', 'cajonero'].includes(a.tipo) || !['bajo', 'cajonero'].includes(b.tipo) || (a.variante && a.variante !== 'PUERTAS' && a.tipo === 'bajo')) continue;
    const estrecha = x => x.tipo === 'cajonero' ? x.ancho < ANCHO_MIN.cajonero : x.ancho < 300;
    const w = a.ancho + b.ancho, tipo = a.tipo === 'cajonero' || b.tipo === 'cajonero' ? 'cajonero' : 'bajo';
    if ((estrecha(a) || estrecha(b) || (tipo === 'cajonero' && Math.min(a.ancho, b.ancho) <= 350)) && w <= ANCHO_MAX[tipo] && w % PASO_ANCHO === 0) { r.push({ i, ancho: w, tipo }); i++; }
  }
  return r;
}

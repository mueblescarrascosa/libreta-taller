// Medidas: siempre se guardan en milímetros enteros; la unidad solo afecta a cómo se ven y se teclean.
// Unidades: 'mm' (enteros), 'cm' (un decimal) y 'm' (hasta tres decimales, solo en paredes).
const MAL = { mm: null, error: 'formato' };

// Admite cuentas sencillas de sumar y restar: «240-1,5» o «80+12». El resultado no puede ser negativo.
export function leerMedida(texto, unidad) {
  const t = String(texto == null ? '' : texto).replace(/\s+/g, '');
  if (!t) return { mm: null, error: null };
  if (/[+-]/.test(t)) {
    const partes = t.split(/(?=[+-])/);
    if (!/^\d/.test(partes[0])) return MAL;
    let total = 0;
    for (const p of partes) {
      const signo = p[0] === '-' ? -1 : 1, r = leerUna(/^[+-]/.test(p) ? p.slice(1) : p, unidad);
      if (r.error || r.mm === null) return MAL;
      total += signo * r.mm;
    }
    return total < 0 ? MAL : { mm: total, error: null };
  }
  return leerUna(t, unidad);
}

function leerUna(t, unidad) {
  if (!t) return MAL;
  if (unidad === 'mm') return /^\d+$/.test(t) ? { mm: Number(t), error: null } : MAL;
  if (unidad === 'm') {
    const x = /^(\d+)(?:[.,](\d{1,3}))?$/.exec(t);
    return x ? { mm: Number(x[1]) * 1000 + Number((x[2] || '').padEnd(3, '0')), error: null } : MAL;
  }
  const m = /^(\d+)(?:[.,](\d))?$/.exec(t);
  if (!m) return MAL;
  return { mm: Number(m[1]) * 10 + Number(m[2] || 0), error: null };
}

export function verMedida(mm, unidad) {
  if (mm === null || mm === undefined) return '';
  if (unidad === 'mm') return String(mm);
  if (unidad === 'm') {
    const r = mm % 1000, dec = String(r).padStart(3, '0').replace(/0+$/, '');
    return (mm - r) / 1000 + (dec ? ',' + dec : '');
  }
  const d = mm % 10, e = (mm - d) / 10;
  return d ? e + ',' + d : String(e);
}

export function unidadDe(trabajo, ajustes) {
  return (trabajo && trabajo.unidad) || ajustes.unidad;
}

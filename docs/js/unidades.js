// Medidas: siempre se guardan en milímetros enteros; la unidad solo afecta a cómo se ven y se teclean.
const MAL = { mm: null, error: 'formato' };

export function leerMedida(texto, unidad) {
  const t = String(texto == null ? '' : texto).trim();
  if (!t) return { mm: null, error: null };
  if (unidad === 'mm') return /^\d+$/.test(t) ? { mm: Number(t), error: null } : MAL;
  const m = /^(\d+)(?:[.,](\d))?$/.exec(t);
  if (!m) return MAL;
  return { mm: Number(m[1]) * 10 + Number(m[2] || 0), error: null };
}

export function verMedida(mm, unidad) {
  if (mm === null || mm === undefined) return '';
  if (unidad === 'mm') return String(mm);
  const d = mm % 10, e = (mm - d) / 10;
  return d ? e + ',' + d : String(e);
}

export function unidadDe(trabajo, ajustes) {
  return (trabajo && trabajo.unidad) || ajustes.unidad;
}

// Rótulos que caben: busca cómo poner un texto dentro de un hueco (x0, y0, x1, y1, en unidades del dibujo) sin pisar
// lo ya puesto. Prueba, de más a menos grande: en horizontal, girado (de abajo arriba) y en dos líneas, en cada orientación.
// tamaños: lista de tamaños de letra (en unidades del dibujo). ancho: cuánto mide cada letra respecto al tamaño.
// Devuelve { tam, girar, lineas, caja } (caja: lo que ocupa, para apuntarlo en «puestos») o null si no cabe nada.
export function encajarRotulo(texto, hueco, { tamanos, ancho = 0.6, alto = 1.25, puestos = [], margen = 0.94 } = {}) {
  const t = String(texto), W = (hueco.x1 - hueco.x0) * margen, H = (hueco.y1 - hueco.y0) * margen;
  const cx = (hueco.x0 + hueco.x1) / 2, cy = (hueco.y0 + hueco.y1) / 2;
  const partes = t.lastIndexOf(' ') > 0 ? [t.slice(0, t.lastIndexOf(' ')), t.slice(t.lastIndexOf(' ') + 1)] : null;
  const pisa = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const tam of tamanos) {
    const opciones = [[[t], false], [[t], true]].concat(partes ? [[partes, false], [partes, true]] : []);
    for (const [lineas, girar] of opciones) {
      const largo = Math.max(...lineas.map(l => l.length)) * tam * ancho, grueso = lineas.length * tam * alto;
      const w = girar ? grueso : largo, h = girar ? largo : grueso;
      if (w > W || h > H) continue;
      const caja = { x: cx - w / 2, y: cy - h / 2, w, h };
      if (puestos.some(q => pisa(caja, q))) continue;
      return { tam, girar, lineas, caja, cx, cy };
    }
  }
  return null;
}

// Fondo blanco detrás de un rótulo encajado: las rayas del dibujo (puertas, tiradores…) pasan por detrás y no lo tachan.
export function fondoRotulo(el, r, tam) {
  const m = tam * 0.25, c = r.caja || { x: r.cx - 1, y: r.cy - 1, w: 2, h: 2 };
  return el('rect', { x: c.x - m, y: c.y - m * 0.6, width: c.w + 2 * m, height: c.h + 1.2 * m, rx: tam * 0.35, fill: '#ffffff', 'fill-opacity': 0.88, stroke: 'none', 'data-fondo-rotulo': '' });
}

// El <text> de un rótulo encajado (una o dos líneas, girado si toca). el: la función que crea nodos SVG.
export function textoRotulo(el, r, atributos) {
  const a = Object.assign({ x: r.cx, y: r.cy, 'font-size': r.tam, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, atributos);
  if (r.girar) a.transform = `rotate(-90 ${r.cx} ${r.cy})`;
  if (r.lineas.length === 1) return el('text', a, r.lineas[0]);
  const n = el('text', a), paso = r.tam * 1.15;
  r.lineas.forEach((l, i) => n.append(el('tspan', { x: r.cx, dy: i ? paso : -paso * (r.lineas.length - 1) / 2 }, l)));
  return n;
}

// Crea elementos del DOM. Los textos van siempre como texto: nada de lo escrito se interpreta como HTML.
export function h(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === false) return;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  });
  hijos.flat().forEach(x => { if (x !== null && x !== undefined && x !== false) e.append(x); });
  return e;
}

// Grupo de botones excluyentes. Con permitirVacio, tocar el activo lo desmarca.
export function segmentado({ acc, opciones, valor, alCambiar, permitirVacio }) {
  const botones = opciones.map(([v, texto]) => h('button', { type: 'button', 'data-acc': acc, 'data-v': String(v), class: v === valor ? 'on' : '', onclick: () => {
    const nuevo = permitirVacio && valor === v ? null : v;
    valor = nuevo;
    botones.forEach((b, i) => b.classList.toggle('on', opciones[i][0] === valor));
    alCambiar(nuevo);
  } }, texto));
  return h('div', { class: 'seg' }, botones);
}

export const NOMBRE_TIPO = { puerta: 'Puerta', cocina: 'Cocina', armario: 'Armario', nota: 'Nota' };
export const NOMBRE_SUBTIPO = { vestidor: 'Vestidor', corredera: 'Corredera', abatible: 'Abatible' };
export const tituloFicha = f => f.nombre || (f.subtipo ? NOMBRE_TIPO[f.tipo] + ' ' + NOMBRE_SUBTIPO[f.subtipo].toLowerCase() : NOMBRE_TIPO[f.tipo]);
export const vivos = l => l.filter(x => !x.borrado_at);

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

export const NOMBRE_TIPO = { puerta: 'Puertas', cocina: 'Cocina', armario: 'Armario', nota: 'Nota' };
export const NOMBRE_SUBTIPO = { vestidor: 'Vestidor', corredera: 'Corredera', abatible: 'Abatible' };
export const tituloFicha = f => (f.tipo === 'puerta' && f.nombre && !/puerta/i.test(f.nombre) ? 'Puertas · ' + f.nombre
  : f.nombre || (f.subtipo ? NOMBRE_TIPO[f.tipo] + ' ' + NOMBRE_SUBTIPO[f.subtipo].toLowerCase() : NOMBRE_TIPO[f.tipo]));
export const vivos = l => l.filter(x => !x.borrado_at);

// Iconos fijos de la cabecera (texto propio, sin datos del usuario).
const ICONOS = {
  resumen: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  editar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  descargar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  imprimir: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
  calculadora: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/></svg>',
  nube: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/><path d="M9.5 13l2 2 3.5-3.5"/></svg>',
  nube_subir: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/><path d="M12 16v-5M9.5 13.5 12 11l2.5 2.5"/></svg>',
  nube_mal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/><path d="M12 10.5v2.5M12 15.5h.01"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
};
export const svgIcono = nombre => ICONOS[nombre];
export function icono(el, nombre, etiqueta) {
  el.innerHTML = ICONOS[nombre];
  el.setAttribute('aria-label', etiqueta); el.title = etiqueta;
  return el;
}
// Botón de la barra con su icono y el nombre debajo (en el resumen, donde caben todos en una fila).
export function botonBarra(el, nombre, etiqueta) {
  el.classList.add('boton-barra');
  el.innerHTML = '<span class="ico">' + ICONOS[nombre] + '</span>';
  el.append(h('span', { class: 'et-barra' }, etiqueta));
  el.title = etiqueta;
  return el;
}

// Ayuda para quien empieza (1.25.0): bienvenida la primera vez, un trabajo de ejemplo para practicar,
// «Cómo rellenar esta ficha» en cada ficha (se puede cerrar) y la letra grande (se recuerda en este dispositivo).
import { h } from './util.js';
import { trabajoNuevo, fichaNueva, puertaNueva, elementoNuevo } from './modelo.js';
import { moduloNuevo } from './modulos.js';

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
export const GUIA = 'guia-uso.html';

// ── Letra grande ──
export function letraGrande(on) {
  if (on === undefined) on = ls.get('med-letra') === '1';
  document.documentElement.classList.toggle('letra-grande', on);
  ls.set('med-letra', on ? '1' : null);
  return on;
}

// ── Cómo rellenar cada ficha ──
const PASOS = {
  cocina: ['Altura del suelo al techo y el largo de cada pared (en metros).', 'En cada pared: ventanas, puertas, pilares, enchufes, tomas de agua, desagüe y salida de humos, con su distancia a la esquina.',
    'Los muebles bajos y altos de cada pared, de izquierda a derecha. La planta y los dibujos se hacen solos.', 'Acabados (colores, encimera, tirador) y electrodomésticos (con su ancho y alto).',
    'Revisa los avisos (en rojo) y los consejos de diseño (en azul), y pulsa «Terminar y ver resumen».'],
  puerta: ['Pon nombre a cada puerta (salón, baño…) con los botones rápidos.', 'Mide el ancho y el alto del hueco (o del premarco) y el grueso del tabique.', 'Marca hacia dónde abre y si lleva condena o cristal.', 'Pulsa «+ Añadir puerta» para la siguiente. Al terminar, «Terminar y ver resumen».'],
  armario: ['Ancho del hueco arriba, en medio y abajo.', 'Alto a la izquierda y a la derecha, y el fondo.', 'Si hay rodapié, su alto y grosor.', 'Los cuerpos por dentro (barras, cajones, baldas) y las puertas.'],
  vestidor: ['Altura del techo y el largo de cada pared.', 'Ventanas, puertas y enchufes de cada pared.', 'Los cuerpos de cada pared, de izquierda a derecha, con su interior.', 'Revisa los avisos y pulsa «Terminar y ver resumen».'],
  nota: ['Escribe lo que necesites recordar.', 'Añade medidas sueltas, fotos o un croquis con los botones de abajo.'],
};
export function comoRellenar(tipo, subtipo) {
  const clave = subtipo === 'vestidor' ? 'vestidor' : tipo, pasos = PASOS[clave];
  if (!pasos) return null;
  const caja = h('details', { class: 'tarjeta como-rellenar', 'data-acc': 'como-rellenar' });
  caja.open = ls.get('med-ayuda-' + clave) !== 'cerrada';
  caja.addEventListener('toggle', () => ls.set('med-ayuda-' + clave, caja.open ? null : 'cerrada'));
  caja.append(h('summary', {}, 'Cómo rellenar esta ficha'),
    h('ol', {}, pasos.map(p => h('li', {}, p))),
    h('p', { class: 'ayuda' }, 'Se guarda solo mientras escribes. ', h('a', { href: GUIA + '#' + clave, target: '_blank', rel: 'noopener' }, 'Más ayuda en la guía de uso'), '. Toca el título para plegar esta explicación.'));
  return caja;
}

// ── Trabajo de ejemplo ──
export async function crearEjemplo(App) {
  const r = () => crypto.randomUUID();
  const t = Object.assign(trabajoNuevo('Ejemplo para practicar', 'cm'), { cliente: 'Cliente de ejemplo', direccion: 'Calle de práctica 1' });
  if (App.trabajoDatos) t.datos = {};
  await App.guardarFila('trabajos', t);
  const p = fichaNueva('puerta', null, t.id);
  p.nombre = 'Puertas';
  p.datos.puertas = [['Entrada', 960, 2060, 'izq'], ['Salón', 860, 2060, 'der'], ['Cocina', 850, 2050, 'izq'], ['Baño', 760, 2060, 'izq'], ['Habitación', 860, 2060, 'der']]
    .map(([nombre, ancho, alto, mano]) => Object.assign(puertaNueva(), { nombre, ancho, alto, tabique: 90, mano, condena: nombre === 'Baño' }));
  await App.guardarFila('fichas', p);
  const c = fichaNueva('cocina', null, t.id);
  const m = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o || {});
  const e = (tipo, o) => Object.assign(elementoNuevo(tipo, 'izq'), o);
  c.creado_at = new Date(Date.now() + 1000).toISOString();
  Object.assign(c.datos, { alto_techo: 2600 });
  c.datos.paredes = [
    Object.assign(c.datos.paredes[0], { largo: 3600, elementos: [e('ventana', { distancia: 1500, ancho: 1200, altura: 1100, alto: 1100 }), e('desague', { distancia: 1800, altura: 450 }), e('enchufe', { para: 'general', distancia: 1100, altura: 1100 })],
      bajos: [m('columna_frigo', 600), m('bajo', 600), m('fregadero', 800), m('lavavajillas', 600), m('rinconero', 1000, { forma: 'L', lado2: 950, gira: 'der' })],
      altos: [m('alto_frigo', 600), m('alto', 600), m('hueco', 1200), m('alto', 600)] }),
  ];
  const B = { id: r(), letra: 'B', largo: 3200, elementos: [e('humos', { distancia: 1400, altura: 2300, humos_forma: 'redonda', diametro: 150 })],
    bajos: [m('placa', 900, { horno: true }), m('cajonero', 600), m('columna_hmo', 600)], altos: [m('alto_campana', 900), m('alto', 600)] };
  c.datos.paredes.push(Object.assign({}, c.datos.paredes[0], { id: r() }, B));
  c.datos.notas = [{ id: r(), texto: 'Trabajo de ejemplo: cambia o borra lo que quieras.' }];
  await App.guardarFila('fichas', c);
  return t;
}

// ── Bienvenida (la primera vez) ──
export function bienvenida(App, { forzar = false } = {}) {
  if (!forzar && ls.get('med-bienvenida') === '1') return;
  ls.set('med-bienvenida', '1');
  const capa = h('div', { class: 'capa-ayuda', role: 'dialog', 'aria-modal': 'true', 'data-acc': 'bienvenida' });
  const cerrar = () => capa.remove();
  capa.append(h('div', { class: 'caja-ayuda' },
    h('h2', {}, 'Bienvenido a la Libreta Taller'),
    h('p', {}, 'Aquí se apuntan las medidas de cada obra. Así se usa:'),
    h('ol', {},
      h('li', {}, h('b', {}, '+ Nuevo trabajo'), ': uno por cliente u obra.'),
      h('li', {}, 'Dentro del trabajo, una ', h('b', {}, 'ficha'), ' por cosa que medir: puertas, cocina, armario o una nota.'),
      h('li', {}, 'Cada ficha explica arriba cómo rellenarla. ', h('b', {}, 'Se guarda sola'), ' mientras escribes.'),
      h('li', {}, 'Al terminar, ', h('b', {}, 'Resumen'), ' para verlo limpio, imprimirlo o mandarlo por WhatsApp.')),
    h('p', {}, 'Para practicar sin miedo, crea un trabajo de ejemplo: luego se borra como cualquier otro.'),
    h('div', { class: 'botones-ayuda' },
      h('button', { type: 'button', class: 'prin', 'data-acc': 'bienvenida-empezar', onclick: cerrar }, 'Empezar'),
      h('button', { type: 'button', 'data-acc': 'bienvenida-ejemplo', onclick: async () => { cerrar(); const t = await crearEjemplo(App); App.ir('#/trabajo/' + t.id); } }, 'Crear un trabajo de ejemplo'),
      h('a', { class: 'boton-enlace', href: GUIA, target: '_blank', rel: 'noopener', 'data-acc': 'bienvenida-guia' }, 'Guía de uso'))));
  capa.addEventListener('click', ev => { if (ev.target === capa) cerrar(); });
  document.body.append(capa);
}

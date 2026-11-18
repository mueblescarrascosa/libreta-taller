// La perspectiva con su planta pequeña: tocar en la planta dónde te pones y arrastrar hacia dónde miras;
// deslizar sobre el dibujo para girar. Lo elegido se guarda en la ficha (d.vista, en mm) y sale igual en el resumen.
import { h, reemplazar } from '../util.js';
import { escenaPerspectiva, vistaDe, vistaPorDefecto, svgPerspectiva, OJOS, INCLINACION, ALTURAS_OJOS, INCLINACIONES } from '../perspectiva.js';
import { svgPlanta } from '../plano-vista.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (t, a) => { const e = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

export function vistaInteractiva({ d, margen, ajustes = null, alGuardar, grande = false, alAmpliar = null }) {
  const esc = escenaPerspectiva(d, { margen, ajustes });
  if (!esc) return h('small', { class: 'ayuda' }, 'Pon los largos de las paredes para verla en perspectiva.');
  let vista = Object.assign({}, vistaDe(esc, d.vista));
  const zonaVista = h('div', { class: 'vista-3d', 'data-acc': 'vista-3d' });
  let pendiente = false;
  const pintarVista = () => reemplazar(zonaVista, svgPerspectiva(esc, vista));
  const pronto = () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; pintarVista(); pintarMarca(); }); };
  const guardar = () => {
    d.vista = { x: Math.round(vista.x), y: Math.round(vista.y), ang: Math.round(vista.ang * 10) / 10 };
    if (Number.isFinite(vista.ojos)) d.vista.ojos = vista.ojos;
    if (Number.isFinite(vista.inc)) d.vista.inc = vista.inc;
    alGuardar();
  };
  // Altura de los ojos y cuánto se mira hacia abajo (se guardan con la vista)
  const ojos = () => (Number.isFinite(vista.ojos) ? vista.ojos : OJOS), inc = () => (Number.isFinite(vista.inc) ? vista.inc : INCLINACION);
  const fila = (acc, opciones, actual, poner) => h('div', { class: 'chips', 'data-acc': acc }, opciones.map(([v, t]) => h('button', { type: 'button', class: 'mini' + (v === actual() ? ' on' : ''), 'data-v': String(v), 'aria-pressed': String(v === actual()),
    onclick: ev => { poner(v); [...ev.currentTarget.parentNode.children].forEach(b => { const on = b === ev.currentTarget; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); guardar(); pronto(); } }, t)));
  const filaOjos = fila('perspectiva-ojos', ALTURAS_OJOS.map(v => [v, 'Ojos ' + v / 10]), ojos, v => { vista.ojos = v; });
  const filaInc = fila('perspectiva-mirada', INCLINACIONES, inc, v => { vista.inc = v; });

  // Planta pequeña con el punto donde estás y hacia dónde miras.
  const planta = svgPlanta(esc.geo);
  planta.classList.add('planta-vista'); planta.setAttribute('data-acc', 'planta-vista');
  const vb = planta.viewBox.baseVal, s = Math.max(vb.width, vb.height) / 40, marca = svgEl('g', { 'data-acc': 'marca-vista' });
  planta.append(marca);
  function pintarMarca() {
    const x = vista.x / esc.k, y = vista.y / esc.k, a = vista.ang * Math.PI / 180, L = s * 5, ab = Math.PI / 4;
    reemplazar(marca, 
      svgEl('polygon', { points: [[x, y], [x + L * Math.cos(a - ab), y + L * Math.sin(a - ab)], [x + L * Math.cos(a + ab), y + L * Math.sin(a + ab)]].map(p => p.join(',')).join(' '), fill: 'rgba(220,38,38,.22)', stroke: '#dc2626', 'stroke-width': s * 0.15 }),
      svgEl('circle', { cx: x, cy: y, r: s * 0.7, fill: '#dc2626' }));
  }
  const aPlanta = ev => { const p = planta.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(planta.getScreenCTM().inverse()); return { x: q.x * esc.k, y: q.y * esc.k }; };
  let desde = null;
  planta.addEventListener('pointerdown', ev => {
    ev.preventDefault(); desde = aPlanta(ev); vista.x = desde.x; vista.y = desde.y;
    try { planta.setPointerCapture(ev.pointerId); } catch { /* sin captura */ }
    pronto();
  });
  planta.addEventListener('pointermove', ev => {
    if (!desde) return;
    const p = aPlanta(ev);
    if (Math.hypot(p.x - desde.x, p.y - desde.y) > 120) { vista.ang = Math.atan2(p.y - desde.y, p.x - desde.x) * 180 / Math.PI; pronto(); }
  });
  const soltarPlanta = () => { if (!desde) return; desde = null; guardar(); };
  planta.addEventListener('pointerup', soltarPlanta); planta.addEventListener('pointercancel', soltarPlanta);

  // Deslizar sobre el dibujo: girar la cabeza (como arrastrar la imagen).
  let giro = null;
  zonaVista.addEventListener('pointerdown', ev => { giro = { x: ev.clientX, ang: vista.ang, ancho: zonaVista.getBoundingClientRect().width || 1 }; try { zonaVista.setPointerCapture(ev.pointerId); } catch { /* sin captura */ } });
  zonaVista.addEventListener('pointermove', ev => { if (!giro) return; vista.ang = giro.ang - (ev.clientX - giro.x) / giro.ancho * 90; pronto(); });
  const soltarVista = () => { if (!giro) return; const movido = giro.ang !== vista.ang; giro = null; if (movido) guardar(); };
  zonaVista.addEventListener('pointerup', soltarVista); zonaVista.addEventListener('pointercancel', soltarVista);

  pintarVista(); pintarMarca();
  return h('div', { class: 'perspectiva-ui' + (grande ? ' grande' : '') }, zonaVista,
    h('div', { class: 'perspectiva-control' }, planta,
      h('div', { class: 'perspectiva-botones' },
        h('small', { class: 'ayuda' }, 'Toca en la planta dónde te pones y arrastra hacia dónde miras. Desliza sobre el dibujo para girar. Alturas de muebles orientativas.'),
        filaOjos, filaInc,
        alAmpliar ? h('button', { type: 'button', class: 'mini', 'data-acc': 'perspectiva-grande', onclick: alAmpliar }, '⛶ Pantalla completa') : null,
        h('button', { type: 'button', class: 'mini', 'data-acc': 'perspectiva-inicial', onclick: () => { vista = vistaPorDefecto(esc); d.vista = null; alGuardar(); pronto(); } }, 'Vista inicial'))));
}

// A pantalla completa, encima de todo; al cerrar se repinta lo de debajo.
export function abrirPerspectivaGrande({ d, margen, ajustes = null, alGuardar, alCerrar }) {
  const capa = h('div', { class: 'capa-perspectiva', 'data-acc': 'capa-perspectiva' });
  const cerrar = () => { capa.remove(); document.removeEventListener('keydown', tecla); if (alCerrar) alCerrar(); };
  const tecla = ev => { if (ev.key === 'Escape') cerrar(); };
  capa.append(h('div', { class: 'cab' }, h('b', {}, 'Perspectiva'), h('button', { type: 'button', 'data-acc': 'cerrar-perspectiva', onclick: cerrar }, '✕ Cerrar')),
    vistaInteractiva({ d, margen, ajustes, alGuardar, grande: true }));
  document.addEventListener('keydown', tecla);
  document.body.append(capa);
  return capa;
}

// Campos de medida: teclado numérico, unidad del trabajo, botón de referencia y zona de avisos.
import { h } from './util.js';
import { leerMedida, verMedida } from './unidades.js';

const FLECHA = { izq: '|←', der: '→|' };
const TITULO_REF = { izq: 'Medido desde la pared izquierda', der: 'Medido hasta la pared derecha' };

export function botonRef(ref, alCambiar) {
  const b = h('button', { type: 'button', class: 'ref', 'data-acc': 'ref', 'data-v': ref, title: TITULO_REF[ref], 'aria-label': TITULO_REF[ref] }, FLECHA[ref]);
  b.addEventListener('click', () => {
    ref = ref === 'izq' ? 'der' : 'izq';
    b.textContent = FLECHA[ref]; b.dataset.v = ref; b.title = TITULO_REF[ref]; b.setAttribute('aria-label', TITULO_REF[ref]);
    alCambiar(ref);
  });
  return b;
}

// Si lo tecleado no es válido, se marca y la medida queda vacía: alCambiar(null, texto).
// Así nunca se guarda un trozo de lo que se estaba escribiendo (por ejemplo, 1 de «1.500»).
// rapidos: medidas habituales (en mm) como botones; el campo sigue admitiendo cualquier otra.
export function campoMedida({ etiqueta, acc, valor, mal, unidad, alCambiar, ref, alCambiarRef, aviso, rapidos }) {
  const msg = h('div', { class: 'msg-error' }), res = h('small', { class: 'resultado', 'data-acc': 'resultado' });
  const input = h('input', { 'data-acc': acc, inputmode: unidad === 'mm' ? 'numeric' : 'decimal', autocomplete: 'off', enterkeyhint: 'next', value: mal || verMedida(valor, unidad) });
  const botones = (rapidos || []).map(mm => h('button', { type: 'button', 'data-acc': 'rapido', 'data-v': String(mm), onclick: () => {
    input.value = verMedida(mm, unidad);
    aplicar();
  } }, verMedida(mm, unidad)));
  const caja = h('div', { class: 'campo', 'data-c': acc },
    etiqueta ? h('label', { class: 'et' }, etiqueta) : null,
    botones.length ? h('div', { class: 'chips rapidos' }, botones) : null,
    h('div', { class: 'med' }, ref ? botonRef(ref, alCambiarRef) : null, input,
      // «+» para sumar: el teclado numérico del móvil no lo trae. Solo se ve mientras se escribe en el campo.
      h('button', { type: 'button', class: 'mas', 'data-acc': 'mas', tabindex: '-1', 'aria-label': 'Sumar', onpointerdown: ev => ev.preventDefault(), onmousedown: ev => ev.preventDefault(),
        onclick: () => { input.value += '+'; input.focus(); aplicar(); } }, '+'),
      h('span', { class: 'ud' }, unidad)),
    res, msg, aviso ? h('div', { class: 'avisos', 'data-avisos': aviso }) : null);
  const marcar = r => {
    const cuenta = /\d\s*[+-]|[+-]\s*$/.test(input.value);
    caja.classList.toggle('error', !!r.error);
    msg.textContent = !r.error ? '' : cuenta ? 'Cuenta sin terminar' : unidad === 'mm' ? 'En milímetros, sin decimales' : unidad === 'm' ? 'En metros, con tres decimales como mucho' : 'En centímetros, con un decimal como mucho';
    res.textContent = cuenta && !r.error && r.mm !== null ? '= ' + verMedida(r.mm, unidad) + ' ' + unidad : '';
    botones.forEach(b => b.classList.toggle('on', !r.error && Number(b.dataset.v) === r.mm));
  };
  function aplicar() {
    const r = leerMedida(input.value, unidad);
    marcar(r);
    alCambiar(r.error ? null : r.mm, r.error ? input.value : null);
  }
  input.addEventListener('input', aplicar);
  marcar(leerMedida(input.value, unidad));
  return caja;
}

export function campoEntero({ etiqueta, acc, valor, alCambiar }) {
  const input = h('input', { 'data-acc': acc, inputmode: 'numeric', autocomplete: 'off', value: valor ?? '' });
  input.addEventListener('input', () => {
    const t = input.value.trim();
    if (/^\d*$/.test(t)) alCambiar(t ? Number(t) : null);
  });
  return h('div', { class: 'campo', 'data-c': acc }, h('label', { class: 'et' }, etiqueta), input);
}

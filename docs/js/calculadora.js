// Calculadora de bolsillo, siempre a mano desde la barra de arriba. Se abre encima de la pantalla sin perder nada
// y recuerda la última cuenta. Coma o punto para los decimales; + − × ÷ y paréntesis; teclado en el ordenador.
import { h } from './util.js';

// ── Cuentas (sin eval): números, + - * / y paréntesis, con el menos delante ──
function trozos(t) {
  const r = [], s = String(t).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[\d.,]/.test(c)) {
      let n = '';
      while (i < s.length && /[\d.,]/.test(s[i])) n += s[i++];
      if ((n.match(/[.,]/g) || []).length > 1) throw new Error('número');
      r.push({ n: parseFloat(n.replace(',', '.')) });
      continue;
    }
    if ('+-*/()'.includes(c)) { r.push({ o: c }); i++; continue; }
    throw new Error('carácter');
  }
  return r;
}

export function calcular(texto) {
  const t = trozos(texto);
  if (!t.length) return null;
  let i = 0;
  const ver = () => t[i], toma = () => t[i++];
  function suma() {
    let v = producto();
    while (ver() && (ver().o === '+' || ver().o === '-')) v = toma().o === '+' ? v + producto() : v - producto();
    return v;
  }
  function producto() {
    let v = unario();
    while (ver() && (ver().o === '*' || ver().o === '/')) {
      const o = toma().o, w = unario();
      if (o === '/' && w === 0) throw new Error('cero');
      v = o === '*' ? v * w : v / w;
    }
    return v;
  }
  function unario() {
    if (ver() && ver().o === '-') { toma(); return -unario(); }
    if (ver() && ver().o === '+') { toma(); return unario(); }
    const x = toma();
    if (!x) throw new Error('falta');
    if ('n' in x) {
      if (Number.isNaN(x.n)) throw new Error('número');
      return x.n;
    }
    if (x.o === '(') { const v = suma(); if (!ver() || ver().o !== ')') throw new Error('paréntesis'); toma(); return v; }
    throw new Error('falta');
  }
  const v = suma();
  if (i < t.length) throw new Error('sobra');
  return v;
}

// Resultado a la española, sin separador de miles (se confunde con medidas) y con hasta 4 decimales.
export const verNumero = v => String(Math.round(v * 10000) / 10000).replace('.', ',');

// ── Pantalla ──
let expr = '', ultima = '', recienIgual = false, abierta = null;

export function abrirCalculadora() {
  if (abierta) return;
  const pantallaExpr = h('div', { class: 'calc-expr', 'data-acc': 'calc-expr' });
  const pantallaRes = h('div', { class: 'calc-res', 'data-acc': 'calc-res' });
  const pantallaUlt = h('div', { class: 'calc-ult', 'data-acc': 'calc-ult' });
  function pintar() {
    pantallaExpr.textContent = expr || '0';
    let r = '';
    try { const v = calcular(expr); if (v !== null && /[-+*/×÷−]/.test(expr.replace(/^-/, ''))) r = '= ' + verNumero(v); } catch (e) { r = ''; }
    pantallaRes.textContent = r;
    pantallaUlt.textContent = ultima;
  }
  function pulsar(k) {
    if (k === 'C') { expr = ''; recienIgual = false; }
    else if (k === '⌫') { expr = expr.slice(0, -1); recienIgual = false; }
    else if (k === '=') {
      try {
        const v = calcular(expr);
        if (v !== null) { ultima = expr + ' = ' + verNumero(v); expr = verNumero(v); recienIgual = true; }
      } catch (e) { pantallaRes.textContent = 'Cuenta incompleta'; return; }
    } else {
      // Tras «=», un número empieza otra cuenta; un signo sigue con el resultado.
      if (recienIgual && /[\d,(]/.test(k)) expr = '';
      recienIgual = false;
      expr += k;
    }
    pintar();
  }
  const TECLAS = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', ',', '⌫', '='];
  const teclas = h('div', { class: 'calc-teclas' }, TECLAS.map(k => h('button', { type: 'button', 'data-acc': 'calc-tecla', 'data-v': k,
    class: k === '=' ? 'igual' : /[÷×−+()]/.test(k) ? 'op' : k === 'C' || k === '⌫' ? 'borrar' : '', onclick: () => pulsar(k) }, k)));
  const cerrar = () => { document.removeEventListener('keydown', teclado, true); fondo.remove(); abierta = null; };
  function teclado(ev) {
    const k = ev.key, mapa = { '*': '×', '/': '÷', '-': '−', '.': ',', Enter: '=', '=': '=', Backspace: '⌫', Delete: 'C', c: 'C', C: 'C' };
    if (k === 'Escape') { ev.preventDefault(); cerrar(); return; }
    const t = /^[\d+(),]$/.test(k) ? k : mapa[k];
    if (!t) return;
    ev.preventDefault(); ev.stopPropagation(); pulsar(t);
  }
  const panel = h('div', { class: 'calc', role: 'dialog', 'aria-label': 'Calculadora' },
    h('div', { class: 'calc-cab' }, h('b', {}, 'Calculadora'), h('button', { type: 'button', class: 'mini', 'data-acc': 'calc-cerrar', 'aria-label': 'Cerrar', onclick: cerrar }, '✕')),
    h('div', { class: 'calc-pantalla' }, pantallaUlt, pantallaExpr, pantallaRes), teclas);
  const fondo = h('div', { class: 'calc-fondo', 'data-acc': 'calculadora', onclick: ev => { if (ev.target === fondo) cerrar(); } }, panel);
  document.body.append(fondo);
  document.addEventListener('keydown', teclado, true);
  abierta = fondo;
  pintar();
}

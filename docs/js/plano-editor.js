// Editor del plano a pantalla completa: se dibuja la planta con el dedo, se endereza, se pide la medida
// de cada pared, se marcan esquinas descuadradas y diagonales, y se avisa si las medidas no cierran.
import { enderezar, reenderezar, comprobar, aEscala, letras } from './plano-geo.js';
import { leerMedida, verMedida } from './unidades.js';

const NS = 'http://www.w3.org/2000/svg';
const esquinaRecta = () => ({ estado: 'escuadra', sentido: null, mm: null, en: 1000 });

function el(tag, attrs, ...hijos) {
  const svg = ['svg', 'line', 'circle', 'text', 'polyline', 'polygon', 'g'].includes(tag);
  const e = svg ? document.createElementNS(NS, tag) : document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class' && !svg) e.className = v;
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  });
  hijos.flat().forEach(x => { if (x !== null && x !== undefined && x !== false) e.append(x); });
  return e;
}
// Punto del dedo en coordenadas del dibujo, sea cual sea el tamaño con que se muestre.
function aSvg(svg, ev) {
  const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  return { x: q.x, y: q.y };
}
const nParedes = p => (p.cerrada ? p.vertices.length : p.vertices.length - 1);

// largos: {A: mm, B: mm, ...} con lo que ya tenga la ficha. unidad: la de las paredes.
export function abrirPlano({ plano = null, largos = {}, unidad = 'm' } = {}) {
  return new Promise(resolver => {
    const st = { plano: null, sel: 0, esquina: null, diag: null, aviso: '' };
    const conLargos = p => Object.assign({ esquinas: p.vertices.map(esquinaRecta), diagonales: [] }, p, { largos: letras(nParedes(p)).map(l => largos[l] ?? null) });
    // Copia completa: lo que se toque aquí no llega a la ficha si se cancela.
    if (plano) st.plano = conLargos(JSON.parse(JSON.stringify(plano)));

    const lienzo = el('div', { class: 'plano-lienzo' }), panel = el('div', { class: 'plano-panel' });
    const cont = el('div', { class: 'plano-editor' },
      el('div', { class: 'boceto-barra' },
        el('button', { type: 'button', 'data-acc': 'cancelar-plano', onclick: () => salir(null) }, '✕'),
        el('b', { class: 'bb-titulo' }, 'Planta'),
        el('button', { type: 'button', class: 'bb-ok', 'data-acc': 'guardar-plano', onclick: () => salir(st.plano) }, 'Guardar')),
      lienzo, panel);
    document.body.append(cont);
    document.body.classList.add('sin-scroll');

    function salir(r) { cont.remove(); document.body.classList.remove('sin-scroll'); resolver(r); }

    // ── Dibujar ──
    function modoDibujo() {
      st.plano = null; st.esquina = null; st.diag = null;
      pintarPanel(); // primero el panel: cambia la altura que queda para el lienzo
      const r = lienzo.getBoundingClientRect(), W = Math.max(r.width, 100), H = Math.max(r.height, 100);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plano-svg', 'data-acc': 'zona-dibujo' });
      const linea = el('polyline', { fill: 'none', stroke: '#2563eb', 'stroke-width': 3, 'stroke-linejoin': 'round' });
      svg.append(linea);
      let pts = null;
      const punto = ev => aSvg(svg, ev);
      svg.addEventListener('pointerdown', ev => { ev.preventDefault(); svg.setPointerCapture(ev.pointerId); pts = [punto(ev)]; });
      svg.addEventListener('pointermove', ev => {
        if (!pts) return;
        (ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]).forEach(q => pts.push(punto(q)));
        linea.setAttribute('points', pts.map(p => p.x + ',' + p.y).join(' '));
      });
      const fin = () => {
        if (!pts) return;
        const r2 = enderezar(pts); pts = null;
        if (!r2) { st.aviso = 'No he entendido el dibujo. Repítelo con un trazo continuo, sin levantar el dedo.'; linea.setAttribute('points', ''); pintarPanel(); return; }
        st.aviso = ''; st.sel = 0;
        st.plano = conLargos({ vertices: r2.vertices, cerrada: r2.cerrada });
        pintar();
      };
      svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
      lienzo.replaceChildren(svg);
    }

    // ── Ver y medir ──
    function pintar() {
      if (!st.plano) return modoDibujo();
      pintarPanel(); // primero el panel; luego se mide el hueco que deja
      pintarLienzo();
    }
    // Al escribir medidas solo cambian el dibujo y los avisos: rehacer el panel se comería el toque en «Siguiente».
    function refrescarSuave() {
      pintarLienzo();
      const est = textoEstado(), e = panel.querySelector('[data-acc="estado-plano"]');
      if (e) { e.textContent = est.t; e.classList.toggle('ok', est.ok); }
      est.r.diagonales.forEach((d, j) => { const x = panel.querySelector('[data-diag="' + j + '"]'); if (x) x.textContent = textoDiagonal(d); });
    }
    function pintarLienzo() {
      const p = st.plano, escala = aEscala(p), pts = escala || p.vertices, m = nParedes(p), nombres = letras(m);
      const r = lienzo.getBoundingClientRect(), W = Math.max(r.width, 100), H = Math.max(r.height, 100);
      const xs = pts.map(v => v.x), ys = pts.map(v => v.y), x0 = Math.min(...xs), y0 = Math.min(...ys);
      const k = Math.min((W - 80) / (Math.max(...xs) - x0 || 1), (H - 80) / (Math.max(...ys) - y0 || 1));
      const vis = pts.map(v => ({ x: 40 + (v.x - x0) * k, y: 40 + (v.y - y0) * k }));
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plano-svg' });
      for (let i = 0; i < m; i++) {
        const a = vis[i], b = vis[(i + 1) % vis.length], sel = i === st.sel;
        const lon = Math.hypot(b.x - a.x, b.y - a.y) || 1, fuera = { x: (b.y - a.y) / lon, y: -(b.x - a.x) / lon };
        svg.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: sel ? '#b45309' : '#1f2937', 'stroke-width': sel ? 6 : 4 }));
        svg.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'transparent', 'stroke-width': 28, 'data-pared': String(i), onclick: () => { st.sel = i; st.esquina = null; pintar(); } }));
        svg.append(el('text', { x: (a.x + b.x) / 2 + fuera.x * 18, y: (a.y + b.y) / 2 + fuera.y * 18, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 15, 'font-weight': 700, fill: sel ? '#b45309' : '#111827', 'data-letra': nombres[i], 'pointer-events': 'none' },
          nombres[i] + (p.largos[i] !== null ? ' ' + verMedida(p.largos[i], unidad) : '')));
      }
      vis.forEach((v, i) => {
        if (!p.cerrada && (i === 0 || i === vis.length - 1)) return;
        const e = p.esquinas[i] || esquinaRecta(), marcada = st.esquina === i || (st.diag && st.diag.includes(i));
        const c = el('circle', { cx: v.x, cy: v.y, r: 11, fill: e.estado === 'descuadrada' ? '#dc2626' : marcada ? '#b45309' : '#fff', stroke: '#1f2937', 'stroke-width': 2, 'data-esquina': String(i) });
        arrastrable(c, i, escala ? null : { x0, y0, k });
        svg.append(c);
      });
      (p.diagonales || []).forEach(dg => {
        const a = vis[dg.de], b = vis[dg.a];
        if (a && b) svg.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#2563eb', 'stroke-width': 2, 'stroke-dasharray': '6 5', 'pointer-events': 'none' }));
      });
      lienzo.replaceChildren(svg);
    }

    // Tocar una esquina la elige; arrastrarla (antes de que cierre a escala) corrige el dibujo.
    function arrastrable(c, i, tr) {
      let ini = null, movido = false;
      c.addEventListener('pointerdown', ev => { ev.stopPropagation(); c.setPointerCapture(ev.pointerId); ini = { x: ev.clientX, y: ev.clientY }; movido = false; });
      c.addEventListener('pointermove', ev => {
        if (!ini || !tr) return;
        const dx = ev.clientX - ini.x, dy = ev.clientY - ini.y;
        if (!movido && Math.hypot(dx, dy) < 8) return;
        movido = true;
        const q = aSvg(c.ownerSVGElement, ev);
        c.setAttribute('cx', q.x); c.setAttribute('cy', q.y);
      });
      c.addEventListener('pointerup', ev => {
        if (!ini) return;
        ini = null;
        if (movido && tr) {
          const v = st.plano.vertices[i];
          v.x = tr.x0 + (Number(c.getAttribute('cx')) - 40) / tr.k; v.y = tr.y0 + (Number(c.getAttribute('cy')) - 40) / tr.k;
          st.plano.vertices = reenderezar(st.plano.vertices, st.plano.cerrada); // lo casi recto vuelve a 90°
          return pintar();
        }
        tocarEsquina(i);
      });
    }

    function tocarEsquina(i) {
      if (st.diag) {
        if (!st.diag.includes(i)) st.diag.push(i);
        if (st.diag.length === 2) st.plano.diagonales.push({ de: st.diag[0], a: st.diag[1], mm: null });
        if (st.diag.length === 2) st.diag = null;
      } else st.esquina = st.esquina === i ? null : i;
      pintar();
    }

    function textoEstado() {
      const p = st.plano, r = comprobar(p), n = letras(nParedes(p)), mm = v => Math.round(Math.abs(v)) + ' mm';
      let t;
      if (r.cierre === 'abierta') t = 'Figura abierta: no hay cierre que comprobar.';
      else if (r.cierre === 'sin_datos') t = 'Faltan largos: ' + r.faltan.map(i => n[i]).join(', ') + '.';
      else if (r.cierre === 'no_comprobable' && r.motivo === 'esquina_no_recta') t = 'La esquina ' + n[(r.esquina - 1 + n.length) % n.length] + '–' + n[r.esquina % n.length] + ' no es recta en el dibujo: con los largos no se puede comprobar si cierra.';
      else if (r.cierre === 'no_comprobable') t = 'Hay una esquina descuadrada sin medir: no se puede comprobar si cierra.';
      else if (r.cierre === 'ok') t = '✓ Las medidas cierran.';
      else {
        const partes = [];
        if (Math.abs(r.errorX) > 10) partes.push(mm(r.errorX) + ' en la dirección de la pared A');
        if (Math.abs(r.errorY) > 10) partes.push(mm(r.errorY) + ' en la otra dirección');
        if (r.errorAngulo > 10) partes.push(mm(r.errorAngulo) + ' por el ángulo de la esquina ' + n[n.length - 1] + '–A');
        t = 'No cierra: falla ' + partes.join(' y ') + '. Revisa las paredes ' + r.paredes.map(i => n[i]).join(', ') + ' o marca una esquina descuadrada.';
      }
      return { t, r, ok: r.cierre === 'ok' };
    }

    function textoDiagonal(d) {
      const n = letras(nParedes(st.plano));
      return 'Diagonal ' + n[d.de] + '–' + n[d.a] + (d.calculada !== null ? ' (calculada ' + verMedida(Math.round(d.calculada), unidad) + ' ' + unidad + ')' : '') + (d.ok === false ? ' ✗ no coincide' : d.ok ? ' ✓' : '');
    }

    function campo(acc, valor, ud, alCambiar) {
      const input = el('input', { 'data-acc': acc, inputmode: ud === 'mm' ? 'numeric' : 'decimal', autocomplete: 'off', value: verMedida(valor, ud) });
      const msg = el('span', { class: 'msg-error' });
      input.addEventListener('input', () => {
        const r = leerMedida(input.value, ud);
        msg.textContent = r.error ? 'Formato no válido' : '';
        alCambiar(r.error ? null : r.mm);
        refrescarSuave();
      });
      return [el('div', { class: 'med' }, input, el('span', { class: 'ud' }, ud)), msg];
    }

    function pintarPanel() {
      if (!st.plano) {
        panel.replaceChildren(el('p', { class: 'aviso-plano' }, st.aviso || 'Dibuja la planta con el dedo, de un solo trazo. Se pondrá recta sola.'));
        return;
      }
      const p = st.plano, m = nParedes(p), n = letras(m), est = textoEstado();
      const filas = [el('div', { class: 'estado-plano' + (est.ok ? ' ok' : ''), 'data-acc': 'estado-plano' }, est.t)];
      est.r.diagonales.forEach((d, j) => {
        filas.push(el('div', { class: 'cab' }, el('small', { 'data-diag': String(j) }, textoDiagonal(d)),
          ...campo('diagonal', d.mm, unidad, v => { p.diagonales[j].mm = v; })));
      });
      if (st.esquina !== null) {
        const e = p.esquinas[st.esquina] = p.esquinas[st.esquina] || esquinaRecta(), i = st.esquina;
        const nombre = 'Esquina ' + n[(i - 1 + m) % m] + '–' + n[i % m];
        const botones = (acc, ops, valor, fn) => el('div', { class: 'seg' }, ops.map(([v, t]) => el('button', { type: 'button', 'data-acc': acc, 'data-v': v, class: v === valor ? 'on' : '', onclick: () => { fn(v); pintar(); } }, t)));
        filas.push(el('div', { class: 'tarjeta' }, el('b', {}, nombre),
          botones('esquina', [['escuadra', 'A escuadra'], ['descuadrada', 'Descuadrada']], e.estado, v => { e.estado = v; }),
          e.estado === 'descuadrada' ? botones('sentido', [['abierta', 'Abierta (más de 90°)'], ['cerrada', 'Cerrada (menos de 90°)']], e.sentido, v => { e.sentido = v; }) : null,
          e.estado === 'descuadrada' ? el('div', { class: 'dos' },
            el('div', {}, el('small', {}, 'Se desvía'), ...campo('desvio', e.mm, 'mm', v => { e.mm = v; if (!e.sentido) e.sentido = 'abierta'; })),
            el('div', {}, el('small', {}, 'en una longitud de'), ...campo('desvio-en', e.en, 'mm', v => { e.en = v || 1000; }))) : null));
      } else {
        const i = st.sel;
        filas.push(el('div', { class: 'fila-pared' }, el('b', {}, 'Pared ' + n[i]),
          ...campo('largo-pared', p.largos[i], unidad, v => { p.largos[i] = v; }),
          el('button', { type: 'button', class: 'prin', 'data-acc': 'siguiente-pared', onclick: () => { st.sel = (st.sel + 1) % m; pintar(); const x = panel.querySelector('[data-acc="largo-pared"]'); if (x) x.focus(); } }, 'Siguiente')));
      }
      filas.push(el('div', { class: 'chips' },
        el('button', { type: 'button', 'data-acc': 'anadir-diagonal', class: st.diag ? 'on' : '', onclick: () => { st.diag = st.diag ? null : []; st.esquina = null; pintar(); } }, st.diag ? 'Toca dos esquinas…' : 'Añadir diagonal'),
        // Invertir solo con una pared suelta: con varias cruzaría largos y elementos de paredes distintas.
        p.cerrada || p.vertices.length !== 2 ? null : el('button', { type: 'button', 'data-acc': 'invertir', onclick: () => { p.vertices.reverse(); p.esquinas.reverse(); p.largos.reverse(); pintar(); } }, 'Invertir sentido'),
        el('button', { type: 'button', 'data-acc': 'repetir', onclick: () => { if (confirm('¿Borrar el dibujo y empezar otra vez? Las medidas de las paredes se mantienen.')) modoDibujo(); } }, 'Repetir dibujo')));
      panel.replaceChildren(...filas);
    }

    requestAnimationFrame(() => pintar());
  });
}

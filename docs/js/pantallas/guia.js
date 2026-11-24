// Guía de medidas para diseñar una cocina. Parte de la cocina tipo (Ajustes; por defecto zócalo 15 + mueble 70 +
// encimera 4) y de las mismas medidas de referencia que usan los consejos de diseño (consejos.js: MEDIDAS).
import { h, reemplazar } from '../util.js';
import { MEDIDAS as M } from '../consejos.js';
import { TENDENCIAS_BASE, cargarTendencias } from '../tendencias.js';
import { NORMAS_INTERIOR as NI } from '../interior.js';

const cm = mm => String(Math.round(mm) / 10).replace('.', ',') + ' cm';
// Piezas con las que se juega para llegar a una altura de encimera (mm).
export const PIEZAS = { zocalos: [60, 100, 150], muebles: [700, 800], gruesos: [12, 20, 30, 40], altos: [900, 800, 700] };
// Lo de siempre: zócalo de 10 o 15 y encimera de 4 o 2; la estándar, 15 + 70 + 4. Zócalo de 6 y encimera de 3 o 1,2, casos especiales.
const ESTANDAR = '150+700+40', ZOCALO_NORMAL = [100, 150], GRUESO_NORMAL = [40, 20], MARGEN = 20;   // ±2 cm sobre la altura ideal
const GRUESO = { 12: 'porcelánico', 20: 'cuarzo o compacto', 30: 'laminado o cuarzo', 40: 'laminado' };
export const clase = o => (o.zocalo + '+' + o.mueble + '+' + o.grueso === ESTANDAR ? 'estandar' : ZOCALO_NORMAL.includes(o.zocalo) && GRUESO_NORMAL.includes(o.grueso) ? 'normal' : 'especial');

// Altura cómoda de encimera: la mitad de la estatura más 3 cm (170 → 88, 176 → 91, 180 → 93), la parte baja de las
// tablas de ergonomía (10–15 cm por debajo del codo): ante la duda, más baja. Con placa de gas, 3 cm menos (la parrilla
// sube unos 5). Lo normal, entre 85 y 95; más de 95 solo para quien pase de 1,85 (como mucho 100).
export const LIMITES_ENCIMERA = { min: 85, max: 95, maxAlto: 100 };
export function alturaEncimera(estatura, gas = false) {
  const e = Number(estatura);
  if (!e || e < 120 || e > 230) return null;
  const tope = e > 185 ? LIMITES_ENCIMERA.maxAlto : LIMITES_ENCIMERA.max;
  return Math.max(LIMITES_ENCIMERA.min - (gas ? 3 : 0), Math.min(tope, Math.round(e / 2 + 3 - (gas ? 3 : 0))));
}

// Las combinaciones zócalo + mueble + encimera para la altura que se busca (cm), por prioridad:
//  1) dentro de ±2 cm, la estándar (15 + 70 + 4), luego las normales (zócalo 10 o 15, encimera 4 o 2), y de ellas la más baja;
//  2) fuera del margen, pasarse cuenta el doble que quedarse corto (mejor baja que alta);
//  3) los casos especiales (zócalo de 6, encimera de 3 o 1,2) solo si no hay otra;
//  4) el hueco del lavavajillas NO mueve la cocina: si con gola no llega a 85, se arregla en ese frente (se avisa).
export function opcionesEncimera(objetivoCm, cuantas = 3, gola = false) {
  const obj = objetivoCm * 10, l = [];
  PIEZAS.zocalos.forEach(z => PIEZAS.muebles.forEach(m => PIEZAS.gruesos.forEach(g => {
    const o = { zocalo: z, mueble: m, grueso: g, altura: z + m + g, dif: z + m + g - obj, libre: z + m - (gola ? M.gola : 0) };
    o.clase = clase(o); o.normal = o.clase !== 'especial'; o.lavaOk = o.libre >= M.libre_electro;
    // Margen de ±2 cm: dentro de él, la diferencia no cuenta (manda que sea de las de siempre).
    const fuera = Math.max(0, Math.abs(o.dif) - MARGEN) * (o.dif > 0 ? 2 : 1);
    o.coste = fuera + (o.clase === 'estandar' ? 0 : o.clase === 'normal' ? 5 : 30) + (z === 60 ? 20 : 0);
    l.push(o);
  })));
  l.sort((a, b) => a.coste - b.coste || a.altura - b.altura || b.grueso - a.grueso);
  const vistas = new Set(), r = [];
  for (const o of l) { if (vistas.has(o.altura)) continue; vistas.add(o.altura); r.push(o); if (r.length === cuantas) break; }
  return r;
}

// Altos y columnas para una encimera: altos a 56 cm (55–60) sobre la encimera, de 90 si cabe (si no, 80 o 70);
// la columna, de la medida que la deja enrasada con los altos (lo que se pide es la columna sin el zócalo).
export function altosPara(op, techoMm) {
  const separacion = 560, desde = op.altura + separacion;
  const cabe = a => !techoMm || desde + a <= techoMm;
  const alto = PIEZAS.altos.find(cabe) || PIEZAS.altos[PIEZAS.altos.length - 1];
  const hasta = desde + alto;
  return { separacion, desde, alto, hasta, columna: hasta - op.zocalo, sobraTecho: techoMm ? techoMm - hasta : null };
}

// Electrodomésticos a la medida de la persona y de la cocina (estándar europeo de huecos):
//  · horno en columna: base unos 25 cm por debajo del codo (el codo, ≈ 63 % de la estatura);
//  · microondas: base unos 20 cm por encima del codo y al menos 25 cm por debajo de los ojos (estatura − 12), para ver dentro;
//  · frigo integrable: el hueco europeo más alto que cabe en la columna (deja encima un alto de 20 cm o más);
//  · lavavajillas y lavadora integrables: hueco libre = zócalo + mueble − gola (5,6) si la lleva; mínimo 85 cm.
export const HUECOS_FRIGO = [1940, 1780, 1580, 1400, 1220];
export function electroPara(estatura, op, al, gola = false) {
  const e = Number(estatura) * 10, codo = e * 0.63, ojos = e - 120, redondo = v => Math.round(v / 10) * 10;
  const horno = Math.max(700, Math.min(1000, redondo(codo - 250)));
  const micro = Math.max(1100, Math.min(1500, redondo(codo + 200), redondo(ojos - 250)));
  const juntos = horno + 600;   // micro justo encima del horno en la misma columna
  const frigo = HUECOS_FRIGO.find(f => f <= al.columna - 200) || null;
  const lava = op.zocalo + op.mueble - (gola ? M.gola : 0);
  return { horno, micro, juntos, juntosAlto: juntos > micro + 150, frigo, encimaFrigo: frigo ? al.columna - frigo : null,
    lavavajillas: lava, lavaTipo: lava < M.libre_electro ? 'corto' : lava > M.libre_electro_max ? 'sobra' : 'bien' };
}

const tabla = (cab, filas) => h('table', { class: 'tabla-guia' }, h('thead', {}, h('tr', {}, cab.map(t => h('th', {}, t)))),
  h('tbody', {}, filas.map(f => h('tr', {}, f.map(t => h('td', {}, t))))));
// data-apartado: el identificador fijo; el número que se ve va seguido (1, 2, 3…) y lo pone numerarGuia.
const apartado = (n, titulo, ...hijos) => h('section', { class: 'tarjeta guia-apartado', 'data-apartado': n, 'data-titulo': titulo }, h('h2', {}, titulo), ...hijos);
function numerarGuia(main) {
  const secs = [...main.querySelectorAll('.guia-apartado')];
  secs.forEach((s, i) => { s.querySelector('h2').textContent = (i + 1) + '. ' + s.dataset.titulo; });
  const indice = h('nav', { class: 'tarjeta guia-indice', 'data-acc': 'indice-guia', 'aria-label': 'Índice de la guía' }, h('b', {}, 'En esta guía'),
    h('ol', {}, secs.map(s => h('li', {}, h('button', { type: 'button', class: 'enlace', 'data-acc': 'ir-apartado', 'data-v': s.dataset.apartado,
      onclick: () => s.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, s.dataset.titulo)))));
  secs[0].before(indice);
}
const lista = items => h('ul', { class: 'guia-lista' }, items.map(([b, t]) => h('li', {}, h('b', {}, b), ' ', t)));
const nota = t => h('small', { class: 'ayuda' }, t);
// Colores y tendencias: del archivo de tendencias (se actualiza sin sacar versión); primero la copia de reserva.
function seccionTendencias() {
  const zona = h('div', { class: 'zona-tendencias', 'data-acc': 'tendencias' });
  const pintar = T => reemplazar(zona,
    nota('Al día de ' + T.actualizado.split('-').reverse().join('/') + '. En Presupuestos, la Guía de colores propone estas combinaciones como «Tendencia».'),
    lista(T.tendencias.map(x => [x.t + ':', x.r])),
    h('h3', {}, 'Combinaciones'),
    h('div', { class: 'combinaciones-tendencia' }, T.combinaciones.map(c => h('div', { class: 'combinacion-tendencia', 'data-acc': 'combinacion-tendencia' },
      h('span', { class: 'muestras' }, (c.muestras || []).map((hex, i) => h('i', { style: 'background:' + hex, title: ['Bajos', 'Altos', 'Encimera'][i] || '' }))),
      h('b', {}, c.t), ' ', h('small', {}, c.r)))),
    h('h3', {}, 'Para combinar bien'), h('ul', { class: 'guia-lista' }, T.consejos.map(t => h('li', {}, t))),
    h('h3', {}, 'Armarios y vestidores'), lista(T.armarios.map(x => [x.t + ':', x.r])),
    nota('Fuentes: ' + T.fuentes.map(f => f.nombre).join(' · ') + '.'));
  pintar(TENDENCIAS_BASE);
  cargarTendencias().then(T => { if (T !== TENDENCIAS_BASE && zona.isConnected !== false) pintar(T); }).catch(() => null);
  return apartado(14, 'Colores y tendencias', zona);
}
const suma = o => cm(o.zocalo) + ' + ' + cm(o.mueble) + ' + ' + cm(o.grueso);

export function pintarGuia(App, fichaId) {
  const main = App.marco('guia', 'Guía de medidas', fichaId ? '#/ficha/' + fichaId : '#/');

  // ── Calculadora: estatura (y gas, techo) → encimera, altos y columnas ──
  const est = h('input', { type: 'number', inputmode: 'numeric', min: '120', max: '230', placeholder: 'p. ej. 176', 'data-acc': 'estatura' });
  const techo = h('input', { type: 'number', inputmode: 'numeric', min: '200', max: '400', placeholder: 'opcional', 'data-acc': 'techo' });
  let gas = false, gola = false, elegida = 0;
  const botonGas = h('div', { class: 'chips' }, [[false, 'Inducción o vitro'], [true, 'Gas']].map(([v, t]) => h('button', { type: 'button', 'data-acc': 'placa-gas', 'data-v': String(v), class: v === gas ? 'on' : '',
    onclick: () => { gas = v; botonGas.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); pintar(); } }, t)));
  const botonGola = h('div', { class: 'chips' }, [[false, 'Tirador, uñero o integrado'], [true, 'Gola']].map(([v, t]) => h('button', { type: 'button', 'data-acc': 'gola', 'data-v': String(v), class: v === gola ? 'on' : '',
    onclick: () => { gola = v; botonGola.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); pintar(); } }, t)));
  const salida = h('div', { class: 'guia-resultado', 'data-res': 'encimera' }, 'Escribe la estatura de quien más cocina.');
  function pintar() {
    const a = alturaEncimera(est.value, gas);
    if (a === null) { reemplazar(salida, 'Escribe la estatura en cm (entre 120 y 230).'); return; }
    const ops = opcionesEncimera(a, 3, gola), t = Number(techo.value) > 0 ? Number(techo.value) * 10 : null;
    if (elegida >= ops.length) elegida = 0;
    const op = ops[elegida], al = altosPara(op, t);
    const tarjetas = ops.map((o, i) => h('button', { type: 'button', class: 'opcion-encimera' + (i === elegida ? ' on' : ''), 'data-acc': 'opcion-encimera', 'data-v': String(i), onclick: () => { elegida = i; pintar(); } },
      h('b', {}, cm(o.altura)), h('span', {}, suma(o)),
      h('small', {}, ({ estandar: 'La estándar', normal: 'Normal', especial: 'Caso especial' })[o.clase] + ' · encimera de ' + cm(o.grueso) + ' (' + GRUESO[o.grueso] + ')' + (o.dif ? ' · ' + (o.dif > 0 ? '+' : '') + cm(o.dif) : '')),
      h('small', { class: o.lavaOk ? 'lava-ok' : 'lava-mal' }, (o.lavaOk ? '✓ ' : '⚠ ') + 'lavavajillas: ' + cm(o.libre) + ' libres' + (o.lavaOk ? '' : ' (mínimo 85)'))));
    const usar = h('button', { type: 'button', 'data-acc': 'usar-cocina-tipo', onclick: async () => {
      await App.cambiarAjustes({ cocina_tipo: { zocalo: op.zocalo, mueble: op.mueble, grueso: op.grueso, alto_alto: al.alto, separacion: al.separacion } });
      usar.textContent = '✓ Es tu cocina tipo'; pintarTipo();
    } }, 'Usar como mi cocina tipo');
    reemplazar(salida, ...[
      h('p', {}, 'Encimera a unos ', h('b', {}, a + ' cm'), gas ? ' (3 cm menos por la parrilla del gas).' : '.'),
      h('div', { class: 'opciones-encimera' }, tarjetas),
      h('p', { 'data-res': 'altos' }, 'Altos de ', h('b', {}, cm(al.alto)), ' desde ', cm(al.desde), ' hasta ', cm(al.hasta), ' (', cm(al.separacion), ' sobre la encimera). ',
        'Columnas de ', h('b', {}, cm(al.columna)), ' sobre el zócalo de ', cm(op.zocalo), ': arriba enrasan con los altos.'),
      al.sobraTecho !== null ? nota(al.sobraTecho >= 0 ? 'Quedan ' + cm(al.sobraTecho) + ' hasta el techo' + (al.sobraTecho > 150 ? ': altillo o tapeta para no acumular polvo.' : '.') : 'No cabe ni con altos de 70: hay que recortar.') : null,
      gas ? nota('Con gas: campana a 75 cm sobre la placa (nunca menos de 65).') : null,
      (() => { const el = electroPara(est.value, op, al, gola); return h('div', { 'data-res': 'electro' },
        h('p', {}, 'Horno en columna: la base a ', h('b', {}, cm(el.horno)), ' del suelo (la bandeja sale a la altura de las manos, sin agacharse). ',
          'Microondas: la base a ', h('b', {}, cm(el.micro)), ' (por debajo de los ojos, para ver dentro). ',
          el.juntosAlto ? 'Si van juntos en la misma columna, el micro queda a ' + cm(el.juntos) + ': algo alto; mejor en otra columna o en un alto.' : 'Pueden ir juntos en la misma columna, el micro encima (a ' + cm(el.juntos) + ').'),
        h('p', {}, el.frigo ? ['Frigo integrable de hueco ', h('b', {}, cm(el.frigo)), ' y alto encima de ', cm(el.encimaFrigo), '.'] : 'La columna es baja para un frigo integrable de serie.'),
        h('p', { class: el.lavaTipo === 'corto' ? 'lava-mal' : '' }, 'Lavavajillas y lavadora: quedan ', h('b', {}, cm(el.lavavajillas)), ' libres (', cm(op.zocalo), ' + ', cm(op.mueble), gola ? ' − gola ' + cm(M.gola) : '', ')',
          el.lavaTipo === 'bien' ? ': bien (mínimo 85).'
            : el.lavaTipo === 'corto' ? ': menos de 85. No se sube la cocina por eso: ' + (gola ? 'en ese frente, tirador o uñero en vez de gola (quedan ' + cm(op.zocalo + op.mueble) + ')' + (op.zocalo + op.mueble < M.libre_electro ? ', y zócalo más bajo o mueble de 80 solo en esa zona' : '') + '.' : 'zócalo más bajo o mueble de 80 solo en esa zona.')
              : ': sobra hueco; una pieza lacada del color de las puertas' + (gola ? '' : ' o la gola') + ' lo tapa.',
          gola ? ' Con gola, a la puerta de los bajos se le quitan unos ' + cm(M.gola_mano) + ' para meter la mano.' : '')); })(),
      usar].filter(Boolean));
  }
  est.addEventListener('input', pintar); techo.addEventListener('input', pintar);

  // ── La cocina tipo actual (de Ajustes) ──
  const zonaTipo = h('div');
  function pintarTipo() {
    reemplazar(zonaTipo, tabla(['Pieza', 'Medida', ''], [
      ['Zócalo', cm(M.zocalo), 'Lo normal, 10 o 15; de 6, solo casos especiales'],
      ['Mueble bajo', cm(M.mueble_bajo) + ' de alto', 'Puertas de 70 u 80; fondo ' + cm(M.fondo_bajo) + ' con la puerta'],
      ['Encimera', cm(M.grueso_encimera) + ' de grueso', 'Lo normal, 4 o 2 cm; de 3 o 1,2, casos especiales. Fondo ' + cm(M.fondo_encimera) + ' (vuela 2–4 cm)'],
      ['Gola (en L o J, bajo la encimera)', cm(M.gola) + ' de perfil', 'A la puerta de los bajos se le quitan unos ' + cm(M.gola_mano) + ' para meter la mano (2,5–3,5)'],
      ['Gola en C (entre cajones)', cm(M.gola_c) + ' de perfil', 'Cada frente que abre por ese hueco pierde otros ' + cm(M.gola_mano) + ': en una cajonera de 3, el de arriba con la gola en L y los otros dos con la C'],
      ['Gola vertical (columnas)', cm(M.gola_vertical) + ' de ancho', 'Va en el lado que abre: a la puerta de la columna se le quitan unos ' + cm(M.gola_mano) + ' de ancho'],
      ['Hueco libre para lavavajillas y lavadora', cm(M.zocalo + M.mueble_bajo) + ' (con gola, ' + cm(M.zocalo + M.mueble_bajo - M.gola) + ')', 'Mínimo 85 cm'],
      ['Altura de la encimera', cm(M.encimera), suma({ zocalo: M.zocalo, mueble: M.mueble_bajo, grueso: M.grueso_encimera })],
      ['Altos', 'de ' + cm(M.altos_desde) + ' a ' + cm(M.altos_hasta), 'Altos de ' + cm(M.altos_hasta - M.altos_desde) + ', a ' + cm(M.altos_desde - M.encimera) + ' de la encimera; fondo ' + cm(M.fondo_alto)],
      ['Columnas', cm(M.columna - M.zocalo) + ' + zócalo', 'Hasta ' + cm(M.columna) + ': enrasan con los altos'],
    ]));
  }
  pintarTipo();

  main.append(
    nota('Medidas de referencia del taller. Los consejos de diseño de cada ficha usan estas mismas cifras. Son orientativas: manda el manual de cada electrodoméstico.'),
    apartado(0, 'Reglas de prioridad', h('ol', { class: 'guia-lista' },
        h('li', {}, h('b', {}, 'Que quepa y sea seguro:'), ' electrodomésticos con su hueco (lavavajillas y lavadora, 85 libres), pasos mínimos y techo.'),
        h('li', {}, h('b', {}, 'Que sea cómodo'), ' para quien lo usa; ante la duda, ', h('b', {}, 'más bajo antes que más alto'), '.'),
        h('li', {}, h('b', {}, 'Lo estándar del taller'), ' (15 + 70 + 4; zócalo 10 o 15; encimera 4 o 2) si queda a ±2 cm de lo ideal.'),
        h('li', {}, h('b', {}, 'Estética'), ' y gusto del cliente.'),
        h('li', {}, h('b', {}, 'Casos especiales'), ' (zócalo de 6, encimera de 3 o 1,2) solo si no hay otra forma.')),
      nota('Un problema de una zona se arregla en esa zona: si el lavavajillas no cabe con gola, se cambia ese frente (tirador, uñero o pieza), no se sube toda la cocina.')),
    apartado(1, 'Tu cocina tipo', zonaTipo, nota('Así salen los dibujos, la perspectiva y el material. Se cambia con la calculadora de abajo («Usar como mi cocina tipo»).')),
    apartado(2, 'Altura de encimera, altos y columnas',
      h('div', { class: 'dos' }, h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Estatura (cm)'), est), h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Techo (cm)'), techo)),
      h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Placa'), botonGas), h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Tirador'), botonGola), salida,
      nota('Lo cómodo: la mitad de la estatura más 3 cm, entre 10 y 15 cm por debajo del codo; ante la duda, más baja. Normal entre 85 y 95. Se respeta un margen de ±2 cm para quedarse en lo estándar (zócalo 10 o 15, mueble 70 u 80, encimera 4 o 2).')),
    apartado(3, 'Placa y campana',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Placa (aparato)', cm(M.placa) + ' lo normal', 'En un mueble de 60, 80 o 90 suele ir una de 60; las de 70–90 se dicen aparte'],
        ['Encimera a cada lado de la placa', cm(M.lado_placa) + ' mínimo', cm(M.lado_placa_bien) + ' o más; cuenta lo que sobra del mueble de placa'],
        ['Campana', 'igual o más ancha que la placa', 'No que el mueble: una de 60 vale para una placa de 60 en mueble de 90'],
        ['Altura de campana: inducción o vitro', cm(M.campana_sobre_electrica) + ' sobre la placa', 'Mirar el manual'],
        ['Altura de campana: gas', cm(M.campana_sobre_gas) + ' sobre la placa', 'Nunca menos de 65'],
        ['Gas', 'la parrilla sube unos 5 cm', 'Encimera 3 cm más baja de lo normal para esa persona'],
        ['Ventana', 'nunca encima de la placa', 'Sin campana, con corrientes y cortinas cerca'],
      ])),
    apartado(4, 'Fregadero y lavavajillas',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Encimera entre fregadero y placa', cm(M.preparar) + ' mínimo', cm(M.preparar_bien) + ' es lo cómodo: es la zona de preparar'],
        ['Mueble de fregadero', '80 (un seno) · 90–100 (dos)', 'Mirar la medida mínima de mueble del fregadero'],
        ['Lavavajillas', '45 o 60', 'Pegado al fregadero, como mucho a ' + cm(M.lavavajillas) + '. Con mueble de 80 o zócalo de 6, mirar que entre de alto'],
        ['Lavavajillas en el rincón', 'no', 'Su puerta tapa el rinconero: un bajo o regleta de 5–10 cm entre medias'],
      ])),
    apartado(5, 'Electrodomésticos: huecos (estándar europeo)',
      tabla(['Qué', 'Hueco', 'Nota'], [
        ['Frigo integrable: alto', '82 (bajo encimera) · 122 · 140 · 158 · 178 · 194', 'Ancho de hueco 56–57 (mueble de 60); el más vendido, 178'],
        ['Frigo de libre instalación', 'ancho 60 o 70 · alto 185–203', 'Combis altos de 70 cada vez más; 2–3 cm a cada lado y 5 arriba para que respire'],
        ['Frigo americano', 'ancho 91–92 · alto 178–180', 'Fondo 70–75: sobresale de los bajos'],
        ['Horno', '60 × 60 (compacto 45)', 'Fondo 55; bajo encimera o en columna'],
        ['Microondas integrable', '38 o 45 de alto', 'En hueco de 60 de ancho (o 50); libre, en un estante de 40 de fondo'],
        ['Lavavajillas y lavadora integrables', 'ancho 45 o 60 · mínimo 85 libres', 'Hueco libre = zócalo + mueble − gola (5,6). 15 + 70 con gola: 79,4 (no llega). 15 + 80 con gola: 89,4. Lo que sobre, pieza lacada del color de las puertas'],
        ['Placa', '60 · 70 · 80 · 90', 'Hueco en la encimera según el modelo (56 × 49 la de 60)'],
        ['Campana', '60 · 90 (isla 90–120)', 'Igual o más ancha que la placa'],
      ])),
    apartado(6, 'Frigorífico',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Columna de frigo', '60 · 70 · americano 92', 'Libre instalación: 2–3 cm a cada lado para que respire'],
        ['Frigo – placa', cm(M.frigo_placa) + ' mínimo', 'O panel aislante entre los dos'],
        ['Frigo contra pared o en rincón', 'regleta de 3–5 cm (libre instalación: ' + cm(M.electro_pared) + ')', 'Para que la puerta abra más de 90° y salgan los cajones (AMC)'],
      ])),
    apartado(7, 'Encimera y columnas',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Encimera de trabajo en total', cm(M.encimera_libre) + ' mínimo', 'Mejor 120 cm o más seguidos'],
        ['Columnas', 'juntas, al final de un tramo', 'En medio parten la encimera; arriba, enrasadas con los altos'],
        ['Horno y microondas en columna', 'horno a 80–90 · micro a 120–145', 'Del suelo a la base; según la estatura, en la calculadora (apartado 2)'],
        ['Enchufes de encimera', '20–30 cm sobre la encimera', 'Uno doble cada 1–1,5 m; los de electrodomésticos, en el mueble de al lado'],
        ['Barra', '25–30 cm de vuelo · 60 cm por persona', 'Mesa 75 · mostrador 90 (taburete 65) · barra alta 105 (taburete 75–80)'],
      ])),
    apartado(9, 'Distribución y triángulo de trabajo',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Triángulo fregadero–placa–frigo', 'cada lado 1,20 a ' + cm(M.triangulo_lado), 'En total menos de ' + String(M.triangulo_suma / 1000).replace('.', ',') + ' m (NKBA; AMC: al menos 1,20 entre zonas)'],
        ['Orden de trabajo', 'almacenaje → lavado → preparar → cocción', 'Frigo y despensa a un lado, luego fregadero, encimera y placa'],
        ['Diestros / zurdos', 'fregadero a la izquierda y placa a la derecha', 'Para zurdos, al revés (AMC). El lavavajillas, junto al fregadero'],
        ['Cocina lineal', '3,60 m o más', 'Por debajo, mejor en L si hay otra pared (AMC)'],
        ['Cocina en U', '2,40 m de ancho o más', 'Con 1,20 de paso entre las dos filas (AMC)'],
        ['Isla', 'fondo 60 o más · largo unos 180', 'Con ' + cm(M.isla_paso) + ' de paso alrededor; mejor ' + cm(M.isla_paso_bien) + ' o más'],
        ['Altos sobre la encimera', '55 mínimo · 60–70 lo ideal', 'Fondo 35–37 (AMC)'],
      ]),
      nota('Fuentes: AMC (Asociación de Mobiliario de Cocina, «Guía técnica de consejos»), NKBA (Kitchen Planning Guidelines), Brico Dépôt, Santos, Leroy Merlin y El Corte Inglés.')),
    apartado(8, 'Pasos y pasillos',
      tabla(['Qué', 'Mínimo', 'Cómodo'], [
        ['Entre encimeras enfrentadas', cm(M.pasillo), cm(M.pasillo_bien) + ' si cocinan dos'],
        ['Hasta la isla o península', cm(M.isla_paso), cm(M.isla_paso_bien) + '–' + cm(M.pasillo_bien)],
        ['Paredes enfrentadas con muebles en las dos', cm(M.pasillo + 2 * M.fondo_encimera), 'Por debajo, muebles solo en una pared o de poco fondo'],
      ]),
      nota('El paso se mide desde el canto de la encimera (' + cm(M.fondo_encimera) + ' desde la pared).')),
    apartado(10, 'Armarios', tabla(['Qué', 'Medida', 'Nota'], [
        ['Fondo', '60 cm (55 útiles)', 'Con correderas, 65 (las guías comen 8–9). Con 50, solo ropa doblada o infantil'],
        ['Ancho', '100 cm por persona', 'Módulos de 60 a 100; una barra de más de 100 sin apoyo se comba'],
        ['Hueco de colgar largo', '150–170 cm', 'Abrigos y vestidos. La barra, a 170–180 del suelo'],
        ['Hueco de colgar corto', '90–110 cm', 'Camisas y chaquetas: dos barras en un cuerpo de 200 (a unos 100 y 200)'],
        ['Pantalones en percha', '60–90 cm', ''],
        ['Baldas', '30–40 cm entre ellas', '20 para ropa fina'],
        ['Cajones', '12–20 cm (ropa) · 20–25 (volumen)', 'Accesorios 10–12; la cajonera, por debajo de 100 para ver dentro'],
        ['Altillo o maletero', '35–50 cm', 'Desde 180–190; una barra por encima de 200 necesita elevador'],
        ['Delante del armario', '80–90 cm libres', 'Para abrir puertas y cajones y ponerse delante'],
        ['Puertas abatibles', 'unos 50 cm por hoja', 'Correderas: hojas de 60–100'],
      ])),
    apartado(11, 'Vestidores', tabla(['Qué', 'Mínimo', 'Cómodo'], [
        ['Paso con muebles a un lado', '70 cm', '90 cm'],
        ['Paso con muebles a los dos lados', '80 cm', '100 cm (dos personas a la vez, 107)'],
        ['Alrededor de la isla', '80 cm', '90 cm a cada lado (si menos, los cajones no abren bien)'],
        ['Isla: fondo', '50 cm (cajones a un lado)', '90–100 si abre por los dos lados'],
        ['Isla: largo', '100 cm', '100–150'],
        ['Isla: alto', '85 cm', '85–90 para apoyar y doblar ropa; ante la duda, 85'],
        ['Cuarto para isla con muebles a los dos lados', '330 cm entre paredes', '60 + 90 + 50 + 90 + 60 = 350'],
      ]), nota('Ideas: espejo de cuerpo entero en una puerta o al fondo; luz en la barra o en el cajón; un banco o la isla para sentarse a calzarse; zapatero inclinado a la altura de la vista.')),
    apartado(12, 'Soluciones habituales', lista([
      ['Rincones:', 'rinconero en L de 90–100 con bandejas extraíbles o carrusel; si no, rincón ciego con puerta. Entre el rincón y un lavavajillas, horno o cajonero, un bajo o regleta de 5–10 cm.'],
      ['Cocina estrecha:', 'muebles en una sola pared, o enfrente solo altos o bajos de 30–40 cm de fondo. Cajones mejor que puertas.'],
      ['Poca encimera:', 'placa de dos zonas, tabla sobre el fregadero, estante o sobre-encimera para los pequeños electrodomésticos.'],
      ['Ventana baja:', 'debajo va bien el fregadero, nunca la placa. La encimera tiene que quedar 5 cm por debajo del marco.'],
      ['Isla:', 'con placa o fregadero, 90–100 cm de fondo; con barra, 25–30 cm más de vuelo.'],
      ['Altos hasta el techo:', 'lo que sobre por encima de los altos, altillos o una tapeta para que no se acumule polvo.'],
    ])),
    apartado(13, 'Normas de diseño (las que sigue la app)',
      h('h3', {}, 'Cocina'),
      lista([
        ['Medidas:', 'anchos de 5 en 5 cm (acaban en 0 o en 5). Lo que sobre o falte, para cajoneras o bajos de puertas, que se hacen a medida; especieros (15 o 20), paneros y electrodomésticos, siempre con su medida fija.'],
        ['Cajoneras:', 'de 40 o más. Con 30 o 35, bajo de puertas; una de 30 junto a una de 40 es una de 70.'],
        ['Sin huecos sueltos:', 'el sitio que no llega para un mueble lo absorbe el de al lado; solo queda hueco junto a una puerta o un pilar.'],
        ['Ventanas y campana:', 'ningún mueble ni la campana delante de una ventana; nada encima de la campana ni de sus 10 cm de margen. La placa nunca bajo la ventana; el fregadero, sí.'],
        ['Placa:', 'centrada en su mueble o, si hace falta para quedar bajo la salida de humos, en la junta de dos cajoneras. 50 cm libres a cada lado (30 como poco).'],
        ['Trabajo:', 'al menos 60 cm de encimera libre entre el fregadero (con el lavavajillas) y la placa; 90 lo ideal. Diestros: fregadero a la izquierda y placa a la derecha.'],
        ['Altos:', 'simétricos, del ancho del bajo de debajo; escurreplatos sobre el fregadero; alto sobre el frigorífico de libre instalación; hasta la esquina, altos y una estantería en el rincón.'],
        ['Isla y península:', 'solo con ' + cm(M.isla_paso) + ' de paso alrededor (mejor ' + cm(M.isla_paso_bien) + '–' + cm(M.pasillo_bien) + '), nunca delante de una puerta: 60 de muebles y 30 de vuelo para sentarse.'],
      ]),
      h('h3', {}, 'Armarios y vestidores'),
      lista([
        ['Cuerpos:', 'de ' + cm(NI.ancho_min) + ' a ' + cm(NI.ancho_max) + ', de 5 en 5: una barra o una balda más ancha se comba.'],
        ['Colgar:', 'largo ' + cm(NI.colgar_largo) + '–170 libres; doble barra solo con ' + cm(NI.doble_barra_alto) + ' de alto o más; percha de frente con ' + cm(NI.fondo_colgar) + ' de fondo útil (las correderas comen 8–9).'],
        ['Doblar:', 'siempre algún cuerpo con cajonera (por debajo de 100) o baldas (cada 30–35): no todo para colgar.'],
        ['Altura:', 'lo que pase de 2,20 m, altillo para lo de temporada; los cajones y lo de diario, entre 50 y 150.'],
        ['Paso:', 'vestidor con muebles a un lado 70 (90 cómodo) y a los dos 80 (100 cómodo); delante del armario, 80–90 libres.'],
      ]),
      nota('«Proponer el interior» (en los cuerpos del armario o de cada pared del vestidor) reparte los cuerpos con estas normas.')),
    seccionTendencias(),
  );
  numerarGuia(main);
}

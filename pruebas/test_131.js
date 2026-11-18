// 1.31: ningún alto puede pisar la campana de la placa (salvo placa con extractor o «Alto campana»), y se dice el hueco
// que hay que dejar; encimera libre a cada lado de la placa, según su tamaño (dominó de 30, 60, 70, 80, 90); y el
// frigorífico americano va siempre en un hueco de 92 (y un 92 es americano).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { campanasPared, textoHolgurasCampana } from '../docs/js/alzado.js';
import { consejosDiseno, airePlaca, textoAirePlaca } from '../docs/js/consejos.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

import { REMATES } from '../docs/js/modulos.js';
REMATES.porDefecto = false;   // pensada antes de 1.34: sin regletas ni costados en la medida

const mod = (tipo, ancho, x) => Object.assign(moduloNuevo(tipo), { ancho }, x || {});
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; return f; };
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);

prueba('campana: un alto encima de la placa la pisa; se dice cuánto y el hueco que hay que dejar', () => {
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 600), mod('alto', 600)] }), f = cocina([A]);
  // Placa de 60 centrada en el mueble de 90 (de 75 a 135): los altos de 0-60, 60-120 y 120-180 la pisan.
  const c = campanasPared(A, f.datos);
  igual(c.map(x => [x.desde, x.hasta, x.pisan.length]), [[750, 1350, 2]]);
  const t = textoHolgurasCampana(c[0]);
  afirma(/pisa/.test(t) && /hueco de 80 cm/.test(t), t);
  afirma(!/quedan ⚠/.test(t), t);
  afirma(consejosDiseno(f).some(x => /pisan la campana/.test(x.texto)), 'sale en los consejos');
  // Con hueco de 80 encima (campana de 60 y 10 a cada lado), ya no pisa y quedan 10 por lado.
  A.altos = [mod('alto', 650), mod('hueco', 800), mod('alto', 600)];
  const b = campanasPared(A, f.datos)[0];
  igual([b.pisan.length, b.izq, b.der], [0, 100, 100]);
  // Placa extractora: sin campana, los altos pueden ir encima.
  A.altos = [mod('alto', 600), mod('alto', 600), mod('alto', 600)]; A.bajos[1].extractor = 'recirculacion';
  igual(campanasPared(A, f.datos), []);
  // Alto campana encima: la campana va dentro del mueble.
  A.bajos[1].extractor = null; A.altos = [mod('alto', 750), mod('alto_campana', 600), mod('alto', 600)];
  igual(campanasPared(A, f.datos), []);
});

prueba('aire de la placa: encimera libre a cada lado, según el tamaño de la placa', () => {
  const A = pared('A', 3000, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('cajonero', 600), mod('fregadero', 800)] }), f = cocina([A]);
  let x = airePlaca(f.datos, A)[0];
  igual([x.ancho, x.izq.libre, x.izq.hasta, x.der.libre, x.der.hasta], [600, 150, 'la columna frigo', 750, 'el fregadero']);
  afirma(/⚠ 15 cm a la izquierda \(hasta la columna frigo\)/.test(textoAirePlaca(x)), textoAirePlaca(x));
  A.bajos[1].placa_ancho = 300;   // dominó de dos fuegos
  x = airePlaca(f.datos, A)[0];
  igual([x.ancho, x.izq.libre, x.der.libre], [300, 300, 900]);
  A.bajos[1].placa_ancho = 900;
  x = airePlaca(f.datos, A)[0];
  igual([x.izq.libre, x.der.libre, x.izq.hasta], [0, 600, 'la columna frigo']);
});

prueba('1.31.1: el resumen (y el PDF) dice lo que queda junto a la campana y la encimera libre junto a la placa', async () => {
  const { textoResumen } = await import('../docs/js/resumen.js');
  const { AJUSTES_FABRICA } = await import('../docs/js/modelo.js');
  const A = pared('A', 3000, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('cajonero', 600), mod('fregadero', 800)], altos: [mod('alto', 600), mod('alto', 900), mod('alto', 600)] }), f = cocina([A]);
  const t = textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA });
  afirma(/Campana piramidal de 60 cm encima de la placa: ⚠ el mueble de la izquierda la pisa/.test(t), t);
  afirma(/Placa de 60 cm: encimera libre ⚠ 15 cm a la izquierda \(hasta la columna frigo\)/.test(t), t);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };

prueba('ficha: frigo americano = hueco de 92, y el aire de la placa en el mueble de placa', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', abierto = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="columna_frigo"]');
  await a.page.click(abierto + '[data-acc="rapido"][data-v="600"]');
  await a.page.click(abierto + '[data-acc="instalacion"][data-v="americano"]');
  await a.page.waitForSelector(abierto + '[data-acc="rapido"][data-v="920"].on, ' + abierto + '[data-c="ancho"] input');
  igual(await a.page.$eval(abierto + '[data-c="ancho"] input', i => i.value), '92', 'americano pone 92');
  await a.page.click(abierto + '[data-acc="rapido"][data-v="600"]');
  await a.page.waitForFunction(s => !document.querySelector(s + '[data-acc="instalacion"][data-v="americano"].on'), abierto);
  await a.page.click(abierto + '[data-acc="rapido"][data-v="920"]');
  await a.page.waitForSelector(abierto + '[data-acc="instalacion"][data-v="americano"].on');
  // Mueble de placa de 90 al lado: la placa de 60 deja 15 cm hasta la columna.
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="placa"]');
  await a.page.click(abierto + '[data-acc="rapido"][data-v="900"]');
  await a.page.waitForSelector(abierto + '[data-acc="aire-placa"]');
  afirma(/15 cm a la izquierda \(hasta la columna frigo\)/.test(await a.page.innerText(abierto + '[data-acc="aire-placa"]')), await a.page.innerText(abierto + '[data-acc="aire-placa"]'));
  await a.page.click(abierto + '[data-acc="placa-ancho"][data-v="300"]');
  await a.page.waitForFunction(s => /Placa de 30 cm/.test(document.querySelector(s + '[data-acc="aire-placa"]')?.textContent || ''), abierto);
}));

await fin();

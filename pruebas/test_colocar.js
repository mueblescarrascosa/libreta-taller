// 1.41: «Colocar lo que falta»: tomas, enchufes, desagües, gas y humos propuestos para el electricista y el fontanero.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, avisos } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { instalacionesQueFaltan, colocarPropuestas, quitarPropuestas, hayPropuestas } from '../docs/js/avisos-obra.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';
import os from 'node:os';
import path from 'node:path';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const el = (tipo, x) => Object.assign(elementoNuevo(tipo, 'izq'), x);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, extra);
const cocina = (paredes, techo = 2600) => { const f = fichaNueva('cocina', null, 't'); f.datos.alto_techo = techo; f.datos.paredes = paredes; return f.datos; };

prueba('coloca todo lo que falta y ya no falta nada', () => {
  const d = cocina([pared('A', 4000, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600), mod('placa', 600), mod('columna_frigo', 600)] })]);
  afirma(instalacionesQueFaltan(d).length > 0, 'antes falta');
  const n = colocarPropuestas(d);
  afirma(n.length >= 6, 'colocadas ' + n.length);
  igual(instalacionesQueFaltan(d).map(x => x.que), []);
  afirma(n.every(e => e.propuesta === true), 'todas marcadas');
});

prueba('desagüe al centro del fregadero a 40 cm; agua 15 cm al lado a 50; enchufe del lavavajillas en el fregadero', () => {
  // regleta 40 (remates por defecto) → fregadero de 640 a 1440, centro 1040
  const d = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600)] })]);
  const n = colocarPropuestas(d), de = t => n.find(e => e.tipo === t.tipo && (t.para === undefined || e.para === t.para));
  const des = de({ tipo: 'desague' }), agua = de({ tipo: 'toma', para: 'agua' }), enc = de({ tipo: 'enchufe', para: 'lavavajillas' });
  afirma(des && agua && enc, JSON.stringify(n));
  igual(des.altura, 400); igual(agua.altura, 500); igual(enc.altura, 500);
  igual(des.ref, 'izq');
  igual(agua.distancia - des.distancia, 150);
  igual(enc.distancia, des.distancia, 'el enchufe del lavavajillas va al centro del fregadero de al lado');
});

prueba('lo que queda en la mitad derecha se mide desde la derecha', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('fregadero', 800)] })]);
  const des = colocarPropuestas(d).find(e => e.tipo === 'desague');
  igual(des.ref, 'der');
  afirma(des.distancia > 0 && des.distancia < 1000, 'distancia ' + des.distancia);
  igual(des.distancia % 10, 0);
});

prueba('campana: enchufe a 2,10 y humos a 2,30; con techo bajo, humos 10 cm bajo el techo', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('placa', 600)] })]);
  const n = colocarPropuestas(d);
  igual(n.find(e => e.para === 'campana').altura, 2100);
  igual(n.find(e => e.tipo === 'humos').altura, 2300);
  igual(n.find(e => e.para === 'placa').altura, 500);
  const b = cocina([pared('A', 3000, { bajos: [mod('placa', 600)] })], 2350);
  igual(colocarPropuestas(b).find(e => e.tipo === 'humos').altura, 2250);
});

prueba('enchufe del horno/micro en columna a 1,15 m', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('columna_hmo', 600)] })]);
  igual(colocarPropuestas(d).find(e => e.para === 'hmo').altura, 1150);
});

prueba('no se pone nada encima de una ventana: se aparta al lado libre', () => {
  // fregadero de 640 a 1440 con ventana encima (700-1400); encimera libre de 1440 a 2640 (enchufe a 2040) con otra ventana (1800-2300)
  const d = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('bajo', 600), mod('bajo', 600)],
    elementos: [el('ventana', { distancia: 700, ancho: 700, altura: 1000, alto: 1000 }), el('ventana', { distancia: 1800, ancho: 500, altura: 1000, alto: 1000 })] })]);
  const n = colocarPropuestas(d);
  const pisa = e => { const x = e.ref === 'der' ? 3000 - e.distancia : e.distancia; return ((x > 600 && x < 1500) || (x > 1700 && x < 2400)) && e.altura > 900 && e.altura < 2100; };
  igual(n.filter(pisa).map(e => e.tipo + ' ' + e.para + ' ' + e.distancia), []);
  afirma(n.some(e => e.tipo === 'desague'), 'el desagüe (bajo la ventana) sigue');
  afirma(n.some(e => e.para === 'general' && Math.abs((e.ref === 'der' ? 3000 - e.distancia : e.distancia) - 1700) <= 10), 'enchufe de encimera apartado a 1700: ' + JSON.stringify(n.filter(e => e.para === 'general')));
});

prueba('placa de gas: toma de gas 20 cm al lado', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('placa', 800, { placa_tipo: 'gas' })] })]);
  const g = colocarPropuestas(d).find(e => e.tipo === 'toma' && e.para === 'gas');
  afirma(g, 'toma de gas');
  igual(g.altura, 500);
});

prueba('segunda vez no duplica; quitar deja solo lo medido', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('fregadero', 800)], elementos: [el('ventana', { distancia: 500, ancho: 1000 })] })]);
  colocarPropuestas(d);
  igual(colocarPropuestas(d), []);
  afirma(hayPropuestas(d), 'hay propuestas');
  const n = quitarPropuestas(d);
  igual(n, 2);
  igual(d.paredes[0].elementos.map(e => e.tipo), ['ventana']);
  afirma(!hayPropuestas(d), 'ya no hay');
});

prueba('volver a colocar tras mover un mueble: las propuestas siguen al mueble', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('fregadero', 800)] })]);
  const a = colocarPropuestas(d).find(e => e.tipo === 'desague').distancia;
  d.paredes[0].bajos.unshift(mod('bajo', 600));
  quitarPropuestas(d);
  const b = colocarPropuestas(d).find(e => e.tipo === 'desague').distancia;
  igual(b - a, 600);
});

prueba('enchufes de encimera: uno cada 1,20 m de encimera libre, a 20 cm sobre ella; no salen como «Falta»', () => {
  // regleta 40 + 3 bajos de 60 (40-1840, 1800 libres) + placa + fregadero
  const d = cocina([pared('A', 3600, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('placa', 600), mod('fregadero', 800)] })]);
  const f = fichaNueva('cocina', null, 't'); f.datos = d;
  afirma(!avisos(f, 'cm').some(a => /encimera/.test(a.texto)), 'sin aviso de encimera');
  const enc = colocarPropuestas(d).filter(e => e.tipo === 'enchufe' && e.para === 'general');
  igual(enc.length, 2);
  igual(enc.map(e => e.altura), [1100, 1100]);
  igual(enc.map(e => e.distancia), [490, 1390]);
});

prueba('enchufes de encimera: no sobre placa ni fregadero, ni en tramos de menos de 60; uno general ya puesto vale', () => {
  const d = cocina([pared('A', 3000, { bajos: [mod('placa', 600), mod('bajo', 400), mod('fregadero', 800), mod('bajo', 1100)],
    elementos: [el('enchufe', { para: 'general', distancia: 2400, altura: 1100 })] })]);
  igual(colocarPropuestas(d).filter(e => e.para === 'general').length, 0);
});

prueba('pared sin largo o cocina vacía: nada, sin errores', () => {
  const d = cocina([pared('A', null, { bajos: [mod('fregadero', 800)] }), pared('B', 2000)]);
  igual(colocarPropuestas(d), []);
  igual(quitarPropuestas(cocina([])), 0);
});

prueba('app: botón «Colocar lo que falta», alzado en naranja y tabla «a poner» en el resumen (390 px)', async () => {
  const a = await abrir({});
  try {
    await a.page.setViewportSize({ width: 390, height: 844 });
    await entrar(a); await crearTrabajo(a, 'Prueba colocar');
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
    await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="fregadero"]');
    await a.page.click('[data-pared="A"] [data-modulo].abierto [data-acc="rapido"][data-v="800"]');
    await a.page.waitForSelector('[data-acc="colocar-propuestas"]');
    afirma(/\(2\)/.test(await a.page.textContent('[data-acc="colocar-propuestas"]')), 'cuenta 2');
    await a.page.click('[data-acc="colocar-propuestas"]');
    const t = await a.page.$eval('[data-pantalla="ficha"]', n => n.textContent);
    afirma(!/Falta el desagüe del fregadero/.test(t), 'ya no falta');
    afirma(await a.page.$('[data-acc="quitar-propuestas"]'), 'botón quitar');
    afirma(await a.page.$('[data-acc="volver-colocar"]'), 'botón volver a colocar');
    afirma((await a.page.$$('.elemento.propuesta')).length === 2, 'elementos marcados «A poner»');
    afirma((await a.page.$$('.tarjeta-alzado [data-propuesta]')).length >= 2, 'alzado con propuestas');
    await (await a.page.$('.tarjeta-alzado')).screenshot({ path: path.join(os.tmpdir(), 'colocar_alzado.png') });
    await (await a.page.$('.tarjeta-instalaciones')).screenshot({ path: path.join(os.tmpdir(), 'colocar_tarjeta.png') });
    await (await a.page.$('.elemento.propuesta')).screenshot({ path: path.join(os.tmpdir(), 'colocar_elemento.png') });
    // «Ya está hecha» quita la marca de una
    await a.page.click('.elemento.propuesta [data-acc="ya-hecha"]');
    igual((await a.page.$$('.elemento.propuesta')).length, 1);
    await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    const poner = await a.page.$$eval('.resumen-doc .a-poner tbody tr', r => r.map(x => x.textContent));
    igual(poner.length, 1, poner.join(' | '));
    const medidas = await a.page.$$eval('.resumen-doc .instalaciones:not(.a-poner) tbody tr', r => r.map(x => x.textContent));
    igual(medidas.length, 1, medidas.join(' | '));
    afirma(await a.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'scroll lateral');
    await (await a.page.$('.resumen-doc .a-poner')).screenshot({ path: path.join(os.tmpdir(), 'colocar_resumen.png') });
    igual(a.errores, [], 'errores de página');
  } finally { await a.cerrar(); }
});

await fin();

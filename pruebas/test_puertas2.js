import { prueba, afirma, igual, fin } from './mini.js';
import { nombrarPuerta, puertaNueva, resumenPuerta, mezclarAjustes, fichaNueva } from '../docs/js/modelo.js';
import { tituloFicha } from '../docs/js/util.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

prueba('nombres rápidos: se numeran solos al repetirse', () => {
  const l = [puertaNueva(null), puertaNueva(null), puertaNueva(null), puertaNueva(null)];
  nombrarPuerta(l, l[0], 'Habitación'); igual(l[0].nombre, 'Habitación');
  nombrarPuerta(l, l[1], 'Habitación'); igual([l[0].nombre, l[1].nombre], ['Habitación 1', 'Habitación 2']);
  nombrarPuerta(l, l[2], 'Habitación'); igual(l[2].nombre, 'Habitación 3');
  nombrarPuerta(l, l[3], 'Baño'); igual(l[3].nombre, 'Baño');
});
prueba('premarco: las fichas nuevas se miden por el premarco y sus medidas rápidas se pueden cambiar', () => {
  igual(fichaNueva('puerta', null, 't').datos.medida, 'premarco');
  igual(mezclarAjustes({ premarco_anchos: [880] }).premarco_anchos, [880]);
  afirma(mezclarAjustes({}).nombres_puerta.some(x => x[1] === 'Habitación'));
});
prueba('ficha de puertas con zona: «Puertas · Piso 1»', () => {
  igual(tituloFicha({ tipo: 'puerta', nombre: 'Piso 1' }), 'Puertas · Piso 1');
  igual(tituloFicha({ tipo: 'puerta', nombre: '' }), 'Puertas');
  igual(tituloFicha({ tipo: 'puerta', nombre: 'Puertas casa' }), 'Puertas casa');
});

const con = fn => async () => { const a = await abrir(); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const P = '[data-puerta].abierta ';
prueba('tabla de puertas compacta, reordenar y elegir qué fichas van en el resumen', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="zona-rapida"][data-v="Piso 1"]');
  await a.page.click(P + '[data-acc="nombre-rapido"][data-v="Salón"]');
  igual(await a.page.$$eval(P + '[data-c="ancho"] [data-acc="rapido"]', bs => bs.map(b => b.dataset.v)), ['960', '860', '760', '660']);
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="960"]'); await a.page.click(P + '[data-c="alto"] [data-acc="rapido"][data-v="2060"]');
  await a.page.click('[data-acc="anadir-puerta"]');
  await a.page.click(P + '[data-acc="nombre-rapido"][data-v="Baño"]');
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="860"]'); await a.page.click(P + '[data-acc="condena"]');
  await a.page.click('[data-acc="anadir-puerta"]');
  // La segunda puerta (Baño) sube a la primera.
  await a.page.click('[data-puerta].puerta-cerrada:nth-child(2) [data-acc="subir-puerta"]');
  igual(await a.page.$$eval('[data-puerta].puerta-cerrada b', bs => bs.map(b => b.textContent)), ['Baño', 'Salón']);
  await a.page.click('header [data-acc="cab-resumen"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  igual(await a.page.$$eval('.tabla-puertas th', ts => ts.map(t => t.textContent)), ['Puerta', 'Premarco', 'C/V']);
  igual(await a.page.$$eval('.tabla-puertas tbody tr', ts => ts.map(t => [...t.children].map(c => c.textContent))), [['Baño', '86 × ?', 'C'], ['Salón', '96 × 206', ''], ['Puerta 3', '', '']]);
  afirma((await a.page.innerText('.resumen-doc .nota-ud')).startsWith('Premarco: ancho × alto'));
  afirma((await a.page.innerText('.resumen-doc h2')).startsWith('Puertas · Piso 1'));
  // Resumen del trabajo con dos fichas: solo las puertas.
  await a.page.click('header .atras'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="nota"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Llamar al pintor');
  await a.page.click('header .atras'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="resumen-trabajo"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  afirma((await a.page.innerText('.resumen-doc')).includes('Llamar al pintor'));
  await a.page.click('[data-acc="elegir-tipo"][data-v="puerta"]');
  await a.page.waitForFunction(() => !document.querySelector('.resumen-doc').innerText.includes('Llamar al pintor'));
  await a.page.evaluate(() => { window.open = u => { window.__url = u; }; });
  await a.page.click('header [data-acc="enviar-texto"]'); await a.page.waitForFunction(() => window.__url);
  const t = await a.page.evaluate(() => decodeURIComponent(window.__url));
  afirma(t.includes('Baño') && !t.includes('Llamar al pintor'), t);
}));
fin();

import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const visible = (a, sel) => a.page.$eval(sel, n => !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length));

prueba('plegar una pared, un bloque y un apartado; se recuerda al volver a la ficha', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]'); await a.page.waitForSelector('[data-pared="A"]');
  await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '240'); await a.page.keyboard.press('Tab');
  // Pared A: se pliega tocando su título y enseña el resumen.
  afirma(await visible(a, '[data-pared="A"] [data-sec="azulejo"]'));
  await a.page.click('[data-pared="A"] h3.plegador');
  afirma(!(await visible(a, '[data-pared="A"] [data-sec="azulejo"]')), 'la pared plegada no enseña sus bloques');
  afirma(/240/.test(await a.page.innerText('[data-pared="A"] .res-pared')), 'resumen con el largo');
  await a.page.click('[data-pared="A"] h3.plegador');
  afirma(await visible(a, '[data-pared="A"] [data-sec="azulejo"]'));
  // Bloque de azulejo: se pliega su contenido, el título sigue.
  await a.page.click('[data-pared="A"] [data-sec="azulejo"] h4');
  afirma(!(await visible(a, '[data-pared="A"] [data-sec="azulejo"] [data-acc="azulejo"]')));
  afirma(await visible(a, '[data-pared="A"] [data-sec="azulejo"] h4'));
  // Apartado «Paredes»: esconde las paredes y el botón de añadir.
  await a.page.click('h2.plegador:text("Paredes")');
  afirma(!(await visible(a, '[data-acc="anadir-pared"]')));
  // Al volver a entrar sigue igual.
  const aqui = await a.page.evaluate(() => location.hash);
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForFunction(() => !document.querySelector('[data-pantalla="ficha"]'));
  await a.page.evaluate(h => { location.hash = h; }, aqui); await a.page.waitForSelector('[data-pantalla="ficha"] [data-pared="A"]');
  afirma(!(await visible(a, '[data-acc="anadir-pared"]')), 'Paredes sigue plegado');
  await a.page.click('h2.plegador:text("Paredes")');
  afirma(await visible(a, '[data-pared="A"]'));
  afirma(!(await visible(a, '[data-pared="A"] [data-sec="azulejo"] [data-acc="azulejo"]')), 'el azulejo sigue plegado');
}));
fin();

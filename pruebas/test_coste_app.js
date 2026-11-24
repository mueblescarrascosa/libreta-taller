// 1.42.0: «Coste estimado» en la ficha, recargo en cada mueble y precios en Ajustes.
import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nueva = async (a, tipo, subtipo) => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]');
  if (subtipo) await a.page.click('[data-acc="subtipo"][data-v="' + subtipo + '"]');
  await a.page.waitForSelector('[data-pantalla="ficha"]');
};
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
const A = '[data-pared="A"] ';
const abrirCoste = async a => { const d = await a.page.$('[data-acc="plegable-coste"]'); if (!(await d.evaluate(x => x.open))) await a.page.click('[data-acc="abrir-coste"]'); };
const total = a => a.page.innerText('[data-acc="coste-total"] b');

prueba('cocina: el coste sale por metro y cambia con el recargo del mueble', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.click(A + '[data-fila="altos"] [data-acc="anadir-modulo"][data-v="alto"]');
  await a.page.click(A + '[data-fila="altos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await abrirCoste(a);
  igual(await total(a), '294 €');                       // 0,6 × 300 + 0,6 × 190
  igual(await a.page.innerText('[data-acc="coste-iva"] span:last-child'), '356 €');
  afirma(/294 € sin IVA/.test(await a.page.innerText('[data-acc="abrir-coste"]')));
  // Recargo en el bajo: cajeado por pilar, 20 % de 180 = 36
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="recargo-motivo"][data-v="pilar"]');
  await a.page.waitForFunction(() => document.querySelector('[data-acc="coste-total"] b').innerText === '330 €');
  afirma(await a.page.$('[data-recargo="pilar"]'));
  await a.page.fill(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="recargo-pct-mueble"]', '50');
  await a.page.waitForFunction(() => document.querySelector('[data-acc="coste-total"] b').innerText === '384 €');
  await a.page.waitForTimeout(400);
  igual((await ficha(a)).datos.paredes[0].bajos[0].recargo, { motivo: 'pilar', pct: 50 });
  await a.page.click(A + '[data-fila="bajos"] [data-acc="cerrar-modulo"]');
  afirma(/\+50 %/.test(await a.page.innerText(A + '[data-fila="bajos"] [data-acc="abrir-modulo"]')), 'el mueble lleva la marca del recargo');
}));
prueba('los precios de Ajustes cambian el coste', con({}, async a => {
  await a.page.evaluate(() => { location.hash = '#/ajustes/cocina'; }); await a.page.waitForSelector('[data-acc="precios-coste"]');
  await a.page.fill('[data-acc="precio-ml"][data-v="corredera"]', '600'); await a.page.waitForTimeout(400);
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await nueva(a, 'armario', 'corredera'); await a.page.fill('[data-acc="ancho_medio"]', '2000');
  await abrirCoste(a);
  await a.page.waitForFunction(() => document.querySelector('[data-acc="coste-total"] b') && document.querySelector('[data-acc="coste-total"] b').innerText === '1.200 €');
  // Armario sin cuerpos: el recargo va en el armario entero
  await a.page.click('[data-acc="coste"] [data-acc="recargo-motivo"][data-v="descuadre"]');
  await a.page.waitForFunction(() => document.querySelector('[data-acc="coste-total"] b').innerText === '1.440 €');
}));
fin();

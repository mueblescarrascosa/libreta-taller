import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const tipo = async (a, t, s) => { await a.page.click('[data-acc="tipo"][data-v="' + t + '"]'); if (s) await a.page.click('[data-acc="subtipo"][data-v="' + s + '"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); };
const nueva = async (a, t, s) => { await crearTrabajo(a, 'Casa'); await tipo(a, t, s); };
const fichaActual = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
const volverTrabajo = async a => { await a.page.click('header .atras'); await a.page.waitForSelector('[data-pantalla="trabajo"]'); };

prueba('vestidor: sin recuadro de hueco y con cuerpos en cada pared', con({}, async a => {
  await nueva(a, 'armario', 'vestidor');
  afirma(!(await a.page.$('[data-acc="ancho_arriba"]')), 'sigue el hueco del armario');
  await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '2');
  await a.page.click('[data-pared="A"] [data-acc="anadir-cuerpo"]');
  await a.page.fill('[data-pared="A"] [data-cuerpo] [data-acc="ancho"]', '100');
  await a.page.click('[data-pared="A"] [data-acc="anadir-cuerpo"]');
  await a.page.fill('[data-pared="A"] [data-cuerpo].abierto [data-acc="ancho"]', '80');
  await a.page.waitForFunction(() => /Quedan 20 cm/.test(document.querySelector('[data-pared="A"] [data-acc="cuadre-cuerpos"]').innerText));
  await a.page.waitForTimeout(500);
  const f = await fichaActual(a);
  igual(f.datos.paredes[0].cuerpos.map(c => c.ancho), [1000, 800]);
  afirma(await a.page.$('[data-acc="planta"] [data-modulo="cuerpo"]'), 'no se dibujan los cuerpos');
}));

prueba('la lista de fichas dice qué medidas faltan', con({}, async a => {
  await nueva(a, 'armario', 'vestidor'); await a.page.fill('[data-acc="nombre-ficha"]', 'Dormitorio'); await a.page.waitForTimeout(400);
  await volverTrabajo(a);
  const t = await a.page.innerText('[data-acc="abrir-ficha"] .pendiente');
  igual(t, 'Falta la altura · Pared A: falta el largo');
}));

prueba('azulejo en franja permite añadir también zonas', con({}, async a => {
  await nueva(a, 'cocina');
  await a.page.click('[data-pared="A"] [data-acc="azulejo"][data-v="franja"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-zona"]');
  afirma(await a.page.$('[data-pared="A"] [data-elemento="zona"]'), 'no se añade la zona');
  afirma(await a.page.$('[data-pared="A"] [data-acc="azulejo_desde"], [data-pared="A"] [data-c="azulejo_desde"]'), 'se pierde la franja');
}));

prueba('planta: cajas orientativas y nombres que no se pisan', con({}, async a => {
  await nueva(a, 'cocina');
  await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
  for (const [t, dist] of [['enchufe', '100'], ['enchufe', '106'], ['toma', '110']]) {
    await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="' + t + '"]');
    const campos = await a.page.$$('[data-pared="A"] [data-elemento] [data-acc="distancia"]');
    await campos[campos.length - 1].fill(dist);
  }
  await a.page.waitForTimeout(300);
  igual((await a.page.$$('[data-acc="planta"] [data-caja]')).length, 3, 'cajas');
  const cajas = await a.page.$$eval('[data-acc="planta"] text[data-elemento]', ts => ts.map(t => { const r = t.getBBox(); return [r.x, r.y, r.width, r.height]; }));
  igual(cajas.length, 3);
  igual(await a.page.$$eval('[data-acc="planta"] text[data-elemento]', ts => ts.map(t => t.textContent)), ['E a 100 de izq', 'E a 106 de izq', 'Toma a 110 de izq']);
  const pisa = (p, q) => p[0] < q[0] + q[2] && q[0] < p[0] + p[2] && p[1] < q[1] + q[3] && q[1] < p[1] + p[3];
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) afirma(!pisa(cajas[i], cajas[j]), 'se pisan ' + i + ' y ' + j + ': ' + JSON.stringify(cajas));
}));

fin();

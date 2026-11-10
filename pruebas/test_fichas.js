import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nueva = async (a, tipo, subtipo, unidad) => {
  await crearTrabajo(a, 'Casa');
  if (unidad) { await a.page.click('[data-acc="unidad"][data-v="' + unidad + '"]'); await a.page.waitForTimeout(50); }
  await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]');
  if (subtipo) await a.page.click('[data-acc="subtipo"][data-v="' + subtipo + '"]');
  await a.page.waitForSelector('[data-pantalla="ficha"]');
};
const recargar = async a => { await a.page.waitForTimeout(400); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]'); };
const val = (a, sel) => a.page.inputValue(sel);
const on = (a, sel) => a.page.evaluate(s => document.querySelector(s).classList.contains('on'), sel);
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

prueba('puerta: medidas y botones se guardan; no hay hacia dentro o fuera', con({}, async a => {
  await nueva(a, 'puerta');
  await a.page.fill('[data-acc="ancho"]', '825'); await a.page.fill('[data-acc="alto"]', '2030'); await a.page.fill('[data-acc="tabique"]', '90');
  await a.page.click('[data-acc="mano"][data-v="izq"]'); await a.page.click('[data-acc="condena"][data-v="true"]'); await a.page.click('[data-acc="vidriera"][data-v="false"]');
  await recargar(a);
  igual([await val(a, '[data-acc="ancho"]'), await val(a, '[data-acc="alto"]'), await val(a, '[data-acc="tabique"]')], ['825', '2030', '90']);
  afirma(await on(a, '[data-acc="mano"][data-v="izq"]') && await on(a, '[data-acc="condena"][data-v="true"]') && await on(a, '[data-acc="vidriera"][data-v="false"]'));
  afirma(!/dentro|fuera/i.test(await a.page.evaluate(() => document.querySelector('main').innerText)));
}));
prueba('tocar el botón marcado lo desmarca', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click('[data-acc="condena"][data-v="true"]'); await a.page.click('[data-acc="condena"][data-v="true"]');
  await recargar(a); igual((await ficha(a)).datos.condena, null);
}));
prueba('cocina: paredes, elementos, referencia que se recuerda y puntos de medida', con({}, async a => {
  await nueva(a, 'cocina');
  await a.page.click('[data-acc="anadir-pared"]'); await a.page.fill('[data-pared="A"] [data-acc="largo"]', '3000');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]');
  await a.page.click('[data-pared="A"] [data-elemento="desague"] [data-acc="ref"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]');
  igual(await a.page.$$eval('[data-pared="A"] [data-elemento="desague"] [data-acc="ref"]', b => b.map(x => x.dataset.v)), ['der', 'der']);
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="ventana"]');
  const v = '[data-pared="A"] [data-elemento="ventana"]';
  afirma(await a.page.$(v + ' [data-acc="ancho"]') && await a.page.$(v + ' [data-acc="alto"]'), 'ventana sin ancho y alto');
  afirma(/al borde/.test(await a.page.innerText(v)) && /al centro/.test(await a.page.innerText('[data-pared="A"] [data-elemento="desague"]')));
  await a.page.click('[data-acc="anadir-pared"]'); afirma(await a.page.$('[data-pared="B"]'), 'sin pared B');
  await recargar(a);
  const f = await ficha(a); igual(f.datos.paredes.length, 2); igual(f.datos.paredes[0].largo, 3000); igual(f.datos.paredes[0].elementos.map(e => e.ref), ['der', 'der', 'der']);
}));
prueba('armario corredera, abatible y vestidor muestran lo suyo', con({}, async a => {
  await nueva(a, 'armario', 'corredera'); afirma(await a.page.$('[data-acc="hojas"]') && !(await a.page.$('[data-acc="puertas"]')), 'corredera');
  afirma(!(await a.page.$('[data-acc="anadir-pared"]')), 'corredera con paredes');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="abatible"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  afirma(await a.page.$('[data-acc="puertas"]') && !(await a.page.$('[data-acc="hojas"]')), 'abatible');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="vestidor"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]');
  const tipos = await a.page.$$eval('[data-pared="A"] [data-acc="anadir-elemento"]', b => b.map(x => x.dataset.v));
  afirma(tipos.includes('enchufe') && !tipos.includes('humos'), tipos.join());
}));
prueba('unidades: cm admite un decimal, guarda mm y no guarda lo mal tecleado', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  igual(await a.page.getAttribute('[data-acc="ancho"]', 'inputmode'), 'decimal');
  await a.page.fill('[data-acc="ancho"]', '245,5'); await a.page.waitForTimeout(400); igual((await ficha(a)).datos.ancho, 2455);
  await a.page.fill('[data-acc="ancho"]', '245,55');
  afirma(await a.page.evaluate(() => document.querySelector('[data-c="ancho"]').classList.contains('error')), 'sin marca de error');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.ancho, null); igual((await ficha(a)).datos.mal, { ancho: '245,55' });
  await a.page.fill('[data-acc="ancho"]', '245,5'); await a.page.waitForTimeout(400);
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="unidad"][data-v="mm"]'); await a.page.click('[data-acc="abrir-ficha"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  igual(await val(a, '[data-acc="ancho"]'), '2455'); igual(await a.page.getAttribute('[data-acc="ancho"]', 'inputmode'), 'numeric');
}));
prueba('tecla a tecla, lo mal escrito no deja guardado un trozo y sigue avisando al volver', con({}, async a => {
  await nueva(a, 'puerta');
  await a.page.click('[data-acc="ancho"]'); await a.page.keyboard.type('1.500');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.ancho, null, 'guardó un trozo');
  await recargar(a);
  igual(await val(a, '[data-acc="ancho"]'), '1.500');
  afirma(await a.page.evaluate(() => document.querySelector('[data-c="ancho"]').classList.contains('error')), 'no avisa al volver');
  await a.page.fill('[data-acc="ancho"]', ''); await a.page.click('[data-acc="ancho"]'); await a.page.keyboard.type('1500');
  await recargar(a); igual((await ficha(a)).datos.ancho, 1500); igual((await ficha(a)).datos.mal, undefined);
}));
prueba('tecla a tecla en cm con dos decimales no guarda 245,5', con({}, async a => {
  await nueva(a, 'cocina', null, 'cm'); await a.page.click('[data-acc="anadir-pared"]');
  await a.page.click('[data-pared="A"] [data-acc="largo"]'); await a.page.keyboard.type('245,55');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.paredes[0].largo, null);
}));
prueba('avisos junto al dato y sin impedir guardar', con({}, async a => {
  await nueva(a, 'armario', 'corredera');
  await a.page.fill('[data-acc="ancho_arriba"]', '2000'); await a.page.fill('[data-acc="ancho_abajo"]', '2020');
  await a.page.waitForFunction(() => /difieren 20 mm/.test(document.querySelector('[data-avisos="anchos"]').innerText));
  await recargar(a); igual((await ficha(a)).datos.ancho_abajo, 2020);
  await a.page.waitForFunction(() => /difieren/.test(document.querySelector('[data-avisos="anchos"]').innerText));
}));
prueba('elemento fuera de la pared avisa en su tarjeta', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.click('[data-acc="anadir-pared"]'); await a.page.fill('[data-pared="A"] [data-acc="largo"]', '3000');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="gas"]'); await a.page.fill('[data-elemento="gas"] [data-acc="distancia"]', '3100');
  await a.page.waitForFunction(() => /se sale/.test(document.querySelector('[data-elemento="gas"] [data-avisos^="elemento."]').innerText));
}));
prueba('lo escrito justo antes de cerrar no se pierde', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill('[data-acc="ancho"]', '777');
  await a.page.evaluate(() => dispatchEvent(new Event('pagehide'))); await a.page.waitForTimeout(150); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]');
  igual(await val(a, '[data-acc="ancho"]'), '777');
}));
prueba('volver atrás enseguida tampoco pierde nada', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill('[data-acc="ancho"]', '778'); await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="abrir-ficha"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); igual(await val(a, '[data-acc="ancho"]'), '778');
}));
prueba('medidas libres y notas en cualquier ficha, y llegan a la nube', con({}, async a => {
  await nueva(a, 'nota');
  await a.page.click('[data-acc="anadir-libre"]'); await a.page.fill('[data-acc="libre-nombre"]', 'Mesa sierra'); await a.page.fill('[data-acc="libre-valor"]', '1200');
  await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Cambiar la hoja');
  await recargar(a); const f = await ficha(a);
  igual(f.datos.libres[0].nombre, 'Mesa sierra'); igual(f.datos.libres[0].mm, 1200); igual(f.datos.notas[0].texto, 'Cambiar la hoja');
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
  igual(a.nube.med_fichas[0].datos.notas[0].texto, 'Cambiar la hoja');
}));
prueba('borrar ficha pide confirmación', con({}, async a => {
  await nueva(a, 'puerta'); a.estado.aceptar = false; await a.page.click('[data-acc="borrar-ficha"]'); await a.page.waitForTimeout(100);
  afirma(await a.page.$('[data-pantalla="ficha"]'), 'se borró sin confirmar');
  a.estado.aceptar = true; await a.page.click('[data-acc="borrar-ficha"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 0);
}));
prueba('nota suelta usa la unidad de ajustes', con({}, async a => {
  await a.page.click('[data-acc="ajustes"]'); await a.page.click('[data-acc="unidad-pred"][data-v="cm"]');
  await a.page.evaluate(() => { location.hash = '#/sueltas'; }); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="nota"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); await a.page.click('[data-acc="anadir-libre"]');
  igual(await a.page.innerText('[data-libre] .ud'), 'cm');
}));
prueba('en móvil la cocina no se desborda', con({ ancho: 360 }, async a => {
  await nueva(a, 'cocina'); await a.page.click('[data-acc="anadir-pared"]'); await a.page.click('[data-acc="anadir-elemento"][data-v="ventana"]');
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
}));
fin();

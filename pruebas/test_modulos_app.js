import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nueva = async (a, tipo, subtipo) => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]');
  if (subtipo) await a.page.click('[data-acc="subtipo"][data-v="' + subtipo + '"]');
  await a.page.waitForSelector('[data-pantalla="ficha"]');
};
const recargar = async a => { await a.page.waitForTimeout(400); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]'); };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
const A = '[data-pared="A"] ';

prueba('módulos bajos de izquierda a derecha con anchos rápidos y cuadre', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill(A + '> [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="columna_hmo"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="fregadero"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="800"]');
  igual(await a.page.$$eval(A + '[data-fila="bajos"] [data-modulo]', m => m.length), 2);
  afirma(/Columna H\/MO/.test(await a.page.innerText(A + '[data-fila="bajos"] [data-modulo]:not(.abierto)')), 'la anterior no queda resumida');
  igual(await a.page.innerText(A + '[data-acc="cuadre-bajos"]'), 'Quedan 160 cm');
  igual(await a.page.innerText(A + '[data-acc="cuadre-altos"]'), '', 'sin altos no hay cuadre arriba');
  await a.page.click(A + '[data-fila="altos"] [data-acc="anadir-modulo"][data-v="alto"]');
  await a.page.click(A + '[data-fila="altos"] [data-modulo].abierto [data-acc="rapido"][data-v="1200"]');
  igual(await a.page.innerText(A + '[data-acc="cuadre-altos"]'), 'Quedan 120 cm');
  await a.page.waitForSelector('[data-acc="planta"] [data-modulo]');
  await recargar(a); const p = (await ficha(a)).datos.paredes[0];
  igual(p.bajos.map(m => [m.tipo, m.ancho]), [['columna_hmo', 600], ['fregadero', 800]]); igual(p.altos.map(m => [m.tipo, m.ancho]), [['alto', 1200]]);
}));
prueba('pasarse del largo avisa; subir y quitar módulos', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill(A + '> [data-c="largo"] input', '1');
  for (const v of ['bajo', 'cajonero']) { await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="' + v + '"]'); await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]'); }
  igual(await a.page.innerText(A + '[data-acc="cuadre-bajos"]'), 'Te pasas 20 cm');
  await a.page.waitForFunction(() => /te pasas/.test(document.querySelector('[data-pared="A"] [data-avisos^="pared."]').innerText));
  await a.page.click(A + '[data-fila="bajos"] [data-modulo]:nth-child(2) [data-acc="subir-modulo"]'); await a.page.waitForTimeout(400);
  igual((await ficha(a)).datos.paredes[0].bajos.map(m => m.tipo), ['cajonero', 'bajo']);
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="quitar-modulo"]'); await a.page.waitForTimeout(400);
  igual((await ficha(a)).datos.paredes[0].bajos.length, 1);
}));
prueba('acabados de cocina: bitono, encimera y lineales', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.click('[data-acc="abrir-acabados"]');
  await a.page.fill('[data-acc="acab-modelo"]', 'Alpha'); await a.page.fill('[data-acc="acab-color"]', 'Blanco');
  await a.page.click('[data-acc="bitono"][data-v="true"]');
  afirma(!(await a.page.$('[data-acc="acab-modelo"]')), 'sigue el modelo único');
  await a.page.fill('[data-acc="acab-modelo_altos"]', 'Alpha'); await a.page.fill('[data-acc="acab-color_bajos"]', 'Roble');
  await a.page.fill('[data-acc="encimera-material"]', 'Compacto'); await a.page.fill('[data-acc="encimera-grueso"]', '12');
  await a.page.click('[data-acc="anadir-lineal"][data-v="zocalo"]'); await a.page.fill('[data-lineal] [data-acc="lineal-modelo"]', 'Aluminio');
  await recargar(a); const ac = (await ficha(a)).datos.acabados;
  igual([ac.bitono, ac.modelo_altos, ac.color_bajos, ac.encimera.material, ac.encimera.grueso], [true, 'Alpha', 'Roble', 'Compacto', 12]);
  igual(ac.lineales.map(l => [l.tipo, l.modelo]), [['zocalo', 'Aluminio']]);
}));
prueba('cuerpos de armario con interior y cuadre con el hueco', con({}, async a => {
  await nueva(a, 'armario', 'abatible'); await a.page.fill('[data-acc="ancho_arriba"]', '1500');
  await a.page.click('[data-acc="anadir-cuerpo"]'); await a.page.click('[data-cuerpo].abierto [data-acc="rapido"][data-v="1000"]');
  await a.page.click('[data-cuerpo].abierto [data-acc="interior"][data-v="barra"]');
  await a.page.click('[data-acc="anadir-cuerpo"]'); await a.page.click('[data-cuerpo].abierto [data-acc="rapido"][data-v="600"]');
  igual(await a.page.innerText('[data-acc="cuadre-cuerpos"]'), 'Te pasas 10 cm');
  await recargar(a); igual((await ficha(a)).datos.cuerpos.map(c => [c.ancho, c.interior]), [[1000, 'barra'], [600, null]]);
}));
prueba('puertas: modelo y color para todas', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill('[data-acc="puertas-modelo"]', 'Lisa lacada'); await a.page.fill('[data-acc="puertas-color"]', 'Blanco');
  await recargar(a); const d = (await ficha(a)).datos; igual([d.modelo, d.color], ['Lisa lacada', 'Blanco']);
}));
prueba('módulo abierto: cambiar el tipo, medidas habituales del tipo, cerrar tocando el título; rinconero', con({}, async a => {
  await nueva(a, 'cocina');
  const F = A + '[data-fila="bajos"] ';
  await a.page.click(F + '[data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.selectOption(F + '.modulo.abierto [data-acc="tipo-modulo"]', 'lavavajillas');
  igual(await a.page.$$eval(F + '.modulo.abierto [data-acc="rapido"]', bs => bs.map(b => b.dataset.v)), ['450', '600']);
  await a.page.click(F + '.modulo.abierto [data-acc="rapido"][data-v="600"]');
  await a.page.click(F + '[data-acc="cerrar-modulo"]');
  igual((await a.page.$$(F + '.modulo.abierto')).length, 0, 'no se cierra');
  afirma((await a.page.innerText(F + '.modulo')).includes('Lavavajillas · 60'));
  await a.page.click(F + '[data-acc="anadir-modulo"][data-v="rinconero"]');
  await a.page.click(F + '.modulo.abierto [data-acc="forma-rinconero"][data-v="recto"]');
  igual(await a.page.$$eval(F + '.modulo.abierto [data-acc="rapido"]', bs => bs.map(b => b.dataset.v)), ['900', '1000', '1200']);
  afirma(await a.page.$(F + '.modulo.abierto [data-acc="gira-rinconero"][data-v="der"]'));
  await a.page.waitForTimeout(400); const f = await ficha(a);
  igual(f.datos.paredes[0].bajos.map(m => [m.tipo, m.ancho, m.forma || null]), [['lavavajillas', 600, null], ['rinconero', null, 'recto']]);
}));
prueba('las listas de módulos, lineales e interiores se ajustan en Ajustes', con({}, async a => {
  await a.page.evaluate(() => { location.hash = '#/ajustes'; }); await a.page.waitForSelector('[data-pantalla="ajustes"]');
  for (const k of ['modulo_anchos', 'lineales', 'interiores']) afirma(await a.page.$('[data-lista="' + k + '"]'), 'falta ' + k);
  await a.page.fill('[data-lista="modulo_anchos"] [data-acc="nuevo"]', '35'); await a.page.click('[data-lista="modulo_anchos"] [data-acc="anadir"]');
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await nueva(a, 'cocina'); await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  afirma(await a.page.$(A + '[data-modulo].abierto [data-acc="rapido"][data-v="350"]'), 'no sale el ancho nuevo');
}));
fin();

import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo, hasta } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const estadoEs = (a, re) => a.page.waitForFunction(r => new RegExp(r).test(document.querySelector('[data-acc="estado"]').innerText), re.source, { timeout: 10000 });
const irA = async (a, hash, pantalla) => { await a.page.evaluate(x => { location.hash = x; }, hash); await a.page.waitForSelector('[data-pantalla="' + pantalla + '"]'); };

// ── 1: lo que la nube rechaza se ve y se puede reintentar o descartar ──
prueba('un cambio rechazado se ve con su motivo y se puede reintentar', con({}, async a => {
  let rechaza = true;
  a.nube.rechazar = (t, f) => rechaza && t === 'med_trabajos' && f.nombre === 'Malo';
  await crearTrabajo(a, 'Malo');
  await estadoEs(a, /1 sin poder subir/);
  await a.page.click('[data-acc="estado"]'); await a.page.waitForSelector('[data-pantalla="pendientes"]');
  const t = await a.page.innerText('main'); afirma(/Malo/.test(t) && /valor no válido/.test(t), t);
  rechaza = false;
  await a.page.click('[data-acc="reintentar"]');
  await estadoEs(a, /Todo guardado/);
  igual(a.nube.med_trabajos.map(x => x.nombre), ['Malo']);
}));
prueba('descartar un trabajo nuevo rechazado lo quita', con({}, async a => {
  a.nube.rechazar = (t, f) => t === 'med_trabajos';
  await crearTrabajo(a, 'Malo');
  await estadoEs(a, /1 sin poder subir/);
  await a.page.click('[data-acc="estado"]'); await a.page.waitForSelector('[data-pantalla="pendientes"]');
  await a.page.click('[data-acc="descartar"]');
  await estadoEs(a, /Todo guardado/);
  await irA(a, '#/', 'inicio');
  igual((await a.page.$$('[data-acc="abrir-trabajo"]')).length, 0);
}));

// ── 3: trabajo borrado en otro móvil con fichas vivas aquí ──
prueba('si otro móvil borra un trabajo con una ficha viva aquí, el trabajo vuelve', con({}, async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="nota"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-acc="nombre-ficha"]', 'Medidas'); await a.page.waitForTimeout(400);
  await irA(a, '#/', 'inicio'); await estadoEs(a, /Todo guardado/);
  const t = a.nube.med_trabajos[0]; t.borrado_at = new Date().toISOString(); t.updated_at = new Date(Date.parse(t.updated_at) + 5000).toISOString();
  await a.page.click('[data-acc="estado"]');
  await hasta(async () => a.nube.med_trabajos[0].borrado_at === null, 'no se recupera en la nube');
  await irA(a, '#/papelera', 'papelera'); await irA(a, '#/', 'inicio');
  igual(await a.page.innerText('[data-acc="abrir-trabajo"] b'), 'Casa');
}));

// ── 5: plano ──
prueba('con cinco paredes sin forma dibujada avisa de que el dibujo es aproximado', con({}, async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  for (let i = 0; i < 4; i++) await a.page.click('[data-acc="anadir-pared"]');
  await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
  await a.page.waitForSelector('[data-acc="aviso-forma"]');
}));

prueba('al guardar la forma el botón pasa a «Editar la forma» sin recargar', con({}, async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="dibujar-planta"]'); await a.page.waitForSelector('[data-acc="zona-dibujo"]');
  const z = await (await a.page.$('[data-acc="zona-dibujo"]')).boundingBox();
  const vs = [[0.15, 0.2], [0.85, 0.2], [0.85, 0.75], [0.15, 0.75], [0.15, 0.2]].map(([x, y]) => [z.x + x * z.width, z.y + y * z.height]);
  await a.page.mouse.move(...vs[0]); await a.page.mouse.down();
  for (let i = 1; i < vs.length; i++) for (let k = 1; k <= 20; k++) await a.page.mouse.move(vs[i - 1][0] + (vs[i][0] - vs[i - 1][0]) * k / 20, vs[i - 1][1] + (vs[i][1] - vs[i - 1][1]) * k / 20);
  await a.page.mouse.up(); await a.page.waitForSelector('[data-letra]');
  for (const v of ['3', '2', '3', '2']) { await a.page.fill('[data-acc="largo-pared"]', v); await a.page.click('[data-acc="siguiente-pared"]'); }
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  igual(await a.page.innerText('[data-acc="dibujar-planta"]'), 'Editar la forma');
}));

fin();

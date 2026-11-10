import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo, nubeNueva } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const irAjustes = async a => { await a.page.evaluate(() => { location.hash = '#/ajustes'; }); await a.page.waitForSelector('[data-pantalla="ajustes"]'); };
const lista = (a, k) => a.page.$$eval('[data-lista="' + k + '"] [data-item]', x => x.map(i => i.dataset.item));
const anadir = async (a, k, v) => { await a.page.fill('[data-lista="' + k + '"] [data-acc="nuevo"]', v); await a.page.click('[data-lista="' + k + '"] [data-acc="anadir"]'); };
const irInicio = async a => { await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]'); };
const nueva = async (a, tipo) => { await irInicio(a); await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); };

prueba('añadir un ancho de puerta lo pone como botón rápido', con({}, async a => {
  await irAjustes(a); igual(await lista(a, 'puerta_anchos'), ['920', '820', '720', '620']);
  await anadir(a, 'puerta_anchos', '85'); igual(await lista(a, 'puerta_anchos'), ['920', '820', '720', '620', '850']);
  await nueva(a, 'puerta');
  igual(await a.page.$$eval('[data-puerta].abierta [data-c="ancho"] [data-acc="rapido"]', b => b.map(x => x.dataset.v)), ['920', '820', '720', '620', '850']);
}));
prueba('quitar, subir y volver a los de fábrica', con({}, async a => {
  await irAjustes(a);
  await a.page.click('[data-lista="puerta_altos"] [data-item="2110"] [data-acc="quitar"]'); igual(await lista(a, 'puerta_altos'), ['2030']);
  await a.page.click('[data-lista="puerta_tabiques"] [data-item="110"] [data-acc="subir"]'); igual(await lista(a, 'puerta_tabiques'), ['70', '110', '90']);
  await a.page.click('[data-lista="puerta_altos"] [data-acc="fabrica"]'); igual(await lista(a, 'puerta_altos'), ['2030', '2110']);
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ajustes"]'); igual(await lista(a, 'puerta_tabiques'), ['70', '110', '90']);
}));
prueba('un uso de enchufe nuevo sale en la ficha y da nombre al enchufe', con({}, async a => {
  await irAjustes(a); await anadir(a, 'usos_enchufe', 'Secadora');
  afirma((await lista(a, 'usos_enchufe')).includes('secadora'));
  await nueva(a, 'cocina'); await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="enchufe"]');
  await a.page.click('[data-elemento="enchufe"] [data-acc="para"][data-v="secadora"]');
  igual(await a.page.innerText('[data-elemento="enchufe"] [data-acc="nombre-elemento-titulo"]'), 'Enchufe Secadora');
}));
prueba('el margen de aviso cambia los avisos', con({}, async a => {
  await irAjustes(a); await a.page.fill('[data-acc="margen"]', '20'); await a.page.waitForTimeout(400);
  await irInicio(a); await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="corredera"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-acc="ancho_arriba"]', '2000'); await a.page.fill('[data-acc="ancho_abajo"]', '2015'); await a.page.waitForTimeout(200);
  igual(await a.page.innerText('[data-avisos="anchos"]'), '');
  await a.page.fill('[data-acc="ancho_abajo"]', '2025');
  await a.page.waitForFunction(() => /difieren/.test(document.querySelector('[data-avisos="anchos"]').innerText));
}));
prueba('los ajustes se comparten con otro dispositivo', async () => {
  const nube = nubeNueva(), a = await abrir({ nube }); await entrar(a); await irAjustes(a);
  await a.page.click('[data-acc="unidad-pred"][data-v="cm"]'); await anadir(a, 'puerta_anchos', '85');
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 8000 });
  const b = await abrir({ nube }); await entrar(b); await b.page.waitForTimeout(1500); await irAjustes(b);
  afirma((await lista(b, 'puerta_anchos')).includes('850'), 'no llegó la lista');
  afirma(await b.page.evaluate(() => document.querySelector('[data-acc="unidad-pred"][data-v="cm"]').classList.contains('on')), 'no llegó la unidad');
  const err = b.errores.slice(); await a.cerrar(); await b.cerrar(); igual(err, []);
});
fin();

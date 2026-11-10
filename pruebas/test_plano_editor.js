import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const cocina = async (a, unidad) => {
  await crearTrabajo(a, 'Casa');
  if (unidad) { await a.page.click('[data-acc="unidad"][data-v="' + unidad + '"]'); await a.page.waitForTimeout(50); }
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
};
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

// Dibuja con el ratón un trazo tembloroso que pasa por los vértices (en fracciones del área de dibujo).
async function dibujar(a, vertices, cerrar = true) {
  const z = await (await a.page.$('[data-acc="zona-dibujo"]')).boundingBox();
  const P = ([fx, fy]) => [z.x + fx * z.width, z.y + fy * z.height];
  const vs = (cerrar ? vertices.concat([vertices[0]]) : vertices).map(P);
  let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  await a.page.mouse.move(...vs[0]); await a.page.mouse.down();
  for (let i = 1; i < vs.length; i++) {
    const [x0, y0] = vs[i - 1], [x1, y1] = vs[i], n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let k = 1; k <= n; k++) await a.page.mouse.move(x0 + (x1 - x0) * k / n + r() * 4, y0 + (y1 - y0) * k / n + r() * 4);
  }
  await a.page.mouse.up();
}
const RECT = [[0.15, 0.2], [0.85, 0.2], [0.85, 0.75], [0.15, 0.75]];
const abrirEditor = async a => { await a.page.click('[data-acc="dibujar-planta"]'); await a.page.waitForSelector('[data-acc="zona-dibujo"]'); };
const largos = async (a, valores) => {
  for (const v of valores) { await a.page.fill('[data-acc="largo-pared"]', v); await a.page.click('[data-acc="siguiente-pared"]'); }
};
const estado = a => a.page.innerText('[data-acc="estado-plano"]');

prueba('un rectángulo a mano da cuatro paredes y, con medidas que cierran, se guarda', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT);
  await a.page.waitForSelector('[data-letra]'); igual(await a.page.$$eval('[data-letra]', t => t.map(x => x.dataset.letra)), ['A', 'B', 'C', 'D']);
  igual(await a.page.innerText('.fila-pared .ud'), 'm');
  await largos(a, ['3', '2', '3', '2']);
  afirma(/cierran/.test(await estado(a)), await estado(a));
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  const f = await ficha(a); igual(f.datos.paredes.map(p => [p.letra, p.largo]), [['A', 3000], ['B', 2000], ['C', 3000], ['D', 2000]]);
  afirma(f.datos.plano && f.datos.plano.vertices.length === 4 && f.datos.plano.cerrada, 'sin plano guardado');
  afirma(await a.page.$('[data-acc="planta"]'), 'no se ve la planta');
  await a.page.waitForTimeout(400); await a.page.reload(); await a.page.waitForSelector('[data-acc="planta"]');
  igual(await a.page.innerText('[data-acc="dibujar-planta"]'), 'Editar la forma');
}));
prueba('medidas que no cierran: avisa con los milímetros y las paredes', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await largos(a, ['3', '2', '3,05', '2']);
  const t = await estado(a); afirma(/No cierra/.test(t) && /50 mm/.test(t) && /A, C/.test(t), t);
}));
prueba('esquina descuadrada sin desviación: no se puede comprobar', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await largos(a, ['3', '2', '3', '2']);
  await a.page.click('[data-esquina="1"]'); await a.page.click('[data-acc="esquina"][data-v="descuadrada"]');
  afirma(/no se puede comprobar/.test(await estado(a)), await estado(a));
  await a.page.fill('[data-acc="desvio"]', '0'); await a.page.dispatchEvent('[data-acc="desvio"]', 'change');
  afirma(/cierran/.test(await estado(a)), await estado(a));
}));
prueba('diagonal: compara la medida con la calculada', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await largos(a, ['3', '2', '3', '2']);
  await a.page.click('[data-acc="anadir-diagonal"]'); await a.page.click('[data-esquina="0"]'); await a.page.click('[data-esquina="2"]');
  await a.page.fill('[data-acc="diagonal"]', '3,62'); await a.page.dispatchEvent('[data-acc="diagonal"]', 'change');
  afirma(/no coincide/.test(await a.page.innerText('.plano-panel')), await a.page.innerText('.plano-panel'));
  await a.page.fill('[data-acc="diagonal"]', '3,606'); await a.page.dispatchEvent('[data-acc="diagonal"]', 'change');
  afirma(/✓/.test(await a.page.innerText('.plano-panel')) && !/no coincide/.test(await a.page.innerText('.plano-panel')));
}));
prueba('volver a editar conserva medidas y elementos de las paredes', con({}, async a => {
  await cocina(a);
  await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3'); await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="humos"]');
  await a.page.fill('[data-elemento="humos"] [data-acc="distancia"]', '150');
  await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  igual(await a.page.inputValue('[data-acc="largo-pared"]'), '3');
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  const f = await ficha(a); igual(f.datos.paredes[0].largo, 3000); igual(f.datos.paredes[0].elementos.map(e => e.tipo), ['humos']);
}));
prueba('la planta enseña los elementos en su pared, y lo que no se puede situar', con({}, async a => {
  await cocina(a);
  await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]'); await a.page.fill('[data-elemento="desague"] [data-acc="distancia"]', '60');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="toma"]'); await a.page.click('[data-elemento="toma"] [data-acc="para"][data-v="gas"]');
  await a.page.waitForSelector('[data-acc="planta"] [data-elemento="desague"]');
  afirma(/Toma de gas en A/.test(await a.page.innerText('[data-acc="sin-situar"]')), 'no lista el gas sin distancia');
}));
prueba('cancelar no cambia nada; en puertas no hay planta', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await a.page.click('[data-acc="cancelar-plano"]'); await a.page.waitForTimeout(200);
  const f = await ficha(a); igual(f.datos.paredes.length, 1); afirma(!f.datos.plano);
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-puerta]');
  afirma(!(await a.page.$('[data-acc="dibujar-planta"]')), 'puertas con planta');
}));
prueba('un garabato sin forma pide repetir', con({}, async a => {
  await cocina(a); await abrirEditor(a);
  const z = await (await a.page.$('[data-acc="zona-dibujo"]')).boundingBox();
  await a.page.mouse.move(z.x + 50, z.y + 50); await a.page.mouse.down(); await a.page.mouse.up();
  afirma(/No he entendido/.test(await a.page.innerText('.plano-panel')));
}));
prueba('el plano viaja a la nube con la ficha', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 8000 });
  afirma(a.nube.med_fichas.some(f => f.datos.plano && f.datos.plano.vertices.length === 4), 'el plano no subió');
}));
prueba('en el móvil el editor cabe', con({ ancho: 360 }, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  afirma(await a.page.isVisible('[data-acc="largo-pared"]') && await a.page.isVisible('[data-acc="guardar-plano"]'));
}));
prueba('cancelar al reabrir no guarda lo tocado', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await largos(a, ['3', '2', '3', '2']); await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  await a.page.click('[data-acc="dibujar-planta"]'); await a.page.waitForSelector('[data-letra]');
  await a.page.click('[data-esquina="1"]'); await a.page.click('[data-acc="esquina"][data-v="descuadrada"]');
  await a.page.click('[data-acc="anadir-diagonal"]'); await a.page.click('[data-esquina="0"]'); await a.page.click('[data-esquina="2"]');
  await a.page.click('[data-acc="cancelar-plano"]');
  await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3,1'); await a.page.waitForTimeout(500);
  const f = await ficha(a); igual(f.datos.plano.diagonales, []); afirma(!(f.datos.plano.esquinas || []).some(e => e && e.estado === 'descuadrada'), JSON.stringify(f.datos.plano.esquinas));
}));
prueba('invertir solo se ofrece con una pared suelta', con({}, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, [[0.15, 0.2], [0.85, 0.2], [0.85, 0.75]], false); await a.page.waitForSelector('[data-letra]');
  afirma(!(await a.page.$('[data-acc="invertir"]')), 'invertir con varias paredes');
  await a.page.click('[data-acc="repetir"]'); await dibujar(a, [[0.15, 0.4], [0.85, 0.42]], false); await a.page.waitForSelector('[data-letra]');
  afirma(await a.page.$('[data-acc="invertir"]'), 'sin invertir en una pared');
}));
prueba('tras repetir el dibujo, el lienzo coincide con su caja', con({ ancho: 390 }, async a => {
  await cocina(a); await abrirEditor(a); await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]');
  await a.page.click('[data-esquina="1"]'); await a.page.click('[data-acc="repetir"]'); await a.page.waitForSelector('[data-acc="zona-dibujo"]');
  const r = await a.page.evaluate(() => { const s = document.querySelector('.plano-svg'), b = s.getBoundingClientRect(), v = s.viewBox.baseVal; return [v.width / v.height, b.width / b.height]; });
  afirma(Math.abs(r[0] - r[1]) < 0.02, JSON.stringify(r));
  await dibujar(a, RECT); await a.page.waitForSelector('[data-letra]'); igual((await a.page.$$('[data-letra]')).length, 4);
}));
fin();

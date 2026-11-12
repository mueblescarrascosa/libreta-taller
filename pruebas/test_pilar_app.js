import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
async function dibujar(a, vertices) {
  const z = await (await a.page.$('[data-acc="zona-dibujo"]')).boundingBox();
  const vs = vertices.concat([vertices[0]]).map(([fx, fy]) => [z.x + fx * z.width, z.y + fy * z.height]);
  let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  await a.page.mouse.move(...vs[0]); await a.page.mouse.down();
  for (let i = 1; i < vs.length; i++) {
    const [x0, y0] = vs[i - 1], [x1, y1] = vs[i], n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let k = 1; k <= n; k++) await a.page.mouse.move(x0 + (x1 - x0) * k / n + r() * 3, y0 + (y1 - y0) * k / n + r() * 3);
  }
  await a.page.mouse.up();
}
// Habitación con un pilar en el rincón de arriba a la derecha.
const RINCON = [[0.15, 0.2], [0.75, 0.2], [0.75, 0.3], [0.85, 0.3], [0.85, 0.75], [0.15, 0.75]];
const empezar = async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="dibujar-planta"]'); await a.page.waitForSelector('[data-acc="zona-dibujo"]');
  await dibujar(a, RINCON); await a.page.waitForSelector('[data-letra]');
};

prueba('un pilar dibujado no son paredes: 4 paredes y el pilar en la A', con(async a => {
  await empezar(a);
  igual(await a.page.$$eval('[data-letra]', t => t.map(x => x.dataset.letra)), ['A', 'B', 'C', 'D']);
  afirma(/Pilar en A/.test(await a.page.innerText('[data-acc="aviso-pilares"]')), await a.page.innerText('[data-acc="aviso-pilares"]'));
  await a.page.screenshot({ path: process.env.CAPTURA || 'pilar_editor.png' });
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="D"]');
  const f = await ficha(a);
  igual(f.datos.paredes.length, 4);
  const p = f.datos.paredes[0].elementos.filter(e => e.tipo === 'pilar');
  igual(p.length, 1); igual([p[0].ref, p[0].distancia], ['der', 0]);
}));
prueba('si se pide, el pilar se hace paredes', con(async a => {
  await empezar(a);
  await a.page.click('[data-acc="pilares-paredes"]');
  igual((await a.page.$$eval('[data-letra]', t => t.map(x => x.dataset.letra))).length, 6);
  igual(await a.page.$('[data-acc="aviso-pilares"]'), null);
}));
prueba('un plano de antes con el pilar como paredes: el botón lo pasa a pilar', con(async a => {
  await empezar(a);
  await a.page.click('[data-acc="pilares-paredes"]');
  await a.page.click('[data-acc="guardar-plano"]'); await a.page.waitForSelector('[data-pared="F"]');
  afirma(/B y C parecen un pilar/.test(await a.page.innerText('[data-acc="pilar-en-paredes"]')));
  await a.page.click('[data-acc="pasar-a-pilar"]'); await a.page.waitForTimeout(1500);
  igual(await a.page.$('[data-acc="pilar-en-paredes"]'), null);
  const f = await ficha(a);
  igual(f.datos.paredes.map(p => p.letra), ['A', 'B', 'C', 'D']);
  igual(f.datos.paredes[0].elementos.filter(e => e.tipo === 'pilar').length, 1);
  await a.page.screenshot({ path: process.env.CAPTURA2 || 'pilar_ficha.png', fullPage: true });
}));
fin();

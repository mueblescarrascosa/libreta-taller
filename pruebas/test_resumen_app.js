import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nueva = async (a, tipo) => { await crearTrabajo(a, 'Reforma Sol'); await a.page.fill('[data-acc="cliente"]', 'Juan'); await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); if (tipo === 'puerta') await a.page.click('[data-acc="medida-de"][data-v="puerta"]'); };
const P = '[data-puerta].abierta ';
const terminar = async a => { await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('[data-pantalla="resumen"]'); };

prueba('terminar guarda y enseña el resumen de puertas', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill('[data-acc="puertas-modelo"]', 'Lisa');
  await a.page.fill(P + '[data-acc="nombre-puerta"]', 'Dormitorio 1'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]');
  await a.page.click('[data-acc="anadir-puerta"]'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="720"]');
  await terminar(a);
  const t = await a.page.innerText('.resumen-doc');
  afirma(t.includes('Reforma Sol') && t.includes('Juan') && t.includes('Lisa') && t.includes('Dormitorio 1'), t);
  igual(await a.page.$$eval('.resumen-doc table tbody tr', r => r.length), 2);
  await a.page.click('[data-acc="editar"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
}));
prueba('el resumen de cocina trae la planta, las paredes y los módulos', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="humos"]'); await a.page.fill('[data-elemento="humos"] [data-acc="distancia"]', '600');
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="fregadero"]');
  await a.page.click('[data-pared="A"] [data-modulo].abierto [data-acc="rapido"][data-v="800"]');
  await terminar(a);
  afirma(await a.page.$('.resumen-doc svg.planta'), 'sin planta');
  const t = await a.page.innerText('.resumen-doc'); afirma(/Pared A/.test(t) && /Salida de humos/.test(t) && /Fregadero 80/.test(t), t);
}));
prueba('imprimir llama a la impresión del navegador', con({}, async a => {
  await nueva(a, 'nota'); await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Hola'); await terminar(a);
  await a.page.evaluate(() => { window.print = () => { window.__impreso = true; }; });
  await a.page.click('[data-acc="imprimir"]'); igual(await a.page.evaluate(() => window.__impreso), true);
}));
prueba('enviar PDF comparte un archivo PDF si el móvil lo permite', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await terminar(a);
  await a.page.evaluate(() => { navigator.canShare = () => true; navigator.share = async o => { window.__comp = { n: o.files[0].name, t: o.files[0].type, s: o.files[0].size }; }; });
  await a.page.click('[data-acc="enviar-pdf"]');
  await a.page.waitForFunction(() => window.__comp, null, { timeout: 20000 });
  const c = await a.page.evaluate(() => window.__comp);
  afirma(/\.pdf$/.test(c.n) && c.t === 'application/pdf' && c.s > 3000, JSON.stringify(c));
}));
prueba('sin compartir archivos, el PDF se descarga', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await terminar(a);
  await a.page.evaluate(() => { navigator.canShare = () => false; });
  const [d] = await Promise.all([a.page.waitForEvent('download', { timeout: 20000 }), a.page.click('[data-acc="enviar-pdf"]')]);
  afirma(/\.pdf$/.test(d.suggestedFilename()), d.suggestedFilename());
}));
prueba('WhatsApp abre WhatsApp directamente con el texto', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await terminar(a);
  await a.page.evaluate(() => { window.open = u => { window.__url = u; }; });
  await a.page.click('header [data-acc="enviar-texto"]'); await a.page.waitForFunction(() => window.__url);
  const u = await a.page.evaluate(() => window.__url);
  afirma(/^https:\/\/wa\.me\/\?text=/.test(u) && /\*Reforma Sol\*/.test(decodeURIComponent(u)), u);
}));
prueba('resumen: todos los botones en la barra de arriba, en una fila que cabe en el móvil', con({}, async a => {
  await a.page.setViewportSize({ width: 360, height: 740 });
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await terminar(a);
  igual(await a.page.$$eval('header .barra-acciones .boton-barra', bs => bs.map(b => b.dataset.acc)), ['editar', 'enviar-texto', 'enviar-pdf', 'descargar-pdf', 'imprimir']);
  igual((await a.page.$$('main .acciones')).length, 0, 'quedan botones en el cuerpo');
  const tops = await a.page.$$eval('header .boton-barra', bs => [...new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)))]);
  igual(tops.length, 1, 'no caben en una fila');
  afirma(await a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'se sale de lado');
}));
prueba('la cabecera del resumen es clara y legible, también al imprimir', con({}, async a => {
  await nueva(a, 'nota'); await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Hola'); await terminar(a);
  const ver = () => a.page.$eval('.resumen-doc header', e => { const s = getComputedStyle(e), p = getComputedStyle(e.querySelector('p:not(.empresa)')); return [s.backgroundColor, s.display, s.position, p.color].join('|'); });
  igual(await ver(), 'rgba(0, 0, 0, 0)|block|static|rgb(55, 65, 81)');
  await a.page.emulateMedia({ media: 'print' });
  afirma((await ver()).includes('|block|'), await ver());
  igual(await a.page.$eval('body > * > header:not(.resumen-doc header)', e => getComputedStyle(e).display), 'none');
}));
prueba('descargar PDF baja el archivo con nombre, cliente y fecha', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await terminar(a);
  const [d] = await Promise.all([a.page.waitForEvent('download', { timeout: 20000 }), a.page.click('[data-acc="descargar-pdf"]')]);
  afirma(/^Reforma Sol - .*Juan - \d{2}-\d{2}-\d{4}\.pdf$/.test(d.suggestedFilename()), d.suggestedFilename());
}));
prueba('al imprimir el título de la página lleva los datos del trabajo y luego vuelve', con({}, async a => {
  await nueva(a, 'nota'); await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Hola'); await terminar(a);
  const antes = await a.page.title();
  await a.page.evaluate(() => { window.print = () => { window.__titulo = document.title; }; });
  await a.page.click('[data-acc="imprimir"]');
  afirma(/Reforma Sol.*Juan/.test(await a.page.evaluate(() => window.__titulo)), await a.page.evaluate(() => window.__titulo));
  await a.page.waitForFunction(t => document.title === t, antes, { timeout: 5000 });
}));
prueba('en el móvil el resumen cabe', con({ ancho: 360 }, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3'); await terminar(a);
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
}));
fin();

import fs from 'fs';
import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo, hasta } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const dentro = (op, fn) => con(op, async a => { await entrar(a); await fn(a); });
const irInicio = async a => { await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]'); };
const irAjustes = async a => { await a.page.click('[data-acc="ajustes"]'); await a.page.waitForSelector('[data-pantalla="ajustes"]'); };
const texto = a => a.page.evaluate(() => document.body.innerText);
const on = (a, sel) => a.page.evaluate(s => document.querySelector(s).classList.contains('on'), sel);

prueba('sin sesión pide entrar', con({}, async a => { await a.page.waitForSelector('[data-acc="email"]'); afirma(!(await a.page.$('[data-pantalla="inicio"]'))); }));
prueba('contraseña mal escrita lo dice', con({}, async a => {
  await a.page.route(/auth\/v1\/token/, r => r.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"error":"invalid_grant","error_description":"x"}' }));
  await a.page.fill('[data-acc="email"]', 'a@b.c'); await a.page.fill('[data-acc="pass"]', 'mal'); await a.page.click('[data-acc="entrar"]');
  await a.page.waitForFunction(() => /incorrectos/.test(document.body.innerText));
}));
prueba('crear trabajo trae marcada la unidad de ajustes', dentro({}, async a => {
  await irAjustes(a); await a.page.click('[data-acc="unidad-pred"][data-v="cm"]'); await irInicio(a);
  await a.page.click('[data-acc="nuevo-trabajo"]'); afirma(await on(a, '[data-acc="trabajo-unidad"][data-v="cm"]'), 'no marca cm');
  await a.page.fill('[data-acc="trabajo-nombre"]', 'Casa'); await a.page.click('[data-acc="trabajo-crear"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  afirma(await on(a, '[data-acc="unidad"][data-v="cm"]'), 'el trabajo no quedó en cm');
}));
prueba('cambiar la unidad del trabajo persiste', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(100); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  afirma(await on(a, '[data-acc="unidad"][data-v="cm"]'));
}));
prueba('cambiar el predeterminado no altera trabajos existentes', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); const h = await a.page.evaluate(() => location.hash); await irAjustes(a); await a.page.click('[data-acc="unidad-pred"][data-v="cm"]');
  await a.page.evaluate(x => { location.hash = x; }, h); await a.page.waitForSelector('[data-pantalla="trabajo"]'); afirma(await on(a, '[data-acc="unidad"][data-v="mm"]'));
}));
prueba('nombre, cliente y dirección se guardan y el buscador los encuentra', dentro({}, async a => {
  await crearTrabajo(a, 'Reforma'); await a.page.fill('[data-acc="cliente"]', 'García'); await a.page.waitForTimeout(400); await irInicio(a);
  await crearTrabajo(a, 'Otro'); await irInicio(a);
  await a.page.fill('[data-acc="buscar"]', 'garcia');
  await a.page.waitForFunction(() => document.querySelectorAll('[data-acc="abrir-trabajo"]').length === 1);
  afirma((await texto(a)).includes('Reforma'));
}));
prueba('borrar trabajo pide confirmación', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); a.estado.aceptar = false; await a.page.click('[data-acc="borrar-trabajo"]'); await a.page.waitForTimeout(100);
  afirma(a.estado.dialogos.some(d => d.startsWith('confirm')), 'sin confirmar'); afirma(await a.page.$('[data-pantalla="trabajo"]'), 'se fue');
  a.estado.aceptar = true; await a.page.click('[data-acc="borrar-trabajo"]'); await a.page.waitForSelector('[data-pantalla="inicio"]');
  igual((await a.page.$$('[data-acc="abrir-trabajo"]')).length, 0);
}));
prueba('indicador: cuenta sin red y vuelve a cero con red; llega a la nube', dentro({}, async a => {
  a.nube.sinRed = true; await crearTrabajo(a, 'Casa');
  await a.page.waitForFunction(() => /1 por subir/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
  a.nube.sinRed = false; await a.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
  igual(a.nube.med_trabajos.length, 1); igual(a.nube.med_trabajos[0].nombre, 'Casa'); afirma(!('updated_at_local' in a.nube.med_trabajos[0]));
}));
prueba('arranca sin red con la sesión guardada', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); await a.page.waitForTimeout(100); await irInicio(a); a.nube.sinRed = true; await a.page.reload();
  await a.page.waitForSelector('[data-pantalla="inicio"]'); afirma((await texto(a)).includes('Casa'));
}));
prueba('lo escrito en el trabajo justo antes de cerrar no se pierde', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); await a.page.fill('[data-acc="cliente"]', 'Pepe');
  await a.page.evaluate(() => dispatchEvent(new Event('pagehide'))); await a.page.waitForTimeout(150); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual(await a.page.inputValue('[data-acc="cliente"]'), 'Pepe');
}));
prueba('sin la librería de Supabase la app abre igual con lo guardado', dentro({}, async a => {
  await crearTrabajo(a, 'Casa'); await a.page.waitForTimeout(100); await irInicio(a);
  await a.page.route(/cdn\.jsdelivr\.net/, r => r.abort());
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="inicio"]'); afirma((await texto(a)).includes('Casa'));
  await crearTrabajo(a, 'Sin red');
  await a.page.waitForFunction(() => /por subir/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
}));
prueba('el service worker guarda la librería al instalarse', async () => {
  const s = fs.readFileSync('docs/sw.js', 'utf8'), html = fs.readFileSync('docs/index.html', 'utf8');
  const url = /src="(https:\/\/cdn\.jsdelivr\.net[^"]+)"/.exec(html)[1];
  afirma(s.includes(url), 'sw no precarga ' + url);
});
prueba('sesión caducada: el indicador pide entrar', dentro({}, async a => {
  a.nube.caducada = true; await crearTrabajo(a, 'Casa');
  await a.page.waitForFunction(() => /Entra de nuevo/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
}));
prueba('otro dispositivo recibe lo creado', async () => {
  const a = await abrir(); await entrar(a); await crearTrabajo(a, 'Compartido');
  await hasta(() => a.nube.med_trabajos.length === 1, 'subida');
  const b = await abrir({ nube: a.nube }); await entrar(b);
  await b.page.waitForFunction(() => /Compartido/.test(document.body.innerText), null, { timeout: 6000 });
  await a.cerrar(); await b.cerrar();
});
prueba('en móvil no hay desborde horizontal', dentro({ ancho: 360 }, async a => {
  await crearTrabajo(a, 'Un nombre de trabajo bastante largo para probar el ancho de la pantalla del móvil');
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
}));
prueba('las etiquetas en un nombre se ven como texto', dentro({}, async a => {
  await crearTrabajo(a, '<img src=x onerror="window.__x=1">'); await irInicio(a);
  igual(await a.page.evaluate(() => [document.querySelectorAll('#app img').length, !!window.__x]), [0, false]);
  afirma((await texto(a)).includes('<img src=x'));
}));
prueba('sw.js solo borra sus cachés y cubre todos los archivos', async () => {
  const s = fs.readFileSync('docs/sw.js', 'utf8');
  afirma(/startsWith\('medidas-'\)/.test(s), 'filtro de cachés');
  const app = JSON.parse('[' + /const APP = \[([^\]]+)\]/.exec(s)[1].replace(/'/g, '"') + ']');
  for (const f of app) if (f !== './') afirma(fs.existsSync('docs/' + f), 'falta ' + f);
  const js = []; const rec = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? rec(d + '/' + e.name) : js.push(d + '/' + e.name)); rec('docs/js');
  for (const f of js) afirma(app.includes('./' + f.slice(5)), 'sw no cubre ' + f);
});
fin();

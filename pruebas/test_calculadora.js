import { prueba, afirma, igual, fin } from './mini.js';
import { calcular, verNumero } from '../docs/js/calculadora.js';
import { abrir, entrar } from './arnes.js';

prueba('cuentas: decimales con coma, orden de las operaciones, paréntesis y menos delante', () => {
  igual(calcular('240-1,5'), 238.5);
  igual(calcular('2+3×4'), 14);
  igual(calcular('(2+3)×4'), 20);
  igual(calcular('−5+2'), -3);
  igual(calcular('10÷4'), 2.5);
  igual(calcular('82.5*2'), 165);
  igual(calcular(''), null);
  igual(verNumero(10 / 3), '3,3333');
  for (const mal of ['2+', '(2+3', '5÷0', '1,2,3', '2)']) { let error = false; try { calcular(mal); } catch (e) { error = true; } afirma(error, mal); }
});

const con = fn => async () => { const a = await abrir(); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('el icono de la calculadora está arriba en todas las pantallas y la calculadora funciona', con(async a => {
  await a.page.setViewportSize({ width: 360, height: 740 });
  afirma(await a.page.$('header [data-acc="abrir-calculadora"]'), 'no está en inicio');
  await a.page.click('header [data-acc="abrir-calculadora"]'); await a.page.waitForSelector('[data-acc="calculadora"]');
  for (const k of ['2', '4', '0', '−', '1', ',', '5']) await a.page.click('[data-acc="calc-tecla"][data-v="' + k + '"]');
  igual(await a.page.innerText('[data-acc="calc-res"]'), '= 238,5');
  await a.page.click('[data-acc="calc-tecla"][data-v="="]');
  igual(await a.page.innerText('[data-acc="calc-expr"]'), '238,5');
  igual(await a.page.innerText('[data-acc="calc-ult"]'), '240−1,5 = 238,5');
  await a.page.keyboard.press('*'); await a.page.keyboard.press('2'); await a.page.keyboard.press('Enter');
  igual(await a.page.innerText('[data-acc="calc-expr"]'), '477');
  await a.page.keyboard.press('Escape'); afirma(!(await a.page.$('[data-acc="calculadora"]')), 'no se cierra');
  await a.page.click('header [data-acc="abrir-calculadora"]');
  igual(await a.page.innerText('[data-acc="calc-expr"]'), '477', 'no recuerda la cuenta');
  await a.page.click('[data-acc="calc-cerrar"]');
  await a.page.evaluate(() => { location.hash = '#/ajustes'; }); await a.page.waitForSelector('[data-pantalla="ajustes"]');
  afirma(await a.page.$('header [data-acc="abrir-calculadora"]'), 'no está en ajustes');
}));
prueba('el estado de la nube es un icono pequeño, con el texto para el lector', con(async a => {
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 8000 });
  const r = await a.page.$eval('[data-acc="estado"]', e => ({ w: e.getBoundingClientRect().width, svg: !!e.querySelector('svg'), title: e.title }));
  afirma(r.svg && r.w < 40, JSON.stringify(r)); igual(r.title, 'Todo guardado en la nube');
}));
fin();

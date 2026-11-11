import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

prueba('resumen: nombre de la empresa y tabla de tomas con dónde y a qué altura', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
    await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]');
    const E = '[data-pared="A"] [data-elemento="desague"] ';
    await a.page.fill(E + '[data-acc="distancia"]', '120'); await a.page.fill(E + '[data-acc="altura"]', '45'); await a.page.press(E + '[data-acc="altura"]', 'Tab');
    await a.page.click('header [data-acc="cab-resumen"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    igual(await a.page.innerText('.resumen-doc .empresa'), 'MUEBLES CARRASCOSA');
    igual(await a.page.innerText('.resumen-doc footer'), '© 2026 Alfonso Carrascosa Martínez');
    const filas = await a.page.$$eval('.instalaciones tbody tr', ts => ts.map(t => [...t.children].map(c => c.textContent)));
    igual(filas, [['A', 'Desagüe', 'a 120 cm desde la izquierda', '45 cm']]);
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
prueba('salida de humos: redonda o rectangular con medidas rápidas', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
    await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="humos"]');
    const E = '[data-pared="A"] [data-elemento="humos"] ';
    await a.page.click(E + '[data-acc="humos-forma"][data-v="redonda"]');
    igual(await a.page.$$eval(E + '[data-acc="rapido"]', bs => bs.map(b => b.dataset.v)), ['125', '150']);
    await a.page.click(E + '[data-acc="rapido"][data-v="150"]');
    await a.page.fill(E + '[data-acc="distancia"]', '90'); await a.page.press(E + '[data-acc="distancia"]', 'Tab');
    await a.page.waitForFunction(() => [...document.querySelectorAll('[data-acc="planta"] text')].some(t => t.textContent.startsWith('Humos Ø150')));
    await a.page.click(E + '[data-acc="humos-forma"][data-v="rectangular"]');
    await a.page.click(E + '[data-acc="humos-rapido"][data-v="170x80"]');
    await a.page.click('header [data-acc="cab-resumen"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    const fila = await a.page.$$eval('.instalaciones tbody tr td', ts => ts.map(t => t.textContent));
    igual(fila[1], 'Salida de humos 17×8 cm');
    afirma((await a.page.innerText('.resumen-doc')).includes('Salida de humos: 17×8 cm'));
    await a.page.click('header [data-acc="editar"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.click(E + '[data-acc="humos-forma"][data-v="recirculacion"]');
    await a.page.waitForFunction(() => [...document.querySelectorAll('[data-acc="planta"] text')].some(t => t.textContent.startsWith('Recirculación')));
    await a.page.click('header [data-acc="cab-resumen"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    igual((await a.page.$$eval('.instalaciones tbody tr td', ts => ts.map(t => t.textContent)))[1], 'Campana de recirculación (sin salida de humos)');
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();

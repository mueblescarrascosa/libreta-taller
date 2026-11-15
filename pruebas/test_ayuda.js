// 1.25.0: ayuda para quien empieza: bienvenida, trabajo de ejemplo, «Cómo rellenar esta ficha», letra grande,
// «?» con la guía de cada pantalla y etiquetas visibles en los datos del trabajo.
import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar } from './arnes.js';

prueba('bienvenida la primera vez y trabajo de ejemplo', async () => {
  const a = await abrir({ bienvenida: true }); try {
    await entrar(a);
    await a.page.waitForSelector('[data-acc="bienvenida"]');
    afirma((await a.page.innerText('[data-acc="bienvenida"]')).includes('Bienvenido a la Libreta Taller'));
    await a.page.click('[data-acc="bienvenida-ejemplo"]');
    await a.page.waitForSelector('[data-pantalla="trabajo"]');
    igual(await a.page.innerText('header .titulo'), 'Ejemplo para practicar');
    const fichas = await a.page.$$eval('[data-acc="abrir-ficha"]', es => es.map(e => e.dataset.tipo));
    igual(fichas.sort(), ['cocina', 'puerta']);
    await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]');
    igual(await a.page.$('[data-acc="bienvenida"]'), null, 'solo la primera vez');
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
prueba('cómo rellenar la ficha, letra grande, ayuda y etiquetas', async () => {
  const a = await abrir(); try {
    await entrar(a);
    await a.page.click('[data-acc="crear-ejemplo"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
    await a.page.click('[data-acc="editar-datos"]');
    const etiquetas = await a.page.$$eval('[data-acc="datos-trabajo"] label.campo-et > .et', es => es.map(e => e.textContent));
    afirma(etiquetas.includes('Cliente') && etiquetas.includes('Dirección'), etiquetas.join(' | '));
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    const como = await a.page.innerText('[data-acc="como-rellenar"]');
    afirma(como.includes('Cómo rellenar esta ficha') && como.includes('de izquierda a derecha'), como);
    await a.page.click('[data-acc="como-rellenar"] summary');
    await a.page.waitForFunction(() => localStorage.getItem('med-ayuda-cocina') === 'cerrada');   // se recuerda plegada
    igual(await a.page.getAttribute('[data-acc="ayuda"]', 'href'), 'guia-uso.html#ficha');
    await a.page.click('[data-acc="letra-grande"]');
    afirma(await a.page.evaluate(() => document.documentElement.classList.contains('letra-grande') && localStorage.getItem('med-letra') === '1'), 'letra grande');
    await a.page.click('[data-acc="letra-grande"]');
    afirma(await a.page.evaluate(() => !document.documentElement.classList.contains('letra-grande')), 'letra normal');
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();

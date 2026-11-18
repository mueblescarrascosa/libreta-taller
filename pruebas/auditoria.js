// Auditoría de uso: recorre las pantallas de la app (móvil de 412 px, como un Pixel, y ordenador de 1280 px) con una
// cocina completa (paredes, muebles, isla y península), un vestidor, un armario y una ficha de puertas, y busca:
//  - plegados que esconden lo que no es suyo (como pasó con «Islas y penínsulas» y Acabados),
//  - cosas que se salen por la derecha (scroll lateral),
//  - botones tapados por otra cosa (no se pueden tocar donde se ven),
//  - botones pequeños para el dedo (menos de 32 px de alto o de ancho) en el móvil,
//  - errores de la página.
// Uso: node pruebas/auditoria.js  → lista de problemas por pantalla (sale con código 1 si hay alguno grave).
import { abrir, entrar, crearTrabajo } from './arnes.js';

const problemas = [], graves = [];
const apuntar = (grave, ancho, pantalla, que) => { const t = `[${ancho}px] ${pantalla}: ${que}`; (grave ? graves : problemas).push(t); };

// Lo que se ve en la pantalla actual: desbordes, tapados y botones pequeños
async function revisar(a, ancho, pantalla) {
  const r = await a.page.evaluate((movil) => {
    const fuera = [], tapados = [], pequenos = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) fuera.push('la página tiene scroll lateral (' + document.documentElement.scrollWidth + ' > ' + vw + ')');
    const nombre = el => (el.dataset.acc ? '[' + el.dataset.acc + (el.dataset.v ? '=' + el.dataset.v : '') + ']' : el.tagName.toLowerCase()) + ' «' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + '»';
    document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary').forEach(el => {
      const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!b.width || !b.height || cs.visibility === 'hidden' || el.closest('[hidden], .plegado, .plegado-grupo, details:not([open]) > :not(summary)')) return;
      if (b.right > vw + 1 && !el.closest('.chips-scroll, .tabla-scroll, svg')) fuera.push(nombre(el) + ' se sale por la derecha');
      // Tapado: en el centro del elemento (si está en pantalla) manda otra cosa que no es él ni algo suyo
      if (b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= vw) {
        const x = b.left + b.width / 2, y = b.top + b.height / 2, en = document.elementFromPoint(x, y);
        if (en && en !== el && !el.contains(en) && !en.contains(el) && !(el.labels && [...el.labels].some(l => l.contains(en)))) {
          const fijo = en.closest('header, .barra, [class*="fij"], .cota-dialogo, .aviso-version');
          // Pasar por debajo de la cabecera fija al desplazar no es un fallo
          if (en.closest('header')) return;
          tapados.push(nombre(el) + ' tapado por ' + (en.className && typeof en.className === 'string' ? en.tagName.toLowerCase() + '.' + en.className.split(' ')[0] : en.tagName.toLowerCase()) + (fijo ? ' (fijo)' : ''));
        }
      }
      if (movil && el.matches('button, a[href], summary') && (b.height < 32 || b.width < 32) && !el.closest('svg, .no-tactil')) pequenos.push(nombre(el) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
    });
    return { fuera, tapados, pequenos };
  }, ancho < 600);
  r.fuera.forEach(t => apuntar(true, ancho, pantalla, t));
  r.tapados.forEach(t => apuntar(true, ancho, pantalla, t));
  [...new Set(r.pequenos)].slice(0, 8).forEach(t => apuntar(false, ancho, pantalla, 'botón pequeño ' + t));
}

// Plegar cada título de la ficha y comprobar que no se lleva lo que no es suyo:
// los otros títulos grandes (h2) y los desplegables (Acabados, Electrodomésticos, Material…) tienen que seguir a la vista.
async function revisarPlegados(a, ancho, pantalla) {
  const n = await a.page.locator('.plegador').count();
  for (let i = 0; i < n; i++) {
    const t = a.page.locator('.plegador').nth(i);
    if (!(await t.isVisible())) continue;
    const titulo = ((await t.textContent()) || '').trim().slice(0, 40);
    const antes = await a.page.evaluate(() => [...document.querySelectorAll('main h2, main details.plegable, main [data-acc="terminar"], main .barra-extras')].filter(e => e.offsetParent).map(e => e.dataset.acc || e.textContent.trim().slice(0, 30)));
    await t.click(); await a.page.waitForTimeout(80);
    const despues = await a.page.evaluate(() => [...document.querySelectorAll('main h2, main details.plegable, main [data-acc="terminar"], main .barra-extras')].filter(e => e.offsetParent).map(e => e.dataset.acc || e.textContent.trim().slice(0, 30)));
    const perdidos = antes.filter(x => !despues.includes(x) && !x.startsWith(titulo.slice(0, 20)));
    if (perdidos.length) apuntar(true, ancho, pantalla, 'plegar «' + titulo + '» esconde también: ' + perdidos.join(', '));
    await t.click(); await a.page.waitForTimeout(40);   // lo deja como estaba
  }
}

async function cocinaCompleta(a) {
  const A = '[data-pared="A"] ', abierto = A + '[data-fila="bajos"] [data-modulo].abierto ', abiertoAlto = A + '[data-fila="altos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3,6');
  for (const [t, w] of [['columna_frigo', '600'], ['placa', '900'], ['cajonero', '600'], ['lavavajillas', '600'], ['fregadero', '800']]) {
    await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="' + t + '"]'); await a.page.click(abierto + '[data-acc="rapido"][data-v="' + w + '"]');
  }
  for (const [t, w] of [['alto', '600'], ['alto_campana', '900'], ['alto', '600']]) {
    await a.page.click(A + '[data-fila="altos"] [data-acc="anadir-modulo"][data-v="' + t + '"]'); await a.page.click(abiertoAlto + '[data-acc="rapido"][data-v="' + w + '"]');
  }
  await a.page.click('[data-acc="anadir-isla"]'); await a.page.click('[data-acc="anadir-peninsula"]');
  for (const s of ['abrir-acabados', 'abrir-electro', 'abrir-material']) { const l = a.page.locator('[data-acc="' + s + '"]'); if (await l.count()) await l.click(); }
}

async function recorrido(ancho) {
  const a = await abrir({ ancho, tactil: ancho < 600 });
  await a.page.setViewportSize({ width: ancho, height: ancho < 600 ? 915 : 900 });
  try {
    await entrar(a);
    await revisar(a, ancho, 'Inicio');
    await crearTrabajo(a, 'Casa de prueba');
    const urlTrabajo = a.page.url();
    await revisar(a, ancho, 'Trabajo');
    // Cocina
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await cocinaCompleta(a);
    await revisar(a, ancho, 'Ficha de cocina');
    await revisarPlegados(a, ancho, 'Ficha de cocina');
    for (const y of [0.33, 0.66, 1]) { await a.page.evaluate(f => scrollTo(0, document.body.scrollHeight * f), y); await a.page.waitForTimeout(150); await revisar(a, ancho, 'Ficha de cocina (bajando ' + Math.round(y * 100) + ' %)'); }
    await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    await revisar(a, ancho, 'Resumen de cocina');
    for (const p of ['cascos', 'frentes', 'juntos']) { await a.page.click('[data-acc="pedido-' + p + '"]'); await a.page.waitForSelector('.pedido-doc'); await revisar(a, ancho, 'Pedido de ' + p); await a.page.goBack(); await a.page.waitForSelector('[data-pantalla="resumen"]'); }
    // Vestidor, armario y puertas
    for (const [tipo, sub, et] of [['armario', 'vestidor', 'vestidor'], ['armario', 'corredera', 'armario de correderas'], ['puerta', null, 'puertas'], ['nota', null, 'nota']]) {
      await a.page.evaluate(u => { location.hash = new URL(u).hash; }, urlTrabajo); await a.page.waitForSelector('[data-pantalla="trabajo"]');
      if (!(await a.page.locator('[data-acc="tipo"][data-v="' + tipo + '"]').count())) { await a.page.locator('[data-acc="nueva-ficha"], [data-acc="anadir-ficha"]').first().click().catch(() => {}); }
      const b = a.page.locator('[data-acc="tipo"][data-v="' + tipo + '"]');
      if (!(await b.count())) { apuntar(false, ancho, 'Trabajo', 'no encuentro cómo crear la ficha de ' + et + ' (la auditoría se la salta)'); continue; }
      await b.click();
      if (sub) await a.page.click('[data-acc="subtipo"][data-v="' + sub + '"]');
      await a.page.waitForSelector('[data-pantalla="ficha"]');
      await revisar(a, ancho, 'Ficha de ' + et);
      await revisarPlegados(a, ancho, 'Ficha de ' + et);
    }
    // Ajustes, guía y papelera
    for (const [h, et] of [['#/ajustes/todo', 'Ajustes'], ['#/guia', 'Guía'], ['#/papelera', 'Papelera']]) {
      await a.page.evaluate(x => { location.hash = x; }, h); await a.page.waitForTimeout(600); await revisar(a, ancho, et);
    }
    a.errores.forEach(e => apuntar(true, ancho, 'Errores de la página', e));
  } finally { await a.cerrar(); }
}

for (const ancho of [412, 1280]) await recorrido(ancho);
console.log('\n=== Auditoría de uso ===');
console.log(graves.length ? 'GRAVES (' + graves.length + '):\n- ' + graves.join('\n- ') : 'Nada grave.');
console.log(problemas.length ? '\nA MEJORAR (' + problemas.length + '):\n- ' + problemas.join('\n- ') : '\nNada más.');
process.exit(graves.length ? 1 : 0);

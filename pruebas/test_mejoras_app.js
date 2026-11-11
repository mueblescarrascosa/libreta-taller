import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo, hasta, pagina } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const tipo = async (a, t, s) => { await a.page.click('[data-acc="tipo"][data-v="' + t + '"]'); if (s) await a.page.click('[data-acc="subtipo"][data-v="' + s + '"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); if (t === 'puerta') await a.page.click('[data-acc="medida-de"][data-v="puerta"]'); };
const nueva = async (a, t, s, unidad) => {
  await crearTrabajo(a, 'Casa');
  if (unidad) { await a.page.click('[data-acc="unidad"][data-v="' + unidad + '"]'); await a.page.waitForTimeout(50); }
  await tipo(a, t, s);
};
const irA = async (a, hash, pantalla) => { await a.page.evaluate(x => { location.hash = x; }, hash); await a.page.waitForSelector('[data-pantalla="' + pantalla + '"]'); };
const volverTrabajo = async a => { await a.page.click('header .atras'); await a.page.waitForSelector('[data-pantalla="trabajo"]'); };
const texto = (a, sel = 'main') => a.page.innerText(sel);
const leerBase = (a, store) => a.page.evaluate(async s => { const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).todos(s); }, store);
const fichaActual = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
const guardado = a => a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 8000 });
const P = '[data-puerta].abierta ';

// ── Fallo 1: almacenamiento permanente ──
prueba('pide al navegador que no borre los datos de la app', con({}, async a => {
  await a.page.addInitScript(() => { navigator.storage.persist = async () => { window.__persist = true; return true; }; navigator.storage.persisted = async () => false; });
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await a.page.waitForFunction(() => window.__persist === true, null, { timeout: 4000 });
}));

// ── Fallo 2: limpieza de fotos ──
prueba('al arrancar quita del móvil copias de fotos que ya no hacen falta', con({}, async a => {
  await a.page.evaluate(async () => { const { abrirAlmacen } = await import('./js/almacen.js'); await (await abrirAlmacen()).poner('blobs', { id: 'huerfana', blob: new Blob(['x']) }); });
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await hasta(async () => !(await leerBase(a, 'blobs')).some(b => b.id === 'huerfana'), 'sigue la foto');
}));

// ── Fallo 3: no saltar arriba ──
prueba('un cambio de otro dispositivo no lleva la ficha arriba', con({}, async a => {
  await nueva(a, 'cocina');
  for (let i = 0; i < 4; i++) await a.page.click('[data-acc="anadir-pared"]');
  await a.page.fill('[data-acc="nombre-ficha"]', 'Cocina A'); await guardado(a);
  await a.page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 900); });
  const antes = await a.page.evaluate(() => scrollY); afirma(antes > 500, 'no hay sitio para bajar: ' + antes);
  const f = a.nube.med_fichas[0]; f.nombre = 'Cocina B'; f.updated_at = new Date(Date.parse(f.updated_at) + 5000).toISOString();
  await a.page.evaluate(() => dispatchEvent(new Event('online')));
  await a.page.waitForFunction(() => document.querySelector('[data-acc="nombre-ficha"]')?.value === 'Cocina B', null, { timeout: 6000 });
  const despues = await a.page.evaluate(() => scrollY);
  afirma(Math.abs(despues - antes) < 5, antes + ' → ' + despues);
}));

// ── Fallo 4: vestidor ──
prueba('vestidor: los enchufes van solo en las paredes y sin usos de cocina', con({}, async a => {
  await nueva(a, 'armario', 'vestidor');
  afirma(!(await a.page.$('[data-acc="anadir-enchufe"]')), 'sigue la lista aparte de enchufes');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="enchufe"]');
  afirma(!(await a.page.$('[data-elemento="enchufe"] .usos')), 'ofrece usos de cocina');
  await volverTrabajo(a); await tipo(a, 'armario', 'corredera');
  afirma(await a.page.$('[data-acc="anadir-enchufe"]'), 'el armario corredera también los perdió');
}));

// ── Fallo 5: papelera ──
prueba('papelera: un trabajo borrado se recupera con sus fichas', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await volverTrabajo(a);
  await a.page.click('[data-acc="borrar-trabajo"]'); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await a.page.click('[data-acc="papelera"]'); await a.page.waitForSelector('[data-pantalla="papelera"]');
  afirma((await texto(a)).includes('Casa'));
  await a.page.click('[data-acc="restaurar"]'); await a.page.waitForTimeout(150);
  await irA(a, '#/', 'inicio'); await a.page.click('[data-acc="abrir-trabajo"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 1);
}));
prueba('papelera: una ficha borrada se recupera', con({}, async a => {
  await nueva(a, 'nota'); await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Medir otra vez'); await a.page.waitForTimeout(400);
  await a.page.click('[data-acc="borrar-ficha"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 0);
  await irA(a, '#/papelera', 'papelera'); afirma((await texto(a)).includes('Medir otra vez') || (await texto(a)).includes('Nota'));
  await a.page.click('[data-acc="restaurar"]'); await a.page.waitForTimeout(150);
  await a.page.goBack(); await a.page.waitForTimeout(100);
  await irA(a, '#/', 'inicio'); await a.page.click('[data-acc="abrir-trabajo"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 1);
}));

// ── Mejora 1: resumen del trabajo ──
prueba('resumen de todo el trabajo con el recuento de puertas', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await a.page.click(P + '[data-c="alto"] [data-acc="rapido"][data-v="2030"]');
  await a.page.click('[data-acc="anadir-puerta"]'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await a.page.click(P + '[data-c="alto"] [data-acc="rapido"][data-v="2030"]');
  await volverTrabajo(a); await tipo(a, 'nota'); await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Llamar al pintor'); await volverTrabajo(a);
  await a.page.click('[data-acc="resumen-trabajo"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  const t = await texto(a, '.resumen-doc');
  afirma(/Puertas: 2/.test(t) && /2 de 82 × 203/.test(t) && /Llamar al pintor/.test(t), t);
  await a.page.evaluate(() => { window.open = u => { window.__url = u; }; });
  await a.page.click('[data-acc="enviar-texto"]'); await a.page.waitForFunction(() => window.__url);
  const x = await a.page.evaluate(() => decodeURIComponent(window.__url)); afirma(x.includes('*Puertas: 2*') && x.includes('Llamar al pintor'), x);
}));

// ── Mejora 2: Google Maps (el teléfono va con la columna nueva) ──
prueba('la dirección abre Google Maps', con({}, async a => {
  await crearTrabajo(a, 'Casa'); await a.page.fill('[data-acc="direccion"]', 'Calle Sol 3, Jaén');
  const href = await a.page.getAttribute('[data-acc="mapa"]', 'href');
  igual(href, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Calle Sol 3, Jaén'));
}));

// ── Mejora 3: orden por actividad; estado y teléfono solo con la columna nueva ──
prueba('los trabajos se ordenan por el último tocado', con({}, async a => {
  // Cada uno se sube por separado: si se suben juntos, la nube los fecha en el orden en que llegan.
  await crearTrabajo(a, 'Primero'); await guardado(a); await irA(a, '#/', 'inicio'); await crearTrabajo(a, 'Segundo'); await a.page.waitForTimeout(1700); await guardado(a);
  await irA(a, '#/', 'inicio'); igual(await a.page.innerText('[data-acc="abrir-trabajo"] b'), 'Segundo');
  await a.page.click('[data-acc="abrir-trabajo"]:nth-of-type(2)'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.fill('[data-acc="cliente"]', 'Pepe'); await a.page.waitForTimeout(400);
  await irA(a, '#/', 'inicio'); igual(await a.page.innerText('[data-acc="abrir-trabajo"] b'), 'Primero');
}));
prueba('con la columna ya creada, teléfono y estado vienen encendidos de serie', con({}, async a => {
  await crearTrabajo(a, 'Casa'); await guardado(a);
  afirma(await a.page.$('[data-acc="telefono"]') && await a.page.$('[data-acc="estado-trabajo"]'), 'no salen teléfono y estado');
  igual(a.nube.med_trabajos[0].datos, {});
}));
prueba('con la columna nueva: teléfono, llamar, WhatsApp, estado y archivados', con({}, async a => {
  await a.page.evaluate(() => localStorage.setItem('medidas-trabajo-datos', '1')); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await crearTrabajo(a, 'Casa'); await a.page.fill('[data-acc="telefono"]', '600 11 22 33');
  igual(await a.page.getAttribute('[data-acc="llamar"]', 'href'), 'tel:600112233');
  igual(await a.page.getAttribute('[data-acc="whatsapp-cliente"]', 'href'), 'https://wa.me/34600112233');
  await a.page.click('[data-acc="estado-trabajo"][data-v="montado"]'); await a.page.waitForTimeout(400); await guardado(a);
  igual(a.nube.med_trabajos[0].datos, { telefono: '600 11 22 33', estado: 'montado' });
  await irA(a, '#/', 'inicio');
  igual((await a.page.$$('[data-acc="abrir-trabajo"]')).length, 0, 'el montado sigue en la lista');
  await a.page.click('[data-acc="ver-archivados"]'); igual((await a.page.$$('[data-acc="abrir-trabajo"]')).length, 1);
}));

// ── Mejora 4: lista de fichas ──
prueba('la lista de fichas dice qué tiene cada una y qué falta', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await volverTrabajo(a);
  const t = await texto(a, '[data-acc="abrir-ficha"]');
  afirma(/1 puerta/.test(t) && /Puerta 1: falta el alto/.test(t), t);
}));

// ── Mejora 5: duplicar y mover ──
prueba('duplicar una ficha', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]');
  await a.page.click('[data-acc="duplicar-ficha"]'); await a.page.waitForFunction(() => /\(copia\)/.test(document.querySelector('header .titulo').innerText));
  igual(await a.page.inputValue(P + '[data-acc="ancho"]'), '820');
  await volverTrabajo(a); igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 2);
}));
prueba('mover una nota suelta a un trabajo', con({}, async a => {
  await crearTrabajo(a, 'Destino'); await irA(a, '#/sueltas', 'trabajo'); await tipo(a, 'nota');
  await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Ir el lunes'); await a.page.waitForTimeout(400);
  await a.page.click('[data-acc="mover-ficha"]'); await a.page.click('[data-acc="mover-a"]:has-text("Destino")');
  await a.page.waitForSelector('[data-pantalla="ficha"]'); await a.page.waitForTimeout(100);
  const f = await fichaActual(a); afirma(f.trabajo_id, 'sigue suelta');
  await volverTrabajo(a); afirma((await texto(a, 'header')).includes('Destino')); igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 1);
}));

// ── Mejora 6: cuentas ──
prueba('las medidas admiten cuentas y enseñan el resultado', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  await a.page.fill(P + '[data-acc="ancho"]', '82-1,5');
  afirma((await texto(a, P + '[data-c="ancho"]')).includes('= 80,5'), 'sin resultado');
  await a.page.waitForTimeout(400); igual((await fichaActual(a)).datos.puertas[0].ancho, 805);
  await a.page.focus(P + '[data-acc="alto"]'); await a.page.click(P + '[data-c="alto"] [data-acc="mas"]');
  igual(await a.page.inputValue(P + '[data-acc="alto"]'), '+');
}));

// ── Mejora 7: plantilla ──
prueba('plantilla de piso: crea las fichas de golpe y no se pierden', con({}, async a => {
  await a.page.click('[data-acc="nuevo-trabajo"]'); await a.page.fill('[data-acc="trabajo-nombre"]', 'Piso');
  await a.page.click('[data-acc="plantilla"][data-v="puertas"]'); await a.page.click('[data-acc="plantilla"][data-v="cocina"]');
  await a.page.click('[data-acc="plantilla-mas"][data-v="corredera"]'); await a.page.click('[data-acc="plantilla-mas"][data-v="corredera"]');
  await a.page.click('[data-acc="trabajo-crear"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  const t = await texto(a, '.lista');
  afirma(/Puertas/.test(t) && /Cocina/.test(t) && /Armario corredera 1/.test(t) && /Armario corredera 2/.test(t), t);
}));

prueba('la ficha de puertas no enseña «null» ni repite el tipo en la lista', con({}, async a => {
  await nueva(a, 'puerta'); afirma(!/null/.test(await texto(a)), 'sale null');
  await volverTrabajo(a); await tipo(a, 'armario', 'corredera'); await volverTrabajo(a);
  const t = await texto(a, '.lista'); afirma(!/Armario corredera\s+Corredera/.test(t), t);
}));

// ── Mejoras 8 a 10 ──
prueba('puertas: tipo y aclaración del lado', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.click(P + '[data-acc="tipo-puerta"][data-v="corredera"]'); await a.page.waitForTimeout(400);
  igual((await fichaActual(a)).datos.puertas[0].tipo, 'corredera');
  afirma(/desde el pasillo/i.test(await texto(a, P)));
}));
prueba('cocina: electrodomésticos; ventana con alféizar', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.click('[data-acc="abrir-electro"]'); await a.page.click('[data-acc="anadir-electro"][data-v="frigo"]');
  await a.page.click('[data-electro="frigo"] [data-acc="electro-tipo"][data-v="integrable"]');
  await a.page.fill('[data-electro="frigo"] [data-acc="ancho"]', '60'); await a.page.fill('[data-electro="frigo"] [data-acc="electro-modelo"]', 'Bosch');
  await a.page.waitForTimeout(400);
  const e = (await fichaActual(a)).datos.electro[0]; igual([e.clave, e.tipo, e.ancho, e.modelo], ['frigo', 'integrable', 600, 'Bosch']);
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="ventana"]');
  afirma(/Alféizar/.test(await texto(a, '[data-elemento="ventana"]')));
}));
prueba('armario: diagonales con aviso', con({}, async a => {
  await nueva(a, 'armario', 'corredera'); await a.page.fill('[data-acc="diag_1"]', '2000'); await a.page.fill('[data-acc="diag_2"]', '2030');
  afirma(/escuadra/.test(await texto(a, '[data-avisos="diagonales"]')));
}));

// ── Mejora 11: aviso de versión nueva ──
prueba('aviso de versión nueva solo si ya había una versión funcionando', async () => {
  const a = await pagina();
  try {
    const r = await a.page.evaluate(async () => {
      const { vigilarVersion } = await import('./js/version.js');
      const sw = new EventTarget(); sw.controller = null; let n = 0;
      vigilarVersion(sw, () => n++);
      sw.dispatchEvent(new Event('controllerchange')); // primera instalación: nada
      sw.controller = {}; sw.dispatchEvent(new Event('controllerchange'));
      return n;
    });
    igual(r, 1);
    const b = await a.page.evaluate(async () => { const { pintarAvisoVersion } = await import('./js/version.js'); pintarAvisoVersion(); return document.querySelector('[data-acc="actualizar"]').innerText; });
    afirma(/versión nueva/i.test(b), b);
  } finally { await a.cerrar(); }
});

await fin();

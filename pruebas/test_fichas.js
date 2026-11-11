import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nueva = async (a, tipo, subtipo, unidad) => {
  await crearTrabajo(a, 'Casa');
  if (unidad) { await a.page.click('[data-acc="unidad"][data-v="' + unidad + '"]'); await a.page.waitForTimeout(50); }
  await a.page.click('[data-acc="tipo"][data-v="' + tipo + '"]');
  if (subtipo) await a.page.click('[data-acc="subtipo"][data-v="' + subtipo + '"]');
  await a.page.waitForSelector('[data-pantalla="ficha"]');
};
const recargar = async a => { await a.page.waitForTimeout(400); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]'); };
const val = (a, sel) => a.page.inputValue(sel);
const on = (a, sel) => a.page.evaluate(s => document.querySelector(s).classList.contains('on'), sel);
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
const P = '[data-puerta].abierta ';

prueba('puertas: medidas y botones se guardan; no hay hacia dentro o fuera', con({}, async a => {
  await nueva(a, 'puerta');
  await a.page.fill(P + '[data-acc="ancho"]', '825'); await a.page.fill(P + '[data-acc="alto"]', '2030'); await a.page.fill(P + '[data-acc="tabique"]', '90');
  await a.page.click(P + '[data-acc="mano"][data-v="izq"]'); await a.page.click(P + '[data-acc="condena"][data-v="true"]'); await a.page.click(P + '[data-acc="vidriera"][data-v="false"]');
  await recargar(a);
  igual([await val(a, P + '[data-acc="ancho"]'), await val(a, P + '[data-acc="alto"]'), await val(a, P + '[data-acc="tabique"]')], ['825', '2030', '90']);
  afirma(await on(a, P + '[data-acc="mano"][data-v="izq"]') && await on(a, P + '[data-acc="condena"][data-v="true"]') && await on(a, P + '[data-acc="vidriera"][data-v="false"]'));
  afirma(!/dentro|fuera/i.test(await a.page.evaluate(() => document.querySelector('main').innerText)));
}));
prueba('botones rápidos de puerta en cm y otra medida a mano', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  igual(await a.page.$$eval(P + '[data-c="ancho"] [data-acc="rapido"]', b => b.map(x => x.textContent)), ['92', '82', '72', '62']);
  igual(await a.page.$$eval(P + '[data-c="alto"] [data-acc="rapido"]', b => b.map(x => x.textContent)), ['203', '211']);
  igual(await a.page.$$eval(P + '[data-c="tabique"] [data-acc="rapido"]', b => b.map(x => x.textContent)), ['7', '9', '11']);
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await a.page.click(P + '[data-c="alto"] [data-acc="rapido"][data-v="2110"]');
  await a.page.click(P + '[data-c="tabique"] [data-acc="rapido"][data-v="90"]');
  igual(await val(a, P + '[data-acc="ancho"]'), '82'); afirma(await on(a, P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'), 'no marca el botón');
  await a.page.fill(P + '[data-acc="tabique"]', '10,5');
  afirma(!(await on(a, P + '[data-c="tabique"] [data-acc="rapido"][data-v="90"]')), 'sigue marcado el 9');
  await recargar(a); const p = (await ficha(a)).datos.puertas[0];
  igual([p.ancho, p.alto, p.tabique], [820, 2110, 105]);
}));
prueba('añadir puertas: la nueva copia el tabique y la anterior queda resumida', con({}, async a => {
  await nueva(a, 'puerta');
  await a.page.fill(P + '[data-acc="nombre-puerta"]', 'Dormitorio 1');
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]'); await a.page.click(P + '[data-c="alto"] [data-acc="rapido"][data-v="2030"]');
  await a.page.click(P + '[data-c="tabique"] [data-acc="rapido"][data-v="90"]'); await a.page.click(P + '[data-acc="mano"][data-v="izq"]');
  await a.page.click('[data-acc="anadir-puerta"]');
  igual((await a.page.$$('[data-puerta]')).length, 2); igual((await a.page.$$('[data-puerta].abierta')).length, 1);
  igual(await val(a, P + '[data-acc="tabique"]'), '90');
  const r = await a.page.innerText('[data-puerta]:not(.abierta)');
  afirma(r.includes('Dormitorio 1') && r.includes('820 × 2030 mm') && r.includes('izquierda'), r);
  for (let i = 0; i < 8; i++) await a.page.click('[data-acc="anadir-puerta"]');
  igual((await a.page.$$('[data-puerta]')).length, 10);
  await a.page.click('[data-puerta]:first-child [data-acc="abrir-puerta"]'); igual(await val(a, P + '[data-acc="nombre-puerta"]'), 'Dormitorio 1');
  await recargar(a); igual((await ficha(a)).datos.puertas.length, 10);
}));
prueba('quitar una puerta pide confirmación', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill(P + '[data-acc="ancho"]', '800'); await a.page.click('[data-acc="anadir-puerta"]');
  a.estado.aceptar = false; await a.page.click(P + '[data-acc="quitar-puerta"]'); igual((await a.page.$$('[data-puerta]')).length, 2);
  a.estado.aceptar = true; await a.page.click(P + '[data-acc="quitar-puerta"]'); igual((await a.page.$$('[data-puerta]')).length, 1);
  await recargar(a); igual((await ficha(a)).datos.puertas.length, 1);
}));
prueba('una ficha de puerta antigua se abre con su puerta dentro', con({}, async a => {
  await nueva(a, 'nota');
  await a.page.evaluate(async () => {
    const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); const al = await abrirAlmacen();
    const f = await al.leer('fichas', id); f.tipo = 'puerta'; f.nombre = 'Baño'; Object.assign(f.datos, { ancho: 825, alto: 2030, tabique: 90, mano: 'der', condena: true, vidriera: null });
    await al.poner('fichas', f);
  });
  await a.page.reload(); await a.page.waitForSelector('[data-puerta]');
  igual(await val(a, P + '[data-acc="nombre-puerta"]'), 'Baño'); igual(await val(a, P + '[data-acc="ancho"]'), '825');
  await a.page.fill(P + '[data-acc="alto"]', '2110'); await recargar(a);
  const f = await ficha(a); igual(f.datos.puertas.length, 1); igual(f.datos.puertas[0].alto, 2110); afirma(!('ancho' in f.datos));
}));
prueba('tocar el botón marcado lo desmarca', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill(P + '[data-acc="ancho"]', '800'); await a.page.click(P + '[data-acc="condena"][data-v="true"]'); await a.page.click(P + '[data-acc="condena"][data-v="true"]');
  await recargar(a); igual((await ficha(a)).datos.puertas[0].condena, null);
}));
prueba('cocina: altura general en metros, pared A preparada solo con largo, elementos, referencia y puntos de medida', con({}, async a => {
  await nueva(a, 'cocina');
  afirma(await a.page.$('[data-pared="A"] > [data-c="largo"]') && !(await a.page.$('[data-pared="A"] > [data-c="alto"]')), 'la pared A debe pedir solo el largo');
  igual(await a.page.innerText('[data-c="alto_techo"] .ud'), 'm');
  afirma(/viga|buhardilla/i.test(await a.page.evaluate(() => document.querySelector('main').innerText)), 'no dice dónde apuntar lo especial');
  await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3'); await a.page.fill('[data-acc="alto_techo"]', '2,6');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]');
  await a.page.click('[data-pared="A"] [data-elemento="desague"] [data-acc="ref"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="desague"]');
  igual(await a.page.$$eval('[data-pared="A"] [data-elemento="desague"] [data-acc="ref"]', b => b.map(x => x.dataset.v)), ['der', 'der']);
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="ventana"]');
  const v = '[data-pared="A"] [data-elemento="ventana"]';
  afirma(await a.page.$(v + ' [data-acc="ancho"]') && await a.page.$(v + ' [data-acc="alto"]'), 'ventana sin ancho y alto');
  afirma(/al borde/.test(await a.page.innerText(v)) && /al centro/.test(await a.page.innerText('[data-pared="A"] [data-elemento="desague"]')));
  await a.page.click('[data-acc="anadir-pared"]'); afirma(await a.page.$('[data-pared="B"]'), 'sin pared B');
  await recargar(a);
  const f = await ficha(a); igual(f.datos.paredes.length, 2); igual([f.datos.paredes[0].largo, f.datos.alto_techo], [3000, 2600]); igual(f.datos.paredes[0].elementos.map(e => e.ref), ['der', 'der', 'der']);
}));
prueba('armario: etiquetas que explican qué medir', con({}, async a => {
  await nueva(a, 'armario', 'corredera');
  const t = await a.page.evaluate(() => document.querySelector('main').innerText);
  afirma(/arriba, en medio y abajo/i.test(t) && /lado izquierdo/i.test(t) && /lado derecho/i.test(t), t.slice(0, 300));
}));
prueba('armario corredera, abatible y vestidor muestran lo suyo', con({}, async a => {
  await nueva(a, 'armario', 'corredera'); afirma(await a.page.$('[data-acc="hojas"]') && !(await a.page.$('[data-acc="puertas"]')), 'corredera');
  afirma(!(await a.page.$('[data-acc="anadir-pared"]')), 'corredera con paredes');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="abatible"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  afirma(await a.page.$('[data-acc="puertas"]') && !(await a.page.$('[data-acc="hojas"]')), 'abatible');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="vestidor"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const tipos = await a.page.$$eval('[data-pared="A"] [data-acc="anadir-elemento"]', b => b.map(x => x.dataset.v));
  afirma(tipos.includes('enchufe') && !tipos.includes('humos'), tipos.join());
}));
prueba('unidades: cm admite un decimal, guarda mm y no guarda lo mal tecleado', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  igual(await a.page.getAttribute(P + '[data-acc="ancho"]', 'inputmode'), 'decimal');
  await a.page.fill(P + '[data-acc="ancho"]', '245,5'); await a.page.waitForTimeout(400); igual((await ficha(a)).datos.puertas[0].ancho, 2455);
  await a.page.fill(P + '[data-acc="ancho"]', '245,55');
  afirma(await a.page.evaluate(() => document.querySelector('[data-puerta].abierta [data-c="ancho"]').classList.contains('error')), 'sin marca de error');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.puertas[0].ancho, null); igual((await ficha(a)).datos.puertas[0].mal, { ancho: '245,55' });
  await a.page.fill(P + '[data-acc="ancho"]', '245,5'); await a.page.waitForTimeout(400);
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="unidad"][data-v="mm"]'); await a.page.click('[data-acc="abrir-ficha"]'); await a.page.click('[data-pantalla="resumen"] [data-acc="editar"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  igual(await val(a, P + '[data-acc="ancho"]'), '2455'); igual(await a.page.getAttribute(P + '[data-acc="ancho"]', 'inputmode'), 'numeric');
}));
prueba('tecla a tecla, lo mal escrito no deja guardado un trozo y sigue avisando al volver', con({}, async a => {
  await nueva(a, 'puerta');
  await a.page.click(P + '[data-acc="ancho"]'); await a.page.keyboard.type('1.500');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.puertas[0].ancho, null, 'guardó un trozo');
  await recargar(a);
  igual(await val(a, P + '[data-acc="ancho"]'), '1.500');
  afirma(await a.page.evaluate(() => document.querySelector('[data-puerta].abierta [data-c="ancho"]').classList.contains('error')), 'no avisa al volver');
  await a.page.fill(P + '[data-acc="ancho"]', ''); await a.page.click(P + '[data-acc="ancho"]'); await a.page.keyboard.type('1500');
  await recargar(a); igual((await ficha(a)).datos.puertas[0].ancho, 1500); igual((await ficha(a)).datos.puertas[0].mal, undefined);
}));
prueba('tecla a tecla en cm con dos decimales no guarda 245,5', con({}, async a => {
  await nueva(a, 'cocina', null, 'cm');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="corredera"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="fondo"]'); await a.page.keyboard.type('245,55');
  await a.page.waitForTimeout(400); igual((await ficha(a)).datos.fondo, null);
}));
prueba('avisos junto al dato y sin impedir guardar', con({}, async a => {
  await nueva(a, 'armario', 'corredera');
  await a.page.fill('[data-acc="ancho_arriba"]', '2000'); await a.page.fill('[data-acc="ancho_abajo"]', '2020');
  await a.page.waitForFunction(() => /difieren 20 mm/.test(document.querySelector('[data-avisos="anchos"]').innerText));
  await recargar(a); igual((await ficha(a)).datos.ancho_abajo, 2020);
  await a.page.waitForFunction(() => /difieren/.test(document.querySelector('[data-avisos="anchos"]').innerText));
}));
prueba('elemento fuera de la pared avisa en su tarjeta', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="toma"]'); await a.page.fill('[data-elemento="toma"] [data-acc="distancia"]', '3100');
  await a.page.waitForFunction(() => /se sale/.test(document.querySelector('[data-elemento="toma"] [data-avisos^="elemento."]').innerText));
}));
prueba('lo escrito justo antes de cerrar no se pierde', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill(P + '[data-acc="ancho"]', '777');
  await a.page.evaluate(() => dispatchEvent(new Event('pagehide'))); await a.page.waitForTimeout(150); await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]');
  igual(await val(a, P + '[data-acc="ancho"]'), '777');
}));
prueba('volver atrás enseguida tampoco pierde nada', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill(P + '[data-acc="ancho"]', '778'); await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="abrir-ficha"]'); await a.page.click('[data-pantalla="resumen"] [data-acc="editar"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); igual(await val(a, P + '[data-acc="ancho"]'), '778');
}));
prueba('tocar una ficha de la lista abre su resumen, con Editar; la flecha vuelve al trabajo', con({}, async a => {
  await nueva(a, 'puerta'); await a.page.fill(P + '[data-acc="ancho"]', '781'); await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="abrir-ficha"]'); await a.page.waitForSelector('[data-pantalla="resumen"] [data-acc="editar"]');
  afirma((await a.page.innerText('[data-pantalla="resumen"]')).includes('781'), 'el resumen no trae la medida');
  await a.page.click('header .atras'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
}));
prueba('puerta doble con hojas distintas y paño fijo: se apunta una medida y la otra sale sola', con({}, async a => {
  await nueva(a, 'puerta', null, 'cm');
  await a.page.fill(P + '[data-acc="ancho"]', '160'); await a.page.press(P + '[data-acc="ancho"]', 'Tab');
  await a.page.click(P + '[data-acc="tipo-puerta"][data-v="doble"]');
  await a.page.click(P + '[data-acc="hojas-iguales"][data-v="false"]');
  await a.page.click(P + '[data-acc="fijo"][data-v="true"]');
  await a.page.fill(P + '[data-acc="puerta_ancho"]', '120'); await a.page.press(P + '[data-acc="puerta_ancho"]', 'Tab');
  await a.page.fill(P + '[data-acc="hoja1"]', '80'); await a.page.press(P + '[data-acc="hoja1"]', 'Tab');
  await a.page.waitForFunction(() => /40 cm/.test(document.querySelector('[data-acc="otra-hoja"]').innerText) && /40 cm/.test(document.querySelector('[data-acc="ancho-fijo"]').innerText));
  afirma(!(await a.page.$(P + '[data-acc="tipo-puerta"][data-v="fija"]')), 'sigue ofreciendo «fija» como tipo');
}));
prueba('medidas libres y notas en cualquier ficha, y llegan a la nube', con({}, async a => {
  await nueva(a, 'nota');
  await a.page.click('[data-acc="anadir-libre"]'); await a.page.fill('[data-acc="libre-nombre"]', 'Mesa sierra'); await a.page.fill('[data-acc="libre-valor"]', '1200');
  await a.page.click('[data-acc="anadir-nota"]'); await a.page.fill('[data-acc="nota"]', 'Cambiar la hoja');
  await recargar(a); const f = await ficha(a);
  igual(f.datos.libres[0].nombre, 'Mesa sierra'); igual(f.datos.libres[0].mm, 1200); igual(f.datos.notas[0].texto, 'Cambiar la hoja');
  await a.page.waitForFunction(() => /Todo guardado/.test(document.querySelector('[data-acc="estado"]').innerText), null, { timeout: 6000 });
  igual(a.nube.med_fichas[0].datos.notas[0].texto, 'Cambiar la hoja');
}));
prueba('borrar ficha pide confirmación', con({}, async a => {
  await nueva(a, 'puerta'); a.estado.aceptar = false; await a.page.click('[data-acc="borrar-ficha"]'); await a.page.waitForTimeout(100);
  afirma(await a.page.$('[data-pantalla="ficha"]'), 'se borró sin confirmar');
  a.estado.aceptar = true; await a.page.click('[data-acc="borrar-ficha"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 0);
}));
prueba('nota suelta usa la unidad de ajustes', con({}, async a => {
  await a.page.click('[data-acc="ajustes"]'); await a.page.click('[data-acc="unidad-pred"][data-v="cm"]');
  await a.page.evaluate(() => { location.hash = '#/sueltas'; }); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="nota"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); await a.page.click('[data-acc="anadir-libre"]');
  igual(await a.page.innerText('[data-libre] .ud'), 'cm');
}));
prueba('en móvil la cocina y las puertas no se desbordan', con({ ancho: 360 }, async a => {
  await nueva(a, 'cocina'); await a.page.click('[data-acc="anadir-elemento"][data-v="ventana"]');
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'cocina');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-puerta]'); await a.page.click('[data-acc="anadir-puerta"]');
  igual(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'puertas');
}));
prueba('paredes en metros por defecto, con botón para cambiar; pilares en cm', con({}, async a => {
  await nueva(a, 'cocina', null, 'cm');
  igual(await a.page.innerText('[data-pared="A"] > [data-c="largo"] .ud'), 'm');
  await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3,45'); await a.page.waitForTimeout(400); igual((await ficha(a)).datos.paredes[0].largo, 3450);
  await a.page.click('[data-acc="ud-paredes"][data-v="false"]');
  igual(await a.page.innerText('[data-pared="A"] > [data-c="largo"] .ud'), 'cm'); igual(await val(a, '[data-pared="A"] > [data-c="largo"] input'), '345');
  await a.page.click('[data-pared="A"] [data-acc="pilares"][data-v="true"]');
  const pil = '[data-pared="A"] [data-elemento="pilar"]';
  afirma(await a.page.$(pil), 'no añadió pilar'); igual(await a.page.innerText(pil + ' [data-c="ancho"] .ud'), 'cm');
  afirma(/Sobresale/.test(await a.page.innerText(pil)) && !(await a.page.$(pil + ' [data-c="altura"]')), 'campos del pilar');
  await a.page.fill(pil + ' [data-acc="fondo"]', '30'); await recargar(a);
  const p = (await ficha(a)).datos.paredes[0]; igual(p.pilares, true); igual(p.elementos[0].fondo, 300);
  igual(await a.page.innerText('[data-pared="A"] > [data-c="largo"] .ud'), 'cm', 'no recordó la elección');
}));
prueba('una ficha sin nada se descarta al salir; con algo se queda', con({}, async a => {
  await nueva(a, 'nota'); await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.waitForTimeout(200); igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 0, 'quedó la nota vacía');
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-puerta]');
  await a.page.click(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]'); await a.page.waitForTimeout(200);
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 1);
}));
prueba('notas y medidas en blanco se quitan al salir', con({}, async a => {
  await nueva(a, 'nota');
  await a.page.click('[data-acc="anadir-libre"]'); await a.page.fill('[data-acc="libre-nombre"]', 'Mesa');
  await a.page.click('[data-acc="anadir-libre"]'); await a.page.click('[data-acc="anadir-nota"]');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="abrir-ficha"]'); await a.page.click('[data-pantalla="resumen"] [data-acc="editar"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const f = await ficha(a); igual(f.datos.libres.map(m => m.nombre), ['Mesa']); igual(f.datos.notas.length, 0);
}));
prueba('al abrir la app se quitan las fichas que quedaron vacías', con({}, async a => {
  await nueva(a, 'puerta'); const id = await a.page.evaluate(() => location.hash.split('/')[2]);
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="inicio"]');
  const f = await a.page.evaluate(async i => { const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', i); }, id);
  afirma(f.borrado_at, 'sigue viva');
}));
prueba('una ficha con solo una foto no se descarta', con({}, async a => {
  await nueva(a, 'nota');
  const buf = Buffer.from(await a.page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 40; return c.toDataURL('image/jpeg').split(',')[1]; }), 'base64');
  await a.page.setInputFiles('[data-acc="foto-input"]', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: buf }); await a.page.waitForSelector('[data-acc="ver-adjunto"]');
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]'); await a.page.waitForTimeout(200);
  igual((await a.page.$$('[data-acc="abrir-ficha"]')).length, 1);
}));
prueba('una pared con alto ya apuntado lo sigue enseñando', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3'); await a.page.waitForTimeout(400);
  await a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); const al = await abrirAlmacen(); const f = await al.leer('fichas', id); f.datos.paredes[0].alto = 2500; await al.poner('fichas', f); });
  await a.page.reload(); await a.page.waitForSelector('[data-pared="A"]');
  igual(await val(a, '[data-pared="A"] > [data-c="alto"] input'), '2,5');
}));
prueba('el vestidor también tiene altura general', con({}, async a => {
  await nueva(a, 'armario', 'vestidor'); afirma(await a.page.$('[data-acc="alto_techo"]'), 'sin altura');
}));
prueba('tomas y enchufes: se elige de qué es y la planta lo nombra', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
  const chips = await a.page.$$eval('[data-pared="A"] [data-acc="anadir-elemento"]', b => b.map(x => x.dataset.v));
  igual(chips, ['humos', 'desague', 'toma', 'enchufe', 'ventana', 'puerta', 'pilar', 'otro']);
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="enchufe"]');
  await a.page.click('[data-elemento="enchufe"] [data-acc="para"][data-v="hmo"]'); await a.page.fill('[data-elemento="enchufe"] [data-acc="distancia"]', '50');
  igual(await a.page.innerText('[data-elemento="enchufe"] [data-acc="nombre-elemento-titulo"]'), 'Enchufe H/MO (columna)');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="toma"]'); await a.page.click('[data-elemento="toma"] [data-acc="para"][data-v="termo"]');
  await a.page.fill('[data-elemento="toma"] [data-acc="distancia"]', '120');
  await a.page.waitForFunction(() => { const t = document.querySelector('[data-acc="planta"]'); return t && /E H\/MO/.test(t.textContent) && /Toma termo/.test(t.textContent); });
  await recargar(a); const e = (await ficha(a)).datos.paredes[0].elementos; igual(e.map(x => [x.tipo, x.para]), [['enchufe', 'hmo'], ['toma', 'termo']]);
}));
prueba('azulejo de la pared: franja hasta el techo y zonas', con({}, async a => {
  await nueva(a, 'cocina'); await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
  await a.page.click('[data-pared="A"] [data-acc="azulejo"][data-v="franja"]');
  await a.page.fill('[data-pared="A"] [data-acc="azulejo_desde"]', '0,9');
  afirma(await a.page.$('[data-pared="A"] [data-acc="azulejo_hasta"]'), 'sin hasta');
  await a.page.click('[data-pared="A"] [data-acc="azulejo_techo"][data-v="true"]');
  afirma(!(await a.page.$('[data-pared="A"] [data-acc="azulejo_hasta"]')), 'sigue pidiendo hasta');
  await a.page.waitForFunction(() => /azulejo desde 0,9 m hasta el techo/.test(document.querySelector('[data-acc="planta"]').textContent));
  await a.page.click('[data-pared="A"] [data-acc="azulejo"][data-v="zonas"]'); await a.page.click('[data-pared="A"] [data-acc="anadir-zona"]');
  await a.page.fill('[data-elemento="zona"] [data-acc="nombre-elemento"]', 'campana'); await a.page.fill('[data-elemento="zona"] [data-acc="ancho"]', '900');
  await recargar(a); const p = (await ficha(a)).datos.paredes[0];
  igual([p.azulejo, p.azulejo_desde, p.azulejo_techo], ['zonas', 900, true]); igual(p.elementos.map(e => [e.tipo, e.nombre, e.ancho]), [['zona', 'campana', 900]]);
}));
prueba('una zona azulejada puede ir hasta el techo', con({}, async a => {
  await nueva(a, 'cocina');
  await a.page.click('[data-pared="A"] [data-acc="azulejo"][data-v="zonas"]'); await a.page.click('[data-pared="A"] [data-acc="anadir-zona"]');
  const Z = '[data-elemento="zona"] ';
  await a.page.fill(Z + '[data-acc="nombre-elemento"]', 'campana'); await a.page.fill(Z + '[data-acc="altura"]', '1500');
  afirma(await a.page.$(Z + '[data-acc="alto"]'), 'no pide el alto');
  await a.page.click(Z + '[data-acc="techo"][data-v="true"]');
  afirma(!(await a.page.$(Z + '[data-acc="alto"]')), 'sigue pidiendo el alto');
  await recargar(a); const e = (await ficha(a)).datos.paredes[0].elementos[0];
  igual([e.nombre, e.altura, e.techo], ['campana', 1500, true]);
  afirma(!(await a.page.$(Z + '[data-acc="alto"]')) && await a.page.evaluate(() => document.querySelector('[data-elemento="zona"] [data-acc="techo"][data-v="true"]').classList.contains('on')));
}));
fin();

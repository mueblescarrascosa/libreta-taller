// 1.33: pedidos de varias cocinas de un trabajo (eligiendo cuáles) y en tres hojas: cascos, frentes o los dos juntos
// (muebles hechos); la columna llega hasta arriba de los altos y, si no se dice a qué altura van, los altos se ajustan
// para que la columna quede en números redondos (0 o 5 cm), lo más cerca y cómodo; «Altos desde el suelo» manda.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { alturasCocina, fijarCocinaTipo, ALTURAS } from '../docs/js/alzado.js';
import { pedidoCascos, pedidoJuntos, textoPedido } from '../docs/js/pedido.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x) => Object.assign(moduloNuevo(tipo), { ancho }, x || {});
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = (nombre, paredes) => { const f = fichaNueva('cocina', null, 't'); f.nombre = nombre; f.datos.paredes = paredes; return f; };
const casco = (ct) => ct.zocalo + ct.mueble + ct.grueso + ct.separacion + ct.alto_alto - ct.zocalo;

prueba('columna en número redondo: los altos se ajustan solos, lo más cerca y cómodo', () => {
  igual(casco(alturasCocina({}, AJUSTES_FABRICA)) % 50, 0, 'la de Ajustes ya es redonda');
  for (const g of [12, 20, 30]) { const ct = alturasCocina({ alturas: { grueso: g } }, AJUSTES_FABRICA); igual(casco(ct) % 50, 0, 'encimera de ' + g); afirma(ct.redondeada && ct.separacion >= 540 && ct.separacion <= 620, JSON.stringify(ct)); }
  // Lo dicho a mano manda: la separación o a qué altura van los altos
  const s = alturasCocina({ alturas: { grueso: 12, separacion: 600 } }, AJUSTES_FABRICA); igual([s.separacion, s.redondeada], [600, false]);
  const d = alturasCocina({ alturas: { desde: 1500 } }, AJUSTES_FABRICA); igual(d.zocalo + d.mueble + d.grueso + d.separacion, 1500);
  fijarCocinaTipo(alturasCocina({ alturas: { grueso: 12 } }, AJUSTES_FABRICA)); igual(ALTURAS.columna, ALTURAS.altos_hasta, 'la columna llega hasta arriba de los altos');
  fijarCocinaTipo(AJUSTES_FABRICA.cocina_tipo);
});

prueba('pedido de varias cocinas: se juntan los iguales y se dice de qué cocina es cada uno', () => {
  const a = cocina('Cocina', [pared('A', 2400, { bajos: [mod('bajo', 600), mod('cajonero', 600)], altos: [mod('alto', 600)] })]);
  const b = cocina('Office', [pared('A', 1800, { bajos: [mod('bajo', 600)], altos: [mod('alto', 600)] })]);
  const c = pedidoCascos([a, b], AJUSTES_FABRICA), bajo600 = c.find(x => x.grupo === 'Bajos' && x.mueble === 'Bajo' && x.ancho === 600);
  igual(bajo600.cant, 2); afirma(bajo600.donde.length === 2 && bajo600.donde.some(x => /Office/.test(x)), JSON.stringify(bajo600.donde));
  // Juntos: casco y frentes en la misma fila
  const j = pedidoJuntos([a], AJUSTES_FABRICA), caj = j.find(x => x.mueble === 'Cajonero');
  afirma(caj && caj.casco && /cajones/.test(caj.frentes), JSON.stringify(caj));
  afirma(/Pedido de muebles \(casco y frentes\)/.test(textoPedido('juntos', [a, b], AJUSTES_FABRICA)));
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
async function nuevaCocina(a, urlTrabajo, ancho) {
  await a.page.evaluate(u => { location.hash = new URL(u).hash; }, urlTrabajo); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', ab = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '2,4');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]'); await a.page.click(ab + '[data-acc="rapido"][data-v="' + ancho + '"]');
  await a.page.waitForTimeout(700);
}

prueba('app: pedido del trabajo con sus cocinas, elegir cuáles y los tres modos', con(async a => {
  await crearTrabajo(a, 'Casa'); const url = a.page.url();
  await nuevaCocina(a, url, '600'); await nuevaCocina(a, url, '800');
  await a.page.evaluate(u => { location.hash = '#/resumen-trabajo/' + new URL(u).hash.split('/')[2]; }, url);
  await a.page.waitForSelector('[data-acc="pedido-trabajo-cascos"]');
  await a.page.click('[data-acc="pedido-trabajo-cascos"]'); await a.page.waitForSelector('.pedido-doc .tabla-pedido');
  igual(await a.page.locator('[data-acc="cocina-pedido"]').count(), 2, 'se ven las dos cocinas para elegir');
  afirma(/2 cocinas/.test(await a.page.innerText('.pedido-doc h2')));
  await a.page.locator('[data-acc="cocina-pedido"]').first().click(); await a.page.waitForTimeout(400);
  afirma(!/2 cocinas/.test(await a.page.innerText('.pedido-doc h2')), 'quitando una, queda la otra');
  await a.page.click('[data-acc="modo-pedido"][data-v="juntos"]'); await a.page.waitForTimeout(400);
  afirma(/casco y frentes/i.test(await a.page.innerText('.pedido-doc h2')));
  await a.page.click('[data-acc="modo-pedido"][data-v="frentes"]'); await a.page.waitForTimeout(400);
  afirma(/Pedido de frentes/.test(await a.page.innerText('.pedido-doc h2')));
}));

await fin();

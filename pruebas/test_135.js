// 1.34: los remates ocupan su sitio (regleta de 4 cm a la pared, costado de 2 cm en los extremos libres y en las columnas
// junto a un bajo), cajeado de pilares con 1 cm de holgura, hoja de pedido de puertas con tapetas (7, 9 o especial) y
// «la mejor combinación» de la cocina sin tocar los electrodomésticos.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, puertaNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo, situarMuebles, cuadreBajos, cuadreAltos, textoCuadre } from '../docs/js/modulos.js';
import { rematesCocina } from '../docs/js/material.js';
import { pedidoPuertas, textoPedidoPuertas } from '../docs/js/pedido.js';
import { mejorCocina, puntuarCocina } from '../docs/js/puntuacion.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);

prueba('regleta a la pared y costados: ocupan su sitio y cuentan en el cuadre', () => {
  const p = pared('A', 3600, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('cajonero', 600), mod('lavavajillas', 600), mod('fregadero', 800)], altos: [mod('alto', 600), mod('alto', 900), mod('alto', 600), mod('alto', 800)] }), d = { paredes: [p] };
  const s = situarMuebles(p, d);
  igual(s.bajos.map(b => b.desde), [40, 660, 1560, 2160, 2760], 'regleta de 4 a la pared y costado de 2 tras la columna');
  igual(s.altos[0].desde, 660, 'los altos empiezan tras el costado de la columna');
  afirma(/Quedan 4 cm: regleta a la pared/.test(textoCuadre(cuadreBajos(p, d), 'cm')), textoCuadre(cuadreBajos(p, d), 'cm'));
  afirma(/Quedan 4 cm/.test(textoCuadre(cuadreAltos(p, d), 'cm')), textoCuadre(cuadreAltos(p, d), 'cm'));
  // Fila que no llega a la pared: costado de 2 cm en el extremo libre
  const q = pared('B', 3000, { bajos: [mod('bajo', 600), mod('bajo', 600)] }), sq = situarMuebles(q, { paredes: [q] });
  igual(sq.remates.map(r => [r.tipo, r.ancho]), [['regleta', 40], ['costado', 20]]);
  // Regleta corta: avisa
  const c = pared('C', 1260, { bajos: [mod('bajo', 600), mod('bajo', 600)] });
  afirma(/corta: mejor 4 cm/.test(textoCuadre(cuadreBajos(c, { paredes: [c] }), 'cm')), textoCuadre(cuadreBajos(c, { paredes: [c] }), 'cm'));
  // Se pueden quitar o cambiar
  const sin = situarMuebles(p, { paredes: [p], remates: { regletas: { usar: false }, costados: { usar: false } } });
  igual(sin.bajos[0].desde, 0); igual(sin.remates, []);
  igual(situarMuebles(p, { paredes: [p], remates: { regleta_mm: 50 } }).bajos[0].desde, 50);
  // Y salen en el material con su alto
  afirma(rematesCocina(d).some(r => /Costado de columna/.test(r.pieza) && r.alto === 2150), JSON.stringify(rematesCocina(d)));
});

prueba('pilar: cajeado con 1 cm de holgura en ancho y fondo', () => {
  const p = pared('A', 3000, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600)], elementos: [{ id: 'x', tipo: 'pilar', distancia: 700, ancho: 300, fondo: 150, ref: 'izq' }] });
  const t = textoCuadre(cuadreBajos(p, { paredes: [p] }), 'cm');
  afirma(/cajear 31 cm × 16 cm de fondo \(con 1 cm de holgura\)/.test(t), t);
});

prueba('pedido de puertas: juntas las iguales, galce, a qué lado abren y tapetas', () => {
  const f = fichaNueva('puerta', null, 't');
  f.datos.medida = 'puerta'; f.datos.modelo = 'Lisa'; f.datos.color = 'Blanca';
  f.datos.puertas = [Object.assign(puertaNueva(), { ancho: 825, alto: 2030, tabique: 90, mano: 'izq' }), Object.assign(puertaNueva(), { ancho: 825, alto: 2030, tabique: 90, mano: 'der' }), Object.assign(puertaNueva(), { ancho: 725, alto: 2030, tabique: 70 })];
  let r = pedidoPuertas([f], AJUSTES_FABRICA);
  igual(r.filas.map(x => [x.cant, x.an, x.galce, x.izq, x.der]), [[2, 825, 90, 1, 1], [1, 725, 70, 0, 0]]);
  afirma(/Falta elegir las tapetas/.test(textoPedidoPuertas([f], AJUSTES_FABRICA)));
  f.datos.tapeta = 70; r = pedidoPuertas([f], AJUSTES_FABRICA);
  igual(r.tapetas, [[70, { largas: 12, cabezales: 6, tiras: 3 }]], '4 largas y 2 cabezales por puerta; 1 tira de cabezal por puerta');
  igual(r.galces, [[70, 1], [90, 2]]);
  f.datos.puertas[2].tipo = 'doble'; igual(pedidoPuertas([f], AJUSTES_FABRICA).tapetas[0][1].tiras, 4, 'la doble bandera, 2 tiras'); f.datos.puertas[2].tipo = null;
  f.datos.tapeta = 'especial'; f.datos.tapeta_mm = 110;
  afirma(/Tapetas de 11 cm: 12 largas/.test(textoPedidoPuertas([f], AJUSTES_FABRICA)) && /Galces/.test(textoPedidoPuertas([f], AJUSTES_FABRICA)), textoPedidoPuertas([f], AJUSTES_FABRICA));
});

prueba('la mejor combinación: sube la nota sin tocar los electrodomésticos', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('A', 4200, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('lavavajillas', 600), mod('bajo', 600), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 900)] })];
  const r = mejorCocina(f);
  afirma(r.despues.total > r.antes.total && r.cambios.length, JSON.stringify(r.cambios));
  const electros = l => l.filter(m => !['bajo', 'cajonero'].includes(m.tipo)).map(m => m.tipo);
  igual(electros(r.ficha.datos.paredes[0].bajos), electros(f.datos.paredes[0].bajos), 'los electrodomésticos, en su orden');
  igual(puntuarCocina(f).total, r.antes.total, 'la ficha no se toca');
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: tapetas en la ficha de puertas y «Buscar la mejor combinación» en la cocina', con(async a => {
  await crearTrabajo(a, 'Casa'); const url = a.page.url();
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="tapetas"][data-v="especial"]');
  await a.page.waitForSelector('[data-c="tapeta-mm"] input');
  await a.page.evaluate(u => { location.hash = new URL(u).hash; }, url); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', ab = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  for (const [t, w] of [['placa', '900'], ['bajo', '600'], ['fregadero', '800']]) { await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="' + t + '"]'); await a.page.click(ab + '[data-acc="rapido"][data-v="' + w + '"]'); }
  await a.page.waitForSelector('[data-acc="buscar-mejor"]');
  await a.page.click('[data-acc="buscar-mejor"]');
  await a.page.waitForSelector('[data-acc="mejor-cocina"] p, [data-acc="mejor-cocina"] small');
}));

await fin();

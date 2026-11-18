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

prueba('altos junto a campana, hueco o pilar que no lo tapa: costado', () => {
  const p = pared('A', 3000, { bajos: [mod('bajo', 600)], altos: [mod('alto', 600), mod('campana_deco', 900), mod('alto', 600), mod('hueco', 300), mod('alto', 600)] });
  const s = situarMuebles(p, { paredes: [p] });
  igual(s.altos.map(a => a.desde), [40, 660, 1580, 2200, 2520], 'costado a cada lado de la campana y del hueco');
  igual(s.remates.filter(r => r.fila === 'altos' && r.tipo === 'costado').length, 4);
  // El hueco es el de un pilar de 40 de fondo: lo tapa, sin costados; de 20, se ve: con costados
  const q = (fondo) => pared('B', 3000, { altos: [mod('alto', 600), mod('hueco', 300), mod('alto', 600)], elementos: [{ id: 'x', tipo: 'pilar', distancia: 640, ancho: 300, fondo, ref: 'izq' }] });
  const hondo = q(400), fino = q(200);
  igual(situarMuebles(hondo, { paredes: [hondo] }).altos.map(a => a.desde), [40, 680, 1020], 'pilar hondo: regleta a cada lado');
  igual(situarMuebles(hondo, { paredes: [hondo] }).remates.filter(r => r.fila === 'altos').map(r => r.tipo), ['regleta', 'regleta', 'regleta', 'costado']);
  igual(situarMuebles(fino, { paredes: [fino] }).altos.map(a => a.desde), [40, 660, 980]);
});

prueba('la mejor combinación no aleja la placa de su salida de humos ni el fregadero de su desagüe', () => {
  const f = fichaNueva('cocina', null, 't');
  const el = (tipo, distancia, altura) => ({ id: tipo + distancia, tipo, para: null, nombre: '', distancia, ref: 'izq', altura, ancho: null, alto: null });
  f.datos.paredes = [pared('A', 4200, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('lavavajillas', 600), mod('bajo', 600), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 900)],
    elementos: [el('humos', 900, 2100), el('desague', 3300, 400)] })];
  const r = mejorCocina(f), fr = r.ficha.datos.paredes[0];
  const s = situarMuebles(fr, r.ficha.datos), fg = s.bajos.find(b => b.m.tipo === 'fregadero'), pl = s.bajos.find(b => b.m.tipo === 'placa');
  igual(pl.desde, situarMuebles(f.datos.paredes[0], f.datos).bajos[1].desde, 'la placa sigue bajo su salida de humos: ' + JSON.stringify(r.cambios));
  afirma(3300 > fg.desde - 600 && 3300 < fg.hasta + 600, 'fregadero en ' + fg.desde);
  afirma(r.despues.total > r.antes.total, 'aun así mejora');
});

prueba('costado de columna sobre la encimera: los bajos van pegados; el alto que no cabe no salta fuera de la pared', () => {
  const p = pared('A', 2440, { bajos: [mod('escobero', 500), mod('bajo', 600), mod('bajo', 600), mod('columna_frigo', 600)], altos: [mod('alto', 600), mod('alto', 600)] });
  const suelo = situarMuebles(p, { paredes: [p] }), sobre = situarMuebles(p, { paredes: [p], remates: { costado_columna: 'encimera' } });
  igual(suelo.bajos.map(b => b.desde), [40, 560, 1160, 1780]);
  igual(sobre.bajos.map(b => b.desde), [40, 540, 1140, 1740], 'pegados a las columnas: 4 cm menos');
  igual(sobre.altos.map(a => a.desde), [560, 1160], 'los altos siguen saltando el costado');
  igual(sobre.remates.filter(r => r.fila === 'sobre').map(r => [r.desde, r.hasta]), [[540, 560], [1720, 1740]]);
  afirma(rematesCocina({ paredes: [p], remates: { costado_columna: 'encimera' } }).some(r => /sobre la encimera/.test(r.pieza)));
  // Un alto que no cabe antes de la columna del final se queda donde iba (no detrás de la columna, fuera de la pared)
  const q = pared('B', 2400, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('columna_frigo', 600)], altos: [mod('alto', 900), mod('alto', 900), mod('alto', 300)] });
  const sq = situarMuebles(q, { paredes: [q] });
  afirma(sq.altos.every(a => a.hasta <= 2400 + 1), JSON.stringify(sq.altos.map(a => [a.desde, a.hasta])));
  afirma(/te pasas/i.test(textoCuadre(cuadreAltos(q, { paredes: [q] }), 'cm')));
});

prueba('la columna lleva el zócalo de la cocina', async () => {
  const { frenteModulo } = await import('../docs/js/frentes.js');
  const z = frenteModulo('escobero', 500, 0, 2150, { columna: true, zocalo: 150 }).find(f => f.k === 'zocalo');
  igual([z.z0, z.z1], [0, 150]);
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
  // Corredera de granero: sin marco ni tapetas; corredera sin decir cuál, avisa
  f.datos.tapeta = 70; f.datos.puertas[2].tipo = 'corredera'; f.datos.puertas[2].corredera = 'granero';
  r = pedidoPuertas([f], AJUSTES_FABRICA);
  igual(r.tapetas, [[70, { largas: 8, cabezales: 4, tiras: 2 }]], 'la de granero no lleva tapetas');
  igual(r.galces, [[90, 2]], 'ni marco');
  afirma(r.filas.some(x => x.tipo === 'Corredera de granero') && /sin marco ni tapetas/.test(textoPedidoPuertas([f], AJUSTES_FABRICA)));
  f.datos.puertas[2].corredera = null;
  afirma(/granero o empotrada/.test(textoPedidoPuertas([f], AJUSTES_FABRICA)) && pedidoPuertas([f], AJUSTES_FABRICA).tapetas[0][1].largas === 12);
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

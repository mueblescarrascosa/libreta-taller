// 1.37: el horno de la placa lo dice el frente (soporte de horno, de 45 o 60), campana vista o mueble con extractor
// (centrado con la placa; con gas, a 75 de la placa y a ras arriba), extractor solo en inducción, salida de humos en la
// pared de al lado, H/MO con un solo aparato, alto sobre frigo del fondo de los bajos, semicolumnas, columna con un
// electrodoméstico abajo, alto micro de 50 (micro libre 46 × 29), costado junto a la campana aunque pise el margen,
// altos de después de la campana pegados a la pared o columna y las alturas de la cocina con sus medidas a un toque.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo, situarMuebles, electrosDeMuebles, nombreModulo, placaConHorno, REMATES } from '../docs/js/modulos.js';
import { geometriaAlzado, campanasPared, textoHolgurasCampana, textoTubo, desdeAlto, ALTURAS, fijarCocinaTipo, alturasCocina, SOBRE_GAS } from '../docs/js/alzado.js';
import { frenteModulo } from '../docs/js/frentes.js';
import { articulo, alturaHabitual } from '../docs/js/presupuesto.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; fijarCocinaTipo(alturasCocina(f.datos, null)); return f.datos; };
const electros = l => l.filter(q => q.k === 'electro').length;

prueba('placa: el horno lo dice el frente; el soporte con cajón, con horno de 45 o 60', () => {
  const p = mod('placa', 600);
  igual(placaConHorno(p), false);
  p.variante = 'SOPORTE HORNO SIN CAJÓN';
  igual([placaConHorno(p), nombreModulo(p)], [true, 'Placa con horno']);
  p.variante = 'SOPORTE HORNO Y 1 GAVETERO';
  const d = cocina([pared('A', 3000, { bajos: [p] })]);
  igual(electrosDeMuebles(d).get('horno'), { tipo: 'bajo', alto: 600 });
  const cajon = q => frenteModulo('placa', 600, 150, 850, { variante: q.variante, modulo: q }).find(x => x.k === 'hoja');
  const c60 = cajon(p).z1 - cajon(p).z0; p.horno_alto = 450;
  afirma(cajon(p).z1 - cajon(p).z0 > c60 + 100, 'con el horno de 45, el cajón es más grande');
  igual(electrosDeMuebles(d).get('horno').alto, 450);
  p.variante = '2 CACEROLEROS'; p.horno = true;   // ficha antigua con «horno debajo» y luego cajones: manda el frente
  igual(placaConHorno(p), false);
});

prueba('mueble con extractor: el alto campana va solo centrado con la placa y los altos a los lados', () => {
  const p = pared('A', 3600, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 600), mod('alto_campana', 600), mod('alto', 600)] });
  const d = cocina([p]), s = situarMuebles(p, d), pl = s.bajos.find(b => b.m.tipo === 'placa'), ac = s.altos.find(a => a.m.tipo === 'alto_campana');
  igual((ac.desde + ac.hasta) / 2, (pl.desde + pl.hasta) / 2, 'centrado con la placa');
  afirma(s.altos.every((a, i) => !i || a.desde >= s.altos[i - 1].hasta - 1), JSON.stringify(s.altos.map(a => [a.m.tipo, a.desde, a.hasta])));
  igual(desdeAlto(ac.m, d), ALTURAS.altos_desde, 'con inducción, como los altos');
  // Con gas: a 75 de la placa como poco, a ras por arriba con los altos (más bajo)
  p.bajos[1].placa_tipo = 'gas';
  igual(desdeAlto(ac.m, d), Math.max(ALTURAS.altos_desde, ALTURAS.encimera + SOBRE_GAS));
  const g = geometriaAlzado(d, p), pz = g.piezas.find(q => q.clase === 'alto' && q.tipo === 'alto_campana');
  igual([pz.y, pz.y + pz.h], [desdeAlto(ac.m, d), ALTURAS.altos_hasta]);
  igual(alturaHabitual(ac.m, d), 'ALTO 45');   // unos 51 cm
});

prueba('campana vista con gas: a 75 cm de la placa', () => {
  const p = pared('A', 3600, { bajos: [mod('bajo', 600), mod('placa', 600, { placa_tipo: 'gas' }), mod('bajo', 600)], altos: [mod('alto', 600)] }), d = cocina([p]);
  const c = geometriaAlzado(d, p).piezas.filter(q => q.clase === 'f_campana').sort((a, b) => a.y - b.y)[0];
  igual(c.y, ALTURAS.encimera + SOBRE_GAS);
});

prueba('salida de humos en la pared de al lado: el tubo dobla la esquina', () => {
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 600), mod('bajo', 600)], altos: [mod('alto', 600)] });
  const B = pared('B', 2000, { elementos: [{ id: 'h', tipo: 'humos', humos_forma: 'circular', distancia: 300, ref: 'izq', altura: 2300 }] });
  const d = cocina([A, B]), t = geometriaAlzado(d, A).tubos[0];
  igual(t.salida.otraPared, 'B');
  afirma(/pared B/.test(textoTubo(t)) && t.codos >= 2, textoTubo(t));
  afirma(t.camino.every(([x]) => x <= 3000), 'en esta pared, el tubo llega hasta la esquina');
});

prueba('columna H/MO: horno de 45 o 60 y un solo aparato en «puerta + electrodoméstico»', () => {
  const m = mod('columna_hmo', 600), f = () => frenteModulo('columna_hmo', 600, 0, 2150, { columna: true, variante: m.variante, modulo: m, zocalo: 150 });
  igual(electros(f()), 2);
  m.variante = 'PUERTA + ELECTRODOMÉSTICO + PUERTA'; igual(electros(f()), 1);
  m.horno_alto = 450; const e = f().find(q => q.k === 'electro'); afirma(e.z1 - e.z0 < 460, 'horno de 45');
  igual(electrosDeMuebles(cocina([pared('A', 3000, { bajos: [m] })])).has('microondas'), false);
});

prueba('alto sobre frigo: del fondo de los bajos', () => {
  const p = { letra: 'A', largo: 3000, elementos: [], bajos: [mod('columna_frigo', 600)], altos: [mod('alto_frigo', 600)] };
  const f = fichaNueva('cocina', null, 't'); f.datos.paredes = [Object.assign(paredNueva([]), p)];
  const g = geometriaPlanta(f.datos), a = g.modulos.find(x => x.tipo === 'alto_frigo'), r = a.rect;
  const fondo = Math.max(...r.map(q => q.y)) - Math.min(...r.map(q => q.y));
  afirma(Math.abs(fondo - 600) < 1, 'fondo ' + fondo);
});

prueba('semicolumna: hasta 140, los altos la saltan; modelos del catálogo', () => {
  const p = pared('A', 3000, { bajos: [mod('semicolumna', 600, { variante: 'HORNO + 1 PUERTA' }), mod('bajo', 600)], altos: [mod('alto', 600)] }), d = cocina([p]);
  const g = geometriaAlzado(d, p), c = g.piezas.find(q => q.clase === 'columna');
  igual(c.h, 1400);
  afirma(situarMuebles(p, d).altos[0].desde >= 600, 'el alto no va encima');
  igual(articulo(p.bajos[0], d).texto, 'SEMICOLUMNA 135-145 · HORNO + 1 PUERTA · 60');
  igual(articulo(mod('semicolumna', 900), d).mo, '2 PUERTAS');
  igual(electrosDeMuebles(d).get('horno').tipo, 'columna');
});

prueba('columna con electro abajo: lavavajillas subido y lo de arriba', () => {
  const m = mod('columna_electro', 600, { arriba: 'horno' }), f = () => frenteModulo('columna_electro', 600, 0, 2150, { columna: true, modulo: m, zocalo: 150 });
  igual(nombreModulo(m), 'Columna lavavajillas');
  const hojas = f().filter(q => q.k === 'hoja');
  afirma(hojas[0].z1 <= 285 && hojas[1].z0 >= 275 && hojas[1].z1 - hojas[1].z0 > 800, JSON.stringify(hojas));
  igual(electros(f()), 1);
  const d = cocina([pared('A', 3000, { bajos: [m] })]);
  igual([electrosDeMuebles(d).get('lavavajillas').tipo, electrosDeMuebles(d).get('horno').tipo], ['integrable', 'columna']);
  afirma(articulo(m, d).revisar, 'no está en el catálogo');
  m.abajo = 'vinoteca'; m.arriba = 'hmo';
  igual([nombreModulo(m), electros(f())], ['Columna vinoteca', 3]);
});

prueba('alto micro de 50: microondas libre de 46 × 29; de 60, integrable', () => {
  const m = mod('alto_micro', 500), d = cocina([pared('A', 3000, { altos: [m] })]);
  igual(electrosDeMuebles(d).get('microondas'), { tipo: 'libre', ancho: 460, alto: 290 });
  afirma(frenteModulo('alto_micro', 500, 1450, 2150, {}).some(q => q.k === 'acero' && q.x1 - q.x0 === 460), 'el micro dentro del hueco');
  m.ancho = 600; igual(electrosDeMuebles(d).get('microondas'), { tipo: 'integrable' });
});

prueba('campana vista: costado del alto de al lado aunque pise el margen, y cuánto; los de después, pegados a la columna', () => {
  // Como la «Piso 1»: la pared va llena, el micro se mete en el margen de la campana
  const p = pared('A', 3800, { bajos: [mod('escobero', 500), mod('lavadora', 600), mod('fregadero', 700), mod('bajo', 350), mod('placa', 600), mod('bajo', 450), mod('columna_frigo', 600)],
    altos: [mod('alto', 600), mod('alto', 450), mod('alto_micro', 500), mod('alto', 300)] });
  const d = cocina([p]); d.remates = { costado_columna: 'encimera' };
  const s = situarMuebles(p, d), z = s.zonas[0], micro = s.altos.find(a => a.m.tipo === 'alto_micro');
  afirma(s.remates.some(r => r.fila === 'altos' && r.tipo === 'costado' && Math.abs(r.desde - micro.hasta) < 1), 'costado del micro');
  const t = textoHolgurasCampana(campanasPared(p, d)[0]);
  afirma(/pisa \d+ cm el margen/.test(t), t);
  // El alto de 30 va pegado a la columna del frigo (lo que sobra, junto a la campana)
  const a30 = s.altos.find(a => a.m.ancho === 300), col = s.bajos.find(b => b.m.tipo === 'columna_frigo');
  afirma(a30.desde > z.hasta && Math.abs(a30.hasta - col.desde) <= 20, JSON.stringify([a30.desde, a30.hasta, col.desde, z.hasta]));
});

prueba('altos de después de la campana pegados a la pared (con su regleta)', () => {
  const p = pared('A', 3600, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 600), mod('alto', 600)] });
  const s = situarMuebles(p, cocina([p])), ult = s.altos[s.altos.length - 1];
  igual(ult.hasta, 3600 - 40);
  afirma(s.remates.some(r => r.fila === 'altos' && r.tipo === 'regleta' && r.desde === 3560), 'regleta a la pared');
});

const con = fn => async () => { const a = await abrir({ ancho: 412, tactil: true }); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: placa sin «horno debajo», extractor solo en inducción, mueble con extractor; alturas a un toque', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]');
  await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '3'); await a.page.keyboard.press('Tab');
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="placa"]');
  igual(await a.page.$('[data-acc="placa-horno"]'), null, 'sin la pregunta del horno');
  afirma(await a.page.$('[data-acc="placa-extractor"]'), 'extractor (sin tipo de placa aún)');
  await a.page.click('[data-acc="placa-tipo"][data-v="gas"]');
  igual(await a.page.$('[data-acc="placa-extractor"]'), null, 'con gas, no hay placa extractora');
  afirma(await a.page.$('[data-acc="campana-gas"]'), 'aviso de los 75 cm');
  await a.page.click('[data-acc="campana-forma"][data-v="mueble"]');
  await a.page.waitForSelector('[data-pared="A"] [data-fila="altos"] [data-modulo="alto_campana"]');
  await a.page.click('[data-acc="variante"][data-v="SOPORTE HORNO Y 1 GAVETERO"]');
  afirma(await a.page.$('[data-acc="horno-alto"]'), 'alto del horno');
  // Alturas: zócalo 10/15 en la misma línea; el grueso de la encimera, una vez
  await a.page.$eval('input[data-acc="altura-zocalo"]', n => { const dt = n.closest('details'); if (dt) dt.open = true; });
  igual(await a.page.$$eval('[data-c="altura-zocalo"] .med [data-acc="rapido"]', l => l.map(x => x.textContent)), ['10', '15']);
  igual(await a.page.$$eval('[data-c="altura-alto_alto"] .med [data-acc="rapido"]', l => l.map(x => x.textContent)), ['70', '90']);
  igual(await a.page.$('[data-c="encimera-grueso"]'), null, 'grueso solo en las alturas');
  const caja = await a.page.$eval('[data-c="altura-zocalo"]', n => ({ w: n.getBoundingClientRect().width, sw: n.scrollWidth }));
  afirma(caja.sw <= caja.w + 1, 'cabe sin desbordar: ' + JSON.stringify(caja));
}));

await fin();
